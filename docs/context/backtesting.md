# Backtesting

Backtesting evaluates how a strategy would have behaved historically.

## Purpose

- Build strategy equity curves from signal rules.
- Compare against benchmark buy-and-hold and risk-on buy-and-hold.
- Show gross and net outcomes, including tax drag when available.

## Engine Behavior

- Signals use T+1 execution assumptions.
- Strategy curves are computed from cached price data.
- Backtest results are cached by strategy config, date, and range.

## Main Data

- `POST /api/backtest/{strategy_id}?range_years=10&force=false`

## Metrics

- CAGR
- Max drawdown
- Sortino
- Trade count
- Hit rate
- Net CAGR/Sortino when tax layer applies

## UX Notes

- Backtest is necessary but insufficient; robustness cards should be used before trusting a strategy.
