"""Add demitoken_ledger table for auditable token economy.

Append-only ledger where every credit and debit flows through. The verified
balance for a user is always SUM(amount) over their ledger rows.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "005_demitoken_ledger"
down_revision: Union[str, None] = "004_admin_telemetry"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "demitoken_ledger",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("transaction_type", sa.String(length=32), nullable=False),
        sa.Column("balance_after", sa.Integer(), nullable=False),
        sa.Column("reference_id", sa.String(length=128), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint("amount != 0", name="ck_demitoken_ledger_amount_nonzero"),
    )
    op.create_index(
        "ix_demitoken_ledger_user_id", "demitoken_ledger", ["user_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_demitoken_ledger_user_id", table_name="demitoken_ledger")
    op.drop_table("demitoken_ledger")