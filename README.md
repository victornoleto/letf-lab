# AI-Swing

Personal ETF/LETF rotation monitor + analysis lab. Operacionaliza a estratégia
**vote-of-K** (Tier 3 do estudo `letf_rotation_hunt`) para múltiplos pares
benchmark→LETF e expõe na UI as mesmas camadas analíticas do estudo: crisis
attribution, deploy-readiness scoring, robustness heatmap, walk-forward
validation, cohort entry stress, tax-aware net curves e A/B comparator.

## Conceito

Cada **estratégia** define:
- Um **benchmark** (ex: QQQ) — sobre o qual rodam os indicadores
- Um **risk-on** (ex: TQQQ) — comprado quando ≥k indicadores estão verdes
- Um **risk-off** (ex: ZROZ) — comprado caso contrário
- Um conjunto de indicadores configuráveis (SMA, EMA, vol, AR(1))
- Um threshold **k** (mínimo de gates verdes para entrar em risk-on)

Inspirada no estudo
[`letf_rotation_hunt`](../ai-trade/studies/letf_rotation_hunt) (T3d K=2).
As funções de indicador (`sma_gate`, `ema_gate`, `realized_vol_gate`,
`ar1_coefficient`, `vote_of_k`) foram portadas verbatim e validadas por
**testes de paridade** (`np.testing.assert_allclose` vs `signals.py`).

> **Métrica primária: Sortino, não Sharpe.**
> O re-análise do estudo
> ([`SORTINO_REANALYSIS_REPORT.md`](../ai-trade/studies/letf_rotation_hunt/reports/SORTINO_REANALYSIS_REPORT.md))
> mostra que a edge LETF vs benchmark cresce ~55 % sob Sortino vs Sharpe
> (+0.264 vs +0.171 em lh_56y gross). LETFs com filtro de tendência geram
> distribuições right-skewed, e Sortino captura o upside assimétrico ao
> penalizar apenas a semideviação adversa. A app expõe Sortino em todas as
> tabelas, heatmaps e scoring; Sharpe permanece no código apenas para
> diagnóstico.

---

## Telas e Fluxos

### Dashboard (`/dashboard`)
Grid de cards (um por estratégia) com:
- Status atual (Risk-on / No fio / Risk-off) + score k/n
- **Indicator Headroom badges** — cada indicador mostra o sinal `+2.3%` ou
  `-1.1%` indicando quão longe está de virar (verde se passa com folga,
  âmbar se < 5% de margem, vermelho se já estourou). O cálculo vem do
  `evaluator` e é persistido em `signal_snapshots.indicator_results`.
- Sparkline 90d
- AI report card (headline + body, gerados via OpenCode CLI)

### Strategies (`/strategies`)
Tabela com nome, status badge, score bar, tickers, k, n_indicators.
- **Buscar** por nome ou ticker
- **Clonar** estratégia — duplica com nome único derivado (`<nome> (clone)`,
  `(clone 2)`, …); copia tickers + indicador membership; **não** copia
  snapshots/transitions/reports (recomputados no próximo refresh).
  Redireciona pra `/strategies/{novo_id}/edit` pra você ajustar a variant.
- Editar / remover

### Strategy Detail (`/strategies/:id`)
Tudo sobre uma estratégia. Da seguinte ordem:

1. **Header + meta-bar**: nome, tickers, status, score atual, link Editar,
   dropdown **"Comparar com…"** (escolha outra estratégia → vai pro
   comparator A/B em `/compare`).

