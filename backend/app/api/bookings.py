from typing import List, Optional
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import schemas
from app.api import utils as api_utils
from app.api.deps import get_current_user, get_db
from app.models import Booking, Service as ServiceModel, User, GlobalService, ProviderService
from sqlalchemy import func

router = APIRouter()
logger = logging.getLogger(__name__)

DEFAULT_RADIUS_KM = 10.0


def _booking_to_schema(db: Session, booking: Booking) -> schemas.BookingOut:
    service: Optional[ServiceModel] = (
        db.query(ServiceModel).filter(ServiceModel.id == booking.service_id).first()
    ) if booking.service_id else None
    gservice: Optional[GlobalService] = (
        db.query(GlobalService).filter(GlobalService.id == booking.global_service_id).first()
    ) if booking.global_service_id else None
    user: Optional[User] = db.query(User).filter(User.id == booking.user_id).first()

    location_str = booking.user_address
    if not location_str and booking.user_lat is not None and booking.user_lon is not None:
        location_str = f"{booking.user_lat},{booking.user_lon}"
    if not location_str and service:
        parts = []
        if getattr(service, "lat", None) is not None and getattr(service, "lon", None) is not None:
            parts.append(f"{service.lat},{service.lon}")
        if service.location:
            parts.append("geocoded")
        location_str = ", ".join(parts) if parts else None

    return schemas.BookingOut(
        id=booking.id,
        service_id=booking.service_id,
        global_service_id=booking.global_service_id,
        user_id=booking.user_id,
        provider_id=booking.provider_id,
        scheduled_at=booking.scheduled_at,
        notes=booking.notes,
        status=booking.status,
        created_at=booking.created_at.isoformat() if booking.created_at else None,
        service=api_utils.service_to_schema(db, service) if service else None,
        service_title=(service.title if service else None) or (gservice.title if gservice else None),
        user_name=user.name if user else None,
        location=location_str,
    )


