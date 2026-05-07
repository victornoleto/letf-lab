# Brief de design — AI-Swing

Prompt para um agente Claude focado em design transformar a UI desta aplicação.

---

## Sobre o app

**AI-Swing** é um dashboard pessoal de monitoramento de estratégias de **rotação ETF / Leveraged ETF** baseadas em sinais quantitativos. É single-user, local-first, voltado para um operador discricionário acompanhando rebalanceamentos diários.

Cada estratégia tem:
- **Benchmark** (ex: QQQ) — ativo monitorado pelos indicadores
- **Risk-on** (ex: TQQQ) — comprado quando ≥k indicadores "passam"
- **Risk-off** (ex: ZROZ) — comprado caso contrário
- **Lista de indicadores** parametrizáveis (SMA, EMA, vol realizada, AR(1))
- **Threshold k** (mínimo de gates verdes para entrar em risk-on)

Decisão de portfólio diária: estratégia entra em risk-on hoje se ≥k de N indicadores estão verdes; muda exposição amanhã (T+1).

## Layout principal — preferência explícita

**Navegação por sidebar lateral fixa à esquerda, não topbar.**

Razões:
- Telas densas (dashboard com muitos cards, detalhe com 2 charts grandes) ganham altura vertical com a sidebar — todo o conteúdo cabe sem scroll
- Combina com o tom "ferramenta profissional" (Linear, Vercel, Stripe Dashboard, Bloomberg — todos usam sidebar)
- Mais escalável conforme o app cresce (futuras seções: backtest history, alertas, configs)
- Densidade de info do trader pede menos chrome no topo

A sidebar é fixa (não colapsa por padrão em desktop), com largura ~220–260px. Veja a seção "Sidebar como navegação principal" abaixo para detalhes.

## Persona / contexto de uso

- **Quem usa**: investidor pessoal sofisticado, técnico, monitora 5–15 estratégias.
- **Quando usa**: ~1× por dia (fim do dia ET / início da manhã), dura 1–5 min.
- **O que precisa ver primeiro**: visão de relance — algum sinal flipou? algum está perto de flipar? quais estão em risk-on agora?
- **Tom esperado**: terminal de trader, denso mas legível, cores funcionais (não decorativas).

## O que está construído (não mudar funcionalmente)

Stack:
- **Backend**: FastAPI + SQLAlchemy + APScheduler + yfinance + SQLite (porta 8000)
- **Frontend**: Angular 21 standalone + signals + zoneless + ECharts via `ngx-echarts`
- Sem framework UI externo (sem Material, sem Tailwind ainda — CSS direto)

Páginas/rotas:
1. `/dashboard` — grid de cards, um por estratégia, com status atual + sparkline + lista de indicadores
2. `/strategies` — tabela CRUD
3. `/strategies/new` e `/strategies/:id/edit` — formulário (nome, 3 tickers, k, indicadores selecionáveis, ativo)
4. `/strategies/:id` — detalhe: hero (tickers + status atual), backtest panel (3 equity curves em log + métricas + markers de transição), indicadores hoje, transições registradas, histórico de sinais (tabela)
5. `/indicators` — tabela CRUD
6. `/indicators/new` e `/indicators/:id/edit` — formulário com tipo (dropdown) + parâmetros dinâmicos

Componentes globais:
- **Sidebar** lateral fixa (esquerda) com brand, nav (Dashboard / Estratégias / Indicadores) e ações globais (refresh manual, indicador de status). **Sem topbar.** Detalhes em "Sidebar como navegação principal" abaixo.
- **Banner de transições** (aparece quando há transições nos últimos 7d) — pode aparecer no topo do conteúdo principal ou como item destacado dentro da sidebar.

A funcionalidade está estável — o backend retorna todos os dados que o frontend precisa. A tarefa é **redesenhar a camada visual** sem alterar:
- Rotas e estrutura de páginas
- Contratos das APIs (`http://localhost:8000/api/*`)
- Models TypeScript em `frontend/src/app/core/models.ts`
- Comportamento dos componentes

## Estado atual (referência)

Para inspecionar o app rodando:

```bash
cd /var/www/pessoal/ai-swing
make install && make migrate && make seed && make dev
```