2. **Deploy Readiness Score Card** (0–100). Replica o scoring v2 do estudo
   (`scoring/deploy_score.py`) com 7 critérios:
   - **(1) Sortino edge** vs benchmark: tier ≥0.05 → 10 pts, ≥0.15 → 20,
     ≥0.30 → 30
   - **(2) Underwater vs benchmark**: pct_time_above_benchmark + min_relative_equity
     em escada (15/12/9/6 pts)
   - **(3) Bateria de gates G1–G7**: pendente (Fase 3 do roadmap futuro,
     PBO/DSR/walk-forward expandido)
   - **(4) DSR p-value**: pendente
   - **(5) OOS + FWD pós-2020**: split 70/30 + slice ≥ 2020-01-01, Sortino
     positivo em cada vale 5 pts
   - **(6) Crisis attribution vs SPY**: 2.5 pts × cada crise vencida
   - **(7) Bônus discricionário**: 0–5 (manual via query param)
   - Tier mapping: FAIL / NEAR_FAIL / MARGINAL / PROMISING / STRONG / WINNER
   - Card é colapsável, mostra breakdown por critério com status (ok/warn/fail/pending)

3. **AI Report card** (se há report do dia). Headline + body PT-BR
   gerados via OpenCode CLI; botão "Regenerar" chama `POST
   /api/strategies/{id}/report` (force=true).

4. **Tab "Principal"** vs **"Indicadores"**:

   **Principal**:
   - **Backtest Panel** — equity curves estratégia / benchmark B&H / risk-on
     B&H; ratio strategy/benchmark; tabela de métricas (CAGR, MaxDD,
     Sortino, n_trades, hit rate). Pills de range (3/5/10/20y), botão Rerun
     (`force=true`) e **toggle "Net"** que adiciona uma row "Estratégia · Net"
     com Sortino_net + CAGR_net pós Lei 14.754, mais um footnote com o tax
     drag em pp Sortino.
   - **Crisis Lab** — grid 2×2 com mini-charts ECharts pras 4 janelas
     canônicas (Dotcom 2000–02, GFC 2008–09, COVID 2020, alta-de-juros
     2022). Cada chart sobrepõe a equity da estratégia + SPY, ambos
     renormalizados em 100 no início. Verdict por janela: BATE / PERDE /
     SEM DADOS, mais o agregado "N de M crises elegíveis".
   - **Walk-Forward Validation** — 8 janelas cronológicas não-sobrepostas;
     gate G3 do estudo (passa quando estratégia ficou ≥50% dos dias acima
     do benchmark, renormalizado intra-janela). Tabela com Sortino, CAGR,
     MaxDD, % acima bench, verdict PASS/FAIL por linha; badge agregado
     "N de M passa".
   - **Robustness Heatmap** — Sortino para cada combinação (entry_date
     trimestral × window_size em [3,5,10,20]y). ECharts heatmap com
     gradiente vermelho→verde; tooltip mostra entry, window, Sortino, %
     acima bench. Identifica os piores entry points históricos.
   - **Cohort Entry** — tabela com 8 datas canônicas (Black Monday 1987,
     dotcom peak 2000, dotcom recovery 2003, GFC peak 2007, GFC trough
     2009, COVID peak 2020, ATH 2021, rate-hike 2022) e CAGR/Sortino/MaxDD
     forward `forward_years` (default 5y) pra cada uma. Cores por threshold.
   - **Signal History** — tabela com snapshots por dia (date, score/total,
     risk_on, indicator_results).

   **Indicadores**:
   - Per-indicador time series (range dropdown 1y/3m/etc), incluindo a
     banda do threshold como tunnel preenchido para SMA/EMA com hysteresis.

### Compare (`/compare?a=&b=`)
Comparator A/B side-by-side. Header com os dois nomes (link clicável).
- **Equity overlay** ECharts em log-scale com 3 séries: Estratégia A,
  Estratégia B, Benchmark da A.
- **Tabela de métricas Δ**: CAGR, Sortino gross, Sortino net, MaxDD, Tax
  drag, Deploy Score. Coluna `Δ (B − A)` colorida verde/vermelho conforme
  direção benéfica.
- **Deploy Score grid** lado a lado com tier badges.
- **Crisis attribution table** com verdicts e % acima SPY pra cada crise.

### Indicators (`/indicators`)
CRUD do catálogo fechado: SMA_GATE, EMA_GATE, VOL_GATE, AR1_GATE.
- Schema dinâmico via `GET /api/indicators/types` (each type: param schema +
  defaults)
