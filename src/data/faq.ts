/** FAQ copy. Answers are plain text; an optional `more` link points to the page with the detail. */

export interface FaqItem {
  id: string;
  q: string;
  a: string;
  more?: { href: string; label: string };
}

export const homeFaq: FaqItem[] = [
  {
    id: 'available',
    q: 'Is Graphentra available today?',
    a: 'Not generally. Graphentra is in development and early access is open to a small number of teams. A prototype of the analysis engine exists. The GitHub check and the rest of the MVP are in development. The examples on this site illustrate the intended experience.',
    more: { href: '/roadmap/', label: 'See what is built, in development and planned' }
  },
  {
    id: 'tests',
    q: 'Do we need an existing test suite?',
    a: 'No. Graphentra starts from the repository and the diff, so it works before you have tests. If you do have tests, the planned PR check shows which of them reach each affected surface and flags surfaces that have none. If you have none, you still get the surfaces and a QA checklist.'
  },
  {
    id: 'affected',
    q: 'Does “affected” mean “buggy”?',
    a: 'No. Affected means a change can reach a surface, so it may deserve a check. Tests and people decide whether the behaviour is correct. Graphentra says where to look, not what you will find.'
  },
  {
    id: 'stacks',
    q: 'Which stacks are supported?',
    a: 'The MVP targets TypeScript and TSX with React (including React Router), Next.js, Express and NestJS, in a single repository or a simple workspace, on GitHub. Support is in development and not yet certified. Not yet supported: other languages, Vue, Angular, GitLab, Bitbucket and cross-repository analysis.',
    more: { href: '/product/#stack', label: 'See the supported stack' }
  },
  {
    id: 'where',
    q: 'Where does the analysis run?',
    a: 'In your own CI. The planned GitHub Action runs the analysis inside your workflow. The evidence includes excerpts of the changed lines, and we are writing a precise statement of exactly what leaves your CI. It is not published yet, and we will not summarise it until it is.',
    more: { href: '/trust/#privacy', label: 'Read the privacy model' }
  },
  {
    id: 'ai-review',
    q: 'How is this different from AI code review?',
    a: 'AI code reviewers comment on code. Graphentra tells QA what to test. Its evidence is deterministic: the same diff gives the same answer, every reported surface has a proof path, and what it could not trace is listed as unknown. It is designed to work alongside AI reviewers and coding agents, and to feed them.',
    more: { href: '/compare/', label: 'Compare by category' }
  },
  {
    id: 'llm',
    q: 'Is an LLM involved?',
    a: 'Optionally. The analysis itself is deterministic and uses no LLM. An LLM can narrate the evidence as a plain-English QA checklist, and it never changes the evidence. A complete report that needs no LLM is in development.'
  }
];

export const pricingFaq: FaqItem[] = [
  {
    id: 'price',
    q: 'What does Graphentra cost?',
    a: 'There is no public price list yet. Graphentra is pre-launch, and paid plans will be announced at launch.'
  },
  {
    id: 'pilot',
    q: 'What does a design-partner pilot involve?',
    a: 'Hands-on onboarding and a direct line to the people building Graphentra. In return we ask for honest feedback on what was useful, what was noise and what it missed. You shape the product.'
  },
  {
    id: 'paid-pilot',
    q: 'What is a paid pilot?',
    a: 'A pilot on your own repository that we agree with you in advance. Choose “Paid pilot” in the early-access form and tell us what you would like to try. We will explain what is involved before anything is agreed.'
  },
  {
    id: 'open-source',
    q: 'Will there be an open-source version?',
    a: 'An open-source core is planned, and the licence is undecided. It is not available today.'
  }
];
