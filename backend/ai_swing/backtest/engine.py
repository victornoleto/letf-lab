"""Backtest engine: vote-of-K signal → T+1 rotation between risk_on / risk_off ETFs."""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date, timedelta

import numpy as np
import pandas as pd

from ai_swing.backtest.metrics import Metrics, compute_metrics
from ai_swing.data import PriceService, get_price_service
from ai_swing.db.models import Strategy
from ai_swing.indicators.evaluator import evaluate_indicator
from ai_swing.indicators.functions import vote_of_k

logger = logging.getLogger(__name__)


@dataclass
class EquityPoint:
    date: date
    value: float


@dataclass
class BacktestTransition:
    date: date
    from_state: bool
    to_state: bool


@dataclass
class BacktestResult:
    range_start: date
    range_end: date
    range_years: int
    asof_date: date
    equity_strategy: list[EquityPoint] = field(default_factory=list)
    equity_benchmark_buyhold: list[EquityPoint] = field(default_factory=list)
    equity_riskon_buyhold: list[EquityPoint] = field(default_factory=list)
    equity_ratio_vs_benchmark: list[EquityPoint] = field(default_factory=list)
    metrics_strategy: Metrics | None = None
    metrics_benchmark: Metrics | None = None
    metrics_riskon: Metrics | None = None
    transitions: list[BacktestTransition] = field(default_factory=list)


def _to_equity_points(series: pd.Series) -> list[EquityPoint]:
    out: list[EquityPoint] = []
    for ts, val in series.dropna().items():
        if not np.isfinite(val):
            continue
        out.append(EquityPoint(date=ts.date() if hasattr(ts, "date") else ts, value=float(val)))
    return out


def _downsample(series: pd.Series, max_points: int = 1500) -> pd.Series:
    """Reduce a daily equity curve to ~max_points evenly spaced (preserves last)."""
    s = series.dropna()
    if len(s) <= max_points:
        return s
    step = max(1, len(s) // max_points)
    sampled = s.iloc[::step]
    if sampled.index[-1] != s.index[-1]:
        sampled = pd.concat([sampled, s.iloc[[-1]]])
    return sampled


def run_backtest(strategy: Strategy, range_years: int = 10) -> BacktestResult:
    """Run a backtest of the strategy's vote-of-K rotation between risk_on and risk_off.

    Position logic:
      - At end of day t, compute composite gate using indicators on benchmark prices up to t.
      - Hold the resulting position from day t+1 onward (until the gate flips on a later day).
      - Daily return on day t+1 = position[t]·return_riskon[t+1] + (1-position[t])·return_riskoff[t+1].
    """
    ps: PriceService = get_price_service()

    bench = ps.get_close_series(strategy.benchmark_ticker)
    risk_on = ps.get_close_series(strategy.risk_on_ticker)
    risk_off = ps.get_close_series(strategy.risk_off_ticker)

    if bench.empty or risk_on.empty or risk_off.empty:
        raise ValueError(
            f"Missing prices: benchmark={len(bench)} risk_on={len(risk_on)} risk_off={len(risk_off)}"
        )

    indicators = [si.indicator for si in strategy.indicators]
    if not indicators:
        raise ValueError("Strategy has no indicators")

    # Align prices on the intersection of trading days (so all three series exist)
    df = pd.concat(
        [bench.rename("bench"), risk_on.rename("risk_on"), risk_off.rename("risk_off")],
        axis=1,
        join="inner",
    ).dropna()
    if df.empty:
        raise ValueError("No overlapping price data across the three tickers")

    # Trim to last range_years if we have enough; otherwise fall back to all
    # available history. Tickers with short trade histories (recent IPOs, fresh
    # LETFs) shouldn't 400 — we just backtest what we have.
    cutoff = df.index[-1] - pd.Timedelta(days=int(range_years * 365.25))
    df_trimmed = df[df.index >= cutoff]
    if len(df_trimmed) >= 60:
        df = df_trimmed
    if len(df) < 5:
        raise ValueError(f"Too few bars to backtest ({len(df)})")

    bench_returns = df["bench"].pct_change()

    # Compute each indicator's gate using full benchmark history (so warmups use
    # data prior to range_start when possible), then reindex to the backtest range.
    gates: list[pd.Series] = []
    for ind in indicators:
        try:
            res = evaluate_indicator(ind, bench, returns=bench.pct_change())
            gates.append(res.gate_series.reindex(df.index))
        except Exception as exc:
            logger.warning("Skipping indicator %s in backtest: %s", ind.name, exc)
    if not gates:
        raise ValueError("No usable indicators")

    composite = vote_of_k(gates, k=strategy.k_threshold)
    composite = composite.reindex(df.index)

    # T+1 execution: today's signal is held tomorrow. shift(1) so positions[t]
    # is yesterday's signal — applied to today's returns.
    positions = composite.shift(1)
    positions_filled = positions.ffill().fillna(0.0)

    risk_on_ret = df["risk_on"].pct_change()
    risk_off_ret = df["risk_off"].pct_change()

    strategy_returns = positions_filled * risk_on_ret + (1 - positions_filled) * risk_off_ret

    # Equity curves start at 1 from the first valid day
    valid_idx = strategy_returns.dropna().index
    if valid_idx.empty:
        raise ValueError("No valid strategy returns")

    equity_strategy = (1 + strategy_returns.loc[valid_idx]).cumprod()
    equity_bench = (1 + df["bench"].pct_change().loc[valid_idx]).cumprod()
    equity_riskon = (1 + df["risk_on"].pct_change().loc[valid_idx]).cumprod()

    # Ratio strategy/benchmark — ≥1 means strategy is ahead, <1 means behind.
    # Both equity curves start at 1.0 on the same valid_idx[0], so ratio[0] == 1.
    equity_ratio = equity_strategy / equity_bench

    # Transitions on the *signal* (composite), not the lagged position
    transitions: list[BacktestTransition] = []
    composite_clean = composite.dropna().astype(int)
    if not composite_clean.empty:
        flips = composite_clean.diff().fillna(0)
        for ts, change in flips[flips != 0].items():
            transitions.append(
                BacktestTransition(
                    date=ts.date() if hasattr(ts, "date") else ts,
                    from_state=bool(composite_clean.loc[ts] - change == 1),
                    to_state=bool(composite_clean.loc[ts] == 1),
                )
            )

    metrics_strategy = compute_metrics(
        equity_strategy,
        strategy_returns.loc[valid_idx],
        benchmark_equity=equity_bench,
        positions=positions_filled.loc[valid_idx],
    )
    metrics_benchmark = compute_metrics(equity_bench, df["bench"].pct_change().loc[valid_idx])
    metrics_riskon = compute_metrics(equity_riskon, df["risk_on"].pct_change().loc[valid_idx])

    return BacktestResult(
        range_start=valid_idx[0].date(),
        range_end=valid_idx[-1].date(),
        range_years=range_years,
        asof_date=df.index[-1].date(),
        equity_strategy=_to_equity_points(_downsample(equity_strategy)),
        equity_benchmark_buyhold=_to_equity_points(_downsample(equity_bench)),
        equity_riskon_buyhold=_to_equity_points(_downsample(equity_riskon)),
        equity_ratio_vs_benchmark=_to_equity_points(_downsample(equity_ratio)),
        metrics_strategy=metrics_strategy,
        metrics_benchmark=metrics_benchmark,
        metrics_riskon=metrics_riskon,
        transitions=transitions,
    )
