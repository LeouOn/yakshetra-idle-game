import { describe, expect, test } from 'vitest';

import { MinigameDefSchema, RewardTierSchema } from '../minigame-schema';

/**
 * Valid fixtures per minigame type. Each is the minimal object that parses
 * against {@link MinigameDefSchema}. Reward tiers use the engine's own
 * EffectOp union so the design invariant (no score-minting ops) is
 * structurally enforced.
 */
const GOOD_TIER = {
  minScore: 50,
  rewards: [{ op: 'add_resource', key: 'trust', delta: 1 }],
  summary_sid: 's:tier.bronze',
};

const BREATH_COUNT = {
  id: 'mg:breath-warmup',
  type: 'breath_count',
  label_sid: 's:breath.label',
  description_sid: 's:breath.desc',
  lens: 'collected_attention',
  config: { target: 8, maxInputs: 12 },
  rewardTiers: [GOOD_TIER],
};

const RHYTHM = {
  id: 'mg:rhythm-bell',
  type: 'rhythm',
  label_sid: 's:rhythm.label',
  description_sid: 's:rhythm.desc',
  lens: 'discernment',
  config: { beats: [0, 4, 8], window: 2, mantra_id: 'mantra:om' },
  rewardTiers: [GOOD_TIER],
};

const TRACE = {
  id: 'mg:trace-lotus',
  type: 'trace',
  label_sid: 's:trace.label',
  description_sid: 's:trace.desc',
  lens: 'joyful_effort',
  config: { strokes: [{ target_sid: 's:stroke.petal', tolerance: 0.2 }] },
  rewardTiers: [GOOD_TIER],
};

const ALLOCATION = {
  id: 'mg:alms-distribute',
  type: 'allocation',
  label_sid: 's:alloc.label',
  description_sid: 's:alloc.desc',
  lens: 'generosity',
  config: {
    budget: 12,
    recipients: [
      { id: 'recip:sick', label_sid: 's:recip.sick', need: 5 },
      { id: 'recip:monk', label_sid: 's:recip.monk', need: 7 },
    ],
  },
  rewardTiers: [GOOD_TIER],
};

const REFLECTION = {
  id: 'mg:reflect-motive',
  type: 'reflection',
  label_sid: 's:reflect.label',
  description_sid: 's:reflect.desc',
  lens: 'discernment',
  config: {
    root_node: 'node:root',
    nodes: [
      {
        id: 'node:root',
        prompt_sid: 's:reflect.prompt',
        options: [
          {
            id: 'opt:care',
            label_sid: 's:opt.care',
            intent_root: 'care',
            insight_sid: 's:opt.care.insight',
            next: null,
          },
        ],
      },
    ],
  },
  rewardTiers: [GOOD_TIER],
};

const WALKING = {
  id: 'mg:walking-circuit',
  type: 'walking',
  label_sid: 's:walk.label',
  description_sid: 's:walk.desc',
  lens: 'patient_courage',
  config: { targetCadence: 100, requiredSteps: 240, window: 6 },
  rewardTiers: [GOOD_TIER],
};

describe('MinigameDefSchema — per-type acceptance', () => {
  test.each([
    ['breath_count', BREATH_COUNT],
    ['rhythm', RHYTHM],
    ['trace', TRACE],
    ['allocation', ALLOCATION],
    ['reflection', REFLECTION],
    ['walking', WALKING],
  ])('accepts a valid %s def', (_type, fixture) => {
    const r = MinigameDefSchema.safeParse(fixture);
    expect(r.success).toBe(true);
  });
});

describe('MinigameDefSchema — rejections', () => {
  test('rejects an unknown type discriminator', () => {
    const r = MinigameDefSchema.safeParse({ ...BREATH_COUNT, type: 'koan_solver' });
    expect(r.success).toBe(false);
  });

  test('rejects a missing required field (description_sid)', () => {
    const { description_sid: _omit, ...rest } = BREATH_COUNT;
    void _omit;
    const r = MinigameDefSchema.safeParse(rest);
    expect(r.success).toBe(false);
  });

  test('rejects a reward tier with an invalid EffectOp', () => {
    const badTier = {
      ...GOOD_TIER,
      rewards: [{ op: 'add_karma', delta: 5 }],
    };
    expect(RewardTierSchema.safeParse(badTier).success).toBe(false);
    const r = MinigameDefSchema.safeParse({ ...BREATH_COUNT, rewardTiers: [badTier] });
    expect(r.success).toBe(false);
  });

  test('rejects an empty rewardTiers array (min 1)', () => {
    const r = MinigameDefSchema.safeParse({ ...BREATH_COUNT, rewardTiers: [] });
    expect(r.success).toBe(false);
  });

  test('rejects an extra field under .strict()', () => {
    const r = MinigameDefSchema.safeParse({ ...BREATH_COUNT, extra: true });
    expect(r.success).toBe(false);
  });

  test('rejects a lens value not permitted for the type', () => {
    // generosity is valid for allocation, not for breath_count
    const r = MinigameDefSchema.safeParse({ ...BREATH_COUNT, lens: 'generosity' });
    expect(r.success).toBe(false);
  });
});
