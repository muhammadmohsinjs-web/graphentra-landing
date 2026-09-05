'use strict';

const ALLOWED_ROLES = new Set([
  'QA Engineer',
  'QA Lead or Manager',
  'Engineering Manager',
  'Developer or Tech Lead',
  'Head or VP of Engineering',
  'Founder or CTO',
  'Product or Release Manager',
  'Other'
]);
const ALLOWED_INTERESTS = new Set([
  'Product updates',
  'Early access',
  'Design partnership',
  'Paid pilot'
]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SUBMISSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_REQUEST_BYTES = 20_000;
const textEncoder = new TextEncoder();

function cleanText(value, maximum, multiline = false) {
  if (typeof value !== 'string') return '';
  let cleaned = value.normalize('NFKC');
  cleaned = multiline
    ? cleaned.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\r\n?/g, '\n')
    : cleaned.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ');
  return cleaned.trim().slice(0, maximum + 1);
}

function safeReferrer(value) {
  const referrer = cleanText(value, 2048);
  if (!referrer) return null;
  try {
    const parsed = new URL(referrer);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? referrer : null;
  } catch {
    return null;
  }
}

function validatePayload(body) {
  const data = {
    submissionId: cleanText(body.submission_id, 36),
    name: cleanText(body.name, 120),
    email: cleanText(body.email, 254).toLowerCase(),
    company: cleanText(body.company, 160),
    role: cleanText(body.role, 80),
    challenge: cleanText(body.challenge, 1000, true),
    interest: cleanText(body.interest, 40),
    consent: body.consent === true,
    website: cleanText(body.website, 200),
    utmSource: cleanText(body.utm_source, 200).slice(0, 200) || null,
    utmMedium: cleanText(body.utm_medium, 200).slice(0, 200) || null,
    utmCampaign: cleanText(body.utm_campaign, 200).slice(0, 200) || null,
    utmContent: cleanText(body.utm_content, 200).slice(0, 200) || null,
    referrer: safeReferrer(body.referrer)
  };
  const fieldErrors = {};
  if (!SUBMISSION_ID_PATTERN.test(data.submissionId)) fieldErrors.submission_id = 'Invalid submission identifier.';
  if (!data.name || data.name.length > 120) fieldErrors.name = 'Enter your full name.';
  if (!data.email || data.email.length > 254 || !EMAIL_PATTERN.test(data.email)) fieldErrors.email = 'Enter a valid email address.';
  if (!data.company || data.company.length > 160) fieldErrors.company = 'Enter your company name.';
  if (!ALLOWED_ROLES.has(data.role)) fieldErrors.role = 'Select your role.';
  if (data.challenge.length < 20) fieldErrors.challenge = 'Use at least 20 characters.';
  else if (data.challenge.length > 1000) fieldErrors.challenge = 'Use no more than 1,000 characters.';
  if (!ALLOWED_INTERESTS.has(data.interest)) fieldErrors.interest = 'Select what you are interested in.';
  if (!data.consent) fieldErrors.consent = 'Consent is required before we can contact you.';
  return { data, fieldErrors };
}

function getClientAddress(request) {
  const forwarded = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  return (
    request.headers.get('cf-connecting-ip')
    || forwarded
    || request.headers.get('x-real-ip')
    || 'unknown'
  ).slice(0, 128);
}

async function createFingerprint(request, salt) {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(salt),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(getClientAddress(request)));
  return Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, '0')).join('');
}

function runConfiguration(env) {
  const rateLimitSalt = env.LEADS_RATE_LIMIT_SALT || '';
  if (!env.DB) return null;
  return { rateLimitSalt };
}

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 3;
const DUPLICATE_EMAIL_WINDOW_MS = 2 * 60 * 1000;
const RATE_LIMIT_RETENTION_MS = 24 * 60 * 60 * 1000;

