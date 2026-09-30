/**
 * The one illustrative example used across the site: PR #482 changes validateToken().
 *
 * Everything that shows it (hero graph, problem figure, how-it-works panels, PR check,
 * evidence excerpt, "run it twice", agent terminal, use-case scenarios) renders from this
 * file, so the figures can never disagree. Every element that renders it carries
 * `data-example` and a visible "Illustrative example" label; scripts/verify-build.mjs
 * fails the build if either is missing.
 *
 * Graph coordinates are in the hero graph's 900 × 600 viewBox.
 */

export const exampleLabel = 'Illustrative example';

export type FlowId = 'otp' | 'password' | 'guardian';
export type SurfaceId = FlowId | 'unknown';
export type Confidence = 'proven' | 'likely' | 'unknown';
export type StepKind = 'changed' | 'caller' | 'component' | 'route' | 'api' | 'unresolved';

/* ---------- The change ---------- */

export const pr = { number: 482, title: 'Update shared authentication', state: 'Open' } as const;

export const ticket = {
  id: 'AUTH-1287',
  title: 'Update token validation to check the audience claim',
  status: 'In review',
  declaredScope: 'OTP login'
} as const;

export const change = {
  symbol: 'validateToken',
  call: 'validateToken()',
  file: 'auth/token.ts',
  kind: 'body change',
  detail: 'audience check added',
  functionsChanged: 1,
  added: 3,
  removed: 1
} as const;

/** Shortened content fingerprint of the evidence. The same inputs always give the same one. */
export const fingerprint = 'a91f…c3';

/* ---------- Surfaces reached by the change ---------- */

export interface ProofStep {
  kind: StepKind;
  label: string;
  /** file:line (or file) for the step; illustrative. */
  at?: string;
}

export interface Surface {
  id: SurfaceId;
  name: string;
  /** Route, or the reason it could not be traced. */
  route: string;
  relation: string;
  reason: string;
  confidence: Confidence;
  inTicket: boolean;
  /** true / false, or null when it cannot be answered because the path is not traced. */
  testReaches: boolean | null;
  tests: string[];
  action?: 'manual check' | 'not traced';
  proofPath: ProofStep[];
}

export const surfaces: Surface[] = [
  {
    id: 'otp',
    name: 'OTP login',
    route: '/login/otp',
    relation: 'Direct consumer',
    reason: 'OTP login calls the updated token validator. Check valid, invalid and expired codes.',
    confidence: 'proven',
    inTicket: true,
    testReaches: true,
    tests: ['e2e/otp.spec.ts'],
    proofPath: [
      { kind: 'changed', label: 'validateToken', at: 'auth/token.ts:11' },
      { kind: 'caller', label: 'verifyOtp', at: 'auth/otp.ts:24' },
      { kind: 'route', label: '/login/otp', at: 'app/login/otp/page.tsx' }
    ]
  },
  {
    id: 'password',
    name: 'Password login',
    route: '/login',
    relation: 'Shared dependency',
    reason: 'Password login uses the same token validator. Check that a valid login still creates a working session.',
    confidence: 'proven',
    inTicket: false,
    testReaches: true,
    tests: ['e2e/login.spec.ts'],
    proofPath: [
      { kind: 'changed', label: 'validateToken', at: 'auth/token.ts:11' },
      { kind: 'caller', label: 'passwordLogin', at: 'auth/password.ts:18' },
      { kind: 'route', label: '/login', at: 'app/login/page.tsx' }
    ]
  },
  {
    id: 'guardian',
    name: 'Guardian access',
    route: '/guardian/children',
    relation: 'Indirect consumer',
    reason: 'Guardian access relies on session middleware that uses the updated validator. Check access after login and after session expiry.',
    confidence: 'proven',
    inTicket: false,
    testReaches: false,
    tests: [],
    action: 'manual check',
    proofPath: [
      { kind: 'changed', label: 'validateToken', at: 'auth/token.ts:11' },
      { kind: 'caller', label: 'sessionMiddleware', at: 'auth/session.ts:27' },
      { kind: 'route', label: '/guardian/children', at: 'app/guardian/children/page.tsx' }
    ]
  },
  {
    id: 'unknown',
    name: 'Dynamic permissions',
    route: 'dynamic import',
    relation: 'Dynamic import',
    reason: 'Permissions are loaded with a dynamic import, so the path beyond it cannot be traced. It is reported as unknown, not assumed safe.',
    confidence: 'unknown',
    inTicket: false,
    testReaches: null,
    tests: [],
    action: 'not traced',
    proofPath: [
      { kind: 'changed', label: 'validateToken', at: 'auth/token.ts:11' },
      { kind: 'caller', label: 'loadPermissions', at: 'auth/permissions.ts:9' },
      { kind: 'unresolved', label: 'dynamic import', at: 'auth/permissions.ts:31' }
    ]
  }
];

