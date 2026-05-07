# Layout: List pages (Estratégias / Indicadores)

> Páginas index. Header igual ao Dashboard (h1 + actions), tabela densa
> com hover-reveal de actions, busca à direita, paginação footer opcional.

---

## Estratégias `/strategies`

```
Estratégias                                                   [⌕ Buscar]  [+ Nova]
12 estratégias · 8 risk-on · 3 borderline · 1 risk-off
─────────────────────────────────────────────────────────────────────────────────
NOME                STATUS    SCORE    BENCH→ON    CAGR     MAXDD    SHARPE   ⋯
QQQ → TQQQ          ●ON       4/4      QQQ→TQQQ    18.2%   -22.1%    0.94    [⤴ ⌫]
SPY → UPRO          ●ON       4/4      SPY→UPRO    16.8%   -19.8%    0.91
SMH → SOXL          ●ON       4/4      SMH→SOXL    24.3%   -34.2%    1.02
MU  → MUU           ◐NO FIO   3/4      MU →MUU      9.1%   -28.4%    0.62
FTEC → TECL         ●ON       4/4      FTEC→TECL   17.1%   -23.8%    0.88
…
─────────────────────────────────────────────────────────────────────────────────
                                                          1–10 de 12  [‹] [›]
```

### SCSS específico

```scss
.list-head {
  display: flex; align-items: flex-end; justify-content: space-between;
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-5);
  border-bottom: 1px solid var(--border);
}
.list-head__sub { color: var(--text-muted); font-size: 12.5px; margin-top: 3px; }
.list-head__actions { display: flex; gap: 8px; }

.search {
  display: flex; align-items: center; gap: 6px;
  height: var(--h-btn);
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);

  input {
    border: none; outline: none; background: transparent;
    font-family: inherit; font-size: 12.5px; color: var(--text-primary);
    width: 180px;
  }
  input::placeholder { color: var(--text-muted); }
}

// status dot + texto na coluna STATUS (em vez de badge cheio na tabela)
.status-cell { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; }
.status-cell::before {
  content: '';
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--text-muted);
}
.status-cell--on::before        { background: var(--success); }
.status-cell--off::before       { background: var(--danger); }
.status-cell--borderline::before{ background: var(--warn); }

// Pagination footer
.pagination {
  display: flex; align-items: center; justify-content: flex-end;
  gap: 12px; padding: 12px 14px;
  font-size: 12px; color: var(--text-muted);
  border-top: 1px solid var(--border-subtle);
}
```

### Comportamento

- **Click no row** (não nas actions) → navega para `/strategies/:id`.
- **Hover row** revela actions à direita (`⤴ Editar`, `⌫ Deletar`). Sempre 2 ações canônicas.
- **Buscar** filtra cliente-side por: nome, ticker (benchmark, riskOn, riskOff).
- **Tabela ordenável**: clicar no header alterna asc/desc; setinha mono ao lado quando ordenando.
- **Paginação** só aparece se `total > 20`. 10 ou 20 por página (toggle).

---

## Indicadores `/indicators`

```
Indicadores                                                   [⌕ Buscar]  [+ Novo]
8 indicadores · 5 momentum · 2 volatility · 1 autocorr
─────────────────────────────────────────────────────────────────────────────────
NOME           TIPO          PARÂMETROS         REGRA              USADO POR    ⋯
SMA200         momentum      lookback=200       price > SMA200     5 estrat.   [⤴ ⌫]
SMA50          momentum      lookback=50        price > SMA50      5 estrat.
Vol21d<40%     volatility    lookback=21        ann_vol < 0.40     5 estrat.
AR(1)_30d>0    autocorr      lookback=30        ar1 > 0            5 estrat.
SMA10          momentum      lookback=10        price > SMA10      0 estrat.
…
```

Layout idêntico — só muda o schema das colunas. **Tipo** vira badge neutral (`badge--neutral`).
**Parâmetros** e **Regra** em `mono`. **Usado por** linka filtrando `/strategies?indicator=:slug`.

```scss
.params-cell { font-family: var(--font-mono); font-size: 11.5px; color: var(--text-secondary); }
.rule-cell   { font-family: var(--font-mono); font-size: 11.5px; }
```

### Empty state

Se 0 indicadores ou 0 estratégias:

```
                       [icon: layers, 24px outline, muted]
                       Nenhuma estratégia ainda
                       Crie sua primeira estratégia para acompanhar
                       transições risk-on/risk-off automaticamente.
                       [+ Nova estratégia]
```

---

## Filtros avançados (futuro — placeholder)

Pill group acima da tabela: `Todas` · `Risk-on` · `Risk-off` · `No fio` · `+ filtro avançado`.
A versão atual da app não tem filtros server-side complexos — mantém client-side.
