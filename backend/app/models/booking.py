from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("app_users.id"), nullable=False)
    provider_id = Column(Integer, ForeignKey("providers.id"), nullable=False)
    scheduled_at = Column(DateTime, nullable=False)
    notes = Column(Text)
    status = Column(String, default="pending")  # pending, accepted, rejected, cancelled, completed
    price = Column(Numeric, nullable=True)  # Price at time of booking
    created_at = Column(DateTime, server_default=func.now())

    service = relationship("Service")
    user = relationship("User")
    provider = relationship("Provider")
    review = relationship("Review", back_populates="booking", uselist=False)

