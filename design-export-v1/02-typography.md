# 02 — Typography

> IBM Plex Sans (UI) + IBM Plex Mono (números). Carregadas via Google Fonts.

## Import

`index.html`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
```

Self-host via `@fontsource/ibm-plex-sans` + `@fontsource/ibm-plex-mono` se preferir não depender do Google.

## Stacks

```scss
--font-sans: 'IBM Plex Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
--font-mono: 'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
```

## Escala

| Token         | Tamanho / line-height | Letter-spacing | Peso típico | Uso |
|---------------|----------------------|----------------|-------------|-----|
| `--text-display` | 32px / 1.18 | -0.022em | 600 | Page title em hero (Strategy Detail) |
| `--text-h1`      | 26px / 1.20 | -0.020em | 600 | Page titles padrão (Dashboard, Settings) |
| `--text-h2`      | 20px / 1.30 | -0.014em | 600 | Section headings (cards de seção, modais) |
| `--text-h3`      | 16px / 1.40 | -0.008em | 600 | Card titles, table groups |
| `--text-base`    | 14px / 1.55 | 0        | 400 | Body, table cells, form inputs |
| `--text-sm`      | 13px / 1.50 | 0        | 400 | Secondary copy, tooltip body |
| `--text-xs`      | 12px / 1.45 | 0        | 500 | Badges, tags, table headers (com uppercase) |
| `--text-micro`   | 11.5px / 1.40 | 0.04em | 600 | Eyebrow labels (uppercase) |

Mínimo absoluto: 11.5px. Nada menor.

## Pesos

- **400 regular** — body, table cells, hint text
- **500 medium** — labels, sidebar nav inactive, secondary buttons
- **600 semibold** — headings, primary buttons, sidebar nav active, KPI numbers
- **700 bold** — usar com moderação (números de hero, ênfase em alerta)

## Regras de mono

**Sempre que aparecer um número, use mono.**

```html
<div class="kpi">
  <div class="kpi__label">CAGR</div>
  <div class="kpi__value mono">44.79<span class="kpi__unit">%</span></div>
  <div class="kpi__diff mono">+23.23pp vs B&amp;H</div>
</div>
```

```scss
.mono, .kpi__value, .kpi__diff, .price, .ticker, .score, .date-cell, td.num {
  font-family: var(--font-mono);
  font-feature-settings: 'tnum';      // tabular numerals — alinhamento vertical
  font-variant-numeric: tabular-nums; // fallback
}
```

Tabular-nums é **obrigatório** em qualquer coluna de tabela com números, em listas de KPIs lado a lado, e em qualquer lugar onde o valor pode mudar (live update). Sem isso, dígitos com larguras diferentes causam jumps.

### Pares sans + mono na mesma linha

```html
<span>Score</span> <span class="mono">3 / 4</span>
<span>Last trade</span> <span class="mono">2024-11-23</span>
<span>Strategy</span> <span class="mono">+44.79%</span>
```

Sans para o rótulo, mono para o valor. Espaço entre eles, sem `:`.

## Uppercase eyebrows

Para microlabels (table headers, section eyebrows):

```scss
.eyebrow {
  font: var(--text-micro);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  font-weight: 600;
}
```

Uso em `<th>`, em label acima de KPI tile, em "RECENT TRANSITIONS" no banner.

## Color × type combinations

- Headings (h1-h3): `--text-primary`
- Body: `--text-primary`
- Captions, hints, table headers: `--text-muted`
- Disabled: `--text-disabled`
- Links: `--primary` em light, `--info` se quiser cor (ex: link dentro de prosa)
- Números positivos (deltas, returns): `--success`
- Números negativos: `--danger`

## Responsive

Não escala automático — use o mesmo tamanho em mobile. Se uma página de detalhe sobrecarregar mobile, troque `--text-display` por `--text-h1`. Mobile sidebar vira bottom tab bar (não há shrink de tipo).

## Exemplos prontos

```scss
// Page title padrão
.page-title {
  font: var(--text-h1);
  font-weight: 600;
  letter-spacing: -0.020em;
  color: var(--text-primary);
  margin: 0 0 var(--space-2);
}

// KPI grande (hero)
.kpi-hero__value {
  font-family: var(--font-mono);
  font-size: 32px;
  line-height: 1.1;
  font-weight: 600;
  font-feature-settings: 'tnum';
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

// Card title (Dashboard ticker card)
.card-title {
  font: var(--text-h3);
  font-weight: 600;
  letter-spacing: -0.008em;
}

// Ticker symbol (mono, semibold)
.ticker {
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.02em;
  font-feature-settings: 'tnum';
}

// Table header
.t-head th {
  font: var(--text-micro);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  text-align: left;
  padding: var(--space-2) var(--space-3);
}
```