export const surfaceById = (id: SurfaceId): Surface => {
  const found = surfaces.find(surface => surface.id === id);
  if (!found) throw new Error(`Unknown example surface: ${id}`);
  return found;
};

/** The three surfaces the change reaches with a proven path (the hero graph's flows). */
export const flows = surfaces.filter((surface): surface is Surface & { id: FlowId } => surface.id !== 'unknown');
export const unknownSurface = surfaceById('unknown');

/** Plain text form of a proof path, used for data attributes and text equivalents. */
export const pathLabels = (surface: Surface): string[] => surface.proofPath.map(step => step.label);

/* ---------- Ranked QA checklist (what the last step of the check says) ---------- */

export interface ChecklistItem {
  rank: number;
  surface: SurfaceId;
  text: string;
}

export const checklist: ChecklistItem[] = [
  { rank: 1, surface: 'guardian', text: 'Guardian access: check access after login and after session expiry. No test reaches this surface, and the ticket does not mention it.' },
  { rank: 2, surface: 'otp', text: 'OTP login: check valid, invalid and expired codes.' },
  { rank: 3, surface: 'password', text: 'Password login: check that a valid login still creates a working session.' },
  { rank: 4, surface: 'unknown', text: 'Dynamic permissions: not traced. Check role-based access by hand.' }
];

/* ---------- How-it-works step 1: the diff ---------- */

export interface DiffLine {
  n: string;
  type: 'ctx' | 'add' | 'del';
  indent: number;
  html: string;
}

export const diff: DiffLine[] = [
  { n: '9', type: 'ctx', indent: 0, html: '<span class="k">import</span> { jwt, SECRET, AUDIENCE } <span class="k">from</span> <span class="s">\'./config\'</span>' },
  { n: '10', type: 'ctx', indent: 0, html: '' },
  { n: '11', type: 'ctx', indent: 0, html: '<span class="k">export function</span> <span class="f">validateToken</span>(token: <span class="t">string</span>) {' },
  { n: '12', type: 'del', indent: 1, html: '<span class="k">return</span> jwt.<span class="f">verify</span>(token, SECRET)' },
  { n: '12', type: 'add', indent: 1, html: '<span class="k">const</span> claims = jwt.<span class="f">verify</span>(token, SECRET)' },
  { n: '13', type: 'add', indent: 1, html: '<span class="k">if</span> (claims.aud !== AUDIENCE) <span class="k">throw new</span> <span class="f">TokenError</span>(<span class="s">\'audience\'</span>)' },
  { n: '14', type: 'add', indent: 1, html: '<span class="k">return</span> claims' },
  { n: '15', type: 'ctx', indent: 0, html: '}' }
];

export const diffLabel =
  'Diff of validateToken in auth/token.ts: the function now keeps the verified claims and throws when the audience claim does not match.';

/* ---------- Evidence excerpt (Product page) ---------- */

