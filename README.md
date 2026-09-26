# Graphentra landing page

Graphentra’s public landing page is built with Astro and TypeScript, with GSAP-powered motion. The early-access form submits to a Cloudflare Worker at `/api/leads`; leads are stored in Cloudflare D1. The worker, migrations, and allowed-value contract remain separate from the static site output.

## Requirements

- Node.js 22.12 or later
- npm
- Wrangler authentication for remote database operations and deployment

## Local development

Install dependencies and start the Astro dev server:

```sh
npm install
npm run dev
```

Open `http://localhost:4321`. Astro proxies `/api` to `http://127.0.0.1:8787`; run the Worker in a second terminal to exercise the form:

```sh
npx wrangler d1 migrations apply DB --local
npx wrangler dev
```

Set a local `LEADS_RATE_LIMIT_SALT` in `.dev.vars` (gitignored) before testing submissions. Use a random value at least 16 characters long. The local D1 database uses Wrangler’s local persistence.

For a static preview of the generated page, run:

```sh
npm run build
python3 -m http.server 4173 --directory dist
```

A plain static server does not execute the Worker endpoint, so form submission requires `wrangler dev`.

## Checks

```sh
npm run build      # Astro build plus deployment-contract verification
npm run typecheck  # Astro diagnostics and Worker syntax checks
npm run lint       # Node syntax checks
npm test           # Worker and form-contract tests
```

The build guard verifies the compiled form contract, confirms role and interest choices are accepted by both the Worker and D1 migration, checks local asset references, and rejects backend source files in `dist/`.

## D1 and configuration

`wrangler.jsonc` declares the D1 binding as `DB`, backed by the `graphentra` database, and serves static assets from `dist/`. Apply migrations using the binding name (`DB`), rather than the database’s display name:

```sh
npx wrangler d1 migrations apply DB --local
npx wrangler d1 migrations apply DB --remote
```

The migration in `migrations/0001_create_leads.sql` creates:

- `leads`, including submission idempotency and consent evidence; role and interest values are constrained to the choices offered by the form.
- `lead_submission_limits`, storing HMAC fingerprints for short-lived abuse controls rather than raw IP addresses.

The Worker normalizes email addresses, treats repeat submission IDs idempotently, rate-limits attempts, suppresses rapid duplicate leads for the same email, and opportunistically removes old rate-limit records.

Required server-side secret:

- `LEADS_RATE_LIMIT_SALT`: random server-only value of at least 16 characters. Set it with `npx wrangler secret put LEADS_RATE_LIMIT_SALT` for deployment, or in `.dev.vars` locally.

Optional variable:

- `WEBSITE_LEAD_SOURCE`: source label; defaults to `website`.

`DB` and `ASSETS` are Wrangler bindings, not environment variables. The migration directory is `migrations/` as configured in `wrangler.jsonc`.

## Deploy

1. Authenticate and apply the remote migration:

   ```sh
   npx wrangler login
   npx wrangler d1 migrations apply DB --remote
   ```

2. Set the rate-limit secret and deploy:

   ```sh
   npx wrangler secret put LEADS_RATE_LIMIT_SALT
   npm run deploy
   ```

`npm run deploy` builds and verifies the site, then deploys the Worker and static assets. Confirm a test lead is stored in D1 after deployment.

## Integrations

- **Email:** lead persistence is independent of notifications. No provider is configured; connect one server-side if notifications are needed.
- **Analytics:** the client emits `early_access_section_viewed`, `early_access_form_started`, `early_access_form_submitted`, `early_access_form_failed`, and `discuss_pilot_clicked` through an existing `gtag`, Plausible, or `dataLayer` integration. It also dispatches `graphentra:analytics`. Form data is not included in analytics events.
- **Privacy and social links:** no policy URL or Graphentra LinkedIn Page URL was provided, so none is invented in the page.
