# AI-Swing

Personal ETF/LETF rotation monitor — operacionaliza estratégia **vote-of-K** para múltiplos pares benchmark→LETF.

## Conceito

Cada estratégia define:
- Um **benchmark** (ex: QQQ) — sobre o qual rodam os indicadores
- Um **risk-on** (ex: TQQQ) — comprado quando ≥k indicadores estão verdes
- Um **risk-off** (ex: ZROZ) — comprado caso contrário
- Um conjunto de indicadores configuráveis (SMA, EMA, vol, AR(1))
- Um threshold **k** (mínimo de gates verdes para entrar em risk-on)

Inspirado no estudo [`letf_rotation_hunt`](../ai-trade/studies/letf_rotation_hunt) (T3d K=2):
Sharpe 0.85, CAGR 27.9% em 40 anos. As funções de indicador (`sma_gate`, `ema_gate`,
`realized_vol_gate`, `ar1_coefficient`, `vote_of_k`) foram copiadas de lá e validadas
por **testes de paridade** que rodam mesma série e comparam outputs com
`np.testing.assert_allclose`.

## Recursos

- **Dashboard** — grid de cards (um por estratégia) com status atual, score k/n,
  sparkline 90d e lista de indicadores com check/cross.
- **CRUD de indicadores** — catálogo fechado parametrizável (SMA_GATE, EMA_GATE,
  VOL_GATE, AR1_GATE) com schema dinâmico via API `/api/indicators/types`.
- **CRUD de estratégias** — escolha tickers, indicadores e threshold k.
- **Tela de detalhes** — header da estratégia + backtest panel completo (chart com
  3 equity curves em escala log + métricas + markers de transições) + indicadores
  hoje + histórico de sinais por dia.
- **Backtest engine** — rotation T+1 (decisão hoje → execução amanhã, sem
  look-ahead), cache de 24h em SQLite por (config_hash, asof_date).
- **Cron diário** — APScheduler agendado para 22h America/New_York; baixa preços,
  computa snapshots, detecta transições.
- **Refresh manual** — botão na UI dispara o mesmo job (debounce 5min).
- **Banner de transições** — topo da UI mostra flips dos últimos 7 dias.

## Quickstart

```bash
cd /var/www/pessoal/ai-swing
make install    # instala backend (uv pip install -e) + frontend (npm install)
make migrate    # alembic upgrade head → cria SQLite em data/ai_swing.db
make seed       # cria 4 indicadores + 5 estratégias-exemplo
make dev        # sobe backend (8000) + frontend (4200) em paralelo
```

Acesse `http://localhost:4200`.

Estratégias seed:
- QQQ → TQQQ vote-of-2 (com SMA200, SMA50, Vol21d<40%, AR(1)_30d>0)
- SPY → UPRO vote-of-2
- SMH → SOXL vote-of-2
- MU → MUU vote-of-2
- FTEC → TECL vote-of-2

Risk-off: ZROZ em todas (configurável).

## Stack

**Backend**:
- Python 3.11+ (testado em 3.12)
- FastAPI + uvicorn (porta 8000)
- SQLAlchemy 2.x + Alembic
- pandas + numpy + pyarrow
- yfinance (cache parquet local em `data/prices/`)
- APScheduler (cron in-process)
- pytest (36 testes, incluindo 5 de paridade vs estudo)

**Frontend**:
- Angular 21 (standalone components, signals, zoneless, control flow `@for/@if`)
- ECharts via `ngx-echarts`
- HttpClient com fetch
- TypeScript strict
- Sem framework UI externo — CSS/SCSS direto

**Storage**:
- SQLite (`data/ai_swing.db`) — config + signal_history + transitions + backtest cache
- Parquet (`data/prices/*.parquet`) — cache de preços por ticker

## Estrutura

```
ai-swing/
├── backend/
│   ├── ai_swing/
│   │   ├── main.py                    # FastAPI app factory + lifespan
│   │   ├── config.py                  # pydantic Settings (.env)
│   │   ├── scheduler.py               # APScheduler bootstrap
│   │   ├── db/                        # SQLAlchemy Base + models
│   │   ├── schemas/                   # pydantic DTOs
│   │   ├── indicators/
│   │   │   ├── functions.py           # sma_gate, ema_gate, vol, ar1, vote_of_k
│   │   │   ├── catalog.py             # IndicatorType enum + param schemas
│   │   │   └── evaluator.py           # type+params → function dispatcher
│   │   ├── data/                      # yfinance loader + parquet cache
│   │   ├── backtest/                  # engine, metrics, cache
│   │   ├── services/                  # strategy_service, signal_service, refresh_service
│   │   └── routers/                   # FastAPI endpoints
│   ├── alembic/versions/              # migrations
│   ├── tests/                         # pytest (36 tests)
│   └── scripts/seed.py                # populador de exemplos
├── frontend/
│   └── src/app/
│       ├── core/                      # api.service, models
│       └── pages/
│           ├── dashboard/             # cards + sparkline
│           ├── strategies/            # list + form
│           ├── indicators/            # list + form
│           └── strategy-detail/       # header + backtest-panel + history-table
└── data/
    ├── ai_swing.db                    # SQLite
    └── prices/                        # *.parquet
```

