import { describe, expect, it } from 'vitest';

import {
  getBlockProgress,
  resolveBlock,
  resolveScheduleState,
  validateSchedule,
  type DailySchedule,
} from '../schedule';

/**
 * Monastic-flavoured 24h schedule covering every block in the project's
 * Mahāyāna-inspired theme. Partition is exact: blocks sum to [0, 24).
 */
const MONASTIC: DailySchedule = {
  id: 'monastic-day',
  name_sid: 'schedule.monastic_day.name',
  blocks: [
    {
      id: 'rest',
      label_sid: 'schedule.monastic_day.rest',
      startHour: 0,
      endHour: 5,
      practice_id: null,
      icon_sid: 'icon.moon',
    },
    {
      id: 'dawn',
      label_sid: 'schedule.monastic_day.dawn',
      startHour: 5,
      endHour: 7,
      practice_id: 'practice.collected_attention',
      icon_sid: 'icon.sunrise',
    },
    {
      id: 'work',
      label_sid: 'schedule.monastic_day.work',
      startHour: 7,
      endHour: 12,
      practice_id: 'practice.joyful_effort',
      icon_sid: 'icon.hammer',
    },
    {
      id: 'midday',
      label_sid: 'schedule.monastic_day.midday',
      startHour: 12,
      endHour: 14,
      practice_id: null,
      icon_sid: 'icon.bowl',
    },
    {
      id: 'study',
      label_sid: 'schedule.monastic_day.study',
      startHour: 14,
      endHour: 18,
      practice_id: 'practice.discernment',
      icon_sid: 'icon.scroll',
    },
    {
      id: 'evening',
      label_sid: 'schedule.monastic_day.evening',
      startHour: 18,
      endHour: 21,
      practice_id: 'practice.generosity',
      icon_sid: 'icon.lamp',
    },
    {
      id: 'night',
      label_sid: 'schedule.monastic_day.night',
      startHour: 21,
      endHour: 24,
      practice_id: null,
      icon_sid: 'icon.stars',
    },
  ],
};

describe('resolveBlock', () => {
  it('resolves the correct block at each boundary and interior hour', () => {
    const cases: [number, string][] = [
      [0, 'rest'],
      [4, 'rest'],
      [5, 'dawn'],
      [6, 'dawn'],
      [7, 'work'],
      [11, 'work'],
      [12, 'midday'],
      [13, 'midday'],
      [14, 'study'],
      [17, 'study'],
      [18, 'evening'],
      [20, 'evening'],
      [21, 'night'],
      [23, 'night'],
    ];
    for (const [hour, id] of cases) {
      expect(resolveBlock(MONASTIC, hour).id).toBe(id);
    }
  });

  it('treats endHour as exclusive (a boundary hour belongs to the next block)', () => {
    expect(resolveBlock(MONASTIC, 5).id).toBe('dawn');
    expect(resolveBlock(MONASTIC, 7).id).toBe('work');
    expect(resolveBlock(MONASTIC, 21).id).toBe('night');
  });

  it('throws RangeError for hours outside [0, 24) or non-integers', () => {
    expect(() => resolveBlock(MONASTIC, -1)).toThrow(RangeError);
    expect(() => resolveBlock(MONASTIC, 24)).toThrow(RangeError);
    expect(() => resolveBlock(MONASTIC, 1.5)).toThrow(RangeError);
  });
});

describe('getBlockProgress', () => {
  it('returns 0 at the block start and the expected fraction inside', () => {
    const dawn = resolveBlock(MONASTIC, 5);
    expect(getBlockProgress(dawn, 5)).toBe(0);
    // dawn duration is 2; at hour 6 progress = 1/2
    expect(getBlockProgress(dawn, 6)).toBeCloseTo(0.5);
  });

  it('clamps to 0 before the block and to 1 at/after the end', () => {
    const dawn = resolveBlock(MONASTIC, 5);
    expect(getBlockProgress(dawn, 0)).toBe(0);
    expect(getBlockProgress(dawn, 7)).toBe(1);
    expect(getBlockProgress(dawn, 99)).toBe(1);
  });

  it('returns 1 for a zero-duration block', () => {
    expect(
      getBlockProgress(
        { id: 'z', label_sid: 'x', startHour: 4, endHour: 4, practice_id: null, icon_sid: 'i' },
        4,
      ),
    ).toBe(1);
  });
});

