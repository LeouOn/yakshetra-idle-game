/**
 * Task 29 — Accessibility audit.
 *
 * Loads each route's static HTML from `dist/`, runs axe-core (via jsdom) plus
 * a set of manual structural checks, and writes a markdown report to
 * `.omo/evidence/task-29-a11y.md`.
 *
 * This is a **read-only** audit. The test asserts only that the audit
 * completed for every route (smoke) and that the report was written — it does
 * NOT fail on found violations, because this todo documents current state for
 * follow-up rather than gating on a clean pass (most routes are placeholders).
 */
import { describe, it, expect } from 'vitest';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { JSDOM } from 'jsdom';
import axe, { type AxeResults } from 'axe-core';

import { runManualChecks, type AxeViolation, type Impact } from './html-audit';
import { renderReport, type RouteAudit, type ReportContext } from './report';

const require = createRequire(import.meta.url);
const axePkg = require('axe-core/package.json') as { version: string };
const jsdomPkg = require('jsdom/package.json') as { version: string };

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..', '..');
const distDir = path.join(projectRoot, 'dist');
const evidenceDir = path.join(projectRoot, '.omo', 'evidence');
const reportPath = path.join(evidenceDir, 'task-29-a11y.md');

interface RouteSpec {
  readonly route: string;
  readonly file: string;
}

const ROUTES: readonly RouteSpec[] = [
  { route: '/', file: 'index.html' },
  { route: '/life/start', file: path.join('life', 'start.html') },
  { route: '/life/[lifeId]', file: path.join('life', '[lifeId].html') },
  { route: '/bardo', file: 'bardo.html' },
  { route: '/chain-complete', file: 'chain-complete.html' },
  { route: '/settings', file: 'settings.html' },
  { route: '/about', file: 'about.html' },
];

/**
 * Run axe + manual checks against one route's HTML. Throws if axe itself
 * errors (audit integrity failure) — but never throws on found violations.
 */
async function auditRoute(spec: RouteSpec): Promise<RouteAudit> {
  const fullPath = path.join(distDir, spec.file);
  const raw = await readFile(fullPath, 'utf8');
  const empty = raw.trim().length === 0;
  // Normalize to forward slashes so the report is identical across Windows/POSIX.
  const displayFile = spec.file.replace(/\\/g, '/');

  if (empty) {
    return {
      route: spec.route,
      file: displayFile,
      empty: true,
      axe: { violations: [] },
      manual: {
        htmlLang: null,
        hasTitle: false,
        titleText: null,
        h1Count: 0,
        headingOrderIssues: [],
        imagesWithoutAlt: [],
        unnamedInteractive: [],
        touchTargetIssues: [],
        landmarkCount: 0,
        landmarkRoles: [],
      },
    };
  }

  const dom = new JSDOM(raw, { url: `http://localhost${spec.route === '/' ? '/' : spec.route}` });
  const document = dom.window.document;

  // axe-core node API: pass the documentElement. Restrict result types so
  // axe doesn't waste time building `passes`/`incomplete` payloads we drop.
  const results = (await axe.run(document.documentElement, {
    resultTypes: ['violations'],
    // jsdom has no layout → rules that strictly require geometry are noisy;
    // axe auto-disables most of them, but we are explicit for determinism.
  })) as AxeResults;

  const violations = (results.violations ?? []).map((v): AxeViolation => ({
    id: v.id,
    impact: (v.impact ?? null) as Impact | null,
    help: v.help,
    description: v.description,
    helpUrl: v.helpUrl,
    tags: v.tags,
    nodes: (v.nodes ?? []).map((n) => ({
      html: n.html,
      target: (n.target ?? []) as readonly string[],
    })),
  }));

  const manual = runManualChecks(dom.window, document);

  return { route: spec.route, file: displayFile, empty: false, axe: { violations }, manual };
}

describe('accessibility audit (task 29)', () => {
  it('runs axe + manual checks on every dist/ route and writes the report', async () => {
    // Integrity gate: the build must exist. Fails loudly if todo 11 regressed.
    const distStat = await stat(distDir);
    expect(distStat.isDirectory()).toBe(true);

    const audits: RouteAudit[] = [];
    for (const spec of ROUTES) {
      // Each route audited independently; a throw here means the audit tooling
      // itself is broken, which is a real failure we want to surface.
      audits.push(await auditRoute(spec));
    }

    const ctx: ReportContext = {
      isoDate: new Date().toISOString(),
      axeVersion: axePkg.version,
      jsdomVersion: jsdomPkg.version,
      buildDir: 'dist/',
      command: 'npx expo export --platform web',
    };

    const report = renderReport(audits, ctx);
    await writeFile(reportPath, report, 'utf8');

    // Smoke assertions — the audit ran for ALL routes and produced a report.
    expect(audits).toHaveLength(ROUTES.length);
    expect(report.length).toBeGreaterThan(500);
    expect(report).toContain('# Accessibility Audit — Task 29');
    expect(report).toContain('## Per-route findings');

    // Confirm every route appears in the report (guards against a silent
    // render path skipping an entry).
    for (const spec of ROUTES) {
      expect(report).toContain(spec.file.replace(/\\/g, '/'));
    }

     
    console.log(
      `[a11y] report written to ${path.relative(projectRoot, reportPath)} ` +
        `(${(report.length / 1024).toFixed(1)} KiB)`,
    );
  }, 60_000);
});
