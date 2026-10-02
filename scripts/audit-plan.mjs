#!/usr/bin/env node
// F1 Plan Compliance Audit.
// Walks the work plan, asserts every todo's evidence file exists, maps each
// must-have bullet to the todo(s) that cover it, and greps the source tree for
// forbidden tokens. Read-only. Node built-ins only. Exits 0 on PASS, 1 on FAIL.
//
// The plan itself lives in `.omo/`, which is local-only state and is never
// committed, so a fresh checkout — CI included — has no plan to walk. An absent
// plan is therefore NOT a failure: the todo/evidence/coverage halves report
// empty and the verdict rests on the must-not-have source scan, which needs no
// plan and still enforces product law. A plan that IS present and fails still
// exits 1.
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const PLAN_PATH = join(ROOT, '.omo', 'plans', 'buddhist-inspired-incremental-rpg.md');
const EVIDENCE_DIR = join(ROOT, '.omo', 'evidence');
const REPORT_PATH = join(EVIDENCE_DIR, 'F1-compliance.md');
const PLAN_PRESENT = existsSync(PLAN_PATH);
const plan = PLAN_PRESENT ? readFileSync(PLAN_PATH, 'utf8') : '';

// --- Parse todos: lines like "- [x] 16. **Title**" or "- [ ] F1. **Title**" ---
const TODO_RE = /^- \[([ x])\] (\d+|F\d+)\. \*\*(.+?)\*\*/gm;
const todos = [];
for (let m; (m = TODO_RE.exec(plan));) {
  todos.push({ id: m[2], done: m[1] === 'x', title: m[3].trim() });
}

// --- Parse must-have / must-not-have bullet lists from the Scope section ---
function bullets(header, until) {
  const start = plan.indexOf(header);
  if (start < 0) return [];
  const end = plan.indexOf(until, start);
  return plan
    .slice(start, end < 0 ? undefined : end)
    .split('\n')
    .filter((l) => l.startsWith('- '))
    .map((l) => l.slice(2).trim());
}
const mustHave = bullets('### Must have', '### Must NOT have');

// --- Evidence presence: a file task-A-B-C covers todos A, B, C (combined files) ---
const evidenceFiles = existsSync(EVIDENCE_DIR) ? readdirSync(EVIDENCE_DIR) : [];
const evidenceByTodo = new Map();
for (const f of evidenceFiles) {
  const mt = f.match(/^task-([\d-]+)/);
  if (!mt) continue;
  for (const n of mt[1].split('-').filter(Boolean).map(Number)) {
    if (Number.isInteger(n)) evidenceByTodo.set(n, (evidenceByTodo.get(n) ?? []).concat(f));
  }
}
const numericTodos = todos.filter((t) => /^\d+$/.test(t.id));
const evidenceMissing = numericTodos.filter((t) => !evidenceByTodo.has(Number(t.id)));

