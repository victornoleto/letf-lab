"""Fetch daily price bars from yfinance."""
from __future__ import annotations

import logging

import pandas as pd

logger = logging.getLogger(__name__)


def fetch_history(ticker: str, period: str = "max", interval: str = "1d") -> pd.DataFrame:
    """Download adjusted close prices for ticker. Returns DF with 'close' column.

    Uses yfinance.Ticker(...).history(auto_adjust=True) so 'Close' is split/dividend-adjusted.
    """
    import yfinance as yf  # imported lazily to keep test-only imports fast

    t = yf.Ticker(ticker)
    df = t.history(period=period, interval=interval, auto_adjust=True)
    if df is None or df.empty:
        logger.warning("yfinance returned empty data for %s", ticker)
        return pd.DataFrame(columns=["close"])
    df = df.rename(columns={"Close": "close"})
    df = df[["close"]].copy()
    df.index = pd.DatetimeIndex(df.index).tz_localize(None).normalize()
    df = df[~df.index.duplicated(keep="last")].sort_index()
    return df


def fetch_recent(ticker: str, days: int = 30) -> pd.DataFrame:
    """Fetch last N days (rounded up to a yfinance-supported period)."""
    if days <= 7:
        period = "7d"
    elif days <= 30:
        period = "1mo"
    elif days <= 90:
        period = "3mo"
    elif days <= 180:
        period = "6mo"
    elif days <= 365:
        period = "1y"
    else:
        period = "2y"
    return fetch_history(ticker, period=period, interval="1d")
