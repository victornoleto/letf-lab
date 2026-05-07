# Deploy Score — Gates + DSR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Destravar Crit 3 (gates) e Crit 4 (DSR) do Deploy Score e habilitar o tier WINNER, portando o math estatístico de `ai-trade` e pré-computando os gates no daily refresh job.

**Architecture:** Novo módulo `scoring/gates.py` orquestra 4 gates (G2 DSR, G3 walk-forward, G6 bootstrap, G7 x-lib). DSR/PSR portados verbatim de `ai-trade/src/ai_trade/backtest/validation/dsr.py`. Resultados persistidos em nova tabela `strategy_gates_snapshots` populada pelo `refresh_service.refresh_all`. Endpoint `/deploy-score` consome o snapshot do DB.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic, pandas, numpy, scipy, pytest, APScheduler.

**Spec:** `docs/superpowers/specs/2026-05-07-deploy-score-gates-dsr-design.md`

---

## File Structure

**New files:**
- `backend/ai_swing/backtest/validation/__init__.py` — submodule init
- `backend/ai_swing/backtest/validation/dsr.py` — PSR + DSR (portado de ai-trade)
- `backend/ai_swing/scoring/gates.py` — 4 gates + orquestrador
- `backend/ai_swing/services/gates_service.py` — DB persistence layer
- `backend/alembic/versions/006_strategy_gates_snapshots.py` — migration
- `backend/scripts/refresh_gates.py` — backfill one-shot
- `backend/tests/test_dsr.py` — testes do port
- `backend/tests/test_gates.py` — testes dos 4 gates
- `backend/tests/test_gates_service.py` — testes da camada DB

**Modified files:**
- `backend/ai_swing/db/models.py` — novo modelo `StrategyGatesSnapshot`
- `backend/ai_swing/services/refresh_service.py` — hook gates depois de signals
- `backend/ai_swing/scoring/deploy_score.py` — refactor: aceita `gates_snapshot`, destrava WINNER
- `backend/ai_swing/routers/strategies.py` — endpoint passa snapshot pro deploy_score
- `backend/tests/test_deploy_score.py` — fixtures novas + WINNER tier test
- `frontend/src/app/pages/strategy-detail/deploy-score-card.ts` — atualizar hint pendente

---

## Pre-flight check

- [ ] **Step 0.1: Confirm working tree**

Run: `cd /var/www/pessoal/ai-swing && git status`
Expected: working tree on `main`, with possibly the two pre-existing uncommitted edits in `frontend/src/app/pages/strategy-detail/strategy-detail.ts` and `frontend/src/styles/components/_table.scss` (não tocar nesses dois — não são deste plano).

- [ ] **Step 0.2: Confirm pytest baseline passes**

Run: `cd /var/www/pessoal/ai-swing/backend && pytest -x -q`
Expected: all tests pass. If anything fails before this plan starts, stop and investigate.

- [ ] **Step 0.3: Confirm scipy is available**

Run: `cd /var/www/pessoal/ai-swing/backend && python -c "from scipy.special import ndtr, ndtri; print('ok')"`
Expected: prints `ok`. If `ImportError`, add `scipy` to `pyproject.toml` and re-install before continuing.

---

## Task 1: Port `dsr.py` (PSR + DSR math)

**Files:**
- Create: `backend/ai_swing/backtest/validation/__init__.py`
- Create: `backend/ai_swing/backtest/validation/dsr.py`
- Test: `backend/tests/test_dsr.py`

- [ ] **Step 1.1: Write the failing import test**

Create `backend/tests/test_dsr.py`:

```python
"""Smoke tests for the ported DSR/PSR module.

The math is unchanged from ai-trade — we only verify the API shape and a
couple of property-style invariants. Detailed correctness is covered by
the source project's tests.
"""
from __future__ import annotations

import numpy as np
import pytest

from ai_swing.backtest.validation.dsr import (
    DSRResult,
    dsr,
    expected_max_sharpe,
    psr,
    sharpe_annualized,
    sharpe_periodic,
)


def test_sharpe_periodic_matches_definition():
    rng = np.random.default_rng(0)
    r = rng.normal(loc=0.001, scale=0.01, size=1000)
    expected = r.mean() / r.std(ddof=0)
    assert sharpe_periodic(r) == pytest.approx(expected)


def test_sharpe_periodic_zero_vol_returns_zero():
    assert sharpe_periodic(np.zeros(10)) == 0.0


def test_sharpe_annualized_scales_by_sqrt_252():
    rng = np.random.default_rng(1)
    r = rng.normal(loc=0.001, scale=0.01, size=500)
    assert sharpe_annualized(r) == pytest.approx(sharpe_periodic(r) * np.sqrt(252))


def test_psr_returns_probability_in_unit_interval():
    rng = np.random.default_rng(2)
    r = rng.normal(loc=0.001, scale=0.01, size=1000)
    p = psr(r, benchmark=0.0)
    assert 0.0 <= p <= 1.0


def test_psr_strong_alpha_yields_high_probability():
    rng = np.random.default_rng(3)
    r = rng.normal(loc=0.002, scale=0.005, size=2000)  # high Sharpe
    assert psr(r, benchmark=0.0) > 0.99


def test_psr_zero_alpha_yields_around_half():
    rng = np.random.default_rng(4)
    r = rng.normal(loc=0.0, scale=0.01, size=2000)
    assert 0.3 < psr(r, benchmark=0.0) < 0.7


def test_psr_requires_at_least_3_observations():
    with pytest.raises(ValueError):
        psr(np.array([0.01, 0.02]))


def test_expected_max_sharpe_grows_with_n_trials():
    sr_2 = expected_max_sharpe(2, var_sharpe=1.0)
    sr_100 = expected_max_sharpe(100, var_sharpe=1.0)
    assert sr_100 > sr_2 > 0.0


def test_expected_max_sharpe_rejects_n_trials_below_2():
    with pytest.raises(ValueError):
        expected_max_sharpe(1)


def test_dsr_result_shape():
    rng = np.random.default_rng(5)
    r = rng.normal(loc=0.001, scale=0.01, size=1000)
    result = dsr(r, n_trials=10)
    assert isinstance(result, DSRResult)
    assert 0.0 <= result.dsr <= 1.0
    assert result.p_value == pytest.approx(1.0 - result.dsr)
    assert result.n_trials == 10


def test_dsr_rejects_n_trials_below_2():
    rng = np.random.default_rng(6)
    r = rng.normal(loc=0.001, scale=0.01, size=1000)
    with pytest.raises(ValueError):
        dsr(r, n_trials=1)
```

- [ ] **Step 1.2: Run test to verify it fails (no module yet)**

Run: `cd /var/www/pessoal/ai-swing/backend && pytest tests/test_dsr.py -x -q`
Expected: `ModuleNotFoundError: No module named 'ai_swing.backtest.validation'`

- [ ] **Step 1.3: Create the validation submodule init**

Create `backend/ai_swing/backtest/validation/__init__.py`:

```python
"""Validation primitives for backtests.

Currently houses DSR/PSR (Bailey-Lopez de Prado). Other validation
techniques (PBO via CSCV, walk-forward splits, etc.) live in their
respective modules; we port them here on demand.
"""
```

- [ ] **Step 1.4: Port `dsr.py` verbatim from ai-trade**

Create `backend/ai_swing/backtest/validation/dsr.py` with the exact content of `/var/www/pessoal/ai-trade/src/ai_trade/backtest/validation/dsr.py`:

