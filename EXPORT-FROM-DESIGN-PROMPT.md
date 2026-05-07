# Exportar o design para o código do AI-Swing

Olá! Você gerou o design completo para o **AI-Swing** (dashboard de rotação ETF/LETF).
Agora preciso que você **exporte esse design para o repositório de código** em um
formato que outro agente Claude (focado em desenvolvimento) consiga implementar
em Angular **sem precisar te perguntar nada**.

Esse outro agente **não terá acesso à nossa conversa** — ele lê apenas os arquivos
que você produzir. Os deliverables precisam ser auto-contidos, com valores
concretos (hex, px, ms), não decisões abstratas tipo "use uma cor neutra suave".

---

## Como o código está hoje (não mude isso)

**Stack**:
- Angular 21 standalone components (sem NgModule)
- Signals + zoneless change detection
- ECharts via `ngx-echarts` para todos os gráficos
- Zero framework de UI: nada de Material, Tailwind, Bootstrap, ng-bootstrap
- SCSS direto, com `template:` e `styles: [...]` inline nos componentes
- TypeScript strict
- HttpClient nativo do Angular

**Estrutura relevante** (arquivos que serão modificados pelo dev):

```
frontend/
├── src/
│   ├── index.html
│   ├── styles.scss                              # globals
│   ├── styles/                                  # NÃO existe ainda — você define
│   │   ├── _tokens.scss                         # tokens (cores, type, spacing)
│   │   ├── _components.scss                     # estilos base reutilizáveis
│   │   └── _theme.scss                          # light/dark switching
│   └── app/
│       ├── app.ts                               # shell (template + class)
│       ├── app.html                             # shell template
│       ├── app.scss                             # shell styles
│       ├── shared/
│       │   ├── modal/modal.ts                   # modal HTML5 dialog
│       │   └── theme/theme.service.ts           # NÃO existe — você define a API
│       └── pages/
│           ├── dashboard/
│           │   ├── dashboard.ts
│           │   ├── strategy-card.ts
│           │   └── sparkline.ts                 # ECharts mini chart
│           ├── strategies/
│           │   ├── strategies-list.ts
│           │   └── strategy-form.ts             # modal interno
│           ├── indicators/
│           │   ├── indicators-list.ts
│           │   └── indicator-form.ts            # modal interno
│           └── strategy-detail/
│               ├── strategy-detail.ts
│               ├── backtest-panel.ts            # ECharts: equity curves + ratio
│               └── signal-history-table.ts
```

**Restrições inegociáveis**:
- **Sem novas dependências npm** a menos que você justifique e eu autorize.
  Especificamente: nada de Tailwind, Material, Bootstrap, Angular CDK,
  styled-components.
- **Fontes via Google Fonts CDN** (`<link>` no index.html) ou self-host —
  você decide.
- **Ícones**: SVG inline, copiar de Lucide/Heroicons. Sem `npm i lucide`.
- O dev vai escrever o Angular. **Você não escreve TS** — só HTML estrutural,
  CSS/SCSS, e JSON de config (ECharts).

---

## O que entregar — estrutura

Crie um diretório `/var/www/pessoal/ai-swing/design-export/` com:

```
design-export/
├── 00-OVERVIEW.md                # narrativa + decisões + ordem de implementação
├── 01-tokens.scss                # arquivo SCSS pronto para drop-in
├── 02-typography.md              # fontes, escala, classes utilitárias
├── 03-icons/                     # SVGs inline + lista de uso
│   ├── README.md
│   └── *.svg
├── 04-components.md              # spec de cada componente-base
├── 05-charts-echarts.md          # opções ECharts por chart
├── 06-theme-toggle.md            # spec do light/dark switch
├── layouts/
│   ├── 10-shell-sidebar.md       # shell + sidebar lateral
│   ├── 11-dashboard.md
│   ├── 12-strategy-detail.md
│   ├── 13-strategies-list.md
│   ├── 14-indicators-list.md
│   └── 15-modals-forms.md
├── screenshots/
│   ├── light/
│   │   ├── dashboard.png
│   │   ├── strategy-detail.png
│   │   ├── strategies-list.png
│   │   ├── indicators-list.png
│   │   └── strategy-form-modal.png
│   └── dark/
│       └── (mesmos arquivos)
└── 99-FILE-MAPPING.md            # qual arquivo Angular muda em qual fase
```

---

## Formato de cada arquivo

### `00-OVERVIEW.md`

- Resumo das decisões macro (paleta, tipografia, layout, tom)
- 3-5 parágrafos
- **Ordem de implementação** sugerida (em que ordem o dev deve atacar os arquivos
  para destravar cada fase visualmente)
