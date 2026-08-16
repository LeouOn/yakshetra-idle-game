// Roster runtime tests — Phase 1 Task 5.
//
// Covers the autonomous-member engine surface:
//   - memberSeed: deterministic, distinct per session/member pair
//   - createMemberLife: branded `member:<id>` life with the opaque default
//     identity fence (roster roles are assignments; identity is NEVER derived)
//   - runAutonomousMember: rebuilds a full LifeState from the stored slice and
//     drives it on the REAL tang-china pack's household schedule + practices
//     (loaded through the real content loader), emitting practice_tick /
//     practice_level residue and advancing the slice
//   - foldUpEvents: marks every cadence-th event with the member source id,
//     dedups, and carries the counter across calls
//   - swapEmbodiment: moves life + practices slices both directions, keeps at
//     most one embodied member, no-ops when stable, and null restores the
//     default person life
//
// Real-content fixtures follow the full-chain test precedent of importing
// `loadEraPack` from `@/content/loader`.

import { describe, expect, it } from 'vitest';

import { loadEraPack } from '@/content/loader';

import { createIdleState, createRng } from '../';
import type { EraId, Practice } from '../';
import { FOLD_IDS, createMemberLife, memberSeed, runAutonomousMember } from '../roster';
import { foldUpEvents, swapEmbodiment } from '../roster-fold';
import type { MemberSlice, StudioSession } from '../studio-session';
import { emptyHydratedSession, snapshotStudioSession } from '../studio-session';
import type { ResidueEvent } from '../residue';
import { createTierState } from '../tier-state';
import type { TierState } from '../tier-state';

// ---------------------------------------------------------------------------
// Real tang-china fixtures (household policy row: policy:household-base)
// ---------------------------------------------------------------------------

const ALMS = 'practice:tang/alms-round';
const COURTYARD = 'practice:tang/courtyard-beings';
const EXTRA_BOWL = 'practice:tang/extra-bowl';

function loadHouseholdFixtures(): {
  policyPractices: readonly Practice[];
  schedule: Parameters<typeof runAutonomousMember>[2];
  endings: Parameters<typeof runAutonomousMember>[3];
} {
  const pack = loadEraPack('tang-china');
  const runtime: Practice[] = pack.practices.map((p) => {
    const { minigame_id, ...rest } = p;
    return {
      ...rest,
      currentProgress: 0,
      level: 0,
      ...(minigame_id === undefined ? {} : { minigame_id }),
    };
  });
  const policyPractices: Practice[] = [];
  for (const id of [ALMS, COURTYARD, EXTRA_BOWL]) {
    const found = runtime.find((p) => p.id === id);
    if (found === undefined) {
      throw new Error(`tang pack is missing policy practice ${id}`);
    }
    policyPractices.push(found);
  }
  const schedule = pack.schedules.find((s) => s.id === 'schedule:household-morning');
  if (schedule === undefined) {
    throw new Error('tang pack is missing schedule:household-morning');
  }
  return { policyPractices, schedule, endings: pack.endings };
}

const { policyPractices, schedule, endings } = loadHouseholdFixtures();

/** A never-simulated member slice. */
function freshMember(): MemberSlice {
  return { life: { turn: 0, resources: {}, skills: {}, residue: [] }, practices: [] };
}

function practiceIn(slice: MemberSlice, id: string): { currentProgress: number; level: number } {
  const found = slice.practices.find((p) => p.id === id);
  if (found === undefined) {
    throw new Error(`slice is missing practice ${id}`);
  }
  return found;
}

// ---------------------------------------------------------------------------
// memberSeed
// ---------------------------------------------------------------------------

