# Portfolio

The Portfolio screen tracks current positions and transactions.

## Purpose

- Record buys and sells.
- Show position summaries.
- Toggle USD/BRL display when currency conversion is available.

## Main Data

- `GET /api/transactions`
- `POST /api/transactions`
- `PUT /api/transactions/{id}`
- `DELETE /api/transactions/{id}`
- `GET /api/portfolio?currency=USD|BRL`
- `GET /api/portfolio/history?benchmark=SPY`

## UX Notes

- This module supports portfolio management around strategy decisions, but strategy validation remains separate.
- Avoid mixing portfolio P&L with backtested strategy metrics unless the distinction is explicit.
- The history chart compares portfolio market value in USD against a benchmark using equivalent buy/sell cash flows, with `SPY` as the default benchmark.
