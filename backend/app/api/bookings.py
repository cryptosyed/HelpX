from typing import List, Optional
from datetime import timedelta
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import schemas
from app.api import utils as api_utils
from app.api.deps import get_current_user, get_current_provider, get_db
from app.models import Booking, Service as ServiceModel, User, GlobalService, ProviderService
from sqlalchemy import func, text

router = APIRouter()
logger = logging.getLogger(__name__)

DEFAULT_RADIUS_KM = 10.0


def _log_status_change(booking_id: int, old_status: str, new_status: str, actor_id: int, actor_role: str):
    logger.info(
        "booking_status_change booking_id=%s old_status=%s new_status=%s actor_id=%s actor_role=%s",
        booking_id,
        old_status,
        new_status,
        actor_id,
        actor_role,
    )


VALID_BOOKING_STATUSES = {
    "pending",
    "accepted",
    "rejected",
    "cancelled",
    "completed",
}

VALID_TRANSITIONS = {
    "pending": {"accepted", "rejected", "cancelled"},
    "accepted": {"completed", "cancelled"},
    "rejected": set(),
    "completed": set(),
    "cancelled": set(),
}

"""
# CURL EXAMPLES (manual testing)

# Test 1: Overlap conflict (same provider, overlapping times → HTTP 409)
# Create booking A at 10:00
# curl -X POST http://127.0.0.1:8000/bookings \
#   -H "Authorization: Bearer <token>" \
#   -H "Content-Type: application/json" \
#   -d '{"global_service_id":1,"provider_id":2,"scheduled_at":"2025-01-01T10:00:00Z","user_lat":12.9,"user_lon":77.6}'
# Create booking B at 10:30 (overlaps) → expect 409
# curl -X POST http://127.0.0.1:8000/bookings \
#   -H "Authorization: Bearer <token>" \
#   -H "Content-Type: application/json" \
#   -d '{"global_service_id":1,"provider_id":2,"scheduled_at":"2025-01-01T10:30:00Z","user_lat":12.9,"user_lon":77.6}'

# Test 2: Non-overlap (1h duration, back-to-back allowed)
# Booking at 10:00 then 11:00 should succeed
# curl -X POST http://127.0.0.1:8000/bookings \
#   -H "Authorization: Bearer <token>" \
#   -H "Content-Type: application/json" \
#   -d '{"global_service_id":1,"provider_id":2,"scheduled_at":"2025-01-01T10:00:00Z","user_lat":12.9,"user_lon":77.6}'
# curl -X POST http://127.0.0.1:8000/bookings \
#   -H "Authorization: Bearer <token>" \
#   -H "Content-Type: application/json" \
#   -d '{"global_service_id":1,"provider_id":2,"scheduled_at":"2025-01-01T11:00:00Z","user_lat":12.9,"user_lon":77.6}'

# Test 3: Concurrent accepts (only one should succeed)
# Terminal 1:
# curl -X PUT http://127.0.0.1:8000/bookings/123/accept \
#   -H "Authorization: Bearer <provider_token>"
# Terminal 2 (run simultaneously):
# curl -X PUT http://127.0.0.1:8000/bookings/123/accept \
#   -H "Authorization: Bearer <provider_token>"
# Expect one 200 and one 409 conflict
"""


def validate_booking_transition(current: Optional[str], next_status: Optional[str]) -> None:
    cur = (current or "").lower()
    nxt = (next_status or "").lower()

    # Allow no-op updates
    if cur == nxt:
        return

    if cur not in VALID_BOOKING_STATUSES or nxt not in VALID_BOOKING_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status transition")

    allowed = VALID_TRANSITIONS.get(cur, set())
    if nxt not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid status transition: {cur} -> {nxt}")


