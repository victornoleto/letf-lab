# Deploy Score — destravar Crit 3 (gates) e Crit 4 (DSR)

**Data:** 2026-05-07
**Status:** Design aprovado, pronto para writing-plans

## Contexto

O Deploy Readiness Score (`backend/ai_swing/scoring/deploy_score.py`) foi
portado em Fase 2 do estudo `studies/letf_rotation_hunt/scoring.py` com 7
critérios. Dois critérios ficaram hard-coded como `pending`:

- **Critério 3** (Bateria de gates G1–G7, 20 pts) — depende de PBO/DSR/walk-forward/bootstrap
- **Critério 4** (DSR p-value, 10 pts) — depende do mesmo DSR do Crit 3

O `winner_conditions_met` está hard-coded `False` na linha 240, então o tier
`WINNER` é inalcançável. O teto efetivo do score é 70 pts.

Os comentários em `deploy_score.py:6-8` e `deploy-score-card.ts:56` afirmam
"chegam na Fase 3", mas o `README.md:541-542` marcou os gates como **out
of scope** quando a Fase 3 fechou. Resultado: estado inconsistente entre
código e roadmap.

Este design fecha esse gap implementando 4 dos 5 gates relevantes (G2/G3/G6/G7,
sem G1) e destravando o tier WINNER.

## Decisões de escopo

Todas validadas com o usuário em sessão de brainstorming:

1. **G1 (PBO) é pulado.** PBO requer múltiplas configs concorrendo via CSCV;
   o app tem uma estratégia única, não um espaço de busca. Crit 3 é
   recalibrado de `5 gates × 4 pts` para **`4 gates × 5 pts = 20 pts máx`**.
2. **Código matemático é portado, não dependência editable.** Copia-se
   `dsr.py` (PSR + DSR de Bailey-López de Prado) de
   `/var/www/pessoal/ai-trade/src/ai_trade/backtest/validation/dsr.py` para
   dentro do app. Bootstrap (G6) e x-lib (G7) ficam inline porque são
   triviais (~25 + ~15 LOC).
3. **Gates pré-computados no daily job + persistidos no DB.** O bootstrap
   (G6, ~3-5s) é caro demais para rodar a cada hit do endpoint `/deploy-score`.
   Solução: nova tabela `strategy_gates_snapshots`, populada pelo
   `refresh_service.refresh_all` que já roda diariamente. Endpoint lê do DB.
4. **DSR `n_trials = 1` → fallback PSR.** Estratégia única, sem múltiplo
   testing observável dentro do app. Mesma decisão que o study faz
   (`n_trials < 2 → PSR`). PSR mede "probabilidade de Sharpe verdadeiro > 0".

## Arquitetura

```
┌─ scheduler.py (existente)
│   └── _daily_refresh_job
│        └── refresh_service.refresh_all
│             ├── _refresh_one_strategy (já existe — signals/snapshots)
│             └── gates_service.refresh_gates (NOVO — após signals)
│
├─ ai_swing/backtest/validation/  (NOVO submódulo)
│   └── dsr.py                    ← portado de ai-trade
│
├─ ai_swing/scoring/
│   ├── gates.py                  (NOVO) ← G2/G3/G6/G7 + orquestrador
│   └── deploy_score.py           ← refactor: aceita gates_snapshot injetado
│
├─ ai_swing/services/
│   └── gates_service.py          (NOVO) ← compute + persist
│
├─ ai_swing/db/models.py
│   └── StrategyGatesSnapshot     (NOVO model)
│
└─ ai_swing/routers/strategies.py
    └── GET /deploy-score          ← lê snapshot do DB; sem snapshot → pending
```

**Princípio:** `compute_deploy_score` deixa de fazer math caro. Vira
*consumer* de duas fontes — curves do backtest (já existe) + gates do
snapshot (novo). Math caro é responsabilidade exclusiva do daily job.

## Data flow

1. **Daily refresh (~02:00 ET):** `_daily_refresh_job` → `refresh_all` itera
   estratégias. Para cada uma: roda `_refresh_one_strategy` (signals,
   transitions — já existe), depois roda `gates_service.refresh_gates`.
2. **`refresh_gates`:** chama `gates.compute_all_gates(strategy, range_years=10)`,
   persiste em `StrategyGatesSnapshot(strategy_id, asof_date, range_years,
   payload JSON, computed_at)`. Idempotente por `(strategy_id, asof_date,
   range_years)`.