export const evidenceExcerpt = {
  contentIdentity: fingerprint,
  outcome: 'completed',
  changedEntities: [{ symbol: change.symbol, file: change.file, change: 'body' }],
  impacts: [
    {
      surface: surfaceById('guardian').route,
      confidence: surfaceById('guardian').confidence,
      inTicket: surfaceById('guardian').inTicket,
      testReaches: surfaceById('guardian').testReaches,
      path: pathLabels(surfaceById('guardian'))
    },
    {
      surface: unknownSurface.route,
      confidence: unknownSurface.confidence,
      reason: 'dynamic import in loadPermissions(); not traced',
      path: pathLabels(unknownSurface)
    }
  ],
  limitations: ['Dynamic dispatch, reflection and runtime-only wiring are reported as unknown.']
} as const;

/* ---------- "Run it twice" (Trust page) ---------- */

export const runs = {
  inputs: ['Same repository content', 'Same diff', 'Same engine version'],
  graphentra: [
    { run: 1, fingerprint, surfaces: ['/login/otp', '/login', '/guardian/children'], unknown: 1 },
    { run: 2, fingerprint, surfaces: ['/login/otp', '/login', '/guardian/children'], unknown: 1 }
  ],
  llmOnly: [
    { run: 1, surfaces: ['/login/otp', '/login'], note: 'Guardian access is not mentioned.' },
    { run: 2, surfaces: ['/login/otp', '/login', '/guardian/children'], note: 'Guardian access appears, without a path.' }
  ]
} as const;

/* ---------- Agent terminal (Product page) ---------- */

export type AgentLine =
  | { kind: 'agent'; text: string }
  | { kind: 'call'; tool: string; args: string }
  | { kind: 'result'; text: string }
  | { kind: 'row'; surface: string; confidence: Confidence; note?: string };

export const agentSession: AgentLine[] = [
  { kind: 'agent', text: 'Task: reject tokens whose audience claim does not match.' },
  { kind: 'call', tool: 'impact_of', args: '"validateToken"' },
  { kind: 'result', text: 'Reaches 3 surfaces with proof paths. 1 path could not be traced.' },
  { kind: 'row', surface: '/login/otp', confidence: 'proven' },
  { kind: 'row', surface: '/login', confidence: 'proven' },
  { kind: 'row', surface: '/guardian/children', confidence: 'proven' },
  { kind: 'row', surface: 'dynamic import', confidence: 'unknown', note: 'not traced' },
  { kind: 'agent', text: 'Editing auth/token.ts.' },
  { kind: 'call', tool: 'affected_surfaces', args: '"HEAD~1..HEAD"' },
  { kind: 'result', text: 'Same 3 surfaces. /guardian/children: no test reaches it.' },
  { kind: 'agent', text: 'Adding a note to the PR: check /guardian/children by hand.' }
];

/* ---------- Scenarios (Use cases page). Third person and hypothetical, never a quote. ---------- */

export const scenarios = {
  qa: `A QA lead is handed a ticket titled “${ticket.title}”. It names one flow: ${ticket.declaredScope}. The change is to a token validator that password login and guardian access also use. Nothing in the ticket says so.`,
  leaders: `A pull request titled “${pr.title}” changes one function. Before merge, the engineering manager wants to know how far it reaches, which of those surfaces a test covers, and what could not be traced.`,
  agents: `A coding agent is asked to tighten token validation. Before it edits ${change.call}, it asks what the function reaches. After the edit it asks again, and finds a surface that no test covers.`
} as const;

/* ---------- Problem figure (declared scope vs reachable scope) ---------- */

export interface ReachItem {
  name: string;
  tag: string;
  kind: 'declared' | 'hidden' | 'unknown';
}

export const reach: ReachItem[] = surfaces.map(surface => ({
  name: surface.name,
  tag: surface.confidence === 'unknown' ? 'Unknown' : surface.inTicket ? 'In ticket' : 'Not in ticket',
  kind: surface.confidence === 'unknown' ? 'unknown' : surface.inTicket ? 'declared' : 'hidden'
}));

