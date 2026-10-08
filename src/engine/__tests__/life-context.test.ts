import { describe, expect, it } from 'vitest';

import {
  classifyBond,
  createIdleState,
  createLifeState,
  evaluateLifeContext,
  stringifyLifeContext,
  type Manifest,
} from '../';

const EPOCH = { year: 780, month: 1, day: 1, hour: 0 };

function makeLife() {
  const base = createLifeState({
    id: 'life-ctx' as ReturnType<typeof createLifeState>['id'],
    era: 'tang-test@0.1.0' as ReturnType<typeof createLifeState>['era'],
    role: 'merchant' as ReturnType<typeof createLifeState>['role'],
    identity: {
      gender: 'unspecified',
      social_class: 'merchant',
      family_wealth_at_birth: 'modest',
      caste_status: 'none',
      disability_status: 'none',
    },
  });
  return {
    ...base,
    age: 34,
    relationships: {
      aunt: { trust: 4, debt: 1, affection: 3 },
      debtor: { trust: 0, debt: 5, affection: 0 },
    },
  };
}

function personCard(): Manifest {
  return {
    schema_version: 'manifest/v1',
    scale: 'person',
    id: 'm-guest',
    rng_seed: '1',
    brief: null,
    residue_window_id: 'w-1',
    kind: 'person',
    name: 'The courtyard guest',
    one_liner: 'Neither pet nor stranger.',
    subject: 'a being',
    detail: 'detail',
    tags: ['guest'],
    rarity: 'common',
    fill_status: 'table',
    quality_tier: 0,
    provenance: { source: 'table', revision: 'table/v0' },
  };
}

describe('evaluateLifeContext', () => {
  it('classifies bonds from trust, debt, and affection', () => {
    expect(classifyBond(4, 1, 3)).toBe('close');
    expect(classifyBond(0, 5, 0)).toBe('owed');
    expect(classifyBond(1, 0, 1)).toBe('warm');
    expect(classifyBond(0, 0, 0)).toBe('thin');
  });

  it('reports year, role, ties, and cast beings for a later compiler', () => {
    const idle = { ...createIdleState(), lastSimulatedTick: 8640n * 2n };
    const ctx = evaluateLifeContext({
      life: makeLife(),
      idle,
      epoch: EPOCH,
      archive: [personCard()],
    });
    expect(ctx.schema_version).toBe('life_context/v0');
    expect(ctx.setting.year).toBe(782);
    expect(ctx.setting.role_id).toBe('merchant');
    expect(ctx.ties.some((t) => t.id === 'aunt' && t.bond === 'close')).toBe(true);
    expect(ctx.ties.some((t) => t.id === 'debtor' && t.bond === 'owed')).toBe(true);
    expect(ctx.ties.some((t) => t.source === 'cast' && t.id === 'm-guest')).toBe(true);
    // Cased, per the lead's reading of the 30 cards: never 'aunt'.
    expect(ctx.strongest_tie).toBe('Aunt');
    expect(stringifyLifeContext(ctx)).toContain('"schema_version":"life_context/v0"');
  });

  it('omits a tie it cannot name rather than inventing one from its id', () => {
    // A relationship filed under a manifest handle, with no card in the
    // archive to name it. Humanizing the handle would print "M Guest", which
    // reads as a real person and is not one.
    const life = makeLife();
    const ctx = evaluateLifeContext({
      life: {
        ...life,
        relationships: { ...life.relationships, 'm-guest': { trust: 9, debt: 0, affection: 9 } },
      },
      idle: createIdleState(),
      epoch: EPOCH,
    });
    const tie = ctx.ties.find((t) => t.id === 'm-guest');
    expect(tie).toBeDefined();
    expect(tie?.name).toBeNull();
    // The handle is not echoed anywhere a player can read it.
    expect(stringifyLifeContext(ctx)).not.toContain('M Guest');
    // And a real relationship name in the same life still resolves and cased.
    expect(ctx.ties.some((t) => t.id === 'aunt' && t.name === 'Aunt')).toBe(true);
  });
});
