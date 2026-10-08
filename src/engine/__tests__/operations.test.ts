import { describe, expect, it } from 'vitest';

import {
  MIN_RESIDUE_TO_DEVELOP,
  QUALITY_UPGRADE_HARVESTS,
  applyPracticeProgress,
  canHarvest,
  canQueueDevelop,
  canUpgradeQuality,
  createRng,
  createStudioState,
  harvestTableFill,
  harvestWithFiller,
  importPlayResidue,
  pinFocus,
  absorbSurplus,
  pendingResidue,
  queueDevelop,
  recordStudioResidues,
  tableFiller,
  tickStudio,
  upgradeQuality,
  createIdleState,
  createLifeState,
  parseStudioSession,
  snapshotStudioSession,
} from '../';
import { LONG_FIRE_EXTRA_TICKS } from '../cook-window';
import { compileRequestFromBay } from '../fill-adapter';
import { benchToStudio } from '../bench-mapping';
import type { Practice } from '../';
import type { ResidueEvent } from '../residue';
import type { LifeState } from '../types';

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

function events(n: number): ResidueEvent[] {
  const out: ResidueEvent[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      tick: i + 1,
      type: 'practice_tick',
      ids: ['practice.test'],
      numbers: { progress: 2 },
    });
  }
  return out;
}

function chargedStudio(n = MIN_RESIDUE_TO_DEVELOP) {
  return recordStudioResidues(createStudioState(), events(n));
}

