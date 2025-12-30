"""
Idempotent demo data seeder for Supabase Postgres.
Run with: python -m app.db.seed_demo
"""
import random
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import func, text

from app.db.session import SessionLocal
from app.api.auth import get_password_hash
from app.models import (
    User,
    Provider,
    ProviderProfile,
    GlobalService,
    ProviderService,
    Service,
    Booking,
    Review,
    ProviderPayoutSettings,
    AuditLog
)

random.seed(42)
NOW = datetime.utcnow()


ADMIN_USER = {
    "email": "admin@helpx.com",
    "name": "HelpX Admin",
    "password": "admin123",
    "role": "admin",
}

CUSTOMERS = [
    ("user1@helpx.com", "Rahul Verma"),
    ("user2@helpx.com", "Sneha Iyer"),
    ("user3@helpx.com", "Arjun Mehta"),
    ("user4@helpx.com", "Neha Sharma"),
    ("user5@helpx.com", "Karthik R"),
]
CUSTOMER_PASSWORD = "user123"

# Banashankari & Nearby Providers (for Geo-Matching Demo)
PROVIDERS = [
    # Banashankari (Center)
    ("ravi.plumber@helpx.com", "Ravi Plumbing Services", "Banashankari"),
    ("vikram.electrician@helpx.com", "Vikram Electricals", "Banashankari"),
    
    # Jayanagar (North-East - ~4km away)
    ("suresh.plumber@helpx.com", "Suresh Plumbing Works", "Jayanagar"),
    ("anita.electrician@helpx.com", "Anita Power Solutions", "Jayanagar"),
    
    # JP Nagar (East/South - ~3km away)
    ("manoj.cleaning@helpx.com", "Manoj Deep Cleaners", "JP Nagar"),
    ("pooja.ac@helpx.com", "Pooja AC Cool", "JP Nagar"),
    
    # Basavanagudi (North - ~3km away)
    ("kiran.carpenter@helpx.com", "Kiran Wood Art", "Basavanagudi"),
    ("raj.pest@helpx.com", "Raj Pest Control", "Basavanagudi"),
]
PROVIDER_PASSWORD = "provider123"

PROVIDER_PROFILES: Dict[str, Dict[str, str]] = {
    "ravi.plumber@helpx.com": {
        "phone": "9876543201",
        "bio": "Expert plumber in Banashankari. 15 years experience.",
    },
    "vikram.electrician@helpx.com": {
        "phone": "9876543202",
        "bio": "Banashankari based electrician. 24/7 service.",
    },
    "suresh.plumber@helpx.com": {
        "phone": "9876543211",
        "bio": "Trusted plumber serving Jayanagar and surrounding areas.",
    },
    "anita.electrician@helpx.com": {
        "phone": "9876543212",
        "bio": "Professional electrical services in Jayanagar.",
    },
    "manoj.cleaning@helpx.com": {
        "phone": "9876543213",
        "bio": "Deep cleaning specialist in JP Nagar.",
    },
    "pooja.ac@helpx.com": {
        "phone": "9876543214",
        "bio": "AC repair and service expert in JP Nagar.",
    },
    "kiran.carpenter@helpx.com": {
        "phone": "9876543215",
        "bio": "Basavanagudi's finest carpentry services.",
    },
    "raj.pest@helpx.com": {
        "phone": "9876543216",
        "bio": "Eco-friendly pest control in Basavanagudi.",
    },
}

GLOBAL_SERVICES = [
    ("Plumbing", "Home Services"),
    ("Electrical Repair", "Home Services"),
    ("House Cleaning", "Cleaning"),
    ("Bathroom Deep Cleaning", "Cleaning"),
    ("AC Service & Repair", "Appliance Repair"),
    ("Interior Painting", "Home Services"),
    ("Furniture Carpentry", "Home Services"),
    ("Pest Control", "Home Services"),
    ("Washing Machine Repair", "Appliance Repair"),
    ("Refrigerator Repair", "Appliance Repair"),
]

