import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import { render } from '@/test/rntl';
import StudioView from '@/ui/components/StudioView';
import StudioSoughtList from '@/ui/components/StudioSoughtList';
import {
  StudioSessionSchema,
  createStudioState,
  emptyHydratedSession,
  recordStudioResidues,
  snapshotStudioSession,
  type Manifest,
  type Practice,
  type StudioSession,
  type StudioState,
} from '@/engine';
import { studioToBench } from '@/engine/bench-mapping';
import { resolveSid } from '@/i18n';
import { loadProgression } from '@/content/progression/loader';
import type { DailySchedule } from '@/engine/schedule';

const practice: Practice = {
  id: 'practice.test',
  label_sid: 'practice.test.label_sid',
  description_sid: 'practice.test.desc_sid',
  lens: 'joyful_effort', // learning family — matches the manjushri recipe
  progressPerTick: 1,
  maxProgress: 100,
  currentProgress: 0,
  level: 0,
  effects: [],
};

const schedule: DailySchedule = {
  id: 'all-day',
  name_sid: 'studio.title_sid',
  blocks: [
    {
      id: 'all',
      label_sid: 'studio.tend_button_sid',
      startHour: 0,
      endHour: 24,
      practice_id: practice.id,
      icon_sid: 'studio.title_sid',
    },
  ],
};

function personCard(id: string, name: string): Manifest {
  return {
    schema_version: 'manifest/v1',
    id,
    rng_seed: '1',
    brief: null,
    residue_window_id: 'w-x',
    kind: 'person',
    scale: 'person',
    name,
    one_liner: 'A test person.',
    subject: 'a test person',
    detail: 'A test person card.',
    tags: ['person'],
    rarity: 'common',
    fill_status: 'table',
    quality_tier: 0,
    provenance: { source: 'table', revision: 'table/v0' },
  };
}

function sessionWith(studio: StudioState): StudioSession {
  const hydrated = emptyHydratedSession();
  const base = snapshotStudioSession(
    hydrated.studio,
    hydrated.idle,
    hydrated.life,
    hydrated.practices,
  );
  return StudioSessionSchema.parse({
    ...base,
    benches: { ...base.benches, person: studioToBench(studio) },
    archive: studio.archive,
  });
}

describe('pin-two in the archive (item 2)', () => {
  function mount(session: StudioSession) {
    const ui = render(
      createElement(StudioView, { practices: [practice], schedule, initialSession: session }),
    );
    return ui;
  }

  it('pinning two archive cards shows the pair together, either removable', () => {
    const a = personCard('m-a', 'Old Wu');
    const b = personCard('m-b', 'Auntie Qian');
    let studio = { ...createStudioState(), archive: [a, b] };
    let session = sessionWith(studio);
    const ui = mount(session);
    ui.press(ui.getByTestID('studio-tab-archive'));
    // Pin the first, then the second.
    ui.press(ui.getByTestID('archive-pin-m-a'));
    ui.press(ui.getByTestID('archive-pin-m-b'));
    expect(() => ui.getByTestID('archive-pinned-pair')).not.toThrow();
    expect(() => ui.getByTestID('archive-unpin-m-a')).not.toThrow();
    expect(() => ui.getByTestID('archive-unpin-m-b')).not.toThrow();
    // Either is removable: unpin the second.
    ui.press(ui.getByTestID('archive-unpin-m-b'));
    expect(ui.container.queryAll((n) => n.props.testID === 'archive-unpin-m-b')).toHaveLength(0);
    expect(() => ui.getByTestID('archive-unpin-m-a')).not.toThrow();
    void studio;
    void session;
  });

  it('the cook panel shows the pinned pair', () => {
    const a = personCard('m-a', 'Old Wu');
    const b = personCard('m-b', 'Auntie Qian');
    let studio: StudioState = {
      ...createStudioState(),
      archive: [a, b],
      pinned: {
        id: a.id,
        name: a.name,
        kind: 'person',
        one_liner: a.one_liner,
        second: { id: b.id, name: b.name, kind: 'person', one_liner: b.one_liner },
      },
    };
    // 4 learning traces: thing window, gate met, panel opens.
    studio = recordStudioResidues(studio, [
      { tick: 1, type: 'practice_tick', ids: ['practice.test'], numbers: {} },
      { tick: 2, type: 'practice_tick', ids: ['practice.test'], numbers: {} },
      { tick: 3, type: 'practice_tick', ids: ['practice.test'], numbers: {} },
      { tick: 4, type: 'practice_tick', ids: ['practice.test'], numbers: {} },
    ]);
    const bench = mount(sessionWith(studio));
    bench.press(bench.getByTestID('studio-develop'));
    expect(bench.getByTestID('studio-cook-pinned').children[0]).toBe(
      'Pinned for the next working: Old Wu and Auntie Qian',
    );
  });
});

