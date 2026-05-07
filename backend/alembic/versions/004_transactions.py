"""transactions table

Revision ID: 004_transactions
Revises: 003_strategy_reports
Create Date: 2026-05-07

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "004_transactions"
down_revision: Union[str, None] = "003_strategy_reports"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    side = sa.Enum("buy", "sell", name="transactionside")

    op.create_table(
        "transactions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("date", sa.Date(), nullable=False, index=True),
        sa.Column("asset_ticker", sa.String(length=16), nullable=False, index=True),
        sa.Column("side", side, nullable=False),
        sa.Column("n_shares", sa.Numeric(18, 8), nullable=False),
        sa.Column("price_per_share", sa.Numeric(18, 6), nullable=False),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="USD"),
        sa.Column("fx_rate_to_usd", sa.Numeric(18, 8), nullable=False, server_default="1"),
        sa.Column("fees", sa.Numeric(18, 6), nullable=False, server_default="0"),
        sa.Column("notes", sa.String(length=500), nullable=True),
        sa.Column(
            "strategy_id",
            sa.Integer(),
            sa.ForeignKey("strategies.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("transactions")
    sa.Enum(name="transactionside").drop(op.get_bind(), checkfirst=True)
