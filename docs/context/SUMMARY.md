# LETF Lab Context Summary

This folder is the application context map. Use it to understand what each screen or major capability does before changing code.

## Screens

- [Dashboard](./dashboard.md): landing page after login. Shows strategy cards, current risk-on/risk-off state, scores, recent transitions, and quick access to each strategy detail.
- [Strategies](./strategies.md): strategy registry. Used to create, edit, clone, and delete LETF rotation strategies, including benchmark, risk-on/risk-off tickers, indicators, and vote threshold.
- [Strategy Detail](./strategy-detail.md): main decision screen. Combines current signal state, AI report, backtest, signal history, benchmark edge windows, validation snapshot, cohort entry, and indicator charts.
- [Indicators](./indicators.md): closed catalog of reusable signal gates. Supports SMA, EMA, volatility, and AR(1) indicators with schema-driven forms and safe deletion rules.
- [Portfolio](./portfolio.md): transaction and position tracking. Records buys/sells and summarizes holdings so strategy decisions can be reconciled with the real portfolio.
- [Weekly Digest](./weekly-digest.md): AI-assisted weekly summary. Produces and caches a written overview of strategy/portfolio context when AI integration is configured.
- [Settings and Auth](./settings-and-auth.md): authentication and user-session context. Documents JWT cookie behavior, seeded admin user, and production security settings.

## Core Capabilities

- [Backtesting](./backtesting.md): historical simulation engine. Builds gross/net strategy curves, compares against benchmark and risk-on buy-and-hold, and reports CAGR, Sortino, drawdown, trades, hit rate, and tax drag.
- [Signals and Refresh](./signals-and-refresh.md): daily update pipeline. Refreshes price data, computes signal snapshots, detects transitions, updates validation gates, and triggers AI reports through the scheduler.
- [Validation and Robustness](./validation-and-robustness.md): benchmark-relative validation layer. Covers Benchmark Edge Windows, Validation Snapshot gates, DSR/PSR caveat, and Cohort Entry analysis.
- [AI Reports and Chat](./ai-reports-and-chat.md): optional AI layer. Generates strategy reports, weekly digest text, and portfolio-aware chat responses when CLI/API configuration is available.
- [Data and Storage](./data-and-storage.md): persistence and market-data context. Explains PostgreSQL/SQLite storage, Alembic migrations, parquet price cache, and backup concerns.

## Reading Order

1. Start with [Strategy Detail](./strategy-detail.md), because it is the main decision screen.
2. Read [Validation and Robustness](./validation-and-robustness.md) to understand the benchmark-relative checks.
3. Read [Signals and Refresh](./signals-and-refresh.md) to understand daily state updates.
4. Read [Data and Storage](./data-and-storage.md) before changing persistence or price ingestion.