- Form com fields condicionais por tipo (SMA: period; VOL: window+threshold; etc.)
- 409 ao tentar deletar indicador em uso por alguma estratégia.

### Portfolio (`/portfolio`)
Tabs Posições / Transações.

**Posições**:
- Toggle **USD / BRL** no topo. Quando BRL, todos os números são multiplicados
  pelo close de hoje do `BRL=X` (yfinance), com a taxa exibida no subtítulo.
  Formatação `pt-BR` quando BRL ativo.
- Totals row (Investido, Mercado, P/L) + tabela com avg cost, invested,
  current price, market value, P/L por ticker.

**Transações**:
- CRUD completo. Modal com fields: data, ticker, side (Buy/Sell), n_shares,
  preço, moeda, fx_rate_to_usd, fees, notas, strategy_id (FK opcional).
- O cálculo USD usa `(n_shares × price + fees) × fx_rate_to_usd` agregado
  por ticker; sells reduzem shares mas preservam custo médio (P&L externo).

### Weekly Digest (`/digest`)
Lista cronológica dos digests semanais. Cada card mostra:
- Semana (segunda → domingo)
- Body markdown renderizado (renderer mínimo: bullets, h1–h3, **bold**, `code`)
- Botão "Gerar para esta semana" pra rodar manualmente.

Os digests são gerados via OpenCode CLI a partir de um JSON com transitions
da semana, indicadores em zona crítica (|headroom| < 2%) e snapshots por
estratégia. Cron automático: **toda segunda 09:00 ET** (após o refresh
diário de domingo à noite).

### Settings (`/settings`)
Layout de 2 colunas (vertical nav + form rows). Seção "Aparência" com
theme switch 3-pill (light / dark / auto, persistido em localStorage).

### Login (`/login`)
Tela full-screen (no shell), centered card: brand SVG + email + senha +
botão "Entrar". JWT em HttpOnly cookie.

### Chat Drawer (FAB global)
Floating button no canto inferior direito do shell em todas as páginas
autenticadas. Click abre drawer 380px com:
- Transcript persistido em localStorage (último 60 turns)
- Input com Enter pra enviar, Shift+Enter pra nova linha, ESC pra fechar
- Backend: `POST /api/chat` recebe `{question, include_portfolio}`,
  serializa as estratégias / snapshots / transitions 90d / portfolio summary
  num bundle JSON, manda pro CLI e devolve texto PT-BR.
- Bom pra perguntas livres tipo *"qual minha estratégia mais vulnerável a
  um cenário tipo 2008?"* ou *"algum indicador está perto de virar?"*.

### Banner de transições
Top do shell mostra flips dos últimos 7 dias (pode dispensar; persistido
em sessionStorage).

### Refresh manual
Botão no shell dispara `POST /api/refresh` (debounce 5min). Roda a mesma
rotina do cron diário.

---

## Pipeline de IA: OpenCode CLI

Toda a "análise da IA" da app passa por um wrapper local
(`backend/ai_swing/services/ai_cli.py`) sobre o **OpenCode CLI**
(`opencode run --format json`). Vantagens vs SDK Anthropic anterior:

- Custo zero por chamada via OAuth do OpenCode (tier OpenAI grátis)
- Prompts versionáveis em arquivos (`backend/prompts/*.md` e `*.txt`),
  editáveis sem tocar código
- Configurável via env: `AI_CLI_COMMAND`, `AI_CLI_MODEL` (default
  `openai/gpt-5.4-mini-fast`), `AI_CLI_TIMEOUT_S`, `AI_CLI_PROMPTS_DIR`
- Reusado por: per-strategy reports (`ai_reports.py`), chat on-demand
  (`ai_chat.py`), weekly digest (`weekly_digest.py`)
- Resposta vem como stream JSONL; o wrapper concatena os eventos
  `type=="text"` e levanta `RuntimeError` em eventos de erro upstream