describe('develop-from-residue', () => {
  it('refuses to queue until the pending window is large enough', () => {
    const short = recordStudioResidues(createStudioState(), events(MIN_RESIDUE_TO_DEVELOP - 1));
    expect(canQueueDevelop(short)).toBe(false);
    expect(queueDevelop(short, null, createRng(1n)).bay).toBeNull();
  });

  it('queues a cooking job, spends the window, and harvests after enough ticks', () => {
    const queued = queueDevelop(chargedStudio(), 'a kept promise', createRng(5n));
    expect(queued.bay?.status).toBe('cooking');
    expect(pendingResidue(queued)).toHaveLength(0);
    expect(canHarvest(queued)).toBe(false);

    const ready = tickStudio(queued, queued.bay?.cook_ticks_total ?? 0);
    expect(ready.bay?.status).toBe('ready');
    expect(canHarvest(ready)).toBe(true);

    const harvested = harvestTableFill(ready, createRng(5n));
    expect(harvested).not.toBeNull();
    expect(harvested?.studio.bay).toBeNull();
    expect(harvested?.studio.archive).toHaveLength(1);
    expect(harvested?.manifest.brief).toBe('a kept promise');
    expect(harvested?.studio.harvest_count).toBe(1);
  });

  it('is a no-op harvest when the bay is still cooking', () => {
    const queued = queueDevelop(chargedStudio(), null, createRng(1n));
    expect(harvestTableFill(queued, createRng(1n))).toBeNull();
  });

  it('unlocks one quality upgrade after enough harvests', () => {
    let studio = createStudioState();
    for (let i = 0; i < QUALITY_UPGRADE_HARVESTS; i++) {
      studio = recordStudioResidues(studio, events(MIN_RESIDUE_TO_DEVELOP));
      studio = queueDevelop(studio, null, createRng(BigInt(i + 1)));
      studio = tickStudio(studio, studio.bay?.cook_ticks_total ?? 0);
      const result = harvestTableFill(studio, createRng(BigInt(i + 10)));
      if (result === null) {
        throw new Error('expected harvest');
      }
      studio = result.studio;
    }
    expect(canUpgradeQuality(studio)).toBe(true);
    const upgraded = upgradeQuality(studio);
    expect(upgraded.quality_tier).toBe(1);
    expect(canUpgradeQuality(upgraded)).toBe(false);
    expect(upgradeQuality(upgraded)).toBe(upgraded);
  });

  it('applies practice progress with wrapping levels', () => {
    const practices: Practice[] = [
      {
        id: 'practice.test',
        label_sid: 'p_sid',
        description_sid: 'd_sid',
        lens: 'joyful_effort',
        progressPerTick: 1,
        maxProgress: 10,
        currentProgress: 8,
        level: 0,
        effects: [],
      },
    ];
    const next = applyPracticeProgress(practices, [{ id: 'practice.test', progressGained: 14 }]);
    expect(next[0]?.level).toBe(2);
    expect(next[0]?.currentProgress).toBe(2);
  });

  it('imports only new play residue and resets the cursor on a new life', () => {
    const first = events(2);
    const once = importPlayResidue(createStudioState(), 'life-a', first);
    expect(once.residue).toHaveLength(2);
    expect(once.play_import).toEqual({ life_id: 'life-a', index: 1 });
    const again = importPlayResidue(once, 'life-a', first);
    expect(again).toBe(once);
    const grown = importPlayResidue(once, 'life-a', events(4));
    expect(grown.residue).toHaveLength(4);
    expect(grown.play_import?.index).toBe(3);
    const otherLife = importPlayResidue(grown, 'life-b', events(1));
    expect(otherLife.residue).toHaveLength(5);
    expect(otherLife.play_import).toEqual({ life_id: 'life-b', index: 0 });
  });

  it('turns overflow tend time into shorter cooks', () => {
    let studio = chargedStudio();
    expect(canQueueDevelop(studio)).toBe(true);
    studio = absorbSurplus(studio, 6);
    expect(studio.surplus).toBe(6);
    studio = queueDevelop(studio, null, createRng(3n));
    // Banked heat shaves at most half the short base (6 -> cap 3): the cook
    // is 3 ticks and 3 heat remains (browser finding 1: heat must not
    // collapse the fire trade to the 2-tick floor).
    expect(studio.bay?.cook_ticks_total).toBe(3);
    expect(studio.surplus).toBe(3);
  });

  it('pins a person onto the next harvest', () => {
    const person: ResidueEvent[] = [
      { tick: 1, type: 'lens_chosen', ids: ['lens.test'], numbers: {} },
      { tick: 2, type: 'practice_tick', ids: ['practice.test'], numbers: { progress: 2 } },
      { tick: 3, type: 'practice_tick', ids: ['practice.test'], numbers: { progress: 2 } },
    ];
    let studio = recordStudioResidues(createStudioState(), person);
    studio = queueDevelop(studio, null, createRng(21n));
    studio = tickStudio(studio, studio.bay?.cook_ticks_total ?? 0);
    const first = harvestTableFill(studio, createRng(21n));
    if (first === null || first.manifest.kind !== 'person') {
      throw new Error('expected a person card');
    }
    studio = pinFocus(first.studio, first.manifest);
    expect(studio.pinned?.id).toBe(first.manifest.id);
    studio = recordStudioResidues(studio, events(MIN_RESIDUE_TO_DEVELOP));
    studio = queueDevelop(studio, null, createRng(22n));
    expect(studio.bay?.focus?.id).toBe(first.manifest.id);
    studio = tickStudio(studio, studio.bay?.cook_ticks_total ?? 0);
    const second = harvestTableFill(studio, createRng(22n));
    expect(second?.manifest.about_id).toBe(first.manifest.id);
    expect(second?.manifest.about_name).toBe(first.manifest.name);
    // The pin contract is structural (about_*, focused tag); the prose mention
    // of the focus is now template-authored (card-composer), not guaranteed.
    expect(second?.manifest.tags).toContain('focused');
  });

  /* ---- queueDevelop endowment opts (Phase 2 Task 2) ------------------------ */

  it('applies a cook ticks discount to the queued bay', () => {
    // Window 3 → cookTicksFor(3, short) = 6; a cook_speed of 2 discounts to 4.
    const queued = queueDevelop(chargedStudio(), null, createRng(7n), { cookTicksDiscount: 2 });
    expect(queued.bay?.cook_ticks_total).toBe(4);
  });

  it('floors the cook ticks discount at MIN_COOK_TICKS', () => {
    const queued = queueDevelop(chargedStudio(), null, createRng(7n), { cookTicksDiscount: 99 });
    expect(queued.bay?.cook_ticks_total).toBe(2);
  });

  it('spends surplus against the discounted cook, still floored', () => {
    let studio = absorbSurplus(chargedStudio(), 6);
    expect(studio.surplus).toBe(6);
    // Base 4 (6 − 2 discount); surplus may only spend down to the floor 2.
    studio = queueDevelop(studio, null, createRng(7n), { cookTicksDiscount: 2 });
    expect(studio.bay?.cook_ticks_total).toBe(2);
    expect(studio.surplus).toBe(4);
  });

  it('queues below MIN_RESIDUE_TO_DEVELOP only when minResidue is passed', () => {
    const two = recordStudioResidues(createStudioState(), events(2));
    expect(queueDevelop(two, null, createRng(7n)).bay).toBeNull();
    const queued = queueDevelop(two, null, createRng(7n), { minResidue: 2 });
    expect(queued.bay).not.toBeNull();
    expect(queued.bay?.cook_ticks_total).toBe(5); // cookTicksFor(2, short) = 5
    expect(queued.bay?.residue).toHaveLength(2);
  });

  it('floors a minResidue override at 1', () => {
    const one = recordStudioResidues(createStudioState(), events(1));
    expect(queueDevelop(one, null, createRng(7n), { minResidue: 0 }).bay).not.toBeNull();
    expect(
      queueDevelop(createStudioState(), null, createRng(7n), { minResidue: -3 }).bay,
    ).toBeNull();
  });

  it('keeps the same queue math when opts are empty (lane B formula)', () => {
    const plain = queueDevelop(chargedStudio(), null, createRng(7n));
    const withEmptyOpts = queueDevelop(chargedStudio(), null, createRng(7n), {});
    expect(plain.bay?.cook_ticks_total).toBe(6);
    expect(withEmptyOpts.bay?.cook_ticks_total).toBe(6);
  });

  it('replays the same queue-cook-harvest sequence identically', () => {
    function run() {
      const rng = createRng(42n);
      let studio = chargedStudio(5);
      studio = queueDevelop(studio, null, rng);
      studio = tickStudio(studio, studio.bay?.cook_ticks_total ?? 0);
      return harvestTableFill(studio, rng);
    }
    expect(run()).toEqual(run());
  });

  it('harvests a person from a social window through the full pipeline', () => {
    const social: ResidueEvent[] = [
      { tick: 1, type: 'lens_chosen', ids: ['lens.test'], numbers: {} },
      { tick: 2, type: 'practice_tick', ids: ['practice.test'], numbers: { progress: 2 } },
      { tick: 3, type: 'practice_tick', ids: ['practice.test'], numbers: { progress: 2 } },
    ];
    let studio = recordStudioResidues(createStudioState(), social);
    studio = queueDevelop(studio, null, createRng(21n));
    studio = tickStudio(studio, studio.bay?.cook_ticks_total ?? 0);
    const result = harvestTableFill(studio, createRng(21n));
    expect(result).not.toBeNull();
    expect(result?.manifest.kind).toBe('person');
    expect(result?.studio.archive[0]?.kind).toBe('person');
  });
});

