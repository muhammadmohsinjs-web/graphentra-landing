/**
 * Site-wide configuration and shared copy. Anything reused on more than one page lives here,
 * so the pages cannot drift apart. British English throughout.
 */

export const site = {
  name: 'Graphentra',
  url: 'https://www.graphentra.com',
  locale: 'en-GB',
  ogLocale: 'en_GB',
  tagline: 'Change impact intelligence for the AI coding era',
  status: 'In development · Early access open',
  ogImage: { path: '/og.png', width: 1200, height: 630, alt: 'Graphentra. Small diff. Long reach.' },
  logoPath: '/favicon.svg',
  /* TODO(founder): add the Graphentra LinkedIn Page and any other social URLs here once they
     exist. They feed Organization.sameAs and the footer. Nothing is invented in the meantime. */
  social: [] as string[]
} as const;

export type PageId = 'home' | 'product' | 'use-cases' | 'trust' | 'compare' | 'roadmap' | 'pricing' | 'about' | 'not-found';

export interface PageMeta {
  path: string;
  title: string;
  description: string;
  /** Label in the header navigation, when the page is in it. */
  nav?: string;
  /** Excluded from the sitemap and marked noindex. */
  hidden?: boolean;
}

/** Titles are 60 characters or fewer and descriptions 155 or fewer (enforced by verify-build). */
export const pages: Record<PageId, PageMeta> = {
  home: {
    path: '/',
    title: 'Graphentra: change impact analysis for the AI coding era',
    description:
      'The deterministic change impact engine for pull requests: the screens, APIs and flows a change can reach, each with a proof path. Early access is open.'
  },
  product: {
    path: '/product/',
    nav: 'Product',
    title: 'How Graphentra works: from a diff to what to test',
    description:
      'Read the diff, trace the blast radius, attach a proof path to every surface and get a ranked QA checklist. See the PR check, evidence file and MCP tools.'
  },
  'use-cases': {
    path: '/use-cases/',
    nav: 'Use cases',
    title: 'Use cases: QA teams, engineering leaders and AI agents',
    description:
      'How QA teams, engineering leaders and developers using AI coding agents can use change impact analysis to decide what to verify before merge.'
  },
  trust: {
    path: '/trust/',
    nav: 'Trust',
    title: 'Trust: same diff, same answer, and honest unknowns',
    description:
      'How Graphentra stays honest: deterministic evidence, a proof path for every reported surface, unknowns listed as unknown, and an LLM that only narrates.'
  },
  compare: {
    path: '/compare/',
    title: 'Why deterministic: Graphentra compared by category',
    description:
      'How deterministic change impact analysis differs from AI code reviewers, test-impact tools, build-graph tools and AI QA tools. By category, no vendors.'
  },
  roadmap: {
    path: '/roadmap/',
    nav: 'Roadmap',
    title: 'Roadmap: built, in development and planned',
    description:
      'What exists in the Graphentra prototype, what is in development for the MVP, and what is planned after it. No dates, just Now, Next and Later.'
  },
  pricing: {
    path: '/pricing/',
    nav: 'Pricing',
    title: 'Early access and pilots: how we work with early teams',
    description:
      'Graphentra is pre-launch. See how design-partner pilots work, what each planned tier is for, and how to discuss a paid pilot. Paid plans come at launch.'
  },
  about: {
    path: '/about/',
    title: 'About Graphentra: make the consequences of a change visible',
    description:
      'Our mission: make the consequences of a change visible before it ships. Our principles: inspectable connections, your team in control, honest unknowns.'
  },
  'not-found': {
    path: '/404.html',
    title: 'Page not found | Graphentra',
    description: 'That page does not exist. Try the product overview or request early access.',
    hidden: true
  }
};

export const nav: { id: PageId; label: string; href: string }[] = (Object.keys(pages) as PageId[])
  .filter(id => pages[id].nav)
  .map(id => ({ id, label: pages[id].nav as string, href: pages[id].path }));

export const footerLinks: { id: PageId; label: string; href: string }[] = [
  { id: 'product', label: 'Product', href: pages.product.path },
  { id: 'use-cases', label: 'Use cases', href: pages['use-cases'].path },
  { id: 'trust', label: 'Trust', href: pages.trust.path },
  { id: 'compare', label: 'Why deterministic', href: pages.compare.path },
  { id: 'roadmap', label: 'Roadmap', href: pages.roadmap.path },
  { id: 'pricing', label: 'Pricing', href: pages.pricing.path },
  { id: 'about', label: 'About', href: pages.about.path }
];

/** Every early-access call to action points at the form on the home page. */
export const earlyAccessHref = '/#early-access';

/** The limit of "prove". Any page that uses the word must state it (enforced by verify-build). */
export const proofLimit = 'No path found is not proof of safety.';

/* ---------- Home hero (config-driven) ---------- */

export const hero = {
  eyebrow: 'Change impact intelligence for the AI coding era',
  title: ['Small diff.', 'Long reach.'] as const,
  sub: 'Your AI writes the PR. Graphentra proves which screens, APIs and flows it can reach, with a traceable path for every one, so your team tests what matters and ships on evidence.',
  primaryCta: 'Request early access',
  secondaryCta: 'Discuss a pilot',
  chip: site.status
} as const;

/** Kept for testing. Not rendered. */
export const heroAlternates = ['Know what your PR touches. With receipts.', 'Proof of impact for every change.', 'Stop regression-testing everything.'] as const;

export const marqueeQuestions = ['What changed?', 'What could it reach?', 'What should we verify?', 'What could we not trace?'] as const;

/* ---------- Why now: four third-party figures, quoted from their primary sources ---------- */

