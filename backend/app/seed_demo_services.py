import logging
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.session import SessionLocal
from app.models import Provider, Service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


SERVICES = [
    {
        "title": "Furniture Assembly",
        "category": "Home Repair",
        "price": 700,
        "description": "IKEA and general furniture assembly (desks, wardrobes).",
        "lat": 12.9716,
        "lon": 77.5946,
    },
    {
        "title": "Electric Bike Repair",
        "category": "Electronics",
        "price": 1200,
        "description": "Battery diagnostics, motor tune and controller calibration.",
        "lat": 12.9721,
        "lon": 77.5800,
    },
    {
        "title": "Home Deep Cleaning",
        "category": "Cleaning",
        "price": 2500,
        "description": "Full home deep clean: kitchen, bathroom, living room. 3–4 hours.",
        "lat": 12.9762,
        "lon": 77.6033,
    },
    {
        "title": "Washing Machine Repair",
        "category": "Home Repair",
        "price": 800,
        "description": "Front-load & top-load repairs, drum cleaning and motor checks.",
        "lat": 12.9690,
        "lon": 77.6400,
    },
    {
        "title": "AC Installation & Maintenance",
        "category": "Home Appliances",
        "price": 1499,
        "description": "Split & window AC installation, gas top-up, filter cleaning.",
        "lat": 12.9825,
        "lon": 77.6005,
    },
]


def get_first_provider(db: Session) -> Provider | None:
    return db.query(Provider).order_by(Provider.id.asc()).first()


def seed_services(db: Session, provider: Provider) -> int:
    added = 0
    existing = {
        s.title: s
        for s in db.query(Service)
        .filter(Service.provider_id == provider.id, Service.title.in_([s["title"] for s in SERVICES]))
        .all()
    }
    for svc in SERVICES:
        existing_svc = existing.get(svc["title"])
        if existing_svc:
            existing_svc.description = svc["description"]
            existing_svc.category = svc["category"]
            existing_svc.price = svc["price"]
            existing_svc.approved = True
            existing_svc.flagged = False
            if svc.get("lat") is not None and svc.get("lon") is not None:
                db.execute(
                    text("UPDATE services SET location = ST_SetSRID(ST_MakePoint(:lon, :lat), 4326) WHERE id = :id"),
                    {"lon": svc["lon"], "lat": svc["lat"], "id": existing_svc.id},
                )
        else:
            db_svc = Service(
                provider_id=provider.id,
                title=svc["title"],
                description=svc["description"],
                category=svc["category"],
                price=svc["price"],
                approved=True,
                flagged=False,
            )
            db.add(db_svc)
            db.flush()
            if svc.get("lat") is not None and svc.get("lon") is not None:
                db.execute(
                    text("UPDATE services SET location = ST_SetSRID(ST_MakePoint(:lon, :lat), 4326) WHERE id = :id"),
                    {"lon": svc["lon"], "lat": svc["lat"], "id": db_svc.id},
                )
            added += 1
    db.commit()
    return added


def main():
    db = SessionLocal()
    try:
        provider = get_first_provider(db)
        if not provider:
            logger.info("No providers found. Please create a provider before seeding services.")
            return
        added = seed_services(db, provider)
        logger.info("Seeded services for provider_id=%s, added=%s", provider.id, added)
    finally:
        db.close()


if __name__ == "__main__":
    main()

