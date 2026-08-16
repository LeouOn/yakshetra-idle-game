import { describe, expect, it } from 'vitest';

import { intendLens, applyChoice, createLifeState, createRng, residueLog } from '@/engine';
import type { Choice, LifeState } from '@/engine';
import { createMemoryStudioKv, loadStudioSession, syncPlayResidueToStudio } from '@/persistence';

function makeLife(id: string): LifeState {
  return createLifeState({
    id: id as LifeState['id'],
    era: 'era-test@0.1.0' as LifeState['era'],
    role: 'role-test' as LifeState['role'],
    identity: {
      gender: 'unspecified',
      social_class: 'operator',
      family_wealth_at_birth: 'unspecified',
      caste_status: 'none',
      disability_status: 'none',
    },
  });
}

const CHOICE: Choice = {
  id: 'choice.play',
  label_sid: 'choice.play_sid',
  requires: [],
  effects: [{ op: 'add_resource', key: 'trust', delta: 1 }],
  forbidden: false,
};

describe('syncPlayResidueToStudio', () => {
  it('creates a session and charges the bench from play, without double-import', async () => {
    const kv = createMemoryStudioKv();
    const intended = intendLens(makeLife('life-play'), 'generosity');
    const after = applyChoice(intended, CHOICE, createRng(1n));
    const log = residueLog(after);

    const first = await syncPlayResidueToStudio(after.id, log, kv);
    expect(first.residue).toHaveLength(2);
    expect(first.play_import?.life_id).toBe('life-play');

    const second = await syncPlayResidueToStudio(after.id, log, kv);
    expect(second.residue).toHaveLength(2);

    const saved = await loadStudioSession(kv);
    expect(saved?.benches['person']?.residue).toHaveLength(2);
    expect(saved?.benches['person']?.play_import?.index).toBe(1);
  });
});
