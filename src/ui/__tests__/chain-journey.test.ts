// The whole life-chain journey, walked through the real seams.
//
// The chain used to die three times over: the second era's role picker threw
// on a missing string id, the life route reopened the life that had just
// ended (so the player died on arrival and looped), and the chain's end was a
// "Coming soon" placeholder. Each step below uses the same functions the
// routes call, in the order a player hits them.

import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';

import { openLife, startNextLife } from '@/engine';
import type { LifeState, RoleId, SaveBlob, StudioSession } from '@/engine';
import { loadEraPack } from '@/content/loader';

import { resolveLifeEntry } from '../../../app/life/[lifeId]';
import BardoView, { nextErasAfter } from '@/ui/components/BardoView';
import ChainCompleteView, { describeChain } from '@/ui/components/ChainCompleteView';
import { render } from '@/test/rntl';

// The life-route module imports expo-router at module scope.
vi.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ lifeId: 'pending' }),
  useRouter: () => ({ push: vi.fn() }),
}));

function firstLife(): LifeState {
  return resolveLifeEntry({
    prior: null,
    era: 'tang-china',
    roleId: 'peasant',
    studio: null,
  }).life;
}

const BENCH: StudioSession = {
  benches: {
    person: {
      residue: [],
      last_harvest_index: -1,
      bay: null,
      quality_tier: 0,
      harvest_count: 4,
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
  world_drafts: [{ scale: 'region' }],
} as unknown as StudioSession;

describe('a life chain, from first day to the next one', () => {
  it('runs both lives and closes on a screen the player can act on', () => {
    // ---- Life one: the Tang chain, ended at the bench ---------------------
    const first = firstLife();
    let chain: SaveBlob = startNextLife(null, { ...first, turn: 12 }, 10);
    expect(chain.chain.life_states).toHaveLength(1);
    const died: LifeState = { ...(openLife(chain) as LifeState), alive: false };
    chain = startNextLife(chain, died, 20);

    // ---- The bardo offers the era that is left ---------------------------
    const eras = nextErasAfter('tang-china', 1);
    expect(eras.map((e) => e.id)).toEqual(['fantasy-mahayana']);

    const bardo = render(
      createElement(BardoView, {
        previousEra: 'tang-china',
        echoes: [],
        eras,
        onPickEra: vi.fn(),
      }),
    );
    const pick = bardo.getByTestID('bardo-era-fantasy-mahayana');
    expect(pick).toBeDefined();

    // ---- The second era's role picker is playable, not a crash ----------
    const pack = loadEraPack('fantasy-mahayana');
    const roleIds = (pack.starting_roles ?? []).map((role) => role.id);
    expect(roleIds.length).toBeGreaterThan(0);
    const roleId = roleIds[0] as string;

    // ---- Life two: a NEW life in the era the player chose -----------------
    const second = resolveLifeEntry({
      prior: chain,
      era: 'fantasy-mahayana',
      roleId,
      studio: BENCH,
    });
    expect(second.isNewLife).toBe(true);
    expect(second.life.era).toBe('fantasy-mahayana');
    expect(second.life.role).toBe(roleId as RoleId);
    // The bench's pinned card becomes a tie in the new life.
    expect(second.life.flags.has('pin:card-clerk')).toBe(true);
    // The life that ended is still there, behind the new one.
    expect(second.life.alive).toBe(true);

    chain = startNextLife(chain, { ...second.life, turn: 5 }, 30);
    expect(chain.chain.life_states).toHaveLength(2);
    expect(openLife(chain)?.era).toBe('fantasy-mahayana');

    // ---- Life two ends: the chain has nothing left to offer ---------------
    chain = startNextLife(chain, { ...(openLife(chain) as LifeState), alive: false }, 40);
    expect(nextErasAfter('fantasy-mahayana', 2)).toHaveLength(0);

    const endBardo = render(
      createElement(BardoView, {
        previousEra: 'fantasy-mahayana',
        echoes: [],
        eras: nextErasAfter('fantasy-mahayana', 2),
        onPickEra: vi.fn(),
        onCloseChain: vi.fn(),
      }),
    );
    // The dead end now has a door.
    endBardo.press(endBardo.getByTestID('bardo-close-chain'));

    // ---- The closing screen shows the chain and what it kept --------------
    const summary = describeChain(chain, BENCH);
    expect(summary.lives.map((l) => l.era)).toEqual(['tang-china', 'fantasy-mahayana']);
    expect(summary.keeps.map((k) => k.name)).toEqual(['The night clerk']);
    expect(summary.draftScales).toEqual(['region']);

    const close = render(
      createElement(ChainCompleteView, { ...summary, onBeginNewChain: vi.fn() }),
    );
    expect(() => close.getByTestID('chain-life-tang-china')).not.toThrow();
    expect(() => close.getByTestID('chain-life-fantasy-mahayana')).not.toThrow();
    expect(() => close.getByTestID('chain-keep-card-clerk')).not.toThrow();
    expect(() => close.getByTestID('chain-draft-region')).not.toThrow();

    // ---- Beginning a new chain: slot cleared, bench ties still apply -------
    const fresh = resolveLifeEntry({
      prior: null,
      era: 'tang-china',
      roleId: 'peasant',
      studio: BENCH,
    });
    expect(fresh.isNewLife).toBe(true);
    expect(fresh.life.turn).toBe(0);
    expect(fresh.life.flags.has('pin:card-clerk')).toBe(true);
  });

  it('opens the second era in that era’s pack, not the first one’s', () => {
    // The route's era param has to beat the old hardcoded Tang default.
    const entered = resolveLifeEntry({
      prior: null,
      era: 'fantasy-mahayana',
      roleId: 'newly-arrived-soul',
      studio: null,
    });
    const pack = loadEraPack(entered.life.era);
    expect(pack.id).toContain('fantasy-mahayana');
    expect((pack.starting_roles ?? []).some((role) => role.id === String(entered.life.role))).toBe(
      true,
    );
  });

  it('keeps a life in progress resumable after all of that', () => {
    const live = resolveLifeEntry({
      prior: null,
      era: 'tang-china',
      roleId: 'peasant',
      studio: null,
    }).life;
    const chain = startNextLife(null, live, 1);
    const resumed = resolveLifeEntry({
      prior: chain,
      era: 'tang-china',
      roleId: 'peasant',
      studio: null,
    });
    expect(resumed.isNewLife).toBe(false);
    expect(String(resumed.life.id)).toBe(String(live.id));
  });
});
