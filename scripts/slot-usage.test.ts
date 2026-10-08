import { readFileSync, writeFileSync } from 'node:fs';
// Regenerates the SLOT_USAGE review list in src/engine/__tests__/card-copy.test.ts.
//
// WHAT THIS OVERWRITES
//   the `const SLOT_USAGE` array inside that test file, and nothing else in it.
//   The block is located by declaration and closed by a matched bracket, so an
//   entry containing `];` cannot truncate the rewrite.
//
// SLOT_USAGE is the human-review surface for slot frames. There is deliberately
// no mechanical grammar checker — a checker cannot tell "in the sash {{hour}}"
// (fine) from "said nothing {{count}}" (broken), because the difference is the
// preposition's argument, not the neighbouring words. So instead the finite set
// of authored slot usages is pinned here, every entry has been read in context
// by a person, and adding a new one fails the suite until someone reads it.
//
// This file prints the list. It is inert unless asked, so `pnpm test` never
// rewrites a test's expectations behind your back.
//
// Run: YAKSHETRA_WRITE_SLOT_USAGE=1 \
//       env -u ZAI_API_KEY -u MINIMAX_API_KEY -u YAK_FILLER_PROVIDER \
//       pnpm exec vitest run --config scripts/report.vitest.config.ts

import { describe, it } from 'vitest';

import { CATALOG } from '../src/engine/manifest-catalog';

function matchBracket(text: string, i: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let j = i; j < text.length; j += 1) {
    const ch = text[j];
    if (quote !== null) {
      if (ch === '\\') {
        j += 1;
        continue;
      }
      if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '[') {
      depth += 1;
    } else if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        return j;
      }
    }
  }
  throw new Error('unbalanced brackets in SLOT_USAGE');
}

describe('SLOT_USAGE review list', () => {
  it('prints the current list when explicitly asked', () => {
    if (process.env.YAKSHETRA_WRITE_SLOT_USAGE !== '1') {
      return;
    }
    // Deliberately the exact shape the test builds, so the printed list can be
    // pasted in verbatim: one line per (row, slot, 22 characters of frame
    // before the slot). The trailing context is the part a reviewer needs — it
    // is what tells "in the sash {{hour}}" (fine) from "said nothing {{count}}"
    // (broken), and it is invisible in the slot name itself.
    const seen: string[] = [];
    for (const rows of Object.values(CATALOG)) {
      for (const row of rows) {
        for (const t of row.templates ?? []) {
          for (const slot of ['{{hour}}', '{{count}}', '{{tie}}'] as const) {
            const idx = t.detail.indexOf(slot);
            if (idx < 0) {
              continue;
            }
            const before = t.detail.slice(0, idx);
            seen.push(`${row.name} | ${slot} | ...${before.slice(-22)}`);
          }
        }
      }
    }
    for (const line of seen) {
      process.stdout.write(`  ${line}\n`);
    }
    process.stdout.write(`\n    // ${seen.length} entries\n`);

    if (process.env.YAKSHETRA_WRITE_SLOT_USAGE !== '1') {
      return;
    }
    // Rewrite the SLOT_USAGE block in place rather than leaving the reviewer to
    // transcribe 48 lines. The block is located by its declaration and its
    // closing bracket, matched, so an entry containing `];` cannot truncate it.
    const target = 'src/engine/__tests__/card-copy.test.ts';
    const src = readFileSync(target, 'utf8');
    const decl = 'const SLOT_USAGE: readonly string[] = [';
    const open = src.indexOf(decl);
    if (open < 0) {
      throw new Error(`no SLOT_USAGE declaration in ${target}`);
    }
    // The `[` of `readonly string[]` in the type annotation comes first, so
    // anchor on the initialiser: the `= [` after the declaration.
    const eq = src.indexOf('= [', open);
    if (eq < 0) {
      throw new Error(`SLOT_USAGE has no initialiser in ${target}`);
    }
    const bodyStart = eq + 2;
    const bodyEnd = matchBracket(src, bodyStart);
    const body = seen.map((l) => `  ${JSON.stringify(l)},`).join('\n');
    const next =
      src.slice(0, bodyStart + 1) +
      `\n    // ${seen.length} entries, each read by a human. Regenerate with:\n` +
      `    //   YAKSHETRA_WRITE_SLOT_USAGE=1 pnpm exec vitest run --config scripts/report.vitest.config.ts\n` +
      `${body}\n  ` +
      src.slice(bodyEnd);
    writeFileSync(target, next);
    process.stdout.write(`wrote ${seen.length} entries to ${target}\n`);
  });
});
