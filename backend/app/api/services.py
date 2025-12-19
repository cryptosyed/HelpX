from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, text, or_
from sqlalchemy.orm import Session

from app import crud, schemas
from app.api import utils as api_utils
from app.api.deps import get_current_user, get_db
from app.models import Provider, Service as ServiceModel

router = APIRouter()


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
