"""
Seed script to create sample providers and services
Run: python scripts/seed_services.py
Legacy helper; prefer app.db.seed_demo for current flows.
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import SessionLocal
from app.models import User, Provider, Service
from app import crud, schemas
from passlib.context import CryptContext
from geoalchemy2.shape import from_shape
from shapely.geometry import Point

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# Sample data
SAMPLE_SERVICES = [
    {
        "provider": {"email": "shiv@helpx.test", "name": "Shiv", "role": "provider"},
        "title": "AC Installation & Maintenance",
        "description": "Split & window AC installation, gas topup, filter cleaning, 60–90 min.",
        "category": "Home Appliances",
        "price": 1499,
        "lat": 12.9716,
        "lon": 77.5946
    },
    {
        "provider": {"email": "rita@helpx.test", "name": "Rita", "role": "provider"},
        "title": "Washing Machine Repair",
        "description": "Front-load & top-load repairs, drum cleaning and motor checks.",
        "category": "Home Repair",
        "price": 800,
        "lat": 12.975,
        "lon": 77.592
    },
    {
        "provider": {"email": "kumar@helpx.test", "name": "Kumar", "role": "provider"},
        "title": "Home Deep Cleaning",
        "description": "Full home deep clean: kitchen, bathroom, living room. 3–4 hours.",
        "category": "Cleaning",
        "price": 2500,
        "lat": 12.9725,
        "lon": 77.5907
    },
    {
        "provider": {"email": "neha@helpx.test", "name": "Neha", "role": "provider"},
        "title": "Electric Bike Repair",
        "description": "Battery diagnostics, motor tune and controller calibration.",
        "category": "Electronics",
        "price": 1200,
        "lat": 12.970,
        "lon": 77.5940
    },
    {
        "provider": {"email": "akash@helpx.test", "name": "Akash", "role": "provider"},
        "title": "Furniture Assembly",
        "description": "IKEA and general furniture assembly (desks, wardrobes).",
        "category": "Assembly",
        "price": 700,
        "lat": 12.9733,
        "lon": 77.5951
    }
]

# Default password for all seeded providers
DEFAULT_PASSWORD = "Password123"


def seed_services():
    db = SessionLocal()
    try:
        created_providers = {}
        created_services = []
        
        print("🌱 Starting service seeding...")
        print("=" * 50)
        
        for service_data in SAMPLE_SERVICES:
            provider_data = service_data["provider"]
            email = provider_data["email"]
            
            # Check if provider user exists
            user = db.query(User).filter(User.email == email).first()
            
            if not user:
                # Create provider user
                hashed_password = pwd_context.hash(DEFAULT_PASSWORD)
                user = crud.create_user(
                    db,
                    email=email,
                    hashed_password=hashed_password,
                    name=provider_data["name"],
                    role=provider_data["role"]
                )
                print(f"✅ Created provider: {email} / {DEFAULT_PASSWORD}")
                created_providers[email] = user
            else:
                print(f"ℹ️  Provider already exists: {email}")
                created_providers[email] = user
            
            # Get or create provider record
            provider = db.query(Provider).filter(Provider.user_id == user.id).first()
            if not provider:
                provider = Provider(
                    user_id=user.id,
                    business_name=provider_data["name"] + " Services",
                    verified=True
                )
                db.add(provider)
                db.commit()
                db.refresh(provider)
            
            # Create service
            service_schema = schemas.ServiceCreate(
                title=service_data["title"],
                description=service_data["description"],
                category=service_data["category"],
                price=service_data["price"],
                lat=service_data["lat"],
                lon=service_data["lon"]
            )
            
            service = crud.create_service(db, provider.id, service_schema)
            created_services.append({
                "id": service.id,
                "title": service.title,
                "provider": email
            })
            print(f"  ✅ Created service: {service.title} (ID: {service.id})")
        
        print("=" * 50)
        print(f"✅ Seeding complete!")
        print(f"   - Providers created/updated: {len(created_providers)}")
        print(f"   - Services created: {len(created_services)}")
        print("")
        print("📋 Provider Credentials:")
        print("-" * 50)
        for email in created_providers.keys():
            print(f"   Email: {email}")
            print(f"   Password: {DEFAULT_PASSWORD}")
            print("")
        
    except Exception as e:
        print(f"❌ Error during seeding: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_services()

