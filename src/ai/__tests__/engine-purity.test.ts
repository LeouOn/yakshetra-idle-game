// The engine never imports src/ai and never reads process.env (SPEC §16.2,
// AGENTS engine purity). Scanned as text so an import cycle or env read
// fails the gate even when types would compile.

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ENGINE_ROOT = join(__dirname, '..', '..', 'engine');

function walkTs(dir: string): readonly string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walkTs(full));
      continue;
    }
    if (entry.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

describe('engine purity vs the ai layer', () => {
  it('no engine file imports src/ai or reads process.env', () => {
    const offenders: string[] = [];
    for (const file of walkTs(ENGINE_ROOT)) {
      const text = readFileSync(file, 'utf8');
      if (/from\s+['"][^'"]*\/ai\//.test(text) || /from\s+['"]@\/ai\//.test(text)) {
        offenders.push(`${file}: imports src/ai`);
      }
      if (/process\.env/.test(text)) {
        offenders.push(`${file}: reads process.env`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
