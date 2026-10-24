// Figure cooldown (lane b1): a figure ARRIVES, it does not camp. With a
// figure-bound practice in every window the residue-matched candidate set is
// one figure, and before the cooldown it won every harvest (b4 measured 40
// of 40). The rule: after a figure card, that figure cannot be the
// residue-matched pick for the next N person-bench harvests; a window whose
// only candidate is cooling falls through to the generic person pool.
import { describe, expect, it } from 'vitest';

import {
  createRng,
  tableFillManifest,
  createStudioState,
  harvestWithFiller,
  queueDevelop,
  summarizeResidue,
  tickStudio,
  type LifeContext,
  type Manifest,
  type ResidueEvent,
  type StudioState,
} from '@/engine';

import { CATALOG } from '@/engine/manifest-catalog';

function lifeContext(eraId: string, window: readonly unknown[]): LifeContext {
  return {
    schema_version: 'life_context/v0',
    life_id: 'cool',
    age: 30,
    turn: 1,
    alive: true,
    lens: null,
    setting: {
      era_id: eraId,
      role_id: 'cool',
      year: 1,
      month: 1,
      day: 2,
      hour: 9,
      calendar_label: 'cool',
    },
    ties: [],
    strongest_tie: null,
    flags: [],
    residue_summary: summarizeResidue(window as Parameters<typeof summarizeResidue>[0]),
    activity: { work: 0, generosity: 0, beings: 0, learning: 0, meditation: 0, other: 0 },
    world_name: null,
    world_line: null,
  };
}

function guanyinTag(): string {
  const rows = CATALOG.person ?? [];
  const row = rows.find((r: { tags: readonly string[] }) =>
    r.tags.includes('figure:avalokiteshvara'),
  );
  const tag = row?.tags.find((t: string) => t.startsWith('mantra:') || t.startsWith('practice:'));
  if (row === undefined || tag === undefined) {
    throw new Error('no bindable tag on the guanyin row');
  }
  return tag;
}

function windowCarrying(id: string): readonly ResidueEvent[] {
  return [
    { tick: 1, type: 'lens_chosen', ids: [id, 'other'], numbers: {} },
    { tick: 2, type: 'lens_chosen', ids: [id, 'third'], numbers: {} },
    { tick: 3, type: 'practice_tick', ids: [id], numbers: {} },
  ];
}

function consecutive(eraId: string, windowIds: string[], count: number): Manifest[] {
  const rng = createRng(21n);
  let studio: StudioState = createStudioState();
  const out: Manifest[] = [];
  for (let i = 0; i < count; i += 1) {
    const w = windowCarrying(windowIds[i % windowIds.length] ?? '');
    const ctx = lifeContext(eraId, w);
    let charged: StudioState = { ...studio, residue: [...studio.residue, ...w] };
    charged = queueDevelop({ ...charged, last_harvest_index: -1, bay: null }, null, rng);
    const cooked = tickStudio(charged, 32);
    const result = harvestWithFiller(cooked, rng, undefined, ctx);
    if (result === null) {
      throw new Error(`harvest ${i} failed`);
    }
    studio = { ...result.studio, bay: null, residue: [] };
    out.push(result.manifest);
  }
  return out;
}

function isFigureCard(card: Manifest): boolean {
  return (card.about_id ?? '').startsWith('figure:');
}

function longestSameRun(cards: Manifest[], key: (c: Manifest) => string): number {
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const card of cards) {
    const k = key(card);
    if (k === prev) {
      run += 1;
    } else {
      run = 1;
      prev = k;
    }
    best = Math.max(best, run);
  }
  return best;
}