async function persistLead(env, data, fingerprint) {
  const now = new Date().toISOString();

  const existingSubmission = await env.DB
    .prepare('select created_at from leads where submission_id = ?1 limit 1')
    .bind(data.submissionId)
    .first();
  if (existingSubmission) return { ok: true, created: false, created_at: existingSubmission.created_at };

  const rateWindowCutoff = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const attempt = await env.DB
    .prepare(
      `insert into lead_submission_limits (fingerprint, created_at)
       select ?1, ?2
       where (
         select count(*) from lead_submission_limits
         where fingerprint = ?1 and created_at > ?3
       ) < ?4`
    )
    .bind(fingerprint, now, rateWindowCutoff, RATE_LIMIT_MAX_ATTEMPTS)
    .run();
  if (attempt.meta.changes === 0) return { ok: true, rateLimited: true };

  const duplicateWindowCutoff = new Date(Date.now() - DUPLICATE_EMAIL_WINDOW_MS).toISOString();
  const existingEmail = await env.DB
    .prepare('select created_at from leads where email = ?1 and created_at > ?2 order by created_at desc limit 1')
    .bind(data.email, duplicateWindowCutoff)
    .first();
  if (existingEmail) return { ok: true, created: false, created_at: existingEmail.created_at };

  await env.DB
    .prepare(
      `insert into leads (
         submission_id, name, email, company, role, challenge, interest_type, source,
         utm_source, utm_medium, utm_campaign, utm_content, referrer,
         consent_given, consented_at, created_at
       ) values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, 1, ?14, ?14)`
    )
    .bind(
      data.submissionId,
      data.name,
      data.email,
      data.company,
      data.role,
      data.challenge,
      data.interest,
      env.WEBSITE_LEAD_SOURCE || 'website',
      data.utmSource,
      data.utmMedium,
      data.utmCampaign,
      data.utmContent,
      data.referrer,
      now
    )
    .run();

  if (Math.random() < 0.01) {
    const staleCutoff = new Date(Date.now() - RATE_LIMIT_RETENTION_MS).toISOString();
    await env.DB.prepare('delete from lead_submission_limits where created_at < ?1').bind(staleCutoff).run();
  }

  return { ok: true, created: true, created_at: now };
}

function sendError(status, requestId) {
  return Response.json({ ok: false, requestId }, { status });
}

async function handler(request, env) {
  const requestId = crypto.randomUUID();
  if (request.method !== 'POST') {
    return Response.json({ ok: false, requestId }, { status: 405, headers: { Allow: 'POST' } });
  }
  const contentType = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/json') return sendError(415, requestId);

  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > MAX_REQUEST_BYTES) return sendError(413, requestId);

  let body;
  try {
    let raw = await request.text();
    if (textEncoder.encode(raw).length > MAX_REQUEST_BYTES) return sendError(413, requestId);
    if (!raw) throw new Error('empty_request_body');
    body = JSON.parse(raw);
  } catch {
    return sendError(400, requestId);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return sendError(400, requestId);

  const { data, fieldErrors } = validatePayload(body);
  if (data.website) return sendError(400, requestId);
  if (Object.keys(fieldErrors).length) return Response.json({ ok: false, fieldErrors, requestId }, { status: 422 });

  const config = runConfiguration(env);
  if (!config) {
    console.error('Lead endpoint is not configured.', { requestId });
    return sendError(503, requestId);
  }

  try {
    const fingerprint = await createFingerprint(request, config.rateLimitSalt);
    const result = await persistLead(env, data, fingerprint);
    if (result.rateLimited) {
      console.error('Lead persistence rejected by rate limit.', { requestId });
      return sendError(429, requestId);
    }
    if (!result.ok) {
      console.error('Lead persistence failed.', { requestId });
      return sendError(503, requestId);
    }
    return Response.json({ ok: true, requestId }, { status: 201 });
  } catch (error) {
    console.error('Lead persistence request failed.', { requestId, reason: error && error.name });
    return sendError(503, requestId);
  }
}

module.exports = { handler, cleanText, safeReferrer, validatePayload, createFingerprint, runConfiguration, persistLead };