// Post-build guard for the static site that Cloudflare serves from dist/.
//
// Fails the build when the page drifts from the contract that worker/internal/leads.js and
// migrations/0001_create_leads.sql rely on, when an asset reference is broken, or when
// server-side files would be published as public static assets.

import { readFile, readdir, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { attribute, decode, elementsWith, textOf } from './lib/html.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const require = createRequire(import.meta.url);
const { validatePayload } = require('../worker/internal/leads.js');

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(entry => (entry.isDirectory() ? listFiles(path.join(directory, entry.name)) : [path.join(directory, entry.name)]))
  );
  return nested.flat();
}

const fail = message => {
  console.error(`\nBuild verification failed:\n  ✗ ${message}\n`);
  process.exit(1);
};

/* ---------- Output exists ---------- */

const workerEntry = path.join(root, 'worker/index.js');
if (!(await stat(workerEntry).catch(() => null))?.isFile()) fail('worker/index.js (the Worker entry in wrangler.jsonc) is missing.');

const files = (await listFiles(dist).catch(() => fail('dist/ does not exist. Run `astro build` first.')))
  .map(file => path.relative(dist, file).split(path.sep).join('/'))
  .sort();
if (!files.includes('index.html')) fail('dist/index.html was not generated.');

const html = await readFile(path.join(dist, 'index.html'), 'utf8');
const migration = await readFile(path.join(root, 'migrations/0001_create_leads.sql'), 'utf8');
const readText = file => (file === 'index.html' ? html : readFile(path.join(dist, file), 'utf8'));
const scripts = (await Promise.all(files.filter(file => file.endsWith('.js')).map(readText))).join('\n');

/* ---------- Lead form contract ---------- */

expect(/\sid="early-access"/.test(html), 'The #early-access section is missing.');
expect(/href="#early-access" data-interest="Paid pilot"/.test(html), '"Discuss a pilot" link must be href="#early-access" data-interest="Paid pilot".');
expect(/action="\/api\/leads"/.test(html), 'The early-access form must submit to /api/leads.');

const form = html.match(/<form\b[^>]*>[\s\S]*?<\/form>/g)?.find(source => attribute(source.match(/^<form\b[^>]*>/)[0], 'action') === '/api/leads');
if (!form) fail('No <form action="/api/leads"> found in dist/index.html.');

const fields = [...form.matchAll(/<(input|select|textarea)\b[^>]*>/g)].map(([tag]) => tag);
const fieldNamed = name => fields.find(tag => attribute(tag, 'name') === name);
for (const name of ['name', 'email', 'company', 'role', 'challenge', 'interest', 'consent', 'website']) {
  expect(fieldNamed(name), `Form field name="${name}" is missing.`);
}

const challenge = fieldNamed('challenge');
if (challenge) {
  expect(attribute(challenge, 'id') === 'lead-challenge', 'The challenge field must keep id="lead-challenge".');
  expect(/minlength="20" maxlength="1000"/.test(challenge), 'The challenge field must keep minlength="20" maxlength="1000" (matches the API limits).');
}

const consent = fieldNamed('consent');
if (consent) {
  expect(attribute(consent, 'id') === 'lead-consent', 'The consent checkbox must keep id="lead-consent".');
  expect(attribute(consent, 'required') !== null, 'The consent checkbox must be required.');
}

const honeypot = fieldNamed('website');
if (honeypot) expect(attribute(honeypot, 'required') === null, 'The honeypot field must never be required.');

