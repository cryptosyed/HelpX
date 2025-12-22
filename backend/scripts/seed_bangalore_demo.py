"""
DEV-ONLY: Reset providers/services and seed realistic Bangalore demo data.

Run locally:
  docker compose exec backend python /app/scripts/seed_bangalore_demo.py
or:
  cd backend && python scripts/seed_bangalore_demo.py
"""
from datetime import datetime, timedelta
import os
import sys
from typing import List

from sqlalchemy import text

# Make app importable
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import SessionLocal
from app.models import Booking, Provider, Service, User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

DEFAULT_PASSWORD = "Password123"

NOW = datetime.utcnow()


PROVIDERS = [
    {
        "name": "Ananya Rao",
        "email": "ananya.rao@helpx.test",
        "bio": "Certified AC technician serving Indiranagar & Domlur. 8+ years of experience.",
        "area": "Indiranagar",
        "services": [
            {
                "title": "AC Repair & Gas Top-up",
                "category": "Home Appliances",
                "price": 1800,
                "description": "Split/window AC diagnostics, coil cleaning, leak fix, gas top-up.",
                "lat": 12.9719,
                "lon": 77.6412,
            },
            {
                "title": "AC Installation",
                "category": "Home Appliances",
                "price": 2200,
                "description": "Wall mount, stabilizer check, vacuuming and performance test.",
                "lat": 12.9719,
                "lon": 77.6412,
            },
        ],
    },
    {
        "name": "Rohit Shetty",
        "email": "rohit.shetty@helpx.test",
        "bio": "Electricals specialist covering Whitefield & Mahadevapura.",
        "area": "Whitefield",
        "services": [
            {
                "title": "Electrician On-Demand",
                "category": "Home Repair",
                "price": 650,
                "description": "Switchboard, fan, MCB, and wiring fixes with safety checks.",
                "lat": 12.9698,
                "lon": 77.7499,
            },
            {
                "title": "Inverter & Battery Setup",
                "category": "Home Repair",
                "price": 1500,
                "description": "Inverter install, load testing, and maintenance.",
                "lat": 12.9698,
                "lon": 77.7499,
            },
        ],
    },
    {
        "name": "Meera Nair",
        "email": "meera.nair@helpx.test",
        "bio": "Home cleaning & housekeeping for Koramangala, STPI, and HSR Layout.",
        "area": "Koramangala",
        "services": [
            {
                "title": "2BHK Deep Cleaning",
                "category": "Cleaning",
                "price": 2600,
                "description": "Kitchen degreasing, bathroom scaling removal, full home vacuum.",
                "lat": 12.9352,
                "lon": 77.6245,
            },
            {
                "title": "Move-in Move-out Cleaning",
                "category": "Cleaning",
                "price": 3200,
                "description": "Full flat sanitization, cupboards, balcony, and windows.",
                "lat": 12.9352,
                "lon": 77.6245,
            },
        ],
    },
    {
        "name": "Arjun Kulkarni",
        "email": "arjun.kulkarni@helpx.test",
        "bio": "Plumbing & leak fixes across Jayanagar and JP Nagar.",
        "area": "Jayanagar",
        "services": [
            {
                "title": "Plumbing Repairs",
                "category": "Home Repair",
                "price": 900,
                "description": "Leak fixes, tap/flush replacement, drainage clearing.",
                "lat": 12.9250,
                "lon": 77.5938,
            },
            {
                "title": "Bathroom Fittings Installation",
                "category": "Home Repair",
                "price": 1400,
                "description": "Shower, geyser, and basin installations with pressure checks.",
                "lat": 12.9250,
                "lon": 77.5938,
            },
        ],
    },
    {
        "name": "Sneha Reddy",
        "email": "sneha.reddy@helpx.test",
        "bio": "Home chef & tiffin services for BTM and HSR residents.",
        "area": "BTM Layout",
        "services": [
            {
                "title": "Weekly Veg Tiffin",
                "category": "Food",
                "price": 1200,
                "description": "Fresh home-cooked veg meals, 5 days a week.",
                "lat": 12.9166,
                "lon": 77.6101,
            },
            {
                "title": "Weekend Meal Prep",
                "category": "Food",
                "price": 1500,
                "description": "Custom weekend meal prep for families (veg/non-veg).",
                "lat": 12.9166,
                "lon": 77.6101,
            },
        ],
    },
    {
        "name": "Farhan Khan",
        "email": "farhan.khan@helpx.test",
        "bio": "Carpentry & furniture fixes in Hebbal and RT Nagar.",
        "area": "Hebbal",
        "services": [
            {
                "title": "Furniture Repair",
                "category": "Carpentry",
                "price": 1100,
                "description": "Chair/door repair, hinge fixes, and polishing.",
                "lat": 13.0358,
                "lon": 77.5970,
            },
            {
                "title": "Custom Shelves & Wardrobes",
                "category": "Carpentry",
                "price": 2200,
                "description": "On-site measurement, design suggestions, and installation.",
                "lat": 13.0358,
                "lon": 77.5970,
            },
        ],
    },
]


