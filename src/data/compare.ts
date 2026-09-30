/**
 * "Why deterministic": a category-level comparison. Other categories are described with hedged
 * wording ("Usually", "Varies", "Needs history", "Package-level"), never a flat "No". No vendor
 * names, logos or criticism. The Graphentra column shows the target at launch, and every cell
 * carries the status chips of the capabilities behind it.
 */

export const compareColumns = [
  { id: 'reviewers', title: 'AI code reviewers', blurb: 'Comment on a pull request using a language model.' },
  { id: 'tia', title: 'Test-impact tools', blurb: 'Choose tests from coverage or test history.' },
  { id: 'graph', title: 'Build-graph “affected” tools', blurb: 'Choose packages from the module graph.' },
  { id: 'aiqa', title: 'AI QA and UI-regression tools', blurb: 'Write, replay or compare end-to-end tests.' }
] as const;

export type CompareColumnId = (typeof compareColumns)[number]['id'];

export interface CompareRow {
  id: string;
  label: string;
  others: Record<CompareColumnId, string>;
  graphentra: { text: string; capabilities: string[] };
}

export const compareRows: CompareRow[] = [
  {
    id: 'day-one',
    label: 'Works on day one, with no history or recordings',
    others: {
      reviewers: 'Usually',
      tia: 'Needs history or coverage data',
      graph: 'Usually',
      aiqa: 'Needs recordings or a test suite'
    },
    graphentra: { text: 'Starts from the repository and the diff.', capabilities: ['works-on-day-one'] }
  },
  {
    id: 'same-answer',
    label: 'Same diff, same answer',
    others: {
      reviewers: 'Varies. Model output can differ between runs',
      tia: 'Often',
      graph: 'Usually',
      aiqa: 'Varies'
    },
    graphentra: { text: 'Byte-identical evidence for the same inputs.', capabilities: ['evidence-file'] }
  },
  {
    id: 'symbol-level',
    label: 'Symbol-level precision',
    others: {
      reviewers: 'Varies',
      tia: 'File or method level',
      graph: 'Package-level',
      aiqa: 'Usually behaviour, not code'
    },
    graphentra: { text: 'Named functions today. Wider coverage next.', capabilities: ['ts-diff-analysis', 'wider-ts-coverage'] }
  },
  {
    id: 'surfaces',
    label: 'Names affected screens and APIs',
    others: {
      reviewers: 'Varies',
      tia: 'Usually test names or IDs',
      graph: 'Package-level',
      aiqa: 'Screens it has observed'
    },
    graphentra: { text: 'Surfaces are part of the evidence.', capabilities: ['surfaces-in-evidence'] }
  },
  {
    id: 'proof',
    label: 'Proof path per claim',
    others: {
      reviewers: 'Varies. Some cite code',
      tia: 'Rarely',
      graph: 'Usually a package-level reason',
      aiqa: 'Usually a replay or a visual diff'
    },
    graphentra: { text: 'Changed function, caller, component, route.', capabilities: ['proof-paths'] }
  },
  {
    id: 'unknown',
    label: 'States what it could not trace',
    others: {
      reviewers: 'Varies. Often a general disclaimer',
      tia: 'Rarely',
      graph: 'Rarely',
      aiqa: 'Sometimes'
    },
    graphentra: { text: 'Listed as unknown, never dropped.', capabilities: ['confidence-tiers'] }
  },
  {
    id: 'manual-qa',
    label: 'Guides manual QA',
    others: {
      reviewers: 'Rarely',
      tia: 'Varies',
      graph: 'Rarely',
      aiqa: 'Varies'
    },
    graphentra: { text: 'A ranked, plain-English checklist.', capabilities: ['llm-qa-checklist'] }
  }
];
