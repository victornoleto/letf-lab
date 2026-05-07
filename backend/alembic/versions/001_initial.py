"""initial schema

Revision ID: 001_initial
Revises:
Create Date: 2026-05-06

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    indicator_type = sa.Enum(
        "SMA_GATE", "EMA_GATE", "VOL_GATE", "AR1_GATE", name="indicatortype"
    )

    op.create_table(
        "indicators",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False, unique=True),
        sa.Column("type", indicator_type, nullable=False),
        sa.Column("params", sa.JSON(), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "strategies",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False, unique=True),
        sa.Column("benchmark_ticker", sa.String(length=16), nullable=False),
        sa.Column("risk_on_ticker", sa.String(length=16), nullable=False),
        sa.Column("risk_off_ticker", sa.String(length=16), nullable=False),
        sa.Column("k_threshold", sa.Integer(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "strategy_indicators",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "strategy_id",
            sa.Integer(),
            sa.ForeignKey("strategies.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "indicator_id",
            sa.Integer(),
            sa.ForeignKey("indicators.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.UniqueConstraint("strategy_id", "indicator_id", name="uq_strategy_indicator"),
    )

    op.create_table(
        "signal_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "strategy_id",
            sa.Integer(),
            sa.ForeignKey("strategies.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("date", sa.Date(), nullable=False, index=True),
        sa.Column("indicator_results", sa.JSON(), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("total", sa.Integer(), nullable=False),
        sa.Column("risk_on", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("strategy_id", "date", name="uq_snapshot_strategy_date"),
    )

    op.create_table(
        "signal_transitions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "strategy_id",
            sa.Integer(),
            sa.ForeignKey("strategies.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("date", sa.Date(), nullable=False, index=True),
        sa.Column("from_state", sa.Boolean(), nullable=False),
        sa.Column("to_state", sa.Boolean(), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("total", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "backtest_cache",
        sa.Column("config_hash", sa.String(length=64), primary_key=True),
        sa.Column(
            "strategy_id",
            sa.Integer(),
            sa.ForeignKey("strategies.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("asof_date", sa.Date(), nullable=False),
        sa.Column("range_years", sa.Integer(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("computed_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "refresh_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("n_strategies", sa.Integer(), nullable=False),
        sa.Column("n_transitions", sa.Integer(), nullable=False),
        sa.Column("error", sa.String(length=2000), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("refresh_logs")
    op.drop_table("backtest_cache")
    op.drop_table("signal_transitions")
    op.drop_table("signal_snapshots")
    op.drop_table("strategy_indicators")
    op.drop_table("strategies")
    op.drop_table("indicators")
    sa.Enum(name="indicatortype").drop(op.get_bind(), checkfirst=True)
