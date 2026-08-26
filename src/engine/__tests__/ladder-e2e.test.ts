// Full-ladder E2E — Phase 4 Task 4, widened to eight tiers in Phase 8.
//
// Pins the eight-tier chain end to end through the real content rows:
//   (a) graduating person → household → org → town → city → region →
//       nation → world in ONE session appends each unlock milestone, opens
//       a fresh bench for the tier, and never re-fires a done milestone
//   (b) the nation and world gates open through REAL harvests and the REAL
//       recorder: four region-scale harvests (two legends, two roads) feed
//       withRecordedDrafts, which assembles two distinct region worlds and
//       fires unlock-nation; four nation harvests do the same two rungs up
//       for unlock-world — no hand-built draft lists anywhere
//   (c) the fold chain carries residue from the embodied bench across every
//       rung of the ladder: a multi-tick step on a fully-unlocked session
//       deposits fold markers on each of the eight benches
//   (d) determinism: two runs of the same step inputs on the same fully-
//       graduated session produce identical sessions and summaries
//   (e) the engine throws on a locked-tier-but-absent-ctx-rows scenario,
//       so a tier the milestone gate skipped cannot silently slip through
//
// The fixtures load real content via loadProgression() — no synthetic
// tier/roles rows, no fabricated unlock predicates.

import { describe, expect, it } from 'vitest';

import { loadEraPack } from '@/content/loader';
import { loadProgression } from '@/content/progression/loader';
import {
  checkMilestones,
  compileRequestFromBay,
  createIdleState,
  createLifeState,
  createRng,
  createStudioState,
  emptyHydratedSession,
  graduateToHousehold,
  graduateToTier,
  queueDevelop,
  recordStudioResidues,
  snapshotStudioSession,
  stepSession,
  StudioSessionSchema,
  tableFillManifest,
  tickStudio,
  withRecordedDrafts,
  type BenchState,
  type KindRule,
  type Manifest,
  type ManifestScale,
  type StudioSession,
  type WorldDraftReference,
} from '@/engine';
import type { SessionStepContext } from '@/engine/session-step';
import type { DailySchedule } from '@/engine/schedule';
import type { LifeState, Practice } from '@/engine/types';
import type { ResidueEvent } from '@/engine/residue';