/* ---------- How-it-works step 2: trace rows ---------- */

export const trace = [
  { fn: 'verifyOtp()', area: 'OTP login', route: '/login/otp', why: 'Direct' },
  { fn: 'passwordLogin()', area: 'Password login', route: '/login', why: 'Shared' },
  { fn: 'sessionMiddleware', area: 'Guardian access', route: '/guardian/children', why: 'Indirect' }
] as const;

/* ---------- Hero graph ---------- */

export type NodeKind = 'changed' | 'fn' | 'flow' | 'unknown' | 'context' | 'dot';
export type LabelPos = 'top' | 'bottom' | 'left' | 'right';

export interface GraphNode {
  id: string;
  x: number;
  y: number;
  kind: NodeKind;
  label?: string;
  sub?: string;
  pos?: LabelPos;
  /** Label position on narrow screens, where edge labels would otherwise leave the frame. */
  posSm?: LabelPos;
  flow?: FlowId | 'unknown';
  hop?: 0 | 1 | 2;
}

export interface GraphEdge {
  from: string;
  to: string;
  kind: 'impact' | 'unresolved' | 'context';
  flow?: FlowId | 'unknown';
  hop?: 1 | 2;
  bend?: number;
}

export const graphSize = { width: 900, height: 600, cx: 450, cy: 300 } as const;
export const rings = [118, 228, 338];

export const nodes: GraphNode[] = [
  { id: 'validateToken', x: 450, y: 300, kind: 'changed', label: change.call, sub: change.file, pos: 'right', hop: 0 },

  { id: 'verifyOtp', x: 395, y: 196, kind: 'fn', label: 'verifyOtp()', pos: 'left', flow: 'otp', hop: 1 },
  { id: 'passwordLogin', x: 554, y: 245, kind: 'fn', label: 'passwordLogin()', pos: 'top', flow: 'password', hop: 1 },
  { id: 'sessionMiddleware', x: 505, y: 404, kind: 'fn', label: 'sessionMiddleware', pos: 'right', flow: 'guardian', hop: 1 },
  { id: 'loadPermissions', x: 337, y: 268, kind: 'fn', label: 'loadPermissions()', pos: 'bottom', flow: 'unknown', hop: 1 },

  { id: 'otpFlow', x: 410, y: 76, kind: 'flow', label: 'OTP login', sub: '/login/otp', pos: 'right', flow: 'otp', hop: 2 },
  { id: 'passwordFlow', x: 671, y: 245, kind: 'flow', label: 'Password login', sub: '/login', pos: 'right', posSm: 'top', flow: 'password', hop: 2 },
  { id: 'guardianFlow', x: 497, y: 523, kind: 'flow', label: 'Guardian access', sub: '/guardian/children', pos: 'right', flow: 'guardian', hop: 2 },
  { id: 'unresolved', x: 222, y: 262, kind: 'unknown', label: 'Unknown', sub: 'dynamic import', pos: 'left', posSm: 'top', flow: 'unknown', hop: 2 },

  // The rest of the codebase: connected, but not reached by this change.
  { id: 'hashPassword', x: 648, y: 150, kind: 'context', label: 'hashPassword()', pos: 'right' },
  { id: 'otpStore', x: 262, y: 138, kind: 'context', label: 'otpStore', pos: 'left' },
  { id: 'search', x: 796, y: 96, kind: 'context', label: 'search/index', pos: 'top' },
  { id: 'billing', x: 782, y: 418, kind: 'context', label: 'billing/invoice', pos: 'bottom' },
  { id: 'reports', x: 118, y: 176, kind: 'context', label: 'reports/export', pos: 'bottom' },
  { id: 'profile', x: 176, y: 474, kind: 'context', label: 'profile/avatar', pos: 'bottom' },
  { id: 'auditLog', x: 336, y: 488, kind: 'context', label: 'auditLog()', pos: 'bottom' },
  { id: 'health', x: 690, y: 548, kind: 'context', label: 'api/health', pos: 'right' },

  // Far field: suggests the graph keeps going beyond the frame.
  { id: 'd1', x: 40, y: 70, kind: 'dot' },
  { id: 'd2', x: 54, y: 352, kind: 'dot' },
  { id: 'd3', x: 44, y: 560, kind: 'dot' },
  { id: 'd4', x: 290, y: 30, kind: 'dot' },
  { id: 'd5', x: 580, y: 36, kind: 'dot' },
  { id: 'd6', x: 870, y: 250, kind: 'dot' },
  { id: 'd7', x: 868, y: 560, kind: 'dot' },
  { id: 'd8', x: 300, y: 584, kind: 'dot' },
  { id: 'd9', x: 590, y: 590, kind: 'dot' }
];