3. **Endpoint `GET /deploy-score`:** busca snapshot mais recente para
   `(strategy_id, range_years)`, passa pra `compute_deploy_score(strategy,
   gates_snapshot=snap)`. Sem snapshot (estratégia recém-criada) → fallback
   `pending` com hint "Aguardando próximo daily refresh".
4. **Falha de gates é não-fatal:** try/except no daily job loop; se G6
   quebrar pra uma estratégia, refresh global continua. Endpoint cai em
   fallback `pending` exatamente como hoje.

## Componentes

### 1. `backend/ai_swing/backtest/validation/dsr.py` (novo)

Portado verbatim de `/var/www/pessoal/ai-trade/src/ai_trade/backtest/validation/dsr.py`
(136 LOC). Funções públicas:

- `psr(returns, benchmark=0.0) -> float` — Probabilistic Sharpe Ratio
- `dsr(returns, n_trials) -> DSRResult` — Deflated Sharpe (com `.p_value`)

Citação em comentário: `[advances_fin_ml, p.222-223, p.275]`. Math estável,
não evolui.

### 2. `backend/ai_swing/scoring/gates.py` (novo)

4 gates puros + orquestrador:

| Gate | Threshold | Implementação |
|---|---|---|
| `g2_dsr_p_value(returns, n_trials=1)` | `p < 0.05` | Default n_trials=1 → PSR fallback |
| `g3_walk_forward(strategy)` | `≥5/8 windows` | Wrapper sobre `compute_walk_forward()` existente |
| `g6_bootstrap_ci(returns, n_resamples=2000, block=21, seed=42)` | `ci_low_sortino > 0` | Block bootstrap, **Sortino** (não Sharpe) para consistência com Crit 1 pós refactor |
| `g7_xlib_cagr_delta(returns)` | `delta_pp ≤ 3.0` | Sanity check `np.cumprod` vs `(1+r).cumprod()` |

Cada gate retorna `dict` com valor + `pass_gate: bool` + campos diagnósticos.
Histórico < 252 dias → `pass_gate=False` com `reason: "insufficient_history"`.

**Orquestrador `compute_all_gates(strategy, range_years=10) -> dict`** chama
os 4 e retorna o payload completo (com `asof_date` e `range_years` aninhados).

### 3. `backend/ai_swing/db/models.py` — novo model

```python
class StrategyGatesSnapshot(Base):
    __tablename__ = "strategy_gates_snapshots"
    __table_args__ = (
        UniqueConstraint("strategy_id", "asof_date", "range_years",
                         name="uq_gates_strategy_asof_range"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    strategy_id: Mapped[int] = mapped_column(
        ForeignKey("strategies.id", ondelete="CASCADE"), index=True
    )
    asof_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    range_years: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    computed_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
```

Padrão segue `BacktestCache` e `SignalSnapshot`. JSON payload: schema livre,
não normalizado em colunas (consumo é leitura única não-queryable).

**Migration:** novo arquivo Alembic em `backend/alembic/versions/006_strategy_gates_snapshots.py` (próximo número após `005_weekly_digests.py`).

### 4. `backend/ai_swing/services/gates_service.py` (novo)

```python
def refresh_gates(db, strategy, range_years=10) -> StrategyGatesSnapshot
def latest_gates(db, strategy_id, range_years=10) -> StrategyGatesSnapshot | None
```

Idempotente: segunda chamada no mesmo dia atualiza payload + `computed_at`.
`latest_gates` ordena por `asof_date.desc()`.

### 5. `backend/ai_swing/services/refresh_service.py` — hook

Dentro do loop existente em `refresh_all`:

```python
for strategy in strategies:
    self._refresh_one_strategy(db, strategy)
    try:
        gates_service.refresh_gates(db, strategy)
    except Exception as exc:
        logger.exception("Gates refresh failed for %s: %s", strategy.id, exc)
```

**Política:** falha de gates pra uma estratégia não aborta o refresh global
das demais. Logada e seguir.

### 6. `backend/ai_swing/scoring/deploy_score.py` — refactor

Nova assinatura:

