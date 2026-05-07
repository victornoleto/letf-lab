"""Compute current signal snapshot for a strategy."""
from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date

import pandas as pd

from ai_swing.data import PriceService, get_price_service
from ai_swing.db.models import SignalSnapshot, Strategy
from ai_swing.indicators.evaluator import IndicatorResult, evaluate_indicator
from ai_swing.schemas.signal import IndicatorResultDTO, SignalSnapshotDTO

logger = logging.getLogger(__name__)


@dataclass
class SnapshotComputation:
    date: date
    score: int
    total: int
    risk_on: bool
    results: list[IndicatorResult]


def compute_snapshot(
    strategy: Strategy,
    price_service: PriceService | None = None,
) -> SnapshotComputation | None:
    """Compute today's signal snapshot for a strategy. Returns None if data unavailable."""
    ps = price_service or get_price_service()
    prices = ps.get_close_series(strategy.benchmark_ticker)
    if prices.empty:
        logger.warning("No prices for benchmark %s", strategy.benchmark_ticker)
        return None
    returns = prices.pct_change()

    indicators = [si.indicator for si in strategy.indicators]
    if not indicators:
        return None

    results: list[IndicatorResult] = []
    for ind in indicators:
        try:
            r = evaluate_indicator(ind, prices, returns=returns)
            results.append(r)
        except Exception as exc:
            logger.exception("Failed to evaluate indicator %s: %s", ind.name, exc)

    if not results:
        return None

    score = sum(1 for r in results if r.gate_passed)
    total = len(results)
    risk_on = score >= strategy.k_threshold
    snap_date = prices.dropna().index[-1].date() if not prices.dropna().empty else date.today()

    return SnapshotComputation(
        date=snap_date, score=score, total=total, risk_on=risk_on, results=results
    )


def snapshot_to_dto(snap: SnapshotComputation | SignalSnapshot) -> SignalSnapshotDTO:
    """Convert either a freshly computed snapshot or a persisted one to DTO."""
    if isinstance(snap, SnapshotComputation):
        return SignalSnapshotDTO(
            date=snap.date,
            score=snap.score,
            total=snap.total,
            risk_on=snap.risk_on,
            results=[
                IndicatorResultDTO(
                    indicator_id=r.indicator_id,
                    indicator_name=r.indicator_name,
                    indicator_type=r.indicator_type,
                    gate_passed=r.gate_passed,
                    value=r.value,
                    raw_summary=r.raw_summary,
                )
                for r in snap.results
            ],
        )
    return SignalSnapshotDTO(
        date=snap.date,
        score=snap.score,
        total=snap.total,
        risk_on=snap.risk_on,
        results=[IndicatorResultDTO(**r) for r in snap.indicator_results],
    )


def serialize_results_for_storage(results: list[IndicatorResult]) -> list[dict]:
    return [
        {
            "indicator_id": r.indicator_id,
            "indicator_name": r.indicator_name,
            "indicator_type": r.indicator_type.value,
            "gate_passed": r.gate_passed,
            "value": r.value,
            "raw_summary": r.raw_summary,
        }
        for r in results
    ]