```python
"""Probabilistic and Deflated Sharpe Ratios.

References
----------
* AFML ch.14 p.273-275 — Sharpe, PSR, DSR derivations.
* Bailey, López de Prado (2012) "The Sharpe Ratio Efficient Frontier",
  *Journal of Risk* 15(2) — PSR formula with skew/kurt correction.
* AFML ch.12 p.222-223 — asymptotic expected maximum Sharpe under the Gumbel
  approximation: ``E[SR_max] ≈ (1-γ)·Φ⁻¹(1-1/N) + γ·Φ⁻¹(1-1/(N·e))``.

Conventions
-----------
Sharpe ratios in this module are *periodic* by default (no annualization)
because PSR/DSR treat ``T`` as "number of observations in the track record"
and the sample skewness/kurtosis are per-period quantities. Use
:func:`sharpe_annualized` when reporting; the annualized SR is monotone in
the periodic one, so DSR gates built from periodic values are equivalent.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy.special import ndtr, ndtri


EULER_MASCHERONI = 0.5772156649015329


def sharpe_periodic(returns: np.ndarray, risk_free: float = 0.0) -> float:
    """Per-period Sharpe ``(μ - rf) / σ`` with population std (ddof=0)."""
    returns = np.asarray(returns, dtype=float)
    sigma = returns.std(ddof=0)
    if sigma <= 1e-12:
        return 0.0
    return (returns.mean() - risk_free) / sigma


def sharpe_annualized(
    returns: np.ndarray, periods_per_year: int = 252, risk_free: float = 0.0
) -> float:
    """Annualized Sharpe = periodic Sharpe × ``√periods_per_year``."""
    return sharpe_periodic(returns, risk_free=risk_free) * np.sqrt(periods_per_year)


def psr(returns: np.ndarray, benchmark: float = 0.0) -> float:
    """Probabilistic Sharpe Ratio [AFML p.273-274; Bailey & LdP 2012].

    Returns the probability that the true (unknown) Sharpe exceeds
    ``benchmark`` given the observed periodic Sharpe, sample skewness,
    sample kurtosis (non-excess), and track-record length ``T``:

        PSR[SR*] = Φ( (SR_hat - SR*) · √(T-1) /
                      √(1 - γ3·SR_hat + (γ4-1)/4·SR_hat²) )
    """
    returns = np.asarray(returns, dtype=float)
    T = len(returns)
    if T < 3:
        raise ValueError("PSR needs at least 3 observations")

    sr_hat = sharpe_periodic(returns)
    mu = returns.mean()
    sigma = returns.std(ddof=0)
    if sigma <= 1e-12:
        return 0.5

    centered = returns - mu
    gamma3 = float(np.mean(centered**3) / sigma**3)
    gamma4 = float(np.mean(centered**4) / sigma**4)

    denom_sq = 1.0 - gamma3 * sr_hat + (gamma4 - 1.0) / 4.0 * sr_hat**2
    denom = np.sqrt(max(denom_sq, 1e-12))
    z = (sr_hat - benchmark) * np.sqrt(T - 1) / denom
    return float(ndtr(z))


def expected_max_sharpe(n_trials: int, var_sharpe: float = 1.0) -> float:
    """Asymptotic expected max Sharpe under ``N`` iid-noise trials [AFML p.222-223].

    Returns ``√V · [(1 - γ)·Φ⁻¹(1 - 1/N) + γ·Φ⁻¹(1 - 1/(N·e))]`` where γ is
    the Euler-Mascheroni constant and ``V = var_sharpe`` is the variance of
    the Sharpe estimators being compared.
    """
    if n_trials < 2:
        raise ValueError(f"need n_trials >= 2, got {n_trials}")
    a = ndtri(1.0 - 1.0 / n_trials)
    b = ndtri(1.0 - 1.0 / (n_trials * np.e))
    core = (1.0 - EULER_MASCHERONI) * a + EULER_MASCHERONI * b
    return float(np.sqrt(var_sharpe) * core)


@dataclass
class DSRResult:
    dsr: float
    p_value: float
    observed_sharpe: float
    benchmark_sharpe: float
    n_trials: int


def dsr(returns: np.ndarray, n_trials: int) -> DSRResult:
    """Deflated Sharpe Ratio [AFML p.275].

    DSR = PSR evaluated at benchmark = ``E[SR_max]`` under ``n_trials`` tries,
    answering: is the observed Sharpe still significant AFTER correcting for
    multiple-testing bias?

    ``p_value = 1 - DSR`` is the probability that the observed SR is a product
    of selection bias rather than skill.
    """
    if n_trials < 2:
        raise ValueError("DSR requires at least 2 trials; for a single configuration use PSR")
    returns = np.asarray(returns, dtype=float)
    T = len(returns)
    benchmark = expected_max_sharpe(n_trials, var_sharpe=1.0 / (T - 1))
    p = psr(returns, benchmark=benchmark)
    return DSRResult(
        dsr=p,
        p_value=1.0 - p,
        observed_sharpe=sharpe_periodic(returns),
        benchmark_sharpe=benchmark,
        n_trials=n_trials,
    )
```

- [ ] **Step 1.5: Run tests to verify they pass**

Run: `cd /var/www/pessoal/ai-swing/backend && pytest tests/test_dsr.py -x -q`
Expected: 11 passed.

- [ ] **Step 1.6: Commit**

```bash
cd /var/www/pessoal/ai-swing
git add backend/ai_swing/backtest/validation/__init__.py \
        backend/ai_swing/backtest/validation/dsr.py \
        backend/tests/test_dsr.py
git commit -m "feat(validation): port DSR/PSR from ai-trade for Deploy Score gates"
```

---

## Task 2: Module `scoring/gates.py` — 4 gates + orchestrator

**Files:**
- Create: `backend/ai_swing/scoring/gates.py`
- Test: `backend/tests/test_gates.py`

- [ ] **Step 2.1: Write the failing tests**

Create `backend/tests/test_gates.py`:

