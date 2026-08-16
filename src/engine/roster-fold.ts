// Roster fold + embodiment — residue tagging and slice swaps.
//
// `foldUpEvents` tags every cadence-th residue event of a member with the
// member's fold id; the parent-bench COPY is made by the caller (Task 6), not
// here. `swapEmbodiment` moves the embodied slice pair between the person
// slot and a member record — one embodied member at a time, null restores the
// default person life.
//
// Pure: no react, no wall clock, no global RNG, no network. studio-session is
// imported TYPE-ONLY (erased at compile time) so no import cycle is created.

import type { ResidueEvent } from './residue';
import type { StudioSession } from './studio-session';
import type { TierState } from './tier-state';

/**
 * Tag every `cadence`-th event (1-based, ordinal carried across calls in
 * `counter`) with `sourceId` appended to its ids (deduped). Unmarked events
 * pass through by reference; the parent-bench copy is the caller's job.
 */
export function foldUpEvents(
  events: readonly ResidueEvent[],
  sourceId: string,
  cadence: number,
  counter: number,
): { events: ResidueEvent[]; nextCounter: number } {
  if (!Number.isInteger(cadence) || cadence < 1) {
    throw new RangeError(`foldUpEvents: cadence must be a positive integer, got ${cadence}`);
  }
  let ordinal = counter;
  const out = events.map((event): ResidueEvent => {
    ordinal += 1;
    if (ordinal % cadence !== 0 || event.ids.includes(sourceId)) {
      return event;
    }
    return { ...event, ids: [...event.ids, sourceId] };
  });
  return { events: out, nextCounter: ordinal };
}

/** Swap the session's life + practices slices with member `memberId`'s. */
function swapPair(session: StudioSession, memberId: string): StudioSession {
  const slice = session.members[memberId];
  if (slice === undefined) {
    throw new Error(`swapEmbodiment: member "${memberId}" has no stored slice`);
  }
  return {
    ...session,
    life: slice.life,
    practices: slice.practices,
    members: {
      ...session.members,
      [memberId]: { life: session.life, practices: session.practices },
    },
  };
}

/** The tier whose roster contains `memberId`; throws when none does. */
function tierOfMember(tiers: Readonly<Record<string, TierState>>, memberId: string): string {
  for (const tier of Object.values(tiers)) {
    if (tier.roster.members.some((m) => m.id === memberId)) {
      return tier.tier;
    }
  }
  throw new Error(`swapEmbodiment: member "${memberId}" is not on any tier roster`);
}

/**
 * Rebuild the tiers record so exactly `memberId`'s roster row is embodied
 * (nobody when null). Untouched tiers keep their reference.
 */
function flipRosterFlags(
  tiers: Readonly<Record<string, TierState>>,
  memberId: string | null,
): Record<string, TierState> {
  const out: Record<string, TierState> = {};
  for (const [tierId, tier] of Object.entries(tiers)) {
    const needsFlip =
      memberId === null
        ? tier.roster.members.some((m) => m.embodied)
        : tier.roster.members.some((m) => m.id === memberId || m.embodied);
    if (!needsFlip) {
      out[tierId] = tier;
      continue;
    }
    out[tierId] = {
      ...tier,
      roster: {
        ...tier.roster,
        members: tier.roster.members.map((m) => ({
          ...m,
          embodied: memberId !== null && m.id === memberId,
        })),
      },
    };
  }
  return out;
}

/**
 * Move embodiment to `memberId`, or back to the default person life on null.
 * Swapping exchanges `session.life`/`session.practices` with the member's
 * slices, sets `embodied_member`, and flips the roster flag (one embodied at
 * a time). Returns the SAME session reference when already in that state.
 */
export function swapEmbodiment(session: StudioSession, memberId: string | null): StudioSession {
  const current = session.embodied_member;
  if (memberId === null) {
    if (current === null) {
      return session;
    }
    const restored = swapPair(session, current.member);
    return { ...restored, embodied_member: null, tiers: flipRosterFlags(restored.tiers, null) };
  }
  if (current !== null && current.member === memberId) {
    return session;
  }
  let next = session;
  if (current !== null) {
    next = swapPair(next, current.member);
  }
  next = swapPair(next, memberId);
  return {
    ...next,
    embodied_member: { tier: tierOfMember(next.tiers, memberId), member: memberId },
    tiers: flipRosterFlags(next.tiers, memberId),
  };
}
