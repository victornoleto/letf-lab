"""On-demand AI chat over the user's portfolio context.

The chat endpoint serializes the user's strategies (plus latest snapshot,
recent transitions, and portfolio summary) into a JSON bundle and ships it
to the local CLI via `services.ai_cli`. The CLI's running cost is zero per
call (OAuth tier on OpenCode) so we don't have to worry about token budget
the way the Anthropic-API path did.

Output is plain PT-BR text — no JSON envelope. The frontend renders it
inside a chat drawer.
"""
from __future__ import annotations

import json
import logging
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from ai_swing.db.models import (
    SignalSnapshot,
    SignalTransition,
    Strategy,
    StrategyIndicator,
)
from ai_swing.services import ai_cli
from ai_swing.services.portfolio import compute_portfolio
from ai_swing.services.strategy_service import list_strategies

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT_FILE = "portfolio_chat.system.md"
_USER_PROMPT_FILE = "portfolio_chat.user.txt"

_TRANSITIONS_LOOKBACK_DAYS = 90
_MAX_QUESTION_LEN = 1000
_MAX_ANSWER_LEN = 4000


def is_available() -> bool:
    return ai_cli.is_configured()


def _latest_snap_dict(snap: SignalSnapshot | None) -> dict[str, Any] | None:
    if snap is None:
        return None
    return {
        "date": snap.date.isoformat(),
        "score": snap.score,
        "total": snap.total,
        "risk_on": snap.risk_on,
        "indicator_results": snap.indicator_results,
    }


def _build_context(db: Session, user_id: int, include_portfolio: bool = True) -> dict[str, Any]:
    """Pull together the JSON context the model sees."""
    strategies = list_strategies(db, enabled_only=True)
    strategy_blocks: list[dict[str, Any]] = []
    strategy_ids: list[int] = []
    for s in strategies:
        strategy_ids.append(s.id)
        latest = db.scalars(
            select(SignalSnapshot)
            .where(SignalSnapshot.strategy_id == s.id)
            .order_by(SignalSnapshot.date.desc())
            .limit(1)
        ).first()
        strategy_blocks.append({
            "id": s.id,
            "name": s.name,
            "benchmark": s.benchmark_ticker,
            "risk_on": s.risk_on_tickers,
            "risk_off": s.risk_off_ticker,
            "k_threshold": s.k_threshold,
            "indicators": [si.indicator.name for si in s.indicators],
            "latest_snapshot": _latest_snap_dict(latest),
        })

    cutoff = date.today() - timedelta(days=_TRANSITIONS_LOOKBACK_DAYS)
    transitions = []
    if strategy_ids:
        rows = db.scalars(
            select(SignalTransition)
            .where(
                SignalTransition.strategy_id.in_(strategy_ids),
                SignalTransition.date >= cutoff,
            )
            .order_by(SignalTransition.date.desc())
        ).all()
        transitions = [
            {
                "strategy_id": t.strategy_id,
                "date": t.date.isoformat(),
                "from": "on" if t.from_state else "off",
                "to": "on" if t.to_state else "off",
                "score": f"{t.score}/{t.total}",
            }
            for t in rows
        ]

    portfolio_block: dict[str, Any] | None = None
    if include_portfolio:
        try:
            summary = compute_portfolio(db, user_id, display_currency="USD")
            portfolio_block = {
                "currency": summary.display_currency,
                "invested": str(summary.invested_usd),
                "market_value": str(summary.market_value_usd),
                "pl": str(summary.pl_usd),
                "pl_pct": summary.pl_pct,
                "n_positions": len(summary.positions),
            }
        except Exception as exc:
            logger.debug("Skipped portfolio block in chat context: %s", exc)

    return {
        "asof": datetime.now(timezone.utc).isoformat(),
        "strategies": strategy_blocks,
        "recent_transitions_90d": transitions,
        "portfolio": portfolio_block,
    }


def chat(
    db: Session,
    user_id: int,
    question: str,
    include_portfolio: bool = True,
) -> str:
    """Answer a free-form question about the user's portfolio."""
    if not is_available():
        raise RuntimeError("AI CLI is not configured")
    if not question.strip():
        raise ValueError("question must not be empty")
    if len(question) > _MAX_QUESTION_LEN:
        raise ValueError(f"question exceeds {_MAX_QUESTION_LEN} chars")

    ctx = _build_context(db, user_id, include_portfolio=include_portfolio)
    system = ai_cli.load_prompt(_SYSTEM_PROMPT_FILE)
    user_template = ai_cli.load_prompt(_USER_PROMPT_FILE)
    user_prompt = user_template.format(
        question=question.strip(),
        context_json=json.dumps(ctx, ensure_ascii=False, default=str, indent=2),
    )
    answer = ai_cli.run_prompt(system, user_prompt, timeout_s=120)
    return answer[:_MAX_ANSWER_LEN]
