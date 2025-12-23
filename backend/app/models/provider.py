from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship, synonym
from sqlalchemy.sql import func

from app.db.base import Base


class Provider(Base):
    __tablename__ = "providers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("app_users.id"), nullable=False)
    business_name = Column(String)
    bio = Column(Text)
    rating = Column(Float, default=0, server_default="0")
    # keep storage column name 'verified' for compatibility
    is_verified = Column("verified", Boolean, default=False, server_default="false")
    is_active = Column(Boolean, default=True, server_default="true")
    is_suspended = Column(Boolean, default=False, server_default="false")
    created_at = Column(DateTime, server_default=func.now())

    # backward compatible attribute (legacy code reads provider.verified)
    verified = synonym("is_verified")

    user = relationship("User", back_populates="provider")
    services = relationship("Service", back_populates="provider")
    bookings = relationship("Booking", back_populates="provider")
    profile = relationship("ProviderProfile", back_populates="provider", uselist=False)
    payout_settings = relationship("ProviderPayoutSettings", back_populates="provider", uselist=False)

