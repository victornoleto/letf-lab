"""Backtest engine: vote-of-K signal → T+1 rotation between risk_on / risk_off ETFs."""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date, timedelta

import numpy as np
import pandas as pd

from ai_swing.backtest.metrics import Metrics, compute_metrics
from ai_swing.backtest.tax_layer import apply_annual_darf
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
    equity_strategy_net: list[EquityPoint] = field(default_factory=list)
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


@dataclass
class StrategyCurves:
    """Daily series produced by the rotation engine — pre-downsampling.

    Reused by Deploy Score, rolling-stress and any other consumer that needs
    the raw series instead of the API-shaped EquityPoint lists.
    """
    range_start: date
    range_end: date
    asof_date: date
    df: pd.DataFrame  # columns: bench, risk_on, risk_off, aligned + dropna'd
    composite: pd.Series  # 0/1 signal, indexed to df.index
    positions: pd.Series  # ffilled & T+1-lagged version of composite
    strategy_returns: pd.Series
    equity_strategy: pd.Series
    equity_bench: pd.Series
    equity_riskon: pd.Series


def compute_strategy_curves(strategy: Strategy, range_years: int = 10) -> StrategyCurves:
    """Run the rotation engine and return the raw daily curves.

    Public helper used by both `run_backtest` (which downsamples for the API
    response) and downstream analytics (deploy-score, rolling-stress) that
    need the full daily series. Position logic:

      - At end of day t, compute composite gate from indicators on benchmark
        prices up to t.
      - Hold the resulting position from day t+1 onward.
      - Daily return on day t+1 = position[t] · return_riskon[t+1]
                                  + (1 - position[t]) · return_riskoff[t+1].
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

    df = pd.concat(
        [bench.rename("bench"), risk_on.rename("risk_on"), risk_off.rename("risk_off")],
        axis=1,
        join="inner",
    ).dropna()
    if df.empty:
        raise ValueError("No overlapping price data across the three tickers")

    cutoff = df.index[-1] - pd.Timedelta(days=int(range_years * 365.25))
    df_trimmed = df[df.index >= cutoff]
    if len(df_trimmed) >= 60:
        df = df_trimmed
    # Below 60 trading days (~3 months) annualized metrics like Sharpe become
    # statistically meaningless — std on so few samples explodes the ratio.
    # Better to surface a clear error than to publish a number like Sharpe=10.
    if len(df) < 60:
        raise ValueError(
            f"Too few bars to backtest ({len(df)} < 60). "
            "Likely cause: one of the tickers has only the 30-day refresh "
            "window cached. Trigger a full price prime."
        )

    gates: list[pd.Series] = []
    for ind in indicators:
        try:
            res = evaluate_indicator(ind, bench, returns=bench.pct_change())
            gates.append(res.gate_series.reindex(df.index))
        except Exception as exc:
            logger.warning("Skipping indicator %s in backtest: %s", ind.name, exc)
    if not gates:
        raise ValueError("No usable indicators")

    composite = vote_of_k(gates, k=strategy.k_threshold).reindex(df.index)
    positions = composite.shift(1)
    positions_filled = positions.ffill().fillna(0.0)

    risk_on_ret = df["risk_on"].pct_change()
    risk_off_ret = df["risk_off"].pct_change()
    strategy_returns = positions_filled * risk_on_ret + (1 - positions_filled) * risk_off_ret

    valid_idx = strategy_returns.dropna().index
    if valid_idx.empty:
        raise ValueError("No valid strategy returns")

    equity_strategy = (1 + strategy_returns.loc[valid_idx]).cumprod()
    equity_bench = (1 + df["bench"].pct_change().loc[valid_idx]).cumprod()
    equity_riskon = (1 + df["risk_on"].pct_change().loc[valid_idx]).cumprod()

    return StrategyCurves(
        range_start=valid_idx[0].date(),
        range_end=valid_idx[-1].date(),
        asof_date=df.index[-1].date(),
        df=df,
        composite=composite,
        positions=positions_filled,
        strategy_returns=strategy_returns,
        equity_strategy=equity_strategy,
        equity_bench=equity_bench,
        equity_riskon=equity_riskon,
    )


def run_backtest(strategy: Strategy, range_years: int = 10) -> BacktestResult:
    """API-facing backtest: returns BacktestResult with downsampled equity points."""
    curves = compute_strategy_curves(strategy, range_years=range_years)

    valid_idx = curves.equity_strategy.index
    equity_ratio = curves.equity_strategy / curves.equity_bench

    transitions: list[BacktestTransition] = []
    composite_clean = curves.composite.dropna().astype(int)
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

    strategy_returns_window = curves.strategy_returns.loc[valid_idx]
    metrics_strategy = compute_metrics(
        curves.equity_strategy,
        strategy_returns_window,
        benchmark_equity=curves.equity_bench,
        positions=curves.positions.loc[valid_idx],
    )
    metrics_benchmark = compute_metrics(
        curves.equity_bench, curves.df["bench"].pct_change().loc[valid_idx]
    )
    metrics_riskon = compute_metrics(
        curves.equity_riskon, curves.df["risk_on"].pct_change().loc[valid_idx]
    )

    # Tax-aware net curve (Lei 14.754, annual_realize). Compounding shape is
    # preserved; the DARF deduction lands on the last bar of each calendar
    # year. We re-run compute_metrics on the net equity to get sharpe_net /
    # cagr_net and report the gross→net Sharpe drag in pp.
    equity_strategy_net = apply_annual_darf(
        curves.equity_strategy, strategy_returns_window
    )
    net_returns = equity_strategy_net.pct_change().fillna(0.0)
    metrics_net = compute_metrics(equity_strategy_net, net_returns)
    metrics_strategy.cagr_net = metrics_net.cagr
    metrics_strategy.sharpe_net = metrics_net.sharpe
    metrics_strategy.tax_drag_pp = metrics_strategy.sharpe - metrics_net.sharpe

    return BacktestResult(
        range_start=curves.range_start,
        range_end=curves.range_end,
        range_years=range_years,
        asof_date=curves.asof_date,
        equity_strategy=_to_equity_points(_downsample(curves.equity_strategy)),
        equity_strategy_net=_to_equity_points(_downsample(equity_strategy_net)),
        equity_benchmark_buyhold=_to_equity_points(_downsample(curves.equity_bench)),
        equity_riskon_buyhold=_to_equity_points(_downsample(curves.equity_riskon)),
        equity_ratio_vs_benchmark=_to_equity_points(_downsample(equity_ratio)),
        metrics_strategy=metrics_strategy,
        metrics_benchmark=metrics_benchmark,
        metrics_riskon=metrics_riskon,
        transitions=transitions,
    )
