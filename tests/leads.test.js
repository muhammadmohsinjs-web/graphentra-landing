'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { DatabaseSync } = require('node:sqlite');
const { handler, validatePayload, createFingerprint, runConfiguration, persistLead } = require('../worker/internal/leads.js');

const root = path.resolve(__dirname, '..');
const migrationSql = fs.readFileSync(path.join(root, 'migrations/0001_create_leads.sql'), 'utf8');

function baseEnvironment(database) {
  return {
    DB: database,
    WEBSITE_LEAD_SOURCE: 'website',
    LEADS_RATE_LIMIT_SALT: 'test-rate-limit-salt-at-least-16'
  };
}

function createLeadDatabase() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(migrationSql);
  const d1 = {
    _sqlite: sqlite,
    prepare(source) {
      const statement = sqlite.prepare(source);
      const pending = {};
      pending.bind = (...args) => {
        pending._args = args;
        return pending;
      };
      pending.run = async () => {
        const info = statement.run(...(pending._args || []));
        return { meta: { changes: Number(info.changes), last_row_id: Number(info.lastInsertRowid) } };
      };
      pending.first = async () => {
        const row = statement.get(...(pending._args || []));
        return row === undefined ? null : row;
      };
      pending.all = async () => ({ results: statement.all(...(pending._args || [])) });
      return pending;
    }
  };
  return d1;
}

function validPayload(overrides = {}) {
  return {
    submission_id: '8af28c15-c166-4c9d-a258-37f40226cb0f',
    name: 'Ada Lovelace',
    email: 'Ada@Example.com',
    company: 'Analytical Engines',
    role: 'QA Lead or Manager',
    challenge: 'We need a clearer way to choose regression scope after shared code changes.',
    interest: 'Early access',
    consent: true,
    website: '',
    source: 'website',
    utm_source: 'engineering-weekly',
    utm_medium: 'newsletter',
    utm_campaign: 'early-access',
    utm_content: 'footer-cta',
    referrer: 'https://example.com/article',
    ...overrides
  };
}

function webRequest(body, overrides = {}) {
  const headers = {
    'content-type': 'application/json',
    'x-forwarded-for': '203.0.113.10',
    ...overrides.headers
  };
  const method = overrides.method || 'POST';
  const options = { method, headers };
  if (method !== 'GET' && method !== 'HEAD' && body !== null && body !== undefined) {
    options.body = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  }
  const request = new Request('https://graphentra.example/api/leads', options);
  request.socket = { remoteAddress: '127.0.0.1' };
  return request;
}

async function run(body, overrides = {}) {
  return handler(webRequest(body, overrides), overrides.env || baseEnvironment(createLeadDatabase()));
}

function allLeads(d1) {
  return d1._sqlite.prepare('select * from leads').all();
}

function attemptCount(d1) {
  return d1._sqlite.prepare('select count(*) as count from lead_submission_limits').get().count;
}

test('persists a valid lead with normalized email, consent, and attribution', async () => {
  const database = createLeadDatabase();
  const env = baseEnvironment(database);
  const res = await handler(webRequest(validPayload()), env);

  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.ok, true);

  const rows = allLeads(database);
  assert.equal(rows.length, 1);
  const lead = rows[0];
  assert.equal(lead.submission_id, validPayload().submission_id);
  assert.equal(lead.email, 'ada@example.com');
  assert.equal(lead.consent_given, 1);
  assert.match(lead.consented_at, /^2026-09-05/);
  assert.equal(lead.utm_campaign, 'early-access');
  assert.equal(lead.referrer, 'https://example.com/article');
  assert.equal(lead.source, 'website');
});

test('rejects invalid email without writing a lead', async () => {
  const database = createLeadDatabase();
  const res = await handler(webRequest(validPayload({ email: 'not-an-email' })), baseEnvironment(database));
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.equal(body.fieldErrors.email, 'Enter a valid email address.');
  assert.equal(allLeads(database).length, 0);
  assert.equal(attemptCount(database), 0);
});

test('rejects empty required fields', async () => {
  const res = await handler(webRequest(validPayload({ name: '', company: '', role: '' })), baseEnvironment(createLeadDatabase()));
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.deepEqual(Object.keys(body.fieldErrors).sort(), ['company', 'name', 'role']);
});

test('rejects a challenge shorter than 20 characters', async () => {
  const res = await handler(webRequest(validPayload({ challenge: 'Too much regression' })), baseEnvironment(createLeadDatabase()));
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.equal(body.fieldErrors.challenge, 'Use at least 20 characters.');
});

test('rejects a submission without consent', async () => {
  const res = await handler(webRequest(validPayload({ consent: false })), baseEnvironment(createLeadDatabase()));
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.equal(body.fieldErrors.consent, 'Consent is required before we can contact you.');
});

test('rejects the hidden honeypot when populated', async () => {
  const database = createLeadDatabase();
  const res = await handler(webRequest(validPayload({ website: 'spam.example' })), baseEnvironment(database));
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.ok, false);
  assert.equal(allLeads(database).length, 0);
});

test('rejects non-POST and non-JSON requests', async () => {
  const getRes = await handler(webRequest(validPayload(), { method: 'GET' }), baseEnvironment(createLeadDatabase()));
  assert.equal(getRes.status, 405);
  const formRes = await handler(
    webRequest(validPayload(), { headers: { 'content-type': 'text/plain' } }),
    baseEnvironment(createLeadDatabase())
  );
  assert.equal(formRes.status, 415);
});

