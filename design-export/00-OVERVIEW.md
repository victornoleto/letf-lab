# AI-Swing — Redesign export

> **Linear DNA** aplicada ao app inteiro. Light (canônico) + Dark.
> Inter Tight (UI) + JetBrains Mono (numbers). Accent **ink** `#0a0a0a` (light) / `#fafafa` (dark).
> Preview interativo: `AI-Swing redesign.html`.

---

## Como usar este pacote

Este export foi feito para alguém (humano ou Claude Code) implementar o redesign no codebase Angular existente substituindo SCSS e templates. **Não é um design system genérico** — é a tradução específica do que está nas telas para tokens, regras e snippets prontos pra colar.

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

- **Linear DNA.** Densidade alta, hairline borders (1px solid `--border`), raios pequenos (4–8px), sombras quase ausentes (`0 1px 0` no máximo), neutros puros e levemente frios. Sem decoração — toda hierarquia vem de **espaço, peso e tracking**, não de cor de fundo.
- **Atalhos visíveis.** `G 1/2/3/4` para Dashboard / Estratégias / Indicadores / Histórico. `⌘K` abre command palette. Atalhos aparecem nos hovers de tooltip da sidebar e no command palette — fazem parte da UX, não são easter egg.
- **Tipografia.** Inter Tight para UI (com `letter-spacing: -0.011em` em headings), JetBrains Mono **sempre** que aparecer número (preço, score, %, datas, tickers). `font-feature-settings: 'tnum' 'cv11'` em todo mono — alinhamento vertical de dígitos é parte da identidade.
- **Cor é semântica.** Verde = risk-on / positivo. Vermelho = risk-off / negativo. Âmbar = borderline (score == k, no fio). Indigo = ação primária / link. Cinza = inativo. **Nunca use accent (preto/branco) para indicar estado.**
- **Light é canônico.** Dark é variante explícita via `[data-theme="dark"]` — não inverta tokens manualmente, use o que está em `01-tokens.scss`. System preference só vale se nada estiver em localStorage.
- **Mono cobre numbers exclusivamente.** Labels e títulos de métrica continuam em sans. Ex: `"CAGR"` é sans, `"18.2%"` é mono.

---

## O que muda vs. UI atual

Mudanças de comportamento documentadas pelos screenshots em `screenshots/` e pelo canvas:

### Visual
- **Cards do dashboard** ganham accent **vertical à esquerda** (`3px solid var(--success|danger|warn)`) em vez de fundo tingido. Resto do card é `--surface` neutro com `border: 1px solid var(--border)`. Sem sombra.
- **Score badge** vira pill mono `4 / 4 · k≥2` com mini score-bar (4 quadrados) inline. Cor semântica baseada em `score >= k` / `score == k` / `score < k`. Borderline (==k) é âmbar — novo, não existia.
- **Sidebar** fica `--surface` com indicador active = barra de 2px à esquerda + texto `--text-primary`. Nav items mostram atalho à direita em mono (`G 1`, `G 2`…). Sai o gradiente roxo atual.
- **Tabelas** em vez de listas-de-cards nas listings (Strategies, Indicators, History). Header `--text-muted` 10.5px uppercase + `letter-spacing: 0.06em`. Hover row revela actions à direita.
- **Strategy Detail** tem meta-bar com KPIs grandes no topo, seção `Backtest` com 3 colunas de métricas (Estratégia / B&H Bench / B&H LETF) + 2 charts lado a lado abaixo. Diff vs B&H sempre visível em mono pequeno.

### Estrutura
- **Banner de transições recentes** vai pro topo do conteúdo (acima do título da página), dismissível com `×`. Não é toast, não é sidebar item.
- **Theme toggle** vai pro rodapé da sidebar como segmented control de 3 estados (Light / Dark / System).
- **Forms são telas, não modais dialog.** Rotas `/strategies/new`, `/strategies/:id/edit`. Layout single-column 560px, label acima do input, hint mono embaixo, footer sticky com `Cancelar` / `Salvar`.
- **Modal** só para confirmação destrutiva e command palette. `--shadow-modal` + scrim. Esc fecha, foco trap. `radius-lg`.
- **Toast** stack canto inferior direito, max 3 visíveis, auto-dismiss 4s, `--shadow-md`.

### Comportamento
- Sidebar collapsa pra 56px (só ícones) com tooltips. Estado persiste em localStorage (`aiswing.sidebar.collapsed`).
- Tema persiste em localStorage (`aiswing.theme` = `"light" | "dark" | "system"`). Sem entrada = `"system"`.
- Atalhos `G 1/2/3/4` navegam entre páginas (sequencial, dois toques). `⌘K` abre palette. `?` mostra todos os atalhos.
- Loading: skeleton com `--surface-muted` shimmer + barra fina indigo no topo da página. Sem spinner full-screen.
- Empty states: ícone outline 24px + headline + 1 CTA primário. Centrado vertical no main content.
- Validação on blur (não on input). On submit valida tudo e foca primeiro inválido.

---

## Escopo do export

| Arquivo | Cobre |
|---|---|
| `01-tokens.scss` | Cores, type scale, spacing, radii, shadows — light + dark + system fallback |
| `02-typography.md` | Escala em uso, exemplos, pares sans/mono |
| `03-icons/` | SVGs (16/20/24px) + convenções stroke-based |
| `04-components.md` | Markup + SCSS pronto pra Button, Card, Badge, Input, Select, Checkbox, Radio, Table, Sidebar, Modal, Toast, Tabs, Empty state, Skeleton |
| `05-charts-echarts.md` | `getChartTokens()` + 4 configs (equity, ratio, drawdown, monthly returns) |
| `06-theme-toggle.md` | Service Angular completo (`ThemeService`) + segmented control + FOUC-prevention script |
| `layouts/10-shell-sidebar.md` | App shell, sidebar (collapsed/expanded), atalhos, command palette |
| `layouts/11-dashboard.md` | Cards + banner de transições + filtros pill |
| `layouts/12-strategy-detail.md` | Meta-bar KPIs + 3 colunas de métricas + 2 charts + Signal History |
| `layouts/13-list-pages.md` | Strategies, Indicators (busca, hover-actions, paginação) |
| `layouts/14-forms.md` | Strategy form, Indicator form (validação, estados, edit vs new) |
| `layouts/15-modals-states.md` | Confirm modal, empty/loading/error states, toasts |
| `99-FILE-MAPPING.md` | "Quero mudar X — qual arquivo abro?" |

### O que NÃO está coberto
- Mudanças de **lógica de negócio** (gates, score, backtest) — só visual.
- **Telas mobile** estão como referência implícita; são reflows do desktop com sidebar virando bottom-tabs.
- **Animações** — usa só transitions CSS (`--transition-fast` 120ms, `--transition-base` 180ms). Sem framer-motion / GSAP.
- **i18n** — copys estão em pt-BR como no app atual; chaves de tradução não foram extraídas.

---

## Stack assumida

- Angular 17+ standalone components, signals OK mas não obrigatório
- SCSS com `@use` (não `@import`)
- ECharts 5.x (já em uso) — ver `05-charts-echarts.md`
- Sem libs de UI extra. Componentes são SCSS + template Angular puro.

Se algo no codebase real diverge (ex: ainda em `@import` ou Angular Material), adapte os snippets — os **valores** dos tokens são o que importa.
