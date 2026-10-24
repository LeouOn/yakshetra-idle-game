import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import { render } from '@/test/rntl';
import StudioView from '@/ui/components/StudioView';
import {
  StudioSessionSchema,
  createStudioState,
  emptyHydratedSession,
  recordStudioResidues,
  snapshotStudioSession,
  type Manifest,
  type Practice,
  type StudioState,
} from '@/engine';
import { studioToBench } from '@/engine/bench-mapping';
import type { DailySchedule } from '@/engine/schedule';

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

function sessionWith(studio: StudioState) {
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

describe('pinned pair through the real path (browser finding 2)', () => {
  it('pins set by the ARCHIVE BUTTONS reach the cook panel', () => {
    const a = personCard('m-a', 'Old Wu');
    const b = personCard('m-b', 'Auntie Qian');
    let studio: StudioState = { ...createStudioState(), archive: [a, b] };
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
    // The REAL path: pin via the archive buttons, then open the panel.
    ui.press(ui.getByTestID('studio-tab-archive'));
    ui.press(ui.getByTestID('archive-pin-m-a'));
    ui.press(ui.getByTestID('archive-pin-m-b'));
    ui.press(ui.getByTestID('studio-tab-bench'));
    ui.press(ui.getByTestID('studio-develop'));
    expect(() => ui.getByTestID('studio-cook-pinned')).not.toThrow();
    expect(String(ui.getByTestID('studio-cook-pinned').children[0])).toContain('Old Wu');
    expect(String(ui.getByTestID('studio-cook-pinned').children[0])).toContain('Auntie Qian');
  });
});
