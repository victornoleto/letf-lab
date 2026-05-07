"""weekly_digests table

Revision ID: 005_weekly_digests
Revises: 004_transactions
Create Date: 2026-05-07

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "005_weekly_digests"
down_revision: Union[str, None] = "004_transactions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "weekly_digests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "week_start",
            sa.Date(),
            nullable=False,
            unique=True,
            index=True,
        ),
        sa.Column("body", sa.String(length=8000), nullable=False),
        sa.Column("model", sa.String(length=80), nullable=False),
        sa.Column(
            "generated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("weekly_digests")
