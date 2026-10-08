// Regenerates the five core kinds inside src/content/progression/base/catalogs.json5
// from the engine catalog in src/engine/manifest-catalog.ts.
//
// Why this exists as a script and not a one-liner: the shipped JSON5 is a
// verbatim mirror of the engine catalog, and
// src/content/progression/__tests__/catalogs.test.ts asserts it entry for
// entry. Hand-editing the two in step works right up until a row's `tags: [...]`
// wraps onto a second line, at which point every text anchor is wrong and the
// edit silently drops fields. It has happened twice.
//
// The file also carries a lot of prose comments — the header, the per-table
// notes, the visitor-table explanation — so re-serialising the parsed JSON is
// NOT an option: it would delete the documentation. Instead this replaces only
// the text of the `entries: [...]` array for each core kind, leaving every
// comment and all fourteen non-core kinds untouched.
//
// Inert unless asked, so `pnpm test` never rewrites a tracked content file.
//
// Run: YAKSHETRA_WRITE_MIRROR=1 \
//       env -u ZAI_API_KEY -u MINIMAX_API_KEY -u YAK_FILLER_PROVIDER \
//       pnpm exec vitest run --config scripts/report.vitest.config.ts

import { readFileSync, writeFileSync } from 'node:fs';

import { describe, it } from 'vitest';

import { CATALOG } from '../src/engine/manifest-catalog';
import type { CatalogEntry } from '../src/engine/table-catalog';

const PATH = 'src/content/progression/base/catalogs.json5';
const CORE = ['thing', 'outcome', 'change', 'person', 'place'] as const;

/** A JSON5 string literal, single-quoted when that is safe. */
function lit(value: string): string {
  if (!value.includes("'") && !value.includes('\\') && !value.includes('\n')) {
    return `'${value}'`;
  }
  return JSON.stringify(value);
}

function renderEntry(row: CatalogEntry, indent = '        '): string {
  const out: string[] = [`${indent}{`];
  out.push(`${indent}  name: ${lit(row.name)},`);
  out.push(`${indent}  one_liner:\n${indent}    ${lit(row.one_liner)},`);
  out.push(`${indent}  subject: ${lit(row.subject)},`);
  out.push(`${indent}  detail:\n${indent}    ${lit(row.detail)},`);
  // `era` matters here as much as the qualifiers: the mirror is what a fresh
  // install loads, and a row the engine has tagged Tang but the mirror has not
  // would be offered to a Garden life.
  for (const key of ['long_fire', 'rare', 'era'] as const) {
    const v = row[key];
    if (v !== undefined) {
      out.push(`${indent}  ${key}:\n${indent}    ${lit(v)},`);
    }
  }
  out.push(`${indent}  tags: [${row.tags.map(lit).join(', ')}],`);
  const tpls = row.templates;
  if (tpls !== undefined && tpls.length > 0) {
    out.push(`${indent}  templates: [`);
    for (const t of tpls) {
      out.push(`${indent}    {`);
      for (const key of ['name', 'one_liner', 'subject'] as const) {
        const v = t[key];
        if (v !== undefined) {
          out.push(`${indent}      ${key}:\n${indent}        ${lit(v)},`);
        }
      }
      out.push(`${indent}      detail:\n${indent}        ${lit(t.detail)},`);
      if (t.tags !== undefined) {
        out.push(`${indent}      tags: [${t.tags.map(lit).join(', ')}],`);
      }
      for (const key of ['gate', 'flourish', 'era', 'long_fire', 'rare'] as const) {
        const v = t[key];
        if (v !== undefined) {
          out.push(`${indent}      ${key}: ${lit(v)},`);
        }
      }
      out.push(`${indent}    },`);
    }
    out.push(`${indent}  ],`);
  }
  out.push(`${indent}},`);
  return out.join('\n');
}

/**
 * Index of the `]` that closes the bracket at `open`, skipping over strings and
 * comments. A naive `indexOf(']')` lands on the first tag in the first row.
 */
function matchBracket(text: string, open: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let i = open; i < text.length; i += 1) {
    const ch = text[i];
    if (quote !== null) {
      if (ch === '\\') {
        i += 1;
        continue;
      }
      if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      continue;
    }
    if (ch === '/' && text[i + 1] === '/') {
      const nl = text.indexOf('\n', i);
      i = nl === -1 ? text.length : nl;
      continue;
    }
    if (ch === '[') {
      depth += 1;
    } else if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }
  throw new Error('unbalanced brackets in catalogs.json5');
}

describe('catalogs.json5 mirror', () => {
  it('rewrites the core kinds when explicitly asked', () => {
    if (process.env.YAKSHETRA_WRITE_MIRROR !== '1') {
      return;
    }
    const original = readFileSync(PATH, 'utf8');
    let text = original;

    for (const kind of CORE) {
      const rows = (CATALOG as Record<string, readonly CatalogEntry[]>)[kind];
      if (rows === undefined) {
        throw new Error(`no engine rows for kind ${kind}`);
      }
      // Locate this kind's table, then only its `entries: [...]` array.
      const kindAt = text.indexOf(`kind: '${kind}',`);
      if (kindAt === -1) {
        throw new Error(`no table for kind ${kind} in ${PATH}`);
      }
      const entriesAt = text.indexOf('entries: [', kindAt);
      if (entriesAt === -1) {
        throw new Error(`no entries array for kind ${kind}`);
      }
      const open = text.indexOf('[', entriesAt);
      const close = matchBracket(text, open);
      const body = rows.map((r) => renderEntry(r)).join('\n');
      text = `${text.slice(0, open + 1)}\n${body}\n      ${text.slice(close)}`;
    }

    if (text !== original) {
      writeFileSync(PATH, text);
      process.stdout.write(`\n  rewrote ${CORE.length} core kinds in ${PATH}\n`);
    } else {
      process.stdout.write(`\n  ${PATH} already in sync\n`);
    }
  });
});
