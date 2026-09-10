import { describe, expect, it } from 'vitest';

import {
  MANIFEST_SCHEMA_VERSION,
  TABLE_FILL_REVISION,
  applyStudioToNextLife,
  createIdleState,
  createLifeState,
  createStudioState,
  emptyHydratedSession,
  evaluateLifeContext,
  pinFlag,
  pinFocus,
  placeFlag,
  snapshotStudioSession,
  worldDraftFlag,
  WORLD_ASSEMBLED_FLAG,
  type Manifest,
  type StudioSession,
} from '../';
import { createTierState } from '../tier-state';

const EPOCH = { year: 780, month: 1, day: 1, hour: 0 };

function makeLife() {
  return createLifeState({
    id: 'life-return' as ReturnType<typeof createLifeState>['id'],
    era: 'tang-test@0.1.0' as ReturnType<typeof createLifeState>['era'],
    role: 'merchant' as ReturnType<typeof createLifeState>['role'],
    identity: {
      gender: 'woman',
      social_class: 'merchant',
      family_wealth_at_birth: 'modest',
      caste_status: 'none',
      disability_status: 'none',
    },
  });
}

function card(id: string, kind: string): Manifest {
  return {
    schema_version: MANIFEST_SCHEMA_VERSION,
    id,
    rng_seed: '1',
    brief: null,
    residue_window_id: 'w-1',
    kind,
    scale: 'person',
    name: `Card ${id}`,
    one_liner: 'A fixture one-liner.',
    subject: 'a fixture',
    detail: 'Fixture detail.',
    tags: ['fixture'],
    rarity: 'common',
    fill_status: 'table',
    quality_tier: 0,
    provenance: { source: 'table', revision: TABLE_FILL_REVISION },
  };
}

function sessionWith(
  studio: ReturnType<typeof createStudioState>,
  extras?: {
    archive?: readonly Manifest[];
    world_drafts?: readonly { scale: string }[];
    focusId?: string;
  },
): StudioSession {
  const base = emptyHydratedSession();
  const progression = {
    ...base.progression,
    tiers: {
      person: {
        ...createTierState('person', true),
        roster: {
          tier: 'person',
          members: [
            {
              id: 'm-focus',
              name: 'Keeper',
              role: 'keeper',
              policy: 'policy/v0',
              embodied: false,
              seed: 1,
              ...(extras?.focusId === undefined ? {} : { focus_id: extras.focusId }),
            },
          ],
        },
      },
    },
  };
  const snap = snapshotStudioSession(
    studio,
    createIdleState(),
    base.life,
    [],
    undefined,
    progression,
    extras?.world_drafts === undefined ? undefined : { world_drafts: extras.world_drafts },
  );
  if (extras?.archive === undefined) {
    return snap;
  }
  return {
    ...snap,
    archive: extras.archive.map((c) => ({ ...c, tags: [...c.tags] })),
  };
}

describe('applyStudioToNextLife', () => {
  it('is a no-op when the bench has no pins or drafts', () => {
    const life = makeLife();
    const session = snapshotStudioSession(
      createStudioState(),
      createIdleState(),
      emptyHydratedSession().life,
      [],
    );
    expect(applyStudioToNextLife(life, session)).toBe(life);
  });

  it('seeds a pinned person as a warm tie without touching identity', () => {
    const person = card('m-guest', 'person');
    const studio = pinFocus(createStudioState(), person);
    const next = applyStudioToNextLife(makeLife(), sessionWith(studio, { archive: [person] }));
    expect(next.relationships['m-guest']).toEqual({ trust: 1, debt: 0, affection: 2 });
    expect(next.flags.has(pinFlag('m-guest'))).toBe(true);
    expect(next.identity).toEqual(makeLife().identity);
    expect('social_identity' in next).toBe(false);
  });

  it('seeds a pinned place as a flag, not a relationship', () => {
    const place = card('m-yard', 'place');
    const studio = pinFocus(createStudioState(), place);
    const next = applyStudioToNextLife(makeLife(), sessionWith(studio, { archive: [place] }));
    expect(next.relationships['m-yard']).toBeUndefined();
    expect(next.flags.has(placeFlag('m-yard'))).toBe(true);
    expect(next.flags.has(pinFlag('m-yard'))).toBe(true);
  });

  it('seeds roster focus_ids that resolve in the archive', () => {
    const person = card('m-focus-card', 'person');
    const next = applyStudioToNextLife(
      makeLife(),
      sessionWith(createStudioState(), { archive: [person], focusId: 'm-focus-card' }),
    );
    expect(next.relationships['m-focus-card']).toEqual({ trust: 1, debt: 0, affection: 2 });
  });

  it('ignores focus_ids that reference no archive card', () => {
    const life = makeLife();
    const next = applyStudioToNextLife(
      life,
      sessionWith(createStudioState(), { focusId: 'missing' }),
    );
    expect(next).toBe(life);
  });

  it('flags world drafts and an assembled archive world', () => {
    const a = card('m-a', 'person');
    const b = card('m-b', 'person');
    const next = applyStudioToNextLife(
      makeLife(),
      sessionWith(createStudioState(), {
        archive: [a, b],
        world_drafts: [{ scale: 'household' }],
      }),
    );
    expect(next.flags.has(worldDraftFlag('household'))).toBe(true);
    expect(next.flags.has(WORLD_ASSEMBLED_FLAG)).toBe(true);
  });

  it('does not reset an existing tie or re-add flags on a second call', () => {
    const person = card('m-guest', 'person');
    const studio = pinFocus(createStudioState(), person);
    const session = sessionWith(studio, { archive: [person] });
    const first = applyStudioToNextLife(makeLife(), session);
    const kept = {
      ...first,
      relationships: { ...first.relationships, 'm-guest': { trust: 9, debt: 2, affection: 4 } },
    };
    const second = applyStudioToNextLife(kept, session);
    expect(second).toBe(kept);
    expect(second.relationships['m-guest']).toEqual({ trust: 9, debt: 2, affection: 4 });
  });

  it('shows the pinned person as a life-context tie without the archive', () => {
    const person = card('m-guest', 'person');
    const studio = pinFocus(createStudioState(), person);
    const life = applyStudioToNextLife(makeLife(), sessionWith(studio, { archive: [person] }));
    const ctx = evaluateLifeContext({
      life,
      idle: createIdleState(),
      epoch: EPOCH,
    });
    expect(ctx.ties.some((tie) => tie.id === 'm-guest' && tie.source === 'relationship')).toBe(
      true,
    );
    expect(ctx.strongest_tie).toBe('m-guest');
  });
});
