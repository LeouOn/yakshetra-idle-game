import { describe, expect, it } from 'vitest';

import {
  MIN_RESIDUE_TO_DEVELOP,
  STUDIO_AWAY_TICK_CAP,
  STUDIO_SECONDS_PER_TICK,
  catchUpSession,
  compileRequestFromBay,
  createIdleState,
  createLifeState,
  createRng,
  createStudioState,
  fillManifestSafe,
  harvestTableFill,
  queueDevelop,
  recordStudioResidues,
  snapshotStudioSession,
  tableFiller,
  tableFillManifest,
  tickStudio,
} from '../';
import type { LifeState, Practice } from '../';
import { composeCard } from '../card-composer';
import { CATALOG } from '../manifest-catalog';
import { summarizeResidue, type ResidueEvent } from '../residue';
import type { DailySchedule } from '../schedule';
import type { SessionStepContext } from '../session-step';

// A harvest with no life context (the away catch-up, the tier benches) used to see every row of
// both eras. The bench's era now rides on the request, so a Garden bench never prints a Tang-only
// row and a Tang bench never prints a Garden-only one.

function eraNames(): { tangOnly: Set<string>; fantasyOnly: Set<string> } {
  const byEra: Record<string, Set<string>> = {
    tang: new Set(),
    fantasy: new Set(),
    neutral: new Set(),
  };
  for (const rows of Object.values(CATALOG)) {
    for (const row of rows ?? []) {
      const bucket = byEra[row.era ?? 'neutral']!;
      bucket.add(row.name);
      for (const template of row.templates ?? []) {
        if (typeof template.name === 'string') bucket.add(template.name);
      }
    }
  }
  const only = (own: Set<string>): Set<string> =>
    new Set(
      [...own].filter(
        (n) =>
          !byEra['neutral']!.has(n) &&
          !(own === byEra['tang'] ? byEra['fantasy']! : byEra['tang']!).has(n),
      ),
    );
  return { tangOnly: only(byEra['tang']!), fantasyOnly: only(byEra['fantasy']!) };
}

const { tangOnly, fantasyOnly } = eraNames();
const SEEDS = Array.from({ length: 60 }, (_, i) => BigInt(i + 1));

function window3(): ResidueEvent[] {
  return [1, 2, 3].map((tick) => ({
    tick,
    type: 'practice_tick' as const,
    ids: ['practice.test'],
    numbers: { progress: 1 },
  }));
}

function split(names: readonly string[]): { tang: number; fantasy: number } {
  return {
    tang: names.filter((n) => tangOnly.has(n)).length,
    fantasy: names.filter((n) => fantasyOnly.has(n)).length,
  };
}

describe('the era hint on a harvest with no life context', () => {
  it('the name sets can tell the eras apart', () => {
    expect(tangOnly.size).toBeGreaterThan(5);
    expect(fantasyOnly.size).toBeGreaterThan(5);
  });

  it('tableFillManifest: each era keeps to its own rows; no hint leaves both eras in play', () => {
    const draw = (eraId: string | undefined): string[] =>
      SEEDS.map(
        (seed) =>
          tableFillManifest(
            window3(),
            null,
            0,
            createRng(seed),
            `s${seed}`,
            `m-${seed}`,
            null,
            null,
            'person',
            undefined,
            undefined,
            [],
            'short',
            undefined,
            [],
            undefined,
            {},
            eraId,
          ).name,
      );
    expect(split(draw('fantasy-mahayana')).tang).toBe(0);
    expect(split(draw('tang-china')).fantasy).toBe(0);
    // The control: without a hint the same draws do reach both eras' rows.
    const neutral = split(draw(undefined));
    expect(neutral.tang).toBeGreaterThan(0);
    expect(neutral.fantasy).toBeGreaterThan(0);
  });

  it('the compile request carries the era to the table filler, and fillManifestSafe falls back with it', () => {
    const bay = {
      residue: window3(),
      residue_window_id: 'w',
      rng_seed: 'seed',
      brief: null,
      focus: null,
    };
    const request = compileRequestFromBay(
      bay as never,
      0,
      0,
      null,
      'person',
      undefined,
      [],
      [],
      {},
      'fantasy-mahayana',
    );
    expect(request.era_id).toBe('fantasy-mahayana');
    expect('era_id' in compileRequestFromBay(bay as never, 0, 0)).toBe(false);
    const boom = {
      id: 'boom',
      fill: (): never => {
        throw new Error('model refused');
      },
    };
    const names = SEEDS.map((seed) => fillManifestSafe(request, createRng(seed), boom).name);
    expect(split(names).tang).toBe(0);
    expect(tableFiller().fill(request, createRng(1n)).name).toBeTruthy();
  });

  it('harvestTableFill hands the era from the bay to the card', () => {
    const names = (eraId: string | undefined): string[] =>
      SEEDS.map((seed) => {
        let studio = recordStudioResidues(createStudioState(), window3().concat(window3()));
        studio = queueDevelop(studio, null, createRng(seed));
        studio = tickStudio(studio, studio.bay?.cook_ticks_total ?? 0);
        const out = harvestTableFill(
          studio,
          createRng(seed),
          null,
          null,
          eraId === undefined ? undefined : { eraId },
        );
        return out?.manifest.name ?? '';
      });
    expect(split(names('fantasy-mahayana')).tang).toBe(0);
    expect(split(names('tang-china')).fantasy).toBe(0);
    const neutral = split(names(undefined));
    expect(neutral.tang + neutral.fantasy).toBeGreaterThan(0);
  });
});

