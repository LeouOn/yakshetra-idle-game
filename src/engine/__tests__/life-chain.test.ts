import { describe, expect, it } from 'vitest';

import {
  createLifeState,
  currentLife,
  emptyKarma,
  openLife,
  reviveLifeState,
  snapshotLifeChain,
  startNextLife,
} from '../';
import type { LifeState, SaveBlob } from '../';

function makeLife(id = 'life-a'): LifeState {
  const life = createLifeState({
    id: id as LifeState['id'],
    era: 'tang-china' as LifeState['era'],
    role: 'wanderer' as LifeState['role'],
    identity: {
      gender: 'unset',
      social_class: 'unset',
      family_wealth_at_birth: 'unset',
      caste_status: 'unset',
      disability_status: 'unset',
    },
  });
  return { ...life, flags: new Set(['pin:m-1']), turn: 4 };
}

describe('snapshotLifeChain', () => {
  it('starts a chain from a missing prior blob', () => {
    const life = makeLife();
    const blob = snapshotLifeChain(life, null, 1_700_000_000);
    expect(blob.schema_version).toBe('0.1');
    expect(blob.created_at_unix).toBe(1_700_000_000);
    expect(blob.chain.life_states).toHaveLength(1);
    expect(blob.chain.current_life_index).toBe(0);
    expect(blob.chain.karma_state).toEqual(emptyKarma());
    expect(blob.chain.life_states[0]?.turn).toBe(4);
  });

  it('replaces the current life and keeps identity and prior metadata', () => {
    const first = snapshotLifeChain(makeLife(), null, 10);
    const later = { ...makeLife(), turn: 9, flags: new Set(['pin:m-1', 'world:assembled']) };
    const next = snapshotLifeChain(later, first, 99);
    expect(next.created_at_unix).toBe(10);
    expect(next.run_id).toBe(first.run_id);
    expect(next.chain.life_states).toHaveLength(1);
    expect(next.chain.life_states[0]?.turn).toBe(9);
    expect(next.chain.life_states[0]?.identity).toEqual(first.chain.life_states[0]?.identity);
  });
});

describe('reviveLifeState', () => {
  it('turns JSON arrays back into Set fields', () => {
    const raw = {
      ...makeLife(),
      flags: ['pin:m-1', 'place:yard'] as unknown as Set<string>,
      fired_once_per_run: ['evt-1'] as unknown as Set<string>,
    };
    const revived = reviveLifeState(raw);
    expect(revived.flags).toBeInstanceOf(Set);
    expect(revived.flags.has('pin:m-1')).toBe(true);
    expect(revived.fired_once_per_run.has('evt-1')).toBe(true);
  });

  it('reads the current life out of a blob', () => {
    const blob: SaveBlob = snapshotLifeChain(makeLife('life-b'), null, 1);
    const life = currentLife(blob);
    expect(life?.id).toBe('life-b');
    expect(life?.flags.has('pin:m-1')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Chain advance — the second life must be a NEW life, not the dead one.
// ---------------------------------------------------------------------------

function deadLife(id = 'life-a'): LifeState {
  return { ...makeLife(id), alive: false };
}

describe('openLife', () => {
  it('returns the current life while it is alive', () => {
    const blob = snapshotLifeChain(makeLife('life-b'), null, 1);
    expect(openLife(blob)?.id).toBe('life-b');
  });

  it('returns null once the current life has ended', () => {
    const blob = snapshotLifeChain(deadLife(), null, 1);
    expect(currentLife(blob)?.alive).toBe(false);
    expect(openLife(blob)).toBeNull();
  });
});

describe('startNextLife', () => {
  it('appends the new life and advances the current index', () => {
    const first = snapshotLifeChain(deadLife('life-a'), null, 10);
    const second = { ...makeLife('life-c'), era: 'fantasy-mahayana' as LifeState['era'] };
    const chain = startNextLife(first, second, 99);
    expect(chain.chain.life_states).toHaveLength(2);
    expect(chain.chain.current_life_index).toBe(1);
    expect(currentLife(chain)?.id).toBe('life-c');
    expect(openLife(chain)?.era).toBe('fantasy-mahayana');
    expect(chain.created_at_unix).toBe(10);
  });

  it('starts a fresh chain from a missing prior blob', () => {
    const chain = startNextLife(null, makeLife('life-d'), 5);
    expect(chain.chain.life_states).toHaveLength(1);
    expect(chain.chain.current_life_index).toBe(0);
  });

  it('is idempotent for a life already in the current slot', () => {
    const first = snapshotLifeChain(makeLife('life-a'), null, 10);
    const advanced = startNextLife(first, { ...makeLife('life-b') }, 20);
    expect(startNextLife(advanced, advanced.chain.life_states[1] as LifeState, 30)).toEqual(
      advanced,
    );
  });
});
