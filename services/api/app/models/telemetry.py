import uuid
from datetime import datetime
from sqlalchemy import Float, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class TelemetryRecord(Base):
    __tablename__ = "telemetry_records"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    patient_id: Mapped[uuid.UUID] = mapped_column(index=True)
    val: Mapped[float] = mapped_column(Float)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