const roleSelect = form.match(/<select\b[^>]*\sname="role"[^>]*>([\s\S]*?)<\/select>/);
const roles = [...(roleSelect?.[1] ?? '').matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)]
  .map(([, attrs, text]) => attribute(attrs, 'value') ?? decode(text.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim())
  .filter(Boolean);
expect(roles.length > 0, 'The role select has no options.');

const interests = fields.filter(tag => attribute(tag, 'name') === 'interest').map(tag => attribute(tag, 'value') ?? '');
expect(interests.length > 0, 'There are no interest options.');

for (const role of roles) {
  expect(!validatePayload({ role }).fieldErrors.role, `Role option "${role}" would be rejected by the API (ALLOWED_ROLES).`);
  expect(migration.includes(`'${role}'`), `Role option "${role}" is not allowed by the leads.role CHECK constraint.`);
}
for (const interest of interests) {
  expect(!validatePayload({ interest }).fieldErrors.interest, `Interest option "${interest}" would be rejected by the API (ALLOWED_INTERESTS).`);
  expect(migration.includes(`'${interest}'`), `Interest option "${interest}" is not allowed by the leads.interest_type CHECK constraint.`);
}

for (const key of ['submission_id', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'referrer']) {
  expect(scripts.includes(key), `The client bundle no longer sends "${key}" with the lead payload.`);
}

for (const event of ['early_access_section_viewed', 'early_access_form_started', 'early_access_form_submitted', 'early_access_form_failed', 'discuss_pilot_clicked']) {
  expect(scripts.includes(event), `Analytics event "${event}" is missing from the client bundle.`);
}

/* ---------- Every local asset reference resolves ---------- */

const pageFiles = files.filter(name => name.endsWith('.html'));
const pageHtml = new Map(await Promise.all(pageFiles.map(async name => [name, await readText(name)])));
const references = new Set();
for (const source of pageHtml.values()) {
  for (const [, ref] of source.matchAll(/\s(?:src|href)="(\/[^"#?]*)/g)) references.add(ref);
}
for (const file of files.filter(name => /\.(html|css)$/.test(name))) {
  for (const [, ref] of (await readText(file)).matchAll(/url\(\s*["']?(\/[^"')?#\s]+)/g)) references.add(ref);
}
for (const ref of references) {
  if (ref.startsWith('/api/')) continue;
  const target = decodeURIComponent(ref).replace(/^\/+/, '');
  const exists = target === '' || files.includes(target) || files.includes(`${target.replace(/\/$/, '')}/index.html`);
  expect(exists, `Broken local reference in the built page: ${ref}`);
}

/* ---------- Multi-page site: sitemap, metadata, links, labels, claims support ---------- */

const siteSource = await readFile(path.join(root, 'src/data/site.ts'), 'utf8');
const siteUrl = siteSource.match(/url:\s*'(https:\/\/[^']+)'/)?.[1] ?? '';
expect(siteUrl.startsWith('https://'), 'site.url in src/data/site.ts must be an absolute https URL.');

const urlToFile = url => {
  const pathname = new URL(url, siteUrl || 'https://example.invalid').pathname;
  return pathname === '/' ? 'index.html' : pathname.endsWith('/') ? `${pathname.slice(1)}index.html` : pathname.slice(1);
};
const fileToPath = file => (file === 'index.html' ? '/' : file.endsWith('/index.html') ? `/${file.slice(0, -'index.html'.length)}` : `/${file}`);

/* Sitemap: every listed URL is emitted, and every indexable page is listed. */
const sitemap = files.includes('sitemap.xml') ? await readText('sitemap.xml') : '';
expect(sitemap.length > 0, 'sitemap.xml was not generated.');
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => url);
for (const url of sitemapUrls) {
  expect(url.startsWith(`${siteUrl}/`), `Sitemap URL is not on ${siteUrl}: ${url}`);
  expect(url.endsWith('/'), `Sitemap URL must end with a slash (trailingSlash is "always"): ${url}`);
  expect(files.includes(urlToFile(url)), `Sitemap lists a page that was not emitted: ${url}`);
}
expect(new Set(sitemapUrls).size === sitemapUrls.length, 'The sitemap lists a URL more than once.');
const robots = files.includes('robots.txt') ? await readText('robots.txt') : '';
expect(robots.includes(`Sitemap: ${siteUrl}/sitemap.xml`), 'robots.txt must point at the sitemap.');

const isHidden = source => /<meta name="robots" content="[^"]*noindex/i.test(source);
const capabilityStatus = new Map();
const capabilitiesSource = (await readFile(path.join(root, 'src/data/capabilities.ts'), 'utf8')).split('export interface NotYet')[0];
for (const [, id, status] of capabilitiesSource.matchAll(/id:\s*'([^']+)',[\s\S]*?status:\s*'(built|in-development|planned)'/g)) capabilityStatus.set(id, status);
expect(capabilityStatus.size >= 20, 'Could not read the capability list from src/data/capabilities.ts.');

const titles = new Map();
const descriptions = new Map();
const canonicals = new Map();
const exampleTokens = [/PR\s*#482/, /AUTH-1287/, /validateToken/, /OTP login/, /Guardian access/, /Password login/];

for (const [file, source] of pageHtml) {
  const where = `/${file}`;
  const hidden = isHidden(source);
  const title = decode(source.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '').trim();
  const description = attribute(source.match(/<meta\b[^>]*\sname="description"[^>]*>/)?.[0] ?? '', 'content') ?? '';
  const canonical = attribute(source.match(/<link\b[^>]*\srel="canonical"[^>]*>/)?.[0] ?? '', 'href');

  expect(/<html\b[^>]*\slang="en-GB"/.test(source), `${where}: <html lang="en-GB"> is missing.`);
  expect(title.length > 0 && title.length <= 60, `${where}: the title must be 1 to 60 characters (found ${title.length}).`);
  expect(description.length > 0 && description.length <= 155, `${where}: the meta description must be 1 to 155 characters (found ${description.length}).`);
  expect(!titles.has(title), `${where}: the title duplicates ${titles.get(title)}.`);
  expect(!descriptions.has(description), `${where}: the description duplicates ${descriptions.get(description)}.`);
  titles.set(title, where);
  descriptions.set(description, where);

  if (hidden) {
    expect(canonical === null, `${where}: a noindex page should not declare a canonical.`);
    expect(!sitemapUrls.includes(`${siteUrl}${fileToPath(file)}`), `${where}: a noindex page must not be in the sitemap.`);
  } else {
    expect(canonical === `${siteUrl}${fileToPath(file)}`, `${where}: canonical must be ${siteUrl}${fileToPath(file)} (found ${canonical}).`);
    expect(!canonicals.has(canonical), `${where}: the canonical duplicates ${canonicals.get(canonical)}.`);
    canonicals.set(canonical, where);
    expect(sitemapUrls.includes(canonical), `${where}: the page is indexable but missing from the sitemap.`);
  }

  const h1s = source.match(/<h1\b/g)?.length ?? 0;
  expect(h1s === 1, `${where}: expected exactly one <h1> (found ${h1s}).`);

  for (const property of ['og:title', 'og:description', 'og:image', ...(hidden ? [] : ['og:url'])]) {
    expect(new RegExp(`<meta[^>]*property="${property}"`).test(source), `${where}: ${property} is missing.`);
  }
  expect(/<meta[^>]*name="twitter:card"[^>]*summary_large_image/.test(source), `${where}: twitter:card must be summary_large_image.`);
  const ogImage = attribute(source.match(/<meta\b[^>]*property="og:image"[^>]*>/)?.[0] ?? '', 'content') ?? '';
  expect(ogImage.startsWith(`${siteUrl}/`) && files.includes(urlToFile(ogImage)), `${where}: og:image must be an absolute URL to a file that is emitted (${ogImage}).`);

  for (const [, json] of source.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(json);
    } catch {
      expect(false, `${where}: JSON-LD does not parse.`);
    }
  }

  const currents = source.match(/<a\b[^>]*aria-current="page"/g)?.length ?? 0;
  expect(currents <= 2, `${where}: too many links marked aria-current="page" (${currents}).`);

  /* Example data is always labelled, and never appears outside a labelled element. */
  const examples = elementsWith(source, 'data-example');
  for (const example of examples) {
    expect(/data-example-label/.test(example) && /Illustrative example/.test(example), `${where}: an element with data-example has no "Illustrative example" label inside it.`);
  }
  let outside = source;
  for (const example of examples) outside = outside.replace(example, ' ');
  // Navigation, the hero figure's accessible names and structured data are not visible example content.
  const outsideText = textOf(outside);
  for (const token of exampleTokens) {
    expect(!token.test(outsideText), `${where}: example content (${token}) appears outside an element marked data-example.`);
  }

  /* Status chips must agree with src/data/capabilities.ts. */
  for (const chip of source.matchAll(/<span\b[^>]*\sdata-status="([^"]+)"[^>]*>/g)) {
    const id = attribute(chip[0], 'data-capability');
    if (!id) continue;
    expect(capabilityStatus.get(id) === chip[1], `${where}: chip for "${id}" says "${chip[1]}", but capabilities.ts says "${capabilityStatus.get(id)}".`);
  }

  /* Any page that says "proof" or "prove" states the limit of proof. */
  const visible = textOf(source);
  if (/\bprov(?:e|es|ed|en|ing)\b|\bproof\b/i.test(visible)) {
    expect(/data-proof-limit/.test(source) && visible.includes('No path found is not proof of safety.'), `${where}: uses "prove" or "proof" without stating the limit of proof.`);
  }
}
expect(pageHtml.size >= 9, `Expected at least 9 pages (home, 7 subpages, 404), found ${pageHtml.size}.`);

/* Internal links and anchors resolve on every page. */
const idsOf = source => new Set([...source.matchAll(/\sid="([^"]+)"/g)].map(([, id]) => id));
const idCache = new Map([...pageHtml].map(([file, source]) => [file, idsOf(source)]));
let linkCount = 0;
for (const [file, source] of pageHtml) {
  for (const [, href] of source.matchAll(/<a\b[^>]*\shref="([^"]*)"/g)) {
    if (!href || /^(https?:|mailto:|tel:|\/\/)/.test(href) || href.startsWith('/api/')) continue;
    linkCount += 1;
    const [withoutHash, hash = ''] = href.split('#');
    const [pathname] = withoutHash.split('?');
    const targetFile = pathname === '' ? file : urlToFile(pathname);
    expect(pageHtml.has(targetFile), `/${file}: link to a page that does not exist: ${href}`);
    if (hash && pageHtml.has(targetFile)) expect(idCache.get(targetFile).has(hash), `/${file}: link to a missing anchor: ${href}`);
  }
}

/* The early-access call to action on every other page points at the form, and GSAP stays out of the shared entry. */
for (const [file, source] of pageHtml) {
  if (file === 'index.html' || file === '404.html') expect(file === '404.html' || /id="early-access"/.test(source), '/: the form section is missing.');
  else expect(/href="\/(?:\?[^"#]*)?#early-access"/.test(source), `/${file}: no link to /#early-access.`);
}
const entries = files.filter(name => /PageLayout\..*\.js$/.test(name));
expect(entries.length > 0, 'The shared page script (PageLayout…js) was not emitted.');
for (const entry of entries) {
  const code = await readText(entry);
  expect(!code.includes('ScrollTrigger'), `dist/${entry}: the shared script must not bundle GSAP ScrollTrigger (load it on the home page only).`);
}

/* ---------- Nothing server-side is published ---------- */

const forbiddenPaths = [
  /^(worker|migrations|tests?|scripts|src|node_modules)\//,
  /\.sql$/i,
  /(^|\/)wrangler\.(json|jsonc|toml)$/,
  /(^|\/)\.dev\.vars/,
  /(^|\/)\.env/,
  /(^|\/)package(-lock)?\.json$/
];
for (const file of files) {
  expect(!forbiddenPaths.some(pattern => pattern.test(file)), `Server-side file would be published: dist/${file}`);
}

const serverMarkers = ['LEADS_RATE_LIMIT_SALT', 'ALLOWED_ROLES', 'lead_submission_limits', 'persistLead'];
for (const file of files.filter(name => /\.(html|js|mjs|css|svg|json|txt|xml|map)$/.test(name))) {
  const text = await readText(file);
  for (const marker of serverMarkers) {
    expect(!text.includes(marker), `Worker code appears to be bundled into dist/${file} (found "${marker}").`);
  }
}

/* ---------- Report ---------- */

if (failures.length) {
  console.error(`\nBuild verification failed (${failures.length}):\n${failures.map(message => `  ✗ ${message}`).join('\n')}\n`);
  process.exit(1);
}

console.log(
  `✓ dist/ verified: ${pageHtml.size} pages, ${files.length} files, ${references.size} asset references and ${linkCount} internal links resolve, ` +
    `sitemap matches, lead form matches the API (${roles.length} roles, ${interests.length} interests), no server-side files published.`
);
