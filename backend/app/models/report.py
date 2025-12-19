from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("app_users.id"), nullable=False)
    report_type = Column(String, nullable=False)  # service, user, provider, booking (legacy)
    target_type = Column(String, nullable=True)  # service|provider|booking
    target_id = Column(Integer, nullable=False)  # ID of the reported entity
    reason = Column(Text, nullable=False)
    status = Column(String, default="open")  # open, reviewed, resolved
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    resolved_at = Column(DateTime, nullable=True)

    reporter = relationship("User")

