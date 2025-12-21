from sqlalchemy import text
from sqlalchemy.orm import Session

from app import schemas
from app.models import Service as ServiceModel


def service_to_schema(db: Session, service: ServiceModel) -> schemas.ServiceOut:
    lat_val, lon_val = None, None
    try:
        row = db.execute(
            text(
                "SELECT ST_X(location::geometry) AS lon, ST_Y(location::geometry) AS lat "
                "FROM services WHERE id = :id"
            ),
            {"id": service.id},
        ).first()
        if row:
            lon_val = float(row[0]) if row[0] is not None else None
            lat_val = float(row[1]) if row[1] is not None else None
    except Exception:
        lat_val = lon_val = None

    return schemas.ServiceOut(
        id=service.id,
        provider_id=service.provider_id,
        title=service.title,
        description=service.description,
        category=service.category,
        price=float(service.price) if service.price is not None else None,
        lat=lat_val,
        lon=lon_val,
        image_url=getattr(service, "image_url", None) or "/images/service-placeholder.jpg",
        flagged=getattr(service, 'flagged', False),
        flag_reason=getattr(service, 'flag_reason', None),
        approved=getattr(service, 'approved', True),
        created_at=service.created_at.isoformat() if service.created_at else None,
    )


