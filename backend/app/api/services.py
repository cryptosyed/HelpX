from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, text, or_
from sqlalchemy.orm import Session

from app import crud, schemas
from app.api import utils as api_utils
from app.api.deps import get_current_user, get_db
from app.models import Provider, Service as ServiceModel, GlobalService
from app.schemas.service import (
    GlobalServiceCreate,
    GlobalServiceOut,
    GlobalServiceUpdate,
)

router = APIRouter()


def _generate_global_description(title: str, category: str) -> str:
    """Build a stored description when none is provided."""
    title_text = (title or "service").strip() or "service"
    category_text = (category or "our services").strip() or "our services"
    return (
        f"Expert {title_text} services under {category_text}. "
        "Trusted professionals, flexible scheduling, and reliable support."
    )


@router.get("/global", response_model=list[schemas.GlobalServiceOut])
def list_global_services(db: Session = Depends(get_db)):
    """
    Public/global catalog for providers/users to browse.
    """
    items = (
        db.query(GlobalService)
        .filter(GlobalService.is_active == True)  # noqa: E712
        .order_by(GlobalService.title.asc())
        .all()
    )
    return items


# PUBLIC: Global service detail
@router.get("/global/{service_id}", response_model=schemas.ServiceOut)
def get_global_service(service_id: int, db: Session = Depends(get_db)):
    gs = db.query(GlobalService).filter(GlobalService.id == service_id, GlobalService.is_active == True).first()  # noqa: E712
    if not gs:
        raise HTTPException(status_code=404, detail="Service not found")
    return schemas.ServiceOut(
        id=gs.id,
        provider_id=0,
        title=gs.title,
        description=api_utils.ensure_description(gs.title, gs.category, gs.description),
        category=gs.category,
        price=gs.base_price,
        lat=None,
        lon=None,
        image_url="/images/service-placeholder.jpg",
        flagged=False,
        flag_reason=None,
        approved=True,
        created_at=None,
    )


