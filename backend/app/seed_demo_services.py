import logging
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.session import SessionLocal
from app.models import Provider, Service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


SERVICES = [
    {
        "title": "House Cleaning",
        "category": "Cleaning",
        "price": 1800,
        "description": "Full home deep clean for 2BHK/3BHK apartments.",
        "lat": 12.9716,
        "lon": 77.5946,
        "image_url": "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
    },
    {
        "title": "Plumbing Service",
        "category": "Home Repair",
        "price": 950,
        "description": "Leak fixes, tap replacement, and drainage clearing.",
        "lat": 19.0760,
        "lon": 72.8777,
        "image_url": "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=80",
    },
    {
        "title": "Electrician",
        "category": "Home Repair",
        "price": 1100,
        "description": "Fan, light, MCB and wiring fixes with safety checks.",
        "lat": 28.6139,
        "lon": 77.2090,
        "image_url": "https://images.unsplash.com/photo-1582719478248-54e9f2f9f2d3?auto=format&fit=crop&w=800&q=80",
    },
    {
        "title": "AC Repair",
        "category": "Home Appliances",
        "price": 1500,
        "description": "Cooling issues, gas top-up, coil cleaning, and servicing.",
        "lat": 19.2183,
        "lon": 72.9781,
        "image_url": "https://images.unsplash.com/photo-1501045661006-fcebe0257c3f?auto=format&fit=crop&w=800&q=80",
    },
    {
        "title": "Home Painting",
        "category": "Home Improvement",
        "price": 3200,
        "description": "Interior wall repainting with low-VOC paints.",
        "lat": 12.9141,
        "lon": 77.6510,
        "image_url": "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80",
    },
    {
        "title": "Pest Control",
        "category": "Cleaning",
        "price": 1400,
        "description": "Eco-safe pest control for cockroaches and ants.",
        "lat": 28.7041,
        "lon": 77.1025,
        "image_url": "https://images.unsplash.com/photo-1441123694162-e54a981ceba3?auto=format&fit=crop&w=800&q=80",
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