describe('resolveScheduleState', () => {
  it('maps tick 0 to the first hour of the first block', () => {
    const s = resolveScheduleState(MONASTIC, 0n);
    expect(s.currentBlock.id).toBe('rest');
    expect(s.nextBlock.id).toBe('dawn');
    expect(s.hourWithinBlock).toBe(0);
    expect(s.hoursRemainingInBlock).toBe(4);
    expect(s.progressThroughBlock).toBe(0);
  });

  it('wraps at the day boundary (tick 24 === tick 0)', () => {
    const a = resolveScheduleState(MONASTIC, 0n);
    const b = resolveScheduleState(MONASTIC, 24n);
    expect(b.currentBlock.id).toBe(a.currentBlock.id);
    expect(b.hourWithinBlock).toBe(a.hourWithinBlock);
  });

  it('wraps across multiple days (tick 53 → hour 5)', () => {
    const s = resolveScheduleState(MONASTIC, 53n);
    expect(s.currentBlock.id).toBe('dawn');
    expect(s.hourWithinBlock).toBe(0);
    expect(s.nextBlock.id).toBe('work');
  });

  it('normalises negative ticks (tick -1 → hour 23)', () => {
    const s = resolveScheduleState(MONASTIC, -1n);
    expect(s.currentBlock.id).toBe('night');
    expect(s.hourWithinBlock).toBe(2);
    expect(s.hoursRemainingInBlock).toBe(0);
  });

  it('wraps nextBlock from last back to first', () => {
    const s = resolveScheduleState(MONASTIC, 23n);
    expect(s.currentBlock.id).toBe('night');
    expect(s.nextBlock.id).toBe('rest');
  });

  it('respects a custom hoursPerDay', () => {
    const compact: DailySchedule = {
      id: 'compact',
      name_sid: 'schedule.compact.name',
      blocks: [
        { id: 'a', label_sid: 'x', startHour: 0, endHour: 3, practice_id: null, icon_sid: 'i' },
        { id: 'b', label_sid: 'y', startHour: 3, endHour: 6, practice_id: null, icon_sid: 'j' },
      ],
    };
    const s = resolveScheduleState(compact, 4n, 6);
    expect(s.currentBlock.id).toBe('b');
    expect(s.hourWithinBlock).toBe(1);
  });

  it('throws RangeError for non-positive hoursPerDay', () => {
    expect(() => resolveScheduleState(MONASTIC, 0n, 0)).toThrow(RangeError);
    expect(() => resolveScheduleState(MONASTIC, 0n, -3)).toThrow(RangeError);
  });
});

describe('validateSchedule', () => {
  it('accepts the valid monastic schedule', () => {
    const r = validateSchedule(MONASTIC);
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('rejects a schedule that does not start at 0', () => {
    const r = validateSchedule({
      id: 'bad-start',
      name_sid: 'x',
      blocks: [
        { id: 'late', label_sid: 'x', startHour: 2, endHour: 24, practice_id: null, icon_sid: 'i' },
      ],
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('hour 0'))).toBe(true);
  });

  it('rejects a schedule that does not end at 24', () => {
    const r = validateSchedule({
      id: 'bad-end',
      name_sid: 'x',
      blocks: [
        {
          id: 'short',
          label_sid: 'x',
          startHour: 0,
          endHour: 20,
          practice_id: null,
          icon_sid: 'i',
        },
      ],
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('24'))).toBe(true);
  });

  it('rejects overlapping blocks', () => {
    const r = validateSchedule({
      id: 'overlap',
      name_sid: 'x',
      blocks: [
        { id: 'a', label_sid: 'x', startHour: 0, endHour: 8, practice_id: null, icon_sid: 'i' },
        { id: 'b', label_sid: 'x', startHour: 5, endHour: 24, practice_id: null, icon_sid: 'j' },
      ],
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('overlap'))).toBe(true);
  });

  it('rejects a gap between blocks', () => {
    const r = validateSchedule({
      id: 'gap',
      name_sid: 'x',
      blocks: [
        { id: 'a', label_sid: 'x', startHour: 0, endHour: 6, practice_id: null, icon_sid: 'i' },
        { id: 'b', label_sid: 'x', startHour: 9, endHour: 24, practice_id: null, icon_sid: 'j' },
      ],
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('gap'))).toBe(true);
  });

  it('rejects an empty schedule', () => {
    const r = validateSchedule({ id: 'empty', name_sid: 'x', blocks: [] });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('at least one block'))).toBe(true);
  });

  it('rejects a block shorter than 1 hour', () => {
    const r = validateSchedule({
      id: 'zero-dur',
      name_sid: 'x',
      blocks: [
        { id: 'a', label_sid: 'x', startHour: 0, endHour: 0, practice_id: null, icon_sid: 'i' },
        { id: 'b', label_sid: 'x', startHour: 0, endHour: 24, practice_id: null, icon_sid: 'j' },
      ],
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('1 hour'))).toBe(true);
  });
});
