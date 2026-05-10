"""Build per-indicator time series for the strategy detail "Indicators" tab.

The frontend renders one chart per strategy indicator: each chart compares
the price/return path against the indicator's reference curve (SMA, EMA,
realized vol, AR(1) coefficient) so the user can see how close the gate
is to flipping. We compute everything from cached parquet prices, no DB
trip beyond loading the strategy itself.
"""
from __future__ import annotations

import math

import numpy as np
import pandas as pd

from ai_swing.data import get_price_service
from ai_swing.db.models import IndicatorType, Strategy
from ai_swing.indicators import functions as F

# Cap returned points per series to keep payload small. Charts downsample
# aggressively below this anyway.
_MAX_POINTS = 1500

_RANGE_DAYS = {
    "1m": 30, "3m": 90, "6m": 180, "1y": 365, "3y": 1095, "5y": 1825, "max": 36500,
}


def _safe_float(v) -> float | None:
    if v is None:
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    if math.isnan(f) or math.isinf(f):
        return None
    return f


def _downsample(idx: pd.DatetimeIndex, *arrays: pd.Series) -> tuple[pd.DatetimeIndex, list[pd.Series]]:
    n = len(idx)
    if n <= _MAX_POINTS:
        return idx, [a for a in arrays]
    step = max(1, n // _MAX_POINTS)
    sampled_idx = idx[::step]
    sampled = [a.iloc[::step] for a in arrays]
    if sampled_idx[-1] != idx[-1]:
        sampled_idx = sampled_idx.append(idx[[-1]])
        sampled = [pd.concat([s, a.iloc[[-1]]]) for s, a in zip(sampled, arrays)]
    return sampled_idx, sampled


def build_indicator_series(strategy: Strategy, range_label: str = "1y") -> list[dict]:
    days = _RANGE_DAYS.get(range_label, 365)
    ps = get_price_service()
    prices = ps.get_close_series(strategy.benchmark_ticker)
    if prices.empty:
        return []
    returns = prices.pct_change()

    cutoff = prices.dropna().index[-1] - pd.Timedelta(days=days)
    mask = prices.index >= cutoff

    out: list[dict] = []
    for si in strategy.indicators:
        ind = si.indicator
        params = ind.params or {}
        itype = ind.type

        if itype == IndicatorType.SMA_GATE:
            period = int(params.get("period", 200))
            threshold = float(params.get("threshold", 0.0))
            ref = prices.rolling(window=period, min_periods=period).mean()
            value_label = f"SMA{period}"
            value_units = "price"
            value_series = prices  # the "price" track on this chart
            out.append({
                "indicator_id": ind.id,
                "indicator_name": ind.name,
                "indicator_type": itype.value,
                "value_label": value_label,
                "value_units": value_units,
                "threshold": threshold,
                "points": _zip_points(prices, ref, mask),
                "trigger": "price > " + value_label
                          + (f" + {threshold * 100:.1f}%" if threshold > 0 else ""),
            })

        elif itype == IndicatorType.EMA_GATE:
            period = int(params.get("period", 200))
            threshold = float(params.get("threshold", 0.0))
            ref = prices.ewm(span=period, min_periods=period, adjust=False).mean()
            value_label = f"EMA{period}"
            out.append({
                "indicator_id": ind.id,
                "indicator_name": ind.name,
                "indicator_type": itype.value,
                "value_label": value_label,
                "value_units": "price",
                "threshold": threshold,
                "points": _zip_points(prices, ref, mask),
                "trigger": "price > " + value_label
                          + (f" + {threshold * 100:.1f}%" if threshold > 0 else ""),
            })

        elif itype == IndicatorType.VOL_GATE:
            window = int(params.get("window", 21))
            threshold = float(params.get("threshold", 0.40))
            vol = F.realized_vol(returns, window=window)
            out.append({
                "indicator_id": ind.id,
                "indicator_name": ind.name,
                "indicator_type": itype.value,
                "value_label": f"vol{window}d",
                "value_units": "ratio",
                "threshold": threshold,
                "points": _zip_single_value(vol, mask),
                "trigger": f"vol{window}d < {threshold * 100:.0f}%",
            })

        elif itype == IndicatorType.AR1_GATE:
            window = int(params.get("window", 30))
            threshold = float(params.get("threshold", 0.0))
            coef = F.ar1_coefficient(returns, window=window)
            out.append({
                "indicator_id": ind.id,
                "indicator_name": ind.name,
                "indicator_type": itype.value,
                "value_label": f"AR(1)_{window}d",
                "value_units": "coef",
                "threshold": threshold,
                "points": _zip_single_value(coef, mask),
                "trigger": f"AR(1)_{window}d > {threshold:+.2f}",
            })

    return out


def _zip_points(price: pd.Series, ref: pd.Series, mask) -> list[dict]:
    """For SMA/EMA charts: each row carries price + reference line + (price-ref)/ref."""
    p = price[mask]
    r = ref[mask]
    idx, [p_s, r_s] = _downsample(p.index, p, r)
    out: list[dict] = []
    for ts, pv, rv in zip(idx, p_s.to_numpy(), r_s.to_numpy()):
        out.append({
            "date": ts.date().isoformat() if hasattr(ts, "date") else str(ts),
            "price": _safe_float(pv),
            "ref": _safe_float(rv),
            "distance_pct": _safe_distance(pv, rv),
        })
    return out


def _zip_single_value(value: pd.Series, mask) -> list[dict]:
    """For vol/AR(1) charts: a single track + threshold reference line."""
    v = value[mask]
    idx, [v_s] = _downsample(v.index, v)
    out: list[dict] = []
    for ts, val in zip(idx, v_s.to_numpy()):
        out.append({
            "date": ts.date().isoformat() if hasattr(ts, "date") else str(ts),
            "value": _safe_float(val),
        })
    return out


def _safe_distance(price, ref) -> float | None:
    p = _safe_float(price)
    r = _safe_float(ref)
    if p is None or r is None or r == 0:
        return None
    return (p - r) / r
