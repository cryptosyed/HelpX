from sqlalchemy.orm import Session
from app import schemas
from app.models import Provider, Service, User
from geoalchemy2.shape import from_shape
from shapely.geometry import Point

def create_user(db: Session, email: str, hashed_password: str, name: str = None, role: str = "customer"):
    db_user = User(email=email, hashed_password=hashed_password, name=name, role=role)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    if role == "provider":
        prov = Provider(user_id=db_user.id, business_name=name or email)
        db.add(prov)
        db.commit()
        db.refresh(prov)
    return db_user

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def create_service(db: Session, provider_id: int, svc: schemas.ServiceCreate):
    point = None
    if svc.lon is not None and svc.lat is not None:
        point = from_shape(Point(svc.lon, svc.lat), srid=4326)
    db_svc = Service(
        provider_id=provider_id,
        title=svc.title,
        description=svc.description,
        category=svc.category,
        price=svc.price,
        location=point,
    )
    db.add(db_svc)
    db.commit()
    db.refresh(db_svc)
    return db_svc

def get_services(db: Session, lat: float = None, lon: float = None, radius_km: float = 10.0, skip: int = 0, limit: int = 50):
    q = db.query(Service)
    if lat is not None and lon is not None:
        from sqlalchemy import func
        q = q.filter(func.ST_DWithin(Service.location, func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326), radius_km * 1000))
    return q.offset(skip).limit(limit).all()
