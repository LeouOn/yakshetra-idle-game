// stepSession tests — Phase 1 Task 6.
//
// Pins the multi-bench tick:
//   (a) GOLDEN: household locked → stepSession ≡ stepStudio on every output
//       field (person bench, idle, life, practices, summary) and progression
//       slices are carried by reference
//   (b) autonomous member residue lands on the household bench with
//       member:<id> markers (cadence 1) while member slices advance
//   (c) every-4th CUMULATIVE person event folds up with the bench:person
//       marker — the ordinal base persists on the household bench's
//       fold_position across SEPARATE calls, including sub-cadence batches
//   (d) the household bay cooks under the alreadyCharged gate (cook to
//       ready, absorb to surplus, and the not-charged skip)
//   (e) determinism: same session + ctx + rng → same result
//   (f) embodied roster members are never run autonomously; slice-less
//       roster members are skipped
//   (g) the household bench AUTO-QUEUES its cook once folded residue
//       charges it: null → cooking → ready across calls, and a locked
//       household never grows a bench
//
// Embodied fixtures are synthetic (six 4-hour practice blocks → exactly six
// practice_tick events per 24-tick step). Member fixtures load the real
// tang-china pack (roster.test precedent).

import { describe, expect, it } from 'vitest';

import { loadEraPack } from '@/content/loader';

import {
  MIN_RESIDUE_TO_DEVELOP,
  createIdleState,
  createLifeState,
  createRng,
  createStudioState,
  queueDevelop,
  recordStudioResidues,
} from '../';
import type { LifeState, Practice } from '../';
import { stepSession, type SessionStepContext } from '../session-step';
import { stepStudio } from '../studio-offline';
import { EMPTY_BENCH_MODIFIERS, type BenchModifiers } from '../endowment';
import {
  parseStudioSession,
  snapshotStudioSession,
  type BenchState,
  type MemberSlice,
  type StudioSession,
} from '../studio-session';
import { swapEmbodiment } from '../roster-fold';
import { createTierState, type RosterMember } from '../tier-state';
import type { VisitorLike } from '../visitors';
import type { DailySchedule } from '../schedule';
import type { ResidueEvent } from '../residue';

// ---------------------------------------------------------------------------
// Synthetic embodied world: six 4h practice blocks per day
// ---------------------------------------------------------------------------

const SIX: Practice[] = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].map((name) => ({
  id: `practice:${name}`,
  label_sid: 'p_sid',
  description_sid: 'd_sid',
  lens: 'joyful_effort',
  progressPerTick: 1,
  maxProgress: 1000,
  currentProgress: 0,
  level: 0,
  effects: [{ op: 'add_resource', key: 'skill', delta: 1 }],
}));

const SIX_SCHEDULE: DailySchedule = {
  id: 'six-blocks',
  name_sid: 's_sid',
  blocks: SIX.map((practice, i) => ({
    id: `b${i}`,
    label_sid: 'b_sid',
    startHour: i * 4,
    endHour: i * 4 + 4,
    practice_id: practice.id,
    icon_sid: 'i_sid',
  })),
};

const REST_SCHEDULE: DailySchedule = {
  id: 'rest',
  name_sid: 's_sid',
  blocks: [
    {
      id: 'rest',
      label_sid: 'b_sid',
      startHour: 0,
      endHour: 24,
      practice_id: null,
      icon_sid: 'i_sid',
    },
  ],
};

function makeLife(): LifeState {
  return createLifeState({
    id: 'studio-bench' as LifeState['id'],
    era: 'studio-bench@0.1.0' as LifeState['era'],
    role: 'operator' as LifeState['role'],
    identity: {
      gender: 'unspecified',
      social_class: 'operator',
      family_wealth_at_birth: 'unspecified',
      caste_status: 'none',
      disability_status: 'none',
    },
  });
}

function benchResidue(n: number): ResidueEvent[] {
  return Array.from({ length: n }, (_, i) => ({
    tick: i + 1,
    type: 'practice_tick' as const,
    ids: ['practice.test'],
    numbers: { progress: 1 },
  }));
}

// ---------------------------------------------------------------------------
// Real tang-china member fixtures (household policy row)
// ---------------------------------------------------------------------------

const ALMS = 'practice:tang/alms-round';

