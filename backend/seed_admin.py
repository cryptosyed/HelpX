"""
Seed script to create admin user
Run: python seed_admin.py
"""
from app.db.session import SessionLocal
from app.models import User
from passlib.context import CryptContext

# Use same hashing method as auth.py
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def create_admin():
    db = SessionLocal()
    try:
        # Check if admin already exists
        admin = db.query(User).filter(User.email == "admin@helpx.com").first()
        if admin:
            print("Admin user already exists!")
            return
        
        # Create admin user
        hashed_password = pwd_context.hash("admin123")
        admin = User(
            email="admin@helpx.com",
            hashed_password=hashed_password,
            name="Admin User",
            role="admin",
            is_active=True
        )
        db.add(admin)
        db.commit()
        print("Admin user created successfully!")
        print("Email: admin@helpx.com")
        print("Password: admin123")
    except Exception as e:
        print(f"Error creating admin: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    create_admin()

