from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class ProviderService(Base):
    __tablename__ = "provider_services"

    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("providers.id"), nullable=False)
    service_id = Column(Integer, ForeignKey("global_services.id"), nullable=False)
    price = Column(Numeric, nullable=True)
    service_radius_km = Column(Numeric, nullable=True)
    experience_years = Column(Numeric, nullable=True)
    is_active = Column(Boolean, default=True, server_default="true")
    created_at = Column(DateTime, server_default=func.now())

    provider = relationship("Provider")
    service = relationship("GlobalService")

