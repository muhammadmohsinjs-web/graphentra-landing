// Renders public/og.png (1200x630) from scripts/og-source.html. Run by hand when the artwork changes:
//   node scripts/render-og.mjs
// Needs Playwright with Chromium, which is not a dependency of this project. The PNG is committed.
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(pathToFileURL(path.join(here, 'og-source.html')).href);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: path.join(here, '../public/og.png'), clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();
console.log('Wrote public/og.png');
