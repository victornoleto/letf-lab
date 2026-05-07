"""Parquet-backed price cache. One file per ticker, single source of truth."""
from __future__ import annotations

from pathlib import Path

import pandas as pd

from ai_swing.config import settings


def cache_path(ticker: str) -> Path:
    base = settings.price_cache_path
    base.mkdir(parents=True, exist_ok=True)
    return base / f"{ticker.upper()}.parquet"


def read_cache(ticker: str) -> pd.DataFrame | None:
    """Return cached DataFrame with DatetimeIndex and 'close' column, or None."""
    path = cache_path(ticker)
    if not path.exists():
        return None
    try:
        df = pd.read_parquet(path)
    except Exception:
        return None
    if df.empty:
        return None
    if not isinstance(df.index, pd.DatetimeIndex):
        df.index = pd.DatetimeIndex(df.index)
    return df.sort_index()


def write_cache(ticker: str, df: pd.DataFrame) -> None:
    """Persist DataFrame for ticker (overwrites)."""
    path = cache_path(ticker)
    df = df.sort_index()
    df.to_parquet(path)


def merge_into_cache(ticker: str, new_df: pd.DataFrame) -> pd.DataFrame:
    """Merge new bars into existing cache, deduplicating by index. Returns merged DF."""
    existing = read_cache(ticker)
    if existing is None or existing.empty:
        merged = new_df.copy()
    else:
        merged = pd.concat([existing, new_df])
        merged = merged[~merged.index.duplicated(keep="last")]
    merged = merged.sort_index()
    write_cache(ticker, merged)
    return merged
