from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext

from app import schemas, crud
from app.api.deps import get_db, get_current_user
from app.models import User
from app.core.config import settings

router = APIRouter()

# -------------------------------------------------------------------
# Password hashing (bcrypt with 72-byte safety)
# -------------------------------------------------------------------

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

def _truncate_for_bcrypt(password: str) -> str:
    """bcrypt only supports 72 bytes"""
    raw = password.encode("utf-8")
    if len(raw) > 72:
        raw = raw[:72]
    return raw.decode("utf-8", errors="ignore")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(_truncate_for_bcrypt(password))

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(
        _truncate_for_bcrypt(plain_password),
        hashed_password
    )

# -------------------------------------------------------------------
# AUTH ROUTES
# -------------------------------------------------------------------

@router.post("/register", response_model=schemas.UserOut)
def register(
    user_in: schemas.UserCreate,
    db: Session = Depends(get_db),
):
    """
    Public registration.
    Allowed roles: customer, provider
    Admins must be created manually.
    """
    existing = crud.get_user_by_email(db, user_in.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    role = user_in.role or "customer"
    if role not in {"customer", "provider"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role"
        )

    hashed_password = get_password_hash(user_in.password)

    user = crud.create_user(
        db=db,
        email=user_in.email,
        hashed_password=hashed_password,
        name=user_in.name,
        role=role,
    )

    return user


@router.post("/login", response_model=schemas.Token)
def login(
    form_data: schemas.UserLogin,
    db: Session = Depends(get_db),
):
    """
    Login using email + password.
    Returns JWT token.
    """
    user = crud.get_user_by_email(db, form_data.email)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    expire = datetime.utcnow() + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "exp": expire,
    }

    token = jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm="HS256"
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }


@router.get("/me", response_model=schemas.UserOut)
def me(
    current_user: User = Depends(get_current_user),
):
    """
    Get current authenticated user.
    """
    return current_user