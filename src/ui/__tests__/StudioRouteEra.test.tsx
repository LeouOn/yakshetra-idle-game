import { afterEach, describe, expect, it } from 'vitest';
import { createElement } from 'react';

import StudioRoute from '@/ui/components/StudioRoute';
import { act, render } from '@/test/rntl';
import {
  createIdleState,
  createLifeState,
  createRng,
  createStudioState,
  snapshotStudioSession,
  tableFillManifest,
  type LifeState,
} from '@/engine';
import {
  STUDIO_SESSION_KEY,
  createMemoryStudioKv,
  loadStudioSession,
  setStudioKv,
} from '@/persistence';

// The bench follows the era the player is living in: the route reads the session first and loads
// THAT pack's practices, schedules and endings.

function benchLife(): LifeState {
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

function savedSession(era: string | undefined, archive = createStudioState()) {
  return snapshotStudioSession(
    archive,
    createIdleState(),
    benchLife(),
    [],
    undefined,
    undefined,
    era === undefined ? undefined : { bench_era: era },
  );
}

async function settle(): Promise<void> {
  for (let i = 0; i < 3; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

async function openBench(raw?: string) {
  const kv = createMemoryStudioKv(raw === undefined ? {} : { [STUDIO_SESSION_KEY]: raw });
  setStudioKv(kv);
  const ui = render(createElement(StudioRoute));
  await settle();
  return { ui, kv, saved: await loadStudioSession(kv) };
}

const packOf = (ids: readonly string[] | undefined): string =>
  (ids ?? []).every((id) => id.startsWith('practice:tang/'))
    ? 'tang'
    : (ids ?? []).every((id) => id.startsWith('practice:fantasy/'))
      ? 'garden'
      : 'mixed';

afterEach(() => {
  setStudioKv(createMemoryStudioKv());
});

describe('/studio opens on the era the player is living in', () => {
  it('a studio-only player (no session) gets the Tang bench', async () => {
    const { ui, saved } = await openBench();
    expect(() => ui.getByTestID('studio-screen')).not.toThrow();
    expect(packOf(saved?.practices.map((p) => p.id))).toBe('tang');
    expect(saved?.bench_era).toBe('tang-china');
  });

  it('a session recorded in the Garden opens the Garden bench and keeps its era', async () => {
    const { ui, saved } = await openBench(JSON.stringify(savedSession('fantasy-mahayana')));
    expect(() => ui.getByTestID('studio-screen')).not.toThrow();
    expect(packOf(saved?.practices.map((p) => p.id))).toBe('garden');
    expect(saved?.bench_era).toBe('fantasy-mahayana');
  });

  it('a session recorded in Tang opens the Tang bench', async () => {
    const { saved } = await openBench(JSON.stringify(savedSession('tang-china')));
    expect(packOf(saved?.practices.map((p) => p.id))).toBe('tang');
  });

  it('an OLD session (no bench_era) loads unchanged: same archive, Tang bench, era now recorded', async () => {
    const card = tableFillManifest(
      [{ tick: 1, type: 'practice_tick', ids: ['practice.test'], numbers: { progress: 1 } }],
      null,
      0,
      createRng(5n),
      's5',
      'm-5',
    );
    const old = savedSession(undefined, { ...createStudioState(), archive: [card] });
    expect('bench_era' in old).toBe(false);
    const { saved } = await openBench(JSON.stringify(old));
    expect(saved?.archive.map((c) => c.id)).toEqual([card.id]);
    expect(packOf(saved?.practices.map((p) => p.id))).toBe('tang');
    expect(saved?.bench_era).toBe('tang-china');
  });

  it('a stale era id in the session opens the default bench instead of a missing pack', async () => {
    const stale = { ...savedSession('tang-china'), bench_era: 'atlantis' };
    const { ui, saved } = await openBench(JSON.stringify(stale));
    expect(() => ui.getByTestID('studio-screen')).not.toThrow();
    expect(packOf(saved?.practices.map((p) => p.id))).toBe('tang');
  });

  it('an unreadable session opens the default bench', async () => {
    const { ui, saved } = await openBench('{not json');
    expect(() => ui.getByTestID('studio-screen')).not.toThrow();
    expect(packOf(saved?.practices.map((p) => p.id))).toBe('tang');
  });
});
