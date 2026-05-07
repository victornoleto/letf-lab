from __future__ import annotations

import enum
from datetime import date, datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ai_swing.db.base import Base


class IndicatorType(str, enum.Enum):
    SMA_GATE = "SMA_GATE"
    EMA_GATE = "EMA_GATE"
    VOL_GATE = "VOL_GATE"
    AR1_GATE = "AR1_GATE"


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Indicator(Base):
    __tablename__ = "indicators"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)
    type: Mapped[IndicatorType] = mapped_column(Enum(IndicatorType), nullable=False)
    params: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    strategies: Mapped[list[StrategyIndicator]] = relationship(
        back_populates="indicator", cascade="all, delete-orphan"
    )


class Strategy(Base):
    __tablename__ = "strategies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)
    benchmark_ticker: Mapped[str] = mapped_column(String(16), nullable=False)
    risk_on_ticker: Mapped[str] = mapped_column(String(16), nullable=False)
    risk_off_ticker: Mapped[str] = mapped_column(String(16), nullable=False)
    k_threshold: Mapped[int] = mapped_column(Integer, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    indicators: Mapped[list[StrategyIndicator]] = relationship(
        back_populates="strategy", cascade="all, delete-orphan", order_by="StrategyIndicator.order"
    )


class StrategyIndicator(Base):
    __tablename__ = "strategy_indicators"
    __table_args__ = (UniqueConstraint("strategy_id", "indicator_id", name="uq_strategy_indicator"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    strategy_id: Mapped[int] = mapped_column(ForeignKey("strategies.id", ondelete="CASCADE"))
    indicator_id: Mapped[int] = mapped_column(ForeignKey("indicators.id", ondelete="RESTRICT"))
    order: Mapped[int] = mapped_column(Integer, default=0)

    strategy: Mapped[Strategy] = relationship(back_populates="indicators")
    indicator: Mapped[Indicator] = relationship(back_populates="strategies")


class SignalSnapshot(Base):
    __tablename__ = "signal_snapshots"
    __table_args__ = (UniqueConstraint("strategy_id", "date", name="uq_snapshot_strategy_date"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    strategy_id: Mapped[int] = mapped_column(ForeignKey("strategies.id", ondelete="CASCADE"))
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    indicator_results: Mapped[list] = mapped_column(JSON, nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    total: Mapped[int] = mapped_column(Integer, nullable=False)
    risk_on: Mapped[bool] = mapped_column(Boolean, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class SignalTransition(Base):
    __tablename__ = "signal_transitions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    strategy_id: Mapped[int] = mapped_column(
        ForeignKey("strategies.id", ondelete="CASCADE"), index=True
    )
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    from_state: Mapped[bool] = mapped_column(Boolean, nullable=False)
    to_state: Mapped[bool] = mapped_column(Boolean, nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    total: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class BacktestCache(Base):
    __tablename__ = "backtest_cache"

    config_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    strategy_id: Mapped[int] = mapped_column(ForeignKey("strategies.id", ondelete="CASCADE"))
    asof_date: Mapped[date] = mapped_column(Date, nullable=False)
    range_years: Mapped[int] = mapped_column(Integer, nullable=False)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    computed_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class RefreshLog(Base):
    __tablename__ = "refresh_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="running")
    n_strategies: Mapped[int] = mapped_column(Integer, default=0)
    n_transitions: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str | None] = mapped_column(String(2000), nullable=True)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
