from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_provider
from app.models import Provider, ProviderService, GlobalService
from app.schemas.provider_service import (
    ProviderServiceCreate,
    ProviderServiceOut,
    ProviderServiceUpdate,
)

router = APIRouter()


def get_provider_from_user(user, db: Session) -> Provider:
    """Get provider record from user"""
    provider = db.query(Provider).filter(Provider.user_id == user.id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider profile not found")
    return provider


@router.get("/provider/services", response_model=list[ProviderServiceOut])
def list_provider_services(db: Session = Depends(get_db), current_user=Depends(get_current_provider)):
    provider = get_provider_from_user(current_user, db)
    items = (
        db.query(ProviderService)
        .filter(ProviderService.provider_id == provider.id)
        .order_by(ProviderService.created_at.desc())
        .all()
    )
    return items


@router.post("/provider/services", response_model=ProviderServiceOut, status_code=status.HTTP_201_CREATED)
def create_provider_service(
    payload: ProviderServiceCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_provider),
):
    provider = get_provider_from_user(current_user, db)

    svc = db.query(GlobalService).filter(GlobalService.id == payload.service_id, GlobalService.is_active == True).first()  # noqa: E712
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")

    existing = (
        db.query(ProviderService)
        .filter(
            ProviderService.provider_id == provider.id,
            ProviderService.service_id == payload.service_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Provider already registered for this service")

    ps = ProviderService(
        provider_id=provider.id,
        service_id=payload.service_id,
        price=payload.price,
        service_radius_km=payload.service_radius_km,
        experience_years=payload.experience_years,
        is_active=payload.is_active if payload.is_active is not None else True,
    )
    db.add(ps)
    db.commit()
    db.refresh(ps)
    return ps


@router.put("/provider/services/{provider_service_id}", response_model=ProviderServiceOut)
def update_provider_service(
    provider_service_id: int,
    payload: ProviderServiceUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_provider),
):
    provider = get_provider_from_user(current_user, db)
    ps = (
        db.query(ProviderService)
        .filter(
            ProviderService.id == provider_service_id,
            ProviderService.provider_id == provider.id,
        )
        .first()
    )
    if not ps:
        raise HTTPException(status_code=404, detail="Provider service not found")

    if payload.price is not None:
        ps.price = payload.price
    if payload.service_radius_km is not None:
        ps.service_radius_km = payload.service_radius_km
    if payload.experience_years is not None:
        ps.experience_years = payload.experience_years
    if payload.is_active is not None:
        ps.is_active = payload.is_active

    db.add(ps)
    db.commit()
    db.refresh(ps)
    return ps

