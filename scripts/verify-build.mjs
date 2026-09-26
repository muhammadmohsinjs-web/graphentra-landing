// Post-build guard for the static site that Cloudflare serves from dist/.
//
// Fails the build when the page drifts from the contract that worker/internal/leads.js and
// migrations/0001_create_leads.sql rely on, when an asset reference is broken, or when
// server-side files would be published as public static assets.

import { readFile, readdir, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

const decode = value =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&#x0*27;/gi, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/**
 * Reads an attribute from one tag's source (or a bare attribute string). Attributes are
 * tokenized left to right, so text inside another attribute's value can never match.
 * Returns '' for boolean attributes and null when the attribute is absent.
 */
const attribute = (tag, name) => {
  const body = tag.replace(/^<[a-z][^\s/>]*/i, '').replace(/\/?>$/, '');
  for (const [, key, double, single, bare] of body.matchAll(/([^\s"'=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    if (key.toLowerCase() === name) return decode(double ?? single ?? bare ?? '');
  }
  return null;
};

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

const references = new Set([...html.matchAll(/\s(?:src|href)="(\/[^"#?]*)/g)].map(([, ref]) => ref));
for (const file of files.filter(name => /\.(html|css)$/.test(name))) {
  for (const [, ref] of (await readText(file)).matchAll(/url\(\s*["']?(\/[^"')?#\s]+)/g)) references.add(ref);
}
for (const ref of references) {
  if (ref.startsWith('/api/')) continue;
  const target = decodeURIComponent(ref).replace(/^\/+/, '');
  const exists = target === '' || files.includes(target) || files.includes(`${target.replace(/\/$/, '')}/index.html`);
  expect(exists, `Broken local reference in the built page: ${ref}`);
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
  `✓ dist/ verified: ${files.length} files, ${references.size} local references resolve, lead form matches the API ` +
    `(${roles.length} roles, ${interests.length} interests), no server-side files published.`
);