export const edges: GraphEdge[] = [
  { from: 'validateToken', to: 'verifyOtp', kind: 'impact', flow: 'otp', hop: 1, bend: -0.12 },
  { from: 'validateToken', to: 'passwordLogin', kind: 'impact', flow: 'password', hop: 1, bend: -0.14 },
  { from: 'validateToken', to: 'sessionMiddleware', kind: 'impact', flow: 'guardian', hop: 1, bend: 0.12 },
  { from: 'validateToken', to: 'loadPermissions', kind: 'impact', flow: 'unknown', hop: 1, bend: 0.1 },
  { from: 'verifyOtp', to: 'otpFlow', kind: 'impact', flow: 'otp', hop: 2, bend: 0.1 },
  { from: 'passwordLogin', to: 'passwordFlow', kind: 'impact', flow: 'password', hop: 2, bend: 0.14 },
  { from: 'sessionMiddleware', to: 'guardianFlow', kind: 'impact', flow: 'guardian', hop: 2, bend: -0.1 },
  { from: 'loadPermissions', to: 'unresolved', kind: 'unresolved', flow: 'unknown', hop: 2, bend: -0.16 },

  { from: 'passwordLogin', to: 'hashPassword', kind: 'context', bend: 0.1 },
  { from: 'verifyOtp', to: 'otpStore', kind: 'context', bend: 0.12 },
  { from: 'hashPassword', to: 'search', kind: 'context', bend: -0.1 },
  { from: 'otpStore', to: 'reports', kind: 'context', bend: 0.1 },
  { from: 'reports', to: 'd1', kind: 'context' },
  { from: 'reports', to: 'd2', kind: 'context', bend: 0.1 },
  // Callees of affected code (sessionMiddleware → auditLog) are connected but not affected.
  { from: 'sessionMiddleware', to: 'auditLog', kind: 'context', bend: 0.12 },
  { from: 'profile', to: 'auditLog', kind: 'context', bend: -0.1 },
  { from: 'profile', to: 'd3', kind: 'context' },
  { from: 'auditLog', to: 'd8', kind: 'context' },
  { from: 'billing', to: 'health', kind: 'context', bend: 0.12 },
  { from: 'billing', to: 'd6', kind: 'context' },
  { from: 'billing', to: 'd7', kind: 'context', bend: 0.08 },
  { from: 'health', to: 'd9', kind: 'context' },
  { from: 'search', to: 'd5', kind: 'context', bend: -0.12 },
  { from: 'otpStore', to: 'd4', kind: 'context' },
  { from: 'unresolved', to: 'd2', kind: 'context' }
];

/** Quadratic curve between two nodes, bowed perpendicular to the chord. */
export function edgePath(a: GraphNode, b: GraphNode, bend = 0): string {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const cx = mx - (b.y - a.y) * bend;
  const cy = my + (b.x - a.x) * bend;
  return `M${a.x} ${a.y} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x} ${b.y}`;
}
