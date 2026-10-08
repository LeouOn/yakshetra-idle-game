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
  it('lists 11 rows; undiscovered are silhouettes with hints', () => {
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
    expect(rows).toHaveLength(11);
    expect(ui.getByText(resolveSid('encounter.manjushri.hint_sid'))).toBeDefined();
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
    expect(() => ui.getByText('Mañjuśrī (Wenshu)')).not.toThrow();
    expect(() => ui.getByText(resolveSid('studio.sought_discovered_sid'))).not.toThrow();
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
    // The sought page marks the recipe discovered.
    ui.press(ui.getByTestID('studio-tab-archive'));
    const row = ui.getByTestID('studio-sought-row-encounter/manjushri-knot');
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
