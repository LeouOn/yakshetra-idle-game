// Maestro flow text guard.
//
// The Maestro flows cannot run in this rig (no Maestro CLI, no simulators —
// AGENTS.md and the machine forbid runs), so their text assertions drift
// silently: a renamed button leaves a flow tapping a string nothing shows.
// check-g's review of c1 found 13 such assertions ("I understand" after the
// disclaimer button became "Got it"; "New chain" after the home button became
// "Go work a day" — a capital-N regex that never matched). This test re-runs
// the same scan on every suite so drift fails the build instead.
//
// House semantics (deliberately conservative): a pattern in a flow must be a
// full-string regex match (^pattern$) against SOME string the app can show —
// an en.json value, or a formatSid template with its {placeholders}
// substituted by sample values. Real Maestro matches text as an unanchored
// regex, so anything that passes here is also findable there; patterns that
// only survive unanchored matching (bare fragments) are flagged as drift on
// purpose — under real Maestro they can pass by matching a long label the
// flow never meant, which is exactly the silent rot this guard exists for.
//
// No YAML parser is directly importable here: `yaml` and `js-yaml` exist only
// as transitive pnpm deps (not in node_modules top level, and adding a
// dependency for a lint-style guard is not worth it). The minimal extractor
// below covers exactly the text-bearing forms these flows use, and its own
// describe block pins its behavior.

import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** Root of the repo (this file lives in src/i18n/__tests__/). */
const ROOT = new URL('../../..', import.meta.url);
const FLOWS_DIR = new URL('.maestro/flows/', ROOT);

/** One text pattern found in a flow. */
interface FlowText {
  readonly file: string;
  readonly line: number;
  /** Where the pattern came from: the command key, or `when.visible`. */
  readonly key: string;
  readonly pattern: string;
}

/** YAML scalar (double-quoted, single-quoted, or plain) → its string value. */
export function yamlScalar(raw: string): string {
  const t = raw.trim();
  if (t.startsWith('"') && t.endsWith('"') && t.length >= 2) {
    return t.slice(1, -1).replace(/\\"/g, '"');
  }
  if (t.startsWith("'") && t.endsWith("'") && t.length >= 2) {
    return t.slice(1, -1).replace(/''/g, "'");
  }
  return t;
}

function leadingSpaces(line: string): number {
  const m = line.match(/^ */);
  return m === null ? 0 : m[0].length;
}

/**
 * Extract the text-bearing forms the Maestro flows actually use:
 *  - `- assertVisible: "text"` / `- tapOn: "text"` / `- assertNotVisible: "text"`
 *  - the same keys with the value on the next line as `text: "text"`
 *  - `visible: "text"` (a runFlow `when:` condition)
 * `id:` selectors and comments carry no player-visible text and are skipped.
 */
export function extractFlowTexts(source: string): readonly Omit<FlowText, 'file'>[] {
  const lines = source.split('\n');
  const found: Omit<FlowText, 'file'>[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line === undefined || line.trim() === '' || line.trim().startsWith('#')) {
      continue;
    }
    const command = line.match(/^\s*-\s*(assertVisible|tapOn|assertNotVisible):\s*(.*)$/);
    if (command !== null) {
      const key = command[1] ?? '';
      const rest = command[2] ?? '';
      if (rest.trim() !== '') {
        const pattern = yamlScalar(rest);
        if (pattern !== '') {
          found.push({ key, pattern, line: i + 1 });
        }
        continue;
      }
      // Value on a following, deeper-indented line: accept `text:` only.
      for (let j = i + 1; j < lines.length; j += 1) {
        const next = lines[j];
        if (next === undefined || next.trim() === '') {
          continue;
        }
        const nested = next.match(/^(\s+)text:\s*(.*)$/);
        if (nested !== null && (nested[1] ?? '').length > leadingSpaces(line)) {
          const pattern = yamlScalar(nested[2] ?? '');
          if (pattern !== '') {
            found.push({ key, pattern, line: j + 1 });
          }
        }
        break;
      }
      continue;
    }
    const whenVisible = line.match(/^\s*visible:\s*(.+)$/);
    if (whenVisible !== null) {
      const pattern = yamlScalar(whenVisible[1] ?? '');
      if (pattern !== '') {
        found.push({ key: 'when.visible', pattern, line: i + 1 });
      }
    }
  }
  return found;
}

