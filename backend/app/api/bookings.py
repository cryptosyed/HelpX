from typing import List, Optional
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import schemas
from app.api import utils as api_utils
from app.api.deps import get_current_user, get_db
from app.models import Booking, Service as ServiceModel, User
from sqlalchemy import func

router = APIRouter()
logger = logging.getLogger(__name__)


def _booking_to_schema(db: Session, booking: Booking) -> schemas.BookingOut:
    service: Optional[ServiceModel] = (
        db.query(ServiceModel).filter(ServiceModel.id == booking.service_id).first()
    )
    user: Optional[User] = db.query(User).filter(User.id == booking.user_id).first()

    location_str = None
    if service:
        parts = []
        if getattr(service, "lat", None) is not None and getattr(service, "lon", None) is not None:
            parts.append(f"{service.lat},{service.lon}")
        if service.location:
            # best-effort textual location
            parts.append("geocoded")
        location_str = ", ".join(parts) if parts else None

    return schemas.BookingOut(
        id=booking.id,
        service_id=booking.service_id,
        user_id=booking.user_id,
        provider_id=booking.provider_id,
        scheduled_at=booking.scheduled_at,
        notes=booking.notes,
        status=booking.status,
        created_at=booking.created_at.isoformat() if booking.created_at else None,
        service=api_utils.service_to_schema(db, service) if service else None,
        service_title=service.title if service else None,
        user_name=user.name if user else None,
        location=location_str,
    )


@router.post("/", response_model=schemas.BookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(
    payload: schemas.BookingCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = db.query(ServiceModel).filter(ServiceModel.id == payload.service_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")

    # Users cannot book their own service
    if current_user.provider and current_user.provider.id == svc.provider_id:
        raise HTTPException(
            status_code=400, detail="Providers cannot book their own services"
        )

    # If caller did not specify, deterministically assign the service owner
    provider_id = payload.provider_id or svc.provider_id
    if not provider_id:
        raise HTTPException(status_code=400, detail="No provider available for this service")

    # Prevent booking your own service (self-matching protection)
    if current_user.provider and current_user.provider.id == provider_id:
        raise HTTPException(
            status_code=400, detail="Providers cannot book their own services"
        )

    if provider_id != svc.provider_id:
        # Ensure the selected provider actually owns the service being booked
        raise HTTPException(
            status_code=400,
            detail="Selected provider does not own the requested service",
        )

    booking = Booking(
        service_id=svc.id,
        provider_id=provider_id,
        user_id=current_user.id,
        scheduled_at=payload.scheduled_at,
        notes=payload.notes,
        status="pending",
        price=svc.price,  # Store price at time of booking
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    logger.info("booking_created provider_id=%s user_id=%s booking_id=%s", provider_id, current_user.id, booking.id)
    _audit(
        db,
        actor_id=current_user.id,
        action="booking_created",
        target_type="booking",
        target_id=booking.id,
        metadata={"service_id": svc.id, "provider_id": provider_id},
    )
    return _booking_to_schema(db, booking)


@router.get("/", response_model=List[schemas.BookingOut])
def list_user_bookings(
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    bookings = (
        db.query(Booking)
        .filter(Booking.user_id == current_user.id)
        .order_by(Booking.created_at.desc())
        .all()
    )
    return [_booking_to_schema(db, b) for b in bookings]


@router.get("/user", response_model=List[schemas.BookingOut])
def list_user_bookings_alias(
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    """Explicit user bookings endpoint"""
    return list_user_bookings(db=db, current_user=current_user)


@router.get("/provider/", response_model=List[schemas.BookingOut])
def list_provider_bookings(
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    if not current_user.provider:
        raise HTTPException(status_code=403, detail="Provider profile required")
    bookings = (
        db.query(Booking)
        .filter(Booking.provider_id == current_user.provider.id)
        .order_by(Booking.created_at.desc())
        .all()
    )
    logger.info("provider_bookings_fetched provider_id=%s count=%s", current_user.provider.id, len(bookings))
    # enrich with service data already via _booking_to_schema
    return [_booking_to_schema(db, b) for b in bookings]


@router.put("/{booking_id}/status", response_model=schemas.BookingOut)
def update_booking_status(
    booking_id: int,
    payload: schemas.BookingStatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if payload.status not in {"pending", "accepted", "rejected"}:
        raise HTTPException(status_code=400, detail="Invalid status")

    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if not current_user.provider or booking.provider_id != current_user.provider.id:
        raise HTTPException(status_code=403, detail="Only provider can update status")

    # State rules: only pending bookings can be accepted/rejected via this endpoint.
    if booking.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending bookings can be updated")

    booking.status = payload.status
    db.add(booking)
    db.commit()
    db.refresh(booking)
    logger.info(
        "booking_status_updated booking_id=%s provider_id=%s status=%s",
        booking.id,
        current_user.provider.id,
        booking.status,
    )
    _audit(
        db,
        actor_id=current_user.id,
        action="booking_status_updated",
        target_type="booking",
        target_id=booking.id,
        metadata={"status": booking.status},
    )
    return _booking_to_schema(db, booking)


@router.put("/{booking_id}/cancel", response_model=schemas.BookingOut)
def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    booking = (
        db.query(Booking)
        .filter(Booking.id == booking_id, Booking.user_id == current_user.id)
        .first()
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status not in {"pending", "accepted"}:
        raise HTTPException(
            status_code=400, detail="Only pending or accepted bookings can be cancelled"
        )

    booking.status = "cancelled"
    db.commit()
    db.refresh(booking)
    _audit(
        db,
        actor_id=current_user.id,
        action="booking_cancelled",
        target_type="booking",
        target_id=booking.id,
        metadata={"status": booking.status},
    )
    return _booking_to_schema(db, booking)


def _audit(db: Session, actor_id: int, action: str, target_type: str, target_id: int, metadata: dict = None):
    from app.models import AuditLog  # local import to avoid circular
    log = AuditLog(
        actor_id=actor_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        meta=str(metadata or {}),
    )
    db.add(log)
    db.commit()


