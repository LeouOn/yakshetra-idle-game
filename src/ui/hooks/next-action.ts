// Next-action derivation — what the player should do next, as a pure
// function of the session at the moment of read.
//
// The studio's job is to convert residue into a world; the next-action
// strip points the player at the most urgent of the actions the bench
// supports. First-match-wins priority order:
//
//   a. Ready harvest on any unlocked bench         (next_harvest_sid)
//   b. Locked-tier gate ≥ 80% of the worst operand (next_gate_sid)
//   c. Embodied bench pending ≥ effective minimum  (next_develop_sid)
//   d. Active visitor with windows remaining       (next_visitor_sid)
//   e. Empty endowment slot on an unlocked tier
//      with an eligible track + a card in archive  (next_endow_sid)
//   f. otherwise null                              (render nothing)
//
// Pure: no clock, no rng, no React, no DOM. The caller passes the
// progression registries in so the function can read tier/milestone/track
// metadata without importing "@/content" (the engine barrel stays
// re-export-only at the package boundary). The values the derivation
// returns are already SID-resolved: the renderer's formatSid call is the
// final substitution, so the hook controls which SIDs the renderer reads.

import {
  MIN_RESIDUE_TO_DEVELOP,
  addBenchModifiers,
  canEndow,
  computeArchiveStats,
  computeBenchModifiers,
  computeGlobalRewards,
  endowableSlots,
  visitorModifierOverlay,
  windowSince,
  type ArchivePredicateLike,
  type ArchiveStats,
  type BenchModifiers,
  type EndowmentTrackLike,
  type StudioSession,
  type WorldDraftReference,
} from '@/engine';
import { resolveSid } from '@/i18n';
import type { ProgressionRegistries } from '@/content/progression/loader';

export interface NextAction {
  readonly sid: string;
  readonly values?: Readonly<Record<string, string | number>>;
}

/** The embodied life lives on the person bench; the ladder's first rung. */
const EMBODIED_TIER = 'person';

/** A locked rung is "approaching" once its worst gate operand is 80% full. */
const GATE_APPROACH_RATIO = 0.8;

/* ---- stat-value lookup (re-declared here so the module has no DOM/React) -- */

function statValue(stats: ArchiveStats, key: string): number {
  const dot = key.indexOf('.');
  if (dot <= 0) {
    return 0;
  }
  const section = key.slice(0, dot);
  const tail = key.slice(dot + 1);
  if (section === 'pinned') {
    return stats.pinned[tail] ?? 0;
  }
  if (section === 'archived') {
    return stats.archived[tail] ?? 0;
  }
  if (section === 'world_drafts') {
    return stats.world_drafts[tail] ?? 0;
  }
  if (section === 'harvests') {
    return stats.harvests[tail] ?? 0;
  }
  return 0;
}

/** The least-satisfied gte leaf of a predicate, with its current ratio. */
function leastSatisfiedGate(
  predicate: ArchivePredicateLike,
  stats: ArchiveStats,
): { readonly key: string; readonly n: number; readonly m: number; readonly ratio: number } | null {
  if (predicate.op === 'gte') {
    const value = statValue(stats, predicate.key);
    return {
      key: predicate.key,
      n: Math.min(value, predicate.value),
      m: predicate.value,
      ratio: Math.min(1, value / predicate.value),
    };
  }
  if (predicate.op === 'and') {
    let worst: ReturnType<typeof leastSatisfiedGate> = null;
    for (const operand of predicate.operands) {
      const candidate = leastSatisfiedGate(operand, stats);
      if (candidate === null) {
        continue;
      }
      if (worst === null || candidate.ratio < worst.ratio) {
        worst = candidate;
      }
    }
    return worst;
  }
  return null;
}

/* ---- rule a: ready harvest ----------------------------------------------- */

function readyBench(
  session: StudioSession,
  registries: ProgressionRegistries,
): { readonly tierId: string; readonly index: number } | null {
  // The embodied person bay rides on the session's person bench; every other
  // unlocked tier's bench lives in session.benches. The highest-index rung
  // wins (org outranks household outranks person).
  let best: { tierId: string; index: number } | null = null;
  for (const tier of registries.tiers) {
    const bench = session.benches[tier.id];
    if (bench === undefined) {
      continue;
    }
    if (bench.bay === null || bench.bay.status !== 'ready') {
      continue;
    }
    if (best === null || tier.index > best.index) {
      best = { tierId: tier.id, index: tier.index };
    }
  }
  return best;
}

/* ---- rule b: locked-tier gate ≥ 80% -------------------------------------- */

function approachedGate(
  session: StudioSession,
  worldDrafts: readonly WorldDraftReference[],
  registries: ProgressionRegistries,
): { readonly name: string; readonly n: number; readonly m: number } | null {
  const stats = computeArchiveStats(session, worldDrafts);
  let best: { name: string; n: number; m: number; ratio: number } | null = null;
  for (const tier of registries.tiers) {
    if (tier.unlock_milestone === null) {
      continue;
    }
    const tierState = session.tiers[tier.id];
    if (tierState?.unlocked === true) {
      continue;
    }
    const milestone = registries.milestones.find((row) => row.id === tier.unlock_milestone);
    if (milestone === undefined) {
      continue;
    }
    const gate = leastSatisfiedGate(milestone.predicate, stats);
    if (gate === null || gate.ratio < GATE_APPROACH_RATIO) {
      continue;
    }
    if (best === null || gate.ratio > best.ratio) {
      best = { name: tier.id, n: gate.n, m: gate.m, ratio: gate.ratio };
    }
  }
  if (best === null) {
    return null;
  }
  return { name: best.name, n: best.n, m: best.m };
}

