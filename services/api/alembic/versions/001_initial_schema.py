"""Initial schema: patient profiles, gameplay logs, reminiscence media, geofence zones."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

media_type_enum = postgresql.ENUM("PHOTO", "VOICE", name="media_type_enum", create_type=False)


def upgrade() -> None:
    media_type_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "patient_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("caregiver_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("age", sa.Integer(), nullable=False),
        sa.Column("assigned_gds_stage", sa.Integer(), nullable=False),
        sa.Column("primary_language", sa.String(length=32), nullable=False, server_default="en"),
        sa.Column("demitoken_balance", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("streak_days", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("assigned_gds_stage >= 1 AND assigned_gds_stage <= 7", name="ck_patient_profiles_gds_stage"),
        sa.CheckConstraint("age >= 0", name="ck_patient_profiles_age"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_patient_profiles_caregiver_id", "patient_profiles", ["caregiver_id"])

    op.create_table(
        "gameplay_session_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("game_module_id", sa.String(length=128), nullable=False),
        sa.Column("gds_stage", sa.Integer(), nullable=False),
        sa.Column("difficulty_level", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("tasks_presented", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("tasks_completed_cleanly", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("tasks_guided", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("avg_latency_ms", sa.Float(), nullable=False, server_default="0"),
        sa.Column("demitokens_earned", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("sync_status", sa.String(length=32), nullable=False, server_default="SYNCED"),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("gds_stage >= 1 AND gds_stage <= 7", name="ck_gameplay_session_logs_gds_stage"),
        sa.ForeignKeyConstraint(["patient_id"], ["patient_profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_gameplay_session_logs_patient_id", "gameplay_session_logs", ["patient_id"])

    op.create_table(
        "reminiscence_media",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("media_type", media_type_enum, nullable=False),
        sa.Column("file_url", sa.String(length=2048), nullable=False),
        sa.Column("label_text", sa.String(length=512), nullable=False, server_default=""),
        sa.Column("relation_tag", sa.String(length=128), nullable=False, server_default=""),
        sa.Column("event_year", sa.Integer(), nullable=True),
        sa.Column("checksum_sha256", sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(["patient_id"], ["patient_profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_reminiscence_media_patient_id", "reminiscence_media", ["patient_id"])

    op.create_table(
        "geofence_zones",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("zone_name", sa.String(length=255), nullable=False),
        sa.Column("center_lat", sa.Float(), nullable=False),
        sa.Column("center_lng", sa.Float(), nullable=False),
        sa.Column("radius_meters", sa.Float(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.CheckConstraint("radius_meters > 0", name="ck_geofence_zones_radius"),
        sa.ForeignKeyConstraint(["patient_id"], ["patient_profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_geofence_zones_patient_id", "geofence_zones", ["patient_id"])


def downgrade() -> None:
    op.drop_index("ix_geofence_zones_patient_id", table_name="geofence_zones")
    op.drop_table("geofence_zones")
    op.drop_index("ix_reminiscence_media_patient_id", table_name="reminiscence_media")
    op.drop_table("reminiscence_media")
    op.drop_index("ix_gameplay_session_logs_patient_id", table_name="gameplay_session_logs")
    op.drop_table("gameplay_session_logs")
    op.drop_index("ix_patient_profiles_caregiver_id", table_name="patient_profiles")
    op.drop_table("patient_profiles")
    media_type_enum.drop(op.get_bind(), checkfirst=True)