# PUBLIC: Global service list (simple filters)
@router.get("/global", response_model=List[GlobalServiceOut])
def list_global_services(
    q: Optional[str] = None,
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    page: int = 1,
    page_size: int = 50,
    db: Session = Depends(get_db),
):
    page = max(page, 1)
    page_size = max(1, min(page_size, 200))
    query = db.query(GlobalService).filter(GlobalService.is_active == True)  # noqa: E712

    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                GlobalService.title.ilike(like),
                GlobalService.description.ilike(like),
                GlobalService.category.ilike(like),
            )
        )
    if category:
        query = query.filter(GlobalService.category == category)
    if min_price is not None:
        query = query.filter(GlobalService.base_price >= min_price)
    if max_price is not None:
        query = query.filter(GlobalService.base_price <= max_price)

    items = (
        query.order_by(GlobalService.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return items

# CREATE (protected)
@router.post("/", response_model=schemas.ServiceOut)
def create_service(
    svc: schemas.ServiceCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    prov = current_user.provider
    if not prov:
        prov = Provider(
            user_id=current_user.id,
            business_name=current_user.name or current_user.email,
        )
        db.add(prov)
        db.commit()
        db.refresh(prov)
    db_svc = crud.create_service(db, provider_id=prov.id, svc=svc)
    return api_utils.service_to_schema(db, db_svc)


# LIST (public)
@router.get("/", response_model=schemas.ServiceListResponse)
def list_services(
    q: Optional[str] = None,
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    radius_km: float = 10.0,
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db),
):
    page = max(page, 1)
    page_size = max(1, min(page_size, 50))

    query = db.query(ServiceModel).filter(ServiceModel.approved == True)  # noqa: E712

    if lat is not None and lon is not None:
        query = query.filter(
            func.ST_DWithin(
                ServiceModel.location,
                func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326),
                radius_km * 1000,
            )
        )

    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                ServiceModel.title.ilike(like),
                ServiceModel.description.ilike(like),
                ServiceModel.category.ilike(like),
            )
        )

    if category:
        query = query.filter(ServiceModel.category == category)
    if min_price is not None:
        query = query.filter(ServiceModel.price >= min_price)
    if max_price is not None:
        query = query.filter(ServiceModel.price <= max_price)

    total = query.count()
    services = (
        query.order_by(ServiceModel.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = [api_utils.service_to_schema(db, svc) for svc in services]
    return schemas.ServiceListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


# ========== ADMIN: GLOBAL SERVICE CATALOG ==========


def _require_admin(current_user):
    if not current_user or getattr(current_user, "role", None) != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


@router.get("/admin/global-services", response_model=List[GlobalServiceOut])
def admin_list_global_services(
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    _require_admin(current_user)
    services = db.query(GlobalService).order_by(GlobalService.created_at.desc()).all()
    return services


@router.post("/admin/global-services", response_model=GlobalServiceOut, status_code=status.HTTP_201_CREATED)
def admin_create_global_service(
    payload: GlobalServiceCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _require_admin(current_user)
    desc = payload.description
    if not desc or not desc.strip():
        desc = _generate_global_description(payload.title, payload.category)
    svc = GlobalService(
        title=payload.title,
        category=payload.category,
        description=desc,
        base_price=payload.base_price,
        is_active=payload.is_active if payload.is_active is not None else True,
    )
    db.add(svc)
    db.commit()
    db.refresh(svc)
    return svc


@router.put("/admin/global-services/{service_id}", response_model=GlobalServiceOut)
def admin_update_global_service(
    service_id: int,
    payload: GlobalServiceUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _require_admin(current_user)
    svc = db.query(GlobalService).filter(GlobalService.id == service_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    if payload.title is not None:
        svc.title = payload.title
    if payload.category is not None:
        svc.category = payload.category
    if payload.description is not None:
        incoming_desc = payload.description
        if not incoming_desc or not incoming_desc.strip():
            svc.description = _generate_global_description(svc.title, svc.category)
        else:
            svc.description = incoming_desc
    else:
        # If description was previously empty, backfill it using current title/category
        if not svc.description or not svc.description.strip():
            svc.description = _generate_global_description(svc.title, svc.category)
    if payload.base_price is not None:
        svc.base_price = payload.base_price
    if payload.is_active is not None:
        svc.is_active = payload.is_active
    db.add(svc)
    db.commit()
    db.refresh(svc)
    return svc


@router.delete("/admin/global-services/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_global_service(
    service_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _require_admin(current_user)
    svc = db.query(GlobalService).filter(GlobalService.id == service_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    db.delete(svc)
    db.commit()
    return None


# PROVIDER: list services belonging to logged-in provider
@router.get("/provider/", response_model=List[schemas.ServiceOut])
def provider_services(
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    prov = current_user.provider
    if not prov:
        return []
    q = db.query(ServiceModel).filter(ServiceModel.provider_id == prov.id)
    return [api_utils.service_to_schema(db, svc) for svc in q.all()]


@router.get("/{service_id}/", response_model=schemas.ServiceOut)
def get_service(service_id: int, db: Session = Depends(get_db)):
    svc = db.query(ServiceModel).filter(ServiceModel.id == service_id, ServiceModel.approved == True).first()  # noqa: E712
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    return api_utils.service_to_schema(db, svc)


# UPDATE service (provider must own)
@router.put("/{service_id}/", response_model=schemas.ServiceOut)
def update_service(
    service_id: int,
    svc: schemas.ServiceCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    prov = current_user.provider
    if not prov:
        raise HTTPException(status_code=403, detail="User is not a provider")
    s = (
        db.query(ServiceModel)
        .filter(ServiceModel.id == service_id, ServiceModel.provider_id == prov.id)
        .first()
    )
    if not s:
        raise HTTPException(status_code=404, detail="Service not found")

    s.title = svc.title
    s.description = svc.description
    s.category = svc.category
    s.price = svc.price
    s.image_url = svc.image_url or s.image_url or "/images/service-placeholder.jpg"

    db.add(s)
    db.commit()

    if svc.lat is not None and svc.lon is not None:
        try:
            db.execute(
                text(
                    "UPDATE services SET location = ST_SetSRID(ST_MakePoint(:lon, :lat), 4326) "
                    "WHERE id = :id"
                ),
                {"lon": svc.lon, "lat": svc.lat, "id": service_id},
            )
            db.commit()
        except Exception:
            pass

    return api_utils.service_to_schema(db, s)


# DELETE service (provider must own)
@router.delete("/{service_id}/", status_code=status.HTTP_204_NO_CONTENT)
def delete_service(
    service_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    prov = current_user.provider
    if not prov:
        raise HTTPException(status_code=403, detail="User is not a provider")
    s = (
        db.query(ServiceModel)
        .filter(ServiceModel.id == service_id, ServiceModel.provider_id == prov.id)
        .first()
    )
    if not s:
        raise HTTPException(status_code=404, detail="Service not found")
    db.delete(s)
    db.commit()
    return
