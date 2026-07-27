import { describe, expect, test } from 'vitest';

import { applyEffect, createLifeState, createRng } from '@/engine';
import type { LifeState, SocialIdentity } from '@/engine';

import {
  DailyScheduleSchema,
  EffectOpSchema,
  PracticeSchema,
  ScheduleBlockSchema,
} from '../schema';

const IDENTITY: SocialIdentity = {
  gender: 'unspecified',
  social_class: 'unspecified',
  family_wealth_at_birth: 'unspecified',
  caste_status: 'unspecified',
  disability_status: 'unspecified',
};

const rng = createRng(1n);

function makeLife() {
  return createLifeState({
    id: 'life-1' as LifeState['id'],
    era: 'era-test@0.1.0' as LifeState['era'],
    role: 'role-test' as LifeState['role'],
    identity: IDENTITY,
  });
}

const VALID_PRACTICE = {
  id: 'alms-round',
  label_sid: 'practice.alms_round.label_sid',
  description_sid: 'practice.alms_round.desc_sid',
  lens: 'generosity',
  progressPerTick: 0.5,
  maxProgress: 10,
  effects: [{ op: 'add_resource', key: 'trust', delta: 1 }],
};

const VALID_BLOCK = {
  id: 'morning',
  label_sid: 'block.morning.label_sid',
  startHour: 6,
  endHour: 12,
  practice_id: 'alms-round',
  icon_sid: 'block.morning.icon_sid',
};

describe('PracticeSchema', () => {
  test('accepts a valid practice', () => {
    const r = PracticeSchema.safeParse(VALID_PRACTICE);
    expect(r.success).toBe(true);
  });

  test('accepts every lens value', () => {
    for (const lens of [
      'generosity',
      'careful_conduct',
      'patient_courage',
      'joyful_effort',
      'collected_attention',
      'discernment',
    ]) {
      const r = PracticeSchema.safeParse({ ...VALID_PRACTICE, lens });
      expect(r.success).toBe(true);
    }
  });

  test('rejects an unknown lens', () => {
    const r = PracticeSchema.safeParse({ ...VALID_PRACTICE, lens: 'wisdom' });
    expect(r.success).toBe(false);
  });

  test('rejects non-positive progressPerTick', () => {
    const r = PracticeSchema.safeParse({ ...VALID_PRACTICE, progressPerTick: 0 });
    expect(r.success).toBe(false);
  });

  test('rejects non-positive maxProgress', () => {
    const r = PracticeSchema.safeParse({ ...VALID_PRACTICE, maxProgress: -1 });
    expect(r.success).toBe(false);
  });

  test('rejects an unknown (extra) field under .strict()', () => {
    const r = PracticeSchema.safeParse({ ...VALID_PRACTICE, extra: true });
    expect(r.success).toBe(false);
  });

  test('rejects a missing description_sid', () => {
    const { description_sid: _omit, ...rest } = VALID_PRACTICE;
    void _omit;
    const r = PracticeSchema.safeParse(rest);
    expect(r.success).toBe(false);
  });
});

describe('ScheduleBlockSchema', () => {
  test('accepts a valid block', () => {
    const r = ScheduleBlockSchema.safeParse(VALID_BLOCK);
    expect(r.success).toBe(true);
  });

  test('accepts a null practice_id (free block)', () => {
    const r = ScheduleBlockSchema.safeParse({ ...VALID_BLOCK, practice_id: null });
    expect(r.success).toBe(true);
  });

  test('rejects startHour below 0', () => {
    const r = ScheduleBlockSchema.safeParse({ ...VALID_BLOCK, startHour: -1 });
    expect(r.success).toBe(false);
  });

  test('rejects endHour above 24', () => {
    const r = ScheduleBlockSchema.safeParse({ ...VALID_BLOCK, endHour: 25 });
    expect(r.success).toBe(false);
  });

  test('rejects a non-integer hour', () => {
    const r = ScheduleBlockSchema.safeParse({ ...VALID_BLOCK, startHour: 6.5 });
    expect(r.success).toBe(false);
  });

  test('rejects a player-facing string in icon_sid (must be a _sid)', () => {
    const r = ScheduleBlockSchema.safeParse({ ...VALID_BLOCK, icon_sid: 'plain text' });
    expect(r.success).toBe(false);
  });
});

describe('DailyScheduleSchema', () => {
  test('accepts a schedule with one block', () => {
    const r = DailyScheduleSchema.safeParse({
      id: 'daily-monastic',
      name_sid: 'schedule.daily_monastic.name_sid',
      blocks: [VALID_BLOCK],
    });
    expect(r.success).toBe(true);
  });

  test('rejects an empty blocks array (min(1))', () => {
    const r = DailyScheduleSchema.safeParse({
      id: 'empty',
      name_sid: 'schedule.empty.name_sid',
      blocks: [],
    });
    expect(r.success).toBe(false);
  });
});

describe('EffectOpSchema — new ops', () => {
  test('accepts set_schedule', () => {
    const r = EffectOpSchema.safeParse({ op: 'set_schedule', schedule_id: 'daily-monastic' });
    expect(r.success).toBe(true);
  });

  test('accepts set_practice_override with an id', () => {
    const r = EffectOpSchema.safeParse({
      op: 'set_practice_override',
      practice_id: 'alms-round',
    });
    expect(r.success).toBe(true);
  });

  test('accepts set_practice_override with null (clear)', () => {
    const r = EffectOpSchema.safeParse({ op: 'set_practice_override', practice_id: null });
    expect(r.success).toBe(true);
  });

  test('rejects set_practice_override without practice_id', () => {
    const r = EffectOpSchema.safeParse({ op: 'set_practice_override' });
    expect(r.success).toBe(false);
  });

  test('rejects an unknown op discriminator', () => {
    const r = EffectOpSchema.safeParse({ op: 'teleport_life' });
    expect(r.success).toBe(false);
  });
});

describe('applyEffect — new ops', () => {
  test('set_schedule writes state.schedule_id', () => {
    const before = makeLife();
    expect(before.schedule_id).toBeNull();
    const after = applyEffect(before, { op: 'set_schedule', schedule_id: 'daily-monastic' }, rng);
    expect(after.schedule_id).toBe('daily-monastic');
    expect(before.schedule_id).toBeNull();
  });

  test('set_practice_override writes state.practice_override_id', () => {
    const before = makeLife();
    expect(before.practice_override_id).toBeNull();
    const after = applyEffect(
      before,
      { op: 'set_practice_override', practice_id: 'sutra-copying' },
      rng,
    );
    expect(after.practice_override_id).toBe('sutra-copying');
  });

  test('set_practice_override with null clears the override', () => {
    const seeded = applyEffect(
      makeLife(),
      { op: 'set_practice_override', practice_id: 'sutra-copying' },
      rng,
    );
    expect(seeded.practice_override_id).toBe('sutra-copying');
    const cleared = applyEffect(seeded, { op: 'set_practice_override', practice_id: null }, rng);
    expect(cleared.practice_override_id).toBeNull();
  });

  test('effects do not mutate the input state', () => {
    const before = makeLife();
    applyEffect(before, { op: 'set_schedule', schedule_id: 'daily-monastic' }, rng);
    expect(before.schedule_id).toBeNull();
  });
});
