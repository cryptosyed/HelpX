"""
Idempotent demo data seeder for Supabase Postgres.
Run with: python -m app.db.seed_demo
"""
import random
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import func

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

PROVIDERS = [
    ("provider.plumber@helpx.com", "Ramesh Plumbing Works", "Indiranagar"),
    ("provider.electrician@helpx.com", "Suresh Electricals", "Whitefield"),
    ("provider.cleaning@helpx.com", "Sparkle Home Cleaning", "Koramangala"),
    ("provider.ac@helpx.com", "CoolAir AC Services", "Yelahanka"),
    ("provider.paint@helpx.com", "Perfect Paints", "Marathahalli"),
    ("provider.carpenter@helpx.com", "WoodCraft Carpentry", "Jayanagar"),
    ("provider.pest@helpx.com", "SafeShield Pest Control", "BTM Layout"),
    ("provider.appliance@helpx.com", "QuickFix Appliances", "HSR Layout"),
]
PROVIDER_PASSWORD = "provider123"

PROVIDER_PROFILES: Dict[str, Dict[str, str]] = {
    "provider.plumber@helpx.com": {
        "phone": "9876543101",
        "bio": "12+ years of plumbing experience in apartments and villas across Bangalore.",
    },
    "provider.electrician@helpx.com": {
        "phone": "9876543102",
        "bio": "Certified electrician handling residential and commercial work.",
    },
    "provider.cleaning@helpx.com": {
        "phone": "9876543103",
        "bio": "Deep cleaning experts for homes, offices, and move-in cleaning.",
    },
    "provider.ac@helpx.com": {
        "phone": "9876543104",
        "bio": "AC installation, repair & gas refilling specialist.",
    },
    "provider.paint@helpx.com": {
        "phone": "9876543105",
        "bio": "Interior painting with dust-free tools and eco-friendly paints.",
    },
    "provider.carpenter@helpx.com": {
        "phone": "9876543106",
        "bio": "Custom furniture fixes, hinges, modular kitchens, and wardrobes.",
    },
    "provider.pest@helpx.com": {
        "phone": "9876543107",
        "bio": "Odourless pest control with child-safe treatments.",
    },
    "provider.appliance@helpx.com": {
        "phone": "9876543108",
        "bio": "Certified technicians for multi-brand appliance repair.",
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
    "provider.plumber@helpx.com": [
        ("Plumbing", Decimal("499"), Decimal("8"), Decimal("10")),
        ("Bathroom Deep Cleaning", Decimal("1199"), Decimal("6"), Decimal("8")),
    ],
    "provider.electrician@helpx.com": [
        ("Electrical Repair", Decimal("399"), Decimal("10"), Decimal("7")),
    ],
    "provider.cleaning@helpx.com": [
        ("House Cleaning", Decimal("2499"), Decimal("12"), Decimal("5")),
        ("Bathroom Deep Cleaning", Decimal("999"), Decimal("10"), Decimal("6")),
    ],
    "provider.ac@helpx.com": [
        ("AC Service & Repair", Decimal("599"), Decimal("15"), Decimal("9")),
    ],
    "provider.paint@helpx.com": [
        ("Interior Painting", Decimal("45"), Decimal("12"), Decimal("11")),
    ],
    "provider.carpenter@helpx.com": [
        ("Furniture Carpentry", Decimal("699"), Decimal("10"), Decimal("10")),
    ],
    "provider.pest@helpx.com": [
        ("Pest Control", Decimal("1499"), Decimal("14"), Decimal("8")),
    ],
    "provider.appliance@helpx.com": [
        ("Washing Machine Repair", Decimal("499"), Decimal("12"), Decimal("6")),
        ("Refrigerator Repair", Decimal("549"), Decimal("12"), Decimal("6")),
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
) -> Tuple[List[ProviderService], List[Service], int]:
    provider_services: List[ProviderService] = []
    legacy_services: List[Service] = []
    created_provider_services = 0
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
        else:
            updated = False
            if ps.price != price:
                ps.price = price
                updated = True
            if ps.service_radius_km != radius:
                ps.service_radius_km = radius
                updated = True
            if ps.experience_years != exp:
                ps.experience_years = exp
                updated = True
            if not ps.is_active:
                ps.is_active = True
                updated = True
            if updated:
                db.commit()
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
        admin, created = _get_or_create_user(db, ADMIN_USER["email"], ADMIN_USER["name"], ADMIN_USER["password"], "admin")
        summary["users_created"] += int(created)
        summary["users_skipped"] += int(not created)

        customers: List[User] = []
        for email, name in CUSTOMERS:
            user, created = _get_or_create_user(db, email, name, CUSTOMER_PASSWORD, "customer")
            customers.append(user)
            if created:
                summary["users_created"] += 1
            else:
                summary["users_skipped"] += 1

        provider_users: Dict[str, User] = {}
        for email, business_name, area in PROVIDERS:
            user, created = _get_or_create_user(db, email, business_name, PROVIDER_PASSWORD, "provider")
            provider_users[email] = user
            if created:
                summary["users_created"] += 1
            else:
                summary["users_skipped"] += 1

        gs_lookup, gs_created = _ensure_global_services(db)
        summary["global_services_created"] = gs_created

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
            provider_services, legacy_services, created_ps = _ensure_provider_services_and_legacy_services(
                db, provider, gs_lookup, plans
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
    finally:
        db.close()


if __name__ == "__main__":
    seed()