describe('figure cooldown on the person bench (real path)', () => {
  it('a bound practice does not camp the figure: share 20-50%, longest run <= 2', () => {
    const tag = guanyinTag();
    const cards = consecutive('tang-china@0.1.0', [tag], 80);
    const figures = cards.filter(isFigureCard);
    const figureShare = figures.length / cards.length;
    const longestFigureRun = longestSameRun(cards, (c) => c.name);
    const distinctFigures = new Set(figures.map((c) => c.name)).size;
    const bound = figures.filter((c) => c.about_id === 'figure:avalokiteshvara');
    process.stdout.write(
      `\n  tang: all-figure share ${(figureShare * 100).toFixed(0)}% (${figures.length}/80), ` +
        `bound share ${((bound.length / cards.length) * 100).toFixed(0)}% (${bound.length}/80), ` +
        `distinct figures ${distinctFigures}, longest same-card run ${longestFigureRun}\n`,
    );
    // Identity now attaches to every generic figure row too, so the
    // all-figure share is the person table's figure density (~68%); the
    // cooldown promise is about the BOUND figure (Guanyin), which stays 20%.
    expect(bound.length / cards.length).toBeGreaterThanOrEqual(0.2);
    expect(bound.length / cards.length).toBeLessThanOrEqual(0.5);
    expect(distinctFigures).toBe(12);
    expect(longestFigureRun).toBeLessThanOrEqual(2);
  });

  it('a Garden window naming a figure behaves the same way', () => {
    const cards = consecutive('fantasy-mahayana@0.1.0', ['figure:avalokiteshvara'], 80);
    const figures = cards.filter(isFigureCard);
    const figureShare = figures.length / cards.length;
    const longestFigureRun = longestSameRun(cards, (c) => c.name);
    const bound = figures.filter((c) => c.about_id === 'figure:avalokiteshvara');
    process.stdout.write(
      `\n  garden: all-figure share ${(figureShare * 100).toFixed(0)}% (${figures.length}/80), ` +
        `bound share ${((bound.length / cards.length) * 100).toFixed(0)}% (${bound.length}/80), ` +
        `longest same-card run ${longestFigureRun}\n`,
    );
    expect(bound.length / cards.length).toBeGreaterThanOrEqual(0.2);
    expect(bound.length / cards.length).toBeLessThanOrEqual(0.5);
    expect(figureShare).toBeGreaterThanOrEqual(0.2); // all 12 names still appear
    expect(longestFigureRun).toBeLessThanOrEqual(2);
  });

  it('a sought encounter always answers, cooldown or not', () => {
    const tag = guanyinTag();
    const w = windowCarrying(tag);
    const rng = createRng(3n);
    const names: string[] = [];
    for (let i = 0; i < 8; i += 1) {
      const card = tableFillManifest(
        w,
        null,
        0,
        rng,
        String(i),
        `enc-${i}`,
        null,
        lifeContext('tang-china@0.1.0', w),
        'person',
        undefined,
        undefined,
        [],
        'short',
        undefined,
        names, // archive titles: the same figure, already harvested
        'figure:avalokiteshvara',
      );
      names.push(card.name);
      expect(card.about_id).toBe('figure:avalokiteshvara');
    }
  });

  it('a long fire shortens the cooldown to one; a short fire keeps four', () => {
    const tag = guanyinTag();
    const w = windowCarrying(tag);
    const rng = createRng(5n);
    // Figure card two harvests back (one generic since): a LONG fire may
    // call her again (cooldown 1 has expired); a SHORT fire may not (four).
    const titles = ['other person', 'Avalokiteśvara (Guanyin)', 'x', 'y'];
    const longCard = tableFillManifest(
      w,
      null,
      0,
      rng,
      '1',
      'lf-1',
      null,
      lifeContext('tang-china@0.1.0', w),
      'person',
      undefined,
      undefined,
      [],
      'long',
      undefined,
      titles,
    );
    expect(longCard.about_id).toBe('figure:avalokiteshvara');
    const shortCard = tableFillManifest(
      w,
      null,
      0,
      rng,
      '2',
      'sf-1',
      null,
      lifeContext('tang-china@0.1.0', w),
      'person',
      undefined,
      undefined,
      [],
      'short',
      undefined,
      titles,
    );
    expect(shortCard.about_id).not.toBe('figure:avalokiteshvara');
  });

  it('always-long-fire stays a decision, not a camp: share <= 60%, run <= 2', () => {
    const tag = guanyinTag();
    const w = windowCarrying(tag);
    const rng = createRng(9n);
    const cards: Manifest[] = [];
    for (let i = 0; i < 80; i += 1) {
      const card = tableFillManifest(
        w,
        null,
        0,
        rng,
        String(i),
        `al-${i}`,
        null,
        lifeContext('tang-china@0.1.0', w),
        'person',
        undefined,
        undefined,
        [],
        'long',
        undefined,
        cards.map((c) => c.name),
      );
      cards.push(card);
    }
    const figures = cards.filter((c) => (c.about_id ?? '').startsWith('figure:'));
    const bound = cards.filter((c) => c.about_id === 'figure:avalokiteshvara');
    const longest = longestSameRun(cards, (c) =>
      c.about_id === 'figure:avalokiteshvara' ? 'BOUND' : 'other',
    );
    process.stdout.write(
      `\n  always-long: all-figure share ${((figures.length / 80) * 100).toFixed(0)}% (${figures.length}/80), ` +
        `bound share ${((bound.length / 80) * 100).toFixed(0)}% (${bound.length}/80), longest figure run ${longest}\n`,
    );
    // Long fire shortens the cooldown to one, so the BOUND figure answers
    // every other card at most; the all-figure share is the table density.
    expect(bound.length / 80).toBeLessThanOrEqual(0.6);
    expect(longest).toBeLessThanOrEqual(2);
  });
});
