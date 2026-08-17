// Play-cursor split (Binding Decision 6) — the moved import helper keeps its
// behavior, operations.ts re-exports the SAME function reference (no fork),
// and both modules stay under the engine size ceiling the split exists to
// satisfy.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { importPlayResidue } from '../play-cursor';
import {
  createStudioState,
  importPlayResidue as importPlayResidueViaOperations,
} from '../operations';
import type { ResidueEvent } from '../residue';

function events(n: number): ResidueEvent[] {
  const out: ResidueEvent[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      tick: i + 1,
      type: 'practice_tick',
      ids: ['practice.test'],
      numbers: { progress: 2 },
    });
  }
  return out;
}

describe('importPlayResidue (play-cursor module)', () => {
  it('imports a new life in full, continues the same life from the cursor, and resets on a new life', () => {
    const first = events(3);
    const once = importPlayResidue(createStudioState(), 'life-a', first);
    expect(once.residue).toHaveLength(3);
    expect(once.play_import).toEqual({ life_id: 'life-a', index: 2 });

    const again = importPlayResidue(once, 'life-a', first);
    expect(again.residue).toHaveLength(3);
    expect(again.play_import).toEqual({ life_id: 'life-a', index: 2 });

    const grown = importPlayResidue(again, 'life-a', events(5));
    expect(grown.residue).toHaveLength(5);
    expect(grown.play_import).toEqual({ life_id: 'life-a', index: 4 });

    const otherLife = importPlayResidue(grown, 'life-b', events(1));
    expect(otherLife.residue).toHaveLength(6);
    expect(otherLife.play_import).toEqual({ life_id: 'life-b', index: 0 });
  });

  it('records a -1 cursor for an empty log without touching residue', () => {
    const out = importPlayResidue(createStudioState(), 'life-a', []);
    expect(out.residue).toHaveLength(0);
    expect(out.play_import).toEqual({ life_id: 'life-a', index: -1 });
  });
});

describe('operations re-export surface', () => {
  it('re-exports the same importPlayResidue function reference (no fork)', () => {
    expect(importPlayResidueViaOperations).toBe(importPlayResidue);
  });
});

describe('module size gates (BD6)', () => {
  const lineCount = (file: string): number =>
    readFileSync(join(process.cwd(), 'src', 'engine', file), 'utf8').split('\n').length;

  it('keeps play-cursor.ts and operations.ts within the ~250-line ceiling', () => {
    expect(lineCount('play-cursor.ts')).toBeLessThanOrEqual(250);
    expect(lineCount('operations.ts')).toBeLessThanOrEqual(250);
  });
});
