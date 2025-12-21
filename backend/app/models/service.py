from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from geoalchemy2 import Geography

from app.db.base import Base


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("providers.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    category = Column(String, index=True)
    price = Column(Numeric)
    image_url = Column(String, nullable=True, default="/images/service-placeholder.jpg")
    location = Column(Geography(geometry_type="POINT", srid=4326))
    flagged = Column(Boolean, default=False)
    flag_reason = Column(Text, nullable=True)
    approved = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    provider = relationship("Provider", back_populates="services")
    reviews = relationship("Review", back_populates="service")

