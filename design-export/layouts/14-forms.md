# Layout: Forms (Strategy / Indicator)

> Formulários **NÃO são modais dialog**. São telas (rotas próprias):
> `/strategies/new`, `/strategies/:id/edit`, `/indicators/new`, `/indicators/:id/edit`.
> Layout single-column 560px, hint mono abaixo de cada campo, footer sticky com `Cancelar` / `Salvar`.

---

## Strategy form `/strategies/new`

```
← Estratégias

Nova estratégia
─────────────────────────────────────────────────────────────────────────
Nome
[QQQ → TQQQ vote-of-2_______________________________________________]
12/64 caracteres

Benchmark ticker
[QQQ_____________]
Index/ETF de referência (ex: QQQ, SPY, IWM)

Risk-on ticker            Risk-off ticker
[TQQQ____________]        [SHV____________]
Quando indicators ativos  Quando indicators desativam

Indicadores (k de N)        k mínimo: [2▿]
[✓ SMA200]  [✓ SMA50]  [✓ Vol21d<40%]  [✓ AR(1)_30d>0]  [+ adicionar]
4 selecionados · 2 mínimos para risk-on

Janela de backtest
[10y▿]  início: 2016-05-09  fim: 2026-05-06

─────────────────────────────────────────────────────────────────────────
                                              [Cancelar]  [Salvar e rodar]
```

---

## SCSS

```scss
.form {
  max-width: 560px;
  padding: var(--space-7) 0 var(--space-10);
}

// .field, .label, .input, .hint, .error → 04-components.md §4

// Linha com 2 campos lado a lado (risk-on / risk-off)
.row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

// Chip multi-select (indicadores)
.chips-field { display: flex; flex-wrap: wrap; gap: 6px; }

// k-min selector inline
.kmin {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11.5px; color: var(--text-muted);
}
.kmin select {
  height: var(--h-btn-sm);
  padding: 0 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--text-primary);
}

// Footer sticky com 2 ações
.form-footer {
  position: sticky;
  bottom: 0;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 0;
  margin-top: var(--space-7);
  background: linear-gradient(to top, var(--bg) 70%, transparent);
}
```

---

## Validação

| Campo              | Regra                                                     | Mensagem (`.error`)                    |
|--------------------|-----------------------------------------------------------|----------------------------------------|
| Nome               | required, ≤ 64 chars                                      | `Nome é obrigatório`                   |
| Benchmark          | required, ticker pattern `^[A-Z]{1,6}$`                   | `Ticker inválido (ex: QQQ)`            |
| Risk-on ticker     | required, ticker pattern, ≠ benchmark                     | `Não pode ser igual ao benchmark`      |
| Risk-off ticker    | required, ticker pattern, ≠ risk-on                       | `Não pode ser igual ao risk-on`        |
| Indicadores        | min 1 selecionado                                         | `Selecione ao menos 1 indicador`       |
| k mínimo           | 1 ≤ k ≤ N                                                 | (auto-bound, sem mensagem)             |

Validação **on blur** (não on input — evita ruído enquanto o usuário ainda digita).
**On submit** valida tudo de novo, foca primeiro inválido.

---

## Estados

### Empty (Nova)
- Todos os campos vazios.
- Botão `Salvar e rodar` desabilitado até passar validação básica.

### Editing
- Header: `Editar QQQ → TQQQ vote-of-2`.
- Campos pré-preenchidos.
- Botão extra à esquerda: `[⌫ Deletar]` (danger ghost). Abre modal de confirmação.

### Submitting
- Botão `Salvar e rodar` mostra spinner inline + texto `Rodando backtest…`.
- Form fields desabilitados (`opacity: 0.6; pointer-events: none`).
- Cancelar continua ativo (cancela request + volta).

### Success
- Redireciona para `/strategies/:id` (Detail page).
- Toast: `✓ QQQ → TQQQ vote-of-2 salva · 4/4 indicadores ativos`.

### Error de backtest
- Toast danger: `✗ Erro ao rodar backtest: <mensagem>`.
- Form continua aberto, botão volta a `Salvar e rodar`.

---

## Indicator form `/indicators/new`

Mesma estrutura, campos diferentes:

```
Nome [SMA200_____________________________]

Tipo  [momentum ▿]   (momentum / volatility / autocorr / custom)

Função
[python: lambda price: price.rolling(200).mean() ___________________]
[                                                                    ]
[                                                                    ]
JetBrains Mono · suporta numpy, pandas

Regra de pass
[price > SMA200__________________]
Comparação que retorna bool

Lookback (dias)        Resample
[200_]                 [1d ▿]

─────────────────────────────────────────────────────────────────────────
                                              [Cancelar]  [Salvar]
```

**Função** = `<textarea>` com 4 rows, font mono, syntax-highlight opcional (Prism.js, single-line theme).