def _ensure_provider_available(db: Session, provider_id: Optional[int], scheduled_at) -> None:
    """
    Enforce provider availability with row-level locking to avoid double-booking under concurrency.
    Uses a fixed 1-hour window starting at scheduled_at.
    """
    if not provider_id or not scheduled_at:
        return

    new_start = scheduled_at
    new_end = scheduled_at + timedelta(hours=1)

    existing_end = Booking.scheduled_at + text("interval '1 hour'")

    overlap = (
        db.query(Booking)
        .with_for_update()  # locks matching rows to prevent race conditions
        .filter(
            Booking.provider_id == provider_id,
            Booking.status.in_(["pending", "accepted"]),
            Booking.scheduled_at < new_end,
            existing_end > new_start,
        )
        .first()
    )

    if overlap:
        logger.info(
            "booking_conflict provider_id=%s conflicting_booking_id=%s requested_start=%s",
            provider_id,
            overlap.id,
            new_start,
        )
        raise HTTPException(
            status_code=409,
            detail="Provider is not available at the selected time",
        )


def _has_time_conflict(db: Session, provider_id: Optional[int], scheduled_at) -> bool:
    """
    Returns True if provider has a pending/accepted booking that overlaps the new window.
    Overlap rule (1h fixed duration):
      existing.start < new.end  AND  existing.end > new.start
    end is derived (scheduled_at + 1 hour) so we avoid persisting duration for now.
    """
    if not provider_id or not scheduled_at:
        return False

    new_start = scheduled_at
    new_end = scheduled_at + timedelta(hours=1)

    # existing.end is derived on the fly to keep schema stable while duration is fixed
    existing_end = Booking.scheduled_at + text("interval '1 hour'")

    conflict = (
        db.query(Booking.id)
        .filter(
            Booking.provider_id == provider_id,
            Booking.status.in_(["pending", "accepted"]),
            Booking.scheduled_at < new_end,  # existing starts before new ends
            existing_end > new_start,        # existing ends after new starts
        )
        .first()
    )

    return conflict is not None


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
        cancelled_by=booking.cancelled_by,
        cancel_reason=booking.cancel_reason,
        cancelled_at=booking.cancelled_at.isoformat() if booking.cancelled_at else None,
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

        _ensure_provider_available(db, provider_id, payload.scheduled_at)

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

    if provider_id:
        _ensure_provider_available(db, provider_id, payload.scheduled_at)

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

    old_status = booking.status
    booking.status = payload.status
    db.add(booking)
    db.commit()
    db.refresh(booking)
    _log_status_change(
        booking_id=booking.id,
        old_status=old_status,
        new_status=booking.status,
        actor_id=current_user.id,
        actor_role="provider",
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


@router.put("/{booking_id}/accept", response_model=schemas.BookingOut)
def accept_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_provider),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if not current_user.provider:
        raise HTTPException(status_code=403, detail="Provider profile required")

    if booking.provider_id != current_user.provider.id:
        raise HTTPException(status_code=403, detail="Only the assigned provider can accept this booking")

    if booking.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending bookings can be accepted")

    # Lock provider bookings and re-check overlap to avoid race conditions on acceptance
    _ensure_provider_available(db, current_user.provider.id, booking.scheduled_at)

    validate_booking_transition(booking.status, "accepted")

    old_status = booking.status
    booking.status = "accepted"
    db.add(booking)
    db.commit()
    db.refresh(booking)

    _log_status_change(
        booking_id=booking.id,
        old_status=old_status,
        new_status=booking.status,
        actor_id=current_user.id,
        actor_role="provider",
    )
    _audit(
        db,
        actor_id=current_user.id,
        action="booking_accepted",
        target_type="booking",
        target_id=booking.id,
        metadata={"status": booking.status},
    )

    return _booking_to_schema(db, booking)