Se `AI_CLI_COMMAND` for vazio, todos os componentes de IA viram no-op
(`is_configured()` retorna False). Resto da app continua funcionando.

---

## Cron / Scheduler (APScheduler in-process)

Dois jobs ativos:

1. **Daily refresh** — todo dia 22:00 ET (config `REFRESH_HOUR_ET`):
   - Busca preços recentes via yfinance (30 dias)
   - Re-computa snapshot pra cada estratégia ativa
   - Detecta transições (flip risk-on ↔ risk-off)
   - Gera AI report pra cada estratégia (`ai_reports.generate_report`)
2. **Weekly digest** — toda segunda 09:00 ET:
   - Coleta transitions da semana + indicadores em zona crítica
   - Gera digest markdown PT-BR via `weekly_digest.generate_digest`
   - Persiste em `weekly_digests` keyed por `week_start` (segunda)

---

## Endpoints da API

```
# Health
GET    /api/health

# Indicators
GET    /api/indicators/types
GET    /api/indicators
POST   /api/indicators
GET    /api/indicators/{id}
PUT    /api/indicators/{id}
DELETE /api/indicators/{id}

# Strategies
GET    /api/strategies
POST   /api/strategies
GET    /api/strategies/{id}
PUT    /api/strategies/{id}
DELETE /api/strategies/{id}
POST   /api/strategies/{id}/clone
GET    /api/strategies/{id}/indicator-series
GET    /api/strategies/{id}/report
POST   /api/strategies/{id}/report                  # force regenerate
GET    /api/strategies/{id}/deploy-score?range_years=10&bonus_pts=0
GET    /api/strategies/{id}/crisis-attribution
GET    /api/strategies/{id}/cohort-entry?forward_years=5

# Signals
GET    /api/signals/{strategy_id}/history?range=1y
GET    /api/signals/{strategy_id}/transitions?limit=50
GET    /api/signals/transitions/recent?days=7

# Backtest
POST   /api/backtest/{strategy_id}?range_years=10&force=false
POST   /api/backtest/{strategy_id}/walk-forward?n_windows=8
POST   /api/backtest/{strategy_id}/rolling-stress?step_months=3

# Compare
GET    /api/compare?strategy_a=&strategy_b=&range_years=10

# Refresh
POST   /api/refresh?force=false
GET    /api/refresh/status

# Auth
POST   /api/auth/login
POST   /api/auth/logout

# Transactions / portfolio
GET    /api/transactions
POST   /api/transactions
PUT    /api/transactions/{id}
DELETE /api/transactions/{id}
GET    /api/portfolio?currency=USD|BRL

# AI
POST   /api/chat                                     # body: {question, include_portfolio}
GET    /api/weekly-digest?limit=12
POST   /api/weekly-digest/regenerate?week_start=YYYY-MM-DD
```

---

## Stack

**Backend**:
- Python 3.11+ (testado em 3.12)
- FastAPI + uvicorn (porta 8000)
- SQLAlchemy 2.x + Alembic
- pandas + numpy + pyarrow
- yfinance (cache parquet local em `data/prices/`)
- APScheduler (cron in-process)
- pytest (90 testes, incluindo paridade vs estudo)

**Frontend**:
- Angular 21 (standalone components, signals, zoneless, control flow `@for/@if`)
- ECharts via `ngx-echarts` (line, heatmap, scatter)
- HttpClient com fetch
- TypeScript strict
- CSS/SCSS direto (sem framework UI externo, design tokens centralizados em
  `styles/tokens.scss`)

**Storage**:
- SQLite ou PostgreSQL (`DATABASE_URL`) — SQLite default em
  `data/ai_swing.db`. 10 tabelas: `indicators`, `strategies`,
  `strategy_indicators`, `signal_snapshots`, `signal_transitions`,
  `backtest_cache`, `refresh_logs`, `users`, `transactions`,
  `strategy_reports`, `weekly_digests`.