- Quaisquer caveats / pontos de atenção (ex: "esta paleta ainda precisa de teste
  de contraste com daltonismo")

### `01-tokens.scss`

**Arquivo SCSS válido**, não pseudo-código. Pronto para `@use` no projeto.
Estrutura:

```scss
// ============== Light theme (default — :root) ==============
:root {
  // Surfaces
  --bg: #...;
  --surface: #...;
  --surface-elevated: #...;

  // Text
  --text-primary: #...;
  --text-secondary: #...;
  --text-muted: #...;

  // Borders
  --border: #...;
  --border-strong: #...;

  // Brand / interactive
  --primary: #...;
  --primary-hover: #...;
  --primary-active: #...;
  --primary-fg: #...;

  // Semantic
  --success: #...;
  --success-bg: #...;
  --danger: #...;
  --danger-bg: #...;
  --info: #...;

  // Charts (specific to ECharts series)
  --chart-strategy: #...;
  --chart-benchmark: #...;
  --chart-leveraged: #...;
  --chart-ratio-positive: #...;     // azul
  --chart-ratio-negative: #...;     // vermelho
  --chart-grid: #...;
  --chart-axis: #...;

  // Spacing scale
  --space-1: 2px; --space-2: 4px; --space-3: 8px;
  --space-4: 12px; --space-5: 16px; --space-6: 24px;
  --space-7: 32px; --space-8: 48px; --space-9: 64px;

  // Radius
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  // Shadows
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
  --shadow-modal: 0 20px 60px rgba(0,0,0,0.25);

  // Transitions
  --transition-fast: 120ms ease;
  --transition-base: 180ms ease;

  // Layout
  --sidebar-width: 240px;
  --sidebar-width-collapsed: 56px;
  --content-max-width: 1600px;
}

// ============== Dark theme ==============
[data-theme="dark"] {
  --bg: #...;
  --surface: #...;
  // ... todos os mesmos nomes, valores ajustados
}

// ============== Auto via prefers-color-scheme ==============
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    // mesmos overrides do dark
  }
}
```

**Importante**: cores semânticas (success/danger/chart-*) **não devem ser as mesmas**
hex em ambos os temas — verde precisa ser mais escuro/saturado em fundo claro,
mais brilhante em fundo escuro. Calibre para AA mínimo (4.5:1) em texto e 3:1
em UI.

### `02-typography.md`

- Quais fontes (sans + mono), URLs do Google Fonts ou outro
- Tag `<link>` exato a colar em `index.html`
- Escala em CSS custom properties: `--text-xs`, `--text-sm`, `--text-base`,
  `--text-lg`, `--text-xl`, `--text-2xl` com tamanho/line-height/letter-spacing
- Pesos disponíveis (400/500/600/700) e quando usar cada
- Classes utilitárias se quiser definir (`.text-mono`, `.tabular-nums`, etc.)

### `03-icons/`

- `README.md` listando todos os ícones usados (nome → fonte → onde aparece)
- Um SVG por ícone, otimizado, com `currentColor` no `fill`/`stroke` para herdar cor
- Tamanho padrão 16×16 ou 20×20 — explicite

Exemplo:

```
03-icons/
├── README.md
├── chevron-down.svg
├── refresh.svg
├── sun.svg
├── moon.svg
├── trending-up.svg
├── check.svg
└── x.svg
```

### `04-components.md`

Para **cada componente-base**, fornecer:

1. **Nome** (`Button`, `Card`, `Badge`, `Input`, `Select`, `Textarea`, `Table`,
   `Tabs`, `Chip`, `Toast`, `EmptyState`, `Skeleton`)
2. **Variantes** (ex: button: primary/secondary/ghost/danger × sm/md)
3. **HTML estrutural mínimo** (não Angular, só HTML)
4. **CSS completo** com seletores de classe que o dev colará (`.btn`, `.btn--primary`, etc.)
5. **Estados** (hover, active, focus, disabled) com cor exata
6. **Exemplo visual em ASCII** ou descrição para o dev confirmar

Exemplo do que quero para `Button`:

```markdown
### Button

Variantes: `primary`, `secondary`, `ghost`, `danger`. Tamanhos: `sm` (28px), `md` (36px).

HTML:
\`\`\`html
<button class="btn btn--primary btn--md">Salvar</button>
\`\`\`

CSS:
\`\`\`scss
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font: inherit;
  font-weight: 500;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast);
  &--md { height: 36px; padding: 0 14px; font-size: var(--text-sm); }
  &--sm { height: 28px; padding: 0 10px; font-size: var(--text-xs); }
  &--primary { background: var(--primary); color: var(--primary-fg); ... }
  &:hover:not(:disabled) { ... }
  ...
}
\`\`\`

Estados: focus tem outline 2px var(--primary) com offset 2px. Disabled = opacity 0.5.
```

### `05-charts-echarts.md`

ECharts é nosso único framework de chart. Para **cada chart** que aparece no app
(sparkline do card, equity curves do detail, ratio chart), entregar:

- **Patch object de opções** (snippet JSON-ish) que o dev vai espalhar nas
  options atuais — apenas o que muda visualmente (cores, fontes, eixos)
- Use as variáveis CSS via `getComputedStyle` se necessário, mas **prefira hex
  diretos por tema** (ECharts não consome CSS vars facilmente). O dev vai
  resolver os 2 sets via uma função `getChartTokens(theme)`
- Inclua: backgroundColor, color array (séries), textStyle, axisLine, axisLabel,
  splitLine, tooltip styles, dataZoom styles
- Exemplo concreto para 1 chart já render-completo

### `06-theme-toggle.md`

- HTML do toggle (botão simples, dropdown, ou ciclo entre 3 estados)
- CSS do toggle
- Comportamento descrito em pseudo-código (NÃO Angular):
  - "Inicialização: lê localStorage; se 'system' ou null, lê prefers-color-scheme"
  - "Click: cicla entre light → dark → system → light"
  - "Aplicação: setar `document.documentElement.dataset.theme`"
- Script inline que vai no `index.html` para evitar flash (você já deu uma versão
  no brief original — refine se quiser)

### `layouts/10-shell-sidebar.md`

A peça mais importante. Cobrir:
- Largura, breakpoints, comportamento collapse
- Estrutura HTML do shell (sidebar + main content area)
- Posição (`position: fixed` etc.) e como o conteúdo principal recebe
  `margin-left`
- Cada item da sidebar: brand, nav, status block, theme toggle
- Estados (active route, hover, collapsed)
- Mobile: drawer + overlay + botão hamburger no main

### `layouts/11-dashboard.md` até `15-modals-forms.md`

Para cada tela:
- Layout (grid, flex, dimensões)
- HTML estrutural simplificado (sem Angular `@for`/`@if` — só `<div>`, `<section>`)
- CSS aplicado
- Estados especiais (loading, empty, error)
- Pontos de atenção visuais

### Screenshots

Renderize **cada tela em viewport 1366×768 e 768×1024** (responsivo), nos 2 temas.
Salve em PNG. Tudo em `screenshots/light/` e `screenshots/dark/`.

Use Playwright se possível para gerar render real do design (não mockup Figma).
Se renderizar em ambiente próprio, certifique-se de que está visualmente fiel
ao que o dev vai obter ao implementar — sem firulas que o token system não
suporta.

### `99-FILE-MAPPING.md`

Tabela de qual arquivo Angular o dev modifica em qual fase:

| Fase | Arquivo | O que muda |
|------|---------|------------|
| 1 | `frontend/src/index.html` | Adiciona `<link>` Google Fonts + script de pre-theme |
| 1 | `frontend/src/styles.scss` | Importa `_tokens.scss`, `_components.scss` |
| 1 | `frontend/src/styles/_tokens.scss` (novo) | Cole o conteúdo de `01-tokens.scss` |
| 2 | `frontend/src/app/app.html` | Substituir topbar por sidebar shell |
| 2 | `frontend/src/app/app.scss` | Layout shell + estilos da sidebar |
| 3 | `frontend/src/app/shared/theme/theme.service.ts` (novo) | Service que aplica `data-theme` |
| ... | ... | ... |

---

## Princípios para o export

1. **Auto-contido**: não diga "como discutimos" — explicite tudo
2. **Concreto**: hex codes, px, ms. Sem "uma cor suave", "tempo razoável"
3. **Code-ready**: SCSS deve compilar; HTML deve ser válido; SVGs devem renderizar
4. **Light + dark sempre lado a lado**: nunca documente só uma cor
5. **Menos é mais**: se uma decisão não tem motivo claro, simplifique
6. **Sem código Angular**: deixe os componentes (`*.ts`) com o dev. Você fornece
   apenas a estrutura HTML que o dev vai colar dentro do `template`.
7. **Verifique o build mental**: cada SCSS snippet, cada HTML deve ser
   pasteable no projeto sem ajustes. Se viu uma classe `.foo`, o CSS dela
   precisa estar definido em algum lugar dos arquivos que você gera.

---

## Material que você precisa consultar

- `CLAUDE-DESIGN-PROMPT.md` (raiz do repo) — brief original que recebeu
- `prints/` (raiz do repo) — screenshots do estado atual antes do redesign
- `frontend/src/app/core/models.ts` — interfaces TypeScript dos dados que
  vão renderizar (assim você sabe o que é mostrado em cada tela)
- `README.md` — visão geral do projeto

---

## Resumo final

- Crie `/var/www/pessoal/ai-swing/design-export/` com a estrutura acima
- Tudo em pt-br (descrições) ou inglês (nomes técnicos) — consistente
- Quando terminar, rode `tree design-export/` e confirme que todos os arquivos
  listados estão lá
- Saída final: 1 frase confirmando completude + listando arquivos gerados

O dev pega daqui.
