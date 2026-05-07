"""Generate per-strategy narrative reports via the Anthropic API.

We feed Claude the strategy's current snapshot plus, for each indicator,
how close its raw value is to the gate threshold (the "headroom"). The
model returns a one-line headline plus a paragraph in PT-BR. We persist
both, keyed by (strategy_id, date), so the dashboard and detail page can
read them without re-running the model.

If ANTHROPIC_API_KEY is not set the service is a deliberate no-op — the
rest of the app keeps working without any AI features.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import date, datetime, timezone

import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from ai_swing.config import settings
from ai_swing.data import get_price_service
from ai_swing.db.models import IndicatorType, SignalSnapshot, Strategy, StrategyReport
from ai_swing.indicators import functions as F

logger = logging.getLogger(__name__)

_MODEL = "claude-haiku-4-5-20251001"
_MAX_TOKENS = 600


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
    """Compute how close each indicator is to flipping its gate."""
    results_by_id = {r["indicator_id"]: r for r in (snap.indicator_results if snap else [])}
    ps = get_price_service()
    prices = ps.get_close_series(strategy.benchmark_ticker)
    returns = prices.pct_change()

    out: list[IndicatorProximity] = []
    for si in strategy.indicators:
        ind = si.indicator
        params = ind.params or {}
        result = results_by_id.get(ind.id, {})
        passed = bool(result.get("gate_passed"))
        summary = str(result.get("raw_summary", ""))
        headroom: float | None = None

        try:
            if ind.type in (IndicatorType.SMA_GATE, IndicatorType.EMA_GATE):
                period = int(params.get("period", 200))
                if ind.type == IndicatorType.SMA_GATE:
                    ref = prices.rolling(window=period, min_periods=period).mean()
                else:
                    ref = prices.ewm(span=period, min_periods=period, adjust=False).mean()
                latest_price = float(prices.dropna().iloc[-1])
                latest_ref = float(ref.dropna().iloc[-1])
                if latest_ref:
                    headroom = (latest_price - latest_ref) / latest_ref
            elif ind.type == IndicatorType.VOL_GATE:
                window = int(params.get("window", 21))
                threshold = float(params.get("threshold", 0.40))
                vol = F.realized_vol(returns, window=window).dropna()
                if not vol.empty:
                    latest = float(vol.iloc[-1])
                    # gate passes when vol < threshold; headroom is "how far below"
                    headroom = (threshold - latest) / threshold if threshold else None
            elif ind.type == IndicatorType.AR1_GATE:
                window = int(params.get("window", 30))
                threshold = float(params.get("threshold", 0.0))
                coef = F.ar1_coefficient(returns, window=window).dropna()
                if not coef.empty:
                    latest = float(coef.iloc[-1])
                    headroom = latest - threshold
        except Exception as exc:
            logger.debug("Headroom calc failed for %s: %s", ind.name, exc)

        out.append(
            IndicatorProximity(
                name=ind.name,
                type=ind.type.value,
                passed=passed,
                summary=summary,
                headroom_pct=headroom,
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


_SYSTEM_PROMPT = (
    "Você analisa estratégias de rotação ETF/LETF baseadas em vote-of-K. "
    "Responda apenas em JSON válido com as chaves: headline (string, <=160 chars, "
    "uma linha em PT-BR), body (string, <=400 chars, 1-2 frases em PT-BR). "
    "Tom: direto, factual, sem hype. Sem emojis."
)


def _build_user_prompt(strategy: Strategy, snap: SignalSnapshot | None,
                       indicators: list[IndicatorProximity], proximity: str) -> str:
    snap_block = (
        f"score={snap.score}/{snap.total} risk_on={snap.risk_on} date={snap.date}"
        if snap else "sem snapshot"
    )
    inds_block = json.dumps([i.to_dict() for i in indicators], ensure_ascii=False)
    return (
        f"Estratégia: {strategy.name}\n"
        f"Benchmark: {strategy.benchmark_ticker} | Risk-on: {strategy.risk_on_ticker} "
        f"| Risk-off: {strategy.risk_off_ticker}\n"
        f"k mínimo: {strategy.k_threshold}\n"
        f"Snapshot: {snap_block}\n"
        f"Indicadores (gate_passed + headroom até o threshold): {inds_block}\n"
        f"Estado heurístico calculado: {proximity}\n\n"
        "Gere o JSON descrevendo: estado atual da estratégia em uma frase curta, "
        "se está perto de virar (entrar em risk-on / sair para risk-off) com base no headroom, "
        "e qual indicador está mais perto do flip."
    )


def _call_anthropic(strategy: Strategy, snap: SignalSnapshot | None,
                    indicators: list[IndicatorProximity], proximity: str) -> tuple[str, str]:
    if not settings.anthropic_api_key:
        raise RuntimeError("ANTHROPIC_API_KEY not configured")

    # Imported lazily so the dependency is optional.
    from anthropic import Anthropic

    client = Anthropic(api_key=settings.anthropic_api_key)
    response = client.messages.create(
        model=_MODEL,
        max_tokens=_MAX_TOKENS,
        system=_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": _build_user_prompt(
            strategy, snap, indicators, proximity
        )}],
    )
    text = "".join(
        block.text for block in response.content if getattr(block, "type", None) == "text"
    ).strip()
    # Trim potential ```json fences just in case.
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
        text = text.strip()
    parsed = json.loads(text)
    headline = str(parsed.get("headline", "")).strip()
    body = str(parsed.get("body", "")).strip()
    if not headline or not body:
        raise ValueError(f"Anthropic response missing fields: {text!r}")
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
    returned as-is — saves an API call when the daily cron retries.
    """
    if not settings.anthropic_api_key:
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
        headline, body = _call_anthropic(strategy, snap, indicators, proximity)
    except Exception as exc:
        logger.warning("AI report failed for strategy %s: %s", strategy.id, exc)
        return None

    if existing is None:
        report = StrategyReport(
            strategy_id=strategy.id,
            date=today,
            headline=headline,
            body=body,
            proximity_state=proximity,
            model=_MODEL,
            generated_at=datetime.now(timezone.utc),
        )
        db.add(report)
    else:
        existing.headline = headline
        existing.body = body
        existing.proximity_state = proximity
        existing.model = _MODEL
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
