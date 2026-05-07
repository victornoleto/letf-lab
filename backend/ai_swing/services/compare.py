"""Compare two strategies side-by-side: equity curves, metrics, crisis, score.

Reuses the same primitives the strategy-detail page already calls (backtest
engine, crisis attribution, deploy score) so the comparison page is just a
thin aggregation layer — no new computational pipeline.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

import pandas as pd

from ai_swing.backtest.crisis import (
    CrisisResult,
    attribution_score,
    compute_crisis_attribution,
)
from ai_swing.backtest.engine import BacktestResult, run_backtest
from ai_swing.db.models import Strategy
from ai_swing.scoring.deploy_score import DeployScore, compute_deploy_score


@dataclass
class StrategyHeader:
    id: int
    name: str
    benchmark_ticker: str
    risk_on_ticker: str
    risk_off_ticker: str
    k_threshold: int
    n_indicators: int


@dataclass
class CompareCrisisRow:
    name: str
    label: str
    a_verdict: str
    a_pct_above_spy: float | None
    b_verdict: str
    b_pct_above_spy: float | None


@dataclass
class CompareReport:
    asof_date: date
    range_years: int
    strategy_a: StrategyHeader
    strategy_b: StrategyHeader
    backtest_a: BacktestResult
    backtest_b: BacktestResult
    deploy_a: DeployScore
    deploy_b: DeployScore
    crisis_rows: list[CompareCrisisRow] = field(default_factory=list)
    n_beats_a: int = 0
    n_beats_b: int = 0
    n_eligible_a: int = 0
    n_eligible_b: int = 0


def _to_header(s: Strategy) -> StrategyHeader:
    return StrategyHeader(
        id=s.id,
        name=s.name,
        benchmark_ticker=s.benchmark_ticker,
        risk_on_ticker=s.risk_on_ticker,
        risk_off_ticker=s.risk_off_ticker,
        k_threshold=s.k_threshold,
        n_indicators=len(s.indicators),
    )


def _crisis_lookup(results: list[CrisisResult]) -> dict[str, CrisisResult]:
    return {r.name: r for r in results}


def compare_strategies(
    a: Strategy, b: Strategy, range_years: int = 10
) -> CompareReport:
    """Run backtest + crisis + deploy score for both strategies."""
    bt_a = run_backtest(a, range_years=range_years)
    bt_b = run_backtest(b, range_years=range_years)
    deploy_a = compute_deploy_score(a, range_years=range_years, bonus_pts=0.0)
    deploy_b = compute_deploy_score(b, range_years=range_years, bonus_pts=0.0)

    crisis_a = compute_crisis_attribution(a)
    crisis_b = compute_crisis_attribution(b)
    n_beats_a, n_eligible_a = attribution_score(crisis_a)
    n_beats_b, n_eligible_b = attribution_score(crisis_b)

    map_a = _crisis_lookup(crisis_a)
    map_b = _crisis_lookup(crisis_b)
    crisis_rows: list[CompareCrisisRow] = []
    for name in map_a.keys():
        ra = map_a[name]
        rb = map_b.get(name)
        if rb is None:
            continue
        crisis_rows.append(CompareCrisisRow(
            name=name,
            label=ra.label,
            a_verdict=ra.verdict,
            a_pct_above_spy=ra.pct_above_spy,
            b_verdict=rb.verdict,
            b_pct_above_spy=rb.pct_above_spy,
        ))

    asof = max(bt_a.asof_date, bt_b.asof_date)

    return CompareReport(
        asof_date=asof,
        range_years=range_years,
        strategy_a=_to_header(a),
        strategy_b=_to_header(b),
        backtest_a=bt_a,
        backtest_b=bt_b,
        deploy_a=deploy_a,
        deploy_b=deploy_b,
        crisis_rows=crisis_rows,
        n_beats_a=n_beats_a,
        n_beats_b=n_beats_b,
        n_eligible_a=n_eligible_a,
        n_eligible_b=n_eligible_b,
    )
