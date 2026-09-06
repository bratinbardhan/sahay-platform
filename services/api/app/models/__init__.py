import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class MediaType(str, enum.Enum):
    PHOTO = "PHOTO"
    VOICE = "VOICE"


class UserRole(str, enum.Enum):
    """Unified platform roles (Phase 1 auth)."""

    ADMIN = "ADMIN"
    CARETAKER = "CARETAKER"
    PATIENT = "PATIENT"


class UserTier(str, enum.Enum):
    """Subscription tier on the unified account (free vs premium)."""

    FREE = "FREE"
    PREMIUM = "PREMIUM"


class PatientProfile(Base):
    __tablename__ = "patient_profiles"
    __table_args__ = (
        CheckConstraint(
            "assigned_gds_stage >= 1 AND assigned_gds_stage <= 7",
            name="ck_patient_profiles_gds_stage",
        ),
        CheckConstraint("age >= 0", name="ck_patient_profiles_age"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    caregiver_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    assigned_gds_stage: Mapped[int] = mapped_column(Integer, nullable=False)
    primary_language: Mapped[str] = mapped_column(String(32), nullable=False, default="en")
    demitoken_balance: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    streak_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    gameplay_sessions: Mapped[list["GameplaySessionLog"]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )
    reminiscence_media: Mapped[list["ReminiscenceMedia"]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )
    geofence_zones: Mapped[list["GeofenceZone"]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )
    emergency_contacts: Mapped[list["EmergencyContact"]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )
    dda_metrics: Mapped[list["DdaMetricsLog"]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )


class GameplaySessionLog(Base):
    __tablename__ = "gameplay_session_logs"
    __table_args__ = (
        CheckConstraint(
            "gds_stage >= 1 AND gds_stage <= 7",
            name="ck_gameplay_session_logs_gds_stage",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    game_module_id: Mapped[str] = mapped_column(String(128), nullable=False)
    gds_stage: Mapped[int] = mapped_column(Integer, nullable=False)
    difficulty_level: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    tasks_presented: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tasks_completed_cleanly: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tasks_guided: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    avg_latency_ms: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    demitokens_earned: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    session_duration_ms: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    sync_status: Mapped[str] = mapped_column(String(32), nullable=False, default="SYNCED")
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    patient: Mapped["PatientProfile"] = relationship(back_populates="gameplay_sessions")


class ReminiscenceMedia(Base):
    __tablename__ = "reminiscence_media"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    media_type: Mapped[MediaType] = mapped_column(
        Enum(MediaType, name="media_type_enum"), nullable=False
    )
    file_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    label_text: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    relation_tag: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    event_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    checksum_sha256: Mapped[str] = mapped_column(String(64), nullable=False)

    patient: Mapped["PatientProfile"] = relationship(back_populates="reminiscence_media")


class GeofenceZone(Base):
    __tablename__ = "geofence_zones"
    __table_args__ = (
        CheckConstraint("radius_meters > 0", name="ck_geofence_zones_radius"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    zone_name: Mapped[str] = mapped_column(String(255), nullable=False)
    center_lat: Mapped[float] = mapped_column(Float, nullable=False)
    center_lng: Mapped[float] = mapped_column(Float, nullable=False)
    radius_meters: Mapped[float] = mapped_column(Float, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    patient: Mapped["PatientProfile"] = relationship(back_populates="geofence_zones")


class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("patient_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone_number: Mapped[str] = mapped_column(String(32), nullable=False)
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    patient: Mapped["PatientProfile"] = relationship(back_populates="emergency_contacts")


class DdaMetricsLog(Base):
    """Persisted Achaotic DDA curve points, written by the sync flow."""

    __tablename__ = "dda_metrics_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("patient_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    session_log_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("gameplay_session_logs.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    latency_ms_rolling: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    error_rate_rolling: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    raw_difficulty: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    smoothed_difficulty: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    patient: Mapped["PatientProfile"] = relationship(back_populates="dda_metrics")


class AuditLog(Base):
    """Immutable clinical audit trail entries for every mutation."""

    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    actor_type: Mapped[str] = mapped_column(String(32), nullable=False, default="system")
    actor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    action: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    entity_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    meta: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class User(Base):
    """Unified authentication account (Phase 1) with role and premium tier.

    Every login on the platform (mobile caretaker / patient switchboard and the
    web dashboard) authenticates against this table. `role` decides which
    surface a user lands on (admin → `/admin`, caretaker → `/dashboard`), while
    `tier` drives the FREE / PREMIUM badge shown in the client headers.
    """

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", native_enum=False),
        nullable=False,
        default=UserRole.CARETAKER,
    )
    tier: Mapped[UserTier] = mapped_column(
        Enum(UserTier, name="user_tier", native_enum=False),
        nullable=False,
        default=UserTier.FREE,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_seen_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
