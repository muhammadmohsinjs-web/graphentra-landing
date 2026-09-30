'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const load = () => import('../scripts/claims-lint.mjs');
const load2 = () => import('../scripts/lib/html.mjs');

const failing = [
  ['customers', 'Trusted by engineering teams everywhere.'],
  ['customers', 'A testimonial from our first user.'],
  ['counts', 'Used by 1,200 developers.'],
  ['counts', 'Over 3k stars on GitHub.'],
  ['awards-press', 'An award-winning product, featured in the press.'],
  ['awards-press', 'Backed by leading investors.'],
  ['performance-figures', 'Finds regressions 40% faster.'],
  ['performance-figures', 'A 3x faster review.'],
  ['certifications', 'Graphentra is SOC 2 compliant.'],
  ['certifications', 'We are certified for enterprise use.'],
  ['uptime', 'With 99.9% uptime.'],
  ['prices', 'Plans start at $49 per seat.'],
  ['prices', 'There is a free plan.'],
  ['launch-dates', 'Available in Q3.'],
  ['launch-dates', 'Launching in March.'],
  ['safety', 'Merge is safe to ship once it is green.'],
  ['safety', 'No risk of regressions.'],
  ['safety', 'A path proves that nothing else is affected.'],
  ['safety', 'Absence of a path is proof of safety.'],
  ['will-break', 'This change will break checkout.'],
  ['privacy', 'Your code never leaves your infrastructure.'],
  ['open-source', 'Graphentra is open source and free to use.'],
  ['competitors', 'Better than CodeRabbit.']
];

const passing = [
  'Graphentra is pre-launch. Early access is open.',
  'No path found is not proof of safety.',
  'Anything Graphentra cannot trace is never counted as safe.',
  'Certified support is in development and not yet certified.',
  'An open-source core is planned, and the licence is undecided.',
  'The analysis runs in your own CI.',
  'A change may reach the guardian flow.',
  'Same diff, same answer.',
  'The token check uses claims.aud !== AUDIENCE.',
  '02 Developers and tech leads',
  'Now, Next and Later, with no dates.'
];

for (const [id, text] of failing) {
  test(`fails on ${id}: ${text}`, async () => {
    const { lintText } = await load();
    const { fails } = lintText(text);
    assert.ok(fails.some(finding => finding.id === id), `expected a "${id}" failure, got ${JSON.stringify(fails.map(finding => finding.id))}`);
  });
}

for (const text of passing) {
  test(`passes: ${text}`, async () => {
    const { lintText } = await load();
    assert.deepEqual(lintText(text).fails, []);
  });
}

test('warns, without failing, on hype, exclamation marks, emoji and American spellings', async () => {
  const { lintText } = await load();
  const { fails, warns } = lintText('A seamless, powerful tool! Analyze your behavior 🚀');
  assert.deepEqual(fails, []);
  assert.deepEqual([...new Set(warns.map(finding => finding.id))].sort(), ['american', 'emoji', 'exclamation', 'hype']);
});

test('external links must be named sources', async () => {
  const { lintLinks } = await load();
  const allowed = new Set(['https://survey.stackoverflow.co/2025/ai']);
  const html = '<a href="https://survey.stackoverflow.co/2025/ai">ok</a><a href="https://example.com/invented">no</a><a href="/product/">local</a><a href="mailto:hi@example.com">mail</a>';
  assert.deepEqual(lintLinks(html, allowed), ['https://example.com/invented', 'mailto:hi@example.com']);
});

test('elementsWith finds a whole element by depth, and an unlabelled example is detectable', async () => {
  const { elementsWith, withoutElements } = await load2();
  const html = '<main><figure data-example><div><span data-example-label>Illustrative example</span></div><p>PR #482</p></figure><figure data-example><p>AUTH-1287</p></figure><p>Outside</p></main>';
  const found = elementsWith(html, 'data-example');
  assert.equal(found.length, 2);
  assert.match(found[0], /data-example-label/);
  assert.doesNotMatch(found[1], /data-example-label/);
  assert.equal(elementsWith(html, 'data-example-label').length, 1, 'the label attribute is not confused with data-example');
  assert.doesNotMatch(withoutElements(html, 'data-example'), /482|1287/);
});