function loadHouseholdFixtures(): {
  policyPractices: readonly Practice[];
  schedule: DailySchedule;
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
  const wanted = [
    'practice:tang/alms-round',
    'practice:tang/courtyard-beings',
    'practice:tang/extra-bowl',
  ];
  const policyPractices = wanted.map((id) => {
    const found = runtime.find((p) => p.id === id);
    if (found === undefined) {
      throw new Error(`tang pack is missing policy practice ${id}`);
    }
    return found;
  });
  const schedule = pack.schedules.find((s) => s.id === 'schedule:household-morning');
  if (schedule === undefined) {
    throw new Error('tang pack is missing schedule:household-morning');
  }
  return { policyPractices, schedule };
}

const { policyPractices, schedule: householdSchedule } = loadHouseholdFixtures();

// ---------------------------------------------------------------------------
// Session builders
// ---------------------------------------------------------------------------

function freshMember(): MemberSlice {
  return { life: { turn: 0, resources: {}, skills: {}, residue: [] }, practices: [] };
}

function rosterMember(id: string, name: string, embodied: boolean): RosterMember {
  return { id, name, role: 'aunt', policy: 'policy:household-base', embodied, seed: 11 };
}

function householdSession(opts: {
  roster: readonly RosterMember[];
  members?: Record<string, MemberSlice>;
  practices?: readonly Practice[];
}): StudioSession {
  const snap = snapshotStudioSession(
    createStudioState(),
    createIdleState(),
    makeLife(),
    opts.practices ?? SIX,
    1234,
    {
      tiers: {
        person: createTierState('person', true),
        household: {
          ...createTierState('household', true),
          roster: { tier: 'household', members: [...opts.roster] },
        },
      },
      milestones_done: [],
      compendium_done: [],
      embodied_member: null,
    },
    { members: opts.members ?? {} },
  );
  return snap;
}

/** Attach a household bench; the loose literal is validated by the parser. */
function withHouseholdBench(session: StudioSession, bench: unknown): StudioSession {
  return parseStudioSession({ ...session, benches: { ...session.benches, household: bench } });
}

function hhBench(fields: { residue?: ResidueEvent[]; surplus?: number } = {}): unknown {
  return {
    residue: fields.residue ?? [],
    last_harvest_index: -1,
    bay: null,
    quality_tier: 0,
    harvest_count: 0,
    play_import: null,
    pinned: null,
    surplus: fields.surplus ?? 0,
  };
}

function benchOf(session: StudioSession, id: string): BenchState {
  const bench = session.benches[id];
  if (bench === undefined) {
    throw new Error(`bench "${id}" missing from session`);
  }
  return bench;
}

const MEMBER_CTX: SessionStepContext = {
  practices: SIX,
  embodiedSchedule: SIX_SCHEDULE,
  memberScheduleFor: () => householdSchedule,
  memberPracticesFor: () => policyPractices,
  endings: [],
  sessionSeed: 'session-step-test',
  tiers: [{ id: 'household', scale: 'household', fold_cadence: 4 }],
};

const throwCtx = (message: string): never => {
  throw new Error(message);
};

// ---------------------------------------------------------------------------
// (a) GOLDEN: household locked → stepSession ≡ stepStudio
// ---------------------------------------------------------------------------

