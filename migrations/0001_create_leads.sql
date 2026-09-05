-- Graphentra early-access leads for Cloudflare D1 (SQLite).

create table leads (
  id text primary key default (lower(hex(randomblob(16)))),
  submission_id text not null unique,
  name text not null,
  email text not null,
  company text not null,
  role text not null check (role in (
    'QA Engineer',
    'QA Lead or Manager',
    'Engineering Manager',
    'Developer or Tech Lead',
    'Head or VP of Engineering',
    'Founder or CTO',
    'Product or Release Manager',
    'Other'
  )),
  challenge text not null,
  interest_type text not null check (interest_type in (
    'Product updates',
    'Early access',
    'Design partnership',
    'Paid pilot'
  )),
  source text not null default 'website',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  referrer text,
  status text not null default 'new',
  consent_given integer not null default 0 check (consent_given = 1),
  consented_at text not null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_contacted_at text
);

create index leads_submission_id_idx on leads (submission_id);
create index leads_email_created_at_idx on leads (email, created_at desc);
create index leads_status_created_at_idx on leads (status, created_at desc);

create table lead_submission_limits (
  fingerprint text not null check (length(fingerprint) = 64),
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index lead_submission_limits_lookup_idx on lead_submission_limits (fingerprint, created_at desc);