PROVIDER_SERVICE_PLANS: Dict[str, List[Tuple[str, Decimal, Decimal, Decimal]]] = {
    # Banashankari
    "ravi.plumber@helpx.com": [
        ("Plumbing", Decimal("499"), Decimal("5"), Decimal("15")),
    ],
    "vikram.electrician@helpx.com": [
        ("Electrical Repair", Decimal("399"), Decimal("5"), Decimal("10")),
    ],
    
    # Jayanagar (Competition for Plumber & Electrician)
    "suresh.plumber@helpx.com": [
        ("Plumbing", Decimal("549"), Decimal("6"), Decimal("12")), # Slightly higher price
    ],
    "anita.electrician@helpx.com": [
        ("Electrical Repair", Decimal("449"), Decimal("6"), Decimal("8")),
    ],

    # JP Nagar
    "manoj.cleaning@helpx.com": [
        ("House Cleaning", Decimal("1899"), Decimal("7"), Decimal("4")),
    ],
    "pooja.ac@helpx.com": [
        ("AC Service & Repair", Decimal("649"), Decimal("7"), Decimal("6")),
    ],

    # Basavanagudi
    "kiran.carpenter@helpx.com": [
        ("Furniture Carpentry", Decimal("799"), Decimal("5"), Decimal("15")),
    ],
    "raj.pest@helpx.com": [
        ("Pest Control", Decimal("1199"), Decimal("5"), Decimal("10")),
    ],
}

BOOKING_NOTES = [
    "AC making noise",
    "Switch board repair",
    "Deep cleaning before move-in",
    "Water leakage in kitchen sink",
    "Painting touch-up needed",
    "Pest control for 2BHK",
    "Carpentry for loose hinge",
]

REVIEW_TEXTS = [
    "Very professional and punctual.",
    "Good service, fair pricing.",
    "Clean work and polite staff.",
    "Will definitely book again.",
]

# Coordinates for Geo-Matching Demo
AREA_COORDINATES = {
    "Banashankari": (12.9255, 77.5468),    # Center
    "Jayanagar": (12.9308, 77.5838),       # ~4km East/North
    "JP Nagar": (12.9063, 77.5857),        # ~3km South-East
    "Basavanagudi": (12.9406, 77.5683),    # ~2.5km North
}


def clear_existing_data(db: Session):
    """Clears all existing data to ensure a fresh seed."""
    print("🧹 Clearing existing data...")
    try:
        # Order matters due to foreign keys
        db.query(AuditLog).delete()
        db.query(Review).delete()
        db.query(Booking).delete()
        db.query(ProviderService).delete()
        db.query(Service).delete() # Legacy services
        db.query(ProviderPayoutSettings).delete()
        db.query(ProviderProfile).delete()
        db.query(Provider).delete()
        
        # We can leave Global Services to avoid shifting IDs if not necessary,
        # but re-seeding them is also fine.
        db.query(GlobalService).delete()
        
        # Delete non-admin users
        db.query(User).filter(User.role != "admin").delete()
        
        db.commit()
        print("✅ Existing data cleared.")
    except Exception as e:
        print(f"⚠️ Error during clearing (might be empty): {e}")
        db.rollback()


