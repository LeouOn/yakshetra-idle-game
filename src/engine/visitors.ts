// Visitors — deterministic boost guests on the benches.
//
// Arrivals are pure functions of (tier counters, ctx seed, content rows):
// no clock, no global RNG. One visitor sits at a tier at a time; counters
// keep accumulating while the seat is taken; decay happens ONLY when the
// player harvests from that tier's bench (noteVisitorHarvest). Effects fold
// through the shared bench-modifier mapping (the endowment vocabulary) via
// visitorModifierOverlay — the UI composes the overlay onto
// computeBenchModifiers while a visitor is seated.

import {
  EMPTY_BENCH_MODIFIERS,
  modifiersFromEffects,
  type BenchModifiers,
} from './endowment-validators';
import { memberSeed } from './roster';
import type { StudioSession } from './studio-session';
import type { CatalogEntry, CatalogMap } from './table-catalog';
import type { ActiveVisitor, TierState } from './tier-state';

/** Structural content view (EndowmentTrackLike precedent — engine never imports src/content). */
export interface VisitorLike {
  readonly id: string;
  readonly tiers: readonly string[];
  readonly cadence_ticks: number;
  readonly jitter_ticks: number;
  readonly duration_windows: number;
  readonly effects?: readonly unknown[] | undefined;
  readonly table_ref?: string | undefined;
}

/** Everything stepVisitors needs; a structural subset of SessionStepContext. */
export interface VisitorStepContext {
  readonly tiers: readonly { readonly id: string; readonly scale: string }[];
  readonly sessionSeed: string;
  readonly visitors?: readonly VisitorLike[];
}

/** Deterministic per-(seed, tier, visitor) delay in [0, jitter_ticks]. */
function jitterFor(sessionSeed: string, tierId: string, row: VisitorLike): number {
  return Number(
    memberSeed(sessionSeed, `visitor:${tierId}:${row.id}`) % BigInt(row.jitter_ticks + 1),
  );
}

/**
 * Advance visitor counters and seat arrivals on unlocked tiers.
 * Pure; reference-preserving no-op without rows or ticks. Locked or
 * unstored tiers are never touched; counters keep accruing while a visitor
 * is seated, but no new arrival scans run until the seat empties.
 */
export function stepVisitors(
  session: StudioSession,
  ctx: VisitorStepContext,
  ticks: number,
): StudioSession {
  const rows = ctx.visitors;
  if (ticks <= 0 || rows === undefined || rows.length === 0) {
    return session;
  }
  let tiers: Record<string, TierState> | null = null;
  for (const tier of ctx.tiers) {
    const state = session.tiers[tier.id];
    if (state === undefined || !state.unlocked) {
      continue;
    }
    const visitorTicks = state.visitor_ticks + ticks;
    let arrival: VisitorLike | null = null;
    if (state.active_visitor === null) {
      for (const row of rows) {
        if (!row.tiers.includes(tier.scale)) {
          continue;
        }
        if (visitorTicks >= row.cadence_ticks + jitterFor(ctx.sessionSeed, tier.id, row)) {
          arrival = row;
          break; // file order wins; one arrival per tier per step
        }
      }
    }
    if (tiers === null) {
      tiers = { ...session.tiers };
    }
    tiers[tier.id] =
      arrival === null
        ? { ...state, visitor_ticks: visitorTicks }
        : {
            ...state,
            visitor_ticks: 0,
            active_visitor: { id: arrival.id, windows_left: arrival.duration_windows },
          };
  }
  return tiers === null ? session : { ...session, tiers };
}

/** A harvest from a tier's bench sends its guest on — windows decay, the seat empties at zero. */
export function noteVisitorHarvest(session: StudioSession, tierId: string): StudioSession {
  const state = session.tiers[tierId];
  if (state === undefined) {
    return session;
  }
  const seat = state.active_visitor;
  if (seat === null) {
    return session;
  }
  const windowsLeft = seat.windows_left - 1;
  const nextSeat: ActiveVisitor | null =
    windowsLeft <= 0 ? null : { id: seat.id, windows_left: windowsLeft };
  return {
    ...session,
    tiers: { ...session.tiers, [tierId]: { ...state, active_visitor: nextSeat } },
  };
}

/** The seated visitor of a tier, or null. */
export function activeVisitorFor(session: StudioSession, tierId: string): ActiveVisitor | null {
  return session.tiers[tierId]?.active_visitor ?? null;
}

/** Fold the seated row's effects through the shared modifier mapping; EMPTY when nobody sits. */
export function visitorModifierOverlay(
  rows: readonly VisitorLike[],
  activeId: string | null,
): BenchModifiers {
  if (activeId === null) {
    return EMPTY_BENCH_MODIFIERS;
  }
  const row = rows.find((candidate) => candidate.id === activeId);
  if (row === undefined) {
    return EMPTY_BENCH_MODIFIERS;
  }
  return modifiersFromEffects(row.effects ?? []);
}

/** The `visitor_tables` payload shape (record of namespace -> catalog entries). */
export type VisitorTablesView = Readonly<Record<string, readonly CatalogEntry[]>>;

/**
 * Swap the tier's catalog for the seated visitor's `table_ref` while the
 * guest is on the bench; fall back to the base catalog when no visitor sits,
 * when the seated row lacks `table_ref`, or when the content table is
 * missing. The visitor table is the whole pool: every kind in the base
 * catalog returns the visitor's entries (count, rng pick, archive shape all
 * unchanged). Pure; reference-preserving when no swap fires.
 */
export function visitorTableOverride(
  rows: readonly VisitorLike[],
  activeId: string | null,
  visitorTables: VisitorTablesView | undefined,
  baseCatalog: CatalogMap,
): CatalogMap {
  if (visitorTables === undefined || activeId === null) {
    return baseCatalog;
  }
  const row = rows.find((candidate) => candidate.id === activeId);
  if (row === undefined || row.table_ref === undefined) {
    return baseCatalog;
  }
  const entries = visitorTables[row.table_ref];
  if (entries === undefined) {
    return baseCatalog;
  }
  const out: Record<string, readonly CatalogEntry[]> = {};
  for (const kind of Object.keys(baseCatalog)) {
    out[kind] = entries;
  }
  return out;
}
