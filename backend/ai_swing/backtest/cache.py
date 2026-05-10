"""Backtest cache: 24h TTL keyed by (strategy_config_hash, asof_date, range_years)."""
from __future__ import annotations

import hashlib
import json
import logging
from dataclasses import asdict
from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from ai_swing.backtest.engine import (
    BacktestResult,
    BacktestTransition,
    BacktestVariant,
    EquityPoint,
)
from ai_swing.backtest.metrics import Metrics
from ai_swing.db.models import BacktestCache, Strategy

logger = logging.getLogger(__name__)


def _config_signature(strategy: Strategy, range_years: int, asof: date) -> dict:
    indicators = sorted(
        [
            {"id": si.indicator.id, "type": si.indicator.type.value, "params": si.indicator.params}
            for si in strategy.indicators
        ],
        key=lambda x: x["id"],
    )
    return {
        "strategy_id": strategy.id,
        "benchmark": strategy.benchmark_ticker,
        "risk_on": strategy.risk_on_tickers,
        "risk_off": strategy.risk_off_ticker,
        "k": strategy.k_threshold,
        "indicators": indicators,
        "range_years": range_years,
        "asof": asof.isoformat(),
    }


def compute_config_hash(strategy: Strategy, range_years: int, asof: date) -> str:
    sig = _config_signature(strategy, range_years, asof)
    payload = json.dumps(sig, sort_keys=True).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()[:32]


def serialize_result(result: BacktestResult) -> dict:
    return {
        "range_start": result.range_start.isoformat(),
        "range_end": result.range_end.isoformat(),
        "range_years": result.range_years,
        "asof_date": result.asof_date.isoformat(),
        "equity_benchmark_buyhold": [
            {"date": p.date.isoformat(), "value": p.value} for p in result.equity_benchmark_buyhold
        ],
        "metrics_benchmark": asdict(result.metrics_benchmark) if result.metrics_benchmark else None,
        "transitions": [
            {"date": t.date.isoformat(), "from_state": t.from_state, "to_state": t.to_state}
            for t in result.transitions
        ],
        "variants": [
            {
                "risk_on_ticker": v.risk_on_ticker,
                "equity_strategy": [
                    {"date": p.date.isoformat(), "value": p.value} for p in v.equity_strategy
                ],
                "equity_strategy_net": [
                    {"date": p.date.isoformat(), "value": p.value} for p in v.equity_strategy_net
                ],
                "equity_riskon_buyhold": [
                    {"date": p.date.isoformat(), "value": p.value} for p in v.equity_riskon_buyhold
                ],
                "equity_ratio_vs_benchmark": [
                    {"date": p.date.isoformat(), "value": p.value} for p in v.equity_ratio_vs_benchmark
                ],
                "metrics_strategy": asdict(v.metrics_strategy) if v.metrics_strategy else None,
                "metrics_riskon": asdict(v.metrics_riskon) if v.metrics_riskon else None,
            }
            for v in result.variants
        ],
    }


def deserialize_result(data: dict) -> BacktestResult:
    parse_date = lambda s: date.fromisoformat(s)
    return BacktestResult(
        range_start=parse_date(data["range_start"]),
        range_end=parse_date(data["range_end"]),
        range_years=data["range_years"],
        asof_date=parse_date(data["asof_date"]),
        equity_benchmark_buyhold=[
            EquityPoint(parse_date(p["date"]), p["value"]) for p in data["equity_benchmark_buyhold"]
        ],
        metrics_benchmark=Metrics(**data["metrics_benchmark"]) if data.get("metrics_benchmark") else None,
        transitions=[
            BacktestTransition(parse_date(t["date"]), t["from_state"], t["to_state"])
            for t in data["transitions"]
        ],
        variants=[
            BacktestVariant(
                risk_on_ticker=v["risk_on_ticker"],
                equity_strategy=[
                    EquityPoint(parse_date(p["date"]), p["value"]) for p in v["equity_strategy"]
                ],
                equity_strategy_net=[
                    EquityPoint(parse_date(p["date"]), p["value"])
                    for p in v.get("equity_strategy_net", [])
                ],
                equity_riskon_buyhold=[
                    EquityPoint(parse_date(p["date"]), p["value"])
                    for p in v["equity_riskon_buyhold"]
                ],
                equity_ratio_vs_benchmark=[
                    EquityPoint(parse_date(p["date"]), p["value"])
                    for p in v.get("equity_ratio_vs_benchmark", [])
                ],
                metrics_strategy=Metrics(**v["metrics_strategy"]) if v.get("metrics_strategy") else None,
                metrics_riskon=Metrics(**v["metrics_riskon"]) if v.get("metrics_riskon") else None,
            )
            for v in data.get("variants", [])
        ],
    )


def get_cached(
    db: Session, strategy: Strategy, range_years: int, asof: date
) -> tuple[BacktestResult | None, str]:
    """Return (cached result, config_hash). result is None if no fresh entry."""
    config_hash = compute_config_hash(strategy, range_years, asof)
    entry = db.get(BacktestCache, config_hash)
    if entry is None:
        return None, config_hash
    # Cache valid if asof_date matches today (or what we passed in)
    if entry.asof_date != asof:
        return None, config_hash
    try:
        return deserialize_result(entry.payload), config_hash
    except Exception as exc:
        logger.warning("Failed to deserialize cached backtest %s: %s", config_hash, exc)
        return None, config_hash


def store(
    db: Session,
    strategy: Strategy,
    range_years: int,
    asof: date,
    result: BacktestResult,
    config_hash: str,
) -> None:
    payload = serialize_result(result)
    entry = db.get(BacktestCache, config_hash)
    if entry is None:
        entry = BacktestCache(
            config_hash=config_hash,
            strategy_id=strategy.id,
            asof_date=asof,
            range_years=range_years,
            payload=payload,
            computed_at=datetime.now(timezone.utc),
        )
        db.add(entry)
    else:
        entry.asof_date = asof
        entry.range_years = range_years
        entry.payload = payload
        entry.computed_at = datetime.now(timezone.utc)
    db.commit()
