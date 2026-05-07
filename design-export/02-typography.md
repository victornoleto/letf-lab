# Typography — AI-Swing (Linear DNA)

> **TL;DR:** Inter para tudo que é interface, JetBrains Mono para tickers/valores/`kbd`.
> Linear DNA é **denso e funcional**: 13px de corpo, hierarquia comprime entre 11–20px,
> uppercase 11.5px com letter-spacing pra labels. **Nada de displays gigantes.**

---

## 1 · Famílias

| Token        | Família                | Uso                                              | Carregamento |
|--------------|------------------------|--------------------------------------------------|--------------|
| `--font-sans` | **Inter**             | Toda UI, headings, body, navegação, botões       | Google Fonts ou self-host (preferido) |
| `--font-mono` | **JetBrains Mono**    | Tickers (`QQQ → TQQQ`), scores, kbd, code, hints | Google Fonts ou self-host |

### Por que Inter + JetBrains Mono?
- **Inter** é a fonte canônica do "Linear DNA": neutra, otimizada pra UI densa, ótimo rendering em tamanhos pequenos. Tem `cv02/03/04` (variantes de `1`, `4`, `l`) que melhoram legibilidade no mono-like de ticker mixed-case.
- **JetBrains Mono** é mono fechada (não-monospace-clássica), com ligaduras opcionais. Lê melhor que IBM Plex Mono em densidade alta. Tem `tnum` nativo para alinhamento de números.

### Fallback stack
```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
```

### Carregamento (HTML head — Google Fonts)
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

Pesos usados: **400 (regular), 500 (medium), 600 (semibold)**. NÃO usar 700+ — Linear DNA evita weight-heavy.

### Self-host (recomendado em produção)
1. Baixar via [fontsource](https://fontsource.org/fonts/inter) ou [google-webfonts-helper](https://gwfh.mranftl.com/fonts).
2. Subset latin only (cobre PT-BR sem ç/ã issues).
3. `font-display: swap` em todas as `@font-face`.
4. Preload o weight 400 do Inter no `<head>` (peso usado above-the-fold).

---

## 2 · Escala (variáveis em `--fs-*`)

| Token       | Tamanho | Line-height | Uso                                                          |
|-------------|---------|-------------|--------------------------------------------------------------|
| `--fs-xs`   | 11px    | 1.35        | `kbd` hints, badges (`RISK ON`), micro labels                |
| `--fs-sm`   | 11.5px  | 1.4         | Uppercase section labels, table headers, hint texts          |
| `--fs-base` | **13px**| 1.5         | **Body padrão** — texto corrido, table cells, navegação      |
| `--fs-md`   | 13.5px  | 1.4         | Brand wordmark, botões primários, section title              |
| `--fs-lg`   | 16px    | 1.3         | h3 (subseção dentro de Detail)                               |
| `--fs-xl`   | 20px    | 1.25        | h1 da página (Dashboard, Estratégias)                        |
| `--fs-2xl`  | 28px    | 1.2         | Único hero numérico — Detail page CAGR/Sharpe                |

**13px é o coração.** Toda lista, formulário, navegação roda nesse tamanho. **Não inventar** 14px ou 15px no meio do caminho.

---

## 3 · Pesos

| Peso | Token | Uso |
|------|-------|-----|
| 400  | `--fw-regular`  | Body, table cells, hints |
| 500  | `--fw-medium`   | Section titles, nav item ativo, botões, valores numéricos importantes |
| 600  | `--fw-semibold` | Apenas h1 da página e brand wordmark |

**Nunca usar 700+.** Se algo precisa "gritar", aumente o tamanho ou use accent color.

---

## 4 · Letter-spacing

| Token              | Valor       | Uso                                          |
|--------------------|-------------|----------------------------------------------|
| `--tracking-tight` | -0.015em    | h1, h2, h3, brand wordmark                   |
| `--tracking-normal`| 0           | Body, botões                                 |
| `--tracking-wide`  | **0.06em**  | **Uppercase labels** (`TRANSIÇÕES RECENTES`) |

Toda label uppercase 11.5px **DEVE** ter `letter-spacing: 0.06em`. Sem isso, vira ilegível.

---

## 5 · Tabular numerals

Sempre que houver número alinhado em coluna (tabelas, métricas, tickers, datas), aplicar:

```css
font-feature-settings: 'tnum' 1;
```

A classe utilitária `.mono` (e `code`, `kbd`, `pre`, `.num`) já aplica isso. **Não usar** `font-variant-numeric: tabular-nums` sozinho — o `font-feature-settings` é mais robusto cross-browser.

---

## 6 · Componentes-chave

### Heading da página (`.page-h1`)
```css
.page-h1 {
  font-size: var(--fs-xl);          /* 20px */
  font-weight: var(--fw-semibold);  /* 600 */
  letter-spacing: var(--tracking-tight);
  line-height: var(--lh-tight);
}
```

### Section title (dentro de cards / panels)
```css
.section-title {
  font-size: var(--fs-md);          /* 13.5px */
  font-weight: var(--fw-medium);    /* 500 */
  letter-spacing: var(--tracking-tight);
}
```

### Uppercase label
```css
.label-up {
  font-size: var(--fs-sm);          /* 11.5px — pra header de tabela; em métrica usar 10.5px (--fs-xs) */
  font-weight: var(--fw-medium);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--text-muted);
}
```

### Ticker (mono, semibold)
```css
.ticker {
  font-family: var(--font-mono);
  font-feature-settings: 'tnum' 1;
  font-size: var(--fs-base);        /* 13px */
  font-weight: var(--fw-medium);
  letter-spacing: 0;                /* mono nunca tracking */
}
.ticker .arrow { color: var(--text-muted); margin: 0 4px; }
.ticker .on    { color: var(--success); }
.ticker .off   { color: var(--danger); }
```

### Kbd hint (atalho de teclado, sidebar)
```css
.kbd {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 1px 5px;
  border-radius: var(--radius-xs);
  margin-left: auto;
}
```
Usado em sidebar items: `Dashboard … G 1`.

### Hint / helper text (em formulários, mono pequeno)
```css
.hint {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
  line-height: 1.4;
}
```

---

## 7 · NÃO fazer

- ❌ Misturar serif. Se aparecer Fraunces, Playfair, etc — não é AI-Swing.
- ❌ Usar 14px / 15px (rompe a densidade).
- ❌ Bold (700) — se precisa enfatizar, suba o tamanho ou use accent.
- ❌ Letter-spacing positivo em mono.
- ❌ `text-transform: uppercase` SEM `letter-spacing: 0.06em`.
- ❌ `font-style: italic` em qualquer lugar (Linear DNA não usa).
- ❌ Substituir Inter por system-ui no Mac "porque fica parecido" — **não fica**, Inter tem métricas próprias e a UI quebra densidade.