- Parquet (`data/prices/*.parquet`) — cache de preços por ticker. **Auto
  re-prime**: caches com <100 rows são tratados como never-primed e re-
  fetched via `period="max"` na próxima leitura (corrige tickers que só
  receberam o refresh diário de 30d).

---

## Estrutura

```
ai-swing/
├── backend/
│   ├── ai_swing/
│   │   ├── main.py                    # FastAPI app factory + lifespan
│   │   ├── config.py                  # pydantic Settings (.env)
│   │   ├── scheduler.py               # APScheduler bootstrap (daily + weekly)
│   │   ├── auth/                      # JWT + bcrypt
│   │   ├── db/                        # SQLAlchemy Base + models
│   │   ├── schemas/                   # Pydantic DTOs (signal, strategy, backtest, crisis,
│   │   │                              #   deploy_score, walk_forward, rolling_stress,
│   │   │                              #   cohorts, compare, chat, weekly_digest)
│   │   ├── indicators/
│   │   │   ├── functions.py           # sma_gate, ema_gate, vol, ar1, vote_of_k
│   │   │   ├── catalog.py             # IndicatorType enum + param schemas
│   │   │   └── evaluator.py           # type+params → IndicatorResult (com headroom_pct)
│   │   ├── data/                      # yfinance loader + parquet cache (com auto re-prime)
│   │   ├── backtest/
│   │   │   ├── engine.py              # T+1 vote-of-K rotation; compute_strategy_curves +
│   │   │   │                          #   run_backtest (gross + net curves)
│   │   │   ├── metrics.py             # CAGR, MaxDD, Sortino, Sharpe, hit_rate
│   │   │   ├── tax_layer.py           # Lei 14.754 annual_realize DARF
│   │   │   ├── crisis.py              # 4 crisis windows + verdict
│   │   │   ├── walk_forward.py        # 8 chronological splits + G3 gate
│   │   │   ├── rolling_stress.py      # heatmap Sortino × entry_date × window_years
│   │   │   ├── cohorts.py             # 8 canonical entry dates × forward N years
│   │   │   └── cache.py               # backtest cache (24h, config_hash)
│   │   ├── scoring/
│   │   │   └── deploy_score.py        # 7-criterion v2 rubric port
│   │   ├── services/                  # strategy_service, signal_service, refresh_service,
│   │   │                              #   ai_cli, ai_reports, ai_chat, weekly_digest,
│   │   │                              #   compare, portfolio, indicator_series
│   │   └── routers/                   # FastAPI endpoints (auth, indicators, strategies,
│   │                                  #   signals, refresh, backtest, compare, chat,
│   │                                  #   weekly_digest, transactions)
│   ├── prompts/                       # PT-BR prompts versionáveis (system + user templates)
│   │   ├── strategy_report.system.md
│   │   ├── strategy_report.user.txt
│   │   ├── portfolio_chat.system.md
│   │   ├── portfolio_chat.user.txt
│   │   ├── weekly_digest.system.md
│   │   └── weekly_digest.user.txt
│   ├── alembic/versions/              # 5 migrations
│   ├── tests/                         # 90 testes (paridade, indicators, evaluator, engine,
│   │                                  #   metrics, tax, crisis, walk_forward, rolling_stress,
│   │                                  #   cohorts, deploy_score, compare, ai_cli, ai_chat,
│   │                                  #   weekly_digest, routers)
│   └── scripts/seed.py                # populador de exemplos
├── frontend/
│   └── src/app/
│       ├── app.ts/.html               # shell (sidebar, banner transitions, FAB chat)
│       ├── app.routes.ts              # rotas (dashboard, strategies/*, indicators/*,
│       │                              #   portfolio, compare, digest, settings, login)
│       ├── core/                      # api.service, auth.service/guard/interceptor, models
│       ├── shared/
│       │   ├── chat-drawer/           # FAB + drawer com transcript localStorage
│       │   ├── charts/                # tokens + helpers ECharts
│       │   ├── confirm/, modal/, toast/, palette/, theme/, loading-bar/
│       └── pages/
│           ├── dashboard/             # cards + sparkline + headroom badges
│           ├── strategies/            # list + form (com Clonar action)
│           ├── strategy-detail/       # header + deploy-score-card + report-card +
│           │                          #   backtest-panel (toggle Net) + crisis-lab +
│           │                          #   walk-forward-panel + robustness-heatmap +
│           │                          #   cohort-entries + signal-history-table +
│           │                          #   indicators-tab + dropdown "Comparar com…"
│           ├── compare/               # equity overlay + métricas Δ + deploy grid +
│           │                          #   crisis table
│           ├── indicators/            # list + form
│           ├── portfolio/             # tabs Posições/Transações com toggle USD/BRL
│           ├── digest/                # weekly digests com markdown render
│           ├── settings/, login/, not-found/
└── data/
    ├── ai_swing.db                    # SQLite (ou via DATABASE_URL postgres)
    └── prices/                        # *.parquet (auto re-prime se < 100 rows)
```