```python
def compute_deploy_score(
    strategy, range_years=10, bonus_pts=0.0,
    gates_snapshot: StrategyGatesSnapshot | None = None,  # NOVO
) -> DeployScore
```

**Crit 3 (gates):**

```python
def _gates_points(gates: dict | None) -> tuple[float, str, str]:
    if gates is None:
        return 0, "pending", "Aguardando próximo daily refresh"
    flags = [gates["g2_dsr"]["pass_gate"], gates["g3_wf"]["pass_gate"],
             gates["g6_bootstrap"]["pass_gate"], gates["g7_xlib"]["pass_gate"]]
    n_pass = sum(flags)
    pts = 5 * n_pass  # max 20
    status = "ok" if n_pass == 4 else ("warn" if n_pass >= 2 else "fail")
    note = f"{n_pass}/4 gates · G2 {'✓' if flags[0] else '✗'} · G3 {'✓' if flags[1] else '✗'} · G6 {'✓' if flags[2] else '✗'} · G7 {'✓' if flags[3] else '✗'}"
    return pts, status, note
```

**Crit 4 (DSR piecewise):**

```python
def _dsr_points(gates: dict | None) -> tuple[float, str, str]:
    if gates is None:
        return 0, "pending", "Aguardando próximo daily refresh"
    p = gates["g2_dsr"]["p_value"]
    if p < 0.05: return 10, "ok",   f"DSR p={p:.3f} (PSR, n_trials=1)"
    if p < 0.10: return 7,  "warn", f"DSR p={p:.3f} marginal"
    if p < 0.20: return 3,  "warn", f"DSR p={p:.3f} fraco"
    return 0, "fail", f"DSR p={p:.3f} insuficiente"
```

**WINNER destravado** — substituir linha 240:

```python
winner_conditions_met = (
    gates is not None
    and gates["g2_dsr"]["pass_gate"]
    and gates["g6_bootstrap"]["pass_gate"]
    and gates["g7_xlib"]["pass_gate"]
    and edge_passed              # já calculado, edge >= 0.05
    and underwater_bar_passed    # já calculado, pct_above >= 0.95
)
```

G3 entra na soma de pts mas **não** é WINNER-bloqueante (paridade com
study `scoring.py:347-354`).

### 7. `backend/ai_swing/routers/strategies.py` — endpoint

```python
gates_snap = gates_service.latest_gates(db, strategy.id, range_years=range_years)
return compute_deploy_score(strategy, range_years=range_years,
                            bonus_pts=bonus_pts, gates_snapshot=gates_snap)
```

### 8. Script de backfill (one-shot)

Novo `backend/scripts/refresh_gates.py` (segue padrão de `backend/scripts/seed.py`).
Aceita flag `--strategy-id N` ou `--all`. Itera estratégias e chama
`gates_service.refresh_gates` pra cada uma. Uso:

```bash
cd backend && python -m scripts.refresh_gates --all
```

Roda após deploy para popular snapshots imediatamente, em vez de esperar
o próximo daily run às 02:00 ET.

### 9. Limpeza de comentários enganosos

Remover/atualizar:

- `backend/ai_swing/scoring/deploy_score.py:6-8` (docstring)
- `backend/ai_swing/scoring/deploy_score.py:13-14` (comentário criterion)
- `backend/ai_swing/scoring/deploy_score.py:255-262` (notes em criteria 3/4)
- `frontend/src/app/pages/strategy-detail/deploy-score-card.ts:56` (hint)

O hint do frontend só aparece se `gates_snapshot is None` no payload.

## Testing

### Novos arquivos

**`backend/tests/test_dsr.py`** — sanidade do código portado:
- `test_psr_smoke`, `test_dsr_smoke` — shape do retorno, valores em [0,1]
- Reusar fixtures conhecidas do study se houver

**`backend/tests/test_gates.py`:**
- `test_g2_dsr_psr_fallback` — n_trials=1, série randômica longa
- `test_g2_dsr_insufficient_history` — < 252 dias → fail
- `test_g3_walk_forward_wraps_existing` — formato + n_pass bate
- `test_g6_bootstrap_seed_stable` — seed=42 determinístico
- `test_g6_bootstrap_passes_strong_strategy` — alpha positivo + baixa vol → CI low > 0
- `test_g6_bootstrap_fails_zero_alpha` — ruído puro N(0, σ) → CI low ≤ 0
- `test_g7_xlib_passes_normal_returns` — delta_pp ≈ 0
- `test_compute_all_gates_smoke` — orquestrador integra os 4

