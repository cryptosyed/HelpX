from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(Integer, ForeignKey("app_users.id"), nullable=True)
    action = Column(String, nullable=False)
    target_type = Column(String, nullable=False)
    target_id = Column(Integer, nullable=True)
    # Column name remains 'metadata' for compatibility, attribute renamed to avoid SQLAlchemy reserved name
    meta = Column("metadata", Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    actor = relationship("User")