---

## Quickstart

```bash
cd /var/www/pessoal/ai-swing
make install    # backend (uv pip install -e) + frontend (npm install)
make migrate    # alembic upgrade head → cria SQLite em data/ai_swing.db
make seed       # cria 4 indicadores + 5 estratégias-exemplo + user
make dev        # sobe backend (8000) + frontend (4200) em paralelo
```

Acesse `http://localhost:4200`. Login com o user criado pelo seed.

Estratégias seed (todas k=2 sobre {SMA200, SMA50, Vol21d<40%, AR(1)_30d>0}):
- QQQ → TQQQ
- SPY → UPRO
- SMH → SOXL
- MU → MUU
- FTEC → TECL

Risk-off em todas: ZROZ.

---

## Configuração

`backend/.env` (copie de `.env.example`):

```
DATABASE_URL=sqlite:///../data/ai_swing.db
PRICE_CACHE_DIR=../data/prices
REFRESH_HOUR_ET=22
LOG_LEVEL=INFO
ALLOW_ORIGINS=http://localhost:4200,http://127.0.0.1:4200

# Auth (JWT)
AUTH_JWT_SECRET=change-me
AUTH_TOKEN_TTL_HOURS=24
AUTH_COOKIE_SECURE=false
AUTH_COOKIE_NAME=ai_swing_session

# AI CLI (OpenCode by default)
AI_CLI_COMMAND=opencode
AI_CLI_MODEL=openai/gpt-5.4-mini-fast
AI_CLI_TIMEOUT_S=60
AI_CLI_PROMPTS_DIR=prompts

# Optional / deprecated — kept for backwards-compat. Prefer AI_CLI_* above.
ANTHROPIC_API_KEY=
```

---

## Make targets

- `make install` — instala backend + frontend
- `make migrate` — `alembic upgrade head`
- `make seed` — popula indicadores + estratégias-exemplo
- `make dev` — backend + frontend em paralelo (foreground)
- `make backend` / `make frontend` — só um lado
- `make test` / `make test-backend` / `make test-frontend`
- `make refresh` — dispara `POST /api/refresh`
- `make clean` — remove caches

---

## Testes

```bash
cd backend && source .venv/bin/activate && pytest -v
```

Cobertura (90 testes):
- `test_indicators.py` — funções puras + **paridade** vs `letf_rotation_hunt/signals.py`
- `test_evaluator.py` — dispatcher type+params → função + headroom signed delta
- `test_backtest_metrics.py` — CAGR, MaxDD, Sortino, Sharpe (formula manual + right-skew test)
- `test_backtest_engine.py` — engine smoke + guard de janela curta (<60 bars)
- `test_tax_layer.py` — Lei 14.754 annual_realize (year-end DARF, carry-forward)
- `test_crisis_attribution.py` — 4 crisis windows com fixtures sintéticas
- `test_deploy_score.py` — todos os critérios + integração end-to-end
- `test_rolling_stress.py` — grid 4×N + edge cases
- `test_cohorts.py` — 8 entry dates + has_data flag
- `test_walk_forward.py` — N janelas + pass count
- `test_compare.py` — comparator service
- `test_ai_cli.py` — wrapper OpenCode (mock subprocess + JSONL parsing)
- `test_ai_chat.py` — chat service (config gating, length limits, argv)
- `test_weekly_digest.py` — Monday helper, cache reuse, force regenerate
- `test_routers.py` — HTTP CRUD + clone unique-name + k_threshold validation

