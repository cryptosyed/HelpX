from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Address(Base):
    __tablename__ = "addresses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("app_users.id"), nullable=False)
    label = Column(String, nullable=False)  # Home, Work, etc.
    line1 = Column(String, nullable=False)
    line2 = Column(String, nullable=True)
    city = Column(String, nullable=False)
    pincode = Column(String, nullable=False)
    lat = Column(Numeric, nullable=True)
    lon = Column(Numeric, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="addresses")