function makeLife(): LifeState {
  return createLifeState({
    id: 'studio-bench-e2e' as LifeState['id'],
    era: 'studio-bench-e2e@0.1.0' as LifeState['era'],
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

function emptyBase(): StudioSession {
  const hydrated = emptyHydratedSession();
  return snapshotStudioSession(hydrated.studio, createIdleState(), makeLife(), hydrated.practices);
}

/** A fresh empty bench — every graduation opens one of these per tier. */
const EMPTY_BENCH: BenchState = {
  residue: [],
  last_harvest_index: -1,
  bay: null,
  quality_tier: 0,
  harvest_count: 0,
  play_import: null,
  pinned: null,
  surplus: 0,
  fold_position: 0,
};

/** Graduate through the real content rows to the region rung. */
function graduateThroughRegion(): StudioSession {
  const reg = loadProgression();
  let session = emptyBase();

  // household
  session = graduateToHousehold(session, reg.roles['household'], createRng(101n));

  // org (member-bearing; roles row carries a policy)
  const orgRow = reg.tiers.find((row) => row.id === 'org');
  if (orgRow === undefined) {
    throw new Error('ladder-e2e: org tier row missing from registry');
  }
  const orgRoles = reg.roles['org'];
  if (orgRoles === undefined) {
    throw new Error('ladder-e2e: org roles row missing from registry');
  }
  session = graduateToTier(session, 'org', orgRow, orgRoles, createRng(103n));

  // town (unit tier; roles row has no policy)
  const townRow = reg.tiers.find((row) => row.id === 'town');
  if (townRow === undefined) {
    throw new Error('ladder-e2e: town tier row missing from registry');
  }
  session = graduateToTier(session, 'town', townRow, null, createRng(107n));

  // city (member-bearing; roles row carries a policy)
  const cityRow = reg.tiers.find((row) => row.id === 'city');
  if (cityRow === undefined) {
    throw new Error('ladder-e2e: city tier row missing from registry');
  }
  const cityRoles = reg.roles['city'];
  if (cityRoles === undefined) {
    throw new Error('ladder-e2e: city roles row missing from registry');
  }
  session = graduateToTier(session, 'city', cityRow, cityRoles, createRng(109n));

  // region (unit tier; roles row has no policy)
  const regionRow = reg.tiers.find((row) => row.id === 'region');
  if (regionRow === undefined) {
    throw new Error('ladder-e2e: region tier row missing from registry');
  }
  session = graduateToTier(session, 'region', regionRow, null, createRng(113n));

  return session;
}

/** Social window: a lens marker plus practice ticks makes the compile
 *  social, so the window claims the scale's people-facing kind (legend at
 *  region, ministry at nation). Mirrors the StudioView ladder fixtures. */
function socialWindow(at: number): ResidueEvent[] {
  return [
    { tick: at, type: 'lens_chosen', ids: ['lens.e2e'], numbers: {} },
    { tick: at + 1, type: 'practice_tick', ids: ['practice.e2e'], numbers: { progress: 2 } },
    { tick: at + 2, type: 'practice_tick', ids: ['practice.e2e'], numbers: { progress: 2 } },
  ];
}

/** Practice window: one practice id, no social marker — the scale's fixed
 *  kind (road at region, edict at nation). */
function practiceWindow(at: number): ResidueEvent[] {
  return [0, 1, 2].map((offset) => ({
    tick: at + offset,
    type: 'practice_tick' as const,
    ids: ['practice.e2e.solo'],
    numbers: { progress: 2 },
  }));
}

/** Kind rules of one scale, regrouped from the loader rows in file order —
 *  the engine-side mirror of the studio hook's kindRulesByScale. */
function kindRulesForScale(scale: ManifestScale): readonly KindRule[] {
  const reg = loadProgression();
  const rules = reg.kindRows.flatMap((row, index) => {
    const rule = reg.kindRules[index];
    if (rule === undefined) {
      throw new Error('ladder-e2e: kind rows and rules are out of parallel order');
    }
    return row.scale === scale ? [rule] : [];
  });
  if (rules.length === 0) {
    throw new Error(`ladder-e2e: no kind rules registered for the ${scale} scale`);
  }
  return rules;
}

/** Cook a window into a ready bay, then compile it at `scale` through the
 *  loader's kind rules and catalogs — the engine mirror of StudioView's
 *  harvestBenchTier table path (no visitor swap in force). */
function harvestAtScale(
  scale: ManifestScale,
  window: readonly ResidueEvent[],
  seed: bigint,
  cardId: string,
): Manifest {
  const reg = loadProgression();
  const rules = kindRulesForScale(scale);
  let bench = recordStudioResidues(createStudioState(), window);
  bench = queueDevelop(bench, null, createRng(seed));
  bench = tickStudio(bench, bench.bay?.cook_ticks_total ?? 0);
  const bay = bench.bay;
  if (bay === null || bay.status !== 'ready') {
    throw new Error('ladder-e2e: gate-feeding bay did not cook ready');
  }
  const request = compileRequestFromBay(
    { ...bay, focus: bay.focus ?? null },
    bench.quality_tier,
    bench.harvest_count,
    null,
    scale,
    rules,
  );
  return tableFillManifest(
    request.residue,
    request.brief,
    request.quality_tier,
    createRng(seed + 1n),
    request.rng_seed,
    cardId,
    request.focus,
    request.life_context,
    request.scale,
    rules,
    reg.catalogs,
  );
}

/** The session with `cards` archived (schema-parsed so the fixture stays a
 *  valid persisted session, mirroring the UI tier fixtures). */
function withArchivedCards(session: StudioSession, cards: readonly Manifest[]): StudioSession {
  return StudioSessionSchema.parse({ ...session, archive: [...session.archive, ...cards] });
}

/** Distinct tier scales in ladder order — the engine-side mirror of the
 *  studio hook's tierScales (the recorder walks these). */
function tierScales(): readonly ManifestScale[] {
  return [...new Set(loadProgression().tiers.map((tier) => tier.scale))];
}

/**
 * Graduate through all eight rungs. The nation and world gates are fed the
 * way play feeds them: FOUR real harvests at the gate tier's scale (a
 * social-window pair and a practice-window pair), archived, then recorded
 * through withRecordedDrafts — the recorder assembles two distinct worlds
 * from the two card pairs and checkMilestones fires exactly the next
 * unlock before the graduation runs. The ledger threads forward gate to
 * gate the way the session persists it.
 */
function graduateFullChain(): StudioSession {
  const reg = loadProgression();
  let session = graduateThroughRegion();
  let fed: StudioSession;
  let ledger: readonly WorldDraftReference[] = [];

  // nation gate: one legend + one road satisfies the archived operands;
  // four region cards (two pairs) satisfy world_drafts.region >= 2.
  const legend = harvestAtScale('region', socialWindow(1), 1201n, 'e2e-region-legend');
  const road = harvestAtScale('region', practiceWindow(11), 1213n, 'e2e-region-road');
  const legendAgain = harvestAtScale('region', socialWindow(41), 1249n, 'e2e-region-legend-2');
  const roadAgain = harvestAtScale('region', practiceWindow(51), 1251n, 'e2e-region-road-2');
  fed = withArchivedCards(session, [legend, road, legendAgain, roadAgain]);
  ledger = withRecordedDrafts(fed.archive, [], tierScales());
  const regionWorlds = ledger.filter((draft) => draft.scale === 'region').length;
  if (regionWorlds !== 2) {
    throw new Error(
      `ladder-e2e: four region cards should record two region worlds, got ${regionWorlds}`,
    );
  }
  const firedNation = checkMilestones(fed, ledger, reg.milestones);
  if (firedNation.length !== 1 || firedNation[0] !== 'unlock-nation') {
    throw new Error(
      `ladder-e2e: region harvest should open only unlock-nation, got [${firedNation.join(', ')}]`,
    );
  }
  const nationRow = reg.tiers.find((row) => row.id === 'nation');
  if (nationRow === undefined) {
    throw new Error('ladder-e2e: nation tier row missing from registry');
  }
  const nationRoles = reg.roles['nation'];
  if (nationRoles === undefined) {
    throw new Error('ladder-e2e: nation roles row missing from registry');
  }
  session = graduateToTier(fed, 'nation', nationRow, nationRoles, createRng(127n));

  // world gate: one ministry + one edict satisfies the archived operands;
  // four nation cards (two pairs) satisfy world_drafts.nation >= 2.
  const ministry = harvestAtScale('nation', socialWindow(21), 1223n, 'e2e-nation-ministry');
  const edict = harvestAtScale('nation', practiceWindow(31), 1231n, 'e2e-nation-edict');
  const ministryAgain = harvestAtScale('nation', socialWindow(61), 1259n, 'e2e-nation-ministry-2');
  const edictAgain = harvestAtScale('nation', practiceWindow(71), 1261n, 'e2e-nation-edict-2');
  fed = withArchivedCards(session, [ministry, edict, ministryAgain, edictAgain]);
  ledger = withRecordedDrafts(fed.archive, ledger, tierScales());
  const firedWorld = checkMilestones(fed, ledger, reg.milestones);
  if (firedWorld.length !== 1 || firedWorld[0] !== 'unlock-world') {
    throw new Error(
      `ladder-e2e: nation harvest should open only unlock-world, got [${firedWorld.join(', ')}]`,
    );
  }
  const worldRow = reg.tiers.find((row) => row.id === 'world');
  if (worldRow === undefined) {
    throw new Error('ladder-e2e: world tier row missing from registry');
  }
  session = graduateToTier(fed, 'world', worldRow, null, createRng(131n));

  return session;
}

function emptyCtx(): SessionStepContext {
  const reg = loadProgression();
  // Org and city tier graduate with member-bearing rows; town and region
  // are unit tiers (no member slices). The member resolvers must answer
  // for the org / city policies with the real pack fixtures.
  const pack = loadEraPack('tang-china');
  const policies = new Map(reg.policies.map((row) => [row.id, row]));
  const schedules = new Map(pack.schedules.map((row) => [row.id, row]));
  const practices = new Map(pack.practices.map((row) => [row.id, row]));
  function resolveSchedule(policyId: string): DailySchedule {
    const policy = policies.get(policyId);
    if (policy === undefined) {
      throw new Error(`ladder-e2e: no policy row for "${policyId}"`);
    }
    const schedule = schedules.get(policy.schedule_ref);
    if (schedule === undefined) {
      throw new Error(`ladder-e2e: no schedule "${policy.schedule_ref}" for policy "${policyId}"`);
    }
    return schedule;
  }
  function resolvePractices(policyId: string): readonly Practice[] {
    const policy = policies.get(policyId);
    if (policy === undefined) {
      throw new Error(`ladder-e2e: no policy row for "${policyId}"`);
    }
    return policy.practices.map((id) => {
      const practice = practices.get(id);
      if (practice === undefined) {
        throw new Error(`ladder-e2e: no practice "${id}" for policy "${policyId}"`);
      }
      return {
        id: practice.id,
        label_sid: practice.label_sid,
        description_sid: practice.description_sid,
        lens: practice.lens,
        progressPerTick: practice.progressPerTick,
        maxProgress: practice.maxProgress,
        currentProgress: 0,
        level: 0,
        effects: practice.effects,
      };
    });
  }
  return {
    practices: [],
    embodiedSchedule: {
      id: 'rest',
      name_sid: 'rest_sid',
      blocks: [
        {
          id: 'rest',
          label_sid: 'rest_sid',
          startHour: 0,
          endHour: 24,
          practice_id: null,
          icon_sid: 'rest_sid',
        },
      ],
    },
    memberScheduleFor: resolveSchedule,
    memberPracticesFor: resolvePractices,
    endings: [],
    sessionSeed: 'ladder-e2e',
    tiers: reg.tiers.map((tier) => ({
      id: tier.id,
      scale: tier.scale,
      fold_cadence: tier.fold_cadence,
    })),
  };
}

const FULL_LADDER_IDS = [
  'person',
  'household',
  'org',
  'town',
  'city',
  'region',
  'nation',
  'world',
] as const;
const FULL_LADDER_UNLOCK_IDS = [
  'unlock-household',
  'unlock-org',
  'unlock-town',
  'unlock-city',
  'unlock-region',
  'unlock-nation',
  'unlock-world',
] as const;

// Six practice blocks per 24-tick step: a step grows the person bench by
// six residue events, which is enough to exercise the fold_cadence=4 chain
// across all six rungs in a single call.
const SIX_SCHEDULE: DailySchedule = {
  id: 'six-blocks-e2e',
  name_sid: 'six_blocks_sid',
  blocks: [0, 1, 2, 3, 4, 5].map((index) => ({
    id: `b${index}`,
    label_sid: 'b_sid',
    startHour: index * 4,
    endHour: index * 4 + 4,
    practice_id: `practice.e2e.${index}`,
    icon_sid: 'i_sid',
  })),
};

const SIX_PRACTICES: readonly Practice[] = SIX_SCHEDULE.blocks.map((block) => ({
  id: block.practice_id ?? 'practice.e2e.missing',
  label_sid: 'p_sid',
  description_sid: 'd_sid',
  lens: 'joyful_effort',
  progressPerTick: 1,
  maxProgress: 1000,
  currentProgress: 0,
  level: 0,
  effects: [{ op: 'add_resource', key: 'skill', delta: 1 }],
}));

function chainCtx(): SessionStepContext {
  return {
    ...emptyCtx(),
    practices: SIX_PRACTICES,
    embodiedSchedule: SIX_SCHEDULE,
  };
}

describe('ladder-e2e (Phase 4 Task 4, eight tiers since Phase 8)', () => {
  it('graduates through all eight tiers in order via the real content rows', () => {
    const session = graduateFullChain();

    // Every rung is unlocked; the embodied rung is unlocked by default.
    for (const id of FULL_LADDER_IDS) {
      expect(session.tiers[id]?.unlocked, `tier ${id} should be unlocked`).toBe(true);
    }

    // The unlock milestones are recorded in the chain order, exactly once.
    expect(session.milestones_done).toEqual([...FULL_LADDER_UNLOCK_IDS]);

    // Every non-person tier got a fresh empty bench keyed by its tier id.
    for (const id of FULL_LADDER_IDS) {
      expect(session.benches[id], `bench ${id} should be present`).toBeDefined();
      expect(session.benches[id]).toEqual(EMPTY_BENCH);
    }
  });

  it('opens no duplicate benches and leaves the person bench untouched by graduation', () => {
    const base = emptyBase();
    const session = graduateFullChain();

    // The person bench is the same instance graduateFullChain received
    // before any graduation touched it (graduation never mutates person).
    expect(session.benches['person']).toEqual(base.benches['person']);

    // All eight keys present and exactly eight — no leftovers, no extras.
    expect(Object.keys(session.benches).sort()).toEqual([...FULL_LADDER_IDS].sort());
  });

  it('feeds the nation and world gates through the recorder, not literals', () => {
    const reg = loadProgression();
    const session = graduateThroughRegion();

    // Region-scale harvests: the social window claims legend, the practice
    // window claims road (the Phase 8 kind rows for the region scale).
    const legend = harvestAtScale('region', socialWindow(1), 1301n, 'gate-region-legend');
    const road = harvestAtScale('region', practiceWindow(11), 1319n, 'gate-region-road');
    const legendAgain = harvestAtScale('region', socialWindow(41), 1381n, 'gate-region-legend-2');
    const roadAgain = harvestAtScale('region', practiceWindow(51), 1383n, 'gate-region-road-2');
    expect(legend.scale).toBe('region');
    expect(legend.kind).toBe('legend');
    expect(road.scale).toBe('region');
    expect(road.kind).toBe('road');

    // Each missing kind keeps unlock-nation closed — the recorder over a
    // one-card archive holds no region world at all.
    expect(
      checkMilestones(
        withArchivedCards(session, [legend]),
        withRecordedDrafts([...session.archive, legend], [], tierScales()),
        reg.milestones,
      ),
    ).not.toContain('unlock-nation');
    expect(
      checkMilestones(
        withArchivedCards(session, [road]),
        withRecordedDrafts([...session.archive, road], [], tierScales()),
        reg.milestones,
      ),
    ).not.toContain('unlock-nation');

    // TWO region cards assemble ONE world — one short of the gte 2 operand
    // that the deduped recorder could never reach.
    const twoRegionCards = withArchivedCards(session, [legend, road]);
    const oneWorld = withRecordedDrafts(twoRegionCards.archive, [], tierScales());
    expect(oneWorld.filter((draft) => draft.scale === 'region')).toHaveLength(1);
    expect(checkMilestones(twoRegionCards, oneWorld, reg.milestones)).not.toContain(
      'unlock-nation',
    );

    // FOUR region cards assemble two distinct region worlds and open the gate.
    const fedNation = withArchivedCards(session, [legend, road, legendAgain, roadAgain]);
    const regionDrafts = withRecordedDrafts(fedNation.archive, [], tierScales());
    expect(regionDrafts.filter((draft) => draft.scale === 'region')).toHaveLength(2);
    expect(checkMilestones(fedNation, regionDrafts, reg.milestones)).toEqual(['unlock-nation']);

    // Nation-scale harvests carry the nation scale and nation kinds — the
    // city-scale harvest assertion's sibling two rungs up.
    const ministry = harvestAtScale('nation', socialWindow(21), 1327n, 'gate-nation-ministry');
    const edict = harvestAtScale('nation', practiceWindow(31), 1331n, 'gate-nation-edict');
    const ministryAgain = harvestAtScale(
      'nation',
      socialWindow(61),
      1387n,
      'gate-nation-ministry-2',
    );
    const edictAgain = harvestAtScale('nation', practiceWindow(71), 1389n, 'gate-nation-edict-2');
    expect(ministry.scale).toBe('nation');
    expect(ministry.kind).toBe('ministry');
    expect(edict.scale).toBe('nation');
    expect(edict.kind).toBe('edict');

    const nationRow = reg.tiers.find((row) => row.id === 'nation');
    if (nationRow === undefined) {
      throw new Error('ladder-e2e: nation tier row missing from registry');
    }
    const nationRoles = reg.roles['nation'];
    if (nationRoles === undefined) {
      throw new Error('ladder-e2e: nation roles row missing from registry');
    }
    const graduated = graduateToTier(fedNation, 'nation', nationRow, nationRoles, createRng(1361n));

    // Same shape two rungs up: one ministry alone stays closed; two cards
    // (one world) stay closed; four nation cards open unlock-world.
    expect(
      checkMilestones(
        withArchivedCards(graduated, [ministry]),
        withRecordedDrafts([...graduated.archive, ministry], [], tierScales()),
        reg.milestones,
      ),
    ).not.toContain('unlock-world');
    const twoNationCards = withArchivedCards(graduated, [ministry, edict]);
    expect(
      checkMilestones(
        twoNationCards,
        withRecordedDrafts(twoNationCards.archive, [], tierScales()),
        reg.milestones,
      ),
    ).not.toContain('unlock-world');
    const fedWorld = withArchivedCards(graduated, [ministry, edict, ministryAgain, edictAgain]);
    const nationDrafts = withRecordedDrafts(fedWorld.archive, [], tierScales());
    expect(nationDrafts.filter((draft) => draft.scale === 'nation')).toHaveLength(2);
    expect(checkMilestones(fedWorld, nationDrafts, reg.milestones)).toEqual(['unlock-world']);
  });

  it('opens unlock-town through the recorder — four org cards are two org worlds', () => {
    const reg = loadProgression();
    let session = emptyBase();
    session = graduateToHousehold(session, reg.roles['household'], createRng(101n));
    const orgRow = reg.tiers.find((row) => row.id === 'org');
    if (orgRow === undefined) {
      throw new Error('ladder-e2e: org tier row missing from registry');
    }
    const orgRoles = reg.roles['org'];
    if (orgRoles === undefined) {
      throw new Error('ladder-e2e: org roles row missing from registry');
    }
    session = graduateToTier(session, 'org', orgRow, orgRoles, createRng(103n));

    // Org-scale harvests: the social window claims charter, the practice
    // window claims ware. Four cards = two distinct org worlds.
    const charter = harvestAtScale('org', socialWindow(1), 1401n, 'gate-org-charter');
    const ware = harvestAtScale('org', practiceWindow(11), 1409n, 'gate-org-ware');
    const charterAgain = harvestAtScale('org', socialWindow(21), 1421n, 'gate-org-charter-2');
    const wareAgain = harvestAtScale('org', practiceWindow(31), 1423n, 'gate-org-ware-2');
    expect(charter.scale).toBe('org');
    expect(charter.kind).toBe('charter');
    expect(ware.kind).toBe('ware');

    const fed = withArchivedCards(session, [charter, ware, charterAgain, wareAgain]);
    const drafts = withRecordedDrafts(fed.archive, [], tierScales());
    expect(drafts.filter((draft) => draft.scale === 'org')).toHaveLength(2);
    expect(checkMilestones(fed, drafts, reg.milestones)).toEqual(['unlock-town']);
  });

  it('re-running the chain on an already-unlocked session is idempotent', () => {
    const once = graduateFullChain();
    // A second pass on the already-fully-unlocked session leaves the
    // milestone list and bench map unchanged (every rung is already open).
    const second = graduateFullChain();
    expect(second.milestones_done).toEqual(once.milestones_done);
    expect(second.benches).toEqual(once.benches);
    expect(second.tiers).toEqual(once.tiers);
  });

  it('a multi-tick step on the fully-unlocked session folds residue through every rung', () => {
    // `stampIdleResidue` emits ONE event per practice per step (aggregated
    // across all ticks in the call), so a single step caps at 6 person
    // events. Chained 24-tick calls saturate the chain: each call's 6
    // embodied events fold up; the cumulative fold_position tracks them.
    const session = graduateFullChain();
    const ctx = chainCtx();

    let out = stepSession(session, ctx, 24, createRng(211n));
    for (let i = 0; i < 4; i += 1) {
      out = stepSession(out.session, ctx, 24, createRng(220n + BigInt(i)));
    }

    for (const id of FULL_LADDER_IDS) {
      expect(out.session.benches[id]).toBeDefined();
    }

    const person = out.session.benches['person'];
    expect(person?.residue.length).toBeGreaterThanOrEqual(30);

    const previousByTier: Readonly<Record<string, string>> = {
      household: 'person',
      org: 'household',
      town: 'org',
      city: 'town',
      region: 'city',
      nation: 'region',
      world: 'nation',
    };
    for (const [id, prev] of Object.entries(previousByTier)) {
      const bench = out.session.benches[id];
      const foldTag = `bench:${prev}`;
      const folded = bench?.residue.filter((event) => event.ids.includes(foldTag));
      expect(folded && folded.length > 0, `tier ${id} should carry a ${foldTag} fold`).toBe(true);
    }

    // Person bench fold_position stays at 0 by design (the embodied rung
    // steps in stepStudio; the ladder loop never touches it). Every
    // non-person rung's fold_position advances per call.
    expect(out.session.benches['person']?.fold_position).toBe(0);
    for (const id of ['household', 'org', 'town', 'city', 'region', 'nation', 'world'] as const) {
      expect(out.session.benches[id]?.fold_position).toBeGreaterThan(0);
    }

    expect(out.summary.folded).toBeGreaterThanOrEqual(5);
  });

  it('is deterministic across the full ladder with the same step inputs', () => {
    const seeded = graduateFullChain();
    const ctx = emptyCtx();

    const run = (seed: bigint): StudioSession =>
      stepSession(seeded, ctx, 24, createRng(seed)).session;

    // Two runs at the same seed: byte-identical sessions.
    expect(run(401n)).toEqual(run(401n));

    // Chained calls at different seeds reproduce identically per seed.
    const chainedA = (() => {
      let s = seeded;
      for (const seed of [401n, 409n, 419n] as const) {
        s = stepSession(s, ctx, 24, createRng(seed)).session;
      }
      return s;
    })();
    const chainedB = (() => {
      let s = seeded;
      for (const seed of [401n, 409n, 419n] as const) {
        s = stepSession(s, ctx, 24, createRng(seed)).session;
      }
      return s;
    })();
    expect(chainedA).toEqual(chainedB);
  });

  it('throws when an unlocked session tier is absent from the step context', () => {
    // The fully-unlocked session has every rung open; if the step context
    // drops one of the non-person tiers, the engine refuses to silently
    // skip it. The guard is the load-bearing fence: a milestone gate skip
    // (or a content bug) cannot make a higher rung disappear.
    const session = graduateFullChain();
    const full = emptyCtx();
    const stripped: SessionStepContext = {
      ...full,
      tiers: full.tiers.filter((row) => row.id !== 'city'),
    };
    expect(() => stepSession(session, stripped, 4, createRng(503n))).toThrowError(/city/);
  });
});
