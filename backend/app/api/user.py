from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_db, get_current_user
from app.models import User, Booking, Address, Service, Report
from app import schemas

router = APIRouter()