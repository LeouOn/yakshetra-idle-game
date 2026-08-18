// Visitors — deterministic boost guests (Phase 2 Task 3).
//
// Covers: arrival determinism (same seeds, same arrival), jitter bounds,
// one-active-per-tier skip with accumulating counter, counter reset on
// arrival, decay ONLY via noteVisitorHarvest, locked-tier no-op, absent
// rows no-op, modifier overlay math, file-order preference, scale matching,
// and the content→engine structural assignability lock.

import { describe, expect, it } from 'vitest';

// Type-only (erased at runtime): content rows must stay structurally
// assignable to the engine's VisitorLike view — no runtime dependency from
// src/engine on src/content (same pattern as milestones/endowment tests).
import type { Visitor } from '@/content/progression/schema';

import { EMPTY_BENCH_MODIFIERS, type BenchModifiers } from '@/engine/endowment-validators';
import { memberSeed } from '@/engine/roster';
import {
  emptyHydratedSession,
  snapshotStudioSession,
  type StudioSession,
} from '@/engine/studio-session';
import type { CatalogEntry, CatalogMap } from '@/engine/table-catalog';
import { createTierState, type ActiveVisitor, type TierState } from '@/engine/tier-state';
import {
  activeVisitorFor,
  noteVisitorHarvest,
  stepVisitors,
  visitorModifierOverlay,
  visitorTableOverride,
  type VisitorLike,
  type VisitorTablesView,
} from '@/engine/visitors';

/* ---- fixtures ------------------------------------------------------------ */

const GATE_YAKSA: Visitor = {
  schema_version: 'visitor/v0',
  id: 'visitor/gate-yaksa',
  tiers: ['person'],
  cadence_ticks: 10,
  jitter_ticks: 4,
  duration_windows: 2,
  effects: [{ op: 'add_resource', key: 'cook_speed', delta: 1 }],
  sid_ns: 'visitor.gate_yaksa',
};
const TEACHER: Visitor = {
  schema_version: 'visitor/v0',
  id: 'visitor/traveling-teacher',
  tiers: ['household'],
  cadence_ticks: 8,
  jitter_ticks: 0,
  duration_windows: 2,
  effects: [{ op: 'add_resource', key: 'cook_speed', delta: 1 }],
  sid_ns: 'visitor.traveling_teacher',
};
const FESTIVAL: Visitor = {
  schema_version: 'visitor/v0',
  id: 'visitor/festival-day',
  tiers: ['household'],
  cadence_ticks: 20,
  jitter_ticks: 0,
  duration_windows: 3,
  effects: [{ op: 'add_resource', key: 'surplus_rate', delta: 2 }],
  sid_ns: 'visitor.festival_day',
};

function baseSession(): StudioSession {
  const empty = emptyHydratedSession();
  return snapshotStudioSession(empty.studio, empty.idle, empty.life, empty.practices);
}

function tierRow(
  id: string,
  unlocked: boolean,
  over?: { visitor_ticks?: number; active_visitor?: ActiveVisitor | null },
): TierState {
  const base = createTierState(id, unlocked);
  const next: TierState = { ...base, visitor_ticks: over?.visitor_ticks ?? base.visitor_ticks };
  if (over?.active_visitor !== undefined) {
    next.active_visitor = over.active_visitor;
  }
  return next;
}

function ctxFor(
  visitors: readonly VisitorLike[],
  sessionSeed = 'seed-a',
): Parameters<typeof stepVisitors>[1] {
  return {
    tiers: [
      { id: 'person', scale: 'person' },
      { id: 'household', scale: 'household' },
    ],
    sessionSeed,
    visitors,
  };
}

/** Step one tick at a time until the tier has an active visitor; returns ticks used. */
function ticksUntilArrival(
  visitors: readonly VisitorLike[],
  sessionSeed: string,
  tierId: string,
): number {
  let session: StudioSession = {
    ...baseSession(),
    tiers: { person: tierRow('person', true), household: tierRow('household', true) },
  };
  const ctx = ctxFor(visitors, sessionSeed);
  for (let i = 1; i <= 1000; i++) {
    session = stepVisitors(session, ctx, 1);
    if (session.tiers[tierId]?.active_visitor !== null) {
      return i;
    }
  }
  throw new Error('no arrival within 1000 ticks');
}

/* ---- assignability lock --------------------------------------------------- */

it('content Visitor rows stay structurally assignable to the engine view', () => {
  const rows: readonly VisitorLike[] = [GATE_YAKSA, TEACHER, FESTIVAL];
  expect(rows).toHaveLength(3);
});

/* ---- arrival --------------------------------------------------------------- */