**`backend/tests/test_gates_service.py`:**
- `test_refresh_gates_creates_snapshot` — primeira chamada cria row
- `test_refresh_gates_idempotent` — segunda chamada atualiza payload + computed_at
- `test_latest_gates_returns_most_recent` — ordena por asof_date desc
- `test_refresh_gates_failure_isolated` — exception não corrompe DB

### Edits em testes existentes

**`backend/tests/test_deploy_score.py`:**
- Fixtures: `gates_snapshot_all_pass`, `gates_snapshot_partial`, `None`
- `test_winner_tier_unlocks_when_all_gates_pass` — total ≥ 90 + strict bars + gates ok → `tier_label == "WINNER"`
- `test_falls_back_to_pending_without_snapshot` — sem snapshot retorna `pending` (paridade Fase 2)

**`backend/tests/test_refresh_service.py`** (se existe; senão criar):
- `test_refresh_all_continues_when_gates_fail` — gates levantam exception, demais estratégias seguem

## Critério de pronto

- ✅ `pytest backend/tests/` 100% verde
- ✅ Estratégia tier-3 referenciada em `README.md:515-516` (7/8 walk-forward windows passam) retorna pontos reais em Crit 3 e 4
- ✅ Tier WINNER alcançável (validação manual após backfill com estratégia que passe nos 4 gates + strict bars)
- ✅ Daily job log mostra `Gates refresh done` por estratégia
- ✅ Frontend `deploy-score-card.ts` linha 56: hint pendente atualizado para "Aguardando próximo daily refresh"; some quando snapshot existe

## Build sequence

| # | Step | Justificativa |
|---|---|---|
| 1 | Portar `dsr.py` + `test_dsr.py` | Fundação isolada, sem deps internas |
| 2 | Criar `scoring/gates.py` + `test_gates.py` | Builds em cima de #1 |
| 3 | Migration + model `StrategyGatesSnapshot` | Schema antes do service |
| 4 | `services/gates_service.py` + `test_gates_service.py` | Camada de DB |
| 5 | Hook em `refresh_service.refresh_all` (try/except defensivo) | Wire daily job |
| 6 | Refactor `compute_deploy_score` + endpoint | Consume layer |
| 7 | Atualizar `test_deploy_score.py` | Garantir contratos |
| 8 | Atualizar comentários docstrings + frontend hint | Limpeza textual |
| 9 | Script `backend/scripts/refresh_gates.py` | Operacional, padrão `seed.py` |

Cada step é commitable e testável isoladamente.

## Não-objetivos

- ❌ Implementar G1 (PBO) — decisão de escopo
- ❌ Visualização nova no frontend (UI atual já comporta breakdown 7-criterion)
- ❌ Trazer `pbo.py`, `cpcv.py`, `permutation.py` do projeto irmão (não usados)
- ❌ Paralelização do daily job (otimização futura, mover para "out of scope" do roadmap)
- ❌ Histórico de gates além do mais-recente (snapshot acumula no DB, mas leitura é "latest")
- ❌ Atualizar `README.md` Roadmap status (documentação de roadmap é decisão do usuário pós-implementação)

## Custo estimado

- **Runtime adicional ao daily job:** ~5s por estratégia × N estratégias.
  Para 50 estratégias: ~4 min adicionado ao job que hoje leva ~1-2 min.
  Aceitável (job roda às 02:00 ET, em background).
- **DB:** uma row por (estratégia, dia, range_years) na nova tabela. JSON
  payload ~2KB. Para 50 estratégias × 1 ano: ~36MB. Trivial.
- **Endpoint `/deploy-score`:** latência mantida em ms (lê do DB), zero regressão.

## Referências

- Code: `studies/letf_rotation_hunt/gates.py` (canônico)
- Code: `studies/letf_rotation_hunt/scoring.py` (rubric v2)
- Code: `/var/www/pessoal/ai-trade/src/ai_trade/backtest/validation/dsr.py` (origem do port)
- Paper: López de Prado, *Advances in Financial Machine Learning*, p.196-223
- App existente: `backend/ai_swing/backtest/walk_forward.py` (G3 já implementado)
