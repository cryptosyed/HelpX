import logging
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, extract, text
from sqlalchemy.orm import Session

from app import schemas
from app.api import utils as api_utils
from app.api.deps import get_db, get_current_provider, get_current_user
from app.models import (
    User,
    Provider,
    ProviderProfile,
    Booking,
    ProviderPayoutSettings,
    Review,
)
from app.models.provider_service import ProviderService

logger = logging.getLogger(__name__)

router = APIRouter()
earnings_router = APIRouter()


def get_provider_from_user(user: User, db: Session) -> Provider:
    """Get provider record from user"""
    provider = db.query(Provider).filter(Provider.user_id == user.id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider profile not found")
    return provider


# ========== PROVIDER PROFILE ==========


@router.get("/profile", response_model=schemas.ProviderProfileOut)
def get_provider_profile(
    provider_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns provider profile. If provider_id is omitted, returns the current provider's profile.
    Always returns an object (empty fields if not yet created).
    """
    if provider_id is None:
        if current_user.role not in ["provider", "admin"]:
            raise HTTPException(status_code=403, detail="Provider access required")
        provider = get_provider_from_user(current_user, db)
        target_provider_id = provider.id
    else:
        provider = db.query(Provider).filter(Provider.id == provider_id).first()
        if not provider:
            raise HTTPException(status_code=404, detail="Provider not found")
        target_provider_id = provider.id

    profile = (
        db.query(ProviderProfile)
        .filter(ProviderProfile.provider_id == target_provider_id)
        .first()
    )
    if not profile:
        return schemas.ProviderProfileOut(
            provider_id=target_provider_id,
            business_name=None,
            phone=None,
            bio=None,
            created_at=None,
            updated_at=None,
        )
    return profile


@router.put("/profile", response_model=schemas.ProviderProfileOut)
def upsert_provider_profile(
    payload: schemas.ProviderProfileBase,
    db: Session = Depends(get_db),
    provider: Provider = Depends(get_current_provider),
):
    profile = (
        db.query(ProviderProfile)
        .filter(ProviderProfile.provider_id == provider.id)
        .first()
    )

    if not profile:
        profile = ProviderProfile(provider_id=provider.id)
        db.add(profile)

    profile.business_name = payload.business_name
    profile.phone = payload.phone
    profile.bio = payload.bio

    db.commit()
    db.refresh(profile)
    return profile


# ========== PROVIDER SERVICE CRUD ==========

@router.post("/services", response_model=schemas.ProviderServiceOut)
def create_provider_service(
    svc: schemas.ProviderServiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_provider),
):
    provider = get_provider_from_user(current_user, db)

    # Prevent duplicate service offering
    existing = (
        db.query(ProviderService)
        .filter(
            ProviderService.provider_id == provider.id,
            ProviderService.service_id == svc.service_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Provider already registered for this service",
        )

    ps = ProviderService(
        provider_id=provider.id,
        service_id=svc.service_id,
        price=svc.price,
        service_radius_km=svc.service_radius_km,
        experience_years=svc.experience_years,
        is_active=True,
    )

    db.add(ps)
    db.commit()
    db.refresh(ps)

    logger.info(
        "Provider %s registered service %s",
        provider.id,
        svc.service_id,
    )

    return ps


@router.get("/services", response_model=List[schemas.ProviderServiceOut])
def list_provider_services(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_provider),
):
    provider = get_provider_from_user(current_user, db)

    services = (
        db.query(ProviderService)
        .filter(ProviderService.provider_id == provider.id)
        .order_by(ProviderService.created_at.desc())
        .all()
    )

    return services


@router.put("/services/{service_id}", response_model=schemas.ServiceOut)
def update_provider_service(
    service_id: int,
    svc: schemas.ServiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_provider),
):
    provider = get_provider_from_user(current_user, db)
    db_svc = (
        db.query(Service)
        .filter(Service.id == service_id, Service.provider_id == provider.id)
        .first()
    )
    if not db_svc:
        raise HTTPException(status_code=404, detail="Service not found")
    if db_svc.approved:
        raise HTTPException(status_code=403, detail="Approved services cannot be edited")

    db_svc.title = svc.title
    db_svc.description = svc.description
    db_svc.category = svc.category
    db_svc.price = svc.price
    db_svc.image_url = svc.image_url or db_svc.image_url or "/images/service-placeholder.jpg"
    db.add(db_svc)
    db.commit()

    if svc.lat is not None and svc.lon is not None:
        try:
            db.execute(
                text(
                    "UPDATE services SET location = ST_SetSRID(ST_MakePoint(:lon, :lat), 4326) WHERE id = :id"
                ),
                {"lon": svc.lon, "lat": svc.lat, "id": db_svc.id},
            )
            db.commit()
        except Exception as exc:  # pragma: no cover - optional enhancement
            logger.warning("Failed to set location for service %s: %s", db_svc.id, exc)

    return api_utils.service_to_schema(db, db_svc)


@router.delete("/services/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_provider_service(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_provider),
):
    provider = get_provider_from_user(current_user, db)
    db_svc = (
        db.query(Service)
        .filter(Service.id == service_id, Service.provider_id == provider.id)
        .first()
    )
    if not db_svc:
        raise HTTPException(status_code=404, detail="Service not found")
    if db_svc.approved:
        raise HTTPException(status_code=403, detail="Approved services cannot be deleted")
    db.delete(db_svc)
    db.commit()
    return


# ========== PROVIDER RATING SUMMARY ==========


@router.get("/providers/{provider_id}/rating-summary", response_model=schemas.ProviderRatingSummary)
def get_provider_rating_summary(provider_id: int, db: Session = Depends(get_db)):
    # Ensure provider exists
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    agg = (
        db.query(
            func.count(Review.id).label("total_reviews"),
            func.avg(Review.rating).label("avg_rating"),
        )
        .join(Service, Service.id == Review.service_id)
        .filter(Service.provider_id == provider_id)
        .one_or_none()
    )

    total_reviews = agg.total_reviews if agg else 0
    avg_rating = None
    if agg and agg.total_reviews:
        avg_rating = round(float(agg.avg_rating), 1) if agg.avg_rating is not None else None

    return schemas.ProviderRatingSummary(
        provider_id=provider_id,
        avg_rating=avg_rating,
        total_reviews=total_reviews,
    )


# ========== PROVIDER BOOKING ACTIONS ==========


@router.get("/bookings", response_model=List[schemas.BookingOut])
def list_provider_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_provider),
):
    provider = get_provider_from_user(current_user, db)
    bookings = (
        db.query(Booking)
        .filter(Booking.provider_id == provider.id)
        .order_by(Booking.created_at.desc())
        .all()
    )
    return [api_utils.booking_to_schema(db, b) for b in bookings]


def _get_provider_booking_or_404(db: Session, provider_id: int, booking_id: int) -> Booking:
    booking = (
        db.query(Booking)
        .filter(Booking.id == booking_id, Booking.provider_id == provider_id)
        .first()
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


def _enforce_pending(booking: Booking):
    if booking.status != "pending":
        raise HTTPException(status_code=400, detail="Action requires pending booking")


def _enforce_accepted(booking: Booking):
    if booking.status != "accepted":
        raise HTTPException(status_code=400, detail="Action requires accepted booking")


@router.put("/bookings/{booking_id}/accept", response_model=schemas.BookingOut)
def accept_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_provider),
):
    provider = get_provider_from_user(current_user, db)
    booking = _get_provider_booking_or_404(db, provider.id, booking_id)
    _enforce_pending(booking)
    booking.status = "accepted"
    db.commit()
    db.refresh(booking)
    logger.info("Booking %s accepted by provider %s", booking.id, provider.id)
    return api_utils.booking_to_schema(db, booking)


@router.put("/bookings/{booking_id}/reject", response_model=schemas.BookingOut)
def reject_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_provider),
):
    provider = get_provider_from_user(current_user, db)
    booking = _get_provider_booking_or_404(db, provider.id, booking_id)
    _enforce_pending(booking)
    booking.status = "rejected"
    db.commit()
    db.refresh(booking)
    logger.info("Booking %s rejected by provider %s", booking.id, provider.id)
    return api_utils.booking_to_schema(db, booking)


@router.put("/bookings/{booking_id}/complete", response_model=schemas.BookingOut)
def complete_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_provider),
):
    provider = get_provider_from_user(current_user, db)
    booking = _get_provider_booking_or_404(db, provider.id, booking_id)
    _enforce_accepted(booking)
    booking.status = "completed"
    db.commit()
    db.refresh(booking)
    logger.info("Booking %s completed by provider %s", booking.id, provider.id)
    return api_utils.booking_to_schema(db, booking)


# ========== EARNINGS ==========

@router.get("/earnings/monthly", response_model=List[schemas.ProviderEarningsOut])
def get_monthly_earnings(
    months: int = 6,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_provider),
):
    """Get monthly earnings for the provider"""
    provider = get_provider_from_user(current_user, db)
    
    # Get earnings grouped by month
    earnings = db.query(
        extract('year', Booking.created_at).label('year'),
        extract('month', Booking.created_at).label('month'),
        func.coalesce(func.sum(Booking.price), 0).label('total_earnings'),
        func.count(Booking.id).label('booking_count')
    ).filter(
        Booking.provider_id == provider.id,
        Booking.status == "accepted"
    ).group_by(
        extract('year', Booking.created_at),
        extract('month', Booking.created_at)
    ).order_by(
        extract('year', Booking.created_at).desc(),
        extract('month', Booking.created_at).desc()
    ).limit(months).all()
    
    result = []
    for e in earnings:
        month_str = f"{int(e.year)}-{int(e.month):02d}"
        result.append({
            "month": month_str,
            "total_earnings": float(e.total_earnings or 0),
            "booking_count": e.booking_count
        })
    
    return result


@earnings_router.get("/providers/earnings")
def get_earnings_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_provider),
):
    """Earnings summary for provider - accepted bookings only."""
    provider = get_provider_from_user(current_user, db)

    base_q = db.query(Booking).filter(
        Booking.provider_id == provider.id, Booking.status == "accepted"
    )

    total_earnings = base_q.with_entities(func.coalesce(func.sum(Booking.price), 0)).scalar() or 0
    total_bookings = base_q.with_entities(func.count(Booking.id)).scalar() or 0

    monthly_rows = (
        base_q.with_entities(
            func.to_char(Booking.scheduled_at, "YYYY-MM").label("month"),
            func.coalesce(func.sum(Booking.price), 0).label("amount"),
        )
        .group_by("month")
        .order_by("month")
        .all()
    )

    monthly = [{"month": row.month, "amount": float(row.amount)} for row in monthly_rows]

    return {
        "total_earnings": float(total_earnings),
        "total_bookings": int(total_bookings),
        "monthly": monthly,
    }


@router.get("/earnings")
def get_earnings_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_provider),
):
    """Earnings summary for provider - accepted bookings only."""
    provider = get_provider_from_user(current_user, db)

    base_q = db.query(Booking).filter(
        Booking.provider_id == provider.id, Booking.status == "accepted"
    )

    total_earnings = base_q.with_entities(func.coalesce(func.sum(Booking.price), 0)).scalar() or 0
    booking_count = base_q.with_entities(func.count(Booking.id)).scalar() or 0

    monthly_rows = (
        base_q.with_entities(
            func.to_char(Booking.scheduled_at, "YYYY-MM").label("month"),
            func.coalesce(func.sum(Booking.price), 0).label("amount"),
        )
        .group_by("month")
        .order_by("month")
        .all()
    )

    monthly = [{"month": row.month, "amount": float(row.amount)} for row in monthly_rows]

    return {
        "total_earnings": float(total_earnings),
        "booking_count": int(booking_count),
        "monthly": monthly,
    }


# ========== CALENDAR ==========

@router.get("/calendar", response_model=List[schemas.ProviderCalendarEvent])
def get_calendar(
    start_date: str = None,
    end_date: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_provider),
):
    """Get provider's booking calendar"""
    provider = get_provider_from_user(current_user, db)
    
    query = db.query(Booking).filter(Booking.provider_id == provider.id)
    
    if start_date:
        query = query.filter(Booking.scheduled_at >= start_date)
    if end_date:
        query = query.filter(Booking.scheduled_at <= end_date)
    
    bookings = query.order_by(Booking.scheduled_at.asc()).all()
    
    result = []
    for booking in bookings:
        user_name = booking.user.name if booking.user else None
        service_title = booking.service.title if booking.service else "Unknown Service"
        
        result.append({
            "id": booking.id,
            "service_title": service_title,
            "when_at": booking.scheduled_at.isoformat() if booking.scheduled_at else None,
            "status": booking.status,
            "user_name": user_name,
            "notes": booking.notes
        })
    
    return result


# ========== PAYOUT SETTINGS ==========

@router.get("/payout", response_model=schemas.PayoutSettingsOut)
def get_payout_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_provider),
):
    """Get provider payout settings"""
    provider = get_provider_from_user(current_user, db)
    
    settings = db.query(ProviderPayoutSettings).filter(
        ProviderPayoutSettings.provider_id == provider.id
    ).first()
    
    if not settings:
        # Create default empty settings
        settings = ProviderPayoutSettings(provider_id=provider.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    return settings


@router.put("/payout", response_model=schemas.PayoutSettingsOut)
def update_payout_settings(
    payout_data: schemas.PayoutSettingsCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_provider),
):
    """Update provider payout settings"""
    provider = get_provider_from_user(current_user, db)
    
    settings = db.query(ProviderPayoutSettings).filter(
        ProviderPayoutSettings.provider_id == provider.id
    ).first()
    
    if not settings:
        settings = ProviderPayoutSettings(provider_id=provider.id)
        db.add(settings)
    
    if payout_data.upi_id is not None:
        settings.upi_id = payout_data.upi_id
    if payout_data.bank_acc_no is not None:
        settings.bank_acc_no = payout_data.bank_acc_no
    if payout_data.bank_ifsc is not None:
        settings.bank_ifsc = payout_data.bank_ifsc
    
    settings.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(settings)
    
    return settings