describe('the sought page (item 3)', () => {
  /** How many nodes carry this exact text (a name may appear in more than
   * one place; a figure must appear once). */
  function countText(ui: ReturnType<typeof render>, text: string): number {
    return ui.container.queryAll((n) => String(n.children?.[0] ?? '') === text).length;
  }

  it('lists one row per FIGURE; undiscovered are silhouettes with hints', () => {
    const ui = render(
      createElement(StudioSoughtList, {
        encounters: LOAD_ENCOUNTERS(),
        encountered: [],
        archive: [],
      }),
    );
    const rows = ui.container.queryAll((n) =>
      String(n.props.testID ?? '').startsWith('studio-sought-row-'),
    );
    // 11 recipes, 9 figures: two figures have two recipes each. The ledger
    // counts PEOPLE, so it shows one row each.
    expect(rows).toHaveLength(9);
    expect(ui.getByText(resolveSid('encounter.manjushri.hint_sid'))).toBeDefined();
    // The tally counts figures, not recipes: nothing met yet.
    expect(ui.getByTestID('studio-sought-tally').children[0]).toBe(
      '0 of 9 answered · 9 still looked for',
    );
  });

  it('a figure with TWO recipes is one row and one tally entry', () => {
    const card = personCard('m-fig', 'Mañjuśrī (Wenshu)');
    const marked = {
      ...card,
      about_id: 'figure:manjushri',
      tags: [...card.tags, 'figure:manjushri'],
    };
    const rows = LOAD_ENCOUNTERS();
    // Two recipes aim at figure:manjushri: his knot and the Wutai terrace.
    const manjushriRecipes = rows.filter((row) => row.figure_id === 'figure:manjushri');
    expect(manjushriRecipes).toHaveLength(2);
    const ui = render(
      createElement(StudioSoughtList, {
        encounters: rows,
        // The KNOT recipe fired; the Wutai one never did.
        encountered: ['encounter/manjushri-knot'],
        archive: [marked],
      }),
    );
    // ONE row for him, and his name appears ONCE — the double count the
    // cycle-1 test had to hide behind 'greater than 0'.
    expect(countText(ui, 'Mañjuśrī (Wenshu)')).toBe(1);
    expect(countText(ui, resolveSid('studio.sought_discovered_sid'))).toBe(1);
    // He counts ONCE in the tally.
    expect(ui.getByTestID('studio-sought-tally').children[0]).toBe(
      '1 of 9 answered · 8 still looked for',
    );
  });

  it('a discovered row shows the answering card', () => {
    const card = personCard('m-fig', 'Mañjuśrī (Wenshu)');
    const marked = {
      ...card,
      about_id: 'figure:manjushri',
      tags: [...card.tags, 'figure:manjushri'],
    };
    const rows = LOAD_ENCOUNTERS();
    const manjushri = rows.find((r) => r.id === 'encounter/manjushri-knot');
    if (manjushri === undefined) throw new Error('fixture: no manjushri recipe');
    const ui = render(
      createElement(StudioSoughtList, {
        encounters: rows,
        encountered: [manjushri.id],
        archive: [marked],
      }),
    );
    // Exactly one name, exactly one Answered badge: the figure is listed
    // once however many recipes aim at him.
    expect(countText(ui, 'Mañjuśrī (Wenshu)')).toBe(1);
    expect(countText(ui, resolveSid('studio.sought_discovered_sid'))).toBe(1);
  });
});

