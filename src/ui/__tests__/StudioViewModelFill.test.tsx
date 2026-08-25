// Model-first harvest through the injected completer (SPEC §16.2, Phase 6
// Task 3). The fixture is copied verbatim from StudioView.test.tsx: the
// smallest ready-bay construction (makePractice + ALL_DAY + the social
// window from the person-kind-badge test) and the persisted-storage
// observation the harvestRound helper uses (persist + memory kv + fixed
// clock, unmount, loadStudioSession).

import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';

import StudioView, { type StudioViewProps } from '@/ui/components/StudioView';
import { act, render } from '@/test/rntl';
import {
  createRng,
  createStudioState,
  queueDevelop,
  recordStudioResidues,
  tickStudio,
  type Practice,
  type ResidueEvent,
  type StudioSession,
  type StudioState,
} from '@/engine';
import { createMemoryStudioKv, loadStudioSession } from '@/persistence';
import type { DailySchedule } from '@/engine/schedule';

/* ---- fixture copied verbatim from StudioView.test.tsx ------------------- */

function makePractice(): Practice {
  return {
    id: 'practice.test',
    label_sid: 'practice.test.label_sid',
    description_sid: 'practice.test.desc_sid',
    lens: 'joyful_effort',
    progressPerTick: 1,
    maxProgress: 100,
    currentProgress: 0,
    level: 0,
    effects: [{ op: 'add_resource', key: 'skill', delta: 1 }],
  };
}

const ALL_DAY: DailySchedule = {
  id: 'all-day',
  name_sid: 'studio.title_sid',
  blocks: [
    {
      id: 'all',
      label_sid: 'studio.tend_button_sid',
      startHour: 0,
      endHour: 24,
      practice_id: 'practice.test',
      icon_sid: 'studio.title_sid',
    },
  ],
};

// The social window from the "renders a person kind badge when a social
// window is harvested" test, verbatim.
const SOCIAL_WINDOW: ResidueEvent[] = [
  { tick: 1, type: 'lens_chosen', ids: ['lens.test'], numbers: {} },
  { tick: 2, type: 'practice_tick', ids: ['practice.test'], numbers: { progress: 2 } },
  { tick: 3, type: 'practice_tick', ids: ['practice.test'], numbers: { progress: 2 } },
];

function readyPersonStudio(): StudioState {
  let studio: StudioState = recordStudioResidues(createStudioState(), SOCIAL_WINDOW);
  studio = queueDevelop(studio, null, createRng(31n));
  studio = tickStudio(studio, studio.bay?.cook_ticks_total ?? 0);
  expect(studio.bay?.status).toBe('ready');
  return studio;
}

/* ---- local helper on top of the copied fixture -------------------------- */

function modelPayload(id: string): Record<string, unknown> {
  return {
    schema_version: 'manifest/v1',
    id,
    rng_seed: 'bench-seed',
    brief: null,
    residue_window_id: 'w-model',
    kind: 'person',
    scale: 'person',
    name: 'The model clerk',
    one_liner: 'Written by the completer.',
    subject: 'a model subject',
    detail: 'The model wrote this sentence.',
    tags: ['model'],
    rarity: 'common',
    fill_status: 'model',
    quality_tier: 0,
    provenance: { source: 'model', revision: 'zai/glm-4.6' },
  };
}

/** Render with a ready person bay, press harvest, flush the async fill,
 * and read the archived studio back through persisted storage (the same
 * observation trick StudioView.test.tsx's harvestRound uses). */
async function renderReadyBenchHarvested(
  props: Partial<Pick<StudioViewProps, 'completeManifest'>> = {},
): Promise<{ readonly studio: StudioSession }> {
  const storage = createMemoryStudioKv();
  const view = render(
    createElement(StudioView, {
      practices: [makePractice()],
      schedule: ALL_DAY,
      initialStudio: readyPersonStudio(),
      persist: true,
      storage,
      clock: () => 1_000_000,
      ...props,
    }),
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  view.press(view.getByTestID('studio-harvest'));
  // Async presses need the completer promise + save effect to land.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  act(() => {
    view.root.unmount();
  });
  const studio = await loadStudioSession(storage);
  if (studio === null) {
    throw new Error('model-fill e2e: the harvest round did not persist');
  }
  return { studio };
}

describe('StudioView model-first harvest (SPEC 16.2)', () => {
  it('archives the model manifest when the completer resolves a valid card', async () => {
    const completer = vi.fn(async () => modelPayload('m-model-1'));
    const { studio } = await renderReadyBenchHarvested({ completeManifest: completer });
    expect(studio.archive.at(-1)?.name).toBe('The model clerk');
    expect(studio.archive.at(-1)?.fill_status).toBe('model');
    expect(completer).toHaveBeenCalledTimes(1);
  });

  it('falls back to a table card when the completer rejects', async () => {
    const completer = vi.fn(async () => {
      throw new Error('network down');
    });
    const { studio } = await renderReadyBenchHarvested({ completeManifest: completer });
    expect(studio.archive.at(-1)?.fill_status).toBe('table');
    expect(studio.archive.at(-1)?.provenance.source).toBe('table');
  });

  it('falls back to a table card when the completer returns garbage', async () => {
    const completer = vi.fn(async () => 'not json at all');
    const { studio } = await renderReadyBenchHarvested({ completeManifest: completer });
    expect(studio.archive.at(-1)?.fill_status).toBe('table');
  });

  it('harvests tables unchanged with no completer (pin)', async () => {
    const { studio } = await renderReadyBenchHarvested({});
    expect(studio.archive.at(-1)?.fill_status).toBe('table');
  });

  it('keeps a mid-flight tend when the completer lands (no stale rollback)', async () => {
    let release: ((value: unknown) => void) | undefined;
    const completer = vi.fn(
      () =>
        new Promise<unknown>((resolve) => {
          release = resolve;
        }),
    );
    const storage = createMemoryStudioKv();
    const view = render(
      createElement(StudioView, {
        practices: [makePractice()],
        schedule: ALL_DAY,
        initialStudio: readyPersonStudio(),
        persist: true,
        storage,
        clock: () => 1_000_000,
        completeManifest: completer,
      }),
    );
    const flush = async (): Promise<void> => {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    };
    await flush();
    view.press(view.getByTestID('studio-harvest'));
    expect(completer).toHaveBeenCalledTimes(1);
    // The fill is pending; a tend press commits newer bench state mid-flight.
    view.press(view.getByTestID('studio-tend'));
    await flush();
    const finish = release;
    if (finish === undefined) {
      throw new Error('completer promise was never started');
    }
    await act(async () => {
      finish(modelPayload('m-model-1'));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    act(() => {
      view.root.unmount();
    });
    const session = await loadStudioSession(storage);
    if (session === null) {
      throw new Error('interleaved harvest: the round did not persist');
    }
    // Given a tend that landed mid-flight, the resolved completer must keep
    // BOTH effects: the model card archived...
    expect(session.archive.at(-1)?.fill_status).toBe('model');
    expect(session.archive.at(-1)?.name).toBe('The model clerk');
    // ...and the tend's residue still charged: idle stepping aggregates one
    // event per practice that moved, so survival means strictly more than
    // the pre-press window (a stale full-replace rolls it back to exactly
    // SOCIAL_WINDOW.length).
    expect(session.benches['person']?.residue.length).toBeGreaterThan(SOCIAL_WINDOW.length);
  });
});
