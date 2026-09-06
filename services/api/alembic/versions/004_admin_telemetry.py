"""Add last_seen_at (user telemetry) and session_duration_ms (screen time) for Phase 2.

`last_seen_at` is populated by the lightweight heartbeat endpoint and drives the
real-time online-users count. `session_duration_ms` backs the platform-wide
"total screen time / session length" analytics shown in the admin overview.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "004_admin_telemetry"
down_revision: Union[str, None] = "003_auth_users_roles_tiers"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_users_last_seen_at", "users", ["last_seen_at"])
    op.add_column(
        "gameplay_session_logs",
        sa.Column(
            "session_duration_ms",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )


def downgrade() -> None:
    op.drop_column("gameplay_session_logs", "session_duration_ms")
    op.drop_index("ix_users_last_seen_at", table_name="users")
    op.drop_column("users", "last_seen_at")
