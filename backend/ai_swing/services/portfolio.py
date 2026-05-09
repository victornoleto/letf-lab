"""Aggregate user transactions into portfolio positions in USD.

Treats each trade with its fx_rate_to_usd snapshot so mixed-currency
portfolios collapse cleanly into a single base. Cost basis is FIFO-ish
average: total USD invested on buys / shares still held. Sells reduce
shares but don't change the average cost (they realize PnL externally).

This is intentionally a personal-finance-grade model — no lot tracking,
no wash-sale rules, no realized PnL surfacing. Enough to answer "what
am I holding and what is it worth right now."
"""
from __future__ import annotations

from collections import defaultdict
from decimal import Decimal

import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from ai_swing.data import get_price_service
from ai_swing.db.models import Transaction, TransactionSide
from ai_swing.schemas.transaction import (
    PortfolioHistory,
    PortfolioHistoryPoint,
    PortfolioPosition,
    PortfolioSummary,
)


def _latest_price_usd(ticker: str) -> Decimal | None:
    try:
        ps = get_price_service()
        s = ps.get_close_series(ticker).dropna()
        if s.empty:
            return None
        return Decimal(str(float(s.iloc[-1])))
    except Exception:
        return None


_BRL_TICKER = "BRL=X"  # yfinance: BRL per USD (e.g., 5.00 = R$5 per US$1)


def _latest_brl_per_usd() -> Decimal | None:
    """Today's USDBRL close (BRL per USD). None if the cache hasn't been
    primed and the network fetch fails."""
    return _latest_price_usd(_BRL_TICKER)


def compute_portfolio(
    db: Session, user_id: int, display_currency: str = "USD"
) -> PortfolioSummary:
    rows = db.scalars(
        select(Transaction)
        .where(Transaction.user_id == user_id)
        .order_by(Transaction.date)
    ).all()

    # Per-ticker running shares + total USD cost on buys.
    shares: dict[str, Decimal] = defaultdict(Decimal)
    cost_usd: dict[str, Decimal] = defaultdict(Decimal)
    buy_shares: dict[str, Decimal] = defaultdict(Decimal)

    for t in rows:
        n = Decimal(t.n_shares)
        price = Decimal(t.price_per_share)
        fx = Decimal(t.fx_rate_to_usd)
        fees = Decimal(t.fees)
        cost = (n * price + fees) * fx  # all-in USD cost for this trade

        if t.side == TransactionSide.BUY:
            shares[t.asset_ticker] += n
            cost_usd[t.asset_ticker] += cost
            buy_shares[t.asset_ticker] += n
        else:
            # SELL: reduce share count proportionally, drop cost basis pro-rata
            held = shares[t.asset_ticker]
            if held > 0:
                # Remove `n` shares' worth of average cost from the pool.
                avg = cost_usd[t.asset_ticker] / buy_shares[t.asset_ticker] \
                    if buy_shares[t.asset_ticker] > 0 else Decimal(0)
                cost_usd[t.asset_ticker] = max(
                    Decimal(0),
                    cost_usd[t.asset_ticker] - avg * n,
                )
                buy_shares[t.asset_ticker] = max(
                    Decimal(0),
                    buy_shares[t.asset_ticker] - n,
                )
            shares[t.asset_ticker] -= n

    positions: list[PortfolioPosition] = []
    total_invested = Decimal(0)
    total_market = Decimal(0)
    has_market_value = False

    for ticker, n in sorted(shares.items()):
        if n <= 0:
            continue  # closed positions don't show on the holdings table
        avg_cost = (cost_usd[ticker] / buy_shares[ticker]) if buy_shares[ticker] > 0 else Decimal(0)
        invested = cost_usd[ticker]
        latest = _latest_price_usd(ticker)
        market_value = (latest * n) if latest is not None else None
        pl_usd = (market_value - invested) if market_value is not None else None
        pl_pct = (
            float(pl_usd / invested) if (pl_usd is not None and invested > 0) else None
        )

        positions.append(PortfolioPosition(
            asset_ticker=ticker,
            n_shares=n,
            avg_cost_usd=avg_cost,
            invested_usd=invested,
            current_price_usd=latest,
            market_value_usd=market_value,
            pl_usd=pl_usd,
            pl_pct=pl_pct,
        ))

        total_invested += invested
        if market_value is not None:
            total_market += market_value
            has_market_value = True

    total_pl = total_market - total_invested if has_market_value else Decimal(0)
    total_pl_pct: float | None = None
    if has_market_value and total_invested > 0:
        total_pl_pct = float(total_pl / total_invested)

    summary = PortfolioSummary(
        positions=positions,
        invested_usd=total_invested,
        market_value_usd=total_market,
        pl_usd=total_pl,
        pl_pct=total_pl_pct,
        display_currency="USD",
        fx_rate_used=None,
    )

    if display_currency.upper() != "BRL":
        return summary

    # BRL view: multiply every USD figure by today's BRL/USD close.
    rate = _latest_brl_per_usd()
    if rate is None:
        # Fallback gracefully: keep USD numbers but flag the currency so the
        # UI can warn the user instead of silently mixing units.
        summary.display_currency = "USD"
        return summary

    return PortfolioSummary(
        positions=[
            PortfolioPosition(
                asset_ticker=p.asset_ticker,
                n_shares=p.n_shares,
                avg_cost_usd=p.avg_cost_usd * rate,
                invested_usd=p.invested_usd * rate,
                current_price_usd=(p.current_price_usd * rate) if p.current_price_usd else None,
                market_value_usd=(p.market_value_usd * rate) if p.market_value_usd else None,
                pl_usd=(p.pl_usd * rate) if p.pl_usd is not None else None,
                pl_pct=p.pl_pct,  # ratio is currency-invariant
            )
            for p in summary.positions
        ],
        invested_usd=summary.invested_usd * rate,
        market_value_usd=summary.market_value_usd * rate,
        pl_usd=summary.pl_usd * rate,
        pl_pct=summary.pl_pct,
        display_currency="BRL",
        fx_rate_used=rate,
    )


