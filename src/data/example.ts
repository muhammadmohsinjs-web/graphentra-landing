/**
 * Illustrative example used across the page: PR #482 changes validateToken().
 * Coordinates are in the hero graph's 900 × 600 viewBox.
 */

export type FlowId = 'otp' | 'password' | 'guardian';

export interface Flow {
  id: FlowId;
  name: string;
  route: string;
  relation: string;
  priority: 'High' | 'Medium';
  reason: string;
  path: string[];
}

export const flows: Flow[] = [
  {
    id: 'otp',
    name: 'OTP login',
    route: '/login/otp',
    relation: 'Direct consumer',
    priority: 'High',
    reason: 'OTP login calls the updated token validator. Check valid, invalid and expired codes.',
    path: ['validateToken', 'verifyOtp', '/login/otp']
  },
  {
    id: 'password',
    name: 'Password login',
    route: '/login',
    relation: 'Shared dependency',
    priority: 'Medium',
    reason: 'Password login uses the same token validator. Check that a valid login still creates a working session.',
    path: ['validateToken', 'passwordLogin', '/login']
  },
  {
    id: 'guardian',
    name: 'Guardian access',
    route: '/guardian/children',
    relation: 'Indirect consumer',
    priority: 'High',
    reason: 'Guardian access relies on session middleware that uses the updated validator. Check access after login and after session expiry.',
    path: ['validateToken', 'sessionMiddleware', '/guardian/children']
  }
];

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
  { id: 'validateToken', x: 450, y: 300, kind: 'changed', label: 'validateToken()', sub: 'auth/token.ts', pos: 'right', hop: 0 },

  { id: 'verifyOtp', x: 395, y: 196, kind: 'fn', label: 'verifyOtp()', pos: 'left', flow: 'otp', hop: 1 },
  { id: 'passwordLogin', x: 554, y: 245, kind: 'fn', label: 'passwordLogin()', pos: 'top', flow: 'password', hop: 1 },
  { id: 'sessionMiddleware', x: 505, y: 404, kind: 'fn', label: 'sessionMiddleware', pos: 'right', flow: 'guardian', hop: 1 },
  { id: 'loadPermissions', x: 337, y: 268, kind: 'fn', label: 'loadPermissions()', pos: 'bottom', flow: 'unknown', hop: 1 },

  { id: 'otpFlow', x: 410, y: 76, kind: 'flow', label: 'OTP login', sub: '/login/otp', pos: 'right', flow: 'otp', hop: 2 },
  { id: 'passwordFlow', x: 671, y: 245, kind: 'flow', label: 'Password login', sub: '/login', pos: 'right', posSm: 'top', flow: 'password', hop: 2 },
  { id: 'guardianFlow', x: 497, y: 523, kind: 'flow', label: 'Guardian access', sub: '/guardian/children', pos: 'right', flow: 'guardian', hop: 2 },
  { id: 'unresolved', x: 222, y: 262, kind: 'unknown', label: 'Unresolved', sub: 'dynamic import', pos: 'left', posSm: 'top', flow: 'unknown', hop: 2 },

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
