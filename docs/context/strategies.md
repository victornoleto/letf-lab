# Strategies

The Strategies page manages LETF rotation definitions.

## Purpose

- List all strategies.
- Create, edit, clone, and delete strategies.
- Attach indicators and set the vote threshold (`k_threshold`).

## Strategy Model

- Benchmark ticker: the baseline to beat, such as `QQQ` or `SPY`.
- Risk-on tickers: one or more leveraged ETFs driven by the same benchmark signal, such as `QLD/TQQQ` or `SSO/UPRO`.
- Risk-off ticker: defensive asset, such as `ZROZ`, `TLT`, `IEF`, or cash-like alternatives.
- Indicators: gates that vote for risk-on or risk-off.
- `k_threshold`: minimum number of risk-on votes required.

## Main Data

- `GET /api/strategies`
- `POST /api/strategies`
- `PUT /api/strategies/{id}`
- `DELETE /api/strategies/{id}`
- `POST /api/strategies/{id}/clone`

## UX Notes

- Cloning exists to test signal variants without rebuilding from scratch.
- Multiple risk-on tickers share the same signal and are compared as separate backtest variants.
- Strategy comparison was intentionally removed; future comparison flows should be redesigned from first principles.