Acesse `http://localhost:4200`. Use Playwright para navegar e capturar screenshots de cada tela. As 5 estratégias-exemplo (QQQ/TQQQ, SPY/UPRO, SMH/SOXL, MU/MUU, FTEC/TECL) já vêm populadas e os preços via yfinance carregam ao primeiro acesso.

Screenshots do estado atual (dark básico, **com topbar — a ser substituída por sidebar**) em `prints/`:
- `01-dashboard.png` — grid de cards (1366×?)
- `02-strategies-list.png` — tabela CRUD
- `03-strategy-modal-create.png` / `04-strategy-modal-edit.png` — modal de estratégia (create / edit)
- `05-indicators-list.png` — tabela CRUD de indicadores
- `06-indicator-modal-create.png` / `07-indicator-modal-edit.png` — modal de indicador
- `08-strategy-detail-qqq.png` — detalhe completo: hero + backtest panel com 2 charts (equity curves + ratio gradient azul/vermelho)
- `09-strategy-detail-mu-insufficient.png` — estado de erro "Insufficient data"
- `11-dashboard-tablet.png` — viewport 768×1024 (responsividade atual)

O design atual é funcional mas genérico — paleta `#0f1419` / `#1a1f29` / `#2a3142`, sem identidade própria, espaçamentos básicos, tipografia padrão do sistema.

## Direção de design

**Objetivo**: minimalista, clean, moderno. Estética de ferramenta profissional — pense em Linear, Vercel, Stripe Dashboard, Notion AI. Precisão e densidade informacional sem clutter.

### Princípios

1. **Hierarquia clara antes de ornamentação.** Cada tela deve ter um foco visual primário inequívoco. Decorações (gradientes, sombras, ilustrações) só onde reforçam significado.
2. **Cor como sinal, não como decoração.** Verde/vermelho carregam significado funcional (risk-on/off, gate passed/failed). Resto da UI é neutro.
3. **Tipografia carrega o peso.** Escala tipográfica deliberada (3–4 níveis máximo). Usar pesos (400/500/600) e tamanhos para criar hierarquia, não cor.
4. **Densidade controlada.** Trader-friendly mas não apertado. Espaçamento consistente em escala (4/8/12/16/24/32/48).
5. **Monoespaçada para números.** Tickers, preços, valores numéricos em fonte mono para alinhamento visual e leitura rápida.
6. **Movimento sutil.** Transições rápidas (150–200ms), nunca decorativas. Hover states discretos. Sem animações de entrada.
7. **Light & dark mode desde o início, default = light.** Ambos os temas são cidadãos de primeira classe. Pense no light primeiro (default), depois traduza para dark mantendo a mesma hierarquia/significado. Veja "Tematização light/dark" abaixo.

### Restrições

- **Sem ilustrações figurativas, sem emojis decorativos.** Ícones funcionais (Lucide ou Heroicons) são OK; emojis só onde tem significado (ex: status indicator, mas mesmo aí prefira ícones SVG).
- **Sem componentes "bonitinhos" descontextualizados.** Cards 3D, glassmorphism exagerado, neon acidentado: **não**.
- **Sem libraries pesadas** (sem Material UI, sem Tailwind a menos que seja realmente útil — minha preferência é CSS/SCSS direto com design tokens).

## Sistema de design a propor

Entregar um pequeno **design system** documentado em `frontend/src/styles/_tokens.scss` (ou similar):

### Tokens

- **Paleta (dual: light + dark)**: definir o **mesmo conjunto semântico** de variáveis (`--bg`, `--surface`, `--surface-elevated`, `--text-primary`, `--text-secondary`, `--text-muted`, `--border`, `--primary`, `--success`, `--danger`, `--info`, `--accent-cached`) com 2 valores cada — um para `:root` (light, default) e outro para `[data-theme="dark"]` (ou `@media (prefers-color-scheme: dark)`). Os componentes consomem as variáveis sem saber do tema. Veja "Tematização light/dark" abaixo para detalhes.
- **Tipografia**: 1 font sans (system-ui/Inter) + 1 mono (JetBrains Mono ou ui-monospace). Escala: 11px / 12px / 14px / 16px / 22px / 32px. Pesos: 400, 500, 600, 700.
- **Espaçamento**: 2/4/8/12/16/24/32/48/64. Escala única em todo o app.
- **Border radius**: pequeno (4px), médio (8px), grande (12px) — usar 1–2 valores de forma consistente.
- **Sombras**: nenhuma ou no máximo 1 nível sutil (`0 1px 2px rgba(0,0,0,0.3)`).
- **Bordas**: 1px de cor neutra para separação. Esquece bordas internas onde espaçamento já basta.

