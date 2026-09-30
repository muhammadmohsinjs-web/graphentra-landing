// Claims lint for the built pages in dist/.
//
// Graphentra is pre-launch, so the site must not publish proof it does not have. This script reads the
// visible text of every built page (plus its title and description) and:
//   FAILS on fabricated proof and over-claims: customers, logos, testimonials, user counts, awards, press,
//     investors, accuracy/speed/ROI figures, certifications, uptime, prices, launch dates, "safe" or
//     "no risk" language, competitor names, invented external links, and privacy wording we cannot back.
//   WARNS on hype words, exclamation marks, emoji and American spellings.
// Third-party figures live in elements marked `data-allow-figures`. They carry their own source and year
// and are exempt. Run with `--report` to print the claims table (every status chip, per page).

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { attribute, textOf, withoutElements } from './lib/html.mjs';

const NEGATION = /\b(?:not|never|no|isn'?t|aren'?t|without|nor|nothing|cannot|can'?t|won'?t|don'?t|doesn'?t)\b[^.]{0,80}$/i;
const months = 'January|February|March|April|May|June|July|August|September|October|November|December';

/** A rule fails the build. `negatable` rules are skipped when a negation shortly precedes the match. */
export const failRules = [
  // Customers, logos, testimonials, social proof
  { id: 'customers', pattern: /\btrusted by\b|\bour customers\b|\bcustomers (?:include|like|such as)\b|\bused (?:by|at) (?:teams|companies|engineers|developers)\b|\btestimonials?\b|\bcase stud(?:y|ies)\b|\bloved by\b|\bjoin (?:\d|the \d)/i, why: 'customer or social proof' },
  { id: 'counts', pattern: /\b[1-9][\d,.]*\s?(?:\+|k|m)?\s+(?:users|customers|teams|companies|organisations|organizations|developers|engineers|stars|installs|downloads|contributors|repositories|repos|pull requests|prs)\b/i, why: 'a count of users, stars or usage' },
  { id: 'awards-press', pattern: /\baward[- ]winning\b|\bas seen (?:in|on)\b|\bfeatured (?:in|on)\b|\bbacked by\b|\bfunded by\b|\bseries [a-d]\b|\braised \$|\binvestors?\b|\bY Combinator\b|\bproduct hunt\b/i, why: 'awards, press or investors' },
  // Figures we do not have
  { id: 'performance-figures', pattern: /\b\d+(?:\.\d+)?\s?%\s*(?:accura|faster|fewer|less|more|reduction|improvement|cheaper)|\b\d+(?:\.\d+)?x\s+(?:faster|more|less|fewer)\b|\bsaves? (?:you )?\d+|\b\d+\s*(?:hours|minutes|seconds|ms)\s+(?:saved|faster)\b|\bROI\b|\b(?:precision|recall|accuracy) of \d/i, why: 'an accuracy, speed or ROI figure' },
  { id: 'certifications', pattern: /\bSOC ?2\b|\bISO ?27001\b|\bHIPAA\b|\bPCI[- ]DSS\b|\bGDPR[- ](?:compliant|ready)\b|\b(?:we are|is|are|fully|independently)\s+certified\b|\bcertified (?:secure|by|compliant)\b/i, why: 'a certification claim', negatable: true },
  { id: 'uptime', pattern: /\b\d+(?:\.\d+)?\s?%\s*uptime\b|\bSLA\b|\b99\.\d+\s?%/i, why: 'an uptime or SLA figure' },
  // Prices and dates
  { id: 'prices', pattern: /[$£€]\s?\d|\b\d+\s?\/\s?(?:mo|month|user|seat|dev|developer)\b|\bper (?:seat|user|developer|month|engineer)\b|\bfree (?:tier|plan|forever|trial)\b/i, why: 'a price or price anchor' },
  { id: 'launch-dates', pattern: new RegExp(`\\b(?:launch(?:es|ing)?|available|ship(?:s|ping)?|releas(?:es|ed|ing)?|coming|live)\\s+(?:in|on|by|from)\\s+(?:Q[1-4]|${months}|20\\d\\d)|\\bQ[1-4]\\s?20\\d\\d\\b|\\b(?:${months})\\s+20\\d\\d\\b`, 'i'), why: 'an exact launch date (use Now, Next and Later)' },
  // Safety and certainty
  { id: 'safety', pattern: /\bsafe to (?:merge|ship|release|deploy)\b|\bno risk\b|\brisk[- ]free\b|\bguarantee[sd]?\b|\bzero (?:bugs|defects|regressions)\b|\b(?:catch|find)(?:es)? every\b|\bnever miss\b|\b100\s?%|\b(?:is|are|deemed|counted as) safe\b|\bproof of safety\b|\bproves? (?:that )?(?:nothing|there is no|no other)\b/i, why: 'a safety or certainty claim', negatable: true },
  { id: 'will-break', pattern: /\bwill (?:break|fail|cause)\b/i, why: 'a certain prediction (use "may reach")' },
  // Privacy wording
  { id: 'privacy', pattern: /\byour code never leaves\b|\bnever leaves your\b|\b(?:zero|no) data (?:leaves|leaving)\b|\bnothing leaves\b/i, why: 'privacy wording we cannot back (say "analysis runs in your own CI")' },
  // "Open source" as a current fact: allowed only near planned / undecided / not available.
  { id: 'open-source', pattern: /\bopen[- ]source\b/i, why: 'open source stated as a current fact', near: /\b(?:planned|undecided|not available|later|not yet|if)\b/i },
  // Competitors
  { id: 'competitors', pattern: /\b(?:CodeRabbit|Greptile|Graphite|Qodo|Copilot|Cursor|Bugbot|Launchable|Sourcegraph|Codecov|Applitools|Chromatic|Testim|mabl|SonarQube|Diffblue|Datadog|Snyk)\b/, why: 'a competitor name' }
];

