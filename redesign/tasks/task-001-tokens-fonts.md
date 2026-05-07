# Task 001 (v2) — Tokens + fonts swap (Stripe DNA → Linear DNA)

**Goal:** Replace the current Stripe/Vercel design tokens with the new Linear DNA tokens. Swap IBM Plex Sans/Mono for **Inter + JetBrains Mono**. Update the FOUC script + localStorage key. After this task the entire app may look broken (because component SCSS still uses old token names that may not exist anymore) — that's fine; task 002 fixes it.

## Context: what the codebase has now

- `frontend/src/styles/tokens.scss` — Stripe-DNA tokens (`--shadow-modal`, `--space-2/3/4/5/6/7/8/9` 2-base scale, `--text-h1` font shorthand, IBM Plex stacks, etc.)
- `frontend/src/index.html` — Has IBM Plex Sans + IBM Plex Mono Google Fonts links, FOUC script using `aiswing.theme` storage key, inlined icon sprite
- `frontend/src/styles.scss` — `@use 'styles/tokens';` + `@use 'styles/components';` plus base resets

## Sources

1. `design-export/01-tokens.scss` — full file, copy verbatim BUT see "JSX-canonical overrides" below
2. `design-export/02-typography.md` — Inter + JetBrains Mono Google Fonts link, weights 400/500/600, scale `--fs-*` instead of `--text-*`
3. `design-export/06-theme-toggle.md` — new FOUC script with storage key `ai-swing.theme` and default `'light'`
4. `design-export/capture-shell.jsx` (TOKENS_LIGHT and TOKENS_DARK at the top) — **canonical hex values for light + dark**. Where this differs from `01-tokens.scss`, the JSX wins (it's what actually rendered in the design preview).

## JSX-canonical overrides for `01-tokens.scss`

The markdown file `01-tokens.scss` and the canonical JSX (`capture-shell.jsx`) disagree on a handful of dark-theme hex values. After copying the markdown, **patch the dark-theme block** with these JSX-canonical values:

```scss
[data-theme="dark"] {
  --bg:               #08090a;   // was #0a0a0c in markdown
  --surface:          #101113;   // was #0f1014
  --surface-elevated: #16181b;   // was #15171c
  --surface-muted:    #1f1f24;   // unchanged
  --sidebar-bg:       #0c0d0f;   // was #0b0c10

  --text-primary:     #f7f8f8;   // was #f5f6f8
  --text-secondary:   #b4bbc4;   // was #c8ccd4 (JSX is slightly less bright)
  --text-muted:       #7d818b;   // was #7d828c

  --border:           #23262d;   // was #27272a
  --border-subtle:    #1a1c20;   // was #16181e
  --border-strong:    #3f3f46;   // unchanged

  --accent:           #7170ff;   // was #7c87f0 (JSX is more vivid violet)
  --accent-soft:      rgba(113, 112, 255, 0.16);
  --accent-fg:        #7170ff;
  --focus-ring:       rgba(113, 112, 255, 0.40);

  --success:          #4cb782;   // was #3ddc84 (JSX is more muted)
  --success-soft:     rgba(76, 183, 130, 0.14);
  --success-fg:       #4cb782;

  --danger:           #eb5757;   // was #ef4444 (slightly redder)
  --danger-soft:      rgba(235, 87, 87, 0.14);
  --danger-fg:        #eb5757;

  --warn:             #f2994a;   // was #f5a524
  --warn-soft:        rgba(242, 153, 74, 0.14);
  --warn-fg:          #f2994a;

  --info:             #5e6ad2;   // was #7aa9ff (dark info = light accent)
  --info-soft:        rgba(94, 106, 210, 0.20);
  --info-fg:          #5e6ad2;

  --chart-grid:       #1a1c20;
  --chart-axis:       #52525b;
  --chart-equity:     #4cb782;
  --chart-equity-fill: rgba(76, 183, 130, 0.12);
  --chart-ratio:      #7170ff;

  /* shadows + scrim from markdown unchanged */
}
```

Light theme tokens **match** between markdown and JSX — no overrides needed there.

## Font clarification: Inter vs Inter Tight

The OVERVIEW prose says "Inter Tight" but every canonical artifact (`capture-shell.jsx`, `frame.html`, `02-typography.md`'s `<link>`) loads plain **Inter**. **Use plain `Inter`** (NOT `Inter Tight`). The `<link>` URL must be:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

Set `--font-sans: 'Inter', system-ui, ...` accordingly in tokens.scss.

## Files to modify

### `frontend/src/styles/tokens.scss`

**Replace the entire file** with the contents of `design-export/01-tokens.scss`. The new file:
- Defines `:root` with light theme (default)
- Defines `[data-theme="dark"]` with dark overrides
- Includes its own reset (`html, body`, `.mono`, `:focus-visible`, scrollbar)
- Uses `--fs-*` scale (NOT `--text-*` shorthand), `--font-sans` / `--font-mono`
- New chart vars: `--chart-grid`, `--chart-axis`, `--chart-equity`, `--chart-equity-fill`, `--chart-ratio` (NO more `--chart-strategy`, `--chart-benchmark`, `--chart-leveraged`, `--chart-tooltip-*`)
- New tokens: `--accent`, `--accent-hover`, `--accent-active`, `--accent-soft`, `--accent-fg`, `--focus-ring`, `--text-on-accent`, `--success-soft`, `--success-fg`, `--danger-soft`, `--danger-fg`, `--warn`, `--warn-soft`, `--warn-fg`, `--info-soft`, `--info-fg`, `--overlay`, `--sidebar-bg`
- New spacing: 4-base scale (`--space-1: 4px`, ..., `--space-10: 64px`)
- New radii: `--radius-xs` (3px) ... `--radius-xl` (8px), `--radius-pill`
- New density: `--h-input` 32px, `--h-btn` 30px, `--h-btn-sm` 24px, `--h-row` 36px, `--h-nav-item` 28px, `--h-topbar` 48px
- New motion: `--ease-out`, `--duration-fast` 120ms, `--duration-base` 180ms

**Important:** several token names from the old file no longer exist (`--bg`, `--surface`, `--border`, `--success`, `--danger`, `--info` survive but their values change; `--shadow-modal`, `--shadow-xs`, `--text-h1...`, `--space-2...` change; `--primary` etc. become `--accent`).

### `frontend/src/index.html`

1. **Remove** the IBM Plex Sans + IBM Plex Mono `<link>` tags. **Add** Inter + JetBrains Mono per `02-typography.md`:
   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
   <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
   ```

2. **Replace** the FOUC-prevention `<script>` with the new one (`06-theme-toggle.md` §3) that:
   - Uses storage key `ai-swing.theme` (note the dash)
   - Defaults to `'light'` when storage is empty (not 'system')
   - Reads `prefers-color-scheme` only when explicitly stored as `'system'`
   - Wraps in IIFE with try/catch

   ```html
   <script>
     (function () {
       try {
         var v = localStorage.getItem('ai-swing.theme');
         var resolved =
           v === 'dark' ? 'dark' :
           v === 'light' ? 'light' :
           v === 'system' && window.matchMedia &&
             window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
         document.documentElement.setAttribute('data-theme', resolved);
       } catch (e) {
         document.documentElement.setAttribute('data-theme', 'light');
       }
     })();
   </script>
   ```

3. Add a small inline `<style>` immediately after the script (per `06-theme-toggle.md` §3) so blank-screen pre-bootstrap is on the right color:
   ```html
   <style>html { background: var(--bg); color: var(--text-primary); }</style>
   ```

4. **Keep** the inlined icon sprite untouched. The icon set didn't change.

### `frontend/src/styles.scss`

Most of the global resets are now inside `tokens.scss` (the new one bundles `html, body { ... }` and `:focus-visible { ... }`). Simplify `styles.scss`:

```scss
@use 'styles/tokens';
@use 'styles/components';

a { color: inherit; text-decoration: none; }
button { font-family: inherit; }
table { border-collapse: collapse; width: 100%; }

::selection { background: var(--accent-soft); color: var(--text-primary); }
```

Anything more specific should live in `_components.scss` partials, NOT here. If you find redundant rules between `tokens.scss` and `styles.scss`, prefer keeping them in `tokens.scss` (since it's the canonical source).

### Storage key migration (one-time)

The old code wrote `aiswing.theme` (no dash). The new code reads `ai-swing.theme` (with dash). Existing browser sessions will lose their preference once. Acceptable — design-export defines the new key as canonical. Don't write a JS migration; just leave it.

## Files NOT to modify in this task

- Any `*.component.scss` or `*.component.ts` — they may break visually but you fix in task 002+. Build must still pass.
- Any partial in `frontend/src/styles/components/` — task 002 handles those.
- `frontend/src/app/shared/theme/theme.service.ts` — task 003 updates the service to use the new storage key.

## Verification

```bash
cd /var/www/pessoal/ai-swing/frontend
npx ng build --configuration=development
```

The build MUST succeed. Visual breakage in component partials is **expected at this stage** — the new tokens.scss redefines vars that partials reference, but undefined CSS vars resolve to empty strings (graceful degradation). What can break the build is:
- A typo in a partial that references a SCSS `@use`-imported variable that doesn't exist.
- Removing tokens.scss accidentally.

If build fails: check the error, look at which SCSS file references something undefined, and either add the var to tokens.scss or remove the reference. Document any changes in a comment.

Optional sanity:
```bash
grep -E '^(--accent|--font-sans|--fs-base|--h-input|--ease-out)' /var/www/pessoal/ai-swing/frontend/src/styles/tokens.scss
# Should print 5+ lines.

grep "ai-swing.theme" /var/www/pessoal/ai-swing/frontend/src/index.html
# Should print at least 1 line (the new key).

grep "Inter:wght" /var/www/pessoal/ai-swing/frontend/src/index.html
# Should print 1 line.

grep "IBM Plex" /var/www/pessoal/ai-swing/frontend/src/index.html
# Should print 0 lines.
```

## Definition of done

1. `tokens.scss` is the verbatim Linear-DNA file from `design-export/01-tokens.scss`.
2. `index.html` loads Inter + JetBrains Mono only (no IBM Plex), uses the new FOUC script with storage key `ai-swing.theme` default `'light'`, and has the early `<style>html{...}</style>` block.
3. `styles.scss` is slim — only `@use` of tokens + components, plus minimal global rules.
4. `npx ng build` passes.
5. Print `TASK DONE: task-001-tokens-fonts.md` at the end.
