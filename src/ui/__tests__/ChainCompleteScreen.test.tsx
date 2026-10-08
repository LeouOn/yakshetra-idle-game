// Chain-complete screen — the door at the end of a life chain.
//
// Today the route renders a "Coming soon" placeholder and nothing links to it,
// so a player who played both lives fell off into a dead end. These tests pin
// the closing surface: the chain's record, what carried forward, what the bench
// kept, and the action that begins a new chain.

import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';

import { createLifeState, startNextLife } from '@/engine';
import type { EraId, LifeId, LifeState, RoleId, SaveBlob, StudioSession } from '@/engine';

import ChainCompleteView, { describeChain } from '@/ui/components/ChainCompleteView';
import { render } from '@/test/rntl';

function life(id: string, era: string, turn: number, alive = false): LifeState {
  return {
    ...createLifeState({
      id: id as LifeId,
      era: era as EraId,
      role: 'peasant' as RoleId,
      identity: {
        gender: 'unset',
        social_class: 'unset',
        family_wealth_at_birth: 'unset',
        caste_status: 'unset',
        disability_status: 'unset',
      },
    }),
    turn,
    alive,
  };
}

/** A chain of finished lives, built the way the life route builds one. */
function chain(lives: readonly LifeState[]): SaveBlob {
  let blob: SaveBlob | null = null;
  for (const l of lives) {
    blob = startNextLife(blob, l, 10);
  }
  return blob as SaveBlob;
}

const SESSION = {
  benches: {
    person: {
      residue: [],
      last_harvest_index: -1,
      bay: null,
      quality_tier: 0,
      harvest_count: 3,
      play_import: null,
      pinned: {
        id: 'card-clerk',
        name: 'The night clerk',
        kind: 'person' as const,
        one_liner: 'Kept the lamp through the last watch.',
      },
      surplus: 0,
      fold_position: 0,
    },
  },
  archive: [],
  tiers: {},
  milestones_done: [],
  compendium_done: [],
  embodied_member: null,
  idle: { mode: 'away' as const, last_simulated_tick: '0', total_idle_ticks: '0' },
  life: { turn: 0, resources: {}, skills: {}, residue: [] },
  practices: [],
  members: {},
  world_drafts: [{ scale: 'region', people: 2, places: 1 }],
} as unknown as StudioSession;

describe('describeChain', () => {
  it('reports every life in the chain with its era and length', () => {
    const summary = describeChain(
      chain([life('l1', 'tang-china', 12), life('l2', 'fantasy-mahayana', 7)]),
      null,
    );
    expect(summary.lives).toHaveLength(2);
    expect(summary.lives[0]?.era).toBe('tang-china');
    expect(summary.lives[1]?.era).toBe('fantasy-mahayana');
    expect(summary.lives[1]?.turns).toBe(7);
  });

  it('carries the bench’s pinned cards and world drafts forward', () => {
    const summary = describeChain(null, SESSION);
    expect(summary.keeps.map((k) => k.name)).toEqual(['The night clerk']);
    expect(summary.keeps[0]?.kind).toBe('person');
    expect(summary.draftScales).toEqual(['region']);
  });

  it('stays empty rather than throwing on a missing chain or bench', () => {
    const summary = describeChain(null, null);
    expect(summary.lives).toEqual([]);
    expect(summary.echoes).toEqual([]);
    expect(summary.keeps).toEqual([]);
    expect(summary.draftScales).toEqual([]);
  });
});

describe('ChainCompleteView', () => {
  const summary = describeChain(
    chain([life('l1', 'tang-china', 12), life('l2', 'fantasy-mahayana', 7)]),
    SESSION,
  );

  it('names both lives of the chain', () => {
    const { getByTestID } = render(
      createElement(ChainCompleteView, { ...summary, onBeginNewChain: vi.fn() }),
    );
    expect(() => getByTestID('chain-life-tang-china')).not.toThrow();
    expect(() => getByTestID('chain-life-fantasy-mahayana')).not.toThrow();
  });

  it('shows the pinned card the bench kept, by name', () => {
    const { getByTestID } = render(
      createElement(ChainCompleteView, { ...summary, onBeginNewChain: vi.fn() }),
    );
    expect(() => getByTestID('chain-keep-card-clerk')).not.toThrow();
  });

  it('says plainly when the bench kept nothing', () => {
    const { getByTestID } = render(
      createElement(ChainCompleteView, {
        ...describeChain(null, null),
        onBeginNewChain: vi.fn(),
      }),
    );
    expect(() => getByTestID('chain-keeps-empty')).not.toThrow();
  });

  it('begins a new chain when the closing action is pressed', () => {
    const onBeginNewChain = vi.fn();
    const { getByTestID, press } = render(
      createElement(ChainCompleteView, { ...summary, onBeginNewChain }),
    );
    press(getByTestID('chain-begin-new'));
    expect(onBeginNewChain).toHaveBeenCalledTimes(1);
  });
});