function LOAD_ENCOUNTERS() {
  return loadProgression().encounters;
}

describe('the encounter journey through StudioView (items 1+4)', () => {
  function mountJourney(pinned: StudioState) {
    return render(
      createElement(StudioView, {
        practices: [practice],
        schedule,
        initialSession: sessionWith(pinned),
      }),
    );
  }

  it('pin a person, cook the right window: the figure answers, the line shows, the page marks it', async () => {
    const a = personCard('m-a', 'Old Wu');
    // 4 learning traces -> thing window, count 4 -> the manjushri recipe
    // (pinned [person], family learning, kind thing, min 4).
    let studio: StudioState = {
      ...createStudioState(),
      archive: [a],
      pinned: { id: a.id, name: a.name, kind: 'person', one_liner: a.one_liner },
    };
    studio = recordStudioResidues(studio, [
      { tick: 1, type: 'practice_tick', ids: ['practice.test'], numbers: {} },
      { tick: 2, type: 'practice_tick', ids: ['practice.test'], numbers: {} },
      { tick: 3, type: 'practice_tick', ids: ['practice.test'], numbers: {} },
      { tick: 4, type: 'practice_tick', ids: ['practice.test'], numbers: {} },
    ]);
    const ui = mountJourney(studio);
    ui.press(ui.getByTestID('studio-develop'));
    ui.press(ui.getByTestID('studio-cook-confirm'));
    ui.press(ui.getByTestID('studio-tend'));
    ui.press(ui.getByTestID('studio-harvest'));
    // The reveal stage: the figure answered, the one line shows.
    expect(() => ui.getByTestID('reveal-sought-line')).not.toThrow();
    expect(ui.getByTestID('reveal-sought-line').children[0]).toBe(
      resolveSid('encounter.reveal_line_sid'),
    );
    ui.press(ui.getByTestID('reveal-continue'));
    // The sought page marks the figure Answered.
    ui.press(ui.getByTestID('studio-tab-archive'));
    const row = ui.getByTestID('studio-sought-row-figure:manjushri');
    expect(row.props.accessibilityLabel).toContain(resolveSid('studio.sought_discovered_sid'));
  });

  it('no pin, no line: the reveal stage stays quiet on a plain harvest', async () => {
    let studio = createStudioState();
    studio = recordStudioResidues(studio, [
      { tick: 1, type: 'practice_tick', ids: ['practice.test'], numbers: {} },
      { tick: 2, type: 'practice_tick', ids: ['practice.test'], numbers: {} },
      { tick: 3, type: 'practice_tick', ids: ['practice.test'], numbers: {} },
    ]);
    const ui = mountJourney(studio);
    ui.press(ui.getByTestID('studio-develop'));
    ui.press(ui.getByTestID('studio-cook-confirm'));
    ui.press(ui.getByTestID('studio-tend'));
    ui.press(ui.getByTestID('studio-harvest'));
    expect(ui.container.queryAll((n) => n.props.testID === 'reveal-sought-line')).toHaveLength(0);
  });

  it('an old save with a single pin loads and shows one pin chip', () => {
    const a = personCard('m-a', 'Old Wu');
    let studio: StudioState = {
      ...createStudioState(),
      archive: [a],
      pinned: { id: a.id, name: a.name, kind: 'person', one_liner: a.one_liner },
    };
    studio = recordStudioResidues(studio, [
      { tick: 1, type: 'practice_tick', ids: ['practice.test'], numbers: {} },
      { tick: 2, type: 'practice_tick', ids: ['practice.test'], numbers: {} },
      { tick: 3, type: 'practice_tick', ids: ['practice.test'], numbers: {} },
    ]);
    const ui = mountJourney(studio);
    ui.press(ui.getByTestID('studio-tab-archive'));
    expect(() => ui.getByTestID('archive-unpin-m-a')).not.toThrow();
    expect(
      ui.container.queryAll((n) => String(n.props.testID ?? '').startsWith('archive-unpin-')),
    ).toHaveLength(1);
  });
});