test('accepts idempotent duplicate submissions without creating a second row', async () => {
  const database = createLeadDatabase();
  const env = baseEnvironment(database);
  const payload = validPayload();
  const first = await handler(webRequest(payload), env);
  const second = await handler(webRequest(payload), env);
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.equal(allLeads(database).length, 1);
});

test('suppresses a duplicate lead for the same email within the short window', async () => {
  const database = createLeadDatabase();
  const env = baseEnvironment(database);
  const first = await handler(webRequest(validPayload()), env);
  const second = await handler(
    webRequest(validPayload({ submission_id: 'e1a3f8c5-9d4b-43b2-a10f-4e6b1c2d3e4f', name: 'Ada Lovelace Two' })),
    env
  );
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.equal(allLeads(database).length, 1);
});

test('rate limits at three attempts per fingerprint in ten minutes', async () => {
  const database = createLeadDatabase();
  const env = baseEnvironment(database);
  const responses = [];
  for (let index = 0; index < 4; index += 1) {
    const payload = validPayload({
      submission_id: `8af28c15-c166-4c9d-a258-37f40226cb0${index}`,
      email: `person${index}@example.com`,
      challenge: `Choice of regression scope after shared changes, attempt number ${index + 1}.`
    });
    responses.push(await handler(webRequest(payload), env));
  }
  assert.equal(responses[0].status, 201);
  assert.equal(responses[1].status, 201);
  assert.equal(responses[2].status, 201);
  assert.equal(responses[3].status, 429);
  assert.equal(allLeads(database).length, 3);
  assert.equal(attemptCount(database), 3);
});

test('returns a safe retryable error when persistence fails', async () => {
  const failingDatabase = {
    prepare() {
      throw new Error('private database detail');
    }
  };
  const originalError = console.error;
  console.error = () => {};
  const res = await handler(webRequest(validPayload()), baseEnvironment(failingDatabase));
  console.error = originalError;
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.deepEqual(Object.keys(body).sort(), ['ok', 'requestId']);
  assert.equal(JSON.stringify(body).includes('private database detail'), false);
});

test('returns a configuration error without claiming persistence', async () => {
  const originalError = console.error;
  console.error = () => {};
  const database = createLeadDatabase();
  const missingSalt = await handler(webRequest(validPayload()), { DB: database, LEADS_RATE_LIMIT_SALT: '' });
  const missingDb = await handler(webRequest(validPayload()), { LEADS_RATE_LIMIT_SALT: 'test-rate-limit-salt-at-least-16' });
  console.error = originalError;
  assert.equal(missingSalt.status, 503);
  assert.equal(missingDb.status, 503);
  assert.equal((await missingSalt.json()).ok, false);
});

test('rejects a request that exceeds the size limit', async () => {
  const res = await handler(webRequest(validPayload({ challenge: 'x'.repeat(20_000) })), baseEnvironment(createLeadDatabase()));
  assert.equal(res.status, 413);
});

test('homepage includes accessible form contracts and the D1 migration covers leads and rate limits', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const migration = fs.readFileSync(path.join(root, 'migrations/0001_create_leads.sql'), 'utf8');
  const worker = fs.readFileSync(path.join(root, 'worker/index.js'), 'utf8');
  assert.match(html, /id="early-access"/);
  assert.match(html, /href="#early-access" data-interest="Paid pilot"/);
  assert.match(html, /id="lead-challenge"[\s\S]*?minlength="20" maxlength="1000"/);
  assert.match(html, /id="lead-consent"[\s\S]*?required/);
  assert.match(script, /URLSearchParams\(window\.location\.search\)/);
  assert.match(script, /paidPilot\.checked = true/);
  assert.match(script, /submitting \|\| !validateForm\(\)/);
  assert.match(worker, /from '\.\/internal\/leads\.js'/);
  assert.match(worker, /env\.ASSETS\.fetch\(request\)/);
  assert.match(migration, /create table leads/);
  assert.match(migration, /create table lead_submission_limits/);
  assert.match(migration, /consent_given/);
  assert.match(migration, /lead_submission_limits_lookup_idx/);
});

test('internal helpers honor the D1 env contract', async () => {
  const database = createLeadDatabase();
  const config = runConfiguration(baseEnvironment(database));
  assert.equal(config.rateLimitSalt, 'test-rate-limit-salt-at-least-16');
  assert.equal(runConfiguration({ LEADS_RATE_LIMIT_SALT: 'test-rate-limit-salt-at-least-16' }), null);
  assert.equal(runConfiguration({ DB: database, LEADS_RATE_LIMIT_SALT: '' }), null);

  const payload = validPayload();
  const validation = validatePayload(payload);
  assert.equal(validation.data.email, 'ada@example.com');
  assert.equal(Object.keys(validation.fieldErrors).length, 0);

  const fingerprint = await createFingerprint(webRequest(payload), 'test-rate-limit-salt-at-least-16');
  assert.match(fingerprint, /^[0-9a-f]{64}$/);

  const stored = await persistLead(baseEnvironment(database), validation.data, fingerprint);
  assert.equal(stored.ok, true);
  assert.equal(stored.created, true);
  assert.equal(allLeads(database).length, 1);
});