// Window cap — how much of an absence one working may spend.
//
// A cook window is meant to be a handful of traces the player shaped, not an
// entire absence. Before this cap, a 240-tick catch-up (SPEC §4: one tick =
// 60 s, capped at 240) could cook as ONE 240-event window. Because
// `summarizeResidue` picks the dominant type from a fixed order with
// `practice_level` first, any level-up in such a window made the whole card
// `change`; measured away players saw 87-100 % change cards, the ladder's
// person/tradition gates never fired, and Garden never left the person rung.
//
// Sixteen keeps every window in the measured healthy regime (a live tend is
// 8 ticks; away windows of 30-60 ticks still reach world; the break is
// between 60 and 90), and leaves ordinary live windows untouched. The rest
// of a long pending stretch stays pending for the next working.

/** Pending traces one working may spend (the window's maximum length). */
export const WINDOW_MAX_EVENTS = 16;

/** Longest tail chunk when no more person windows complete. A single
 * stepSession call folds its whole person delta into the first rung at once
 * (fold_cadence 4), so a 240-tick tail handed the household bench ~50 copies
 * and its one window cooked as `change` again. One in-game day (24 ticks)
 * keeps a fold batch at a handful of copies, the same size a live step uses. */
export const CATCHUP_TAIL_TICKS = 24;

/** Completed person workings per absence. Two is the existing contract
 * ("a day away is one working or two"). When banked ticks remain after a
 * window completes it is archived and the next is queued, so a long absence
 * returns two cards; a window that completes exactly at the end of a short
 * absence is still left ready for the player, as it always was. */
export const CATCHUP_WORKINGS = 2;
