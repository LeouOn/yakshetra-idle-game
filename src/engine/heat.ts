// Cook economics and banked heat — the numbers the bench's cook and its
// surplus bank are both measured against.
//
// Browser finding 4: an unbounded stock of banked heat reads like infinite
// savings even though the shave is capped, so the bank has a ceiling. The
// ceiling is three times the longest cook a player can ask for, so both sets
// of numbers live here together: change the cook's cost and the ceiling moves
// with it, instead of the two quietly drifting apart.
//
// Pure: no Date, no RNG, no I/O, and no imports at all — a leaf module, so it
// cannot take part in an import cycle.

/** The base cost of any cook, before the window's size and the fire. */
export const BASE_COOK_TICKS = 4;

/** The most extra ticks a window can add to a cook (the widest window). */
export const MAX_WINDOW_COOK_TICKS = 8;

/** Extra ticks a long fire costs over a short fire of the same window. */
export const LONG_FIRE_EXTRA_TICKS = 6;

/** The most ticks any cook can ask for: base + widest window + long fire. */
export const LONGEST_LONG_COOK_TICKS =
  BASE_COOK_TICKS + MAX_WINDOW_COOK_TICKS + LONG_FIRE_EXTRA_TICKS;

/** Banked-heat ceiling (browser finding 4): three times the longest long
 * cook. Heat past the cap is simply not banked — an unbounded stock reads
 * like infinite savings even though the shave is capped. */
export const SURPLUS_CAP_TICKS = 3 * LONGEST_LONG_COOK_TICKS;

/** Bank `ticks` of heat, dropping whatever exceeds the cap. */
export function bankHeat(current: number, ticks: number): number {
  if (ticks <= 0) {
    return current;
  }
  return Math.min(SURPLUS_CAP_TICKS, current + ticks);
}