// --- Must-have coverage: keyword -> todos, applied to each bullet ---
const COVERAGE = [
  { kw: ['expo sdk', 'single typescript codebase', 'builds for web'], todos: [1, 11, 31] },
  { kw: ['pure deterministic', 'domain engine'], todos: [2, 6] },
  { kw: ['seeded rng', 'xoshiro', 'deterministic replay'], todos: [3, 9] },
  {
    kw: ['karmic-echo reducer', 'echo types', '4 echo types', 'cross-life karmic'],
    todos: [7, 26],
  },
  { kw: ['invariant', 'start_state', '⊥ life1'], todos: [8] },
  {
    kw: ['two complete lives', 'tang china', 'fantasy'],
    todos: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25],
  },
  { kw: ['six lenses', 'six interdependent', 'discernment'], todos: [6, 13] },
  {
    kw: ['6–8 events', '6-8 events', 'endings per life', 'choices per event'],
    todos: [17, 22, 18, 23],
  },
  { kw: ['cross-life echoes', '3 demonstrable'], todos: [26] },
  { kw: ['rule variation', 'modularity'], todos: [27] },
  {
    kw: ['roguelite pacing', 'restart instant', 'dismissible reflection', 'reflection card'],
    todos: [14, 15],
  },
  {
    kw: ['content warning', 'warning taxonomy', '9 categories', 'per-category toggle'],
    todos: [28],
  },
  { kw: ['bardo transition', 'chain complete', 'chain-complete'], todos: [15] },
  { kw: ['save/load', 'storage adapters', 'schema versioning'], todos: [10] },
  { kw: ['localization', 'stable string ids', 'sacred-term inline'], todos: [19, 24] },
  { kw: ['zod content schema', 'zod schema', 'version field per pack'], todos: [4] },
  { kw: ['prohibited-mechanics lint', '5 rules'], todos: [5] },
  {
    kw: ['advisory panel scope', 'advisory panel', 'review gates', 'decision rules'],
    todos: [0, 32],
  },
  { kw: ['positive enumeration', 'permitted imagery'], todos: [16, 21] },
  { kw: ['negative enumeration', 'prohibited names'], todos: [5] },
  {
    kw: ['front-matter disclaimer', 'in-game glossary', 'lineage notes', 'bibliography'],
    todos: [28, 19, 24],
  },
  { kw: ['wcag', 'accessibility', 'screen-reader', 'reduced-motion', '44×44'], todos: [29] },
  { kw: ['e2e', 'maestro'], todos: [30] },
  { kw: ['eas build', 'cross-platform builds'], todos: [31] },
  { kw: ['eas update'], todos: [31] },
  { kw: ['roadmap', 'future prototypes'], todos: [34] },
];
function cover(bullet) {
  const b = bullet.toLowerCase();
  const set = new Set();
  for (const e of COVERAGE) if (e.kw.some((k) => b.includes(k))) e.todos.forEach((t) => set.add(t));
  return [...set].sort((a, c) => a - c);
}
const coverage = mustHave.map((b) => ({ bullet: b, todos: cover(b) }));
const uncovered = coverage.filter((c) => c.todos.length === 0);

// --- Must-not-have grep over source tree ---
// Hard tokens (analytics/monetization/karma-score patterns) are scanned everywhere
// (comment-stripped). Named sacred figures and mantras are allowed (SPEC.md);
// they are no longer must-not-have tokens.
const SCAN_DIRS = ['src', 'app', 'src/i18n', 'src/content'].map((d) => join(ROOT, d));
const SKIP_PATH = /(__tests__|[/\\]fixtures|prohibited-names|[/\\]lint\.ts$|audit-plan\.mjs$)/i;
const HARD_TOKENS = [
  { name: 'karma.score', re: /karma\.score/gi },
  { name: 'merit.point', re: /merit\.point/gi },
  { name: 'firebase', re: /\bfirebase\b/gi },
  { name: 'crashlytics', re: /\bcrashlytics\b/gi },
  { name: 'sentry', re: /\bsentry\b/gi },
  { name: 'amplitude', re: /\bamplitude\b/gi },
  { name: 'appcenter', re: /\bappcenter\b/gi },
  { name: 'admob', re: /\badmob\b/gi },
];
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*(\/\/|#).*$/gm, '');
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}
const files = [...new Set(SCAN_DIRS.flatMap((d) => walk(d)))];
const violations = [];
const count = (text, re) => (text.match(new RegExp(re.source, re.flags)) || []).length;
for (const f of files) {
  const rel = relative(ROOT, f).split(/[\\/]/).join('/');
  if (SKIP_PATH.test(rel)) continue;
  let body;
  try {
    body = readFileSync(f, 'utf8');
  } catch {
    continue;
  }
  const stripped = stripComments(body);
  for (const { name, re } of HARD_TOKENS) {
    const c = count(stripped, re);
    if (c) violations.push({ file: rel, token: name, count: c });
  }
}

// --- Verdict ---
const completed = todos.filter((t) => t.done).length;
const verdictPass =
  evidenceMissing.length === 0 && uncovered.length === 0 && violations.length === 0;

