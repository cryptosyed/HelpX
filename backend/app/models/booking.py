from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Text, func as sa_func
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=True)
    global_service_id = Column(Integer, ForeignKey("global_services.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("app_users.id"), nullable=False)
    provider_id = Column(Integer, ForeignKey("providers.id"), nullable=True)
    scheduled_at = Column(DateTime, nullable=False)
    notes = Column(Text)
    status = Column(String, default="pending")  # pending, accepted, rejected, cancelled, completed
    price = Column(Numeric, nullable=True)  # Price at time of booking
    user_address = Column(Text, nullable=True)
    user_lat = Column(Numeric, nullable=True)
    user_lon = Column(Numeric, nullable=True)
    cancelled_by = Column(String, nullable=True)  # "user" | "provider"
    cancel_reason = Column(Text, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    service = relationship("Service")
    global_service = relationship("GlobalService")
    user = relationship("User")
    provider = relationship("Provider")
    review = relationship("Review", back_populates="booking", uselist=False)

    @property
    def end_time(self):
        """
        Derived end time for availability checks.
        Keeping it derived (not stored) avoids schema churn while duration is fixed (1h).
        """
        if not self.scheduled_at:
            return None
        return self.scheduled_at + sa_func.cast("1 hour", sa_func.interval)