/** Warnings do not fail the build. */
export const warnRules = [
  { id: 'hype', pattern: /\b(?:revolutionary|revolutionise|revolutionize|game[- ]chang\w+|seamless(?:ly)?|cutting[- ]edge|best[- ]in[- ]class|world[- ]class|unleash\w*|supercharg\w+|magic(?:al)?|effortless(?:ly)?|blazing\w*|next[- ]gen(?:eration)?|state[- ]of[- ]the[- ]art|robust|powerful|AI[- ]powered|10x|end[- ]to[- ]end solution|game changer)\b/i, why: 'hype word' },
  { id: 'exclamation', pattern: /!(?!=)/, why: 'exclamation mark' },
  { id: 'emoji', pattern: /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2B55}]/u, why: 'emoji' },
  { id: 'american', pattern: /\b(?:behavior\w*|organization\w*|organize[sd]?|analyz\w+|optimiz\w+|prioritiz\w+|summariz\w+|recogniz\w+|customiz\w+|catalog\w*|center\w*|colors?|favorite\w*|license[sd]?|gray|utiliz\w+|realiz\w+|minimiz\w+|standardiz\w+)\b/i, why: 'American spelling (use British English)' }
];

/** Returns { fails, warns } for a piece of visible text. Each finding has { id, why, excerpt }. */
export function lintText(text) {
  const fails = [];
  const warns = [];
  const excerptOf = (index, length) => text.slice(Math.max(0, index - 40), index + length + 40).replace(/\s+/g, ' ').trim();
  for (const [rules, sink] of [[failRules, fails], [warnRules, warns]]) {
    for (const rule of rules) {
      const flags = rule.pattern.flags.includes('g') ? rule.pattern.flags : `${rule.pattern.flags}g`;
      for (const match of text.matchAll(new RegExp(rule.pattern.source, flags))) {
        const before = text.slice(Math.max(0, match.index - 100), match.index);
        if (rule.negatable && NEGATION.test(before)) continue;
        if (rule.near && rule.near.test(text.slice(Math.max(0, match.index - 200), match.index + match[0].length + 200))) continue;
        sink.push({ id: rule.id, why: rule.why, excerpt: excerptOf(match.index, match[0].length) });
      }
    }
  }
  return { fails, warns };
}

