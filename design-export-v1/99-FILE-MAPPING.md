# 99 — File mapping

> "Quero mudar X — qual arquivo Angular eu abro?"

Esta tabela mapeia cada parte visual do redesign aos arquivos prováveis no codebase atual (baseado em `src/app/`). Ajuste se a estrutura local divergir.

## Globais

| O que mudar | Arquivo |
|---|---|
| Tokens (cores, type, spacing, shadows) | `src/styles/tokens.scss` (criar/substituir; importar com `@use 'tokens';` em `styles.scss`) |
| Reset + base body styles | `src/styles.scss` |
| Fontes (IBM Plex) | `src/index.html` (`<link>`) |
| Ícones sprite | `src/assets/icons/sprite.svg` |
| FOUC prevention script | `src/index.html` (inline script no `<head>`) |
| Theme service | `src/app/core/theme.service.ts` |

## App shell

| O que mudar | Arquivo |
|---|---|
| Layout (sidebar + main) | `src/app/layout/main-layout/main-layout.component.{html,scss}` |
| Sidebar (markup, items, collapse) | `src/app/layout/sidebar/sidebar.component.{html,scss,ts}` |
| Topbar (search, bell, avatar) | `src/app/layout/topbar/topbar.component.{html,scss}` |
| Content padding wrapper | `main-layout.component.scss` (`.content` rule) |

## Telas

| Tela | Component path provável |
|---|---|
| Dashboard | `src/app/pages/dashboard/dashboard.component.{html,scss,ts}` |
| Strategy List | `src/app/pages/strategies/strategy-list/strategy-list.component.{html,scss,ts}` |
| Strategy Detail | `src/app/pages/strategies/strategy-detail/strategy-detail.component.{html,scss,ts}` |
| Strategy Form | `src/app/pages/strategies/strategy-form/strategy-form.component.{html,scss,ts}` |
| Indicator List | `src/app/pages/indicators/indicator-list/indicator-list.component.{html,scss,ts}` |
| Indicator Form | `src/app/pages/indicators/indicator-form/indicator-form.component.{html,scss,ts}` |
| History | `src/app/pages/history/history.component.{html,scss,ts}` |
| Holdings | `src/app/pages/holdings/holdings.component.{html,scss,ts}` |
| Settings | `src/app/pages/settings/settings.component.{html,scss,ts}` |
| Login | `src/app/pages/auth/login/login.component.{html,scss,ts}` |
| 404 | `src/app/pages/not-found/not-found.component.{html,scss,ts}` |

## Componentes compartilhados

Coloque em `src/app/shared/components/` (criar pasta se não existir):

| Componente | Arquivos |
|---|---|
| Button | `button/button.component.{html,scss,ts}` (ou só SCSS classe `.btn` reutilizável) |
| Card | classe `.card` em `src/styles/components/_card.scss` |
| Badge / Pill | classe `.badge` em `src/styles/components/_badge.scss` |
| Input | `input/input.component.{html,scss,ts}` ou classes `.field` / `.input` |
| Select | `select/select.component.{html,scss,ts}` |
| Table | classes `.table`, `.t-head`, `.t-body` em `src/styles/components/_table.scss` |
| Modal | `modal/modal.component.{html,scss,ts}` + service |
| Toast | `toast/toast.component.{html,scss,ts}` + `toast.service.ts` |
| Tabs | `tabs/tabs.component.{html,scss,ts}` |
| Empty state | `empty/empty.component.{html,scss,ts}` |
| Skeleton | classe `.skeleton` em `src/styles/components/_skeleton.scss` |
| Theme switch | `theme-switch/theme-switch.component.{html,scss,ts}` |

## Charts

| O que mudar | Arquivo |
|---|---|
| Token resolver compartilhado | `src/app/shared/charts/chart-tokens.ts` |
| Equity chart | `src/app/shared/charts/equity-chart.component.{ts,html,scss}` |
| Ratio chart | `src/app/shared/charts/ratio-chart.component.ts` |
| Drawdown chart | `src/app/shared/charts/drawdown-chart.component.ts` |
| Monthly returns | `src/app/shared/charts/monthly-returns.component.ts` |

## Padrões a procurar e remover

Coisas do design atual que **devem ir embora** ao aplicar este export:

- Gradientes na sidebar (procure `linear-gradient` em sidebar files)
- Cards com `background: linear-gradient(...)` — substituir por `--surface` neutro + borda lateral colorida
- Cores hardcoded em hex em arquivos `.component.scss` — todas devem virar `var(--*)`
- `font-family: 'Inter'` ou `'Roboto'` — trocar para `var(--font-sans)` / `var(--font-mono)`
- Usos de `font-size` em `rem` ou `em` para componentes — usar tokens `--text-*`
- `box-shadow` inline customizado — usar `var(--shadow-sm|md|lg)`
- `border-radius: 12px` ou maiores em cards — usar `var(--radius-lg)` (8px)
- Floating labels em forms — substituir por label-on-top
- Botões com `border-radius: 99px` (pill) salvo em casos intencionais — usar `var(--radius-md)` (6px)

## Ordem de implementação sugerida

1. **Tokens + fontes + sprite de ícones** (1 PR)
2. **App shell** (sidebar + topbar + layout) (1 PR)
3. **Componentes compartilhados** (button, card, badge, input, table) (1 PR)
4. **Dashboard** — primeira página completa, valida tokens (1 PR)
5. **Strategy Detail + charts** (1 PR)
6. **Listings restantes** (Strategies, Indicators, History, Holdings) (1 PR)
7. **Forms** (Strategy + Indicator) (1 PR)
8. **Estados + utilitários** (Modal, Toast, Empty, Skeleton, 404, Login) (1 PR)
9. **Polish + dark mode QA** (1 PR)

Cada PR fica isolado e revertível. Não tente trocar tudo em um único PR — fica impossível de revisar.