---

## Validação ao vivo (exemplo, 2026-05-07, dados reais)

QQQ → TQQQ vote-of-2 sobre 10 anos:

| Métrica          | Estratégia | QQQ B&H | TQQQ B&H |
|------------------|-----------:|--------:|---------:|
| CAGR (gross)     |    44.81 % | 21.57 % | 44.15 %  |
| CAGR (net L. 14.754) | 38.57 % | —     | —        |
| MaxDD            |   −73.96 % | −35.12 % | −81.66 % |
| **Sortino (gross)** |   1.348 | 0.79    | 1.10     |
| Sortino (net)    |     1.223 | —       | —        |
| Tax drag         | 0.125 pp Sortino | — | —    |
| Trades           |        67 | —       | —        |
| Hit vs bench     |   98.13 % | —       | —        |

A estratégia bate o buy&hold do TQQQ em CAGR (+0.66 pp) com **menos drawdown
(−7.7 pp)** e mais que dobra o benchmark QQQ ficando 98 % dos dias acima
dele. Sortino significativamente maior que Sharpe (1.348 vs 0.96), confirmando
o upside assimétrico capturado pelo filtro de tendência.

Walk-forward: **7 de 8 janelas passam** (única falha: 2022-04 → 2024-04
com pct_above 19 %, capturando o cenário de alta de juros).

---

## Roadmap status

Concluído (Fases 1–4 do roadmap original + Sortino refactor):
- ✅ **Fase 1** — Migração IA (Anthropic SDK → OpenCode CLI), Indicator
  Headroom Visual, Strategy Clone
- ✅ **Fase 2** — Crisis Lab, Deploy Readiness Score, Robustness Heatmap,
  Cohort Entry
- ✅ **Fase 3** — Tax-Aware Net (Lei 14.754), Walk-Forward Validation,
  Multi-Currency Portfolio (USD/BRL)
- ✅ **Fase 4** — Variant Comparator A/B, AI on-demand chat, Weekly Digest
- ✅ **Sortino refactor** — primary risk-adjusted metric agora é Sortino
  (Sharpe permanece como helper para diagnóstico)
- ✅ **Cache hardening** — auto re-prime de parquets sub-100 rows + guard
  de backtest mínimo 60 bars

Out of scope (deliberado):
- Alertas externos (Telegram/Discord/Email)
- Indicadores avançados (HMM, EWMAC, Clenow, VIX scaling)
- LETF synth pré-inception
- DSL de expressões de indicador
- Multi-user collab / RBAC
- Walk-forward gates G1/G2/G6/G7 (PBO/DSR/bootstrap/x-lib) — Crit 3 e 4 do
  Deploy Score continuam pendentes

---

## Referências

- Plano completo (interno): `~/.claude/plans/ancient-moseying-cook.md`
- Estudo base: `/var/www/pessoal/ai-trade/studies/letf_rotation_hunt`
  - `signals.py` — funções de indicador originais
  - `scoring.py` — rubric v2 (port em `scoring/deploy_score.py`)
  - `tax_layer.py` — Lei 14.754 (port em `backtest/tax_layer.py`)
  - `reports/TIER_3_REPORT.md` — análise da estratégia T3d K=2
  - `reports/SORTINO_REANALYSIS_REPORT.md` — fundamentação da migração
    Sharpe → Sortino
  - `reports/COHORT_ROBUSTNESS_REPORT.md` — 8 cohort entry dates
  - `reports/THRESHOLD_SWEEP_REPORT.md` — 37k rolling-window backtests
