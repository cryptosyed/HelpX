"""
DEV/TEST SEED (legacy)
Resets provider-related data and seeds Bangalore providers/services
for end-to-end booking flow using GlobalService + ProviderService.
Prefer using app.db.seed_demo for current flows.
"""

from typing import List, Dict
import os
import sys

from passlib.context import CryptContext
from sqlalchemy.orm import Session

# Ensure app imports work
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import SessionLocal
from sqlalchemy import inspect
from app.models import (
    User,
    Provider,
    GlobalService,
    ProviderService,
    Booking,
    AuditLog,
)

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# -------------------------------------------------------------------
# GLOBAL SERVICES (TaskRabbit-style catalog)
# -------------------------------------------------------------------
GLOBAL_SERVICES = [
    {"title": "Electrician", "category": "Home Repair", "description": "Electrical repairs and installations", "base_price": 500},
    {"title": "Plumber", "category": "Home Repair", "description": "Plumbing repairs and fittings", "base_price": 550},
    {"title": "AC Repair", "category": "Appliances", "description": "Air conditioner servicing and repairs", "base_price": 650},
    {"title": "House Cleaning", "category": "Cleaning", "description": "Home cleaning services", "base_price": 600},
    {"title": "Carpenter", "category": "Home Improvement", "description": "Carpentry and furniture fixes", "base_price": 650},
    {"title": "Washing Machine Repair", "category": "Appliances", "description": "Washer diagnostics and repair", "base_price": 550},
]

# -------------------------------------------------------------------
# BANGALORE PROVIDERS
# -------------------------------------------------------------------
PROVIDERS = [
    {
        "name": "Ravi Kumar",
        "email": "ravi.electrician@helpx.test",
        "area": "Indiranagar",
        "password": "password123",
        "services": [
            {"title": "Electrician", "radius": 8, "exp": 5, "price_bump": 150},
        ],
    },
    {
        "name": "Suresh Naik",
        "email": "suresh.plumber@helpx.test",
        "area": "Whitefield",
        "password": "password123",
        "services": [
            {"title": "Plumber", "radius": 10, "exp": 7, "price_bump": 150},
        ],
    },
    {
        "name": "Anil Sharma",
        "email": "anil.ac@helpx.test",
        "area": "JP Nagar",
        "password": "password123",
        "services": [
            {"title": "AC Repair", "radius": 12, "exp": 6, "price_bump": 200},
        ],
    },
    {
        "name": "Manoj Singh",
        "email": "manoj.cleaning@helpx.test",
        "area": "Yelahanka",
        "password": "password123",
        "services": [
            {"title": "House Cleaning", "radius": 6, "exp": 3, "price_bump": 100},
        ],
    },
    {
        "name": "Prakash Rao",
        "email": "prakash.carpenter@helpx.test",
        "area": "Malleshwaram",
        "password": "password123",
        "services": [
            {"title": "Carpenter", "radius": 8, "exp": 9, "price_bump": 150},
        ],
    },
    {
        "name": "Irfan Khan",
        "email": "irfan.repair@helpx.test",
        "area": "Electronic City",
        "password": "password123",
        "services": [
            {"title": "Washing Machine Repair", "radius": 10, "exp": 4, "price_bump": 150},
            {"title": "AC Repair", "radius": 10, "exp": 4, "price_bump": 200},
        ],
    },
]

# -------------------------------------------------------------------
# CLEANUP (SAFE, FK-AWARE)
# -------------------------------------------------------------------
def cleanup(db: Session):
    print("🧹 Cleaning existing provider data...")
    inspector = inspect(db.bind)

    def safe_delete(model, filter_=None):
        if inspector.has_table(model.__tablename__):
            q = db.query(model)
            if filter_ is not None:
                q = q.filter(filter_)
            q.delete()

    safe_delete(Booking)
    safe_delete(ProviderService)
    safe_delete(Provider)
    safe_delete(GlobalService)
    safe_delete(User, User.role == "provider")
    safe_delete(AuditLog)

    db.commit()
    print("✅ Cleanup complete")

# -------------------------------------------------------------------
# SEED GLOBAL SERVICES
# -------------------------------------------------------------------
def seed_global_services(db: Session) -> Dict[str, GlobalService]:
    lookup = {}
    for svc in GLOBAL_SERVICES:
        existing = (
            db.query(GlobalService)
            .filter(GlobalService.title == svc["title"])
            .first()
        )
        if existing:
            lookup[svc["title"]] = existing
            continue
        gs = GlobalService(
            title=svc["title"],
            category=svc["category"],
            description=svc["description"],
            base_price=svc["base_price"],
            is_active=True,
        )
        db.add(gs)
        db.commit()
        db.refresh(gs)
        lookup[svc["title"]] = gs
    return lookup

# -------------------------------------------------------------------
# CREATE PROVIDER USER + PROVIDER PROFILE
# -------------------------------------------------------------------
def create_provider_user(db: Session, name: str, email: str, password: str, area: str) -> Provider:
    user = User(
        email=email,
        hashed_password=pwd_context.hash(password),
        name=name,
        role="provider",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    provider = Provider(
        user_id=user.id,
        business_name=f"{name} Services",
        bio=f"Serving Bangalore ({area}). Trusted and experienced professional.",
        is_verified=True,
        is_active=True,
    )
    db.add(provider)
    db.commit()
    db.refresh(provider)

    return provider

# -------------------------------------------------------------------
# LINK PROVIDER TO GLOBAL SERVICES
# -------------------------------------------------------------------
def seed_provider_services(
    db: Session,
    provider: Provider,
    gs_lookup: Dict[str, GlobalService],
    svc_specs: List[dict],
):
    for spec in svc_specs:
        gs = gs_lookup.get(spec["title"])
        if not gs:
            continue

        existing = (
            db.query(ProviderService)
            .filter(
                ProviderService.provider_id == provider.id,
                ProviderService.service_id == gs.id,
            )
            .first()
        )
        if existing:
            continue

        price = gs.base_price + spec.get("price_bump", 0)

        ps = ProviderService(
            provider_id=provider.id,
            service_id=gs.id,
            price=price,
            service_radius_km=spec.get("radius"),
            experience_years=spec.get("exp"),
            is_active=True,
        )
        db.add(ps)
        db.commit()

# -------------------------------------------------------------------
# MAIN
# -------------------------------------------------------------------
def main():
    db = SessionLocal()
    try:
        cleanup(db)

        print("🌱 Seeding global services...")
        gs_lookup = seed_global_services(db)

        print("👷 Creating Bangalore providers...")
        for entry in PROVIDERS:
            provider = create_provider_user(
                db,
                name=entry["name"],
                email=entry["email"],
                password=entry["password"],
                area=entry["area"],
            )
            seed_provider_services(db, provider, gs_lookup, entry["services"])

        print("\n✅ Seed complete!")
        print("\n📧 Provider accounts (password: password123):")
        for entry in PROVIDERS:
            offered = ", ".join([s["title"] for s in entry["services"]])
            print(f" - {entry['email']} → {offered}")

    finally:
        db.close()

if __name__ == "__main__":
    main()