/* ---- lane B: the cook is a hand (hold-back, fire, counters) ------------- */

describe('queueDevelop hold-back and fire (lane B)', () => {
  it('holds chosen traces out of the cook; they stay pending, not lost', () => {
    // 5 events: hold index 1 (the lens marker) so the window stays a thing.
    let studio = recordStudioResidues(
      createStudioState(),
      events(4).concat({
        tick: 5,
        type: 'lens_chosen',
        ids: ['lens.test'],
        numbers: {},
      }),
    );
    studio = queueDevelop(studio, null, createRng(31n), { holdBack: [4] });
    expect(studio.bay?.residue).toHaveLength(4);
    expect(studio.bay?.residue.some((e) => e.ids.includes('lens.test'))).toBe(false);
    expect(studio.held_residue).toEqual([4]);
    // The held trace is still pending and unspent…
    expect(pendingResidue(studio)).toHaveLength(1);
    expect(pendingResidue(studio)[0]?.ids).toEqual(['lens.test']);
    // …and the next cook can spend it (no hold passed → carried forward).
    studio = tickStudio(studio, studio.bay?.cook_ticks_total ?? 0);
    const harvested = harvestTableFill(studio, createRng(31n));
    expect(harvested).not.toBeNull();
    studio = harvested?.studio ?? studio;
    studio = recordStudioResidues(studio, events(2));
    studio = queueDevelop(studio, null, createRng(32n));
    expect(studio.bay?.residue.some((e) => e.ids.includes('lens.test'))).toBe(true);
    expect(studio.held_residue).toEqual([]);
  });

  it('never double-counts held traces across save/load and catch-up ticks', () => {
    let studio = recordStudioResidues(createStudioState(), events(5));
    studio = queueDevelop(studio, null, createRng(41n), { holdBack: [3, 4] });
    // Persist and reload through the session schema (v1 with new fields).
    const idle = createIdleState();
    const life = makeLife();
    const snap = snapshotStudioSession(studio, idle, life, []);
    const parsed = parseStudioSession(JSON.parse(JSON.stringify(snap)));
    const reloaded = benchToStudio(
      parsed.benches.person ?? {
        residue: [],
        last_harvest_index: -1,
        bay: null,
        quality_tier: 0,
        harvest_count: 0,
        play_import: null,
        pinned: null,
        surplus: 0,
        held_residue: [],
        cook_choices: { long: 0, holdback: 0 },
        fold_position: 0,
      },
      parsed.archive,
    );
    expect(reloaded.held_residue).toEqual([3, 4]);
    // Offline catch-up appends residue and ticks the bay; held indices are
    // absolute into an append-only log, so they stay valid.
    const grown = recordStudioResidues(reloaded, events(2));
    expect(pendingResidue(grown)).toHaveLength(4); // 2 held + 2 fresh
    const cooked = tickStudio(grown, grown.bay?.cook_ticks_total ?? 0);
    expect(cooked.bay?.status).toBe('ready');
    expect(cooked.held_residue).toEqual([3, 4]);
  });

  it('loads pre-lane-B sessions as short-fire with nothing held', () => {
    const legacy = {
      schema_version: 'studio_session/v1',
      benches: {
        person: {
          residue: [],
          last_harvest_index: -1,
          bay: null,
          quality_tier: 0,
          harvest_count: 0,
          play_import: null,
          pinned: null,
          surplus: 0,
          fold_position: 0,
        },
      },
      archive: [],
      tiers: {},
      milestones_done: [],
      compendium_done: [],
      embodied_member: null,
      idle: { mode: 'idle', last_simulated_tick: '0', total_idle_ticks: '0' },
      life: {
        turn: 0,
        resources: {},
        skills: {},
        residue: [],
      },
      practices: [],
    };
    const parsed = parseStudioSession(legacy);
    expect(parsed.benches.person?.held_residue).toEqual([]);
    expect(parsed.benches.person?.cook_choices).toEqual({ long: 0, holdback: 0 });
  });

  it('long fire adds LONG_FIRE_EXTRA_TICKS and records the choice', () => {
    const short = queueDevelop(chargedStudio(), null, createRng(51n));
    const long = queueDevelop(chargedStudio(), null, createRng(51n), { fire: 'long' });
    expect(short.bay?.fire).toBe('short');
    expect(long.bay?.cook_ticks_total).toBe(
      (short.bay?.cook_ticks_total ?? 0) + LONG_FIRE_EXTRA_TICKS,
    );
    expect(long.cook_choices.long).toBe(1);
    expect(long.cook_choices.holdback).toBe(0);
  });

  it('counts hold-back cooks and gates over-eager holds by spending the lowest first', () => {
    let studio = recordStudioResidues(createStudioState(), events(5));
    studio = queueDevelop(studio, null, createRng(61n), { holdBack: [0, 2, 4] });
    // No count cap anymore; but 3 held of 5 would leave 2 spendable < gate 3,
    // so the engine spends the LOWEST held index (0) and keeps [2, 4].
    expect(studio.held_residue).toEqual([2, 4]);
    expect(studio.bay?.residue).toHaveLength(3);
    expect(studio.cook_choices.holdback).toBe(1);
    // A hold that would empty the spendable window is clamped away entirely —
    // the cook still proceeds with the full window.
    const tiny = recordStudioResidues(createStudioState(), events(3));
    const queued = queueDevelop(tiny, null, createRng(61n), { holdBack: [0, 1, 2] });
    expect(queued.bay).not.toBeNull();
    expect(queued.held_residue).toEqual([]);
    expect(queued.bay?.residue).toHaveLength(3);
  });

  it('carries fire onto the compile request for the filler contract', () => {
    const long = queueDevelop(chargedStudio(), null, createRng(71n), { fire: 'long' });
    if (long.bay === null) {
      throw new Error('expected a queued bay');
    }
    expect(compileRequestFromBay(long.bay, 0, 0).fire).toBe('long');
    const short = queueDevelop(chargedStudio(), null, createRng(71n));
    if (short.bay === null) {
      throw new Error('expected a queued bay');
    }
    expect(compileRequestFromBay(short.bay, 0, 0).fire).toBe('short');
  });
});