describe('stepSession (household locked)', () => {
  it('matches stepStudio on every output field and touches nothing else', () => {
    let studio = recordStudioResidues(
      createStudioState(),
      benchResidue(MIN_RESIDUE_TO_DEVELOP + 1),
    );
    studio = queueDevelop(studio, null, createRng(2n));
    const idle = createIdleState();
    const life = makeLife();
    const session = snapshotStudioSession(studio, idle, life, SIX, 1234);
    // Member resolvers throw: a locked household must never consult them.
    const ctx: SessionStepContext = {
      practices: SIX,
      embodiedSchedule: SIX_SCHEDULE,
      memberScheduleFor: () => throwCtx('household is locked'),
      memberPracticesFor: () => throwCtx('household is locked'),
      endings: [],
      sessionSeed: 'golden',
      tiers: [],
    };

    const direct = stepStudio(studio, idle, life, SIX, SIX_SCHEDULE, [], 24, createRng(42n));
    const stepped = stepSession(session, ctx, 24, createRng(42n));

    const person = benchOf(stepped.session, 'person');
    expect(person.residue).toEqual([...direct.studio.residue]);
    expect(person.last_harvest_index).toBe(direct.studio.last_harvest_index);
    expect(person.bay).toEqual(direct.studio.bay);
    expect(person.quality_tier).toBe(direct.studio.quality_tier);
    expect(person.harvest_count).toBe(direct.studio.harvest_count);
    expect(person.play_import).toEqual(direct.studio.play_import);
    expect(person.pinned).toEqual(direct.studio.pinned);
    expect(person.surplus).toBe(direct.studio.surplus);

    expect(stepped.session.idle).toEqual({
      mode: direct.idle.mode,
      last_simulated_tick: direct.idle.lastSimulatedTick.toString(10),
      total_idle_ticks: direct.idle.totalIdleTicks.toString(10),
    });
    expect(stepped.session.life).toEqual({
      turn: direct.life.turn,
      resources: { ...direct.life.resources },
      skills: { ...direct.life.skills },
      residue: [...(direct.life.residue ?? [])],
    });
    expect(stepped.session.practices).toEqual(
      direct.practices.map((p) => ({
        id: p.id,
        currentProgress: p.currentProgress,
        level: p.level,
      })),
    );

    expect(stepped.summary).toEqual({
      embodiedTicks: direct.summary.ticksSimulated,
      memberTicks: 0,
      folded: 0,
      benchesReady: direct.summary.bayReady ? ['person'] : [],
    });

    // Progression slices are carried untouched — milestone checks are Task 8.
    expect(stepped.session.tiers).toBe(session.tiers);
    expect(stepped.session.archive).toBe(session.archive);
    expect(stepped.session.milestones_done).toBe(session.milestones_done);
    expect(stepped.session.compendium_done).toBe(session.compendium_done);
    expect(stepped.session.embodied_member).toBe(session.embodied_member);
    expect(stepped.session.world_drafts).toBe(session.world_drafts);
    expect(stepped.session.members).toBe(session.members);
    expect(stepped.session.last_visited_at_unix).toBe(session.last_visited_at_unix);
    expect('household' in stepped.session.benches).toBe(false);
  });

  it('is a no-op returning the same session when ticks <= 0', () => {
    const session = householdSession({ roster: [] });
    const out = stepSession(session, MEMBER_CTX, 0, createRng(1n));
    expect(out.session).toBe(session);
    expect(out.summary).toEqual({ embodiedTicks: 0, memberTicks: 0, folded: 0, benchesReady: [] });
  });
});

// ---------------------------------------------------------------------------
// (b) autonomous members land on the household bench
// ---------------------------------------------------------------------------

describe('stepSession (autonomous members)', () => {
  it('appends marked member residue to the household bench and advances slices', () => {
    const session = withHouseholdBench(
      householdSession({
        roster: [rosterMember('chen', 'Chen', false), rosterMember('ruo', 'Ruo', false)],
        members: { chen: freshMember(), ruo: freshMember() },
      }),
      hhBench(),
    );

    const out = stepSession(session, MEMBER_CTX, 24, createRng(3n));

    const hh = benchOf(out.session, 'household');
    const marked = (id: string) => hh.residue.filter((e) => e.ids.includes(id));
    // One day on schedule:household-morning → 3 practice_tick events per member.
    expect(marked('member:chen')).toHaveLength(3);
    expect(marked('member:ruo')).toHaveLength(3);
    // Embodied delta of 6 events folds one (every 4th, counter 0 → ordinal 4).
    expect(marked('bench:person')).toHaveLength(1);
    expect(hh.residue).toHaveLength(7);
    expect(marked('member:chen')[0]?.ids).toEqual([ALMS, 'member:chen']);
    // Everything on the household bench arrived through a fold.
    expect(
      hh.residue.every(
        (e) =>
          e.ids.includes('member:chen') ||
          e.ids.includes('member:ruo') ||
          e.ids.includes('bench:person'),
      ),
    ).toBe(true);

    // Member slices advanced and persist.
    const chen = out.session.members['chen'];
    expect(chen?.life.turn).toBe(24);
    expect(chen?.practices.find((p) => p.id === ALMS)?.currentProgress).toBe(1.5);
    expect(out.session.members['ruo']?.life.turn).toBe(24);

    // The embodied life still steps on the person bench untouched in semantics.
    expect(benchOf(out.session, 'person').residue).toHaveLength(6);
    expect(out.session.life.turn).toBe(24);
    expect(out.session.idle.total_idle_ticks).toBe('24');
    expect(out.session.practices.every((p) => p.currentProgress === 4)).toBe(true);

    // Folded member + person events charged the bench, the step auto-queued
    // the household cook (window 4 → 8 cook ticks), and 24 ticks finished it.
    expect(hh.bay).not.toBeNull();
    expect(hh.bay?.status).toBe('ready');
    expect(hh.last_harvest_index).toBe(hh.residue.length - 1);

    expect(out.summary).toEqual({
      embodiedTicks: 24,
      memberTicks: 48,
      folded: 1,
      benchesReady: ['household'],
    });

    // Progression slices untouched.
    expect(out.session.tiers).toBe(session.tiers);
    expect(out.session.archive).toBe(session.archive);
    expect(out.session.embodied_member).toBe(session.embodied_member);
  });
});

