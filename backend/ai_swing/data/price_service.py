"""Orchestrates yfinance fetches + parquet cache."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

import pandas as pd

from ai_swing.data import cache as price_cache
from ai_swing.data import yfinance_loader

logger = logging.getLogger(__name__)


class PriceService:
    def get_history(self, ticker: str) -> pd.DataFrame:
        """Return full history (cache-first; fetches max if cache empty)."""
        df = price_cache.read_cache(ticker)
        if df is None or df.empty:
            df = yfinance_loader.fetch_history(ticker, period="max")
            if not df.empty:
                price_cache.write_cache(ticker, df)
        return df if df is not None else pd.DataFrame(columns=["close"])

    def refresh(self, ticker: str, days: int = 30) -> pd.DataFrame:
        """Fetch recent N days from yfinance, merge into cache, return merged DF."""
        new = yfinance_loader.fetch_recent(ticker, days=days)
        if new.empty:
            logger.warning("No new data for %s; returning cache", ticker)
            existing = price_cache.read_cache(ticker)
            return existing if existing is not None else pd.DataFrame(columns=["close"])
        return price_cache.merge_into_cache(ticker, new)

    def get_close_series(self, ticker: str) -> pd.Series:
        """Convenience: return close price as Series."""
        df = self.get_history(ticker)
        if df.empty:
            return pd.Series([], dtype=float, name=ticker)
        return df["close"].rename(ticker)

    def get_recent_window(self, ticker: str, days: int) -> pd.Series:
        """Return last N calendar days of close prices."""
        s = self.get_close_series(ticker)
        if s.empty:
            return s
        cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days)
        return s[s.index >= cutoff]


_singleton: PriceService | None = None


def get_price_service() -> PriceService:
    global _singleton
    if _singleton is None:
        _singleton = PriceService()
    return _singleton
