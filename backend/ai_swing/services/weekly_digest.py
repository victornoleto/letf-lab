"""Weekly digest generation: aggregates the week's events and asks the AI
CLI to summarize them in PT-BR markdown.

Cron schedule (configured in `scheduler.py`): every Monday 09:00 ET. The
job collects last week's transitions, the strategies whose indicators are
within 2% of flipping, and the latest snapshot per strategy; ships the
bundle to the CLI; persists the markdown response keyed by week-start.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from ai_swing.config import settings
from ai_swing.db.models import (
    SignalSnapshot,
    SignalTransition,
    Strategy,
    WeeklyDigest,
)
from ai_swing.services import ai_cli
from ai_swing.services.strategy_service import list_strategies

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT_FILE = "weekly_digest.system.md"
_USER_PROMPT_FILE = "weekly_digest.user.txt"

_HEADROOM_NEAR_FLIP = 0.02  # |headroom| < 2% counts as "perto do flip"
_MAX_BODY_LEN = 8000


def _monday_of(d: date) -> date:
    """Monday of the calendar week containing `d`."""
    return d - timedelta(days=d.weekday())


def _build_context(db: Session, week_start: date, week_end: date) -> dict[str, Any]:
    strategies = list_strategies(db, enabled_only=True)
    strategy_blocks: list[dict[str, Any]] = []
    near_flip_blocks: list[dict[str, Any]] = []
    transition_blocks: list[dict[str, Any]] = []

    for s in strategies:
        latest = db.scalars(
            select(SignalSnapshot)
            .where(SignalSnapshot.strategy_id == s.id)
            .order_by(SignalSnapshot.date.desc())
            .limit(1)
        ).first()
        latest_dict: dict[str, Any] | None = None
        if latest is not None:
            latest_dict = {
                "date": latest.date.isoformat(),
                "score": latest.score,
                "total": latest.total,
                "risk_on": latest.risk_on,
            }
            for r in latest.indicator_results:
                h = r.get("headroom_pct")
                if h is None:
                    continue
                if abs(h) < _HEADROOM_NEAR_FLIP:
                    near_flip_blocks.append({
                        "strategy": s.name,
                        "indicator": r.get("indicator_name"),
                        "headroom_pct": h,
                        "passed": r.get("gate_passed"),
                    })
        strategy_blocks.append({
            "id": s.id,
            "name": s.name,
            "tickers": f"{s.benchmark_ticker} → {s.risk_on_ticker} | {s.risk_off_ticker}",
            "k_threshold": s.k_threshold,
            "latest_snapshot": latest_dict,
        })

        rows = db.scalars(
            select(SignalTransition)
            .where(
                SignalTransition.strategy_id == s.id,
                SignalTransition.date >= week_start,
                SignalTransition.date <= week_end,
            )
            .order_by(SignalTransition.date)
        ).all()
        for t in rows:
            transition_blocks.append({
                "strategy": s.name,
                "date": t.date.isoformat(),
                "from": "on" if t.from_state else "off",
                "to": "on" if t.to_state else "off",
                "score": f"{t.score}/{t.total}",
            })

    return {
        "week_start": week_start.isoformat(),
        "week_end": week_end.isoformat(),
        "strategies": strategy_blocks,
        "transitions_this_week": transition_blocks,
        "near_flip_indicators": near_flip_blocks,
    }


@dataclass
class DigestResult:
    week_start: date
    body: str
    generated_at: datetime
    model: str


def generate_digest(
    db: Session, week_start: date | None = None, force: bool = False
) -> WeeklyDigest | None:
    """Generate (or fetch cached) the digest for `week_start`.

    Defaults to the Monday of *this* calendar week.
    """
    if not ai_cli.is_configured():
        return None

    if week_start is None:
        week_start = _monday_of(date.today())

    existing = db.scalars(
        select(WeeklyDigest).where(WeeklyDigest.week_start == week_start)
    ).first()
    if existing is not None and not force:
        return existing

    week_end = week_start + timedelta(days=6)
    ctx = _build_context(db, week_start, week_end)
    system = ai_cli.load_prompt(_SYSTEM_PROMPT_FILE)
    user_template = ai_cli.load_prompt(_USER_PROMPT_FILE)
    user = user_template.format(
        week_start=week_start.isoformat(),
        week_end=week_end.isoformat(),
        context_json=json.dumps(ctx, ensure_ascii=False, default=str, indent=2),
    )

    try:
        # The digest prompt is heavier than the chat one (whole-week JSON
        # context + structured markdown ask), so we give the CLI more
        # headroom than the per-strategy report.
        body = ai_cli.run_prompt(system, user, timeout_s=300)
    except Exception as exc:
        logger.warning("Weekly digest generation failed: %s", exc)
        return None

    body = body[:_MAX_BODY_LEN]
    model_label = settings.ai_cli_model or "ai-cli"

    if existing is None:
        digest = WeeklyDigest(
            week_start=week_start,
            body=body,
            model=model_label,
            generated_at=datetime.now(timezone.utc),
        )
        db.add(digest)
    else:
        existing.body = body
        existing.model = model_label
        existing.generated_at = datetime.now(timezone.utc)
        digest = existing

    db.flush()
    db.commit()
    return digest


def latest_digests(db: Session, limit: int = 12) -> list[WeeklyDigest]:
    return list(
        db.scalars(
            select(WeeklyDigest)
            .order_by(WeeklyDigest.week_start.desc())
            .limit(limit)
        ).all()
    )