/** Every leaf string in en.json. */
function enLeafStrings(node: unknown, out: string[] = []): string[] {
  if (typeof node === 'string') {
    out.push(node);
  } else if (node !== null && typeof node === 'object') {
    for (const value of Object.values(node)) {
      enLeafStrings(value, out);
    }
  }
  return out;
}

/** Sample values substituted for {placeholders} in formatSid templates. */
const SAMPLES = ['1', '2', '3', '12', '30', 'Aa'] as const;

/** A pattern is covered if it full-string matches a literal, or a template
 * with every {placeholder} replaced by each sample value. */
function coveredBy(pattern: string, strings: readonly string[]): boolean {
  let re: RegExp;
  try {
    re = new RegExp(`^(?:${pattern})$`);
  } catch {
    // An invalid regex can never match real text: report it as drift, not
    // as covered, so the failure names the broken pattern.
    return false;
  }
  for (const s of strings) {
    if (re.test(s)) {
      return true;
    }
    if (s.includes('{')) {
      for (const sample of SAMPLES) {
        if (re.test(s.replace(/\{[^}]+\}/g, sample))) {
          return true;
        }
      }
    }
  }
  return false;
}

describe('extractFlowTexts (minimal Maestro yaml extractor)', () => {
  it('reads inline assertVisible/tapOn/assertNotVisible scalars', () => {
    const out = extractFlowTexts('- tapOn: "Got it"\n- assertVisible: Plain\n');
    expect(out).toEqual([
      { key: 'tapOn', pattern: 'Got it', line: 1 },
      { key: 'assertVisible', pattern: 'Plain', line: 2 },
    ]);
  });

  it('reads a text: value nested under the command key', () => {
    const out = extractFlowTexts('- assertVisible:\n    text: "War and political violence"\n');
    expect(out).toEqual([{ key: 'assertVisible', pattern: 'War and political violence', line: 2 }]);
  });

  it('reads when: visible inline text but not id selectors or comments', () => {
    const src = [
      '# comment mentions tapOn: "nope"',
      '- runFlow:',
      '    when:',
      '      visible: "I understand"',
      '    commands:',
      '      - tapOn:',
      '          id: "turn-dev-skip"',
      '- assertVisible:',
      '    id: "settings-import-msg"',
    ].join('\n');
    expect(extractFlowTexts(src)).toEqual([
      { key: 'when.visible', pattern: 'I understand', line: 4 },
    ]);
  });

  it('handles single-quoted scalars and escapes', () => {
    const out = extractFlowTexts("- assertVisible: 'it''s'\n");
    expect(out).toEqual([{ key: 'assertVisible', pattern: "it's", line: 1 }]);
  });
});

describe('Maestro flow text stays true to en.json', () => {
  it('every text pattern in .maestro/flows matches a string the app can show', () => {
    const en = JSON.parse(readFileSync(new URL('../en.json', import.meta.url), 'utf8')) as unknown;
    const strings = enLeafStrings(en);
    const stale: string[] = [];
    let checked = 0;
    for (const name of readdirSync(FLOWS_DIR)
      .filter((f) => f.endsWith('.yaml'))
      .sort()) {
      const source = readFileSync(new URL(name, FLOWS_DIR), 'utf8');
      for (const { key, pattern, line } of extractFlowTexts(source)) {
        checked += 1;
        if (!coveredBy(pattern, strings)) {
          stale.push(`${name}:${line} ${key} "${pattern}"`);
        }
      }
    }
    expect(checked).toBeGreaterThan(20); // the scan found nothing at all = broken scan
    if (stale.length > 0) {
      expect.fail(
        `${stale.length} of ${checked} Maestro text assertions match no en.json string ` +
          `(full-string regex, templates widened). Fix the FLOWS, not the app strings:\n  ` +
          stale.join('\n  '),
      );
    }
  });
});