def compute_portfolio_history(
    db: Session,
    user_id: int,
    benchmark_ticker: str = "SPY",
) -> PortfolioHistory:
    rows = db.scalars(
        select(Transaction)
        .where(Transaction.user_id == user_id)
        .order_by(Transaction.date, Transaction.id)
    ).all()
    benchmark_ticker = benchmark_ticker.strip().upper() or "SPY"
    if not rows:
        return PortfolioHistory(benchmark_ticker=benchmark_ticker, points=[])

    ps = get_price_service()
    tickers = sorted({t.asset_ticker for t in rows} | {benchmark_ticker})
    prices = {
        ticker: ps.get_close_series(ticker).dropna().sort_index()
        for ticker in tickers
    }
    prices = {
        ticker: series[~series.index.duplicated(keep="last")]
        for ticker, series in prices.items()
    }
    benchmark = prices.get(benchmark_ticker, pd.Series(dtype=float)).dropna()
    if benchmark.empty:
        return PortfolioHistory(benchmark_ticker=benchmark_ticker, points=[])

    start = min(t.date for t in rows)
    tx_index = pd.DatetimeIndex(pd.Timestamp(t.date) for t in rows).unique()
    index = benchmark[benchmark.index.date >= start].index.union(tx_index).unique().sort_values()
    if index.empty:
        return PortfolioHistory(benchmark_ticker=benchmark_ticker, points=[])

    aligned = {
        ticker: series.reindex(series.index.union(index)).ffill().reindex(index)
        for ticker, series in prices.items()
        if not series.empty
    }
    if benchmark_ticker not in aligned:
        return PortfolioHistory(benchmark_ticker=benchmark_ticker, points=[])
    shares: dict[str, Decimal] = defaultdict(Decimal)
    benchmark_shares = Decimal(0)
    points: list[PortfolioHistoryPoint] = []
    tx_idx = 0

    for ts in index:
        day = ts.date()
        bench_price_raw = aligned[benchmark_ticker].loc[ts]
        if pd.isna(bench_price_raw) or float(bench_price_raw) <= 0:
            continue
        bench_price = Decimal(str(float(bench_price_raw)))

        while tx_idx < len(rows) and rows[tx_idx].date <= day:
            tx = rows[tx_idx]
            n = Decimal(tx.n_shares)
            price = Decimal(tx.price_per_share)
            fx = Decimal(tx.fx_rate_to_usd)
            fees = Decimal(tx.fees)
            if tx.side == TransactionSide.BUY:
                trade_cash_usd = (n * price + fees) * fx
                shares[tx.asset_ticker] += n
                benchmark_shares += trade_cash_usd / bench_price
            else:
                trade_cash_usd = max(Decimal(0), (n * price - fees) * fx)
                shares[tx.asset_ticker] -= n
                benchmark_shares = max(
                    Decimal(0),
                    benchmark_shares - (trade_cash_usd / bench_price),
                )
            tx_idx += 1

        portfolio_value = Decimal(0)
        for ticker, n in shares.items():
            if n <= 0 or ticker not in aligned:
                continue
            px_raw = aligned[ticker].loc[ts]
            if pd.isna(px_raw):
                continue
            portfolio_value += n * Decimal(str(float(px_raw)))

        benchmark_value = benchmark_shares * bench_price
        points.append(PortfolioHistoryPoint(
            date=day,
            portfolio_value_usd=float(portfolio_value),
            benchmark_value_usd=float(benchmark_value),
        ))

    return PortfolioHistory(benchmark_ticker=benchmark_ticker, points=points)
