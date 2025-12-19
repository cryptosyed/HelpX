from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import schemas, crud
from app.api.deps import get_db, get_current_user
from app.models import User
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt

from app.core.config import settings

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
router = APIRouter()

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

def get_password_hash(password):
    return pwd_context.hash(password)

@router.post("/register", response_model=schemas.UserOut)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    print("DB USER SEEN BY SESSION:", db.bind.url.username)
    existing = crud.get_user_by_email(db, user_in.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate role - only customer or provider allowed via public registration
    role = user_in.role or "customer"
    if role not in ["customer", "provider"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'customer' or 'provider'")
    
    hashed = get_password_hash(user_in.password)
    user = crud.create_user(db, email=user_in.email, hashed_password=hashed, name=user_in.name, role=role)
    return user

@router.post("/login", response_model=schemas.Token)
def login(form_data: schemas.UserCreate, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, form_data.email)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    # Include role in JWT token
    to_encode = {
        "sub": str(user.id),
        "role": user.role,
        "email": user.email
    }
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return {"access_token": encoded_jwt, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserOut)
def get_current_user_info(
    current_user: User = Depends(get_current_user),
):
    """Get current logged-in user information"""
    return current_user