describe('stepVisitors', () => {
  it('is deterministic: same seeds and steps produce identical sessions', () => {
    const run = (): StudioSession => {
      let session: StudioSession = {
        ...baseSession(),
        tiers: { person: tierRow('person', true), household: tierRow('household', true) },
      };
      const ctx = ctxFor([GATE_YAKSA, TEACHER]);
      for (let i = 0; i < 30; i++) {
        session = stepVisitors(session, ctx, 1);
      }
      return session;
    };
    expect(run()).toEqual(run());
  });

  it('arrives within [cadence, cadence + jitter] for every seed tried', () => {
    for (const seed of ['s0', 's1', 's2', 's3', 's4', 's5', 's6', 's7']) {
      const arrival = ticksUntilArrival([GATE_YAKSA], seed, 'person');
      expect(arrival).toBeGreaterThanOrEqual(GATE_YAKSA.cadence_ticks);
      expect(arrival).toBeLessThanOrEqual(GATE_YAKSA.cadence_ticks + GATE_YAKSA.jitter_ticks);
    }
  });

  it('resets the counter and seats the visitor on arrival', () => {
    let session: StudioSession = {
      ...baseSession(),
      tiers: {
        person: tierRow('person', true),
        household: tierRow('household', true, { visitor_ticks: TEACHER.cadence_ticks - 1 }),
      },
    };
    session = stepVisitors(session, ctxFor([GATE_YAKSA, TEACHER]), 1);
    // TEACHER cadence 8, jitter 0: the 8th tick fires it on the household tier.
    expect(session.tiers['household']?.active_visitor).toEqual({
      id: 'visitor/traveling-teacher',
      windows_left: 2,
    });
    expect(session.tiers['household']?.visitor_ticks).toBe(0);
  });

  it('skips arrivals while a visitor is active but keeps accumulating', () => {
    const active: ActiveVisitor = { id: 'visitor/traveling-teacher', windows_left: 2 };
    let session: StudioSession = {
      ...baseSession(),
      tiers: {
        household: tierRow('household', true, { active_visitor: active, visitor_ticks: 3 }),
      },
    };
    session = stepVisitors(session, ctxFor([TEACHER, FESTIVAL]), 500);
    expect(session.tiers['household']?.active_visitor).toEqual(active);
    expect(session.tiers['household']?.visitor_ticks).toBe(503);
  });

  it('prefers the first eligible row in file order on a shared tick', () => {
    const both: Visitor = { ...TEACHER, id: 'visitor/aaa-first', cadence_ticks: 8 };
    let session: StudioSession = {
      ...baseSession(),
      tiers: { household: tierRow('household', true, { visitor_ticks: 7 }) },
    };
    session = stepVisitors(session, ctxFor([both, TEACHER]), 1);
    expect(session.tiers['household']?.active_visitor?.id).toBe('visitor/aaa-first');
  });

  it('matches rows to tiers by scale, not tier id', () => {
    let session: StudioSession = {
      ...baseSession(),
      tiers: {
        person: tierRow('person', true, { visitor_ticks: TEACHER.cadence_ticks }),
        household: tierRow('household', true, { visitor_ticks: TEACHER.cadence_ticks - 1 }),
      },
    };
    session = stepVisitors(session, ctxFor([TEACHER]), 1);
    expect(session.tiers['person']?.active_visitor).toBeNull();
    expect(session.tiers['household']?.active_visitor).not.toBeNull();
  });

  it('never touches locked tiers', () => {
    let session: StudioSession = {
      ...baseSession(),
      tiers: { household: tierRow('household', false, { visitor_ticks: 999 }) },
    };
    session = stepVisitors(session, ctxFor([TEACHER]), 10);
    expect(session.tiers['household']?.visitor_ticks).toBe(999);
    expect(session.tiers['household']?.active_visitor).toBeNull();
  });

  it('is a reference-preserving no-op with no rows or no ticks', () => {
    const session: StudioSession = {
      ...baseSession(),
      tiers: { person: tierRow('person', true) },
    };
    expect(stepVisitors(session, ctxFor([]), 10)).toBe(session);
    expect(stepVisitors(session, ctxFor([GATE_YAKSA]), 0)).toBe(session);
  });
});

/* ---- decay ------------------------------------------------------------------ */

describe('noteVisitorHarvest', () => {
  it('decrements windows and clears the seat at zero', () => {
    let session: StudioSession = {
      ...baseSession(),
      tiers: {
        person: tierRow('person', true, {
          active_visitor: { id: 'visitor/gate-yaksa', windows_left: 2 },
        }),
      },
    };
    session = noteVisitorHarvest(session, 'person');
    expect(session.tiers['person']?.active_visitor).toEqual({
      id: 'visitor/gate-yaksa',
      windows_left: 1,
    });
    session = noteVisitorHarvest(session, 'person');
    expect(session.tiers['person']?.active_visitor).toBeNull();
  });

  it('returns the input untouched when no visitor is seated', () => {
    const session: StudioSession = {
      ...baseSession(),
      tiers: { person: tierRow('person', true) },
    };
    expect(noteVisitorHarvest(session, 'person')).toBe(session);
  });
});