describe('cook-panel family labels (browser finding 3b)', () => {
  it('the cook panel labels trace groups with their family', () => {
    let studio: StudioState = { ...createStudioState(), archive: [personCard('m-a', 'Old Wu')] };
    studio = recordStudioResidues(studio, [
      { tick: 1, type: 'practice_tick', ids: ['practice.test'], numbers: {} },
      { tick: 2, type: 'practice_tick', ids: ['practice.test'], numbers: {} },
      { tick: 3, type: 'practice_tick', ids: ['practice.test'], numbers: {} },
      { tick: 4, type: 'practice_tick', ids: ['practice.test'], numbers: {} },
    ]);
    const ui = render(
      createElement(StudioView, {
        practices: [practice],
        schedule,
        initialSession: sessionWith(studio),
      }),
    );
    ui.press(ui.getByTestID('studio-develop'));
    // practice.test's lens is joyful_effort -> Learning.
    const group = ui.getByTestID('studio-cook-group-practice_tick|practice.test');
    const label = String(
      (
        group.children.find(
          (child) => typeof (child as { children?: readonly unknown[] }).children?.[0] === 'string',
        ) as { children: readonly unknown[] }
      )?.children?.[0] ?? '',
    );
    expect(label).toContain('Learning');
  });
});

describe('sought ledger by archive (browser finding 3a)', () => {
  it('a figure in the archive by ANY route marks the row Answered, no encounter needed', () => {
    const marked = {
      ...personCard('m-fig', 'Mañjuśrī (Wenshu)'),
      about_id: 'figure:manjushri',
      tags: ['person', 'figure:manjushri'],
    };
    const rows = LOAD_ENCOUNTERS();
    const ui = render(
      createElement(StudioSoughtList, {
        encounters: rows,
        encountered: [], // no recipe ever fired
        archive: [marked],
      }),
    );
    const row = ui.getByTestID('studio-sought-row-figure:manjushri');
    expect(row.props.accessibilityLabel).toContain(resolveSid('studio.sought_discovered_sid'));
    // Met BY CHANCE counts: his name is shown, and he is counted once.
    const names = ui.container.queryAll(
      (n) => String(n.children?.[0] ?? '') === 'Mañjuśrī (Wenshu)',
    );
    expect(names).toHaveLength(1);
    expect(ui.getByTestID('studio-sought-tally').children[0]).toBe(
      '1 of 9 answered · 8 still looked for',
    );
  });

  it('a person card answers the figure even when a place carrying his tag came first', () => {
    // Wutai Shan is tagged for Manjushri and may be harvested before he is.
    const place = {
      ...personCard('m-place', 'Wutai Shan'),
      kind: 'place' as const,
      about_id: 'figure:manjushri',
      tags: ['place', 'figure:manjushri'],
    };
    const person = {
      ...personCard('m-fig', 'Mañjuśrī (Wenshu)'),
      about_id: 'figure:manjushri',
      tags: ['person', 'figure:manjushri'],
    };
    const ui = render(
      createElement(StudioSoughtList, {
        encounters: LOAD_ENCOUNTERS(),
        encountered: [],
        archive: [place, person], // the place first in archive order
      }),
    );
    const named = (name: string) =>
      ui.container.queryAll((n) => String(n.children?.[0] ?? '') === name);
    expect(named('Mañjuśrī (Wenshu)')).toHaveLength(1);
    expect(named('Wutai Shan')).toHaveLength(0);
  });
});