export interface MarketStat {
  id: string;
  figure: string;
  text: string;
  source: string;
  year: number;
  href: string;
  basis: string;
}

/** Each figure was checked against its primary source on 30 September 2026. */
export const marketStats: MarketStat[] = [
  {
    id: 'stackoverflow',
    figure: '66%',
    text: 'of developers cite “AI solutions that are almost right, but not quite” as a frustration. It is the biggest single one.',
    source: 'Stack Overflow Developer Survey',
    year: 2025,
    href: 'https://survey.stackoverflow.co/2025/ai',
    basis: '31,476 responses to this question'
  },
  {
    id: 'qodo',
    figure: '89%',
    text: 'of organisations had experienced an AI-related production incident. Reviewing and validating AI-generated code was the top delivery bottleneck for developers and engineering leaders alike.',
    source: 'Qodo, State of AI Code Quality',
    year: 2026,
    href: 'https://www.qodo.ai/state-of-ai-code-quality-report/',
    basis: '500 US developers and 300 engineering leaders'
  },
  {
    id: 'dora',
    figure: 'Faster, less stable',
    text: 'Higher AI adoption correlates with higher throughput and higher delivery instability.',
    source: 'DORA, State of AI-assisted Software Development',
    year: 2025,
    href: 'https://cloud.google.com/blog/products/ai-machine-learning/announcing-the-2025-dora-report',
    basis: 'Nearly 5,000 technology professionals'
  },
  {
    id: 'gitclear',
    figure: '3.1% → 5.7%',
    text: 'Code reverted or substantially revised within two weeks of being written rose from 3.1% of changed lines in 2020 to 5.7% in 2024.',
    source: 'GitClear, AI Copilot Code Quality',
    year: 2025,
    href: 'https://www.gitclear.com/ai_assistant_code_quality_2025_research',
    basis: '211 million changed lines'
  }
];

/* ---------- The four steps (Home and Product) ---------- */

export interface Step {
  id: 'read' | 'trace' | 'prove' | 'say';
  title: string;
  body: string;
  points: string[];
  /** Capabilities the step depends on. Each is rendered with its status chip. */
  capabilities: string[];
}

export const howItWorks: Step[] = [
  {
    id: 'read',
    title: 'Read the change',
    body: 'The Git diff is mapped to the exact symbols that changed, using the TypeScript compiler and type checker. Not regex, not embeddings.',
    points: ['Symbol-level, not file-level', 'Compiler-grade parsing'],
    capabilities: ['ts-diff-analysis']
  },
  {
    id: 'trace',
    title: 'Trace the reach',
    body: 'The dependency graph is walked backwards from each changed symbol to its callers, components, routes and API endpoints.',
    points: ['Callers to routes and endpoints', 'Every hop recorded'],
    capabilities: ['ts-diff-analysis', 'surfaces-in-evidence']
  },
  {
    id: 'prove',
    title: 'Prove it',
    body: 'Every affected surface carries its path, a confidence tier (proven, likely or unknown) and whether an existing test reaches it. What cannot be traced is listed as unknown, never silently dropped.',
    points: ['A path for every claim', 'Unknown stays visible'],
    capabilities: ['proof-paths', 'confidence-tiers', 'test-mapping']
  },
  {
    id: 'say',
    title: 'Say what to test',
    body: 'A ranked, plain-English QA checklist. An LLM may narrate it. It never changes the evidence.',
    points: ['Ranked for QA', 'Narration is optional'],
    capabilities: ['llm-qa-checklist', 'deterministic-report']
  }
];

/* ---------- What makes it different, in priority order ---------- */

export interface Differentiator {
  id: string;
  title: string;
  body: string;
  capabilities: string[];
}

export const differentiators: Differentiator[] = [
  {
    id: 'proof',
    title: 'Proof, not guesses',
    body: 'Every reported surface comes with the chain of calls that reaches it. Open the path and check it yourself.',
    capabilities: ['proof-paths']
  },
  {
    id: 'surfaces',
    title: 'Speaks in surfaces',
    body: 'Screens, endpoints and flows: the language of the people who test. Not only file names.',
    capabilities: ['surfaces-in-evidence']
  },
  {
    id: 'unknown',
    title: 'Honest about the unknown',
    body: 'Dynamic dispatch, reflection and runtime-only wiring are reported as unknown. They are never silently dropped.',
    capabilities: ['confidence-tiers']
  },
  {
    id: 'day-one',
    title: 'Works on day one',
    body: 'No test history, instrumentation or recorded sessions. It starts from the repository and the diff.',
    capabilities: ['works-on-day-one']
  },
  {
    id: 'your-ci',
    title: 'Runs in your own CI',
    body: 'The analysis runs in your own CI. LLM narration is optional.',
    capabilities: ['github-action', 'deterministic-report']
  },
  {
    id: 'people-and-agents',
    title: 'Built for people and agents',
    body: 'A comment on the pull request for people. MCP tools for coding agents.',
    capabilities: ['github-action', 'mcp-server']
  }
];

/* ---------- Principles (Home trust teaser and About) ---------- */

export const principles = [
  {
    icon: 'graph',
    title: 'Connections you can inspect',
    body: 'Every claim follows a traceable path through your code. An LLM may narrate the evidence in the language of your application. It never replaces the path itself.'
  },
  {
    icon: 'hand',
    title: 'Control stays with your team',
    body: 'The analysis runs in your own CI, and your team decides what to test. LLM narration is optional, and it never changes the evidence.'
  },
  {
    icon: 'unknown',
    title: 'Unknown means unknown',
    body: 'Anything Graphentra cannot trace is listed as unknown and stays on the report. It is never quietly counted as safe.'
  }
] as const;
