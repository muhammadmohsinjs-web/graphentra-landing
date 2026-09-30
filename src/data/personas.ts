import { scenarios } from './example';

/** Who Graphentra is for. Scenario text comes from example.ts, so example data lives in one place. */

export interface Give {
  text: string;
  /** The capability behind the claim. Rendered with its status chip. */
  capability: string;
}

export interface Persona {
  id: 'qa' | 'leaders' | 'agents';
  anchor: string;
  name: string;
  tag: string;
  headline: string;
  scenario: string;
  gives: Give[];
}

export const personas: Persona[] = [
  {
    id: 'qa',
    anchor: 'qa-teams',
    name: 'QA teams',
    tag: 'Usually the first to feel it',
    headline: 'Test what the ticket did not mention.',
    scenario: scenarios.qa,
    gives: [
      { text: 'A ranked, plain-English checklist of the screens and flows a change can reach.', capability: 'llm-qa-checklist' },
      { text: 'The reason and the proof path beside every item.', capability: 'proof-paths' },
      { text: 'Affected surfaces that no test reaches, flagged for a manual check.', capability: 'test-mapping' },
      { text: 'A plain list of what could not be traced.', capability: 'confidence-tiers' }
    ]
  },
  {
    id: 'leaders',
    anchor: 'engineering-leaders',
    name: 'Engineering leaders',
    tag: 'Usually the one who signs it off',
    headline: 'Review AI-written pull requests on evidence.',
    scenario: scenarios.leaders,
    gives: [
      { text: 'One check on every pull request, produced in your own CI.', capability: 'github-action' },
      { text: 'Reach, test coverage and unknowns at a glance.', capability: 'test-mapping' },
      { text: 'Evidence that is identical every time it is run.', capability: 'evidence-file' },
      { text: 'Less wasted test time, by running only the tests that reach a change.', capability: 'affected-test-run' }
    ]
  },
  {
    id: 'agents',
    anchor: 'ai-agents',
    name: 'Developers with AI agents',
    tag: 'Where the volume is coming from',
    headline: 'Give your agent something to check against.',
    scenario: scenarios.agents,
    gives: [
      { text: 'impact_of before an edit, and affected_surfaces after it.', capability: 'mcp-server' },
      { text: 'A proof path an agent can read back with explain_path.', capability: 'mcp-server' },
      { text: 'The tests that reach a change, from tests_to_run.', capability: 'test-mapping' },
      { text: 'Evidence designed to feed AI code reviewers as well as agents.', capability: 'github-action' }
    ]
  }
];

/** Secondary audiences. Mentioned, not led with. Both are planned. */
export const alsoFor = [
  {
    id: 'regulated',
    name: 'Regulated teams',
    text: 'Reproducible impact records to attach to a change.',
    capability: 'audit-export'
  },
  {
    id: 'agencies',
    name: 'Agencies',
    text: 'Per-release impact for clients.',
    capability: 'release-scope'
  }
] as const;

/** The four cards on the home page: everyone behind the release, plus coding agents. */
export const audiences = [
  {
    id: 'qa',
    role: 'QA & test engineers',
    question: 'What did the ticket not tell me?',
    answer: 'A ranked checklist of the screens and flows a change can reach, with the reason attached to every item.',
    href: '/use-cases/#qa-teams',
    capability: undefined
  },
  {
    id: 'developers',
    role: 'Developers & tech leads',
    question: 'What else did my change touch?',
    answer: 'The chain of calls from your change to every screen and endpoint it reaches, one path per claim.',
    href: '/use-cases/#engineering-leaders',
    capability: undefined
  },
  {
    id: 'release',
    role: 'Product & release teams',
    question: 'Are we confident enough to ship?',
    answer: 'A shared view of what was reached, what has a test, and what could not be traced.',
    href: '/use-cases/#engineering-leaders',
    capability: undefined
  },
  {
    id: 'agents',
    role: 'AI coding agents',
    question: 'What will this edit reach?',
    answer: 'MCP tools an agent can call before and after an edit, so it checks its own change against the evidence.',
    href: '/use-cases/#ai-agents',
    capability: 'mcp-server'
  }
] as const;
