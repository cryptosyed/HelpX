from typing import Generator

from fastapi import Depends, Header, HTTPException
from jose import jwt
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.models import User


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    db: Session = Depends(get_db),
    authorization: str = Header(None),
) -> User:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id = int(payload.get("sub"))
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is inactive")
    return user


def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Strict admin check - requires admin role AND super admin email"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    if current_user.email != settings.SUPER_ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Unauthorized admin access")
    return current_user


def get_current_provider(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role not in ["provider", "admin"]:
        raise HTTPException(status_code=403, detail="Provider access required")
    return current_user