describe('activeVisitorFor', () => {
  it('reads the seated visitor or null', () => {
    const seated: StudioSession = {
      ...baseSession(),
      tiers: {
        person: tierRow('person', true, {
          active_visitor: { id: 'visitor/gate-yaksa', windows_left: 1 },
        }),
      },
    };
    expect(activeVisitorFor(seated, 'person')?.id).toBe('visitor/gate-yaksa');
    expect(activeVisitorFor(baseSession(), 'person')).toBeNull();
    expect(activeVisitorFor(baseSession(), 'missing-tier')).toBeNull();
  });
});

/* ---- modifier overlay ------------------------------------------------------- */

describe('visitorModifierOverlay', () => {
  it('folds the active row effects through the shared key mapping', (): void => {
    const overlay: BenchModifiers = visitorModifierOverlay([FESTIVAL], 'visitor/festival-day');
    expect(overlay.surplusRate).toBe(2);
    expect(overlay.cookSpeed).toBe(0);
  });

  it('is empty for null or unknown active ids', (): void => {
    expect(visitorModifierOverlay([FESTIVAL], null)).toEqual(EMPTY_BENCH_MODIFIERS);
    expect(visitorModifierOverlay([FESTIVAL], 'visitor/nobody')).toEqual(EMPTY_BENCH_MODIFIERS);
  });

  it('derives identical jitter to the documented seed formula', () => {
    // Black-box corroboration: the arrival tick equals cadence + the
    // memberSeed-derived jitter, for a row whose jitter window is [0, 4].
    const seed = 'seed-j';
    const arrival = ticksUntilArrival([GATE_YAKSA], seed, 'person');
    const expectedJitter = Number(
      memberSeed(seed, 'visitor:person:visitor/gate-yaksa') % BigInt(GATE_YAKSA.jitter_ticks + 1),
    );
    expect(arrival).toBe(GATE_YAKSA.cadence_ticks + expectedJitter);
  });
});

/* ---- table_ref catalog swap (Phase 4 Task 2) ----------------------------- */

const TABLE_REF_ROW: VisitorLike = {
  id: 'visitor/sample-arrival',
  tiers: ['person'],
  cadence_ticks: 10,
  jitter_ticks: 0,
  duration_windows: 2,
  table_ref: 'visitor-table/sample-arrival',
};

const SWAP_ENTRIES: readonly CatalogEntry[] = [
  {
    name: 'A guest-epoch card',
    one_liner: 'A card that did not come from the bench.',
    subject: 'a visitor-table card',
    detail: 'The card came from a visitor table, not the bench catalog.',
    tags: ['visitor', 'table'],
  },
  {
    name: 'A swap-flavored stamp',
    one_liner: 'A stamp that proves the table was swapped.',
    subject: 'a swap-stamp',
    detail: 'Whoever stamped it was clearly seated when the harvest happened.',
    tags: ['visitor', 'swap'],
  },
];

const BASE_CATALOG: CatalogMap = {
  thing: [
    {
      name: 'Base thing',
      one_liner: 'base',
      subject: 'base',
      detail: 'base',
      tags: ['base'],
    },
  ],
  outcome: [
    {
      name: 'Base outcome',
      one_liner: 'base',
      subject: 'base',
      detail: 'base',
      tags: ['base'],
    },
  ],
};

const VISITOR_TABLES: VisitorTablesView = {
  'visitor-table/sample-arrival': SWAP_ENTRIES,
};

describe('visitorTableOverride', () => {
  it('swaps every kind in the tier catalog for the visitor table when seated', () => {
    const result = visitorTableOverride(
      [TABLE_REF_ROW],
      'visitor/sample-arrival',
      VISITOR_TABLES,
      BASE_CATALOG,
    );
    expect(result['thing']).toBe(SWAP_ENTRIES);
    expect(result['outcome']).toBe(SWAP_ENTRIES);
    // Same reference seeded twice — the "whole pool" lives once.
    expect(result['thing']).toBe(result['outcome']);
  });

  it('returns the base catalog unchanged when no visitor is seated', () => {
    const result = visitorTableOverride([TABLE_REF_ROW], null, VISITOR_TABLES, BASE_CATALOG);
    expect(result).toBe(BASE_CATALOG);
  });

  it('returns the base catalog when the seated row has no table_ref', () => {
    const result = visitorTableOverride(
      [GATE_YAKSA],
      'visitor/gate-yaksa',
      VISITOR_TABLES,
      BASE_CATALOG,
    );
    expect(result).toBe(BASE_CATALOG);
  });

  it('falls back to the base catalog when the table_ref is missing from content', () => {
    const dangling: VisitorLike = {
      ...TABLE_REF_ROW,
      table_ref: 'visitor-table/not-shipped',
    };
    const result = visitorTableOverride(
      [dangling],
      'visitor/sample-arrival',
      VISITOR_TABLES,
      BASE_CATALOG,
    );
    expect(result).toBe(BASE_CATALOG);
  });

  it('falls back to the base catalog when visitorTables is undefined', () => {
    const result = visitorTableOverride(
      [TABLE_REF_ROW],
      'visitor/sample-arrival',
      undefined,
      BASE_CATALOG,
    );
    expect(result).toBe(BASE_CATALOG);
  });
});
