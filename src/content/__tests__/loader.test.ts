import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { EraBundle } from '../registry';

// Import AFTER vi.mock so the loader sees the mocked registry.
import { loadEraPack } from '../loader';

/**
 * Shared mutable state read by the registry mock. `realBundle` is populated by
 * the vi.mock factory at import time (it dynamically imports the real Tang
 * China json5 files); `override` is set per-test to inject malformed data.
 */
const { state } = vi.hoisted(() => ({
  state: {
    realBundle: null as EraBundle | null,
    override: null as EraBundle | null,
  },
}));

vi.mock('../registry', async () => {
  const [pack, events, endings, practices, schedules, sutras, mantras, figures] = await Promise.all(
    [
      import('../packs/tang-china/pack.json5'),
      import('../packs/tang-china/events.json5'),
      import('../packs/tang-china/endings.json5'),
      import('../packs/tang-china/practices.json5'),
      import('../packs/tang-china/schedules.json5'),
      import('../packs/tang-china/sutras.json5'),
      import('../packs/tang-china/mantras.json5'),
      import('../packs/tang-china/figures.json5'),
    ],
  );
  state.realBundle = {
    pack: pack.default,
    events: events.default,
    endings: endings.default,
    practices: practices.default,
    schedules: schedules.default,
    sutras: sutras.default,
    mantras: mantras.default,
    figures: figures.default,
  };
  return {
    listEraIds: () => ['tang-china'],
    hasEraBundle: (id: string) => id === 'tang-china',
    getEraBundle: (id: string): EraBundle => {
      if (id !== 'tang-china') {
        throw new Error(`registry: unknown era "${id}"`);
      }
      return state.override ?? state.realBundle!;
    },
  };
});

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe('loadEraPack — practices + schedules loading', () => {
  beforeEach(() => {
    state.override = null;
  });

  test('reads practices.json5 and exposes a non-empty practices array', () => {
    const pack = loadEraPack('tang-china');
    expect(Array.isArray(pack.practices)).toBe(true);
    expect(pack.practices.length).toBeGreaterThan(0);
    const ids = pack.practices.map((p) => p.id);
    expect(ids).toContain('practice:tang/alms-round');
  });

  test('reads schedules.json5 and exposes a non-empty schedules array', () => {
    const pack = loadEraPack('tang-china');
    expect(Array.isArray(pack.schedules)).toBe(true);
    expect(pack.schedules.length).toBeGreaterThan(0);
    const ids = pack.schedules.map((s) => s.id);
    expect(ids).toContain('schedule:tang/monastic-day');
  });

  test('LoadedEraPack carries all 5 components: pack scaffold + events + endings + practices + schedules', () => {
    const pack = loadEraPack('tang-china');
    // (1) Pack scaffold fields come through EraPackSchema.
    expect(pack.id).toBe('tang-china@0.1.0');
    expect(pack.lens_set).toBe('six-paramita-mahayana');
    // (2) Events merged from events.json5.
    expect(pack.events.length).toBeGreaterThanOrEqual(6);
    // (3) Endings attached as sibling.
    expect(pack.endings.length).toBeGreaterThan(0);
    // (4) Practices attached as sibling.
    expect(pack.practices.length).toBeGreaterThan(0);
    // (5) Schedules attached as sibling.
    expect(pack.schedules.length).toBeGreaterThan(0);
    // Each schedule's blocks reference a known practice or null.
    for (const schedule of pack.schedules) {
      for (const block of schedule.blocks) {
        if (block.practice_id !== null) {
          const ids = pack.practices.map((p) => p.id);
          expect(ids, `block "${block.id}" references an unknown practice`).toContain(
            block.practice_id,
          );
        }
      }
    }
  });

  test('throws when a practice fails PracticeSchema (invalid lens)', () => {
    const real = state.realBundle!;
    const badPractices = clone(real.practices as { practices: unknown[] });
    const first = badPractices.practices[0];
    if (!first || typeof first !== 'object') {
      throw new Error('test fixture: first practice missing');
    }
    (first as Record<string, unknown>).lens = 'wisdom'; // not in the enum
    state.override = { ...real, practices: badPractices };
    expect(() => loadEraPack('tang-china')).toThrowError(/practices schema validation failed/);
  });

  test('throws when a practice fails PracticeSchema (negative progressPerTick)', () => {
    const real = state.realBundle!;
    const badPractices = clone(real.practices as { practices: unknown[] });
    const first = badPractices.practices[0];
    if (!first || typeof first !== 'object') {
      throw new Error('test fixture: first practice missing');
    }
    (first as Record<string, unknown>).progressPerTick = -1;
    state.override = { ...real, practices: badPractices };
    expect(() => loadEraPack('tang-china')).toThrowError(/practices schema validation failed/);
  });

  test('throws when a schedule fails DailyScheduleSchema (startHour out of range)', () => {
    const real = state.realBundle!;
    const badSchedules = clone(real.schedules as { schedules: unknown[] });
    const first = badSchedules.schedules[0];
    if (!first || typeof first !== 'object') {
      throw new Error('test fixture: first schedule missing');
    }
    const blocks = (first as { blocks: Record<string, unknown>[] }).blocks;
    const firstBlock = blocks[0];
    if (!firstBlock) {
      throw new Error('test fixture: first block missing');
    }
    firstBlock.startHour = 99; // > 23 max
    state.override = { ...real, schedules: badSchedules };
    expect(() => loadEraPack('tang-china')).toThrowError(/schedules schema validation failed/);
  });

  test('throws when schedules.json5 lacks a schedules array', () => {
    const real = state.realBundle!;
    state.override = { ...real, schedules: { wrongKey: [] } };
    expect(() => loadEraPack('tang-china')).toThrowError(
      /must be an object with a "schedules" array/,
    );
  });

  test('throws when practices.json5 lacks a practices array', () => {
    const real = state.realBundle!;
    state.override = { ...real, practices: { wrongKey: [] } };
    expect(() => loadEraPack('tang-china')).toThrowError(
      /must be an object with a "practices" array/,
    );
  });
});
