// Cook-window planning — the pure math behind "the cook is a hand"
// (docs/design/00-direction.md, lane B). The player shapes the window at
// queue time: choose WHICH traces to spend (everything by default) and a
// short or long fire. This module owns the numbers and the index arithmetic;
// the state transitions stay in operations.ts. Pure: no Date, no RNG, no I/O.

import type { CookFire } from './fill-adapter';
import type { DevelopOperation, StudioState } from './operations';
import { residueWindowId, type ResidueEvent } from './residue';
import type { Rng } from './rng';

/** Minimum window size before a develop job can start. */
export const MIN_RESIDUE_TO_DEVELOP = 3;

const MIN_COOK_TICKS = 2;

/** Extra ticks a long fire costs over a short fire of the same window. */
export const LONG_FIRE_EXTRA_TICKS = 6;

/** Counters for the wave-1 instrumented bar: "% of cooks that use hold-back
 * or long fire" (target >50%, baseline 0%). Plain ints on the bench so the
 * number survives save/load without a session migration. */
export interface CookChoices {
  readonly long: number;
  readonly holdback: number;
}

export const EMPTY_COOK_CHOICES: CookChoices = { long: 0, holdback: 0 };

/**
 * Ticks a window of `windowLength` events takes to cook.
 *
 * Short fire: `4 + ceil(len / 2)`, capped as before. The old formula
 * (`4 + min(len, 8)`) charged a full tick per extra event, which made the
 * minimum 3-event window strictly dominant — banking was always worse. The
 * halved marginal cost makes material nearly free in ticks: an 8-event
 * window costs 2 more ticks than a 3-event one (8 vs 6), so the choice
 * between cooking big (kind + richer card) and holding back (kind steering,
 * saving a marker for the next window) is decided by what the player wants,
 * not by the clock.
 *
 * Long fire: +LONG_FIRE_EXTRA_TICKS (12 ticks at len 3, 14 at len 8). It
 * buys the filler contract — rarity floor uncommon and first call for a
 * matching figure row — so it is a quality/time trade, never a requirement.
 */
export function cookTicksFor(windowLength: number, fire: CookFire = 'short'): number {
  const extra = Math.min(8, Math.ceil(windowLength / 2));
  return 4 + extra + (fire === 'long' ? LONG_FIRE_EXTRA_TICKS : 0);
}

/** The one cook-length planner (browser finding 1): what the panel
 * advertises and what the bay queues both come from here, on the same
 * inputs. Banked heat (surplus) may shave at most HALF the SHORT base cook
 * and never touches the long fire's extra ticks — those six ticks are the
 * price of the rarity floor and the figure first call, so surplus must not
 * erase the fire trade. Returns the total ticks and how many the banked
 * heat saved (for the panel's receipt line). */
export interface CookTickPlan {
  readonly total: number;
  readonly heatSaved: number;
}

export function planCookTicks(
  windowLength: number,
  fire: CookFire,
  cookTicksDiscount: number,
  surplus: number,
): CookTickPlan {
  const base = Math.max(
    MIN_COOK_TICKS,
    cookTicksFor(windowLength, fire) - Math.max(0, cookTicksDiscount),
  );
  const shaveCap = Math.floor(cookTicksFor(windowLength, 'short') / 2);
  const heatSaved = Math.max(0, Math.min(surplus, shaveCap, base - MIN_COOK_TICKS));
  return { total: Math.max(MIN_COOK_TICKS, base - heatSaved), heatSaved };
}

/** Absolute residue indices that are still pending: every event after the
 * last spent one, plus any held-out skips below it (hold-back can leave
 * middle events unspent while later ones cook). Ascending. */
export function pendingIndices(studio: StudioState): readonly number[] {
  // Ghost indices (an out-of-sync save) are dropped here rather than counted
  // toward the gate while the window filter silently drops the event itself.
  const out = new Set<number>();
  for (const index of studio.held_residue) {
    if (Number.isInteger(index) && index >= 0 && index < studio.residue.length) {
      out.add(index);
    }
  }
  for (let i = studio.last_harvest_index + 1; i < studio.residue.length; i += 1) {
    out.add(i);
  }
  return [...out].sort((a, b) => a - b);
}

/** Traces held out of the current cook (a subset of pendingIndices). */
export function heldPending(studio: StudioState): readonly number[] {
  const pending = new Set(pendingIndices(studio));
  return studio.held_residue.filter((index) => pending.has(index));
}

/** The window a cook would spend right now: pending minus held traces. */
export function spendableResidue(studio: StudioState): readonly ResidueEvent[] {
  const held = new Set(heldPending(studio));
  return eventsAt(
    studio,
    pendingIndices(studio).filter((index) => !held.has(index)),
  );
}