### Tematização light/dark

**Default = light.** Toggle persistido em `localStorage` (`theme: 'light' | 'dark' | 'system'`).

Estratégia técnica:
- Tokens definidos em `:root` (= light) com fallback para `prefers-color-scheme`
- Override em `[data-theme="dark"]` no `<html>` (ou `<body>`)
- Toggle escreve `data-theme` no `<html>` e salva escolha no localStorage
- Inicialização early no `index.html` (script inline) para evitar flash do tema errado:
  ```html
  <script>
    (() => {
      const saved = localStorage.getItem('theme');
      const dark = saved === 'dark' || (saved !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
      if (dark) document.documentElement.dataset.theme = 'dark';
    })();
  </script>
  ```
- Modo `system` segue `prefers-color-scheme` em tempo real (listener no media query)

Diretrizes visuais:
- **Light é o tema canônico** — pense layout/contraste/hierarquia primeiro nele. Dark é a versão noturna do mesmo design, não um redesign
- **Cores semânticas (verde/vermelho/azul) ajustadas em saturação/luminosidade por tema** — verde em fundo claro precisa ser mais escuro/saturado para legibilidade; em fundo escuro fica mais brilhante. Não use exatamente os mesmos hex
- **Sombras** existem no light (sutil, dá profundidade aos cards) e somem ou viram bordas no dark
- **Charts (ECharts)** — paletas diferentes por tema. Eixos, splitLines e tooltip respeitam tokens. As séries (estratégia/benchmark/LETF + áreas azul/vermelha do ratio) ajustam a opacidade/saturação para manter legibilidade nos 2 fundos
- **Status badges** (RISK ON / RISK OFF) — testar contraste AA nos 2 temas

Toggle UI:
- Posição sugerida: rodapé da sidebar (ou bloco de status), ícone Sun/Moon (Lucide)
- 3 estados visíveis: light / dark / system (auto). Pode ser dropdown ou ciclo entre os 3 com clique
- Transição: instantânea ou `transition: background 150ms` em `body` — sem fade elaborado

### Componentes-base a definir

- `Button` (variantes: primary, secondary, ghost, danger; tamanhos sm/md)
- `Card` (com slot de header opcional)
- `Badge` (variantes: on, off, neutral, info, success, danger; tamanhos sm/md)
- `Input` / `Select` / `Textarea` (consistente, com label, hint, erro)
- `Table` (compacta, header sticky)
- `Tabs` (linha sob ativa, sem caixas)
- `Tag/Chip` (para listas de indicadores em forms)
- `Toast/Banner` (informativo discreto)
- `EmptyState` (texto + CTA)
- `Skeleton` (loading)

## Telas a redesenhar (ordem de prioridade)

### 1. Dashboard (`/dashboard`) — **prioridade máxima**

Grid de cards. Cada card representa uma estratégia. É a tela que o usuário abre 1×/dia.

Hoje cada card tem:
- Linha 1: ticker_benchmark → ticker_risk_on (esquerda), badge RISK ON/OFF (direita)
- Linha 2: score k/n com threshold
- Sparkline 90d
- Lista vertical de indicadores com check/cross + raw_summary monoespaçado

Considerações:
- Layout responsivo: ~3–4 cards por linha em desktop wide, 1 em mobile
- Hover state que sugira clicabilidade (vai pra detail)
- Diferenciação visual sutil entre risk-on e risk-off (sem berrar — a borda lateral atual é uma boa direção)
- O usuário pode ter 5 ou 50 estratégias — pensar densidade
- Pensar em **estado intermediário "borderline"** — quando score é exatamente k (3/4 com k=3 é apertado vs 4/4 que é folgado). Considerar mostrar isso.

Header da página:
- Título + contador "X/Y risk-on" + CTA "Nova estratégia"
- Considerar filtros/sort (não no MVP, mas reservar espaço mental)

### 2. Strategy detail (`/strategies/:id`) — **prioridade alta**

