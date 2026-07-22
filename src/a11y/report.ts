/**
 * Renders the accessibility audit markdown report for task 29.
 *
 * Pure function: takes the per-route audit results and a header context,
 * returns the report text. The test writes the result to
 * `.omo/evidence/task-29-a11y.md`.
 */
import type { AxeViolation, Impact, ManualCheckResult } from './html-audit';

export interface RouteAudit {
  readonly route: string;
  readonly file: string;
  readonly empty: boolean;
  readonly axe: {
    readonly violations: readonly AxeViolation[];
  };
  readonly manual: ManualCheckResult;
}

export interface ReportContext {
  readonly isoDate: string;
  readonly axeVersion: string;
  readonly jsdomVersion: string;
  readonly buildDir: string;
  readonly command: string;
}

function countByImpact(violations: readonly AxeViolation[]): Record<Impact, number> {
  const counts: Record<Impact, number> = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  for (const v of violations) {
    if (v.impact) counts[v.impact] += 1;
  }
  return counts;
}

/** PASS iff 0 critical and 0 serious across all non-empty routes. */
export function overallVerdict(routes: readonly RouteAudit[]): 'PASS' | 'FAIL' {
  for (const r of routes) {
    if (r.empty) continue;
    const c = countByImpact(r.axe.violations);
    if (c.critical > 0 || c.serious > 0) return 'FAIL';
  }
  return 'PASS';
}

function uniq<T>(xs: readonly T[]): T[] {
  return Array.from(new Set(xs));
}