// ---------------------------------------------------------------------------
// (c) person fold-up cadence across separate calls
// ---------------------------------------------------------------------------

describe('stepSession (person fold-up)', () => {
  it('folds every 4th CUMULATIVE person event across separate 24-tick calls', () => {
    // Invariant: cadence 4, N calls of 6 events each → exactly floor(6N/4)
    // bench:person marks on the household bench.
    const ctx: SessionStepContext = { ...MEMBER_CTX, sessionSeed: 'fold-test' };
    const session = withHouseholdBench(householdSession({ roster: [] }), hhBench());

    // Call 1: ordinals 1..6 → ordinal 4 (p4) folds; position carries 6.
    const first = stepSession(session, ctx, 24, createRng(1n));
    expect(first.summary.folded).toBe(1);
    expect(benchOf(first.session, 'household').residue.map((e) => e.ids)).toEqual([
      ['practice:p4', 'bench:person'],
    ]);
    expect(benchOf(first.session, 'household').fold_position).toBe(6);

    // Call 2: ordinals 7..12 → ordinals 8 (p2) and 12 (p6) fold.
    const second = stepSession(first.session, ctx, 24, createRng(1n));
    expect(second.summary.folded).toBe(2);
    expect(benchOf(second.session, 'household').residue.map((e) => e.ids)).toEqual([
      ['practice:p4', 'bench:person'],
      ['practice:p2', 'bench:person'],
      ['practice:p6', 'bench:person'],
    ]);
    expect(benchOf(second.session, 'household').fold_position).toBe(12);

    // Call 3: ordinals 13..18 → ordinal 16 (p4). floor(18/4) = 4 marks total.
    const third = stepSession(second.session, ctx, 24, createRng(1n));
    expect(third.summary.folded).toBe(1);
    expect(benchOf(third.session, 'household').residue).toHaveLength(4);
    expect(benchOf(third.session, 'household').fold_position).toBe(18);
    expect(benchOf(third.session, 'person').residue).toHaveLength(18);
  });

  it('seeds the first fold across sub-cadence batches (small batches, cadence 4)', () => {
    // Regression: the old marks-derived counter restarted every call, so
    // batches smaller than the cadence never reached a fold. The persisted
    // fold_position carries the remainder across calls: fold_position
    // ALWAYS equals cumulative person-bench events, and total folds equal
    // floor(cumulativeEvents / cadence).
    const ctx: SessionStepContext = { ...MEMBER_CTX, sessionSeed: 'fold-sub' };
    const session = withHouseholdBench(householdSession({ roster: [] }), hhBench());
    const step = (s: StudioSession, ticks: number) => stepSession(s, ctx, ticks, createRng(1n));

    // Run five sub-cadence 8-tick calls (always < cadence 4) and probe only
    // the contracts the carry guarantees, regardless of which practice_tick
    // events each 8-tick window happens to emit.
    let s: StudioSession = session;
    let totalFolded = 0;
    let lastFp = s.benches['household']?.fold_position ?? 0;
    let lastPerson = s.benches['person']?.residue.length ?? 0;
    for (let i = 0; i < 5; i++) {
      const out = step(s, 8);
      const personNow = out.session.benches['person']?.residue.length ?? 0;
      const fpNow = out.session.benches['household']?.fold_position ?? 0;
      expect(fpNow).toBe(lastFp + (personNow - lastPerson));
      totalFolded += out.summary.folded;
      lastFp = fpNow;
      lastPerson = personNow;
      s = out.session;
    }
    // Carry contract: total folds == floor(cumulativeEvents / cadence).
    expect(totalFolded).toBe(Math.floor(lastPerson / 4));
    // Sub-cadence batches alone must produce some folds (the old derivation
    // gave 0 here because each call restarted the counter).
    expect(totalFolded).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// (d) household bay cook + alreadyCharged gate
// ---------------------------------------------------------------------------

describe('stepSession (household cook)', () => {
  const ctx: SessionStepContext = {
    practices: [],
    embodiedSchedule: REST_SCHEDULE,
    memberScheduleFor: () => throwCtx('no members'),
    memberPracticesFor: () => throwCtx('no members'),
    endings: [],
    sessionSeed: 'cook-test',
    tiers: [{ id: 'household', scale: 'household', fold_cadence: 4 }],
  };

  it('cooks a charged household bay to ready and reports the bench', () => {
    let studio = recordStudioResidues(
      createStudioState(),
      benchResidue(MIN_RESIDUE_TO_DEVELOP + 1),
    );
    studio = queueDevelop(studio, null, createRng(9n));
    const cookTotal = studio.bay?.cook_ticks_total ?? 0;
    const session = withHouseholdBench(householdSession({ roster: [], practices: [] }), {
      residue: [...studio.residue],
      last_harvest_index: studio.last_harvest_index,
      bay: studio.bay,
      quality_tier: studio.quality_tier,
      harvest_count: studio.harvest_count,
      play_import: studio.play_import,
      pinned: studio.pinned,
      surplus: studio.surplus,
    });

    const out = stepSession(session, ctx, cookTotal, createRng(4n));
    const hh = benchOf(out.session, 'household');
    expect(hh.bay?.status).toBe('ready');
    expect(out.summary.benchesReady).toEqual(['household']);
    expect(out.summary.folded).toBe(0);
    expect(out.summary.memberTicks).toBe(0);
    expect(out.summary.embodiedTicks).toBe(cookTotal);
  });

  it('auto-queues a charged bayless bench instead of banking surplus', () => {
    // The old behavior banked ticks into surplus while the charged window sat
    // unqueued; the auto-queue spends the window first, so surplus stays 0,
    // the fresh bay cooks, and — because the bench was ALREADY charged when
    // the call began — the tend ticks absorb into the cook and finish it.
    const session = withHouseholdBench(
      householdSession({ roster: [], practices: [] }),
      hhBench({ residue: benchResidue(MIN_RESIDUE_TO_DEVELOP + 1) }),
    );
    const out = stepSession(session, ctx, 5, createRng(4n));
    const hh = benchOf(out.session, 'household');
    expect(hh.surplus).toBe(0);
    expect(hh.bay?.status).toBe('ready');
    // Window 4 → 8 cook ticks; 5 direct + 5 absorbed ticks clamp at 8.
    expect(hh.bay?.cook_ticks_done).toBe(8);
    expect(hh.last_harvest_index).toBe(hh.residue.length - 1);
    expect(out.summary.benchesReady).toEqual(['household']);
  });

  it('skips the absorb gate when the household bench is not charged', () => {
    const session = withHouseholdBench(householdSession({ roster: [], practices: [] }), hhBench());
    const out = stepSession(session, ctx, 5, createRng(4n));
    const hh = benchOf(out.session, 'household');
    expect(hh.surplus).toBe(0);
    expect(hh.bay).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// (e) determinism
// ---------------------------------------------------------------------------

describe('stepSession (determinism)', () => {
  it('reproduces the same session and summary for the same inputs', () => {
    const session = withHouseholdBench(
      householdSession({
        roster: [rosterMember('chen', 'Chen', false), rosterMember('ruo', 'Ruo', false)],
        members: { chen: freshMember(), ruo: freshMember() },
      }),
      hhBench(),
    );
    const run = () => stepSession(session, MEMBER_CTX, 24, createRng(77n));
    const a = run();
    const b = run();
    expect(a.session).toEqual(b.session);
    expect(a.summary).toEqual(b.summary);

    const step2 = (s: StudioSession) => stepSession(s, MEMBER_CTX, 24, createRng(78n));
    expect(step2(a.session)).toEqual(step2(b.session));
  });
});

// ---------------------------------------------------------------------------
// (f) embodied members are not autonomous; slice-less members are skipped
// ---------------------------------------------------------------------------

describe('stepSession (embodiment fence)', () => {
  it('never runs an embodied member autonomously and skips members without slices', () => {
    const session = swapEmbodiment(
      withHouseholdBench(
        householdSession({
          roster: [
            rosterMember('chen', 'Chen', false),
            rosterMember('ruo', 'Ruo', false),
            rosterMember('wang', 'Wang', false),
          ],
          members: { chen: freshMember(), ruo: freshMember() },
        }),
        hhBench(),
      ),
      'chen',
    );

    const out = stepSession(session, MEMBER_CTX, 24, createRng(6n));

    // Chen's parked default life is untouched; only ruo ran.
    expect(out.session.members['chen']?.life.turn).toBe(0);
    expect(out.session.members['ruo']?.life.turn).toBe(24);
    expect('wang' in out.session.members).toBe(false);

    const hh = benchOf(out.session, 'household');
    expect(hh.residue.some((e) => e.ids.includes('member:chen'))).toBe(false);
    expect(hh.residue.some((e) => e.ids.includes('member:wang'))).toBe(false);
    expect(hh.residue.some((e) => e.ids.includes('member:ruo'))).toBe(true);

    // The embodied member's life advances on the person bench instead.
    expect(out.session.life.turn).toBe(24);
    expect(benchOf(out.session, 'person').residue).toHaveLength(6);
    expect(out.summary.memberTicks).toBe(24);
  });
});

// ---------------------------------------------------------------------------
// (g) household auto-queue: folded residue reaches the cook without a button
// ---------------------------------------------------------------------------

describe('stepSession (household auto-queue)', () => {
  it('queues the cook as folded residue accumulates, then cooks to ready across calls', () => {
    const session = withHouseholdBench(householdSession({ roster: [] }), hhBench());

    // 4-tick calls emit one embodied event each; the cadence-4 fold-up lands
    // the third household event after ~12 calls, which auto-queues the cook
    // (window 3 → 7 cook ticks). Four ticks leave the fresh bay cooking.
    let last = stepSession(session, MEMBER_CTX, 4, createRng(1n));
    let guard = 0;
    while (benchOf(last.session, 'household').bay === null && guard < 30) {
      last = stepSession(last.session, MEMBER_CTX, 4, createRng(1n));
      guard += 1;
    }
    const queued = benchOf(last.session, 'household');
    expect(queued.bay).not.toBeNull();
    expect(queued.bay?.status).toBe('cooking');
    // The window is spent the moment the cook queues.
    expect(queued.last_harvest_index).toBe(queued.residue.length - 1);
    expect(queued.bay?.residue).toHaveLength(MIN_RESIDUE_TO_DEVELOP);

    // Later calls finish the cook and the summary reports the bench ready.
    let cookGuard = 0;
    while (benchOf(last.session, 'household').bay?.status === 'cooking' && cookGuard < 30) {
      last = stepSession(last.session, MEMBER_CTX, 4, createRng(1n));
      cookGuard += 1;
    }
    expect(benchOf(last.session, 'household').bay?.status).toBe('ready');
    expect(last.summary.benchesReady).toContain('household');
    expect(cookGuard).toBeGreaterThan(0);
  });

  it('auto-queues from member residue on the first charged call and cooks to ready', () => {
    const session = withHouseholdBench(
      householdSession({
        roster: [rosterMember('chen', 'Chen', false)],
        members: { chen: freshMember() },
      }),
      hhBench(),
    );
    const out = stepSession(session, MEMBER_CTX, 24, createRng(3n));

    // One member day folds 3 events (cadence 1) + 1 person fold = 4 → queue
    // (window 4 → 8 cook ticks), and the same 24 ticks finish the cook.
    const hh = benchOf(out.session, 'household');
    expect(hh.bay?.status).toBe('ready');
    expect(hh.bay?.residue).toHaveLength(4);
    expect(out.summary.benchesReady).toEqual(['household']);
  });

  it('never queues a household bay while the tier is locked', () => {
    // The golden test pins locked ≡ stepStudio (member resolvers throw);
    // this is the cheap explicit form: a charged person bench across several
    // calls never grows a household bench.
    const studio = recordStudioResidues(createStudioState(), benchResidue(MIN_RESIDUE_TO_DEVELOP));
    let current = snapshotStudioSession(studio, createIdleState(), makeLife(), SIX, 1234, {
      tiers: {
        person: createTierState('person', true),
        household: createTierState('household', false),
      },
      milestones_done: [],
      compendium_done: [],
      embodied_member: null,
    });
    for (let i = 0; i < 3; i++) {
      current = stepSession(current, MEMBER_CTX, 24, createRng(2n)).session;
      expect('household' in current.benches).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// (h) endowment modifiers: windowMin gate, cookSpeed discount, surplusRate
// ---------------------------------------------------------------------------

describe('stepSession (endowment modifiers)', () => {
  const REST_CTX: SessionStepContext = {
    practices: [],
    embodiedSchedule: REST_SCHEDULE,
    memberScheduleFor: () => throwCtx('no members'),
    memberPracticesFor: () => throwCtx('no members'),
    endings: [],
    sessionSeed: 'mods-test',
    tiers: [{ id: 'household', scale: 'household', fold_cadence: 4 }],
  };

  function modsFor(mods: BenchModifiers): (tierId: string) => BenchModifiers {
    return () => mods;
  }

  it('windowMin lowers the auto-queue gate to a 2-event window', () => {
    const session = withHouseholdBench(
      householdSession({ roster: [], practices: [] }),
      hhBench({ residue: benchResidue(2) }),
    );

    // Without modifiers the 2-window stays below MIN_RESIDUE_TO_DEVELOP.
    const plain = stepSession(session, REST_CTX, 1, createRng(4n));
    expect(benchOf(plain.session, 'household').bay).toBeNull();

    // windowMin 1 → effective minimum max(2, 3 − 1) = 2 → the cook queues.
    const ctx: SessionStepContext = {
      ...REST_CTX,
      modifiersFor: modsFor({ ...EMPTY_BENCH_MODIFIERS, windowMin: 1 }),
    };
    const out = stepSession(session, ctx, 1, createRng(4n));
    const hh = benchOf(out.session, 'household');
    expect(hh.bay).not.toBeNull();
    expect(hh.bay?.cook_ticks_total).toBe(6); // cookTicksFor(2) = 6
    expect(hh.bay?.residue).toHaveLength(2);
    expect(hh.last_harvest_index).toBe(1);
  });

  it('never auto-queues below a 2-event window even with heavy windowMin', () => {
    // max(2, 3 − 9) clamps at 2, so a 1-window bench still waits.
    const session = withHouseholdBench(
      householdSession({ roster: [], practices: [] }),
      hhBench({ residue: benchResidue(1) }),
    );
    const ctx: SessionStepContext = {
      ...REST_CTX,
      modifiersFor: modsFor({ ...EMPTY_BENCH_MODIFIERS, windowMin: 9 }),
    };
    const out = stepSession(session, ctx, 1, createRng(4n));
    expect(benchOf(out.session, 'household').bay).toBeNull();
  });

  it('cookSpeed discounts the auto-queued cook total, floored at 2', () => {
    const session = withHouseholdBench(
      householdSession({ roster: [], practices: [] }),
      hhBench({ residue: benchResidue(MIN_RESIDUE_TO_DEVELOP) }),
    );
    const ctx: SessionStepContext = {
      ...REST_CTX,
      modifiersFor: modsFor({ ...EMPTY_BENCH_MODIFIERS, cookSpeed: 2 }),
    };
    const out = stepSession(session, ctx, 1, createRng(4n));
    const hh = benchOf(out.session, 'household');
    expect(hh.bay?.cook_ticks_total).toBe(5); // cookTicksFor(3) = 7 − 2

    const floored: SessionStepContext = {
      ...REST_CTX,
      modifiersFor: modsFor({ ...EMPTY_BENCH_MODIFIERS, cookSpeed: 99 }),
    };
    const clamped = stepSession(session, floored, 1, createRng(4n));
    expect(benchOf(clamped.session, 'household').bay?.cook_ticks_total).toBe(2);
  });

  it('surplusRate amplifies the absorbed household ticks only', () => {
    // A cooking bay (window 4 → 8 ticks) plus 3 fresh pending events: the
    // bench is charged, so step ticks absorb as surplus.
    let bench = recordStudioResidues(createStudioState(), benchResidue(4));
    bench = queueDevelop(bench, null, createRng(9n));
    bench = recordStudioResidues(bench, benchResidue(3));
    const session = withHouseholdBench(householdSession({ roster: [], practices: [] }), {
      residue: [...bench.residue],
      last_harvest_index: bench.last_harvest_index,
      bay: bench.bay,
      quality_tier: bench.quality_tier,
      harvest_count: bench.harvest_count,
      play_import: bench.play_import,
      pinned: bench.pinned,
      surplus: bench.surplus,
    });

    // Plain: 3 direct + 3 absorbed ticks cook 6 of 8 — still cooking.
    const plain = stepSession(session, REST_CTX, 3, createRng(4n));
    expect(benchOf(plain.session, 'household').bay?.status).toBe('cooking');
    expect(benchOf(plain.session, 'household').bay?.cook_ticks_done).toBe(6);

    // surplusRate 1 doubles the absorbed ticks: 3 + 6 = 9 ≥ 8 → ready.
    const ctx: SessionStepContext = {
      ...REST_CTX,
      modifiersFor: modsFor({ ...EMPTY_BENCH_MODIFIERS, surplusRate: 1 }),
    };
    const out = stepSession(session, ctx, 3, createRng(4n));
    expect(benchOf(out.session, 'household').bay?.status).toBe('ready');
  });

  it('never consults modifiersFor while the household tier is locked', () => {
    const studio = recordStudioResidues(createStudioState(), benchResidue(MIN_RESIDUE_TO_DEVELOP));
    const session = snapshotStudioSession(studio, createIdleState(), makeLife(), SIX, 1234, {
      tiers: {
        person: createTierState('person', true),
        household: createTierState('household', false),
      },
      milestones_done: [],
      compendium_done: [],
      embodied_member: null,
    });
    const ctx: SessionStepContext = {
      ...MEMBER_CTX,
      modifiersFor: () => throwCtx('modifiersFor must not be consulted'),
    };
    const out = stepSession(session, ctx, 24, createRng(2n));
    expect('household' in out.session.benches).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// (h) Visitors arrive through the step path
// ---------------------------------------------------------------------------

describe('stepSession (visitors)', () => {
  const TINY: VisitorLike = {
    id: 'visitor/tiny',
    tiers: ['household'],
    cadence_ticks: 5,
    jitter_ticks: 0,
    duration_windows: 2,
    effects: [{ op: 'add_resource', key: 'cook_speed', delta: 1 }],
  };

  it('seats a visitor on the household tier once the counter crosses cadence', () => {
    const session = householdSession({ roster: [] });
    expect(session.tiers['household']?.visitor_ticks).toBe(0);
    const ctx: SessionStepContext = { ...MEMBER_CTX, visitors: [TINY] };
    const out = stepSession(session, ctx, 5, createRng(3n));
    expect(out.session.tiers['household']?.active_visitor).toEqual({
      id: 'visitor/tiny',
      windows_left: 2,
    });
    expect(out.session.tiers['household']?.visitor_ticks).toBe(0);
  });

  it('accumulates the counter below cadence and leaves the seat empty', () => {
    const session = householdSession({ roster: [] });
    const ctx: SessionStepContext = { ...MEMBER_CTX, visitors: [TINY] };
    const out = stepSession(session, ctx, 4, createRng(3n));
    expect(out.session.tiers['household']?.active_visitor).toBeNull();
    expect(out.session.tiers['household']?.visitor_ticks).toBe(4);
  });

  it('leaves tiers untouched when the ctx carries no rows', () => {
    const session = householdSession({ roster: [] });
    const out = stepSession(session, MEMBER_CTX, 24, createRng(3n));
    expect(out.session.tiers['household']?.active_visitor).toBeNull();
    expect(out.session.tiers['household']?.visitor_ticks).toBe(0);
  });
});