Tela mais densa. Hoje tem:
1. Hero com ticker_benchmark | ticker_risk_on | ticker_risk_off | status | score
2. **Backtest panel** (componente grande): 3 cards de métricas + chart com 3 equity curves em log + slider de range (3y/5y/10y/20y)
3. Grid 2-col: indicadores hoje | transições registradas
4. Histórico de sinais (tabela com 1 coluna por indicador, valores ✓/✗)

Considerações:
- O **backtest panel** deve ser o destaque visual da tela
- Métricas precisam ser legíveis em scan rápido — talvez "diff vs benchmark" ao lado de cada métrica (ex: CAGR 44.8% +23.2pp vs B&H)
- Chart ECharts: paleta consistente com tokens, eixos discretos, tooltip com tipografia limpa
- Considerar layout em colunas: hero + sidebar de "indicadores hoje" sticky à direita, conteúdo principal à esquerda
- Tabela de histórico pode ficar em accordion fechado por padrão (informação secundária)

### 3. Strategies list / Indicators list

Tabelas. Hoje muito básicas. Considerar:
- Linhas mais respiradas
- Status coluna como badge, não texto cru
- Hover row destacado
- Ações (Editar/Remover) como ícones em hover ou kebab menu, não botões sempre visíveis
- Empty state real com CTA

### 4. Forms (Strategy / Indicator)

Hoje campos empilhados em `form-grid`. Refinar:
- Form em coluna estreita (≤ 600px) centralizada
- Hint textuais sob campos onde ajuda (ex: "k_threshold deve ser ≤ número de indicadores selecionados")
- Validação inline (real-time onde apropriado)
- Multi-select de indicadores como lista de chips selecionáveis (não checkbox cru)
- Botões primários alinhados à direita
- Cancelar como link/ghost button, não botão proeminente

### 5. Sidebar como navegação principal — **substitui a topbar atual**

**Preferência explícita do usuário:** sidebar lateral fixa à esquerda, **não** topbar horizontal. A topbar atual (em todos os screenshots) deve ser removida e seu conteúdo migrado para a sidebar.

Diretrizes:
- **Largura**: ~220–260px expandida; opcional collapse para ~56px (só ícones) com tooltip no hover. Persista o estado collapsed em localStorage.
- **Posição**: `position: fixed; left: 0; top: 0; bottom: 0;` ocupando 100% da altura. Conteúdo principal recebe `margin-left` correspondente.
- **Estrutura vertical**:
  1. **Brand** no topo (logo + "AI-Swing"), padding generoso, sem ser ostensivo
  2. **Nav primária** (lista de links): Dashboard, Estratégias, Indicadores. Cada item com ícone (Lucide) + label, estado active discreto (background sutil + indicador lateral fino, ex: 2px de cor primária)
  3. **Espaço flexível** (`margin-top: auto`) para empurrar para baixo:
  4. **Bloco de status** — última atualização (timestamp + ícone de relógio), botão refresh com feedback (idle/refreshing/error/success)
  5. (Opcional) versão da app no rodapé em texto minúsculo
- **Background**: levemente diferente do conteúdo principal (ex: `--surface` vs `--bg`), separação por borda 1px ou apenas pelo contraste — sem sombra pronunciada
- **Sem ações decorativas** (avatar de usuário fake, search bar fictícia, etc.) — é single-user, mantenha enxuto
- **Mobile (<768px)**: vira drawer escondido, abre via botão hamburger no canto superior do conteúdo. Acima desse breakpoint, sidebar sempre visível.

Refresh button (dentro da sidebar, no bloco de status):
- Estados: idle (ícone ↻ neutro) / refreshing (spinner discreto) / error (ícone ! em cor danger + tooltip) / success (timestamp da última run, ex: "atualizado 14:32")
- Hover state com ação clara

Banner de transições:
- Hoje aparece horizontal no topo do conteúdo. Considerar 2 opções:
  - **Opção A**: continua no topo do conteúdo (acima do título da página), mais discreto e colapsável após 1 vez vista
  - **Opção B**: lista compacta dentro da sidebar (item "Transições recentes" com badge contador, expansível)
- Decida pela que mais convive com a sidebar sem competir por atenção

## Detalhes técnicos do trabalho

### O que entregar

