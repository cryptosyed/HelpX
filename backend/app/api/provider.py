from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List
from datetime import datetime, timedelta

from app.api.deps import get_db, get_current_provider
from app.models import User, Provider, Booking, ProviderPayoutSettings
from app import schemas

router = APIRouter()
earnings_router = APIRouter()


def get_provider_from_user(user: User, db: Session) -> Provider:
    """Get provider record from user"""
    provider = db.query(Provider).filter(Provider.user_id == user.id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider profile not found")
    return provider


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

