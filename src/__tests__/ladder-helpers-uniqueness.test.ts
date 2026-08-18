// Cross-cutting helper uniqueness contract (Phase 4 Task 1, Binding Decision 4).
//
// The three duplicated helpers — EMBODIED_TIER, statValue, personEffectiveMin —
// live in EXACTLY ONE file each (their shared module). Every other file must
// reach them through an import. The contract is enforced by reading every
// TypeScript source file under `src/` and counting definition sites, so a
// future copy-paste regression is caught at test time rather than at review.
//
// Files excluded from the scan: anything under `__tests__/` (the contract is
// enforced BY them) and `node_modules` (third party). JSON5 and JSON files
// are also excluded — the helpers live in TypeScript.

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const REPO_ROOT = join(__dirname, '..', '..');
const SRC_ROOT = join(REPO_ROOT, 'src');

interface DefinitionSite {
  readonly file: string;
  readonly line: number;
}

/**
 * Walk a directory recursively and yield every `.ts` file path. Symlinks and
 * `__tests__` directories are skipped so the contract enforces itself.
 */
function walkTs(dir: string): readonly string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      out.push(...walkTs(full));
      continue;
    }
    if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Definition lines for a name: `const X =`, `function X(`, `export const X =`,
 * `export function X(`. NOT import/export-from — those move, not duplicate.
 */
function definitionSites(name: string, files: readonly string[]): readonly DefinitionSite[] {
  const re = new RegExp(`^\\s*(?:export\\s+)?(?:const|let|var|function)\\s+${name}\\b`);
  const sites: DefinitionSite[] = [];
  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      // Skip import-from lines, even if they look similar (no leading const).
      if (/^\s*import\b/.test(line)) continue;
      // Type-only `interface`/`type` definitions don't count for value uniqueness.
      if (re.test(line)) {
        sites.push({ file: relative(REPO_ROOT, file), line: i + 1 });
      }
    }
  }
  return sites;
}

const FILES = walkTs(SRC_ROOT);

const CASES: readonly { readonly name: string; readonly expectedPath: string }[] = [
  {
    name: 'EMBODIED_TIER',
    expectedPath: 'src/engine/ladder-const.ts',
  },
  {
    name: 'statValue',
    expectedPath: 'src/ui/hooks/session-selectors.ts',
  },
  {
    name: 'personEffectiveMin',
    expectedPath: 'src/ui/hooks/session-selectors.ts',
  },
];

describe('ladder helpers (Phase 4 Task 1 uniqueness contract)', () => {
  for (const { name, expectedPath } of CASES) {
    it(`${name} has exactly ONE definition site (in ${expectedPath})`, () => {
      const sites = definitionSites(name, FILES);
      if (sites.length !== 1) {
        throw new Error(
          `expected exactly one definition of ${name}; found ${sites.length}: ` +
            sites.map((s) => `${s.file}:${s.line}`).join(', '),
        );
      }
      // Compare normalized forward-slash paths so this works on Linux too.
      expect(sites[0]?.file.replaceAll('\\', '/')).toBe(expectedPath);
    });
  }
});