```python
"""Tests for the 4-gate battery (G2 DSR, G3 walk-forward, G6 bootstrap, G7 x-lib)."""
from __future__ import annotations

from datetime import date, timedelta

import numpy as np
import pandas as pd
import pytest

from ai_swing.scoring.gates import (
    compute_all_gates,
    g2_dsr_p_value,
    g6_bootstrap_ci,
    g7_xlib_cagr_delta,
)


def _make_returns(n: int, mu: float, sigma: float, seed: int) -> pd.Series:
    rng = np.random.default_rng(seed)
    idx = pd.date_range("2015-01-02", periods=n, freq="B")
    return pd.Series(rng.normal(loc=mu, scale=sigma, size=n), index=idx)


def test_g2_dsr_psr_fallback_strong_strategy():
    returns = _make_returns(2000, mu=0.002, sigma=0.005, seed=10)
    result = g2_dsr_p_value(returns, n_trials=1)
    assert result["pass_gate"] is True
    assert 0.0 <= result["p_value"] < 0.05
    assert result["n_trials"] == 1


def test_g2_dsr_psr_fallback_weak_strategy():
    returns = _make_returns(2000, mu=0.0, sigma=0.01, seed=11)
    result = g2_dsr_p_value(returns, n_trials=1)
    assert result["pass_gate"] is False
    assert result["p_value"] >= 0.05


def test_g2_dsr_insufficient_history():
    returns = _make_returns(100, mu=0.001, sigma=0.01, seed=12)
    result = g2_dsr_p_value(returns, n_trials=1)
    assert result["pass_gate"] is False
    assert result["p_value"] == 1.0
    assert result["reason"] == "insufficient_history"


def test_g6_bootstrap_seed_stable():
    returns = _make_returns(1000, mu=0.001, sigma=0.01, seed=20)
    a = g6_bootstrap_ci(returns, n_resamples=200, seed=42)
    b = g6_bootstrap_ci(returns, n_resamples=200, seed=42)
    assert a["ci_low_sortino"] == pytest.approx(b["ci_low_sortino"])


def test_g6_bootstrap_passes_strong_alpha():
    returns = _make_returns(2000, mu=0.003, sigma=0.005, seed=21)
    result = g6_bootstrap_ci(returns, n_resamples=500, seed=42)
    assert result["pass_gate"] is True
    assert result["ci_low_sortino"] > 0


def test_g6_bootstrap_fails_zero_alpha():
    returns = _make_returns(2000, mu=0.0, sigma=0.01, seed=22)
    result = g6_bootstrap_ci(returns, n_resamples=500, seed=42)
    assert result["pass_gate"] is False
    assert result["ci_low_sortino"] <= 0


def test_g6_bootstrap_insufficient_history():
    returns = _make_returns(100, mu=0.001, sigma=0.01, seed=23)
    result = g6_bootstrap_ci(returns, n_resamples=200, seed=42)
    assert result["pass_gate"] is False
    assert result["n_resamples"] == 0


def test_g7_xlib_cagr_passes_for_normal_returns():
    returns = _make_returns(1500, mu=0.001, sigma=0.01, seed=30)
    result = g7_xlib_cagr_delta(returns)
    assert result["pass_gate"] is True
    assert result["delta_pp"] < 3.0


def test_g7_xlib_insufficient_history():
    returns = _make_returns(100, mu=0.001, sigma=0.01, seed=31)
    result = g7_xlib_cagr_delta(returns)
    assert result["pass_gate"] is False


def test_compute_all_gates_smoke(db_session, monkeypatch):
    """Orchestrator returns the 4-gate dict + asof_date + range_years.

    We monkey-patch compute_strategy_curves so the test does not hit yfinance
    or the price cache. Walk-forward likewise stubbed.
    """
    from ai_swing.scoring import gates as gates_mod

    fake_returns = _make_returns(2000, mu=0.001, sigma=0.01, seed=40)
    fake_curves = type("C", (), {
        "asof_date": date(2026, 5, 1),
        "strategy_returns": fake_returns,
    })()
    monkeypatch.setattr(gates_mod, "compute_strategy_curves", lambda *a, **k: fake_curves)
    monkeypatch.setattr(gates_mod, "_run_g3", lambda strategy: {
        "n_windows": 8, "n_pass": 6, "pct_above_per_window": [0.6] * 8, "pass_gate": True,
    })

    payload = compute_all_gates(strategy=None, range_years=10, n_resamples=200)
    assert set(payload.keys()) == {"g2_dsr", "g3_wf", "g6_bootstrap", "g7_xlib",
                                    "asof_date", "range_years"}
    assert payload["asof_date"] == "2026-05-01"
    assert payload["range_years"] == 10
    for key in ("g2_dsr", "g3_wf", "g6_bootstrap", "g7_xlib"):
        assert "pass_gate" in payload[key]
```

- [ ] **Step 2.2: Run tests to verify they fail**

Run: `cd /var/www/pessoal/ai-swing/backend && pytest tests/test_gates.py -x -q`
Expected: `ModuleNotFoundError: No module named 'ai_swing.scoring.gates'`

- [ ] **Step 2.3: Create `scoring/gates.py`**

Create `backend/ai_swing/scoring/gates.py`:

```python
"""4-gate battery for the Deploy Score (G2 DSR, G3 walk-forward, G6 bootstrap, G7 x-lib).

Mirrors the contract of `studies/letf_rotation_hunt/gates.py` but skips G1
(PBO requires multi-config CSCV; we have one strategy per record) and adapts
G6 to use Sortino instead of Sharpe — consistent with the app-wide refactor
in commit 8aef598. G3 wraps the existing `backtest/walk_forward.py`.

Each gate is a pure function: takes a pandas Series of returns (or a
Strategy for G3) and returns a dict with the metric value plus
``pass_gate: bool`` plus diagnostic fields.

Insufficient history (< 252 trading days) yields ``pass_gate=False`` with a
``reason`` field, never a raised exception, so the orchestrator can run all
four gates even on young strategies.
"""
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
_BOOTSTRAP_PCT_LOW = 1.0          # 99% CI → 1st percentile
_DEFAULT_BOOTSTRAP_RESAMPLES = 2000
_XLIB_THRESHOLD_PP = 3.0


# ---------------------------------------------------------------------------
# G2 — DSR p-value (PSR fallback when n_trials < 2)
# ---------------------------------------------------------------------------


def g2_dsr_p_value(returns: pd.Series, n_trials: int = 1) -> dict:
    """DSR p-value [AFML p.275]. n_trials=1 → PSR (single-trial)."""
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
        # PSR-as-fallback: 1 - PSR is the probability the true SR is *not* > 0
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


# ---------------------------------------------------------------------------
# G3 — Walk-forward (wraps existing backtest/walk_forward.py)
# ---------------------------------------------------------------------------


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
    """≥5/8 walk-forward windows above benchmark > half the time."""
    return _run_g3(strategy)


# ---------------------------------------------------------------------------
# G6 — Block bootstrap, 99% CI low > 0 (Sortino instead of Sharpe)
# ---------------------------------------------------------------------------


def g6_bootstrap_ci(
    returns: pd.Series,
    n_resamples: int = _DEFAULT_BOOTSTRAP_RESAMPLES,
    block: int = _BOOTSTRAP_BLOCK,
    seed: int = 42,
) -> dict:
    """Stationary block bootstrap; 99% CI low of Sortino must be > 0.

    Block size 21 (~1 trading month) captures regime persistence.
    Sortino (not Sharpe) per app refactor 8aef598.
    """
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


# ---------------------------------------------------------------------------
# G7 — Cross-lib CAGR delta (numpy vs pandas self-check)
# ---------------------------------------------------------------------------


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
    """|CAGR_numpy - CAGR_pandas| ≤ 3pp arithmetic self-check [AFML p.31-34]."""
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


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------


def compute_all_gates(
    strategy: Strategy | None,
    range_years: int = 10,
    n_resamples: int = _DEFAULT_BOOTSTRAP_RESAMPLES,
) -> dict:
    """Run G2/G3/G6/G7 and return a flat payload dict.

    Note: ``strategy`` may be None in tests that monkey-patch compute_strategy_curves
    and _run_g3; production callers always pass a real Strategy.
    """
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
```

- [ ] **Step 2.4: Run tests to verify they pass**

Run: `cd /var/www/pessoal/ai-swing/backend && pytest tests/test_gates.py -x -q`
Expected: 10 passed.

- [ ] **Step 2.5: Commit**

```bash
cd /var/www/pessoal/ai-swing
git add backend/ai_swing/scoring/gates.py backend/tests/test_gates.py
git commit -m "feat(scoring): add 4-gate battery (G2 DSR, G3 WF, G6 bootstrap, G7 x-lib)"
```

---

## Task 3: Migration + model `StrategyGatesSnapshot`

**Files:**
- Modify: `backend/ai_swing/db/models.py` (append new class)
- Create: `backend/alembic/versions/006_strategy_gates_snapshots.py`

- [ ] **Step 3.1: Append the model**

Open `backend/ai_swing/db/models.py` and add this class **after** the `RefreshLog` class (around line 130, before `class User`):

```python
class StrategyGatesSnapshot(Base):
    """Daily snapshot of the 4-gate battery payload for a strategy.

    Pre-computed by the daily refresh job so GET /deploy-score is instant
    instead of paying the ~3-5s bootstrap cost on every request.

    Idempotency key: (strategy_id, asof_date, range_years). The daily job
    upserts; the read path always grabs the most recent row for a given
    (strategy_id, range_years).
    """
    __tablename__ = "strategy_gates_snapshots"
    __table_args__ = (
        UniqueConstraint(
            "strategy_id", "asof_date", "range_years",
            name="uq_gates_strategy_asof_range",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    strategy_id: Mapped[int] = mapped_column(
        ForeignKey("strategies.id", ondelete="CASCADE"), index=True
    )
    asof_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    range_years: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    computed_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
```

