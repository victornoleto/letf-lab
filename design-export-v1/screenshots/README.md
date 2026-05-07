# Screenshots

> Os mocks visuais finais estão em **`AI-Swing redesign.html`** (raiz do projeto).
> Esse canvas mostra Linear/Vercel/Stripe lado a lado — a variação Stripe é a aprovada e é a base deste export.

Para gerar PNGs determinísticos das telas implementadas (post-merge), recomendo:

```bash
# Após implementar tokens + shell + Dashboard, rode o app local:
npm start

# Em outra aba, com Playwright:
npx playwright install chromium
node scripts/screenshot.js  # script abaixo
```

Sugestão de `scripts/screenshot.js`:

```js
import { chromium } from 'playwright';

const VIEWPORTS = [
  { w: 1366, h: 768 },
  { w: 768,  h: 1024 },
];
const PAGES = ['/dashboard', '/strategies', '/strategies/1', '/indicators'];

const browser = await chromium.launch();
for (const theme of ['light', 'dark']) {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.w, height: vp.h },
      colorScheme: theme,
    });
    const page = await ctx.newPage();
    for (const route of PAGES) {
      await page.goto(`http://localhost:4200${route}`);
      await page.evaluate((t) => localStorage.setItem('aiswing.theme', t), theme);
      await page.reload();
      await page.waitForLoadState('networkidle');
      const file = `screenshots/${theme}/${route.replace(/\//g, '_').slice(1) || 'home'}_${vp.w}.png`;
      await page.screenshot({ path: file, fullPage: true });
    }
  }
}
await browser.close();
```

Screenshots geradas pelo prototype (canvas) são úteis para validação rápida mas não são pixel-perfect ao output Angular final.