describe('memberSeed', () => {
  it('is deterministic for the same session seed and member id', () => {
    expect(memberSeed('studio-session-a', 'chen')).toBe(memberSeed('studio-session-a', 'chen'));
  });

  it('differs per member within one session', () => {
    expect(memberSeed('studio-session-a', 'chen')).not.toBe(memberSeed('studio-session-a', 'ruo'));
  });

  it('differs per session for the same member', () => {
    expect(memberSeed('studio-session-a', 'chen')).not.toBe(memberSeed('studio-session-b', 'chen'));
  });

  it('yields a bigint usable as an rng seed', () => {
    const seed = memberSeed('studio-session-a', 'chen');
    expect(typeof seed).toBe('bigint');
    expect(() => createRng(seed)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// FOLD_IDS
// ---------------------------------------------------------------------------

describe('FOLD_IDS', () => {
  it('builds member fold ids and names the person bench', () => {
    expect(FOLD_IDS.member('chen')).toBe('member:chen');
    expect(FOLD_IDS.bench).toBe('bench:person');
  });
});

// ---------------------------------------------------------------------------
// createMemberLife
// ---------------------------------------------------------------------------

describe('createMemberLife', () => {
  it('brands the life id as member:<id> and carries the era + role assignment', () => {
    const life = createMemberLife('chen', 'aunt', 'tang-china@0.1.0' as EraId, createRng(7n));
    expect(life.id).toBe('member:chen');
    expect(life.era).toBe('tang-china@0.1.0');
    expect(life.role).toBe('aunt');
  });

  it('pins the opaque default identity — the roster never derives identity', () => {
    const life = createMemberLife('chen', 'aunt', 'tang-china@0.1.0' as EraId, createRng(7n));
    expect(life.identity).toEqual({
      gender: 'unspecified',
      social_class: 'household',
      family_wealth_at_birth: 'unspecified',
      caste_status: 'none',
      disability_status: 'none',
    });
  });
});

// ---------------------------------------------------------------------------
// runAutonomousMember
// ---------------------------------------------------------------------------

describe('runAutonomousMember', () => {
  it('advances policy practices and folds their effects over one household day', () => {
    // 24 ticks = one day on schedule:household-morning:
    //   alms-round 3h x 0.5, courtyard-beings 3h x 0.4, extra-bowl 3h x 0.45,
    //   each practice adds +1 trust per active tick.
    const out = runAutonomousMember(
      freshMember(),
      policyPractices,
      schedule,
      endings,
      24n,
      createRng(memberSeed('studio-session-a', 'chen')),
    );
    expect(out.life.turn).toBe(24);
    // Base time 100 - 24 ticks = 76; base trust 10 + 9 active ticks = 19.
    expect(out.life.resources.time).toBe(76);
    expect(out.life.resources.trust).toBe(19);
    expect(practiceIn(out, ALMS).currentProgress).toBe(1.5);
    expect(practiceIn(out, ALMS).level).toBe(0);
    expect(practiceIn(out, COURTYARD).currentProgress).toBeCloseTo(1.2, 10);
    expect(practiceIn(out, EXTRA_BOWL).currentProgress).toBeCloseTo(1.35, 10);
  });

  it('emits practice_tick residue stamped at the member tick', () => {
    const out = runAutonomousMember(
      freshMember(),
      policyPractices,
      schedule,
      endings,
      24n,
      createRng(memberSeed('studio-session-a', 'chen')),
    );
    const ticks = out.life.residue.filter((e) => e.type === 'practice_tick');
    expect(ticks.map((e) => e.ids[0])).toEqual([ALMS, COURTYARD, EXTRA_BOWL]);
    expect(ticks.every((e) => e.tick === 24)).toBe(true);
  });

  it('levels up a practice past its maxProgress and records practice_level residue', () => {
    // 168 ticks = 7 days: alms gains 21 x 0.5 = 10.5 -> level 1 @ 0.5.
    const out = runAutonomousMember(
      freshMember(),
      policyPractices,
      schedule,
      endings,
      168n,
      createRng(memberSeed('studio-session-a', 'chen')),
    );
    expect(out.life.turn).toBe(168);
    expect(practiceIn(out, ALMS).level).toBe(1);
    expect(practiceIn(out, ALMS).currentProgress).toBe(0.5);
    expect(practiceIn(out, EXTRA_BOWL).level).toBe(1); // 21 x 0.45 >= 9
    expect(practiceIn(out, COURTYARD).level).toBe(0); // 21 x 0.4 = 8.4 < 9
    const levels = out.life.residue.filter((e) => e.type === 'practice_level');
    expect(levels.some((e) => e.ids[0] === ALMS)).toBe(true);
  });

  it('resumes from a returned slice and keeps accumulating', () => {
    const first = runAutonomousMember(
      freshMember(),
      policyPractices,
      schedule,
      endings,
      24n,
      createRng(memberSeed('studio-session-a', 'chen')),
    );
    const second = runAutonomousMember(
      first,
      policyPractices,
      schedule,
      endings,
      24n,
      createRng(memberSeed('studio-session-a', 'chen')),
    );
    expect(second.life.turn).toBe(48);
    expect(practiceIn(second, ALMS).currentProgress).toBe(3);
    expect(second.life.residue.some((e) => e.type === 'practice_tick' && e.tick === 48)).toBe(true);
  });

  it('is deterministic for the same member seed', () => {
    const run = (): MemberSlice =>
      runAutonomousMember(
        freshMember(),
        policyPractices,
        schedule,
        endings,
        24n,
        createRng(memberSeed('studio-session-a', 'chen')),
      );
    expect(run()).toEqual(run());
  });
});

// ---------------------------------------------------------------------------
// foldUpEvents
// ---------------------------------------------------------------------------

function foldEvents(n: number): ResidueEvent[] {
  const out: ResidueEvent[] = [];
  for (let i = 0; i < n; i++) {
    out.push({ tick: i + 1, type: 'practice_tick', ids: ['p'], numbers: {} });
  }
  return out;
}

describe('foldUpEvents', () => {
  it('marks every 4th event (1-based) and returns the advanced counter', () => {
    const events = foldEvents(6);
    const { events: out, nextCounter } = foldUpEvents(events, 'member:chen', 4, 0);
    expect(nextCounter).toBe(6);
    expect(out[3]?.ids).toEqual(['p', 'member:chen']);
    for (const i of [0, 1, 2, 4, 5]) {
      expect(out[i]?.ids).toEqual(['p']);
    }
  });

  it('carries the counter across calls so the cadence stays global', () => {
    const first = foldUpEvents(foldEvents(6), 'member:chen', 4, 0);
    expect(first.nextCounter).toBe(6);
    const second = foldUpEvents(foldEvents(6), 'member:chen', 4, first.nextCounter);
    // Ordinals 7..12: the 8th (index 1) and the 12th (index 5) are multiples of 4.
    expect(second.events[1]?.ids).toEqual(['p', 'member:chen']);
    expect(second.events[5]?.ids).toEqual(['p', 'member:chen']);
    for (const i of [0, 2, 3, 4]) {
      expect(second.events[i]?.ids.includes('member:chen')).toBe(false);
    }
    expect(second.nextCounter).toBe(12);
  });

  it('leaves unmarked events untouched by reference', () => {
    const events = foldEvents(6);
    const { events: out } = foldUpEvents(events, 'member:chen', 4, 0);
    expect(out[0]).toBe(events[0]);
    expect(out[5]).toBe(events[5]);
  });

  it('never duplicates an id the event already carries', () => {
    const events: ResidueEvent[] = [
      { tick: 4, type: 'practice_tick', ids: ['p', 'member:chen'], numbers: {} },
    ];
    const { events: out } = foldUpEvents(events, 'member:chen', 1, 0);
    expect(out[0]?.ids).toEqual(['p', 'member:chen']);
  });

  it('marks every event at cadence 1', () => {
    const { events: out, nextCounter } = foldUpEvents(foldEvents(3), 'member:ruo', 1, 0);
    expect(out.every((e) => e.ids.includes('member:ruo'))).toBe(true);
    expect(nextCounter).toBe(3);
  });

  it('rejects a non-positive cadence', () => {
    expect(() => foldUpEvents([], 'member:chen', 0, 0)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// swapEmbodiment
// ---------------------------------------------------------------------------

const householdTier: TierState = {
  schema_version: 'tier_state/v0',
  tier: 'household',
  unlocked: true,
  roster: {
    tier: 'household',
    members: [
      {
        id: 'chen',
        name: 'Chen',
        role: 'aunt',
        policy: 'policy:household-base',
        embodied: false,
        seed: 11,
      },
      {
        id: 'ruo',
        name: 'Ruo',
        role: 'cousin',
        policy: 'policy:household-base',
        embodied: false,
        seed: 22,
      },
    ],
  },
  endowed: [],
  active_visitor: null,
};

function memberSlice(turn: number, gold: number, practiceId: string): MemberSlice {
  return {
    life: { turn, resources: { gold }, skills: {}, residue: [] },
    practices: [{ id: practiceId, currentProgress: 0.5, level: 1 }],
  };
}

function makeSession(): StudioSession {
  const base = emptyHydratedSession();
  return snapshotStudioSession(
    base.studio,
    createIdleState(),
    base.life,
    [],
    undefined,
    {
      tiers: { person: createTierState('person', true), household: householdTier },
      milestones_done: [],
      compendium_done: [],
      embodied_member: null,
    },
    {
      members: {
        chen: memberSlice(3, 5, ALMS),
        ruo: memberSlice(8, 9, COURTYARD),
      },
    },
  );
}

describe('swapEmbodiment', () => {
  it('moves the member slice into the person slot and the default life out', () => {
    const session = swapEmbodiment(makeSession(), 'chen');
    expect(session.embodied_member).toEqual({ tier: 'household', member: 'chen' });
    expect(session.life.turn).toBe(3);
    expect(session.life.resources.gold).toBe(5);
    expect(session.members['chen']?.life.turn).toBe(0);
    expect(session.practices.map((p) => p.id)).toEqual([ALMS]);
    expect(session.members['chen']?.practices.map((p) => p.id)).toEqual([]);
    const rows = session.tiers['household']?.roster.members ?? [];
    expect(rows.find((m) => m.id === 'chen')?.embodied).toBe(true);
    expect(rows.find((m) => m.id === 'ruo')?.embodied).toBe(false);
  });

  it('is a reference-equal no-op when the member is already embodied', () => {
    const embodied = swapEmbodiment(makeSession(), 'chen');
    expect(swapEmbodiment(embodied, 'chen')).toBe(embodied);
  });

  it('is a reference-equal no-op when null is requested with nobody embodied', () => {
    const session = makeSession();
    expect(swapEmbodiment(session, null)).toBe(session);
  });

  it('rotates to a second member and keeps exactly one embodied', () => {
    const embodied = swapEmbodiment(makeSession(), 'chen');
    const rotated = swapEmbodiment(embodied, 'ruo');
    expect(rotated.embodied_member).toEqual({ tier: 'household', member: 'ruo' });
    expect(rotated.life.turn).toBe(8);
    expect(rotated.members['ruo']?.life.turn).toBe(0); // default life moved to ruo
    expect(rotated.members['chen']?.life.turn).toBe(3); // chen restored
    expect(rotated.practices.map((p) => p.id)).toEqual([COURTYARD]);
    const rows = rotated.tiers['household']?.roster.members ?? [];
    expect(rows.filter((m) => m.embodied).map((m) => m.id)).toEqual(['ruo']);
  });

  it('null restores the default person life and clears every flag', () => {
    const embodied = swapEmbodiment(makeSession(), 'chen');
    const restored = swapEmbodiment(embodied, null);
    expect(restored.embodied_member).toBeNull();
    expect(restored.life.turn).toBe(0);
    expect(restored.members['chen']?.life.turn).toBe(3);
    expect(restored.members['chen']?.practices.map((p) => p.id)).toEqual([ALMS]);
    const rows = restored.tiers['household']?.roster.members ?? [];
    expect(rows.every((m) => !m.embodied)).toBe(true);
  });

  it('throws on an unknown member id', () => {
    expect(() => swapEmbodiment(makeSession(), 'ghost')).toThrow();
  });
});
