"""Evaluate an indicator against a price series → IndicatorResult.

Resolves type+params → function → returns latest gate state plus a human-readable
summary suitable for dashboard display.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from ai_swing.db.models import Indicator, IndicatorType
from ai_swing.indicators import functions as F


@dataclass
class IndicatorResult:
    indicator_id: int
    indicator_name: str
    indicator_type: IndicatorType
    gate_passed: bool
    value: float  # raw scalar (e.g. AR(1) coef, realized vol, latest price for SMA)
    raw_summary: str
    gate_series: pd.Series  # full series, used for backtest


def _latest(series: pd.Series) -> float | None:
    s = series.dropna()
    if s.empty:
        return None
    return float(s.iloc[-1])


def evaluate_indicator(
    indicator: Indicator, prices: pd.Series, returns: pd.Series | None = None
) -> IndicatorResult:
    """Compute the indicator gate and summary for the latest available bar.

    Parameters
    ----------
    indicator : Indicator
        Persisted indicator with type + params.
    prices : pd.Series
        Daily close prices, datetime-indexed.
    returns : pd.Series | None
        Daily returns. Computed from prices if None.
    """
    if returns is None:
        returns = prices.pct_change()

    params = indicator.params or {}
    itype = indicator.type

    if itype == IndicatorType.SMA_GATE:
        period = int(params.get("period", 200))
        threshold = float(params.get("threshold", 0.0))
        gate = F.sma_gate(prices, period=period, threshold=threshold)
        sma = prices.rolling(window=period, min_periods=period).mean()
        latest_price = _latest(prices)
        latest_sma = _latest(sma)
        passed = bool(gate.dropna().iloc[-1]) if not gate.dropna().empty else False
        if latest_price is not None and latest_sma is not None:
            band = f" ±{threshold * 100:.1f}%" if threshold > 0 else ""
            summary = (
                f"price {latest_price:.2f} {'>' if passed else '<='} "
                f"SMA{period}{band} {latest_sma:.2f}"
            )
        else:
            summary = "n/a (warmup)"
        value = float(latest_price) if latest_price is not None else float("nan")

    elif itype == IndicatorType.EMA_GATE:
        period = int(params.get("period", 200))
        threshold = float(params.get("threshold", 0.0))
        gate = F.ema_gate(prices, period=period, threshold=threshold)
        ema = prices.ewm(span=period, min_periods=period, adjust=False).mean()
        latest_price = _latest(prices)
        latest_ema = _latest(ema)
        passed = bool(gate.dropna().iloc[-1]) if not gate.dropna().empty else False
        if latest_price is not None and latest_ema is not None:
            band = f" ±{threshold * 100:.1f}%" if threshold > 0 else ""
            summary = (
                f"price {latest_price:.2f} {'>' if passed else '<='} "
                f"EMA{period}{band} {latest_ema:.2f}"
            )
        else:
            summary = "n/a (warmup)"
        value = float(latest_price) if latest_price is not None else float("nan")

    elif itype == IndicatorType.VOL_GATE:
        window = int(params.get("window", 21))
        threshold = float(params.get("threshold", 0.40))
        gate = F.realized_vol_gate(returns, window=window, threshold=threshold)
        vol_series = F.realized_vol(returns, window=window)
        latest_vol = _latest(vol_series)
        passed = bool(gate.dropna().iloc[-1]) if not gate.dropna().empty else False
        summary = (
            f"vol{window}d {latest_vol * 100:.1f}% {'<' if passed else '>='} {threshold * 100:.0f}%"
            if latest_vol is not None
            else "n/a (warmup)"
        )
        value = float(latest_vol) if latest_vol is not None else float("nan")

    elif itype == IndicatorType.AR1_GATE:
        window = int(params.get("window", 30))
        threshold = float(params.get("threshold", 0.0))
        gate = F.ar1_gate(returns, window=window, threshold=threshold)
        coef_series = F.ar1_coefficient(returns, window=window)
        latest_coef = _latest(coef_series)
        passed = bool(gate.dropna().iloc[-1]) if not gate.dropna().empty else False
        summary = (
            f"AR(1)_{window}d {latest_coef:+.3f} {'>' if passed else '<='} {threshold:+.2f}"
            if latest_coef is not None
            else "n/a (warmup)"
        )
        value = float(latest_coef) if latest_coef is not None else float("nan")

    else:
        raise ValueError(f"Unknown indicator type: {itype}")

    return IndicatorResult(
        indicator_id=indicator.id,
        indicator_name=indicator.name,
        indicator_type=itype,
        gate_passed=passed,
        value=value if not np.isnan(value) else 0.0,
        raw_summary=summary,
        gate_series=gate,
    )
