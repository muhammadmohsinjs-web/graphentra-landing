/**
 * Every product claim on the site is one entry here, with a status. The Product, Trust,
 * Compare, Roadmap and Pricing pages and the home teasers are all driven from this file,
 * and every capability is rendered with a StatusChip beside it.
 *
 * Status is honest and coarse:
 *   built           exists in the prototype. Prototype-grade: never implies general availability.
 *   in-development  being built for the MVP.
 *   planned         after the MVP.
 *
 * Format note: scripts/verify-build.mjs reads this file as text to cross-check the chips in the
 * built HTML, so keep one object per entry with `id` before `status` and single-quoted values.
 */

export type CapabilityStatus = 'built' | 'in-development' | 'planned';
export type CapabilityGroup = 'engine' | 'proof' | 'surfaces' | 'delivery' | 'agents' | 'stack' | 'release' | 'platform';
export type Horizon = 'now' | 'next' | 'later';

export interface Capability {
  id: string;
  title: string;
  summary: string;
  status: CapabilityStatus;
  group: CapabilityGroup;
  /** An honest qualifier shown beside the claim, e.g. what is not yet true. */
  note?: string;
}

export const statusLabels: Record<CapabilityStatus | 'not-yet', string> = {
  built: 'Built · prototype',
  'in-development': 'In development',
  planned: 'Planned',
  'not-yet': 'Not yet'
};

/** Roadmap horizon is derived from status, so the roadmap can never drift from the claims. */
export const horizonOf = (status: CapabilityStatus): Horizon => (status === 'built' ? 'now' : status === 'in-development' ? 'next' : 'later');

export const horizons: { id: Horizon; label: string; status: CapabilityStatus; caption: string }[] = [
  { id: 'now', label: 'Now', status: 'built', caption: 'Built in the prototype' },
  { id: 'next', label: 'Next', status: 'in-development', caption: 'In development for the MVP' },
  { id: 'later', label: 'Later', status: 'planned', caption: 'Planned after the MVP' }
];