@router.post("", response_model=schemas.BookingOut, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=schemas.BookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(
    payload: schemas.BookingCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    logger.info("booking_create_request payload=%s user_id=%s", payload.dict(), getattr(current_user, "id", None))
    if not payload.service_id and not payload.global_service_id:
        raise HTTPException(status_code=400, detail="Either service_id or global_service_id is required")

    # Legacy flow
    if payload.service_id:
        svc = db.query(ServiceModel).filter(ServiceModel.id == payload.service_id).first()
        if not svc:
            raise HTTPException(status_code=404, detail="Service not found")

        if current_user.provider and current_user.provider.id == svc.provider_id:
            raise HTTPException(
                status_code=400, detail="Providers cannot book their own services"
            )

        provider_id = payload.provider_id or svc.provider_id
        if not provider_id:
            raise HTTPException(status_code=400, detail="No provider available for this service")

        if current_user.provider and current_user.provider.id == provider_id:
            raise HTTPException(
                status_code=400, detail="Providers cannot book their own services"
            )

        if provider_id != svc.provider_id:
            raise HTTPException(
                status_code=400,
                detail="Selected provider does not own the requested service",
            )

        booking = Booking(
            service_id=svc.id,
            global_service_id=None,
            provider_id=provider_id,
            user_id=current_user.id,
            scheduled_at=payload.scheduled_at,
            notes=payload.notes,
            status="pending",
            price=svc.price,
            user_address=payload.user_address,
            user_lat=payload.user_lat,
            user_lon=payload.user_lon,
        )
        db.add(booking)
        try:
            db.commit()
            db.refresh(booking)
        except Exception as exc:
            db.rollback()
            logger.exception("booking_create_failed service flow payload=%s error=%s", payload.model_dump(), exc)
            raise HTTPException(status_code=400, detail=str(exc))
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

    # New flow with global service
    gsvc = db.query(GlobalService).filter(GlobalService.id == payload.global_service_id).first()
    if not gsvc:
        raise HTTPException(status_code=404, detail="Global service not found")

    from app.api.match import find_best_provider

    provider_id = payload.provider_id

    # AUTO-ASSIGN PROVIDER USING GEO-LOCATION
    if not provider_id:
        if payload.user_lat is None or payload.user_lon is None:
            raise HTTPException(
                status_code=400,
                detail="Location is required to auto-assign provider",
            )

        match = find_best_provider(
            db=db,
            global_service_id=gsvc.id,
            user_lat=payload.user_lat,
            user_lon=payload.user_lon,
            user=current_user,
        )

        if not match:
            raise HTTPException(
                status_code=404,
                detail="No providers available near your location",
            )

        provider_id = match.provider_id

        if not provider_id:
            raise HTTPException(
                status_code=404,
                detail="No providers available near your location",
            )
    if provider_id:
        ps = (
            db.query(ProviderService)
            .filter(
                ProviderService.provider_id == provider_id,
                ProviderService.service_id == gsvc.id,
                ProviderService.is_active == True,  # noqa: E712
            )
            .first()
        )
        if not ps:
            raise HTTPException(status_code=400, detail="Provider not offering this service")

    booking = Booking(
        service_id=None,
        global_service_id=gsvc.id,
        provider_id=provider_id,
        user_id=current_user.id,
        scheduled_at=payload.scheduled_at,
        notes=payload.notes,
        status="pending",
        price=gsvc.base_price,
        user_address=payload.user_address,
        user_lat=payload.user_lat,
        user_lon=payload.user_lon,
    )
    db.add(booking)
    try:
        db.commit()
        db.refresh(booking)
    except Exception as exc:
        db.rollback()
        logger.exception("booking_create_failed payload=%s error=%s", payload.model_dump(), exc)
        raise HTTPException(status_code=400, detail=str(exc))
    logger.info("booking_created provider_id=%s user_id=%s booking_id=%s", provider_id, current_user.id, booking.id)
    _audit(
        db,
        actor_id=current_user.id,
        action="booking_created",
        target_type="booking",
        target_id=booking.id,
        metadata={"service_id": payload.service_id, "global_service_id": payload.global_service_id, "provider_id": provider_id},
    )
    return _booking_to_schema(db, booking)


@router.get("", response_model=List[schemas.BookingOut])
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


@router.get("/provider", response_model=List[schemas.BookingOut])
@router.get("/provider/", response_model=List[schemas.BookingOut])
def list_provider_bookings(
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    if not current_user.provider:
        raise HTTPException(status_code=403, detail="Provider profile required")
    # Assigned bookings
    assigned = (
        db.query(Booking)
        .filter(Booking.provider_id == current_user.provider.id)
        .order_by(Booking.created_at.desc())
        .all()
    )

    # Unassigned that match provider's ProviderService registrations
    unassigned = (
        db.query(Booking)
        .join(ProviderService, ProviderService.service_id == Booking.global_service_id)
        .filter(
          ProviderService.provider_id == current_user.provider.id,
          ProviderService.is_active == True,  # noqa: E712
          Booking.provider_id.is_(None),
        )
        .order_by(Booking.created_at.desc())
        .all()
    )
    merged = assigned + [b for b in unassigned if b not in assigned]
    logger.info("provider_bookings_fetched provider_id=%s count=%s", current_user.provider.id, len(merged))
    return [_booking_to_schema(db, b) for b in merged]


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
    if not current_user.provider:
        raise HTTPException(status_code=403, detail="Only provider can update status")

    # State rules: only pending bookings can be accepted/rejected via this endpoint.
    if booking.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending bookings can be updated")

    # Allow claiming unassigned global bookings that match provider services
    if booking.provider_id is None:
        if booking.global_service_id:
            match = (
                db.query(ProviderService)
                .filter(
                    ProviderService.provider_id == current_user.provider.id,
                    ProviderService.service_id == booking.global_service_id,
                    ProviderService.is_active == True,  # noqa: E712
                )
                .first()
            )
            if not match:
                raise HTTPException(status_code=403, detail="Not eligible for this booking")
        booking.provider_id = current_user.provider.id

    if booking.provider_id != current_user.provider.id:
        raise HTTPException(status_code=403, detail="Only provider can update status")

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

# def find_best_provider_for_service(
#     db: Session,
#     service_id: int,
#     user_lat: float,
#     user_lon: float,
#     radius_km: float = DEFAULT_RADIUS_KM,
# ):
#     user_point = func.ST_SetSRID(func.ST_MakePoint(user_lon, user_lat), 4326)
#     radius_m = radius_km * 1000

#     rows = (
#         db.query(
#             Service.provider_id,
#             func.ST_Distance(Service.location, user_point).label("distance_m"),
#         )
#         .join(Provider, Provider.id == Service.provider_id)
#         .filter(
#             Service.id == service_id,
#             Service.location.isnot(None),
#             Provider.is_active == True,
#             Provider.is_verified == True,
#             Provider.is_suspended == False,
#             func.ST_DWithin(Service.location, user_point, radius_m),
#         )
#         .order_by("distance_m")
#         .limit(1)
#         .all()
#     )

#     if not rows:
#         return None

#     return rows[0].provider_id

