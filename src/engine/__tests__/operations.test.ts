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
  importPlayResidue,
  pinFocus,
  absorbSurplus,
  pendingResidue,
  queueDevelop,
  recordStudioResidues,
  tickStudio,
  upgradeQuality,
} from '../';
import type { Practice } from '../';
import type { ResidueEvent } from '../residue';

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
    expect(studio.bay?.cook_ticks_total).toBe(2);
    expect(studio.surplus).toBe(1);
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
    expect(second?.manifest.detail).toContain(first.manifest.name);
  });

  /* ---- queueDevelop endowment opts (Phase 2 Task 2) ------------------------ */

  it('applies a cook ticks discount to the queued bay', () => {
    // Window 3 → cookTicksFor(3) = 7; a cook_speed of 2 discounts to 5.
    const queued = queueDevelop(chargedStudio(), null, createRng(7n), { cookTicksDiscount: 2 });
    expect(queued.bay?.cook_ticks_total).toBe(5);
  });

  it('floors the cook ticks discount at MIN_COOK_TICKS', () => {
    const queued = queueDevelop(chargedStudio(), null, createRng(7n), { cookTicksDiscount: 99 });
    expect(queued.bay?.cook_ticks_total).toBe(2);
  });

  it('spends surplus against the discounted cook, still floored', () => {
    let studio = absorbSurplus(chargedStudio(), 6);
    expect(studio.surplus).toBe(6);
    // Base 5 (7 − 2 discount); surplus may only spend down to the floor 2.
    studio = queueDevelop(studio, null, createRng(7n), { cookTicksDiscount: 2 });
    expect(studio.bay?.cook_ticks_total).toBe(2);
    expect(studio.surplus).toBe(3);
  });

  it('queues below MIN_RESIDUE_TO_DEVELOP only when minResidue is passed', () => {
    const two = recordStudioResidues(createStudioState(), events(2));
    expect(queueDevelop(two, null, createRng(7n)).bay).toBeNull();
    const queued = queueDevelop(two, null, createRng(7n), { minResidue: 2 });
    expect(queued.bay).not.toBeNull();
    expect(queued.bay?.cook_ticks_total).toBe(6); // cookTicksFor(2) = 6
    expect(queued.bay?.residue).toHaveLength(2);
  });

  it('floors a minResidue override at 1', () => {
    const one = recordStudioResidues(createStudioState(), events(1));
    expect(queueDevelop(one, null, createRng(7n), { minResidue: 0 }).bay).not.toBeNull();
    expect(
      queueDevelop(createStudioState(), null, createRng(7n), { minResidue: -3 }).bay,
    ).toBeNull();
  });

  it('keeps the legacy queue math when opts are empty', () => {
    const plain = queueDevelop(chargedStudio(), null, createRng(7n));
    const withEmptyOpts = queueDevelop(chargedStudio(), null, createRng(7n), {});
    expect(plain.bay?.cook_ticks_total).toBe(7);
    expect(withEmptyOpts.bay?.cook_ticks_total).toBe(7);
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
