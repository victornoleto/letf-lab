"""Parquet-backed price cache. One file per ticker, single source of truth.

Adds an in-memory layer keyed by (path, mtime) so repeated reads within a
process — common when many endpoints touch the same benchmark — skip the
parquet parse entirely. Writes bump mtime, so the layer self-invalidates.
"""
from __future__ import annotations

from pathlib import Path

import pandas as pd

from ai_swing.config import settings


_mem_cache: dict[Path, tuple[float, pd.DataFrame]] = {}


def cache_path(ticker: str) -> Path:
    base = settings.price_cache_path
    base.mkdir(parents=True, exist_ok=True)
    return base / f"{ticker.upper()}.parquet"


def read_cache(ticker: str) -> pd.DataFrame | None:
    """Return cached DataFrame with DatetimeIndex and 'close' column, or None."""
    path = cache_path(ticker)
    if not path.exists():
        _mem_cache.pop(path, None)
        return None

    mtime = path.stat().st_mtime
    cached = _mem_cache.get(path)
    if cached is not None and cached[0] == mtime:
        return cached[1].copy()

    try:
        df = pd.read_parquet(path)
    except Exception:
        return None
    if df.empty:
        return None
    if not isinstance(df.index, pd.DatetimeIndex):
        df.index = pd.DatetimeIndex(df.index)
    df = df.sort_index()
    _mem_cache[path] = (mtime, df)
    return df.copy()


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
