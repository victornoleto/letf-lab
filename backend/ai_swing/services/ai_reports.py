"""Generate per-strategy narrative reports via a local AI CLI (OpenCode).

We feed the model the strategy's current snapshot plus, for each indicator,
how close its raw value is to the gate threshold (the "headroom"). The
model returns a one-line headline plus a paragraph in PT-BR. We persist
both, keyed by (strategy_id, date), so the dashboard and detail page can
read them without re-running the model.

The actual CLI invocation lives in `services.ai_cli`; this module just
builds the prompt context and parses the JSON response. If the CLI is not
configured the service is a deliberate no-op — the rest of the app keeps
working without any AI features.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from ai_swing.config import settings
from ai_swing.db.models import SignalSnapshot, Strategy, StrategyReport
from ai_swing.services import ai_cli

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT_FILE = "strategy_report.system.md"
_USER_PROMPT_FILE = "strategy_report.user.txt"


@dataclass
class IndicatorProximity:
    name: str
    type: str
    passed: bool
    summary: str
    headroom_pct: float | None  # signed % distance to the gate threshold

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "type": self.type,
            "passed": self.passed,
            "summary": self.summary,
            "headroom_pct": self.headroom_pct,
        }


def _proximity_for(strategy: Strategy, snap: SignalSnapshot | None) -> list[IndicatorProximity]:
    """Build proximity rows from the snapshot's stored indicator_results.

    Headroom is now produced by `evaluator.evaluate_indicator` and persisted
    as `headroom_pct` in each result row, so this function just reshapes that
    data for the AI prompt.
    """
    results_by_id = {r["indicator_id"]: r for r in (snap.indicator_results if snap else [])}
    out: list[IndicatorProximity] = []
    for si in strategy.indicators:
        ind = si.indicator
        result = results_by_id.get(ind.id, {})
        out.append(
            IndicatorProximity(
                name=ind.name,
                type=ind.type.value,
                passed=bool(result.get("gate_passed")),
                summary=str(result.get("raw_summary", "")),
                headroom_pct=result.get("headroom_pct"),
            )
        )
    return out


def _classify_proximity(strategy: Strategy, snap: SignalSnapshot | None,
                        indicators: list[IndicatorProximity]) -> str:
    """Cheap rule-of-thumb label so even when the API call fails we have
    a useful one-word state to surface in the UI."""
    if snap is None:
        return "unknown"
    score = snap.score
    k = strategy.k_threshold
    total = snap.total
    if score >= k:
        # already on — flag if any active indicator is "barely" passing
        risky = sum(1 for i in indicators if i.passed and i.headroom_pct is not None
                    and abs(i.headroom_pct) < 0.02)
        if score == k and risky:
            return "near_off"
        return "on"
    # off
    needed = k - score
    near_passing = sum(
        1 for i in indicators
        if not i.passed and i.headroom_pct is not None and abs(i.headroom_pct) < 0.03
    )
    if needed <= near_passing:
        return "near_on"
    if score == k - 1:
        return "near_on"
    return "off"


def _build_user_prompt(strategy: Strategy, snap: SignalSnapshot | None,
                       indicators: list[IndicatorProximity], proximity: str) -> str:
    template = ai_cli.load_prompt(_USER_PROMPT_FILE)
    snap_block = (
        f"score={snap.score}/{snap.total} risk_on={snap.risk_on} date={snap.date}"
        if snap else "sem snapshot"
    )
    indicators_json = json.dumps([i.to_dict() for i in indicators], ensure_ascii=False)
    return template.format(
        strategy_name=strategy.name,
        benchmark=strategy.benchmark_ticker,
        risk_on="/".join(strategy.risk_on_tickers),
        risk_off=strategy.risk_off_ticker,
        k_threshold=strategy.k_threshold,
        snap_block=snap_block,
        indicators_json=indicators_json,
        proximity=proximity,
    )


def _call_via_cli(strategy: Strategy, snap: SignalSnapshot | None,
                  indicators: list[IndicatorProximity], proximity: str) -> tuple[str, str]:
    system = ai_cli.load_prompt(_SYSTEM_PROMPT_FILE)
    user = _build_user_prompt(strategy, snap, indicators, proximity)
    text = ai_cli.run_prompt(system, user).strip()
    # Trim potential ```json fences (some models still emit them despite
    # the system prompt asking for raw JSON).
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
        text = text.strip()
    parsed = json.loads(text)
    headline = str(parsed.get("headline", "")).strip()
    body = str(parsed.get("body", "")).strip()
    if not headline or not body:
        raise ValueError(f"AI response missing fields: {text!r}")
    return headline[:280], body[:4000]


def _latest_snapshot(db: Session, strategy_id: int) -> SignalSnapshot | None:
    stmt = (
        select(SignalSnapshot)
        .where(SignalSnapshot.strategy_id == strategy_id)
        .order_by(SignalSnapshot.date.desc())
        .limit(1)
    )
    return db.scalars(stmt).first()


def generate_report(db: Session, strategy: Strategy, force: bool = False) -> StrategyReport | None:
    """Compute today's report for a strategy. Returns None if AI is disabled.

    If a row already exists for (strategy_id, today) and force=False, it's
    returned as-is — saves a CLI call when the daily cron retries.
    """
    if not ai_cli.is_configured():
        return None

    today = date.today()
    existing = db.scalars(
        select(StrategyReport).where(
            StrategyReport.strategy_id == strategy.id,
            StrategyReport.date == today,
        )
    ).first()
    if existing is not None and not force:
        return existing

    snap = _latest_snapshot(db, strategy.id)
    indicators = _proximity_for(strategy, snap)
    proximity = _classify_proximity(strategy, snap, indicators)

    try:
        headline, body = _call_via_cli(strategy, snap, indicators, proximity)
    except Exception as exc:
        logger.warning("AI report failed for strategy %s: %s", strategy.id, exc)
        return None

    model_label = settings.ai_cli_model or "ai-cli"
    if existing is None:
        report = StrategyReport(
            strategy_id=strategy.id,
            date=today,
            headline=headline,
            body=body,
            proximity_state=proximity,
            model=model_label,
            generated_at=datetime.now(timezone.utc),
        )
        db.add(report)
    else:
        existing.headline = headline
        existing.body = body
        existing.proximity_state = proximity
        existing.model = model_label
        existing.generated_at = datetime.now(timezone.utc)
        report = existing

    db.flush()
    return report


def latest_report(db: Session, strategy_id: int) -> StrategyReport | None:
    stmt = (
        select(StrategyReport)
        .where(StrategyReport.strategy_id == strategy_id)
        .order_by(StrategyReport.date.desc(), StrategyReport.generated_at.desc())
        .limit(1)
    )
    return db.scalars(stmt).first()


def reports_by_strategy_id(db: Session, strategy_ids: list[int]) -> dict[int, StrategyReport]:
    """Bulk-fetch the most recent report for each strategy id.

    Used by the dashboard to render a one-liner per card without N+1 queries.
    """
    if not strategy_ids:
        return {}
    out: dict[int, StrategyReport] = {}
    rows = db.scalars(
        select(StrategyReport)
        .where(StrategyReport.strategy_id.in_(strategy_ids))
        .order_by(StrategyReport.date.desc())
    ).all()
    for r in rows:
        out.setdefault(r.strategy_id, r)
    return out
