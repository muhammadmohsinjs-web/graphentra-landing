// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

// Fonts are self-hosted from the installed @fontsource-variable packages (no network
// access needed at build time). Astro adds preload links and metric-matched fallbacks.
const fontFile = (pkg, file) => `@fontsource-variable/${pkg}/files/${file}`;

export default defineConfig({
  // Keep HTML-aware whitespace handling so inline copy (<em>, <strong>, links) keeps its spaces.
  compressHTML: true,
  devToolbar: { enabled: false },
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Newsreader',
      cssVariable: '--font-newsreader',
      fallbacks: ['Georgia', 'serif'],
      options: {
        variants: [
          // The optical-size ("opsz") build gives sharper, higher-contrast forms at display sizes.
          { src: [fontFile('newsreader', 'newsreader-latin-opsz-normal.woff2')], weight: '200 800', style: 'normal' },
          { src: [fontFile('newsreader', 'newsreader-latin-opsz-italic.woff2')], weight: '200 800', style: 'italic' }
        ]
      }
    },
    {
      provider: fontProviders.local(),
      name: 'Geist',
      cssVariable: '--font-geist',
      fallbacks: ['system-ui', 'sans-serif'],
      options: {
        variants: [{ src: [fontFile('geist', 'geist-latin-wght-normal.woff2')], weight: '100 900', style: 'normal' }]
      }
    },
    {
      provider: fontProviders.local(),
      name: 'Geist Mono',
      cssVariable: '--font-geist-mono',
      fallbacks: ['ui-monospace', 'monospace'],
      options: {
        variants: [{ src: [fontFile('geist-mono', 'geist-mono-latin-wght-normal.woff2')], weight: '100 900', style: 'normal' }]
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