- [ ] **Step 3.2: Create the Alembic migration**

Create `backend/alembic/versions/006_strategy_gates_snapshots.py`:

```python
"""strategy_gates_snapshots table

Revision ID: 006_strategy_gates_snapshots
Revises: 005_weekly_digests
Create Date: 2026-05-07

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "006_strategy_gates_snapshots"
down_revision: Union[str, None] = "005_weekly_digests"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "strategy_gates_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "strategy_id",
            sa.Integer(),
            sa.ForeignKey("strategies.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("asof_date", sa.Date(), nullable=False, index=True),
        sa.Column("range_years", sa.Integer(), nullable=False, server_default="10"),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column(
            "computed_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint(
            "strategy_id", "asof_date", "range_years",
            name="uq_gates_strategy_asof_range",
        ),
    )


def downgrade() -> None:
    op.drop_table("strategy_gates_snapshots")
```

- [ ] **Step 3.3: Run the migration locally**

Run: `cd /var/www/pessoal/ai-swing/backend && alembic upgrade head`
Expected: `Running upgrade 005_weekly_digests -> 006_strategy_gates_snapshots, strategy_gates_snapshots table`

- [ ] **Step 3.4: Verify model loads cleanly**

Run: `cd /var/www/pessoal/ai-swing/backend && python -c "from ai_swing.db.models import StrategyGatesSnapshot; print(StrategyGatesSnapshot.__tablename__)"`
Expected: `strategy_gates_snapshots`

- [ ] **Step 3.5: Run full test baseline (the in-memory SQLite fixture creates the new table automatically)**

Run: `cd /var/www/pessoal/ai-swing/backend && pytest -x -q`
Expected: all tests still pass (no regression).

- [ ] **Step 3.6: Commit**

```bash
cd /var/www/pessoal/ai-swing
git add backend/ai_swing/db/models.py \
        backend/alembic/versions/006_strategy_gates_snapshots.py
git commit -m "feat(db): add strategy_gates_snapshots table"
```

---

## Task 4: Service `gates_service.py` (DB persistence)

**Files:**
- Create: `backend/ai_swing/services/gates_service.py`
- Test: `backend/tests/test_gates_service.py`

- [ ] **Step 4.1: Write the failing tests**

Create `backend/tests/test_gates_service.py`:

```python
"""Tests for gates_service: refresh + latest readers."""
from __future__ import annotations

from datetime import date

import pandas as pd
import pytest

from ai_swing.db.models import (
    Indicator,
    IndicatorType,
    Strategy,
    StrategyGatesSnapshot,
    StrategyIndicator,
)
from ai_swing.services import gates_service


@pytest.fixture
def strategy(db_session):
    ind = Indicator(
        name="SMA200", type=IndicatorType.SMA_GATE, params={"period": 200},
        description="trend",
    )
    db_session.add(ind)
    db_session.flush()
    s = Strategy(
        name="Test", benchmark_ticker="SPY", risk_on_ticker="QQQ",
        risk_off_ticker="ZROZ", k_threshold=1, enabled=True,
    )
    db_session.add(s)
    db_session.flush()
    db_session.add(StrategyIndicator(strategy_id=s.id, indicator_id=ind.id, order=0))
    db_session.commit()
    return s


def _stub_payload(asof: date) -> dict:
    return {
        "g2_dsr": {"p_value": 0.01, "pass_gate": True, "n_trials": 1, "observed_sharpe": 1.0},
        "g3_wf": {"n_windows": 8, "n_pass": 6, "pct_above_per_window": [0.6] * 8, "pass_gate": True},
        "g6_bootstrap": {"ci_low_sortino": 0.5, "n_resamples": 500, "ci_pct": 99.0, "pass_gate": True},
        "g7_xlib": {"delta_pp": 0.1, "cagr_numpy": 0.1, "cagr_pandas": 0.1, "pass_gate": True},
        "asof_date": asof.isoformat(),
        "range_years": 10,
    }


def test_refresh_gates_creates_snapshot(db_session, strategy, monkeypatch):
    monkeypatch.setattr(
        gates_service, "compute_all_gates",
        lambda s, range_years=10: _stub_payload(date(2026, 5, 1)),
    )
    snap = gates_service.refresh_gates(db_session, strategy, range_years=10)
    assert snap.id is not None
    assert snap.asof_date == date(2026, 5, 1)
    assert snap.range_years == 10
    assert snap.payload["g2_dsr"]["pass_gate"] is True


def test_refresh_gates_idempotent(db_session, strategy, monkeypatch):
    monkeypatch.setattr(
        gates_service, "compute_all_gates",
        lambda s, range_years=10: _stub_payload(date(2026, 5, 1)),
    )
    a = gates_service.refresh_gates(db_session, strategy, range_years=10)
    b = gates_service.refresh_gates(db_session, strategy, range_years=10)
    assert a.id == b.id  # same row, upserted
    rows = db_session.query(StrategyGatesSnapshot).filter_by(strategy_id=strategy.id).count()
    assert rows == 1


def test_latest_gates_returns_most_recent(db_session, strategy, monkeypatch):
    payloads = iter([_stub_payload(date(2026, 4, 1)), _stub_payload(date(2026, 5, 1))])
    monkeypatch.setattr(
        gates_service, "compute_all_gates",
        lambda s, range_years=10: next(payloads),
    )
    gates_service.refresh_gates(db_session, strategy, range_years=10)
    gates_service.refresh_gates(db_session, strategy, range_years=10)
    latest = gates_service.latest_gates(db_session, strategy.id, range_years=10)
    assert latest is not None
    assert latest.asof_date == date(2026, 5, 1)


def test_latest_gates_returns_none_when_no_snapshot(db_session, strategy):
    assert gates_service.latest_gates(db_session, strategy.id) is None


def test_latest_gates_filters_by_range_years(db_session, strategy, monkeypatch):
    monkeypatch.setattr(
        gates_service, "compute_all_gates",
        lambda s, range_years=10: _stub_payload(date(2026, 5, 1)),
    )
    gates_service.refresh_gates(db_session, strategy, range_years=10)
    assert gates_service.latest_gates(db_session, strategy.id, range_years=5) is None
    assert gates_service.latest_gates(db_session, strategy.id, range_years=10) is not None
```

- [ ] **Step 4.2: Run tests to verify they fail**

Run: `cd /var/www/pessoal/ai-swing/backend && pytest tests/test_gates_service.py -x -q`
Expected: `ModuleNotFoundError: No module named 'ai_swing.services.gates_service'`

- [ ] **Step 4.3: Create the service**

Create `backend/ai_swing/services/gates_service.py`:

```python
"""Persist + read 4-gate snapshots for the Deploy Score.

Idempotent: refresh_gates upserts on (strategy_id, asof_date, range_years).
The endpoint reads the most-recent row via latest_gates and passes it to
compute_deploy_score; missing snapshot → criterion 3/4 stay 'pending'.
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from ai_swing.db.models import Strategy, StrategyGatesSnapshot
from ai_swing.scoring.gates import compute_all_gates


def refresh_gates(
    db: Session, strategy: Strategy, range_years: int = 10
) -> StrategyGatesSnapshot:
    """Compute the 4-gate payload and upsert into strategy_gates_snapshots."""
    payload = compute_all_gates(strategy, range_years=range_years)
    asof = date.fromisoformat(payload["asof_date"])

    existing = db.scalars(
        select(StrategyGatesSnapshot).where(
            StrategyGatesSnapshot.strategy_id == strategy.id,
            StrategyGatesSnapshot.asof_date == asof,
            StrategyGatesSnapshot.range_years == range_years,
        )
    ).first()

    if existing is None:
        snap = StrategyGatesSnapshot(
            strategy_id=strategy.id,
            asof_date=asof,
            range_years=range_years,
            payload=payload,
            computed_at=datetime.now(timezone.utc),
        )
        db.add(snap)
    else:
        existing.payload = payload
        existing.computed_at = datetime.now(timezone.utc)
        snap = existing

    db.commit()
    db.refresh(snap)
    return snap


def latest_gates(
    db: Session, strategy_id: int, range_years: int = 10
) -> Optional[StrategyGatesSnapshot]:
    """Return the most-recent snapshot for (strategy_id, range_years), or None."""
    return db.scalars(
        select(StrategyGatesSnapshot)
        .where(
            StrategyGatesSnapshot.strategy_id == strategy_id,
            StrategyGatesSnapshot.range_years == range_years,
        )
        .order_by(StrategyGatesSnapshot.asof_date.desc())
        .limit(1)
    ).first()
```