/** Every unconsumed event, held-out skips included — the bench's raw charge. */
export function pendingResidue(studio: StudioState): readonly ResidueEvent[] {
  return eventsAt(studio, pendingIndices(studio));
}

/** Events at the given indices, skipping any that fell out of range (the
 * log is append-only, so in practice none do; the guard is for the type
 * checker, not for a runtime condition). */
function eventsAt(studio: StudioState, indices: readonly number[]): readonly ResidueEvent[] {
  const out: ResidueEvent[] = [];
  for (const index of indices) {
    const event = studio.residue[index];
    if (event !== undefined) {
      out.push(event);
    }
  }
  return out;
}

/** How many traces may be held back given the queue gate: anything above
 * the gate. There is no count cap — the spendable window must simply stay
 * large enough to cook (the develop control must stay pressable). */
export function maxHoldBack(pendingCount: number, gate: number): number {
  return Math.max(0, pendingCount - Math.max(1, gate));
}

/** Canonicalize a requested hold-back selection for a cook: keep only
 * indices that are actually pending, deduped, ascending. A selection that
 * would drop the spendable window below the gate is trimmed by SPENDING
 * the lowest held indices first — deterministic, and the panel prevents the
 * state anyway. `undefined` means "no new choice": existing holds carry
 * over. */
export function canonicalHold(
  studio: StudioState,
  requested: readonly number[] | undefined,
  pending: readonly number[],
  gate: number,
): readonly number[] {
  const current = heldPending(studio);
  const chosen = requested === undefined ? current : requested;
  const allowed = new Set(pending);
  const kept: number[] = [];
  for (const index of [...chosen].sort((a, b) => a - b)) {
    if (allowed.has(index) && !kept.includes(index)) {
      kept.push(index);
    }
  }
  // Spend (un-hold) from the front until the cookable window meets the gate.
  let spendable = pending.length - kept.length;
  while (kept.length > 0 && spendable < gate) {
    const spentIndex = kept.shift();
    if (spentIndex === undefined) {
      break;
    }
    spendable += 1;
  }
  return kept;
}

/**
 * Snapshot the pending window into the single bay — the window is spent even
 * if harvest fails; charge must be earned again. cookTicksDiscount shortens
 * the cook (floored at MIN_COOK_TICKS); minResidue lowers the queue gate
 * (floored at 1, so no modifier can ever queue an empty window). Lane B:
 * `fire` picks the cook length ('short' default; 'long' = +LONG_FIRE_EXTRA_TICKS
 * and the filler's rarity-floor/figure-first-call contract), `holdBack` is
 * the full set of pending indices to leave unspent (they stay pending for
 * the next cook). Spendable-window gate applies AFTER hold-back.
 */
export function queueDevelop(
  studio: StudioState,
  brief: string | null,
  rng: Rng,
  opts?: {
    readonly cookTicksDiscount?: number;
    readonly minResidue?: number;
    readonly fire?: CookFire;
    readonly holdBack?: readonly number[];
  },
): StudioState {
  const pending = pendingIndices(studio);
  const gate = Math.max(1, opts?.minResidue ?? MIN_RESIDUE_TO_DEVELOP);
  const hold = canonicalHold(studio, opts?.holdBack, pending, gate);
  const held = new Set(hold);
  const spent = pending.filter((index) => !held.has(index));
  if (studio.bay !== null || spent.length < gate) {
    return studio;
  }
  const window = spent
    .map((index) => studio.residue[index])
    .filter((event): event is ResidueEvent => event !== undefined);
  // An empty window can never cook (wave-1 review #3): refuse rather than
  // advance last_harvest_index past real events on a phantom selection.
  if (window.length === 0) {
    return studio;
  }
  const fire: CookFire = opts?.fire ?? 'short';
  const seed = rng.nextInt(1, 0x7fffffff);
  const id = `op-${studio.archive.length}-${seed}`;
  const plan = planCookTicks(window.length, fire, opts?.cookTicksDiscount ?? 0, studio.surplus);
  const used = plan.heatSaved;
  const bay: DevelopOperation = {
    id,
    type: 'develop_from_residue',
    residue_window_id: residueWindowId(window),
    residue: window,
    brief,
    cook_ticks_total: plan.total,
    cook_ticks_done: 0,
    status: 'cooking',
    rng_seed: String(seed),
    focus: studio.pinned,
    fire,
  };
  return {
    ...studio,
    bay,
    // Only the spent positions count as consumed; held skips stay pending.
    last_harvest_index: Math.max(
      studio.last_harvest_index,
      spent[spent.length - 1] ?? studio.last_harvest_index,
    ),
    surplus: studio.surplus - used,
    held_residue: hold,
    cook_choices: {
      long: studio.cook_choices.long + (fire === 'long' ? 1 : 0),
      holdback: studio.cook_choices.holdback + (hold.length > 0 ? 1 : 0),
    },
  };
}