describe('the composer reads the same hint for phrasing', () => {
  it('Medicine Buddha with a Garden hint prints only his Garden-scoped phrasing, never the Tang row body', () => {
    const row = (CATALOG.person ?? []).find((r) => r.tags.includes('figure:medicine-buddha'))!;
    const gardenBodies = new Set(
      (row.templates ?? []).filter((t) => t.era === 'fantasy').map((t) => t.detail),
    );
    const print = (eraId: string | undefined): Set<string> =>
      new Set(
        SEEDS.map(
          (seed) =>
            composeCard(row, {
              summary: summarizeResidue(window3()),
              lifeContext: null,
              focus: null,
              brief: null,
              rarity: 'common',
              qualityTier: 0,
              fire: 'short',
              usedDetails: [],
              usedTitles: [],
              ...(eraId === undefined ? {} : { eraId }),
              rng: createRng(seed),
            }).detail,
        ),
      );
    const garden = print('fantasy-mahayana');
    expect(gardenBodies.size).toBeGreaterThan(0);
    expect([...garden].every((d) => gardenBodies.has(d))).toBe(true);
    expect(garden.has(row.detail)).toBe(false);
    // The control: no hint keeps the row's own body in play.
    expect(print(undefined).has(row.detail) || print(undefined).size > garden.size).toBe(true);
  });
});

describe('the away catch-up follows the session era', () => {
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
  const SCHEDULE: DailySchedule = {
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
  const CTX: SessionStepContext = {
    practices: SIX,
    embodiedSchedule: SCHEDULE,
    memberScheduleFor: () => {
      throw new Error('no members');
    },
    memberPracticesFor: () => {
      throw new Error('no members');
    },
    endings: [],
    sessionSeed: 'bench-era',
    tiers: [],
  };
  const life: LifeState = createLifeState({
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

  function awayNames(benchEra: string | undefined): string[] {
    const out: string[] = [];
    for (const seed of SEEDS) {
      const events: ResidueEvent[] = Array.from({ length: MIN_RESIDUE_TO_DEVELOP }, (_, i) => ({
        tick: i + 1,
        type: 'practice_tick' as const,
        ids: ['practice.test'],
        numbers: { progress: 1 },
      }));
      let studio = recordStudioResidues(createStudioState(), events);
      studio = queueDevelop(studio, null, createRng(seed));
      const last = 1_000;
      const session = snapshotStudioSession(
        studio,
        createIdleState(),
        life,
        SIX,
        last,
        undefined,
        benchEra === undefined ? undefined : { bench_era: benchEra },
      );
      const caught = catchUpSession(
        session,
        CTX,
        last + STUDIO_AWAY_TICK_CAP * STUDIO_SECONDS_PER_TICK,
        createRng(seed),
      );
      out.push(...caught.session.archive.map((card) => card.name));
    }
    return out;
  }

  it('a Garden session archives no Tang-only row, a Tang session no Garden-only row', () => {
    expect(split(awayNames('fantasy-mahayana')).tang).toBe(0);
    expect(split(awayNames('tang-china')).fantasy).toBe(0);
  });

  it('a session with no era (saved before the field) is unchanged: both eras still draw', () => {
    const old = split(awayNames(undefined));
    expect(old.tang).toBeGreaterThan(0);
    expect(old.fantasy).toBeGreaterThan(0);
  });
});
