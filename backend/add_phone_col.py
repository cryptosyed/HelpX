from sqlalchemy import text
from app.db.session import SessionLocal

db = SessionLocal()
try:
    print("Migrating: Adding phone column to app_users")
    db.execute(text("ALTER TABLE app_users ADD COLUMN IF NOT EXISTS phone VARCHAR;"))
    db.commit()
    print("Migration successful")
except Exception as e:
    print(f"Migration failed: {e}")
    db.rollback()
finally:
    db.close()
