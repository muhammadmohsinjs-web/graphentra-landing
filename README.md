# Graphentra landing page

This repository contains the portable Graphentra homepage and its early-access lead endpoint. The visual site remains plain HTML, CSS, and JavaScript. Production lead submissions go through a Cloudflare Worker at `/api/leads` and are stored in Cloudflare D1.

## Local development

Install-free static preview:

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173`. A basic static server cannot execute `/api/leads`, so a form submission in that preview correctly shows the retryable error state rather than a false success.

To run the full Workers stack locally with a local D1 database:

```sh
npm install
cp .env.example .dev.vars
npm run dev
```

`wrangler dev` serves the static site, applies the local D1 migration, and runs the `/api/leads` Worker together. Put a real value in `LEADS_RATE_LIMIT_SALT` inside `.dev.vars` (it is gitignored) instead of editing `.env` if you want to test a real submission.

To verify the source:

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

The build command validates the deployment contract and writes static assets to `dist/`. It deliberately does not copy the Worker source into the public build directory.

## Database setup

The schema lives in `migrations/0001_create_leads.sql` and is applied to the `graphentra-leads` D1 database declared in `wrangler.jsonc`. Apply remote migrations after the Worker is configured:

```sh
npx wrangler d1 migrations apply graphentra-leads --remote
```

The migration creates:

- `leads`, including every requested lead field plus `submission_id`, `consent_given`, and `consented_at` for idempotency and consent evidence. `consent_given` is constrained to `1`, and `role`/`interest_type` are constrained to the expected values.
- `lead_submission_limits`, which stores only HMAC fingerprints for short-lived abuse controls—not raw IP addresses.

The Worker coordinates the atomicity instead of a stored procedure, matching the previous Postgres RPC behavior:

- Email is normalized to lowercase before insert.
- A submission that repeats `submission_id` returns success without inserting a duplicate row.
- At most three attempts per fingerprint are allowed in ten minutes (a fourth returns `429`).
- A second lead for the same email in two minutes is suppressed without inserting a second row.
- `lead_submission_limits` rows older than 24 hours are cleaned out opportunistically.

After applying the migration, submit a test lead and confirm the row exists in `leads`.

## Environment variables

Required in the Workers deployment environment:

- `LEADS_RATE_LIMIT_SALT` — a random server-only value of at least 16 characters. Use a long cryptographically random value in production.

Optional:

- `WEBSITE_LEAD_SOURCE` — defaults to `website`.
- `LEADS_NOTIFICATION_EMAIL` — the recipient address to use when an email provider is connected.

The D1 binding (`DB`) and the static assets binding (`ASSETS`) come from `wrangler.jsonc`, not from environment variables. Copy `LEADS_RATE_LIMIT_SALT` and `WEBSITE_LEAD_SOURCE` into the Workers environment-variable UI; for local `wrangler dev`, copy `.env.example` into `.dev.vars`.

## Deployment

The included `wrangler.jsonc` declares the `graphentra-leads` D1 binding, deploys `dist/` as static assets, and routes `POST /api/leads` through `worker/index.js`, serving everything else through the static assets binding.

1. Apply the migration to the remote database:
   ```sh
   npx wrangler d1 migrations apply graphentra-leads --remote
   ```
2. Set the secret on the Workers project (stored encrypted, never committed):
   ```sh
   npx wrangler login
   npx wrangler secret put LEADS_RATE_LIMIT_SALT
   ```
3. Build and deploy:
   ```sh
   npm run deploy
   ```
   `npm run deploy` runs the build and uploads the Worker plus static assets. Deploying through a CI build environment (e.g. the Workers "Builds" tab) works with either `npm run deploy` or a plain `npx wrangler deploy`, because the project's `prepare` script builds `dist/` automatically during `npm ci`/`npm install`.
4. Submit a test lead, confirm the row in the D1 `leads` table, and verify that a second rapid click does not create a second row.

If you created the D1 database through a different name or in a different account, update `database_name`/`database_id` under `d1_databases` in `wrangler.jsonc`.

## External integrations still needed

No email provider or analytics platform was present in the original project, so neither a second analytics service nor a new email dependency was added.

- Email: database persistence is complete and independent of notifications. To enable team email, connect the team’s selected provider on the server after the D1 write succeeds, use `LEADS_NOTIFICATION_EMAIL` as the recipient, and include the lead fields and submission date listed in the product requirements. Provider API credentials must remain server-only. Notification failure should be logged without discarding an already-saved lead.
- Analytics: `app.js` emits the five requested event names through an existing `gtag`, Plausible, or `dataLayer` when one is present. It also dispatches a `graphentra:analytics` browser event for a future first-party adapter. No personal form fields are included.
- LinkedIn and privacy: the original source contained neither a Graphentra LinkedIn Page URL nor a privacy-policy URL, so the success-state LinkedIn action and privacy link are intentionally omitted rather than invented.