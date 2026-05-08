"""4-gate battery for the Deploy Score (G2 DSR, G3 walk-forward, G6 bootstrap, G7 x-lib)."""
from __future__ import annotations

import numpy as np
import pandas as pd

from ai_swing.backtest.engine import compute_strategy_curves
from ai_swing.backtest.metrics import sortino as sortino_metric
from ai_swing.backtest.validation.dsr import psr
from ai_swing.backtest.walk_forward import compute_walk_forward
from ai_swing.db.models import Strategy

TRADING_DAYS_PER_YEAR = 252
_MIN_HISTORY = 252
_BOOTSTRAP_BLOCK = 21
_BOOTSTRAP_PCT_LOW = 1.0
_DEFAULT_BOOTSTRAP_RESAMPLES = 2000
_XLIB_THRESHOLD_PP = 3.0


def g2_dsr_p_value(returns: pd.Series, n_trials: int = 1) -> dict:
    """DSR p-value [AFML p.275]. n_trials=1 uses PSR as single-trial fallback."""
    arr = returns.dropna().to_numpy(dtype=float)
    if len(arr) < _MIN_HISTORY:
        return {
            "p_value": 1.0,
            "observed_sharpe": 0.0,
            "n_trials": int(n_trials),
            "pass_gate": False,
            "reason": "insufficient_history",
        }
    if n_trials < 2:
        p_value = 1.0 - float(psr(arr, benchmark=0.0))
    else:
        from ai_swing.backtest.validation.dsr import dsr as _dsr

        p_value = float(_dsr(arr, n_trials=n_trials).p_value)
    sigma = float(arr.std(ddof=0))
    obs_sharpe = float(arr.mean() / sigma * np.sqrt(TRADING_DAYS_PER_YEAR)) if sigma > 1e-12 else 0.0
    return {
        "p_value": p_value,
        "observed_sharpe": obs_sharpe,
        "n_trials": int(n_trials),
        "pass_gate": bool(p_value < 0.05),
    }


def _run_g3(strategy: Strategy) -> dict:
    """Indirection so tests can monkey-patch without going through the real engine."""
    report = compute_walk_forward(strategy, n_windows=8)
    n_pass = report.n_passed
    return {
        "n_windows": int(report.n_windows),
        "n_pass": int(n_pass),
        "pct_above_per_window": [w.pct_above_benchmark for w in report.windows],
        "pass_gate": bool(n_pass >= 5),
    }


def g3_walk_forward(strategy: Strategy) -> dict:
    """>=5/8 walk-forward windows above benchmark more than half the time."""
    return _run_g3(strategy)


def g6_bootstrap_ci(
    returns: pd.Series,
    n_resamples: int = _DEFAULT_BOOTSTRAP_RESAMPLES,
    block: int = _BOOTSTRAP_BLOCK,
    seed: int = 42,
) -> dict:
    """Stationary block bootstrap; 99% CI low of Sortino must be > 0."""
    arr = returns.dropna().to_numpy(dtype=float)
    if len(arr) < _MIN_HISTORY:
        return {
            "ci_low_sortino": 0.0,
            "n_resamples": 0,
            "ci_pct": 99.0,
            "pass_gate": False,
            "reason": "insufficient_history",
        }
    rng = np.random.default_rng(seed)
    n = len(arr)
    n_blocks = max(1, n // block)
    sortinos: list[float] = []
    for _ in range(n_resamples):
        starts = rng.integers(0, n - block + 1, size=n_blocks)
        sample = np.concatenate([arr[s:s + block] for s in starts])[:n]
        sortinos.append(float(sortino_metric(pd.Series(sample))))
    ci_low = float(np.percentile(sortinos, _BOOTSTRAP_PCT_LOW))
    return {
        "ci_low_sortino": ci_low,
        "n_resamples": int(len(sortinos)),
        "ci_pct": 99.0,
        "pass_gate": bool(ci_low > 0),
    }


def _cagr_numpy(arr: np.ndarray) -> float:
    if len(arr) < 2:
        return 0.0
    eq = np.cumprod(1.0 + arr)
    n_years = (len(arr) - 1) / TRADING_DAYS_PER_YEAR
    if n_years <= 0 or eq[0] <= 0:
        return 0.0
    return float((eq[-1] / eq[0]) ** (1.0 / n_years) - 1.0)


def _cagr_pandas(returns: pd.Series) -> float:
    if len(returns) < 2:
        return 0.0
    eq = (1.0 + returns).cumprod()
    n_years = (len(returns) - 1) / TRADING_DAYS_PER_YEAR
    if n_years <= 0 or float(eq.iloc[0]) <= 0:
        return 0.0
    return float((float(eq.iloc[-1]) / float(eq.iloc[0])) ** (1.0 / n_years) - 1.0)


def g7_xlib_cagr_delta(returns: pd.Series) -> dict:
    """|CAGR_numpy - CAGR_pandas| <= 3pp arithmetic self-check [AFML p.31-34]."""
    cleaned = returns.dropna()
    arr = cleaned.to_numpy(dtype=float)
    if len(arr) < _MIN_HISTORY:
        return {
            "delta_pp": float("nan"),
            "cagr_numpy": float("nan"),
            "cagr_pandas": float("nan"),
            "pass_gate": False,
            "reason": "insufficient_history",
        }
    np_cagr = _cagr_numpy(arr)
    pd_cagr = _cagr_pandas(cleaned)
    delta_pp = abs(np_cagr - pd_cagr) * 100.0
    return {
        "delta_pp": float(delta_pp),
        "cagr_numpy": float(np_cagr),
        "cagr_pandas": float(pd_cagr),
        "pass_gate": bool(delta_pp <= _XLIB_THRESHOLD_PP),
    }


def compute_all_gates(
    strategy: Strategy | None,
    range_years: int = 10,
    n_resamples: int = _DEFAULT_BOOTSTRAP_RESAMPLES,
) -> dict:
    """Run G2/G3/G6/G7 and return a flat payload dict."""
    curves = compute_strategy_curves(strategy, range_years=range_years)
    rets = curves.strategy_returns.dropna()
    return {
        "g2_dsr": g2_dsr_p_value(rets, n_trials=1),
        "g3_wf": _run_g3(strategy),
        "g6_bootstrap": g6_bootstrap_ci(rets, n_resamples=n_resamples),
        "g7_xlib": g7_xlib_cagr_delta(rets),
        "asof_date": curves.asof_date.isoformat(),
        "range_years": int(range_years),
    }