def clear_existing(db):
    provider_ids = [pid for (pid,) in db.query(Provider.id).all()]
    if not provider_ids:
        return

    db.execute(text("DELETE FROM provider_payout_settings WHERE provider_id = ANY(:ids)"), {"ids": provider_ids})
    db.query(Booking).filter(Booking.provider_id.in_(provider_ids)).delete(synchronize_session=False)
    db.query(Service).filter(Service.provider_id.in_(provider_ids)).delete(synchronize_session=False)
    db.query(Provider).filter(Provider.id.in_(provider_ids)).delete(synchronize_session=False)
    db.commit()


def upsert_user(db, name: str, email: str) -> User:
    user = db.query(User).filter(User.email == email).first()
    if user:
        user.role = "provider"
        user.name = name
        db.commit()
        db.refresh(user)
        return user

    user = User(
        email=email,
        hashed_password=pwd_context.hash(DEFAULT_PASSWORD),
        name=name,
        role="provider",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def ensure_provider(db, user: User, bio: str) -> Provider:
    provider = db.query(Provider).filter(Provider.user_id == user.id).first()
    if provider:
        provider.business_name = f"{user.name} Services"
        provider.bio = bio
        provider.is_verified = True
        provider.is_active = True
        db.commit()
        db.refresh(provider)
        return provider

    provider = Provider(
        user_id=user.id,
        business_name=f"{user.name} Services",
        bio=bio,
        is_verified=True,
        is_active=True,
    )
    db.add(provider)
    db.commit()
    db.refresh(provider)
    return provider


def create_service(db, provider_id: int, svc: dict) -> Service:
    service = Service(
        provider_id=provider_id,
        title=svc["title"],
        description=svc["description"],
        category=svc["category"],
        price=svc["price"],
        approved=True,
        flagged=False,
    )
    db.add(service)
    db.flush()

    if svc.get("lat") is not None and svc.get("lon") is not None:
        db.execute(
            text("UPDATE services SET location = ST_SetSRID(ST_MakePoint(:lon, :lat), 4326) WHERE id = :id"),
            {"lon": svc["lon"], "lat": svc["lat"], "id": service.id},
        )

    db.commit()
    db.refresh(service)
    return service


def seed_bookings(db, services: List[Service], user: User):
    if not services or not user:
        return
    for idx, svc in enumerate(services):
        scheduled_at = NOW + timedelta(days=idx + 1)
        booking = Booking(
            service_id=svc.id,
            provider_id=svc.provider_id,
            user_id=user.id,
            scheduled_at=scheduled_at,
            status="pending",
            price=svc.price,
            notes=f"Demo booking for {svc.title}",
        )
        db.add(booking)
    db.commit()


def main():
    db = SessionLocal()
    try:
        print("🧹 Clearing existing provider/services data...")
        clear_existing(db)

        print("🌱 Seeding Bangalore providers and services...")
        created_services: List[Service] = []

        for provider in PROVIDERS:
            user = upsert_user(db, provider["name"], provider["email"])
            provider_row = ensure_provider(db, user, provider["bio"])

            for svc in provider["services"]:
                svc_with_area = {**svc}
                if svc_with_area.get("description") and provider.get("area"):
                    svc_with_area["description"] = f"{svc_with_area['description']} (Areas: {provider['area']})"
                created_services.append(create_service(db, provider_row.id, svc_with_area))

        sample_user = db.query(User).filter(User.role == "user").order_by(User.id.asc()).first()
        if sample_user:
            seed_bookings(db, created_services[:6], sample_user)
            print("✅ Added demo pending bookings for first user.")
        else:
            print("ℹ️ No regular user found to attach demo bookings. Skipping bookings.")

        print("✅ Seeding complete.")
        print(f"   Providers: {len(PROVIDERS)}")
        print(f"   Services:  {len(created_services)}")
        print(f"   Password for all seeded providers: {DEFAULT_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    main()


