import uuid
from pathlib import Path
import sys

from fastapi.testclient import TestClient

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.main import app  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.models import Booking, Service, User  # noqa: E402

client = TestClient(app)


def _register_user(email, password="pass1234", name="Test User"):
    return client.post(
        "/auth/register",
        json={"email": email, "password": password, "name": name},
    )


def _login(email, password="pass1234"):
    res = client.post(
        "/auth/login",
        json={"email": email, "password": password, "name": ""},
    )
    res.raise_for_status()
    return res.json()["access_token"]


def _cleanup_users(emails):
    db = SessionLocal()
    try:
        for email in emails:
            user = db.query(User).filter(User.email == email).first()
            if not user:
                continue
            db.query(Booking).filter(Booking.user_id == user.id).delete()
            provider = user.provider
            if provider:
                db.query(Booking).filter(
                    Booking.provider_id == provider.id
                ).delete()
                db.query(Service).filter(
                    Service.provider_id == provider.id
                ).delete()
                db.delete(provider)
            db.delete(user)
        db.commit()
    finally:
        db.close()


def test_booking_happy_path():
    provider_email = f"prov-{uuid.uuid4()}@example.com"
    user_email = f"user-{uuid.uuid4()}@example.com"
    try:
        # register provider + consumer
        assert _register_user(provider_email).status_code in (200, 201)
        assert _register_user(user_email).status_code in (200, 201)

        provider_token = _login(provider_email)
        user_token = _login(user_email)

        # create a service as provider
        svc_res = client.post(
            "/services/",
            json={
                "title": "Test Service",
                "description": "Desc",
                "category": "Testing",
                "price": 500,
                "lat": 12.9,
                "lon": 77.6,
            },
            headers={"Authorization": f"Bearer {provider_token}"},
        )
        assert svc_res.status_code == 200
        service_id = svc_res.json()["id"]

        # create booking as consumer
        booking_res = client.post(
            "/bookings/",
            json={
                "service_id": service_id,
                "when": "2030-01-01T10:00",
                "notes": "Please confirm",
            },
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert booking_res.status_code == 201
        booking = booking_res.json()
        assert booking["status"] == "pending"

        # provider should see booking
        provider_list = client.get(
            "/bookings/provider/",
            headers={"Authorization": f"Bearer {provider_token}"},
        )
        assert provider_list.status_code == 200
        assert any(b["id"] == booking["id"] for b in provider_list.json())

        # provider accepts booking
        update_res = client.put(
            f"/bookings/{booking['id']}/status",
            json={"status": "accepted"},
            headers={"Authorization": f"Bearer {provider_token}"},
        )
        assert update_res.status_code == 200
        assert update_res.json()["status"] == "accepted"

        # consumer sees accepted status
        user_list = client.get(
            "/bookings/",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert user_list.status_code == 200
        assert any(b["status"] == "accepted" for b in user_list.json())
    finally:
        _cleanup_users([provider_email, user_email])