export const capabilities: Capability[] = [
  /* ---------- Built (prototype) ---------- */
  {
    id: 'ts-diff-analysis',
    title: 'From changed functions to their callers',
    summary: 'Deterministic TypeScript analysis of a Git diff, from changed functions to their callers, using the TypeScript compiler and type checker.',
    status: 'built',
    group: 'engine',
    note: 'Named functions today. Wider coverage is in development.'
  },
  {
    id: 'evidence-file',
    title: 'Content-hashed evidence file',
    summary: 'A schema-validated evidence file identified by a content fingerprint. Same repository content, same diff and same engine version give byte-identical evidence.',
    status: 'built',
    group: 'proof'
  },
  {
    id: 'works-on-day-one',
    title: 'Works on day one',
    summary: 'Starts from the repository and the diff. No test history, instrumentation or recorded sessions are needed.',
    status: 'built',
    group: 'engine'
  },
  {
    id: 'application-map',
    title: 'Application map',
    summary: 'A heuristic map of routes, pages, APIs and end-to-end flows for Next.js, React Router, Express and NestJS.',
    status: 'built',
    group: 'surfaces',
    note: 'Heuristic and best effort. Not yet part of the hashed evidence.'
  },
  {
    id: 'llm-qa-checklist',
    title: 'QA checklist written from the evidence',
    summary: 'An LLM writes a plain-English QA checklist from the evidence. It narrates the evidence and never changes it.',
    status: 'built',
    group: 'engine',
    note: 'Needs an LLM today. A report that needs none is in development.'
  },
  {
    id: 'graph-explorer',
    title: 'Local graph explorer',
    summary: 'A local, read-only explorer for the dependency graph behind an analysis.',
    status: 'built',
    group: 'engine'
  },

  /* ---------- In development (MVP) ---------- */
  {
    id: 'github-action',
    title: 'GitHub Action with a sticky PR comment and check',
    summary: 'Runs the analysis in your own CI and posts one comment and one check on each pull request.',
    status: 'in-development',
    group: 'delivery'
  },
  {
    id: 'surfaces-in-evidence',
    title: 'Surfaces inside the hashed evidence',
    summary: 'Screens, pages and API endpoints become part of the evidence, so surfaces are as reproducible as the code paths that reach them.',
    status: 'in-development',
    group: 'surfaces'
  },
  {
    id: 'proof-paths',
    title: 'A proof path for every affected surface',
    summary: 'Each affected surface carries the path that reaches it: changed function, caller, component, route.',
    status: 'in-development',
    group: 'proof',
    note: 'Caller paths for changed functions exist in the prototype.'
  },
  {
    id: 'confidence-tiers',
    title: 'Proven, likely and unknown confidence tiers',
    summary: 'Every affected surface is marked proven, likely or unknown. What cannot be traced is listed as unknown, never silently dropped.',
    status: 'in-development',
    group: 'proof'
  },
  {
    id: 'test-mapping',
    title: 'Mapping to existing tests',
    summary: 'Existing tests that reach the change are listed, and affected surfaces with no test are flagged.',
    status: 'in-development',
    group: 'proof'
  },
  {
    id: 'deterministic-report',
    title: 'A complete report that needs no LLM',
    summary: 'The full report is produced deterministically. LLM narration stays optional.',
    status: 'in-development',
    group: 'delivery'
  },
  {
    id: 'mcp-server',
    title: 'MCP server for coding agents',
    summary: 'Tools an agent can call: impact_of, affected_surfaces, tests_to_run and explain_path.',
    status: 'in-development',
    group: 'agents'
  },
  {
    id: 'feedback',
    title: 'Useful, Noise and Missed feedback',
    summary: 'One click on every report to say whether it was useful, noise, or missed something.',
    status: 'in-development',
    group: 'delivery'
  },
  {
    id: 'wider-ts-coverage',
    title: 'Wider TypeScript coverage',
    summary: 'Arrow functions, components, class methods and JSX renders, not only named functions.',
    status: 'in-development',
    group: 'engine'
  },
  {
    id: 'impactbench',
    title: 'Public accuracy benchmark',
    summary: 'A public benchmark, ImpactBench, on which recall and precision will be published.',
    status: 'in-development',
    group: 'proof'
  },
  {
    id: 'hosted-reports',
    title: 'Hosted report page',
    summary: 'A web page for each report, with surfaces, proof paths, tests and unknowns.',
    status: 'in-development',
    group: 'delivery'
  },

  /* ---------- Supported stack (in development) ---------- */
  {
    id: 'stack-typescript-react',
    title: 'TypeScript and TSX with React (and React Router)',
    summary: 'Certified support is in development. A heuristic map exists in the prototype.',
    status: 'in-development',
    group: 'stack'
  },
  {
    id: 'stack-nextjs',
    title: 'Next.js',
    summary: 'Certified support is in development. A heuristic map exists in the prototype.',
    status: 'in-development',
    group: 'stack'
  },
  {
    id: 'stack-express',
    title: 'Express',
    summary: 'Certified support is in development. A heuristic map exists in the prototype.',
    status: 'in-development',
    group: 'stack'
  },
  {
    id: 'stack-nestjs',
    title: 'NestJS',
    summary: 'Certified support is in development. A heuristic map exists in the prototype.',
    status: 'in-development',
    group: 'stack'
  },
  {
    id: 'stack-workspace',
    title: 'A single repository or a simple workspace',
    summary: 'One repository, or a simple npm or pnpm workspace.',
    status: 'in-development',
    group: 'stack'
  },
  {
    id: 'stack-github',
    title: 'GitHub',
    summary: 'Pull request comment and check on GitHub.',
    status: 'in-development',
    group: 'stack'
  },

  /* ---------- Planned (after the MVP) ---------- */
  {
    id: 'release-scope',
    title: 'Release-level regression scope',
    summary: 'The pull requests in a release, combined and deduplicated by surface: what to test for the release.',
    status: 'planned',
    group: 'release'
  },
  {
    id: 'affected-test-run',
    title: 'Run only the affected tests, with a CI-minutes report',
    summary: 'Run just the tests that reach the change, and report the CI minutes that saves.',
    status: 'planned',
    group: 'release'
  },
  {
    id: 'incident-backtrace',
    title: 'Incident back-trace',
    summary: 'Start from a broken screen and find the recent pull requests that reached it.',
    status: 'planned',
    group: 'release'
  },
  {
    id: 'zero-impact-lane',
    title: 'Zero-impact fast lane',
    summary: 'Pull requests with no reported surface impact get a clear check, so they can move faster.',
    status: 'planned',
    group: 'release'
  },
  {
    id: 'coverage-import',
    title: 'Coverage import',
    summary: 'Import test coverage so a static path can be confirmed by what actually ran.',
    status: 'planned',
    group: 'proof'
  },
  {
    id: 'audit-export',
    title: 'Compliance and audit export',
    summary: 'Reproducible impact records you can attach to a change.',
    status: 'planned',
    group: 'platform'
  },
  {
    id: 'test-generation',
    title: 'Generated tests for uncovered surfaces',
    summary: 'Draft tests, for your team to review, only for flagged surfaces that have none.',
    status: 'planned',
    group: 'release'
  },
  {
    id: 'browser-api-verification',
    title: 'Isolated browser and API verification',
    summary: 'Approved browser and API checks run in disposable environments. Deferred until after the MVP.',
    status: 'planned',
    group: 'release'
  },
  {
    id: 'python',
    title: 'Python',
    summary: 'A second language, after TypeScript depth is proven.',
    status: 'planned',
    group: 'engine'
  },
  {
    id: 'open-source-core',
    title: 'Open-source core',
    summary: 'An open-source core of the engine. The licence is undecided.',
    status: 'planned',
    group: 'platform'
  },
  {
    id: 'report-history',
    title: 'Report history',
    summary: 'Past reports for each repository, so you can see how a surface has been reached over time.',
    status: 'planned',
    group: 'platform'
  },
  {
    id: 'sso',
    title: 'Single sign-on',
    summary: 'Single sign-on for larger organisations.',
    status: 'planned',
    group: 'platform'
  }
];

/** What is not supported yet. Limitations, not claims, so they carry no capability status. */
export interface NotYet {
  id: string;
  title: string;
  note: string;
}

export const notYet: NotYet[] = [
  { id: 'other-languages', title: 'Other languages', note: 'Python is planned after the MVP.' },
  { id: 'vue-angular', title: 'Vue and Angular', note: 'Not on the MVP path.' },
  { id: 'gitlab-bitbucket', title: 'GitLab and Bitbucket', note: 'GitHub only for now.' },
  { id: 'cross-repo', title: 'Cross-repository analysis', note: 'One repository, or a simple workspace, at a time.' },
  { id: 'running-tests', title: 'Running tests', note: 'Graphentra lists the tests that reach a change. It does not run them yet.' }
];

const index = new Map(capabilities.map(capability => [capability.id, capability]));

export function capabilityById(id: string): Capability {
  const found = index.get(id);
  if (!found) throw new Error(`Unknown capability: ${id}`);
  return found;
}

export const byStatus = (status: CapabilityStatus, options: { includeStack?: boolean } = {}): Capability[] =>
  capabilities.filter(capability => capability.status === status && (options.includeStack || capability.group !== 'stack'));

export const stackRows = capabilities.filter(capability => capability.group === 'stack');
