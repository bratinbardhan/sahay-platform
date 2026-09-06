"""Add unified users table with role and premium-tier enums (Phase 1 auth).

Store `role` and `tier` as portable VARCHAR + CHECK constraints so the same
migration runs unmodified on SQLite (local dev) and PostgreSQL (production),
mirroring the SQLAlchemy `Enum(..., native_enum=False)` columns on the model.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "003_auth_users_roles_tiers"
down_revision: Union[str, None] = "002_dda_audit_emergency"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column(
            "role",
            sa.String(length=16),
            nullable=False,
            server_default="CARETAKER",
        ),
        sa.Column("tier", sa.String(length=16), nullable=False, server_default="FREE"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "role IN ('ADMIN', 'CARETAKER', 'PATIENT')",
            name="ck_users_role",
        ),
        sa.CheckConstraint("tier IN ('FREE', 'PREMIUM')", name="ck_users_tier"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")