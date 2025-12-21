import logging
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, and_, or_
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_admin
from app.models import User, Provider, Service, Booking, Report, AuditLog, Review
from app import schemas

router = APIRouter()
logger = logging.getLogger(__name__)


# ========== USER MANAGEMENT ==========

@router.get("/users", response_model=schemas.UserListResponse)
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """List all users with pagination and filters"""
    query = db.query(User)
    
    if search:
        query = query.filter(
            or_(
                User.email.ilike(f"%{search}%"),
                User.name.ilike(f"%{search}%")
            )
        )
    
    if role:
        query = query.filter(User.role == role)
    
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    
    total = query.count()
    users = query.offset((page - 1) * page_size).limit(page_size).all()
    
    return {
        "items": users,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/users/{user_id}", response_model=schemas.UserOut)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Get user by ID"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/users/{user_id}", response_model=schemas.UserOut)
def update_user(
    user_id: int,
    user_update: schemas.UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Update user (role, is_active, etc.)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_update.role is not None:
        if user_update.role not in ["user", "provider", "admin"]:
            raise HTTPException(status_code=400, detail="Invalid role")
        user.role = user_update.role
    
    if user_update.is_active is not None:
        user.is_active = user_update.is_active
    
    if user_update.name is not None:
        user.name = user_update.name
    
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Delete user (soft delete by setting is_active=False)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    user.is_active = False
    db.commit()
    return {"message": "User deactivated"}


# ========== PROVIDER VERIFICATION ==========

@router.get("/providers/pending", response_model=List[schemas.ProviderOut])
def get_pending_providers(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Get all pending provider verification requests"""
    providers = db.query(Provider).filter(Provider.is_verified == False).all()
    return providers


@router.get("/providers", response_model=List[schemas.AdminProviderOut])
def list_providers_admin(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    logger.info("Admin providers list requested by admin_id=%s", admin.id)
    review_agg_subq = (
        db.query(
            Service.provider_id.label("pid"),
            func.avg(Review.rating).label("avg_rating"),
            func.count(Review.id).label("total_reviews"),
        )
        .outerjoin(Review, Review.service_id == Service.id)
        .group_by(Service.provider_id)
        .subquery()
    )

    rows = (
        db.query(
            Provider.id.label("provider_id"),
            User.name.label("name"),
            User.email.label("email"),
            Provider.is_verified.label("approved"),
            review_agg_subq.c.avg_rating,
            review_agg_subq.c.total_reviews,
        )
        .join(User, Provider.user_id == User.id)
        .outerjoin(review_agg_subq, review_agg_subq.c.pid == Provider.id)
        .all()
    )

    result = []
    for r in rows:
        avg_rating_val = (
            float(r.avg_rating) if r.avg_rating is not None else None
        )
        total_reviews_val = int(r.total_reviews or 0) if r.total_reviews is not None else 0
        approved_raw = getattr(r, "approved", None)
        approved_val = approved_raw if approved_raw is not None else None
        result.append(
            {
                "id": r.provider_id,
                "name": r.name,
                "email": r.email,
                "approved": approved_val,
                "avg_rating": avg_rating_val,
                "total_reviews": total_reviews_val,
            }
        )

    return result


@router.patch("/providers/{provider_id}/status", response_model=schemas.AdminProviderStatusOut)
def update_provider_status(
    provider_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    approved = payload.get("approved")
    if approved is None:
        raise HTTPException(status_code=400, detail="approved is required")

    provider.is_verified = bool(approved)
    db.commit()
    db.refresh(provider)

    return {
        "provider_id": provider.id,
        "approved": provider.is_verified,
    }


# TODO: Dev-only helper; remove before production
@router.post("/providers/{provider_id}/reset-to-pending")
def reset_provider_to_pending(
    provider_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    provider.is_verified = None
    db.commit()
    db.refresh(provider)

    return {"provider_id": provider.id, "approved": provider.is_verified}


@router.post("/providers/{provider_id}/reset")
def reset_provider_status(
    provider_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    provider.is_verified = None
    db.commit()
    db.refresh(provider)

    logger.info("Provider %s reset to pending", provider.id)
    return {"id": provider.id, "approved": provider.is_verified}


@router.get("/providers/{provider_id}/profile")
def get_provider_profile(
    provider_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    provider = (
        db.query(Provider, User)
        .join(User, Provider.user_id == User.id)
        .filter(Provider.id == provider_id)
        .first()
    )
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    provider_obj, user_obj = provider
    services = db.query(Service).filter(Service.provider_id == provider_id).all()
    services_out = [
        {
            "id": s.id,
            "title": s.title,
            "category": s.category,
            "price": float(s.price) if s.price is not None else None,
            "approved": s.approved,
        }
        for s in services
    ]

    return {
        "id": provider_obj.id,
        "name": user_obj.name,
        "email": user_obj.email,
        "approved": provider_obj.is_verified if provider_obj.is_verified is not None else None,
        "bio": provider_obj.bio,
        "services": services_out,
    }

@router.get("/providers/{provider_id}")
def get_provider_detail(
    provider_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    provider = (
        db.query(Provider, User)
        .join(User, Provider.user_id == User.id)
        .filter(Provider.id == provider_id)
        .first()
    )
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    provider_obj, user_obj = provider
    services = (
        db.query(Service)
        .filter(Service.provider_id == provider_id)
        .all()
    )
    services_out = [
        {
            "id": s.id,
            "title": s.title,
            "category": s.category,
            "price": float(s.price) if s.price is not None else None,
            "approved": s.approved,
        }
        for s in services
    ]

    return {
        "id": provider_obj.id,
        "name": user_obj.name,
        "email": user_obj.email,
        "bio": provider_obj.bio,
        "approved": provider_obj.is_verified if provider_obj.is_verified is not None else None,
        "services": services_out,
    }


@router.put("/services/{service_id}/activate")
def activate_service_admin(
    service_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    svc = db.query(Service).filter(Service.id == service_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    svc.approved = True
    db.commit()
    db.refresh(svc)
    return {
        "id": svc.id,
        "title": svc.title,
        "category": svc.category,
        "price": float(svc.price) if svc.price is not None else None,
        "is_active": bool(svc.approved),
    }


@router.put("/services/{service_id}/deactivate")
def deactivate_service_admin(
    service_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    svc = db.query(Service).filter(Service.id == service_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    svc.approved = False
    db.commit()
    db.refresh(svc)
    return {
        "id": svc.id,
        "title": svc.title,
        "category": svc.category,
        "price": float(svc.price) if svc.price is not None else None,
        "is_active": bool(svc.approved),
    }


@router.put("/services/{service_id}/activate")
def activate_service(
    service_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    svc = db.query(Service).filter(Service.id == service_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    svc.approved = True
    db.commit()
    db.refresh(svc)
    return {
        "id": svc.id,
        "title": svc.title,
        "price": float(svc.price) if svc.price is not None else None,
        "category": svc.category,
        "is_active": bool(svc.approved),
    }


@router.put("/services/{service_id}/deactivate")
def deactivate_service(
    service_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    svc = db.query(Service).filter(Service.id == service_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    svc.approved = False
    db.commit()
    db.refresh(svc)
    return {
        "id": svc.id,
        "title": svc.title,
        "price": float(svc.price) if svc.price is not None else None,
        "category": svc.category,
        "is_active": bool(svc.approved),
    }


# ========== ADMIN STATS ==========


@router.get("/stats")
def admin_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Aggregate stats for admin dashboard."""
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_providers = db.query(func.count(User.id)).filter(User.role == "provider").scalar() or 0
    active_bookings = db.query(func.count(Booking.id)).filter(Booking.status == "active").scalar() or 0
    pending_reports = db.query(func.count(Report.id)).filter(Report.status == "pending").scalar() or 0

    return {
        "total_users": int(total_users),
        "total_providers": int(total_providers),
        "active_bookings": int(active_bookings),
        "pending_reports": int(pending_reports),
    }


def _audit(db: Session, actor_id: int, action: str, target_type: str, target_id: int, metadata: dict = None):
    log = AuditLog(
        actor_id=actor_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        meta=str(metadata or {}),
    )
    db.add(log)
    db.commit()


def _compute_trust_score(db: Session, provider_id: int) -> schemas.TrustScoreOut:
    total_bookings = (
        db.query(func.count(Booking.id))
        .filter(Booking.provider_id == provider_id)
        .scalar()
        or 0
    )
    accepted = (
        db.query(func.count(Booking.id))
        .filter(Booking.provider_id == provider_id, Booking.status == "accepted")
        .scalar()
        or 0
    )
    cancelled = (
        db.query(func.count(Booking.id))
        .filter(Booking.provider_id == provider_id, Booking.status == "cancelled")
        .scalar()
        or 0
    )
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    rating = float(provider.rating or 0) if provider else 0
    rating_norm = min(max(rating / 5.0, 0.0), 1.0)

    reports_count = (
        db.query(func.count(Report.id))
        .filter(
            or_(
                Report.target_type == "provider",
                Report.report_type == "provider",
            ),
            Report.target_id == provider_id,
        )
        .scalar()
        or 0
    )

    accepted_ratio = (accepted / total_bookings) if total_bookings else 0.5
    cancel_ratio = (cancelled / total_bookings) if total_bookings else 0.0
    reports_penalty = min(reports_count / 5.0, 1.0)

    trust_score = (
        0.4 * accepted_ratio
        + 0.3 * rating_norm
        + 0.15 * (1 - cancel_ratio)
        + 0.15 * (1 - reports_penalty)
    )
    trust_score = min(max(trust_score, 0.0), 1.0)

    return schemas.TrustScoreOut(
        provider_id=provider_id,
        trust_score=round(trust_score, 4),
        accepted_ratio=round(accepted_ratio, 4),
        cancel_ratio=round(cancel_ratio, 4),
        rating_norm=round(rating_norm, 4),
        reports_penalty=round(reports_penalty, 4),
        total_bookings=int(total_bookings),
        reports_count=int(reports_count),
    )


@router.put("/providers/{provider_id}/verify")
def verify_provider(
    provider_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Verify a provider"""
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    provider.is_verified = True
    db.commit()
    _audit(db, admin.id, "provider_verified", "provider", provider_id, {})
    return {"message": "Provider verified", "provider_id": provider_id}


@router.put("/providers/{provider_id}/reject")
def reject_provider(
    provider_id: int,
    reason: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Reject provider verification"""
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    # Optionally deactivate provider's user account
    if provider.user:
        provider.user.is_active = False
    provider.is_verified = False
    db.commit()
    _audit(db, admin.id, "provider_rejected", "provider", provider_id, {"reason": reason})
    return {"message": "Provider rejected", "provider_id": provider_id}


@router.put("/providers/{provider_id}/suspend")
def suspend_provider(
    provider_id: int,
    reason: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    provider.is_suspended = True
    db.query(Service).filter(Service.provider_id == provider.id).update({"approved": False})
    db.commit()
    _audit(db, admin.id, "provider_suspended", "provider", provider_id, {"reason": reason})
    logger.info("Provider %s suspended by admin %s", provider_id, admin.id)
    return {"message": "Provider suspended", "provider_id": provider_id}


@router.put("/providers/{provider_id}/unsuspend")
def unsuspend_provider(
    provider_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    provider.is_suspended = False
    db.commit()
    _audit(db, admin.id, "provider_unsuspended", "provider", provider_id, {})
    return {"message": "Provider unsuspended", "provider_id": provider_id}


@router.get("/providers/{provider_id}/trust", response_model=schemas.TrustScoreOut)
def provider_trust_score(
    provider_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    return _compute_trust_score(db, provider_id)


# ========== SERVICE MODERATION ==========

@router.get("/services/flagged", response_model=List[schemas.ServiceOut])
def get_flagged_services(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Get all flagged services"""
    services = db.query(Service).filter(Service.flagged == True).all()
    return services


@router.get("/services", response_model=List[schemas.ServiceOut])
def list_services_admin(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    return db.query(Service).all()


@router.get("/services", response_model=List[schemas.ServiceOut])
def list_services_admin(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    return db.query(Service).all()


@router.put("/services/{service_id}/approve")
def approve_service(
    service_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Approve a flagged service"""
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    service.flagged = False
    service.approved = True
    service.flag_reason = None
    db.commit()
    _audit(db, admin.id, "service_approved", "service", service_id, {})
    logger.info("Service %s approved by admin %s", service_id, admin.id)
    return {"message": "Service approved", "service_id": service_id}


@router.put("/services/{service_id}/reject")
def reject_service(
    service_id: int,
    reason: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Reject a flagged service"""
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    service.flagged = True
    service.approved = False
    if reason:
        service.flag_reason = reason
    db.commit()
    _audit(db, admin.id, "service_rejected", "service", service_id, {"reason": reason})
    logger.info("Service %s rejected by admin %s", service_id, admin.id)
    return {"message": "Service rejected", "service_id": service_id}


# ========== REPORTS MODERATION ==========

@router.get("/reports", response_model=List[schemas.ReportOut])
def list_reports(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    query = db.query(Report)
    if status_filter:
        query = query.filter(Report.status == status_filter)
    return query.order_by(Report.created_at.desc()).all()


@router.get("/reports/all", response_model=List[schemas.ReportOut])
def list_reports_admin_all(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    return db.query(Report).order_by(Report.created_at.desc()).all()


@router.put("/reports/{report_id}/resolve", response_model=schemas.ReportOut)
def resolve_report(
    report_id: int,
    payload: schemas.ReportResolution,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    report.status = payload.status
    if payload.admin_notes is not None:
        report.admin_notes = payload.admin_notes
    report.resolved_at = datetime.utcnow()
    db.commit()
    db.refresh(report)
    _audit(
        db,
        admin.id,
        "report_resolved",
        "report",
        report_id,
        {"status": payload.status},
    )
    logger.info("Report %s resolved by admin %s", report_id, admin.id)
    return report


# ========== ANALYTICS ==========

@router.get("/analytics", response_model=schemas.AdminAnalytics)
def get_analytics(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Get admin analytics dashboard data"""
    # Total counts
    total_users = db.query(func.count(User.id)).scalar()
    total_providers = db.query(func.count(Provider.id)).scalar()
    total_services = db.query(func.count(Service.id)).scalar()
    total_bookings = db.query(func.count(Booking.id)).scalar()
    
    # Revenue (sum of completed/accepted bookings with price)
    revenue = db.query(func.coalesce(func.sum(Booking.price), 0)).filter(
        Booking.status == "accepted"
    ).scalar() or 0
    
    # Active users (last 24 hours)
    last_24h = datetime.utcnow() - timedelta(hours=24)
    active_users = db.query(func.count(func.distinct(Booking.user_id))).filter(
        Booking.created_at >= last_24h
    ).scalar()
    
    # Bookings chart data (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    bookings_by_day = db.query(
        func.date(Booking.created_at).label('date'),
        func.count(Booking.id).label('count')
    ).filter(
        Booking.created_at >= thirty_days_ago
    ).group_by(func.date(Booking.created_at)).all()
    
    bookings_chart = [
        {
            "date": str(day.date),
            "count": day.count
        }
        for day in bookings_by_day
    ]
    
    return {
        "total_users": total_users,
        "total_providers": total_providers,
        "total_services": total_services,
        "total_bookings": total_bookings,
        "revenue": float(revenue),
        "active_users_24h": active_users,
        "bookings_chart": bookings_chart
    }


# ========== REPORTS MANAGEMENT ==========

@router.get("/reports", response_model=List[schemas.ReportOut])
def list_reports(
    status: Optional[str] = None,
    report_type: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """List all reports"""
    query = db.query(Report)
    
    if status:
        query = query.filter(Report.status == status)
    
    if report_type:
        query = query.filter(Report.report_type == report_type)
    
    reports = query.order_by(Report.created_at.desc()).all()
    return reports


@router.get("/reports/{report_id}", response_model=schemas.ReportOut)
def get_report(
    report_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Get report by ID"""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.put("/reports/{report_id}/resolve")
def resolve_report(
    report_id: int,
    resolution: schemas.ReportResolution,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Resolve a report"""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    report.status = resolution.status
    report.admin_notes = resolution.admin_notes
    report.resolved_at = datetime.utcnow()
    
    db.commit()
    return {"message": "Report resolved", "report_id": report_id}