1. **`frontend/src/styles/_tokens.scss`** — design tokens (cores, tipografia, espaçamento, raio, etc.)
2. **`frontend/src/styles/_components.scss`** — estilos base reutilizáveis (`.btn`, `.card`, `.badge`, `.input` etc.) — ou separar em arquivos por componente
3. **`frontend/src/styles.scss`** atualizado para importar os tokens + estilos globais
4. **Atualizações nos componentes Angular** (`*.ts` com `template:` inline ou `*.html` + `*.scss`):
   - `app.html` / `app.scss` (shell)
   - `pages/dashboard/dashboard.ts` + `strategy-card.ts` + `sparkline.ts`
   - `pages/strategy-detail/strategy-detail.ts` + `backtest-panel.ts` + `signal-history-table.ts`
   - `pages/strategies/strategies-list.ts` + `strategy-form.ts`
   - `pages/indicators/indicators-list.ts` + `indicator-form.ts`
5. **Configuração ECharts**: opções dos charts (sparkline + backtest equity curves) usando os tokens — fundo transparente, eixos discretos, tooltip estilizado, paleta consistente.

### Regras

- **Não alterar lógica de componentes** (`*Component` classes, `signal()`, `inject()`, métodos). Apenas template + estilos.
- **Não alterar rotas, services, models, ou qualquer coisa em `core/`.**
- **Não tocar no backend.**
- **Não introduzir Tailwind, Material, Bootstrap.** SCSS direto com tokens.
- **Verificar build** após mudanças: `cd frontend && npx ng build --configuration=development`. Deve passar sem erros.
- **Verificar runtime** abrindo `http://localhost:4200` e checando cada rota com Playwright.

### Iconografia

Se usar ícones: importar Lucide via SVG inline (não como dep npm) ou copiar 5–10 SVGs específicos para `frontend/src/assets/icons/`. Usar `currentColor` para herdar cor do contexto.

### Tipografia

Sugerido (mas decida):
- Sans: `Inter` via Google Fonts (`@import` ou `<link>` no `index.html`) com fallback `system-ui`
- Mono: `JetBrains Mono` via Google Fonts ou `ui-monospace`

## Inspiração

Não copiar nenhuma destas, mas absorver a sensibilidade:

- **Linear** (linear.app) — densidade, foco, sem ruído visual, atalhos primeiro
- **Vercel Dashboard** — neutralidade, monoespaçada para dados, breadcrumbs claros
- **Stripe Dashboard** — tabelas elegantes, badges semânticas, hierarquia tipográfica
- **Cron / Notion Calendar** — modo escuro polido sem ser pesado
- **Bloomberg Terminal** (espírito) — números acima de tudo, mas com **80%** menos visual noise

Anti-inspiração: dashboards SaaS genéricos com purple gradients, hero sections vazias, ilustrações 3D, micro-interações exageradas.

## Como validar

Depois de redesenhar:
1. Abra cada rota e capture **2 screenshots full page** via Playwright: um em **light** (default) e outro em **dark** (toggle aplicado). Salve em `frontend/screenshots-redesign/light/` e `frontend/screenshots-redesign/dark/` respectivamente
2. Reduza a viewport para 768px e verifique responsividade do dashboard (em ambos os temas — pelo menos 1 screenshot do dashboard mobile em cada)
3. Verifique contraste de texto: AA mínimo (4.5:1) em todo texto principal — testar **nos 2 temas**
4. Cheque que os badges de status (RISK ON / RISK OFF) são distinguíveis também por **forma/posição/ícone**, não só cor (acessibilidade para daltonismo)
5. Verifique que o toggle de tema funciona: persiste no reload, respeita `prefers-color-scheme` quando em modo "system", e não há flash do tema errado ao carregar a página
6. Garanta que `npx ng build` continua compilando sem warnings

## Resumo em uma frase

**Faça parecer uma ferramenta profissional usada todos os dias por alguém que sabe o que está fazendo — não um produto SaaS tentando vender.**

---

## Material de apoio no repo

- Plano completo do MVP: `~/.claude/plans/generic-tumbling-pond.md`
- Estudo quantitativo base: `/var/www/pessoal/ai-trade/studies/letf_rotation_hunt`
- README com arquitetura: `README.md`
- Models TypeScript (contratos): `frontend/src/app/core/models.ts`

Quando tiver dúvidas de produto, prefira a interpretação mais minimalista. Se algo soar "decorativo", remova.
