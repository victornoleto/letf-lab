from __future__ import annotations

from datetime import date

from pydantic import BaseModel


class BacktestPoint(BaseModel):
    date: date
    value: float


class BacktestTransition(BaseModel):
    date: date
    from_state: bool
    to_state: bool


class BacktestMetrics(BaseModel):
    cagr: float
    max_dd: float
    sharpe: float
    n_trades: int | None = None
    hit_rate_vs_benchmark: float | None = None
    # Net-of-tax (Lei 14.754) — only populated for the strategy curve.
    cagr_net: float | None = None
    sharpe_net: float | None = None
    tax_drag_pp: float | None = None


class BacktestResultDTO(BaseModel):
    range_start: date
    range_end: date
    range_years: int
    asof_date: date
    cached: bool
    equity_strategy: list[BacktestPoint]
    equity_strategy_net: list[BacktestPoint] = []
    equity_benchmark_buyhold: list[BacktestPoint]
    equity_riskon_buyhold: list[BacktestPoint]
    equity_ratio_vs_benchmark: list[BacktestPoint]
    metrics_strategy: BacktestMetrics
    metrics_benchmark: BacktestMetrics
    metrics_riskon: BacktestMetrics
    transitions: list[BacktestTransition]