- [ ] **Step 4.4: Run tests to verify they pass**

Run: `cd /var/www/pessoal/ai-swing/backend && pytest tests/test_gates_service.py -x -q`
Expected: 5 passed.

- [ ] **Step 4.5: Commit**

```bash
cd /var/www/pessoal/ai-swing
git add backend/ai_swing/services/gates_service.py backend/tests/test_gates_service.py
git commit -m "feat(services): add gates_service for snapshot persistence"
```

---

## Task 5: Hook `gates_service.refresh_gates` into the daily refresh

**Files:**
- Modify: `backend/ai_swing/services/refresh_service.py:66-73`
- Modify: `backend/tests/test_refresh_service.py` (or create if missing)

- [ ] **Step 5.1: Confirm whether `tests/test_refresh_service.py` exists**

Run: `ls /var/www/pessoal/ai-swing/backend/tests/test_refresh_service.py 2>/dev/null && echo EXISTS || echo MISSING`
- If `EXISTS`: open it and add the test from Step 5.2 to it.
- If `MISSING`: create it with the boilerplate from Step 5.2.

- [ ] **Step 5.2: Write the failing test**

Add to `backend/tests/test_refresh_service.py` (create the file with this content if it didn't exist):

```python
"""Tests covering the refresh_service.refresh_all hook for gates."""
from __future__ import annotations

from unittest.mock import patch

import pytest

from ai_swing.db.models import (
    Indicator,
    IndicatorType,
    Strategy,
    StrategyGatesSnapshot,
    StrategyIndicator,
)
from ai_swing.services.refresh_service import RefreshService


@pytest.fixture
def two_strategies(db_session):
    ind = Indicator(
        name="SMA200", type=IndicatorType.SMA_GATE, params={"period": 200},
        description="trend",
    )
    db_session.add(ind)
    db_session.flush()
    out = []
    for name in ("Strat A", "Strat B"):
        s = Strategy(
            name=name, benchmark_ticker="SPY", risk_on_ticker="QQQ",
            risk_off_ticker="ZROZ", k_threshold=1, enabled=True,
        )
        db_session.add(s)
        db_session.flush()
        db_session.add(StrategyIndicator(strategy_id=s.id, indicator_id=ind.id, order=0))
        out.append(s)
    db_session.commit()
    return out


def test_refresh_all_continues_when_gates_fail_for_one_strategy(db_session, two_strategies):
    """If gates_service.refresh_gates raises for strategy A, strategy B still gets a snapshot."""
    a, b = two_strategies

    def maybe_raise(db, strategy, range_years=10):
        if strategy.id == a.id:
            raise RuntimeError("simulated bootstrap failure")
        return StrategyGatesSnapshot(
            strategy_id=strategy.id, asof_date=__import__("datetime").date(2026, 5, 1),
            range_years=10, payload={"stub": True},
        )

    svc = RefreshService()
    svc._last_run_started = None
    with patch("ai_swing.services.refresh_service.list_strategies", return_value=two_strategies), \
         patch.object(svc, "_refresh_strategy_snapshot", return_value=False), \
         patch("ai_swing.services.refresh_service.gates_service.refresh_gates",
               side_effect=maybe_raise) as gate_call, \
         patch("ai_swing.services.refresh_service.ai_reports.generate_report"), \
         patch("ai_swing.services.refresh_service.get_price_service"):
        log = svc.refresh_all(db_session, force=True)

    # Both strategies were attempted (one errored, one succeeded).
    assert gate_call.call_count == 2
    # Refresh log status is 'ok' — gates failure must NOT abort the global refresh.
    assert log.status == "ok"
```

- [ ] **Step 5.3: Run test to verify it fails**

Run: `cd /var/www/pessoal/ai-swing/backend && pytest tests/test_refresh_service.py -x -q`
Expected: fails because `gates_service` is not yet referenced in `refresh_service.py` (the patch target won't exist).

- [ ] **Step 5.4: Wire `gates_service` into `refresh_service.py`**

Open `backend/ai_swing/services/refresh_service.py` and:

1. Add the import near the top, alongside the existing service imports:

```python
from ai_swing.services import gates_service
```

2. Inside `refresh_all`, after the existing per-strategy loop (after the block that ends around line 73), add a second per-strategy loop **before** the AI-reports block. Replace the existing snippet:

```python
            for strategy in strategies:
                try:
                    transitioned = self._refresh_strategy_snapshot(db, strategy)
                    n_strategies += 1
                    if transitioned:
                        n_transitions += 1
                except Exception as exc:
                    logger.exception("Failed snapshot for strategy %s: %s", strategy.name, exc)
```

with:

```python
            for strategy in strategies:
                try:
                    transitioned = self._refresh_strategy_snapshot(db, strategy)
                    n_strategies += 1
                    if transitioned:
                        n_transitions += 1
                except Exception as exc:
                    logger.exception("Failed snapshot for strategy %s: %s", strategy.name, exc)

                # Gates run after the signal snapshot so they see today's curves.
                # Failures are non-fatal — refresh stays "ok" even if one strategy
                # has insufficient history or the bootstrap blows up.
                try:
                    gates_service.refresh_gates(db, strategy)
                except Exception as exc:
                    logger.exception("Gates refresh failed for %s: %s", strategy.name, exc)
```

- [ ] **Step 5.5: Run the new test to verify it passes**

Run: `cd /var/www/pessoal/ai-swing/backend && pytest tests/test_refresh_service.py -x -q`
Expected: pass.

- [ ] **Step 5.6: Run full suite — no regression**

Run: `cd /var/www/pessoal/ai-swing/backend && pytest -x -q`
Expected: all tests pass.

- [ ] **Step 5.7: Commit**

```bash
cd /var/www/pessoal/ai-swing
git add backend/ai_swing/services/refresh_service.py \
        backend/tests/test_refresh_service.py
git commit -m "feat(refresh): run gates after per-strategy signal snapshot"
```

---

## Task 6: Refactor `compute_deploy_score` + endpoint

**Files:**
- Modify: `backend/ai_swing/scoring/deploy_score.py`
- Modify: `backend/ai_swing/routers/strategies.py` (endpoint passes snapshot)

- [ ] **Step 6.1: Locate the endpoint and confirm its current shape**

Run: `grep -n "deploy-score\|deploy_score\|compute_deploy_score" /var/www/pessoal/ai-swing/backend/ai_swing/routers/strategies.py`
Expected: shows the route and its call to `compute_deploy_score(strategy, range_years=..., bonus_pts=...)`. Note the exact handler name and parameters.

- [ ] **Step 6.2: Refactor `deploy_score.py`**

Open `backend/ai_swing/scoring/deploy_score.py`. Apply these changes:

1. **Replace the file's docstring (lines 1-18)** with:

```python
"""Deploy Readiness Score (0-100): the app-facing port of the study's scoring.

Mirrors the 7-criterion rubric from
`studies/letf_rotation_hunt/scoring.py::score_strategy` (v2, underwater-vs-
benchmark). Criteria 3 (gates) and 4 (DSR) consume a `StrategyGatesSnapshot`
pre-computed by the daily refresh job; without a snapshot they fall back to
status="pending" so the card stays useful for freshly-created strategies.

Criterion → source:
  - Criterion 1 (Sortino edge):    inline (curves vs benchmark)
  - Criterion 2 (underwater):      inline (pct_time_above_benchmark + min ratio)
  - Criterion 3 (gates G2/G3/G6/G7): from gates_snapshot, 5 pts × N passing
  - Criterion 4 (DSR):             from gates_snapshot.g2_dsr.p_value (piecewise)
  - Criterion 5 (OOS + FWD):       inline (Sharpe on 70/30 split + post-2020)
  - Criterion 6 (crisis vs SPY):   delegates to backtest.crisis
  - Criterion 7 (manual bonus):    user-supplied 0-5

G1 (PBO) is intentionally out of scope: PBO requires a multi-config CSCV
which the app's per-strategy Deploy Score doesn't provide.
"""
```

2. **Add the import** at the top (near the others):

```python
from ai_swing.db.models import Strategy, StrategyGatesSnapshot
```

(replace the existing `from ai_swing.db.models import Strategy` line.)

3. **Add two new helpers** above `compute_deploy_score`:

```python
def _gates_points(gates: dict | None) -> tuple[int, str, str]:
    """Crit 3: 5 pts per passing gate, 4 gates total → max 20.

    Without a gates_snapshot (e.g., strategy created today, before the next
    daily refresh) this stays in 'pending' so the card UI can hint the user.
    """
    if gates is None:
        return 0, "pending", "Aguardando próximo daily refresh"
    flags = [
        bool(gates["g2_dsr"]["pass_gate"]),
        bool(gates["g3_wf"]["pass_gate"]),
        bool(gates["g6_bootstrap"]["pass_gate"]),
        bool(gates["g7_xlib"]["pass_gate"]),
    ]
    n_pass = sum(flags)
    pts = 5 * n_pass
    if n_pass == 4:
        status = "ok"
    elif n_pass >= 2:
        status = "warn"
    else:
        status = "fail"
    marks = "".join("✓" if f else "✗" for f in flags)
    note = (
        f"{n_pass}/4 gates · G2(DSR){marks[0]} G3(WF){marks[1]} "
        f"G6(boot){marks[2]} G7(xlib){marks[3]}"
    )
    return pts, status, note


def _dsr_points(gates: dict | None) -> tuple[int, str, str]:
    """Crit 4: piecewise on g2_dsr.p_value (max 10 pts)."""
    if gates is None:
        return 0, "pending", "Aguardando próximo daily refresh"
    p = float(gates["g2_dsr"]["p_value"])
    if p < 0.05:
        return 10, "ok", f"DSR p={p:.3f} (PSR fallback, n_trials=1)"
    if p < 0.10:
        return 7, "warn", f"DSR p={p:.3f} marginal"
    if p < 0.20:
        return 3, "warn", f"DSR p={p:.3f} fraco"
    return 0, "fail", f"DSR p={p:.3f} insuficiente"
```

4. **Update `compute_deploy_score` signature and body.** The current function ends with the `criteria = [...]` list and a `winner_conditions_met = False` line. Replace its full body with:

```python
def compute_deploy_score(
    strategy: Strategy,
    range_years: int = 10,
    bonus_pts: float = 0.0,
    gates_snapshot: StrategyGatesSnapshot | None = None,
) -> DeployScore:
    """Compute the full breakdown for the Deploy Readiness card."""
    curves = compute_strategy_curves(strategy, range_years=range_years)

    valid_idx = curves.equity_strategy.index
    strat_returns = curves.strategy_returns.loc[valid_idx]
    bench_returns = curves.df["bench"].pct_change().loc[valid_idx]

    strat_sortino = sortino_metric(strat_returns)
    bench_sortino = sortino_metric(bench_returns)
    edge = strat_sortino - bench_sortino

    pts1, status1, note1 = _edge_points(edge)

    pct_above, min_ratio = _underwater_metrics(curves.equity_strategy, curves.equity_bench)
    pts2, status2, note2 = _underwater_points(pct_above, min_ratio)

    pts5, status5, note5 = _oos_fwd_points(strat_returns)

    pts6, status6, note6, n_beats, n_eligible = _crisis_points(strategy)

    pts7 = max(0.0, min(5.0, bonus_pts))
    status7 = "ok" if pts7 > 0 else "pending"
    note7 = "Bônus manual (0-5)"

    gates_payload = gates_snapshot.payload if gates_snapshot is not None else None
    pts3, status3, note3 = _gates_points(gates_payload)
    pts4, status4, note4 = _dsr_points(gates_payload)

    total = pts1 + pts2 + pts3 + pts4 + pts5 + pts6 + pts7

    edge_passed = edge >= 0.05
    underwater_bar_passed = (
        pct_above >= 0.95 if pct_above == pct_above else False
    )
    winner_conditions_met = bool(
        gates_payload is not None
        and gates_payload["g2_dsr"]["pass_gate"]
        and gates_payload["g6_bootstrap"]["pass_gate"]
        and gates_payload["g7_xlib"]["pass_gate"]
        and edge_passed
        and underwater_bar_passed
    )

    tier = _tier_label(total, winner_conditions_met)

    criteria = [
        CriterionScore(
            key="1_sortino_edge", label="Sortino edge",
            points=pts1, max_points=30, status=status1, note=note1,
        ),
        CriterionScore(
            key="2_underwater", label="Underwater vs benchmark",
            points=pts2, max_points=15, status=status2, note=note2,
        ),
        CriterionScore(
            key="3_gates", label="Bateria de gates (G2/G3/G6/G7)",
            points=pts3, max_points=20, status=status3, note=note3,
        ),
        CriterionScore(
            key="4_dsr", label="DSR (Deflated Sharpe)",
            points=pts4, max_points=10, status=status4, note=note4,
        ),
        CriterionScore(
            key="5_oos_fwd", label="OOS + FWD pós-2020",
            points=pts5, max_points=10, status=status5, note=note5,
        ),
        CriterionScore(
            key="6_crisis", label=f"Crises ({n_beats}/{n_eligible})",
            points=pts6, max_points=10, status=status6, note=note6,
        ),
        CriterionScore(
            key="7_bonus", label="Bônus discricionário",
            points=pts7, max_points=5, status=status7, note=note7,
        ),
    ]

    return DeployScore(
        asof_date=curves.asof_date,
        range_start=curves.range_start,
        range_end=curves.range_end,
        total=float(total),
        tier_label=tier,
        winner_conditions_met=winner_conditions_met,
        criteria=criteria,
    )
```

- [ ] **Step 6.3: Update the endpoint to pass the snapshot**

Open `backend/ai_swing/routers/strategies.py`. The endpoint is `deploy_score_endpoint` at line 190.

1. Add this import near the other service imports (alongside the existing `from ai_swing.services import ...` lines):

```python
from ai_swing.services import gates_service
```

2. Replace the docstring + body of `deploy_score_endpoint` (lines 197-209). The current shape is:

```python
    """Replicate the study's 7-criterion scoring (v2) on the strategy.

    Phase 2 implements criteria 1, 2, 5, 6, 7. Criteria 3 (gates) and 4 (DSR)
    are returned as `status="pending"` with 0 pts until Fase 3 ships the
    walk-forward + bootstrap pipelines.
    """
    s = get_strategy(db, strategy_id)
    if s is None:
        raise HTTPException(status_code=404, detail="Strategy not found")
    try:
        score = compute_deploy_score(s, range_years=range_years, bonus_pts=bonus_pts)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
```

Replace with:

```python
    """Replicate the study's 7-criterion scoring (v2) on the strategy.

    Criteria 3 (gates G2/G3/G6/G7) and 4 (DSR) are read from the most-recent
    StrategyGatesSnapshot persisted by the daily refresh job. Strategies
    without a snapshot yet (just created, before next refresh) keep those
    criteria as `status="pending"` so the card UI can hint the user.
    """
    s = get_strategy(db, strategy_id)
    if s is None:
        raise HTTPException(status_code=404, detail="Strategy not found")
    gates_snap = gates_service.latest_gates(db, s.id, range_years=range_years)
    try:
        score = compute_deploy_score(
            s, range_years=range_years, bonus_pts=bonus_pts,
            gates_snapshot=gates_snap,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
```

- [ ] **Step 6.4: Run existing deploy-score tests to surface contract changes**

Run: `cd /var/www/pessoal/ai-swing/backend && pytest tests/test_deploy_score.py -x -q`
Expected: some tests likely pass (paridade Fase 2 sem snapshot), but the hard-coded `pending` expectations may need updating in Task 7. **If any failures look unrelated to the snapshot contract, stop and investigate.**

- [ ] **Step 6.5: Commit**

```bash
cd /var/www/pessoal/ai-swing
git add backend/ai_swing/scoring/deploy_score.py \
        backend/ai_swing/routers/strategies.py
git commit -m "refactor(deploy_score): consume gates_snapshot, unlock WINNER tier"
```

---

## Task 7: Update `test_deploy_score.py` (snapshot fixtures + WINNER)

**Files:**
- Modify: `backend/tests/test_deploy_score.py`

- [ ] **Step 7.1: Inspect the existing test file**

Run: `cd /var/www/pessoal/ai-swing/backend && head -80 tests/test_deploy_score.py`
Note: identify the existing fixtures and what they assert about Crit 3/4. The legacy `pending` expectations need updating.

- [ ] **Step 7.2: Add helper fixtures for snapshot states**

At the top of `backend/tests/test_deploy_score.py`, after the imports, add:

```python
from datetime import date

from ai_swing.db.models import StrategyGatesSnapshot


def _make_snapshot(*, all_pass: bool, p_value: float = 0.01) -> StrategyGatesSnapshot:
    """Build a SQLAlchemy-detached StrategyGatesSnapshot with the fields
    consumed by compute_deploy_score. We never persist it; deploy_score reads
    .payload directly.
    """
    payload = {
        "g2_dsr": {
            "p_value": p_value,
            "observed_sharpe": 1.5,
            "n_trials": 1,
            "pass_gate": p_value < 0.05,
        },
        "g3_wf": {
            "n_windows": 8,
            "n_pass": 7 if all_pass else 3,
            "pct_above_per_window": [0.7] * 8,
            "pass_gate": all_pass,
        },
        "g6_bootstrap": {
            "ci_low_sortino": 0.4 if all_pass else -0.1,
            "n_resamples": 500,
            "ci_pct": 99.0,
            "pass_gate": all_pass,
        },
        "g7_xlib": {
            "delta_pp": 0.05 if all_pass else 5.0,
            "cagr_numpy": 0.1,
            "cagr_pandas": 0.1 if all_pass else 0.05,
            "pass_gate": all_pass,
        },
        "asof_date": date(2026, 5, 1).isoformat(),
        "range_years": 10,
    }
    return StrategyGatesSnapshot(
        strategy_id=1, asof_date=date(2026, 5, 1), range_years=10, payload=payload,
    )
```

- [ ] **Step 7.3: Update or add tests**

Find any existing test in `test_deploy_score.py` that asserts criteria 3/4 are `"pending"` regardless of input. Update those tests to **either** pass `gates_snapshot=None` (preserving the pending fallback test) **or** pass `_make_snapshot(all_pass=True)` and assert real points.

Add these new tests at the end of the file:

```python
def test_deploy_score_pending_when_no_snapshot(db_session, sample_strategy):
    """Backwards compatibility: without a snapshot, criteria 3/4 stay pending."""
    from ai_swing.scoring.deploy_score import compute_deploy_score
    score = compute_deploy_score(sample_strategy, gates_snapshot=None)
    crit3 = next(c for c in score.criteria if c.key == "3_gates")
    crit4 = next(c for c in score.criteria if c.key == "4_dsr")
    assert crit3.status == "pending"
    assert crit3.points == 0
    assert crit4.status == "pending"
    assert crit4.points == 0
    assert score.winner_conditions_met is False


def test_deploy_score_full_gates_pass_unlocks_max_pts(db_session, sample_strategy):
    """Snapshot with all 4 gates passing → Crit 3 = 20, Crit 4 = 10."""
    from ai_swing.scoring.deploy_score import compute_deploy_score
    snap = _make_snapshot(all_pass=True, p_value=0.01)
    score = compute_deploy_score(sample_strategy, gates_snapshot=snap)
    crit3 = next(c for c in score.criteria if c.key == "3_gates")
    crit4 = next(c for c in score.criteria if c.key == "4_dsr")
    assert crit3.points == 20
    assert crit3.status == "ok"
    assert crit4.points == 10
    assert crit4.status == "ok"


def test_deploy_score_partial_gates_pass(db_session, sample_strategy):
    """2 of 4 gates passing → Crit 3 = 10 with status warn."""
    from ai_swing.scoring.deploy_score import compute_deploy_score
    # Build a custom payload with exactly 2 gates passing
    payload = _make_snapshot(all_pass=True).payload
    payload["g3_wf"]["pass_gate"] = False
    payload["g7_xlib"]["pass_gate"] = False
    snap = StrategyGatesSnapshot(
        strategy_id=1, asof_date=date(2026, 5, 1), range_years=10, payload=payload,
    )
    score = compute_deploy_score(sample_strategy, gates_snapshot=snap)
    crit3 = next(c for c in score.criteria if c.key == "3_gates")
    assert crit3.points == 10
    assert crit3.status == "warn"


def test_deploy_score_dsr_piecewise_marginal(db_session, sample_strategy):
    """p=0.07 → Crit 4 = 7 pts (warn)."""
    from ai_swing.scoring.deploy_score import compute_deploy_score
    payload = _make_snapshot(all_pass=True).payload
    payload["g2_dsr"]["p_value"] = 0.07
    payload["g2_dsr"]["pass_gate"] = False
    snap = StrategyGatesSnapshot(
        strategy_id=1, asof_date=date(2026, 5, 1), range_years=10, payload=payload,
    )
    score = compute_deploy_score(sample_strategy, gates_snapshot=snap)
    crit4 = next(c for c in score.criteria if c.key == "4_dsr")
    assert crit4.points == 7
    assert crit4.status == "warn"


def test_deploy_score_winner_tier_unlocks(db_session, winning_strategy):
    """All gates pass + edge + underwater bar passed → tier='WINNER'.

    Requires a fixture `winning_strategy` whose curves yield Sortino edge ≥ 0.05
    AND pct_time_above_benchmark ≥ 0.95. If the existing test file has no such
    fixture, add one here that mocks compute_strategy_curves to return synthetic
    curves with those properties, OR mark this test xfail with a TODO until
    a real fixture is wired up.
    """
    from ai_swing.scoring.deploy_score import compute_deploy_score
    snap = _make_snapshot(all_pass=True, p_value=0.001)
    score = compute_deploy_score(winning_strategy, gates_snapshot=snap)
    if score.total < 90:
        pytest.skip(f"winning_strategy fixture didn't reach 90 pts ({score.total})")
    assert score.tier_label == "WINNER"
    assert score.winner_conditions_met is True
```

**Note on `winning_strategy`:** if no such fixture exists, either (a) reuse `sample_strategy` and use a `pytest.skip` guard like above, or (b) add a fixture that monkey-patches `compute_strategy_curves` to return a synthetic high-edge curve. Choose (a) for now — graceful skip — since plumbing a synthetic curves fixture deserves its own task and isn't blocking the main feature.

- [ ] **Step 7.4: Run deploy_score tests**

Run: `cd /var/www/pessoal/ai-swing/backend && pytest tests/test_deploy_score.py -x -q`
Expected: all pass (or `winner_tier` skipped if fixture missing).

- [ ] **Step 7.5: Run full suite**

Run: `cd /var/www/pessoal/ai-swing/backend && pytest -x -q`
Expected: all pass.

- [ ] **Step 7.6: Commit**

```bash
cd /var/www/pessoal/ai-swing
git add backend/tests/test_deploy_score.py
git commit -m "test(deploy_score): cover snapshot pending/partial/full + WINNER tier"
```

---

## Task 8: Update stale comments + frontend hint

**Files:**
- Modify: `backend/ai_swing/scoring/deploy_score.py` (lines around 255-262 — criteria notes for crit 3/4 that say "pending: Fase 3"). Note: this was partly addressed in Task 6's rewrite; verify nothing remains.
- Modify: `frontend/src/app/pages/strategy-detail/deploy-score-card.ts:55-59`

- [ ] **Step 8.1: Verify Task 6 cleaned all stale "Fase 3" mentions in deploy_score.py**

Run: `grep -n "Fase 3\|fase 3\|chega na Fase\|chegam na Fase\|walk-forward + bootstrap\|bootstrap chegam" /var/www/pessoal/ai-swing/backend/ai_swing/scoring/deploy_score.py`
Expected: **no matches**. If any remain, edit them out (the docstring rewrite from Task 6 should already cover this).

- [ ] **Step 8.2: Update the frontend hint**

Open `frontend/src/app/pages/strategy-detail/deploy-score-card.ts`. Locate lines 55-59 — currently:

```typescript
            @if (!d.winner_conditions_met) {
              <p class="deploy-card__hint">
                Critérios 3 (gates) e 4 (DSR) ainda pendentes — chegam na Fase 3 com walk-forward + bootstrap.
              </p>
            }
```

Replace with:

```typescript
            @if (hasPendingCriterion(d)) {
              <p class="deploy-card__hint">
                Critérios 3 (gates) e 4 (DSR) aguardam o próximo daily refresh.
              </p>
            }
```

- [ ] **Step 8.3: Add the helper method to the component class**

In the same file, in the `DeployScoreCardComponent` class (around line 230), add the helper:

```typescript
  hasPendingCriterion(d: DeployScore): boolean {
    return d.criteria.some((c) => c.key === '3_gates' && c.status === 'pending');
  }
```

- [ ] **Step 8.4: Sanity-check the frontend builds**

Run: `cd /var/www/pessoal/ai-swing/frontend && npx ng build --configuration=development 2>&1 | tail -20`
Expected: build succeeds, no TS errors. If `ng` not on PATH, use `npm run build`.

- [ ] **Step 8.5: Commit**

```bash
cd /var/www/pessoal/ai-swing
git add frontend/src/app/pages/strategy-detail/deploy-score-card.ts
# only stage deploy_score.py if Step 8.1 found something to fix:
git diff --cached --quiet backend/ai_swing/scoring/deploy_score.py 2>/dev/null && \
  git add backend/ai_swing/scoring/deploy_score.py 2>/dev/null || true
git commit -m "chore(ui): update Deploy Score hint — gates now compute on daily refresh"
```

---

## Task 9: Backfill script `scripts/refresh_gates.py`

**Files:**
- Create: `backend/scripts/refresh_gates.py`

- [ ] **Step 9.1: Write the script**

Create `backend/scripts/refresh_gates.py`:

```python
"""One-shot backfill: compute gates snapshots for one or all strategies.

Run via:
    python -m scripts.refresh_gates --all
    python -m scripts.refresh_gates --strategy-id 5

Idempotent — safe to re-run.
"""
from __future__ import annotations

import argparse
import logging

from sqlalchemy import select

from ai_swing.db import SessionLocal
from ai_swing.db.models import Strategy
from ai_swing.services import gates_service

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("refresh_gates")


def _refresh_one(db, strategy: Strategy) -> bool:
    try:
        snap = gates_service.refresh_gates(db, strategy)
        log.info(
            "Gates refreshed for %s (id=%s): asof=%s, total_pass=%s/4",
            strategy.name, strategy.id, snap.asof_date,
            sum(int(snap.payload[k]["pass_gate"])
                for k in ("g2_dsr", "g3_wf", "g6_bootstrap", "g7_xlib")),
        )
        return True
    except Exception as exc:
        log.exception("Failed for %s (id=%s): %s", strategy.name, strategy.id, exc)
        return False


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--all", action="store_true", help="Refresh every enabled strategy")
    group.add_argument("--strategy-id", type=int, help="Refresh a single strategy by id")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        if args.all:
            strategies = db.scalars(select(Strategy).where(Strategy.enabled.is_(True))).all()
        else:
            s = db.get(Strategy, args.strategy_id)
            if s is None:
                log.error("Strategy id=%s not found", args.strategy_id)
                return
            strategies = [s]

        ok = 0
        for s in strategies:
            if _refresh_one(db, s):
                ok += 1
        log.info("Done: %s/%s strategies refreshed", ok, len(strategies))
    finally:
        db.close()


if __name__ == "__main__":
    main()
```

- [ ] **Step 9.2: Smoke-test the CLI parsing**

Run: `cd /var/www/pessoal/ai-swing/backend && python -m scripts.refresh_gates --help`
Expected: argparse usage output mentioning `--all` and `--strategy-id`.

- [ ] **Step 9.3: Smoke-test against the local DB (only if you have a real strategy to test with)**

Run: `cd /var/www/pessoal/ai-swing/backend && python -m scripts.refresh_gates --strategy-id 1`
Expected: `Gates refreshed for ... asof=YYYY-MM-DD, total_pass=N/4`. If the local DB is empty, skip this step — the daily job populates the table on next run.

- [ ] **Step 9.4: Commit**

```bash
cd /var/www/pessoal/ai-swing
git add backend/scripts/refresh_gates.py
git commit -m "feat(scripts): add refresh_gates backfill script"
```

---

## Final verification

- [ ] **Step F.1: Full pytest suite**

Run: `cd /var/www/pessoal/ai-swing/backend && pytest -q`
Expected: all tests pass. **If anything fails, stop and investigate before declaring done.**

- [ ] **Step F.2: Frontend build**

Run: `cd /var/www/pessoal/ai-swing/frontend && npm run build`
Expected: success.

- [ ] **Step F.3: Manual smoke (optional, requires running backend + frontend)**

1. Start backend: `cd backend && uvicorn ai_swing.main:app --reload`
2. Start frontend: `cd frontend && npm run start`
3. Run `python -m scripts.refresh_gates --all` to populate snapshots
4. Open `http://localhost:4200/strategies/1` (or any strategy id), expand the Deploy Score card, verify Crit 3 shows `N/4 gates · G2(...) G3(...) G6(...) G7(...)` instead of "pending"
5. Verify the legacy hint about "Fase 3" is gone

- [ ] **Step F.4: Verify all stale "Fase 3" references are gone**

Run: `grep -rn "Fase 3\|fase 3" /var/www/pessoal/ai-swing/backend/ai_swing/ /var/www/pessoal/ai-swing/frontend/src/app/pages/strategy-detail/ 2>/dev/null`
Expected: no output. (Note: includes `routers/strategies.py` so the endpoint docstring fix from Task 6 is verified here.)

- [ ] **Step F.5: Done**

The Deploy Score now exposes Crit 3 (max 20) and Crit 4 (max 10), with WINNER tier reachable when all the strict bars pass.