## Endpoints da API

```
GET    /api/health
GET    /api/indicators/types          → catálogo de tipos disponíveis
GET    /api/indicators                → list
POST   /api/indicators                → create
GET    /api/indicators/{id}
PUT    /api/indicators/{id}
DELETE /api/indicators/{id}           → 409 se em uso

GET    /api/strategies                → list (com signal atual + sparkline)
POST   /api/strategies
GET    /api/strategies/{id}
PUT    /api/strategies/{id}
DELETE /api/strategies/{id}

GET    /api/signals/{strategy_id}/history?range=1y   → snapshots
GET    /api/signals/{strategy_id}/transitions?limit=50
GET    /api/signals/transitions/recent?days=7        → para banner

POST   /api/refresh?force=false       → fetch yfinance + recompute snapshots + detect transitions
GET    /api/refresh/status            → última execução

POST   /api/backtest/{strategy_id}?range_years=10&force=false
                                      → equity curves + metrics + transitions (cache 24h)
```

## Make targets

- `make install` — instala deps backend (uv) e frontend (npm)
- `make migrate` — `alembic upgrade head`
- `make seed` — popula indicadores + estratégias-exemplo
- `make dev` — backend + frontend em paralelo (foreground)
- `make backend` — só FastAPI
- `make frontend` — só Angular
- `make test` — pytest + Angular tests
- `make test-backend` — só pytest
- `make refresh` — dispara refresh manual via curl
- `make clean` — remove caches

## Configuração

Edite `backend/.env` (copie de `.env.example`):

```
DATABASE_URL=sqlite:///../data/ai_swing.db
PRICE_CACHE_DIR=../data/prices
REFRESH_HOUR_ET=22
LOG_LEVEL=INFO
ALLOW_ORIGINS=http://localhost:4200,http://127.0.0.1:4200
```

## Testes

```bash
cd backend && source .venv/bin/activate && pytest -v
```

Cobertura:
- `test_indicators.py` — funções puras + **paridade** vs `letf_rotation_hunt/signals.py`
- `test_evaluator.py` — dispatcher type+params → função
- `test_backtest_metrics.py` — CAGR, MaxDD, Sharpe, hit rate, n_trades
- `test_backtest_engine.py` — engine smoke tests (com PriceService stub)
- `test_routers.py` — HTTP CRUD + validação k_threshold

## Validação ao vivo (exemplo, 2026-05-06)

QQQ → TQQQ vote-of-2 sobre 10 anos:

| Métrica | Estratégia | QQQ B&H | TQQQ B&H |
|---------|-----------|---------|----------|
| CAGR    | **44.81%**| 21.57%  | 44.15%   |
| MaxDD   | -73.96%   | -35.12% | -81.66%  |
| Sharpe  | 0.95      | 0.99    | 0.89     |
| Trades  | 67        | -       | -        |
| Hit vs bench | 98.13% | -    | -        |

A estratégia bate o buy&hold do TQQQ em CAGR (+0.66pp) com **menos drawdown
(-7.7pp)** e mais que dobra o benchmark QQQ ficando 98% dos dias acima dele.

## Out of scope (por enquanto)

- **LETF synth** para backtest pré-inception (ex: TQQQ pré-2010, MUU pré-2024).
  Backtest atual usa apenas dados reais. Estratégias com LETFs muito recentes
  (ex: MUU com ~23 bars) retornam erro descritivo "Insufficient data".
- Modelagem de impostos (Lei 14.754) e custos (slippage, expense ratio)
- Multi-user / auth
- Notificações externas (email, Discord, Telegram) — apenas banner in-app
- Cestas multi-ticker no risk-on/off
- DSL de expressões de indicador
- Indicadores avançados (HMM, EWMAC, Clenow, VIX scaling)
- Walk-forward / PBO / DSR (gates do estudo)

## Referências

- Plano completo: `~/.claude/plans/generic-tumbling-pond.md`
- Estudo base: `/var/www/pessoal/ai-trade/studies/letf_rotation_hunt`
  - `signals.py` — funções de indicador originais
  - `reports/TIER_3_REPORT.md` — análise da estratégia T3d K=2
