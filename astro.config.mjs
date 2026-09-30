// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

// Keep in step with `site.url` in src/data/site.ts (canonicals, sitemap and Open Graph read that one).
const siteUrl = 'https://www.graphentra.com';

// Fonts are self-hosted from the installed @fontsource-variable packages (no network
// access needed at build time). Astro adds preload links and metric-matched fallbacks.
const fontFile = (pkg, file) => `@fontsource-variable/${pkg}/files/${file}`;

export default defineConfig({
  site: siteUrl,
  // /product/ rather than /product: one URL per page, matched by the sitemap and the canonicals.
  trailingSlash: 'always',
  // Keep HTML-aware whitespace handling so inline copy (<em>, <strong>, links) keeps its spaces.
  compressHTML: true,
  // Inline the (small, per-page) CSS so the first paint does not wait for a stylesheet round trip.
  build: { inlineStylesheets: 'always' },
  devToolbar: { enabled: false },
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Bricolage Grotesque',
      cssVariable: '--font-bricolage',
      fallbacks: ['system-ui', 'sans-serif'],
      options: {
        variants: [{ src: [fontFile('bricolage-grotesque', 'bricolage-grotesque-latin-wght-normal.woff2')], weight: '200 800', style: 'normal' }]
      }
    },
    {
      provider: fontProviders.local(),
      name: 'Instrument Sans',
      cssVariable: '--font-instrument',
      fallbacks: ['system-ui', 'sans-serif'],
      options: {
        variants: [{ src: [fontFile('instrument-sans', 'instrument-sans-latin-wght-normal.woff2')], weight: '400 700', style: 'normal' }]
      }
    },
    {
      provider: fontProviders.local(),
      name: 'JetBrains Mono',
      cssVariable: '--font-jetbrains',
      fallbacks: ['ui-monospace', 'monospace'],
      options: {
        variants: [{ src: [fontFile('jetbrains-mono', 'jetbrains-mono-latin-wght-normal.woff2')], weight: '100 800', style: 'normal' }]
      }
    }
  ],
  vite: {
    server: {
      // Run `npx wrangler dev` in parallel with Astro to serve the real /api/leads Worker.
      proxy: { '/api': 'http://127.0.0.1:8787' }
    }
  }
});