@router.put("/{booking_id}/reject", response_model=schemas.BookingOut)
def reject_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_provider),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if not current_user.provider:
        raise HTTPException(status_code=403, detail="Provider profile required")

    if booking.provider_id != current_user.provider.id:
        raise HTTPException(status_code=403, detail="Only the assigned provider can reject this booking")

    if booking.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending bookings can be rejected")

    validate_booking_transition(booking.status, "rejected")

    old_status = booking.status
    booking.status = "rejected"
    db.add(booking)
    db.commit()
    db.refresh(booking)

    _log_status_change(
        booking_id=booking.id,
        old_status=old_status,
        new_status=booking.status,
        actor_id=current_user.id,
        actor_role="provider",
    )
    _audit(
        db,
        actor_id=current_user.id,
        action="booking_rejected",
        target_type="booking",
        target_id=booking.id,
        metadata={"status": booking.status},
    )

    return _booking_to_schema(db, booking)


@router.put("/{booking_id}/complete", response_model=schemas.BookingOut)
def complete_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_provider),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if not current_user.provider:
        raise HTTPException(status_code=403, detail="Provider profile required")

    if booking.provider_id != current_user.provider.id:
        raise HTTPException(status_code=403, detail="Only the assigned provider can complete this booking")

    if booking.status != "accepted":
        raise HTTPException(status_code=400, detail="Only accepted bookings can be completed")

    validate_booking_transition(booking.status, "completed")

    old_status = booking.status
    booking.status = "completed"
    db.add(booking)
    db.commit()
    db.refresh(booking)

    _log_status_change(
        booking_id=booking.id,
        old_status=old_status,
        new_status=booking.status,
        actor_id=current_user.id,
        actor_role="provider",
    )
    _audit(
        db,
        actor_id=current_user.id,
        action="booking_completed",
        target_type="booking",
        target_id=booking.id,
        metadata={"status": booking.status},
    )

    return _booking_to_schema(db, booking)


@router.put("/{booking_id}/cancel", response_model=schemas.BookingOut)
def cancel_booking(
    booking_id: int,
    payload: schemas.BookingCancelRequest | None = None,
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

    if booking.status != "pending":
        raise HTTPException(
            status_code=400, detail="Only pending bookings can be cancelled by user"
        )

    validate_booking_transition(booking.status, "cancelled")

    old_status = booking.status
    booking.status = "cancelled"
    booking.cancelled_by = "user"
    booking.cancel_reason = (payload.reason if payload else None) or None
    booking.cancelled_at = func.now()
    db.commit()
    db.refresh(booking)
    _log_status_change(
        booking_id=booking.id,
        old_status=old_status,
        new_status=booking.status,
        actor_id=current_user.id,
        actor_role="user",
    )
    _audit(
        db,
        actor_id=current_user.id,
        action="booking_cancelled",
        target_type="booking",
        target_id=booking.id,
        metadata={
            "status": booking.status,
            "cancelled_by": booking.cancelled_by,
            "cancel_reason": booking.cancel_reason,
        },
    )
    return _booking_to_schema(db, booking)


@router.put("/{booking_id}/cancel/provider", response_model=schemas.BookingOut)
def cancel_booking_provider(
    booking_id: int,
    payload: schemas.BookingCancelRequest | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_provider),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if not current_user.provider:
        raise HTTPException(status_code=403, detail="Provider profile required")

    if booking.provider_id != current_user.provider.id:
        raise HTTPException(
            status_code=403, detail="Only the assigned provider can cancel this booking"
        )

    if booking.status != "accepted":
        raise HTTPException(
            status_code=400, detail="Only accepted bookings can be cancelled by provider"
        )

    validate_booking_transition(booking.status, "cancelled")

    old_status = booking.status
    booking.status = "cancelled"
    booking.cancelled_by = "provider"
    booking.cancel_reason = (payload.reason if payload else None) or None
    booking.cancelled_at = func.now()
    db.commit()
    db.refresh(booking)

    _log_status_change(
        booking_id=booking.id,
        old_status=old_status,
        new_status=booking.status,
        actor_id=current_user.id,
        actor_role="provider",
    )
    _audit(
        db,
        actor_id=current_user.id,
        action="booking_cancelled_by_provider",
        target_type="booking",
        target_id=booking.id,
        metadata={
            "status": booking.status,
            "cancelled_by": booking.cancelled_by,
            "cancel_reason": booking.cancel_reason,
        },
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