def _get_or_create_user(db: Session, email: str, name: str, password: str, role: str) -> Tuple[User, bool]:
    user = db.query(User).filter(User.email == email).first()
    if user:
        return user, False
    user = User(
        email=email,
        name=name,
        role=role,
        hashed_password=get_password_hash(password),
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user, True


def _get_or_create_provider(db: Session, user: User, business_name: str, bio: str) -> Tuple[Provider, bool]:
    provider = db.query(Provider).filter(Provider.user_id == user.id).first()
    created = False
    if not provider:
        provider = Provider(
            user_id=user.id,
            business_name=business_name,
            bio=bio,
            is_verified=True,
            is_suspended=False,
            is_active=True,
        )
        db.add(provider)
        db.commit()
        db.refresh(provider)
        created = True
    return provider, created


def _ensure_profile(db: Session, provider: Provider, business_name: str, phone: str, bio: str) -> None:
    profile = db.query(ProviderProfile).filter(ProviderProfile.provider_id == provider.id).first()
    if not profile:
        profile = ProviderProfile(
            provider_id=provider.id,
            business_name=business_name,
            phone=phone,
            bio=bio,
        )
        db.add(profile)
    else:
        profile.business_name = profile.business_name or business_name
        profile.phone = profile.phone or phone
        profile.bio = profile.bio or bio
    db.commit()


def _ensure_global_services(db: Session) -> Tuple[Dict[str, GlobalService], int]:
    existing = {gs.title: gs for gs in db.query(GlobalService).all()}
    created = 0
    for title, category in GLOBAL_SERVICES:
        if title in existing:
            continue
        gs = GlobalService(title=title, category=category, is_active=True)
        db.add(gs)
        db.commit()
        db.refresh(gs)
        existing[title] = gs
        created += 1
    return existing, created


def _ensure_provider_services_and_legacy_services(
    db: Session,
    provider: Provider,
    gs_lookup: Dict[str, GlobalService],
    plans: List[Tuple[str, Decimal, Decimal, Decimal]],
    lat: float = None,
    lon: float = None,
) -> Tuple[List[ProviderService], List[Service], int]:
    provider_services: List[ProviderService] = []
    legacy_services: List[Service] = []
    created_provider_services = 0
    
    # Slight fuzz for location so they aren't all EXACTLY on top of each other
    base_lat = lat if lat else 12.9255
    base_lon = lon if lon else 77.5468
    
    for title, price, radius, exp in plans:
        gs = gs_lookup.get(title)
        if not gs:
            continue
        ps = (
            db.query(ProviderService)
            .filter(
                ProviderService.provider_id == provider.id,
                ProviderService.service_id == gs.id,
            )
            .first()
        )
        if not ps:
            ps = ProviderService(
                provider_id=provider.id,
                service_id=gs.id,
                price=price,
                service_radius_km=radius,
                experience_years=exp,
                is_active=True,
            )
            db.add(ps)
            db.commit()
            db.refresh(ps)
            created_provider_services += 1
        
        provider_services.append(ps)

        legacy = (
            db.query(Service)
            .filter(Service.provider_id == provider.id, Service.title == title)
            .first()
        )
        
        if not legacy:
            legacy = Service(
                provider_id=provider.id,
                title=title,
                category=gs.category,
                price=price,
                approved=True,
                flagged=False,
            )
            db.add(legacy)
            db.flush() # Flush to get ID
            
            # Set Location
            # Add small random variation to lat/lon for density visual (approx 300-500m jitter)
            variation = 0.003
            svc_lat = base_lat + random.uniform(-variation, variation)
            svc_lon = base_lon + random.uniform(-variation, variation)

            try:
                db.execute(
                    text("UPDATE services SET location = ST_SetSRID(ST_MakePoint(:lon, :lat), 4326) WHERE id = :id"),
                    {"lon": svc_lon, "lat": svc_lat, "id": legacy.id},
                )
            except Exception as e:
                print(f"Warning: Failed to set location for {title}: {e}")

            db.commit()
            db.refresh(legacy)
        legacy_services.append(legacy)
    return provider_services, legacy_services, created_provider_services


def _ensure_bookings_and_reviews(
    db: Session,
    provider: Provider,
    customers: List[User],
    provider_services: List[ProviderService],
    legacy_services: List[Service],
    summary: Dict[str, int],
) -> None:
    if not provider_services:
        return

    # Skip creating bookings if no customers
    if not customers:
        return

    demo_bookings = (
        db.query(Booking)
        .filter(Booking.provider_id == provider.id, Booking.notes.ilike("%[demo]%"))
        .all()
    )
    status_counts = {}
    for b in demo_bookings:
        status_counts[b.status] = status_counts.get(b.status, 0) + 1

    def _pick_customer() -> User:
        return random.choice(customers)

    def _pick_services() -> Tuple[ProviderService, Service]:
        idx = random.randrange(len(provider_services))
        ps = provider_services[idx]
        ls = legacy_services[idx % len(legacy_services)]
        return ps, ls

    def _make_booking(status: str, days_offset: int) -> Booking:
        ps, ls = _pick_services()
        scheduled_at = NOW - timedelta(days=days_offset) if status == "completed" else NOW + timedelta(days=days_offset)
        note = f"[demo] {random.choice(BOOKING_NOTES)}"
        booking = Booking(
            service_id=ls.id,
            global_service_id=ps.service_id,
            user_id=_pick_customer().id,
            provider_id=provider.id,
            scheduled_at=scheduled_at,
            notes=note,
            status=status,
            price=ps.price,
        )
        db.add(booking)
        db.commit()
        db.refresh(booking)
        summary["bookings_created"] += 1
        return booking

    target_completed = 4
    target_accepted = 1
    target_pending = 1

    for _ in range(max(0, target_completed - status_counts.get("completed", 0))):
        _make_booking("completed", days_offset=random.randint(3, 30))
    for _ in range(max(0, target_accepted - status_counts.get("accepted", 0))):
        _make_booking("accepted", days_offset=1)
    for _ in range(max(0, target_pending - status_counts.get("pending", 0))):
        _make_booking("pending", days_offset=2)

    completed = (
        db.query(Booking)
        .filter(Booking.provider_id == provider.id, Booking.status == "completed", Booking.notes.ilike("%[demo]%"))
        .all()
    )
    for idx, booking in enumerate(completed):
        existing_review = db.query(Review).filter(Review.booking_id == booking.id).first()
        if existing_review:
            continue
        rating = 5 if idx % 3 != 0 else 4
        review = Review(
            booking_id=booking.id,
            service_id=booking.service_id,
            user_id=booking.user_id,
            rating=rating,
            comment=random.choice(REVIEW_TEXTS),
        )
        db.add(review)
        db.commit()
        summary["reviews_created"] += 1


def seed() -> None:
    db = SessionLocal()
    summary = {
        "users_created": 0,
        "users_skipped": 0,
        "providers_created": 0,
        "providers_skipped": 0,
        "global_services_created": 0,
        "provider_services_created": 0,
        "bookings_created": 0,
        "reviews_created": 0,
    }

    try:
        # 1. Clear Data
        clear_existing_data(db)

        # 2. Create Admin
        admin, created = _get_or_create_user(db, ADMIN_USER["email"], ADMIN_USER["name"], ADMIN_USER["password"], "admin")
        summary["users_created"] += int(created)
        summary["users_skipped"] += int(not created)

        # 3. Create Customers
        customers: List[User] = []
        for email, name in CUSTOMERS:
            user, created = _get_or_create_user(db, email, name, CUSTOMER_PASSWORD, "customer")
            customers.append(user)
            if created:
                summary["users_created"] += 1
            else:
                summary["users_skipped"] += 1

        # 4. Create Provider Users
        provider_users: Dict[str, User] = {}
        for email, business_name, area in PROVIDERS:
            user, created = _get_or_create_user(db, email, business_name, PROVIDER_PASSWORD, "provider")
            provider_users[email] = user
            if created:
                summary["users_created"] += 1
            else:
                summary["users_skipped"] += 1

        # 5. Create Global Services
        gs_lookup, gs_created = _ensure_global_services(db)
        summary["global_services_created"] = gs_created

        # 6. Create Providers & Services
        for email, business_name, area in PROVIDERS:
            user = provider_users[email]
            bio = PROVIDER_PROFILES[email]["bio"]
            provider, created = _get_or_create_provider(db, user, business_name, bio)
            if created:
                summary["providers_created"] += 1
            else:
                summary["providers_skipped"] += 1

            profile_info = PROVIDER_PROFILES[email]
            _ensure_profile(db, provider, business_name, profile_info["phone"], profile_info["bio"])

            plans = PROVIDER_SERVICE_PLANS.get(email, [])
            lat, lon = AREA_COORDINATES.get(area, (12.9255, 77.5468)) 
            provider_services, legacy_services, created_ps = _ensure_provider_services_and_legacy_services(
                db, provider, gs_lookup, plans, lat=lat, lon=lon
            )
            summary["provider_services_created"] += created_ps

            _ensure_bookings_and_reviews(db, provider, customers, provider_services, legacy_services, summary)

        print("=== HelpX Demo Seed Summary ===")
        print(f"Users created: {summary['users_created']} (skipped {summary['users_skipped']})")
        print(f"Providers created: {summary['providers_created']} (skipped {summary['providers_skipped']})")
        print("Global services created:", summary["global_services_created"])
        print("Provider services ensured:", summary["provider_services_created"])
        print("Bookings created:", summary["bookings_created"])
        print("Reviews created:", summary["reviews_created"])
        print("Completed at (UTC):", datetime.utcnow().isoformat())
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
