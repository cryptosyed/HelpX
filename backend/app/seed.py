from app.db.session import SessionLocal, engine
from app.db.base import Base
from app.crud import create_user, create_service
from app.api.auth import get_password_hash
from app import schemas, models

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    # skip if users exist
    if db.query(models.User).count() > 0:
        print("Already seeded")
        db.close()
        return
    u1 = create_user(db, email="alice@example.com", hashed_password=get_password_hash("password"), name="Alice")
    u2 = create_user(db, email="bob@example.com", hashed_password=get_password_hash("password"), name="Bob", role="provider")
    # ensure provider exists for bob
    prov = u2.provider
    if not prov:
        from app.models import Provider
        prov = Provider(user_id=u2.id, business_name="Bob's Services")
        db.add(prov)
        db.commit()
        db.refresh(prov)
    svc = schemas.ServiceCreate(
        title="AC Repair",
        description="Quick AC repairs and gas topup",
        category="Home Repair",
        price=1200,
        lat=12.9716,
        lon=77.5946
    )
    create_service(db, provider_id=prov.id, svc=svc)
    print("Seeded")
    db.close()

if __name__ == "__main__":
    seed()
