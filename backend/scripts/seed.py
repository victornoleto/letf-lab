"""Seed script: creates study-aligned indicators and example strategies.

Run via: `python -m scripts.seed` (from backend/) or `make seed`.
Idempotent — safe to re-run.
"""
from __future__ import annotations

import logging

import os

from sqlalchemy import select

from ai_swing.auth.security import hash_password
from ai_swing.db import SessionLocal
from ai_swing.db.models import (
    Indicator,
    IndicatorType,
    Strategy,
    StrategyIndicator,
    User,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("seed")


INDICATORS_SEED = [
    ("SMA250", IndicatorType.SMA_GATE, {"period": 250}, "Long-trend filter (price > SMA250)"),
    ("SMA100", IndicatorType.SMA_GATE, {"period": 100}, "Short-trend filter (price > SMA100)"),
    ("Vol21d<40%", IndicatorType.VOL_GATE, {"window": 21, "threshold": 0.40},
     "Calm-regime filter (realized vol_21d < 40% annualized)"),
    ("AR(1)_30d>0", IndicatorType.AR1_GATE, {"window": 30, "threshold": 0.0},
     "Momentum regime (AR(1) coefficient > 0 over 30d)"),
]


STRATEGIES_SEED = [
    ("SPY → SSO/UPRO vote-of-2", "SPY", ["SSO", "UPRO"], "ZROZ", 2),
    ("QQQ → QLD/TQQQ vote-of-2", "QQQ", ["QLD", "TQQQ"], "ZROZ", 2),
    ("SOXX → USD/SOXL vote-of-2", "SOXX", ["USD", "SOXL"], "ZROZ", 2),
    ("GLD → UGL vote-of-2", "GLD", ["UGL"], "ZROZ", 2),
    ("XLK → TECL vote-of-2", "XLK", ["TECL"], "ZROZ", 2),
    ("DIA → DDM/UDOW vote-of-2", "DIA", ["DDM", "UDOW"], "ZROZ", 2),
    ("IWM → UWM/TNA vote-of-2", "IWM", ["UWM", "TNA"], "ZROZ", 2),
    ("XLF → UYG/FAS vote-of-2", "XLF", ["UYG", "FAS"], "ZROZ", 2),
    ("XLE → DIG/ERX vote-of-2", "XLE", ["DIG", "ERX"], "ZROZ", 2),
    ("TLT → UBT/TMF vote-of-2", "TLT", ["UBT", "TMF"], "ZROZ", 2),
]

OBSOLETE_STRATEGY_NAMES = [
    "QQQ → QLD vote-of-2 sma250/100",
    "SPY → UPRO vote-of-2",
    "SMH → SOXL vote-of-2",
    "MU → MUU vote-of-2",
    "FTEC → TECL vote-of-2",
]


def _get_or_create_indicator(db, name, type_, params, description):
    existing = db.scalars(select(Indicator).where(Indicator.name == name)).first()
    if existing is not None:
        return existing
    ind = Indicator(name=name, type=type_, params=params, description=description)
    db.add(ind)
    db.flush()
    return ind


def _get_or_create_strategy(db, name, benchmark, risk_on, risk_off, k, indicators):
    existing = db.scalars(select(Strategy).where(Strategy.name == name)).first()
    if existing is not None:
        log.info("Strategy already exists: %s", name)
        return existing
    s = Strategy(
        name=name,
        benchmark_ticker=benchmark,
        risk_on_tickers=risk_on,
        risk_off_ticker=risk_off,
        k_threshold=k,
        enabled=True,
    )
    db.add(s)
    db.flush()
    for order, ind in enumerate(indicators):
        db.add(StrategyIndicator(strategy_id=s.id, indicator_id=ind.id, order=order))
    log.info("Created strategy: %s", name)
    return s


def _get_or_create_default_user(db) -> User:
    email = os.getenv("SEED_USER_EMAIL", "admin@example.com").lower()
    password = os.getenv("SEED_USER_PASSWORD", "password")
    existing = db.scalars(select(User).where(User.email == email)).first()
    if existing is not None:
        log.info("User already exists: %s", email)
        return existing
    user = User(email=email, password_hash=hash_password(password), name="Admin", is_active=True)
    db.add(user)
    db.flush()
    log.info("Created user: %s (password from SEED_USER_PASSWORD or default seed password)", email)
    return user


def main() -> None:
    db = SessionLocal()
    try:
        log.info("Seeding default user...")
        _get_or_create_default_user(db)
        db.commit()

        log.info("Seeding indicators...")
        ind_objs = []
        for name, type_, params, desc in INDICATORS_SEED:
            ind = _get_or_create_indicator(db, name, type_, params, desc)
            ind_objs.append(ind)
        db.commit()

        log.info("Seeding strategies...")
        for name in OBSOLETE_STRATEGY_NAMES:
            existing = db.scalars(select(Strategy).where(Strategy.name == name)).first()
            if existing is not None:
                db.delete(existing)
                log.info("Removed obsolete strategy: %s", name)
        for name, benchmark, risk_on, risk_off, k in STRATEGIES_SEED:
            _get_or_create_strategy(db, name, benchmark, risk_on, risk_off, k, ind_objs)
        db.commit()
        log.info("Seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
