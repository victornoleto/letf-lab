"""strategy_reports table

Revision ID: 003_strategy_reports
Revises: 002_users
Create Date: 2026-05-07

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003_strategy_reports"
down_revision: Union[str, None] = "002_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "strategy_reports",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "strategy_id",
            sa.Integer(),
            sa.ForeignKey("strategies.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("date", sa.Date(), nullable=False, index=True),
        sa.Column("headline", sa.String(length=280), nullable=False),
        sa.Column("body", sa.String(length=4000), nullable=False),
        sa.Column("proximity_state", sa.String(length=32), nullable=True),
        sa.Column("model", sa.String(length=80), nullable=False),
        sa.Column("generated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("strategy_id", "date", name="uq_report_strategy_date"),
    )


def downgrade() -> None:
    op.drop_table("strategy_reports")
