'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { loadData, strings, root } = require('./helpers/load-data');

const capabilities = loadData('capabilities');
const site = loadData('site');
const example = loadData('example');
const faq = loadData('faq');
const personas = loadData('personas');
const compare = loadData('compare');

const STATUSES = ['built', 'in-development', 'planned'];

test('every capability has a unique id, a valid status and non-empty copy', () => {
  const ids = capabilities.capabilities.map(capability => capability.id);
  assert.equal(new Set(ids).size, ids.length, 'capability ids must be unique');
  for (const capability of capabilities.capabilities) {
    assert.ok(STATUSES.includes(capability.status), `${capability.id}: unknown status ${capability.status}`);
    assert.ok(capability.title.trim() && capability.summary.trim(), `${capability.id}: title and summary are required`);
  }
  assert.ok(capabilities.byStatus('built').length > 0, 'the prototype has built capabilities');
});

test('the roadmap horizon is derived from status, so it cannot drift from the claims', () => {
  assert.equal(capabilities.horizonOf('built'), 'now');
  assert.equal(capabilities.horizonOf('in-development'), 'next');
  assert.equal(capabilities.horizonOf('planned'), 'later');
  assert.deepEqual(capabilities.horizons.map(horizon => horizon.status), STATUSES);
});

test('every capability referenced by a page exists', () => {
  const referenced = new Set();
  for (const step of site.howItWorks) step.capabilities.forEach(id => referenced.add(id));
  for (const item of site.differentiators) item.capabilities.forEach(id => referenced.add(id));
  for (const persona of personas.personas) persona.gives.forEach(give => referenced.add(give.capability));
  for (const item of personas.alsoFor) referenced.add(item.capability);
  for (const item of personas.audiences) if (item.capability) referenced.add(item.capability);
  for (const row of compare.compareRows) row.graphentra.capabilities.forEach(id => referenced.add(id));
  assert.ok(referenced.size > 10);
  for (const id of referenced) assert.doesNotThrow(() => capabilities.capabilityById(id), `unknown capability "${id}"`);
});

test('unsupported features are limitations, not claims', () => {
  assert.ok(capabilities.notYet.length > 0);
  for (const item of capabilities.notYet) assert.equal(item.status, undefined, `${item.id}: a limitation must not carry a status`);
  const browser = capabilities.capabilityById('browser-api-verification');
  assert.equal(browser.status, 'planned', 'browser and API verification is planned, not in development');
});

test('page metadata fits the limits and every route is unique', () => {
  const entries = Object.entries(site.pages);
  assert.equal(new Set(entries.map(([, page]) => page.path)).size, entries.length);
  for (const [id, page] of entries) {
    assert.ok(page.title.length <= 60, `${id}: title is ${page.title.length} characters`);
    assert.ok(page.description.length <= 155, `${id}: description is ${page.description.length} characters`);
    assert.ok(page.path === '/404.html' || page.path.endsWith('/'), `${id}: paths end with a slash`);
  }
  assert.equal(site.site.url, 'https://www.graphentra.com');
  assert.deepEqual(site.site.social, [], 'no social URLs until the founder supplies real ones');
  assert.ok(site.nav.every(item => site.pages[item.id]), 'every nav item is a page');
  assert.equal(site.earlyAccessHref, '/#early-access');
});

test('exactly four market figures, each with its source, year and link', () => {
  assert.equal(site.marketStats.length, 4);
  assert.deepEqual(
    site.marketStats.map(stat => stat.figure),
    ['66%', '89%', 'Faster, less stable', '3.1% → 5.7%']
  );
  for (const stat of site.marketStats) {
    assert.match(stat.href, /^https:\/\//);
    assert.ok(stat.source && stat.basis);
    assert.ok(stat.year >= 2025 && stat.year <= 2026);
  }
});

test('the example dataset is internally consistent', () => {
  assert.equal(example.exampleLabel, 'Illustrative example');
  assert.equal(example.pr.number, 482);
  const unknown = example.surfaces.find(surface => surface.id === 'unknown');
  assert.equal(unknown.confidence, 'unknown');
  assert.equal(unknown.testReaches, null, 'an untraced surface cannot say whether a test reaches it');
  assert.equal(example.flows.length, 3);
  for (const surface of example.surfaces) {
    assert.ok(['proven', 'likely', 'unknown'].includes(surface.confidence));
    assert.ok(surface.proofPath.length > 0, `${surface.id}: every surface has a path or a reason`);
  }
  assert.equal(example.reach.length, example.surfaces.length);
  assert.equal(example.checklist.length, example.surfaces.length);
});

test('no copy in the data modules trips the claims lint', async () => {
  const { lintText } = await import('../scripts/claims-lint.mjs');
  const text = [site, capabilities, example, faq, personas, compare]
    .flatMap(module => Object.entries(module).filter(([name]) => name !== 'marketStats'))
    .flatMap(([, value]) => strings(value))
    .join(' ');
  const { fails } = lintText(text);
  assert.deepEqual(fails, []);
});

test('the repository publishes no prices', () => {
  const files = [];
  const walk = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(astro|ts|md)$/.test(entry.name)) files.push(full);
    }
  };
  walk(path.join(root, 'src'));
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /[$£€]\s?\d/, `${path.relative(root, file)} contains a currency amount`);
  }
});

test('the hero keeps the Discuss a pilot link the lead form tests rely on', () => {
  const hero = fs.readFileSync(path.join(root, 'src/components/Hero.astro'), 'utf8');
  assert.match(hero, /<a class="btn btn-ghost" href="#early-access" data-interest="Paid pilot">Discuss a pilot<\/a>/);
});