/* ---- lane A+B seam: the harvest request carries the archive (dedup) ------ */

describe('harvestWithFiller archive threading', () => {
  it('sends prior archive details so the composer can dodge repeats', () => {
    let studio = chargedStudio();
    studio = queueDevelop(studio, null, createRng(81n));
    studio = tickStudio(studio, studio.bay?.cook_ticks_total ?? 0);
    const first = harvestTableFill(studio, createRng(81n));
    if (first === null) {
      throw new Error('expected a first harvest');
    }

    // Second identical window, harvested through a spying filler that
    // delegates to the tables: the request must carry the first card's
    // detail (the composer's dedup input)…
    let again = recordStudioResidues(first.studio, events(MIN_RESIDUE_TO_DEVELOP));
    again = queueDevelop(again, null, createRng(82n));
    again = tickStudio(again, again.bay?.cook_ticks_total ?? 0);
    const tables = tableFiller();
    let seenDetails: readonly string[] | undefined;
    const spy: ReturnType<typeof tableFiller> = {
      id: 'spy/table',
      fill: (request, rng) => {
        seenDetails = request.archive_details;
        return tables.fill(request, rng);
      },
    };
    const second = harvestWithFiller(again, createRng(82n), spy);
    if (second === null) {
      throw new Error('expected a second harvest');
    }
    expect(seenDetails).toContain(first.manifest.detail);
    // …and the composer spends it: the repeat window does not re-print the
    // first card's detail verbatim.
    expect(second.manifest.detail).not.toBe(first.manifest.detail);
  });

  it('also sends prior TITLES so a repeated row cannot repeat its name', () => {
    let studio = chargedStudio();
    studio = queueDevelop(studio, null, createRng(83n));
    studio = tickStudio(studio, studio.bay?.cook_ticks_total ?? 0);
    const first = harvestTableFill(studio, createRng(83n));
    if (first === null) {
      throw new Error('expected a first harvest');
    }
    let again = recordStudioResidues(first.studio, events(MIN_RESIDUE_TO_DEVELOP));
    again = queueDevelop(again, null, createRng(84n));
    again = tickStudio(again, again.bay?.cook_ticks_total ?? 0);
    let seenTitles: readonly string[] | undefined;
    const tables = tableFiller();
    const spy: ReturnType<typeof tableFiller> = {
      id: 'spy/table',
      fill: (request, rng) => {
        seenTitles = request.archive_titles;
        return tables.fill(request, rng);
      },
    };
    const second = harvestWithFiller(again, createRng(84n), spy);
    if (second === null) {
      throw new Error('expected a second harvest');
    }
    expect(seenTitles).toContain(first.manifest.name);
    // Same kind, same window shape, five other thing rows: the title dedup
    // must not reprint the first card's name while an alternative exists.
    expect(second.manifest.kind).toBe(first.manifest.kind);
    expect(second.manifest.name).not.toBe(first.manifest.name);
  });
});

