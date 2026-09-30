import type { APIRoute } from 'astro';
import { pages, site } from '../data/site';

/** Every indexable page, taken from src/data/site.ts so the sitemap cannot list a page that does not exist. */
export const GET: APIRoute = () => {
  const urls = Object.values(pages)
    .filter(page => !page.hidden)
    .map(page => `  <url><loc>${new URL(page.path, site.url).href}</loc></url>`)
    .join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