/** Render the full markdown report. */
export function renderReport(routes: readonly RouteAudit[], ctx: ReportContext): string {
  const lines: string[] = [];
  const L = (s = ''): void => {
    lines.push(s);
  };

  L('# Accessibility Audit — Task 29');
  L();
  L(`**Date:** ${ctx.isoDate}`);
  L(
    `**Tool:** axe-core ${ctx.axeVersion} via jsdom ${ctx.jsdomVersion} (static SSR HTML, pre-hydration)`,
  );
  L(`**Build:** \`${ctx.buildDir}\` from \`${ctx.command}\` (todo 11)`);
  L(
    '**Standard:** WCAG 2.2 AA + axe-core default tag set (wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best practice)',
  );
  L(`**Verdict:** **${overallVerdict(routes)}**`);
  L();

  L('## Method');
  L();
  L(
    "- Each route's exported HTML file is loaded into jsdom and audited with axe-core (node API, `axe.run(documentElement)`).",
  );
  L(
    '- jsdom performs **no layout**, so axe rules that need rendered geometry (`target-size`) are supplemented by a manual touch-target heuristic: box size is estimated from cascaded `padding`/`font-size`/`height`/`min-height` values that jsdom *does* resolve from the RNW atomic stylesheet. The WCAG 2.5.5 / 2.5.8 minimum is **44 × 44 CSS px**.',
  );
  L(
    '- Structural checks (lang, title, `<h1>` presence, heading order, `<img>` alt, accessible names, landmarks) run over the same DOM.',
  );
  L(
    '- This is a **read-only** audit; no `app/` or `src/` source was modified. Findings are documented for follow-up.',
  );
  L();

  L('## Limitations');
  L();
  L(
    '- Only the server-rendered HTML **shell** is audited. Most routes currently render placeholder copy ("Coming soon — todo X"); real interactive content (modals, choice lists, resource counters) lands in todos 12–15, 28 and must be **re-audited** then.',
  );
  L(
    '- `color-contrast` runs in jsdom but only against colors expressible in the static cascade; post-hydration theming may change results.',
  );
  L(
    '- **VoiceOver / TalkBack navigation**, **reduced-motion**, and **live-region** behavior are runtime concerns not covered by a static HTML audit. They are listed as a manual checklist below (to be executed once real content exists).',
  );
  L();

  L('## Routes audited');
  L();
  L('| Route | File | Empty? | Critical | Serious | Moderate | Minor |');
  L('|---|---|---|---|---|---|---|');
  for (const r of routes) {
    const c = countByImpact(r.axe.violations);
    L(
      `| ${r.route} | ${r.file} | ${r.empty ? 'yes' : 'no'} | ${c.critical} | ${c.serious} | ${c.moderate} | ${c.minor} |`,
    );
  }
  L();

  L('## Per-route findings');
  L();
  for (const r of routes) {
    L(`### ${r.route} — \`${r.file}\``);
    L();
    if (r.empty) {
      L(
        '- **Empty file (0 bytes).** Dynamic route with no static fallback; nothing to audit. Re-audit once the route renders server content.',
      );
      L();
      continue;
    }
    const c = countByImpact(r.axe.violations);
    L(
      `**axe violations:** ${r.axe.violations.length} total — ${c.critical} critical / ${c.serious} serious / ${c.moderate} moderate / ${c.minor} minor.`,
    );
    L();
    if (r.axe.violations.length > 0) {
      L('| Rule (impact) | Help | Occurrences |');
      L('|---|---|---|');
      for (const v of r.axe.violations) {
        const occ = v.nodes.length;
        L(`| \`${v.id}\` (${v.impact ?? 'n/a'}) | ${v.help} | ${occ} |`);
      }
      L();
      L('<details><summary>Violation detail (help URLs + node samples)</summary>');
      L();
      for (const v of r.axe.violations) {
        L(`- **${v.id}** — ${v.help} (${v.impact ?? 'n/a'})`);
        L(`  - ${v.helpUrl}`);
        const sample = v.nodes[0];
        if (sample) {
          L(`  - sample: \`${sample.html.replace(/\s+/g, ' ').slice(0, 140)}\``);
        }
      }
      L();
      L('</details>');
      L();
    } else {
      L('_No axe violations._');
      L();
    }

    L('**Manual checks:**');
    L(`- \`<html lang>\`: ${r.manual.htmlLang ?? '*(missing)*'}`);
    L(`- \`<title>\`: ${r.manual.hasTitle ? `\`${r.manual.titleText ?? ''}\`` : '*(missing)*'}`);
    L(`- \`<h1>\` count: ${r.manual.h1Count}`);
    L(
      `- Heading-order issues: ${r.manual.headingOrderIssues.length === 0 ? 'none' : r.manual.headingOrderIssues.join(', ')}`,
    );
    L(`- Images without \`alt\`: ${r.manual.imagesWithoutAlt.length}`);
    L(
      `- Interactive elements without accessible name: ${r.manual.unnamedInteractive.length}${r.manual.unnamedInteractive.length > 0 ? ` — \`${r.manual.unnamedInteractive.join('`, `')}\`` : ''}`,
    );
    L(
      `- Landmark regions: ${r.manual.landmarkCount}${r.manual.landmarkCount > 0 ? ` (${r.manual.landmarkRoles.join(', ')})` : ''}`,
    );
    L(`- Touch-target issues (< ${44}px): ${r.manual.touchTargetIssues.length}`);
    if (r.manual.touchTargetIssues.length > 0) {
      for (const t of r.manual.touchTargetIssues) {
        L(
          `  - \`${t.selector}\` ≈ ${t.estimatedHeightPx}×${t.estimatedWidthPx}px${t.ariaLabel ? ` (aria-label: "${t.ariaLabel}")` : ''}${t.text ? ` text: "${t.text}"` : ''}`,
        );
      }
    }
    L();
  }

  // Summary of unique failing rules across all routes.
  const allViolations = routes.flatMap((r) => (r.empty ? [] : r.axe.violations));
  const uniqueRules = uniq(allViolations.map((v) => v.id)).sort();
  L('## Summary');
  L();
  const totals = countByImpact(allViolations);
  L(
    `**Total axe violations across non-empty routes:** ${allViolations.length} — ${totals.critical} critical / ${totals.serious} serious / ${totals.moderate} moderate / ${totals.minor} minor.`,
  );
  L();
  L(
    `**Unique failing rule IDs:** ${uniqueRules.length === 0 ? 'none' : uniqueRules.map((id) => `\`${id}\``).join(', ')}`,
  );
  L();

  L('## Specific issues to fix (NOT fixed in this task — audit is read-only)');
  L();
  const RULE_FIXES: Record<string, string> = {
    'document-title':
      'Each exported HTML contains a **duplicate empty `<title data-rh="true"></title>` before** the real ' +
      '`<title>Yakshetra</title>`. The `document.title` IDL getter honours the *first* `<title>`, so the ' +
      'effective document title resolves to **empty** (screen readers / browser tabs see no title in the SSR ' +
      'shell). Fix: ensure expo-router / React Helmet does not emit an empty leading `<title>` — set the title ' +
      'via `<Head><title>…</title></Head>` so a single populated element is emitted, or reorder so the populated ' +
      'title is first. This is an export/template concern, not a per-screen content fix.',
    region:
      "Wrap each screen's content in a landmark (`<main>`). React Native Web renders `<View>` as a `<div>` with " +
      'no role, so nothing on the page is a landmark and axe flags all content as outside any region. Set ' +
      '`accessibilityRole="main"` (or render an HTML `<main>`) on the outermost screen container so the `region` ' +
      'violation resolves and screen-reader landmark navigation works.',
  };
  const GENERIC_FIX =
    'add the missing semantic the rule names (see help URL above for the exact criterion).';

  const issueList: string[] = [];
  const ruleToHelp = new Map(allViolations.map((v) => [v.id, v.help]));
  for (const id of uniqueRules) {
    const occ = allViolations.filter((v) => v.id === id).reduce((n, v) => n + v.nodes.length, 0);
    const impact = allViolations.find((v) => v.id === id)?.impact ?? null;
    const fix = RULE_FIXES[id] ?? GENERIC_FIX;
    issueList.push(
      `- \`${id}\` (${impact ?? 'n/a'}) — ${ruleToHelp.get(id) ?? ''} (${occ} occurrence${occ === 1 ? '' : 's'}). **Fix:** ${fix}`,
    );
  }
  const manualGaps: string[] = [];
  const anyMissingH1 = routes.some((r) => !r.empty && r.manual.h1Count === 0);
  const anyMissingLandmark = routes.some((r) => !r.empty && r.manual.landmarkCount === 0);
  if (anyMissingH1)
    manualGaps.push(
      'No `<h1>` on any route — React Native Web renders text as `<div>`, so there are no semantic headings. Add an `accessibilityRole="header"` (or a top-level `<h1>`) per screen for screen-reader heading navigation.',
    );
  if (anyMissingLandmark)
    manualGaps.push(
      'No landmark regions (`<main>`/`<nav>`/etc.) — RNW `<View>` becomes `<div>` with no role. Wrap screen content in a `main` landmark (e.g. `accessibilityRole="main"`) so the `region` violation resolves.',
    );
  if (manualGaps.length === 0 && issueList.length === 0) {
    L('- None. Audit clean.');
  } else {
    for (const i of issueList) L(i);
    for (const g of manualGaps) L(`- ${g}`);
  }
  L();

  L('## Manual checklist (runtime — not covered by static audit)');
  L();
  L('To be executed after todos 12, 13, 14, 15, and 28 render real interactive content:');
  L();
  L('### VoiceOver (iOS) / TalkBack (Android)');
  L(
    '- [ ] Navigate `/life/start` → role selection → turn → action → reflect → continue; verify logical focus order.',
  );
  L('- [ ] Every interactive element announces an accessible name (no "button", "button" alone).');
  L('- [ ] Resource counters announce value changes via `accessibilityLiveRegion="polite"`.');
  L('- [ ] Per-event content-warning indicators have a spoken label, not just color/icon.');
  L();
  L('### Reduced motion');
  L(
    '- [ ] Web: set `prefers-reduced-motion: reduce`; ReflectCard uses instant replace (no slide).',
  );
  L(
    '- [ ] Native: `useAccessibilityInfo().reduceMotion === true` disables `Animated` transitions.',
  );
  L('- [ ] No autoplaying animations (plan constraint: "NO autoplay animations").');
  L();
  L('### Contrast');
  L(
    '- [ ] Spot-check all text against its rendered background ≥ 4.5:1 (normal text) / 3:1 (large text).',
  );
  L('- [ ] No color-only signal: every color-coded state has an icon or text label.');
  L();
  L('### Touch targets');
  L(
    '- [ ] Every interactive element measures ≥ 44 × 44 CSS px (verify via DevTools / `onLayout`).',
  );
  L();
  L('---');
  L('_Generated by `src/a11y/audit.test.ts`._');

  return lines.join('\n');
}
