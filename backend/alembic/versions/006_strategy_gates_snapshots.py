"""strategy_gates_snapshots table

Revision ID: 006_strategy_gates_snapshots
Revises: 005_weekly_digests
Create Date: 2026-05-07

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "006_strategy_gates_snapshots"
down_revision: Union[str, None] = "005_weekly_digests"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "strategy_gates_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "strategy_id",
            sa.Integer(),
            sa.ForeignKey("strategies.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("asof_date", sa.Date(), nullable=False, index=True),
        sa.Column("range_years", sa.Integer(), nullable=False, server_default="10"),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column(
            "computed_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint(
            "strategy_id", "asof_date", "range_years",
            name="uq_gates_strategy_asof_range",
        ),
    )


def downgrade() -> None:
    op.drop_table("strategy_gates_snapshots")