describe('long fire rarity floor (browser finding 4)', () => {
  it('a long fire through the real bench path never returns common', () => {
    let fails = 0;
    for (let seed = 1n; seed <= 24n; seed += 1n) {
      let studio = recordStudioResidues(createStudioState(), events(6));
      studio = queueDevelop(studio, null, createRng(seed), { fire: 'long' });
      studio = tickStudio(studio, studio.bay?.cook_ticks_total ?? 0);
      const result = harvestTableFill(studio, createRng(seed));
      if (result === null) {
        throw new Error('expected a harvest');
      }
      if (result.manifest.rarity === 'common') {
        fails += 1;
      }
    }
    expect(fails).toBe(0);
  });
});

describe('sought encounter on the real bench path (wave 3b, red first)', () => {
  it('an encounter figure id passed to the harvest lands that figure card', () => {
    // Śākyamuni's row is tagged figure:shakyamuni in the base catalog.
    let studio = recordStudioResidues(createStudioState(), events(5));
    studio = queueDevelop(studio, null, createRng(91n));
    studio = tickStudio(studio, studio.bay?.cook_ticks_total ?? 0);
    const result = harvestTableFill(studio, createRng(91n), null, null, {
      encounterFigureId: 'figure:shakyamuni',
    });
    if (result === null) {
      throw new Error('expected a harvest');
    }
    expect(result.manifest.about_id).toBe('figure:shakyamuni');
    expect(result.manifest.tags).toContain('figure:shakyamuni');
  });

  it('without the id, the same window never summons him', () => {
    for (let seed = 200n; seed < 230n; seed += 1n) {
      let studio = recordStudioResidues(createStudioState(), events(5));
      studio = queueDevelop(studio, null, createRng(seed));
      studio = tickStudio(studio, studio.bay?.cook_ticks_total ?? 0);
      const result = harvestTableFill(studio, createRng(seed));
      if (result === null) {
        throw new Error('expected a harvest');
      }
      expect(result.manifest.about_id).not.toBe('figure:shakyamuni');
    }
  });
});