// --- Render report ---
const rows = todos.map((t) => {
  const isF = /^F\d+$/.test(t.id);
  const ev = isF
    ? 'N/A (verification wave)'
    : (evidenceByTodo.get(Number(t.id))?.join(', ') ?? '**MISSING**');
  return `| ${t.id} | ${t.done ? 'x' : ' '} | ${t.title.replace(/\|/g, '\\|')} | ${ev} |`;
});
const covRows = coverage.map(
  (c, i) =>
    `| ${i + 1} | ${c.bullet.replace(/\|/g, '\\|')} | ${c.todos.length ? c.todos.join(', ') : '**UNCOVERED**'} |`,
);
const vioRows = violations.length
  ? violations.map((v) => `| ${v.token} | ${v.count} | ${v.file} |`)
  : ['| _(none)_ | 0 | — |'];
const missingRows = evidenceMissing.length
  ? evidenceMissing.map((t) => `- **T${t.id}**: ${t.title}`)
  : ['- _(none)_'];

const report = `# F1 Plan Compliance Audit

Generated: ${new Date().toISOString()}
Plan: \`.omo/plans/buddhist-inspired-incremental-rpg.md\` — **${PLAN_PRESENT ? 'present' : 'ABSENT (local-only state, never committed)'}**
${PLAN_PRESENT ? '' : '\n> The plan is local-only state, so this checkout has none to walk. Todo, evidence, and\n> coverage rows are empty; the must-not-have source scan below still ran and\n> still gates the verdict.\n'}
## Summary

- Total todos: **${todos.length}**
- Completed (plan \`[x]\`): **${completed}**
- Todos with evidence (T0–T34): **${numericTodos.length - evidenceMissing.length} / ${numericTodos.length}**
- Missing evidence: **${evidenceMissing.length}**
- Must-have bullets uncovered: **${uncovered.length}**
- Must-not-have violations: **${violations.length}**

**Verdict: ${verdictPass ? 'PASS' : 'FAIL'}**

## Per-todo evidence presence

| Todo | Done | Title | Evidence |
| --- | --- | --- | --- |
${rows.join('\n')}

## Must-have coverage matrix

| # | Must have | Covered by todos |
| --- | --- | --- |
${covRows.join('\n')}

## Must-not-have grep results

Scanned: src/, app/, src/i18n/, src/content/.
Excluded paths: __tests__/, fixtures/, prohibited-names.txt, lint.ts, this audit script.
Comment lines (// and #) stripped before scanning.
Hard tokens (karma.score, merit.point, firebase, crashlytics, sentry, amplitude, appcenter, admob) scanned in all remaining text.
Named sacred figures and mantras are allowed and are not scanned.

| Token | Hits | File |
| --- | --- | --- |
${vioRows.join('\n')}

## Missing evidence (violations)

${missingRows.join('\n')}

## Uncovered must-haves

${uncovered.length ? uncovered.map((c) => `- ${c.bullet}`).join('\n') : '- _(none)_'}
`;

// `.omo/evidence/` holds three files that are tracked (force-added before the
// `.omo/` ignore rule, which no longer applies to them), so a fresh clone does
// have the directory. This guard is for the states where it does NOT: `.omo/`
// absent or removed wholesale — `git clean -xdf`, a sparse checkout, or an
// evidence directory deleted. Write the report before anything else can fail on
// a missing directory.
mkdirSync(EVIDENCE_DIR, { recursive: true });
writeFileSync(REPORT_PATH, report, 'utf8');

const tag = (k, v) => console.log(`${k}: ${v}`);
console.log(`\nF1 Plan Compliance Audit`);
console.log(`========================`);
tag('Report', relative(ROOT, REPORT_PATH));
if (!PLAN_PRESENT)
  tag(
    'Plan',
    `ABSENT (${relative(ROOT, PLAN_PATH)}) — coverage half skipped, source scan still gates`,
  );
tag('Verdict', verdictPass ? 'PASS' : 'FAIL');
tag('Todos', `${todos.length}`);
tag('Completed', `${completed}`);
tag('Evidence present', `${numericTodos.length - evidenceMissing.length} / ${numericTodos.length}`);
tag(
  'Evidence missing',
  `${evidenceMissing.length} (${evidenceMissing.map((t) => 'T' + t.id).join(', ') || 'none'})`,
);
tag('Must-have uncovered', `${uncovered.length}`);
tag('Must-not violations', `${violations.length}`);
console.log('');
process.exit(verdictPass ? 0 : 1);
