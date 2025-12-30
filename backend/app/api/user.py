from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_db, get_current_user
from app.models import User, Booking, Address
from app import schemas

router = APIRouter()

@router.get("/profile", response_model=schemas.UserOut)
def get_user_profile(
    current_user: User = Depends(get_current_user),
):
    """Get current user profile"""
    return current_user

@router.put("/profile", response_model=schemas.UserOut)
def update_user_profile(
    data: schemas.UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update current user profile"""
    if data.name is not None:
        current_user.name = data.name
    if data.phone is not None:
        current_user.phone = data.phone
    
    db.commit()
    db.refresh(current_user)
    return current_user

# Address endpoints

@router.get("/addresses", response_model=List[schemas.AddressOut])
def get_user_addresses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return current_user.addresses

@router.post("/addresses", response_model=schemas.AddressOut)
def create_address(
    data: schemas.AddressCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    addr = Address(
        user_id=current_user.id,
        label=data.label,
        line1=data.line1,
        line2=data.line2,
        city=data.city,
        pincode=data.pincode,
        lat=data.lat,
        lon=data.lon
    )
    db.add(addr)
    db.commit()
    db.refresh(addr)
    return addr

@router.delete("/addresses/{address_id}")
def delete_address(
    address_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    addr = db.query(Address).filter(Address.id == address_id, Address.user_id == current_user.id).first()
    if not addr:
        raise HTTPException(status_code=404, detail="Address not found")
    
    db.delete(addr)
    db.commit()
    return {"ok": True}