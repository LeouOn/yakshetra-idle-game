import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { act, render } from '@/test/rntl';
import StudioCookPanel, { type CookChip } from '@/ui/components/StudioCookPanel';
import StudioView from '@/ui/components/StudioView';
import type { Practice, StudioState } from '@/engine';
import { studioToBench } from '@/engine/bench-mapping';
import {
  StudioSessionSchema,
  createRng,
  createStudioState,
  emptyHydratedSession,
  graduateToHousehold,
  queueDevelop,
  recordStudioResidues,
  snapshotStudioSession,
  tickStudio,
} from '@/engine';
import { loadProgression } from '@/content/progression/loader';
import type { DailySchedule } from '@/engine/schedule';
import type { ResidueEvent } from '@/engine/residue';
import { formatSid, resolveSid } from '@/i18n';

const practice: Practice = {
  id: 'practice.test',
  label_sid: 'practice.test.label_sid',
  description_sid: 'practice.test.desc_sid',
  lens: 'joyful_effort',
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

const LENS = 'lens_chosen|lens.test';
const PRAC_A = 'practice_tick|practice.a';

/** lens marker + three distinct practices: person and place both reachable. */
const MIX: readonly ResidueEvent[] = [
  { tick: 1, type: 'lens_chosen', ids: ['lens.test'], numbers: {} },
  { tick: 2, type: 'practice_tick', ids: ['practice.a'], numbers: { progress: 2 } },
  { tick: 3, type: 'practice_tick', ids: ['practice.b'], numbers: { progress: 2 } },
  { tick: 4, type: 'practice_tick', ids: ['practice.c'], numbers: { progress: 2 } },
];

function chip(index: number, event: ResidueEvent, held = false): CookChip {
  return { index, event, held };
}

function panel(chips: readonly CookChip[], gate = 3) {
  const onCook = vi.fn();
  const ui = render(
    createElement(StudioCookPanel, { chips, gate, onCook, onCancel: () => undefined }),
  );
  return { ui, onCook };
}

describe('StudioCookPanel (unit, round 2)', () => {
  it('previews the predicted kind of the default spend-everything plan', () => {
    const { ui } = panel(MIX.map((event, index) => chip(index, event)));
    expect(ui.getByTestID('studio-cook-preview').children[0]).toBe(
      formatSid('studio.cook_preview_sid', { kind: resolveSid('studio.kind_person_sid') }),
    );
  });

  it('a stepper moves the preview: spending no lens trace flips person to place', () => {
    const { ui } = panel(MIX.map((event, index) => chip(index, event)));
    ui.press(ui.getByTestID(`studio-cook-less-${LENS}`));
    expect(ui.getByTestID('studio-cook-preview').children[0]).toBe(
      formatSid('studio.cook_preview_sid', { kind: resolveSid('studio.kind_place_sid') }),
    );
  });

  it('spends below the gate are refused: the last spendable trace cannot step down', () => {
    // Gate 3, four single-trace groups: only one step-down is ever allowed.
    const { ui } = panel(MIX.map((event, index) => chip(index, event)));
    ui.press(ui.getByTestID(`studio-cook-less-${LENS}`)); // 4 → 3, allowed
    expect(ui.getByTestID(`studio-cook-less-${PRAC_A}`).props.disabled).toBe(true);
  });

  it('quick-picks offer only reachable kinds and select a plan that previews as them', () => {
    const { ui } = panel(MIX.map((event, index) => chip(index, event)));
    expect(() => ui.getByTestID('studio-cook-kind-person')).not.toThrow();
    expect(() => ui.getByTestID('studio-cook-kind-place')).not.toThrow();
    expect(() => ui.getByTestID('studio-cook-kind-thing')).toThrow(); // this pile cannot make one
    ui.press(ui.getByTestID('studio-cook-kind-place'));
    expect(ui.getByTestID('studio-cook-preview').children[0]).toBe(
      formatSid('studio.cook_preview_sid', { kind: resolveSid('studio.kind_place_sid') }),
    );
  });

  it('confirm emits the unspent indices as hold-back, with no count cap', () => {
    const events: ResidueEvent[] = [];
    for (let i = 0; i < 6; i += 1) {
      events.push({ tick: i + 1, type: 'practice_tick', ids: ['practice.a'], numbers: {} });
    }
    events.push({ tick: 7, type: 'lens_chosen', ids: ['lens.test'], numbers: {} });
    const { ui, onCook } = panel(events.map((event, index) => chip(index, event)));
    // Hold three of the six practice traces (the old cap was 2).
    for (let i = 0; i < 3; i += 1) {
      ui.press(ui.getByTestID('studio-cook-less-practice_tick|practice.a'));
    }
    ui.press(ui.getByTestID('studio-cook-fire-long'));
    ui.press(ui.getByTestID('studio-cook-confirm'));
    expect(onCook).toHaveBeenCalledWith({ fire: 'long', holdBack: [3, 4, 5] });
  });

  it('a carried-in hold starts unspent and meets the gate by spending others', () => {
    const chips = MIX.map((event, index) => chip(index, event));
    const heldLens = [chip(0, MIX[0] as ResidueEvent, true)];
    const { ui, onCook } = panel([
      ...heldLens,
      chips[1] as CookChip,
      chips[2] as CookChip,
      chips[3] as CookChip,
    ]);
    expect(ui.getByTestID(`studio-cook-spent-${LENS}`).children[0]).toBe(
      formatSid('studio.cook_group_spent_sid', { spent: 0, count: 1 }),
    );
    ui.press(ui.getByTestID('studio-cook-confirm'));
    expect(onCook).toHaveBeenCalledWith({ fire: 'short', holdBack: [0] });
  });
});

/* ---- integration through StudioView -------------------------------------- */

function cookedStudio(events: readonly ResidueEvent[], seed: bigint): StudioState {
  let studio = recordStudioResidues(createStudioState(), events);
  studio = queueDevelop(studio, null, createRng(seed));
  return tickStudio(studio, studio.bay?.cook_ticks_total ?? 0);
}

describe('StudioView cook flow (round 2)', () => {
  function renderStudio(initialStudio?: StudioState) {
    return render(
      createElement(StudioView, {
        practices: [practice],
        schedule,
        ...(initialStudio === undefined ? {} : { initialStudio }),
      }),
    );
  }

  it('opens the panel, quick-picks place, and cooks that subset', () => {
    const ui = renderStudio();
    for (let i = 0; i < 3; i += 1) {
      ui.press(ui.getByTestID('studio-tend'));
    }
    ui.press(ui.getByTestID('studio-develop'));
    expect(ui.getByTestID('studio-cook-panel')).toBeDefined();
    ui.press(ui.getByTestID('studio-cook-confirm'));
    expect(() => ui.getByText(resolveSid('studio.bay_empty_sid'))).toThrow();
    // 3 same-practice traces, short fire: 6 ticks.
    expect(() =>
      ui.getByText(
        formatSid('studio.cook_receipt_sid', {
          n: 3,
          fire: resolveSid('studio.cook_fire_word_short_sid'),
          ticks: 6,
        }),
      ),
    ).not.toThrow();
  });

  it('the develop control names the real blocker while a bay waits ready', () => {
    const studio = cookedStudio(
      [
        { tick: 1, type: 'practice_tick', ids: ['practice.test'], numbers: {} },
        { tick: 2, type: 'practice_tick', ids: ['practice.test'], numbers: {} },
        { tick: 3, type: 'practice_tick', ids: ['practice.test'], numbers: {} },
      ],
      7n,
    );
    const ui = renderStudio(studio);
    expect(ui.getByTestID('studio-develop-label').children[0]).toBe(
      resolveSid('studio.develop_bay_ready_sid'),
    );
    ui.press(ui.getByTestID('studio-harvest'));
    expect(ui.getByTestID('studio-develop-label').children[0]).not.toBe(
      resolveSid('studio.develop_bay_ready_sid'),
    );
  });

  it('regression: one reveal press drains a ready household bay AND the person bay', async () => {
    // The round-2 stall: harvest() took ONE bench per press, highest rung
    // first, so a ready household bay made "Reveal" need two clicks while
    // the develop button lied "more work needed".
    const reg = loadProgression();
    const hydrated = emptyHydratedSession();
    const base = snapshotStudioSession(
      hydrated.studio,
      hydrated.idle,
      hydrated.life,
      hydrated.practices,
    );
    const roles = reg.roles['household'];
    if (roles === undefined) {
      throw new Error('regression fixture: no household roles');
    }
    const session = graduateToHousehold(base, roles, createRng(11n));

    // Person bay ready.
    const person = cookedStudio(
      [
        { tick: 1, type: 'practice_tick', ids: ['practice.test'], numbers: {} },
        { tick: 2, type: 'practice_tick', ids: ['practice.test'], numbers: {} },
        { tick: 3, type: 'practice_tick', ids: ['practice.test'], numbers: {} },
      ],
      21n,
    );
    // Household bench with a ready bay (window + bay grafted onto the bench).
    let hh = recordStudioResidues(createStudioState(), [
      {
        tick: 1,
        type: 'practice_tick',
        ids: ['practice:tang/alms-round', 'member:m1'],
        numbers: {},
      },
      {
        tick: 2,
        type: 'practice_tick',
        ids: ['practice:tang/extra-bowl', 'member:m1'],
        numbers: {},
      },
      {
        tick: 3,
        type: 'practice_tick',
        ids: ['practice:tang/courtyard-beings', 'member:m1'],
        numbers: {},
      },
    ]);
    hh = queueDevelop(hh, null, createRng(22n));
    hh = tickStudio(hh, hh.bay?.cook_ticks_total ?? 0);
    const hhBench = session.benches['household'];
    if (hhBench === undefined || hh.bay === null || person.bay === null) {
      throw new Error('regression fixture: missing benches or bays');
    }
    // Graft by parse-spreading the session (the ladder-test pattern): the
    // person bench carries its ready bay, the household bench gets its own.
    const grafted = StudioSessionSchema.parse({
      ...session,
      benches: {
        ...session.benches,
        person: studioToBench(person),
        household: { ...hhBench, residue: hh.residue, bay: hh.bay },
      },
    });

    const ui = render(
      createElement(StudioView, {
        practices: [practice],
        schedule,
        initialSession: grafted,
      }),
    );
    // Pre-press: the develop control names the waiting person bay.
    expect(ui.getByTestID('studio-develop-label').children[0]).toBe(
      resolveSid('studio.develop_bay_ready_sid'),
    );
    // ONE press reveals both. (The drain awaits per tier bench, so the
    // commits land a microtask later — flush with an async act.)
    await act(async () => {
      ui.press(ui.getByTestID('studio-harvest'));
    });
    expect(ui.getByTextContent('and 1 more from the benches above')).toBeDefined();
    // Both bays are gone; the lie is gone with them.
    expect(ui.getByTestID('studio-develop-label').children[0]).not.toBe(
      resolveSid('studio.develop_bay_ready_sid'),
    );
  });
});

describe('tier-bench title dedup (item 0, end-to-end)', () => {
  it('a household harvest does not reprint a title the archive already holds', async () => {
    const reg = loadProgression();
    const hydrated = emptyHydratedSession();
    const base = snapshotStudioSession(
      hydrated.studio,
      hydrated.idle,
      hydrated.life,
      hydrated.practices,
    );
    const roles = reg.roles['household'];
    if (roles === undefined) {
      throw new Error('dedup fixture: no household roles');
    }
    const session = graduateToHousehold(base, roles, createRng(11n));

    // A social folded window compiles to a household tradition.
    let hh = recordStudioResidues(createStudioState(), [
      { tick: 1, type: 'lens_chosen', ids: ['lens.test', 'member:m1'], numbers: {} },
      { tick: 2, type: 'practice_tick', ids: ['practice.test', 'member:m1'], numbers: {} },
      { tick: 3, type: 'practice_tick', ids: ['practice.test', 'member:m2'], numbers: {} },
    ]);
    hh = queueDevelop(hh, null, createRng(97n));
    hh = tickStudio(hh, hh.bay?.cook_ticks_total ?? 0);
    const hhBench = session.benches['household'];
    if (hhBench === undefined || hh.bay === null) {
      throw new Error('dedup fixture: missing household bench/bay');
    }

    // The archive already holds a tradition card named 'The needle case'
    // (one of five authored tradition rows).
    const held = {
      schema_version: 'manifest/v1',
      id: 'm-held',
      rng_seed: '1',
      brief: null,
      residue_window_id: 'w-held',
      kind: 'tradition',
      scale: 'household',
      name: 'The needle case',
      one_liner: 'A bamboo tube with three needles and a story per slot.',
      subject: 'a case of three needles',
      detail: 'Held in the archive before this cook.',
      tags: ['needle', 'mend'],
      rarity: 'common',
      fill_status: 'table',
      quality_tier: 0,
      provenance: { source: 'table', revision: 'table/v0' },
    };

    const grafted = StudioSessionSchema.parse({
      ...session,
      archive: [held],
      benches: {
        ...session.benches,
        household: { ...hhBench, residue: hh.residue, bay: hh.bay },
      },
    });

    const ui = render(
      createElement(StudioView, { practices: [practice], schedule, initialSession: grafted }),
    );
    await act(async () => {
      ui.press(ui.getByTestID('studio-harvest'));
    });
    // The tier harvest threads the archive titles: the new tradition card
    // (named in the reveal receipt) must not reprint 'The needle case' while
    // four alternatives exist. The seeded card itself still shows in the
    // archive — that is correct; only the NEW card must differ.
    const texts = ui.container.queryAll((n) => typeof n.children?.[0] === 'string');
    const receipt = texts
      .map((n) => String(n.children[0]))
      .find((tx) => tx.startsWith('Revealed '));
    expect(receipt).toBeDefined();
    expect(receipt).not.toContain('The needle case');
  });
});

describe('banked heat in the panel (finding 1a/1b)', () => {
  it('advertises the planner totals and names the heat saving', () => {
    const { ui } = panelWithHeat(
      MIX.map((event, index) => chip(index, event)),
      10,
    );
    // 4 traces: short base 6, heat cap 3 -> short 3; long = 3 + 6 = 9.
    expect(() => ui.getByText(formatSid('studio.cook_fire_short_sid', { ticks: 3 }))).not.toThrow();
    expect(() => ui.getByText(formatSid('studio.cook_fire_long_sid', { ticks: 9 }))).not.toThrow();
    expect(ui.getByTestID('studio-cook-heat').children[0]).toBe(
      formatSid('studio.cook_heat_saves_sid', { n: 3 }),
    );
  });

  it('a huge bank still leaves the long fire costing six more than short', () => {
    const { ui } = panelWithHeat(
      MIX.map((event, index) => chip(index, event)),
      228,
    );
    // Cap is floor(6/2)=3 for both fires: short 3, long 9 — heat cannot
    // erase the trade.
    expect(() => ui.getByText(formatSid('studio.cook_fire_short_sid', { ticks: 3 }))).not.toThrow();
    expect(() => ui.getByText(formatSid('studio.cook_fire_long_sid', { ticks: 9 }))).not.toThrow();
  });
});

function panelWithHeat(chips: readonly CookChip[], surplus: number) {
  const onCook = vi.fn();
  const ui = render(
    createElement(StudioCookPanel, {
      chips,
      gate: 3,
      surplus,
      onCook,
      onCancel: () => undefined,
    }),
  );
  return { ui, onCook };
}
