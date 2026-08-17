// Studio progression — milestone, compendium, and graduation effects.
//
// Extracted from StudioView (Phase 3 Task 4) with behavior parity: the same
// grant-then-check order, the same dependency array. Tier-generalized: every
// fired milestone graduates through the engine's content-driven
// graduateToTier (roles row present with a policy → member-bearing tier;
// otherwise the tier seats unit rows), and the ceremony id resolves to the
// milestone's ceremony_sid namespace instead of the household literals.

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

import type { GraduationRolesRow, GraduationTierRow } from '@/engine/graduation';
import { graduateToTier } from '@/engine/graduation';
import {
  checkMilestones,
  grantCompendium,
  type BenchState,
  type IdleState,
  type LifeState,
  type MemberSlice,
  type Practice,
  type Rng,
  type SessionProgression,
  type StudioSession,
  type StudioState,
  type WorldDraftReference,
} from '@/engine';
import { nonPersonBenches, registries } from './useStudioSession';

export interface UseStudioProgressionArgs {
  readonly ready: boolean;
  readonly studio: StudioState;
  readonly idle: IdleState;
  readonly life: LifeState;
  readonly runtimePractices: readonly Practice[];
  readonly progression: SessionProgression;
  readonly members: Record<string, MemberSlice>;
  readonly worldDrafts: readonly WorldDraftReference[];
  readonly benches: Readonly<Record<string, BenchState>>;
  readonly buildSession: () => StudioSession;
  readonly rngRef: { readonly current: Rng };
  readonly setProgression: Dispatch<SetStateAction<SessionProgression>>;
  readonly setMembers: Dispatch<SetStateAction<Record<string, MemberSlice>>>;
  readonly setWorldDrafts: Dispatch<SetStateAction<readonly WorldDraftReference[]>>;
  readonly setBenches: Dispatch<SetStateAction<Readonly<Record<string, BenchState>>>>;
}

/**
 * Roles row for a graduation: member-bearing tiers carry a `policy` on their
 * row (household, org); a row without one is a unit tier (town) and seats
 * unit rows instead of lives. Tiers with no roles row at all (city, region
 * until authored) also seat unit rows.
 */
function rolesRowForTier(tierId: string): GraduationRolesRow | null {
  const roles = registries().roles as Partial<Record<string, GraduationRolesRow>>;
  const row = roles[tierId];
  return row === undefined || row.policy === undefined ? null : row;
}

/** Graduate through every fired milestone in input order; returns the
 * ceremony's milestone id when at least one graduation changed the session. */
function graduateFired(
  session: StudioSession,
  fired: readonly string[],
  rng: Rng,
): { readonly session: StudioSession; readonly ceremony: string | null } {
  let out = session;
  let ceremony: string | null = null;
  const tiers: readonly GraduationTierRow[] = registries().tiers;
  for (const id of fired) {
    const milestone = registries().milestones.find((row) => row.id === id);
    if (milestone === undefined) {
      continue;
    }
    const tierRow = tiers.find((row) => row.id === milestone.grants.tier);
    if (tierRow === undefined) {
      continue;
    }
    const graduated = graduateToTier(out, tierRow.id, tierRow, rolesRowForTier(tierRow.id), rng);
    if (graduated !== out) {
      out = graduated;
      ceremony = ceremony ?? id;
    }
  }
  return { session: out, ceremony };
}

export function useStudioProgression({
  ready,
  studio,
  idle,
  life,
  runtimePractices,
  progression,
  members,
  worldDrafts,
  benches,
  buildSession,
  rngRef,
  setProgression,
  setMembers,
  setWorldDrafts,
  setBenches,
}: UseStudioProgressionArgs): {
  readonly graduationCeremony: string | null;
  readonly setGraduationCeremony: Dispatch<SetStateAction<string | null>>;
} {
  const [graduationCeremony, setGraduationCeremony] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) {
      return;
    }
    const current = buildSession();
    const compendiumResult = grantCompendium(current, worldDrafts, registries().compendium);
    const sessionAfterGrant = compendiumResult.session;
    const compendiumChanged = compendiumResult.granted.length > 0;
    const fired = checkMilestones(sessionAfterGrant, worldDrafts, registries().milestones);
    const graduated = graduateFired(sessionAfterGrant, fired, rngRef.current);
    if (!compendiumChanged && graduated.ceremony === null) {
      return;
    }
    if (graduated.ceremony !== null) {
      setProgression({
        tiers: graduated.session.tiers,
        milestones_done: graduated.session.milestones_done,
        compendium_done: graduated.session.compendium_done,
        embodied_member: graduated.session.embodied_member,
      });
      setMembers({ ...graduated.session.members });
      setWorldDrafts([...graduated.session.world_drafts]);
      // A graduation opens a fresh bench for its tier; a bench the session
      // already held (an unlock replayed over a hand-seeded state) wins.
      setBenches((currentBenches) => {
        const merged = { ...nonPersonBenches(graduated.session) };
        for (const [id, bench] of Object.entries(currentBenches)) {
          merged[id] = bench;
        }
        return merged;
      });
      setGraduationCeremony(graduated.ceremony);
      return;
    }
    setProgression((prev) => ({
      ...prev,
      compendium_done: sessionAfterGrant.compendium_done,
    }));
    // Same rationale as the save effect: buildSession reads the listed values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, studio, idle, life, runtimePractices, progression, members, worldDrafts, benches]);

  return { graduationCeremony, setGraduationCeremony };
}