/* ---- rule c: develop on the embodied bench ------------------------------ */

function personPendingLength(session: StudioSession): number {
  const bench = session.benches[EMBODIED_TIER];
  if (bench === undefined) {
    return 0;
  }
  return windowSince(bench.residue, bench.last_harvest_index).length;
}

function visitorOverlayForTier(
  session: StudioSession,
  registries: ProgressionRegistries,
  tierId: string,
): BenchModifiers {
  const active = session.tiers[tierId]?.active_visitor?.id ?? null;
  return visitorModifierOverlay(registries.visitors, active);
}

/** The same floored-at-2 minimum the develop button uses (see StudioView). */
function personEffectiveMin(session: StudioSession, registries: ProgressionRegistries): number {
  const global = computeGlobalRewards(session.compendium_done, registries.compendium);
  const endowed = computeBenchModifiers(EMBODIED_TIER, session, registries.endowment, global);
  const visitorOverlay = visitorOverlayForTier(session, registries, EMBODIED_TIER);
  const combined = addBenchModifiers(endowed, visitorOverlay);
  return Math.max(2, MIN_RESIDUE_TO_DEVELOP - combined.windowMin);
}

function developReady(session: StudioSession, registries: ProgressionRegistries): boolean {
  const bench = session.benches[EMBODIED_TIER];
  if (bench === undefined || bench.bay !== null) {
    return false;
  }
  const pending = personPendingLength(session);
  return pending >= personEffectiveMin(session, registries);
}

/* ---- rule d: active visitor --------------------------------------------- */

function seatedVisitor(
  session: StudioSession,
  registries: ProgressionRegistries,
): { readonly sidNs: string } | null {
  for (const tier of registries.tiers) {
    const seat = session.tiers[tier.id]?.active_visitor;
    if (seat === null || seat === undefined || seat.windows_left <= 0) {
      continue;
    }
    const row = registries.visitors.find((candidate) => candidate.id === seat.id);
    if (row === undefined) {
      continue;
    }
    return { sidNs: row.sid_ns };
  }
  return null;
}

/* ---- rule e: empty endowment slot --------------------------------------- */

function hasEndowableCard(
  session: StudioSession,
  registries: ProgressionRegistries,
  tierId: string,
  eligible: readonly EndowmentTrackLike[],
  global: BenchModifiers,
): boolean {
  // The first eligible track suffices: the chip's first press commits the
  // chosen track, but the strip only needs to know the tier is ready.
  const track = eligible[0];
  if (track === undefined) {
    return false;
  }
  for (const card of session.archive) {
    const check = canEndow(
      session,
      tierId,
      track,
      card.id,
      registries.endowment,
      registries.tiers,
      global,
    );
    if (check.ok) {
      return true;
    }
  }
  return false;
}

function endowableTier(
  session: StudioSession,
  registries: ProgressionRegistries,
): { readonly tierId: string; readonly index: number } | null {
  const global = computeGlobalRewards(session.compendium_done, registries.compendium);
  // The harvest-priority tier convention: the highest-index unlocked tier
  // that has at least one eligible track + a card in the archive.
  let best: { tierId: string; index: number } | null = null;
  for (const tier of registries.tiers) {
    const tierState = session.tiers[tier.id];
    if (tierState === undefined || !tierState.unlocked) {
      continue;
    }
    const slots = endowableSlots(tier.id, session, registries.endowment, registries.tiers, global);
    const eligible: readonly EndowmentTrackLike[] = registries.endowment.filter(
      (track) =>
        track.tier === tier.id &&
        !tierState.endowed.includes(track.id) &&
        (track.requires === null || session.milestones_done.includes(track.requires)) &&
        track.slot_cost <= slots,
    );
    if (eligible.length === 0) {
      continue;
    }
    if (!hasEndowableCard(session, registries, tier.id, eligible, global)) {
      continue;
    }
    if (best === null || tier.index > best.index) {
      best = { tierId: tier.id, index: tier.index };
    }
  }
  return best;
}

/* ---- public derivation --------------------------------------------------- */

export function nextAction(
  session: StudioSession,
  worldDrafts: readonly WorldDraftReference[],
  registries: ProgressionRegistries,
): NextAction | null {
  // (a) Highest-index ready bench beats every other prompt.
  const harvest = readyBench(session, registries);
  if (harvest !== null) {
    return {
      sid: 'studio.next_harvest_sid',
      values: { tier: resolveSid(`studio.tier_${harvest.tierId}_sid`) },
    };
  }

  // (b) A locked rung closing in on its gate is the next big milestone.
  const gate = approachedGate(session, worldDrafts, registries);
  if (gate !== null) {
    return {
      sid: 'studio.next_gate_sid',
      values: { name: resolveSid(`studio.tier_${gate.name}_sid`), n: gate.n, m: gate.m },
    };
  }

  // (c) Pending residue on the embodied bench ready to develop.
  if (developReady(session, registries)) {
    return { sid: 'studio.next_develop_sid' };
  }

  // (d) A seated guest is the loudest ambient signal.
  const visitor = seatedVisitor(session, registries);
  if (visitor !== null) {
    return {
      sid: 'studio.next_visitor_sid',
      values: { name: resolveSid(`${visitor.sidNs}.name_sid`) },
    };
  }

  // (e) An empty endowment slot can spend an archive card.
  const endow = endowableTier(session, registries);
  if (endow !== null) {
    return {
      sid: 'studio.next_endow_sid',
      values: { tier: resolveSid(`studio.tier_${endow.tierId}_sid`) },
    };
  }

  return null;
}
