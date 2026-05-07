# AI-Swing — Redesign export

> Stripe DNA aplicada ao app inteiro. Light (canônico) + Dark.
> IBM Plex Sans + IBM Plex Mono. Accent **ink** `#0a0a0a` (light) / `#ffffff` (dark).
> Preview interativo: `AI-Swing redesign.html` (canvas com 8 seções).

---

## Como usar este pacote

Este export foi feito para alguém (humano ou Claude Code) implementar o redesign no codebase Angular existente substituindo SCSS e templates. **Não é um design system genérico** — é a tradução específica do que está nas telas do canvas para tokens, regras e snippets prontos pra colar.

### Ordem de leitura sugerida

1. **`00-OVERVIEW.md`** (este arquivo) — princípios, mudanças vs. UI atual, escopo
2. **`01-tokens.scss`** — copiar inteiro pra `src/styles/tokens.scss`. Tudo o resto referencia daqui.
3. **`02-typography.md`** — escala, pesos, tabular-nums, exemplos
4. **`04-components.md`** — Button, Card, Badge, Input, Table, Sidebar, Modal, Toast
5. **`05-charts-echarts.md`** — config compartilhada para todos os gráficos do app
6. **`06-theme-toggle.md`** — como persistir light/dark/system
7. **`layouts/`** — uma página por tela com markup de referência
8. **`99-FILE-MAPPING.md`** — qual arquivo Angular tocar pra cada parte

### Princípios não-negociáveis

- **Stripe DNA.** Hairline borders (1px solid `--border`), sombras `0 1px 2px` + `0 0 0 1px`, raios pequenos (6–10px), neutros frios mas levemente quentes (#1a1f36 / #697386 — não cinza puro). Densidade alta porém respirável.
- **Tipografia.** IBM Plex Sans para UI, IBM Plex Mono **sempre** que aparecer número (preço, score, %, datas, tickers). `font-feature-settings: 'tnum'` em todos os mono — alinhamento vertical de dígitos é parte da identidade.
- **Cor é semântica.** Verde = risk-on / positivo. Vermelho = risk-off / negativo. Âmbar = borderline (score == k, no fio). Azul = informação neutra. Cinza = inativo. **Nunca use a cor de accent (preto/branco) para indicar estado.**
- **Light é canônico.** Dark é variante explícita via `[data-theme="dark"]` — não inverta tokens manualmente, use o que está em `01-tokens.scss`. System preference só vale se nada estiver em localStorage.
- **Mono cobre numbers exclusivamente.** Labels e títulos de métrica continuam em sans. Ex: `"CAGR"` é sans, `"44.79%"` é mono.

---

## O que muda vs. UI atual

Mudanças de comportamento documentadas pelos screenshots em `prints/` e código em `src/app/`:

### Visual
- **Cards do dashboard** ganham borda lateral fina (`3px solid var(--success|danger|warn)`) em vez de fundo tingido. Resto do card é `--surface` neutro com `--shadow-sm`.
- **Score badge** vira pill mono (`3 / 4`) com cor semântica baseada em `score >= k` / `score == k` / `score < k`. Borderline (==k) é âmbar — novo, não existia.
- **Sidebar** fica `--surface` (branco em light) com indicador active = barra de 2px à esquerda + texto `--primary`. Sai o gradiente roxo atual.
- **Tabelas** em vez de listas-de-cards na maioria das listings (Strategies, Indicators, History). Linhas zebradas em `--surface-muted` opcional, header sticky com `--text-muted` 11.5px uppercase.
- **Hero da Strategy Detail** tem 4 KPI tiles no topo, gráfico abaixo, e *abaixo* do gráfico mostra diff vs B&H sempre (`+23.23pp`).

### Estrutura
- **Banner de transições recentes** vai pro topo do conteúdo (acima do título da página), dismissível com `×`. Não é toast, não é sidebar item.
- **Theme toggle** vai pro rodapé da sidebar como segmented control de 3 estados (Light / Dark / System).
- **Forms** com label acima do input, hint cinza embaixo, error state em `--danger` com ícone à esquerda do hint. Sem floating labels.
- **Modal** `var(--shadow-modal)` + `--scrim` no overlay. Sai max 560px, Esc fecha, foco trap. `radius-xl`.
- **Toast** stack canto inferior direito, max 3 visíveis, auto-dismiss 5s, `--shadow-lg`.

### Comportamento
- Sidebar collapsa pra 56px (só ícones) com tooltips. Estado persiste em localStorage (`aiswing.sidebar.collapsed`).
- Tema persiste em localStorage (`aiswing.theme` = `"light" | "dark" | "system"`). Sem entrada = `"system"`.
- Loading: skeleton com `--surface-muted` shimmer, não spinner centralizado.
- Empty states: ilustração mono-line + headline + 1 CTA primário.

---

## Escopo do export

| Arquivo | Cobre |
|---|---|
| `01-tokens.scss` | Cores, type scale, spacing, radii, shadows — light + dark + system fallback |
| `02-typography.md` | Escala em uso, exemplos, pares sans/mono |
| `03-icons/` | SVGs (16/20/24px) + convenções stroke-based |
| `04-components.md` | Markup + SCSS pronto pra Button, Card, Badge, Input, Select, Checkbox, Radio, Table, Sidebar, Modal, Toast, Tabs, Empty state |
| `05-charts-echarts.md` | `getChartTokens()` + 4 configs (equity, ratio, drawdown, monthly returns) |
| `06-theme-toggle.md` | Service Angular completo (`ThemeService`) + segmented control |
| `layouts/10-shell-sidebar.md` | App shell, sidebar, topbar, content area |
| `layouts/11-dashboard.md` | Cards + banner de transições + filtros |
| `layouts/12-strategy-detail.md` | Hero KPI + gráfico + tabela de trades |
| `layouts/13-list-pages.md` | Strategies, Indicators, History, Holdings |
| `layouts/14-forms.md` | Strategy form, Indicator form (filled + error) |
| `layouts/15-modals-forms.md` | Modais, confirmations, toasts |
| `99-FILE-MAPPING.md` | "Quero mudar X — qual arquivo abro?" |

### O que NÃO está coberto
- Mudanças de **lógica de negócio** (gates, score, backtest) — só visual.
- **Telas mobile** estão como referência no canvas (seção 7) mas não têm markup escrito; são reflows do desktop com sidebar virando bottom-tabs.
- **Animações** — usa só transitions CSS (`--transition-fast` 120ms, `--transition-base` 180ms). Sem framer-motion / GSAP.
- **i18n** — copys estão em pt-BR como no app atual; chaves de tradução não foram extraídas.

---

## Stack assumida

- Angular 17+ standalone components, signals OK mas não obrigatório
- SCSS com `@use` (não `@import`)
- ECharts 5.x (já em uso) — ver `05-charts-echarts.md`
- Sem libs de UI extra. Componentes são SCSS + template Angular puro.

Se algo no codebase real diverge (ex: ainda em `@import` ou Angular Material), adapte os snippets — os **valores** dos tokens são o que importa.