/** External links must be one of the third-party sources named in src/data/site.ts. */
export function lintLinks(source, allowed) {
  const problems = [];
  for (const [, href] of source.matchAll(/<a\b[^>]*\shref="([^"]*)"/g)) {
    if (/^(?:https?:|mailto:|tel:|\/\/)/i.test(href) && !allowed.has(href)) problems.push(href);
  }
  return problems;
}

/* ---------------- CLI ---------------- */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function pagesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => (entry.isDirectory() ? pagesIn(path.join(directory, entry.name)) : [path.join(directory, entry.name)])));
  return nested.flat().filter(file => file.endsWith('.html'));
}

async function main() {
  const dist = path.join(root, 'dist');
  const files = (await pagesIn(dist).catch(() => {
    console.error('dist/ does not exist. Run `astro build` first.');
    process.exit(1);
  })).sort();

  const siteSource = await readFile(path.join(root, 'src/data/site.ts'), 'utf8');
  const capabilitiesSource = (await readFile(path.join(root, 'src/data/capabilities.ts'), 'utf8')).split('export interface NotYet')[0];
  const allowedLinks = new Set([...siteSource.matchAll(/href:\s*'(https:\/\/[^']+)'/g)].map(([, href]) => href));
  const titles = new Map([...capabilitiesSource.matchAll(/id:\s*'([^']+)',\s*title:\s*'((?:[^'\\]|\\.)*)',[\s\S]*?status:\s*'(built|in-development|planned)'/g)].map(([, id, title, status]) => [id, { title: title.replace(/\\'/g, "'"), status }]));

  const failures = [];
  const warnings = [];
  const claims = [];
  const figures = [];

  for (const file of files) {
    const rel = `/${path.relative(dist, file).split(path.sep).join('/')}`;
    const source = await readFile(file, 'utf8');
    const title = source.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '';
    const description = attribute(source.match(/<meta\b[^>]*\sname="description"[^>]*>/)?.[0] ?? '', 'content') ?? '';

    // Third-party figures are quoted with their source and year, and are exempt from the rules.
    const body = withoutElements(source, 'data-allow-figures');
    const text = `${title} ${description} ${textOf(body)}`;
    const { fails, warns } = lintText(text);
    for (const finding of fails) failures.push(`${rel}: ${finding.why} [${finding.id}] “…${finding.excerpt}…”`);
    for (const finding of warns) warnings.push(`${rel}: ${finding.why} [${finding.id}] “…${finding.excerpt}…”`);
    for (const href of lintLinks(source, allowedLinks)) failures.push(`${rel}: external link that is not a named source: ${href}`);

    for (const [, stat] of source.matchAll(/data-allow-figures[^>]*data-source="([^"]+)"/g)) figures.push({ page: rel, stat });
    const seen = new Set();
    for (const [chip] of source.matchAll(/<span\b[^>]*\sdata-status="[^"]+"[^>]*>/g)) {
      const id = attribute(chip, 'data-capability');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      claims.push({ page: rel, id, title: titles.get(id)?.title ?? id, status: attribute(chip, 'data-status') });
    }
  }

  if (process.argv.includes('--report')) {
    const label = { built: 'Built · prototype', 'in-development': 'In development', planned: 'Planned' };
    console.log('| Page | Claim | Status |\n|---|---|---|');
    for (const claim of claims) console.log(`| ${claim.page} | ${claim.title} | ${label[claim.status] ?? claim.status} |`);
    console.log(`\nThird-party figures (exempt, sourced): ${figures.map(item => `${item.stat} on ${item.page}`).join(', ') || 'none'}`);
    return;
  }

  if (warnings.length) console.warn(`Claims lint warnings (${warnings.length}):\n${warnings.map(message => `  ! ${message}`).join('\n')}\n`);
  if (failures.length) {
    console.error(`Claims lint failed (${failures.length}):\n${failures.map(message => `  ✗ ${message}`).join('\n')}\n`);
    process.exit(1);
  }
  console.log(`✓ claims lint: ${files.length} pages, ${claims.length} status-labelled claims, ${figures.length} sourced third-party figures, ${warnings.length} warnings.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
