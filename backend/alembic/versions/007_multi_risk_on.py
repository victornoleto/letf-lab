"""multi risk-on strategies

Revision ID: 007_multi_risk_on
Revises: 006_strategy_gates_snapshots
Create Date: 2026-05-10

"""
from __future__ import annotations

import json
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "007_multi_risk_on"
down_revision: Union[str, None] = "006_strategy_gates_snapshots"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    with op.batch_alter_table("strategies") as batch:
        batch.add_column(sa.Column("risk_on_tickers", sa.JSON(), nullable=True))

    rows = conn.execute(sa.text("SELECT id, risk_on_ticker FROM strategies")).fetchall()
    update_tickers = sa.text(
        "UPDATE strategies SET risk_on_tickers = :tickers WHERE id = :id"
    ).bindparams(sa.bindparam("tickers", type_=sa.JSON()))
    for row in rows:
        conn.execute(
            update_tickers,
            {"tickers": [row.risk_on_ticker], "id": row.id},
        )

    conn.execute(sa.text("DELETE FROM backtest_cache"))
    conn.execute(
        sa.text("DELETE FROM strategies WHERE name IN (:mu, :ftec)"),
        {"mu": "MU → MUU vote-of-2", "ftec": "FTEC → TECL vote-of-2"},
    )

    with op.batch_alter_table("strategies") as batch:
        batch.alter_column("risk_on_tickers", nullable=False)
        batch.drop_column("risk_on_ticker")


def downgrade() -> None:
    conn = op.get_bind()
    with op.batch_alter_table("strategies") as batch:
        batch.add_column(sa.Column("risk_on_ticker", sa.String(length=16), nullable=True))

    rows = conn.execute(sa.text("SELECT id, risk_on_tickers FROM strategies")).fetchall()
    for row in rows:
        tickers = row.risk_on_tickers or []
        if isinstance(tickers, str):
            tickers = json.loads(tickers)
        primary = tickers[0] if tickers else ""
        conn.execute(
            sa.text("UPDATE strategies SET risk_on_ticker = :ticker WHERE id = :id"),
            {"ticker": primary, "id": row.id},
        )

    conn.execute(sa.text("DELETE FROM backtest_cache"))

    with op.batch_alter_table("strategies") as batch:
        batch.alter_column("risk_on_ticker", nullable=False)
        batch.drop_column("risk_on_tickers")
