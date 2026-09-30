# Graphentra marketing site: plan

Written before the build. It audits the single-page landing site against the brief and records the assumptions made.

## Where the work lives

The working copy is `~/Desktop/websites/graphentra-website`, on branch `marketing-site-v2`, uncommitted. The first design (light, editorial) is preserved on branch `marketing-site` and in `~/Desktop/websites/graphentra-v1-snapshot`. It was found already holding an earlier partial attempt: the data modules (`capabilities`, `site`, `faq`, `personas`, `compare`, an extended `example`) and 13 new components. The original at `~/Desktop/mvps/graphentra-landing` is untouched. That attempt is reused where it matches the brief and corrected where it does not (see Risks).

## Audit: what the current site does

Single page, anchor-only navigation. It reads well and its design system is solid, but it predates ADR-0003 and ADR-0004:

- It never mentions determinism, pull requests, GitHub, CI, AI agents, MCP or confidence tiers.
- It sells "verification" (browser and API checks in disposable environments, pass/fail results, an "At risk" verdict). ADR-0004 defers all test execution until after the MVP, so those claims are not true today.
- Its meta description, footer tagline, Platform card, Principles item 2, FAQ items 2, 4 and 5, the Roadmap "Alongside" stage, HowItWorks steps 3 and 4 and the fourth marquee question all describe that deferred product.
- Spelling mixes variants. One example figure ("PR #482") is not labelled as illustrative in the hero.
- `main.ts` loads GSAP for every visitor and assumes home-only elements exist.

## Sitemap

`/`, `/product/`, `/use-cases/`, `/trust/`, `/compare/`, `/roadmap/`, `/pricing/`, `/about/`, `/404.html`. There is no `/privacy` and no `/terms`: no legal text was supplied, so they are not written and not linked. They are launch blockers, because the form collects personal data.

## Components

| Action | Items |
|---|---|
| Keep unchanged | `EarlyAccess`, `Icon`, `Logo`, `Kicker`, the form contract (`worker/`, `migrations/`, `tests/leads.test.js`), `hero-graph.ts`, `lead-form.ts` behaviour |
| Change | `Base` (SEO, JSON-LD, canonical), `Header` (real routes, `aria-current`), `Footer` (sitemap, status, page-aware CTA), `Hero` (new copy, keeps the pilot link), `HeroFigure` (new data shape), `Problem`, `HowItWorks` (four steps), `Marquee`, `Faq`, `Roadmap` (teaser), `main.ts` (split), `header.ts`, `analytics.ts` (`cta_clicked`) |
| Already added by the earlier attempt | `StatusChip`, `PrCheck`, `RunItTwice`, `AgentTerminal`, `EvidenceExcerpt`, `ComparisonTable`, `StatCard`, `PageHeader`, `CtaBand`, `ExampleLabel`, `ProofNote`, `CapabilityItem` |
| Add | `PageLayout`, `StepPanel`, `WhyNow`, `Differentiators`, `Audiences`, `TrustTeaser`, `SupportedStack`, `RoadmapBoard`, `TierCard`, nine pages, `sitemap.xml` and `robots.txt` endpoints, `og.png` |
| Remove | `Platform`, `Principles`, `Teams` (replaced) |

## Guards

- `verify-build.mjs` is extended, never weakened: every sitemap URL is emitted, internal links and anchors resolve, titles, descriptions and canonicals are unique, one `h1` per page, every example element carries the "Illustrative example" label, and every status chip matches `capabilities.ts`.
- A claims lint (`scripts/claims-lint.mjs`) runs over the visible text of every built page. It fails on fabricated-proof and over-claim patterns and warns on hype words and American spellings.
- New tests cover the data invariants and the lint.

## Decisions taken (assumptions)

1. The site-wide status stays "In development · Early access open". Even `built` means prototype grade.
2. Browser and API verification is shown as planned (ADR-0004 is Proposed, not Accepted).
3. Market statistics are re-verified on 30 September 2026. The Qodo, Stack Overflow and DORA figures match their sources. GitClear's own figures are 3.05% and 5.67%, shown rounded to 3.1% and 5.7%, and the definition is "reverted or substantially revised within two weeks", which is corrected in the copy.
4. Subpages use no GSAP. Only the home page animates with it, and it is dynamically imported there.
5. No new dependencies. The sitemap and `robots.txt` are static endpoints, and the OG image is rendered once with Chromium and committed.
6. `?interest=` on `/` preselects the form interest. That is a small addition to `lead-form.ts`. The field names, ids, limits, honeypot, consent and UTM capture are untouched.

## Risks

- The earlier attempt changed the shape of `example.ts`, so the old home components crash until they are ported. The port comes first.
- Lighthouse LCP: the hero fades in from JavaScript today. It is measured and tuned, and misses are reported.
- Vault versus brief conflicts are listed in the final report (privacy wording, open-source timing, ADR status).

## Design v2 ("Graphite")

The visual system, layout and motion were replaced after the first build. Content, claims, data modules, guards and the form contract did not change.

- **Theme.** Dark and technical. Tokens live in `src/styles/global.css`: near-black `--bg`, layered `--surface*`, `--line*`, and three signal colours with fixed meanings: volt `--volt` for proven, amber `--amber` for unknown or caution, ice `--ice` for in development. Confidence is always shown by a text label and a line style (solid or dashed) as well as colour.
- **Type.** Bricolage Grotesque for display, Instrument Sans for text, JetBrains Mono for labels, code and paths. All three are self-hosted through `astro:assets` fonts. The two above the fold are preloaded.
- **Layout.** Floating pill header, blueprint grid background, a marginal rail for section heads at 960px and up, bento grids, panel surfaces.
- **Motion.** The hero headline, caret and trace are CSS only, so the first paint never waits for a script. `data-reveal` uses one IntersectionObserver, and content is hidden only after the script has marked what is already visible. The how-it-works tabs autoplay and stop on interaction. GSAP is loaded on the home page only and drives one scrubbed figure. Everything respects `prefers-reduced-motion` and works without JavaScript.
- **Not changed.** The `data-*` hooks that guards and tests read (`data-example`, `data-status`, `data-capability`, `data-proof-limit`, `data-cta-location`), the hero "Discuss a pilot" link, and every form field.
