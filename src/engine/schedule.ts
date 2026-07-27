/**
 * Pure daily-schedule resolution for the idle-game engine.
 *
 * A `DailySchedule` partitions a 24-hour day into ordered, non-overlapping
 * `ScheduleBlock`s. `resolveBlock` / `resolveScheduleState` answer "what is
 * the character doing right now?" at any tick — deterministically, and without
 * touching the wall clock, the global RNG, or any platform API.
 *
 * Time model: one tick equals one hour. `tick` is an absolute bigint counter
 * and the day boundary is `tick % hoursPerDay`. Negative ticks are normalised
 * into [0, hoursPerDay) so the same arithmetic serves rewinds. Sub-hour
 * resolution is intentionally out of scope; a `ticksPerHour` factor can be
 * layered above this module if finer granularity is ever required.
 */

/** Hours in a standard day — also the upper bound for `endHour`. */
const HOURS_PER_DAY = 24;

/** Default day length used when `resolveScheduleState` omits `hoursPerDay`. */
const DEFAULT_HOURS_PER_DAY = 24;

/**
 * A named period within a day (e.g., dawn, morning, work, rest).
 * `endHour` is exclusive: a block `[5, 7)` contains hours 5 and 6 only.
 */
export interface ScheduleBlock {
  readonly id: string;
  /** i18n key for the human-readable label. */
  readonly label_sid: string;
  /** Hour at which the block becomes active, inclusive. */
  readonly startHour: number;
  /** Hour at which the block ends, exclusive. */
  readonly endHour: number;
  /** Associated practice id, or null for a non-practice block. */
  readonly practice_id: string | null;
  /** i18n key for the icon / emoji glyph. */
  readonly icon_sid: string;
}

/** A full day's schedule, composed of ordered blocks covering 24h. */
export interface DailySchedule {
  readonly id: string;
  /** i18n key for the schedule name. */
  readonly name_sid: string;
  /** Ordered blocks; must cover [0, 24) without gaps or overlaps. */
  readonly blocks: readonly ScheduleBlock[];
}

/** The currently active block plus progress within it. */
export interface ScheduleState {
  readonly currentBlock: ScheduleBlock;
  readonly nextBlock: ScheduleBlock;
  /** Fractional progress through the current block, clamped to [0, 1]. */
  readonly progressThroughBlock: number;
  /** Offset of the current hour from the block start (>= 0). */
  readonly hourWithinBlock: number;
  /** Whole hours after the current one before the block ends (>= 0). */
  readonly hoursRemainingInBlock: number;
}

/** Result of validating a schedule's structural integrity. */
export interface ScheduleValidation {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

/**
 * Narrows a possibly-undefined indexed element to `T`.
 *
 * Required by `noUncheckedIndexedAccess`; the guard is unreachable for indices
 * the caller has validated and is not defensive bloat.
 */
function getElement<T>(arr: readonly T[], index: number): T {
  const value = arr[index];
  if (value === undefined) {
    throw new Error(`schedule: index ${index} out of bounds for length ${arr.length}`);
  }
  return value;
}

/**
 * Find the block that contains `hourOfDay` (endHour exclusive).
 *
 * @throws {RangeError} if `hourOfDay` is not an integer in [0, 24).
 * @throws {Error} if no block covers the hour (the schedule is invalid).
 */
export function resolveBlock(schedule: DailySchedule, hourOfDay: number): ScheduleBlock {
  if (!Number.isInteger(hourOfDay) || hourOfDay < 0 || hourOfDay >= HOURS_PER_DAY) {
    throw new RangeError(`resolveBlock: hourOfDay must be an integer in [0, 24), got ${hourOfDay}`);
  }
  for (const block of schedule.blocks) {
    if (hourOfDay >= block.startHour && hourOfDay < block.endHour) {
      return block;
    }
  }
  throw new Error(
    `resolveBlock: no block covers hour ${hourOfDay} in schedule "${schedule.id}" (schedule may be invalid)`,
  );
}

/**
 * Fractional progress through `block` at `hourOfDay`, clamped to [0, 1].
 *
 * Hours before the block return 0; hours at/after `endHour` return 1. A
 * zero-duration block is treated as fully complete (returns 1).
 */
export function getBlockProgress(block: ScheduleBlock, hourOfDay: number): number {
  const duration = block.endHour - block.startHour;
  if (duration <= 0) return 1;
  const raw = (hourOfDay - block.startHour) / duration;
  if (raw < 0) return 0;
  if (raw > 1) return 1;
  return raw;
}

/**
 * Compute the full schedule state at an absolute tick.
 *
 * `tick` is normalised into [0, hoursPerDay) via mathematical modulo (so
 * negative ticks rewind correctly). The next block wraps from the last back to
 * the first.
 *
 * @throws {RangeError} if `hoursPerDay` is not a positive integer.
 * @throws {Error} if the resolved hour falls in a gap (invalid schedule).
 */
export function resolveScheduleState(
  schedule: DailySchedule,
  tick: bigint,
  hoursPerDay: number = DEFAULT_HOURS_PER_DAY,
): ScheduleState {
  if (!Number.isInteger(hoursPerDay) || hoursPerDay <= 0) {
    throw new RangeError(
      `resolveScheduleState: hoursPerDay must be a positive integer, got ${hoursPerDay}`,
    );
  }
  const dayLength = BigInt(hoursPerDay);
  let tickInDay = tick % dayLength;
  if (tickInDay < 0n) tickInDay += dayLength;
  const hourOfDay = Number(tickInDay);

  const currentBlock = resolveBlock(schedule, hourOfDay);
  const currentIndex = schedule.blocks.indexOf(currentBlock);
  const nextIndex = (currentIndex + 1) % schedule.blocks.length;
  const nextBlock = getElement(schedule.blocks, nextIndex);

  return {
    currentBlock,
    nextBlock,
    progressThroughBlock: getBlockProgress(currentBlock, hourOfDay),
    hourWithinBlock: hourOfDay - currentBlock.startHour,
    hoursRemainingInBlock: currentBlock.endHour - hourOfDay - 1,
  };
}

/**
 * Validate that a schedule's blocks cover [0, 24) with no gaps, overlaps,
 * unsorted entries, or sub-one-hour durations.
 *
 * Returns the full error list rather than throwing, so callers can report all
 * problems in one pass. The schedule is valid iff `errors` is empty.
 */
export function validateSchedule(schedule: DailySchedule): ScheduleValidation {
  const errors: string[] = [];
  const blocks = schedule.blocks;

  if (blocks.length === 0) {
    errors.push('schedule must contain at least one block');
    return { valid: false, errors };
  }

  const first = getElement(blocks, 0);
  if (first.startHour !== 0) {
    errors.push(`first block "${first.id}" must start at hour 0, got ${first.startHour}`);
  }

  for (const block of blocks) {
    if (!Number.isInteger(block.startHour) || !Number.isInteger(block.endHour)) {
      errors.push(`block "${block.id}" startHour/endHour must be integers`);
    }
    if (block.startHour < 0 || block.endHour > HOURS_PER_DAY) {
      errors.push(`block "${block.id}" hours must lie in [0, 24]`);
    }
    if (block.endHour - block.startHour < 1) {
      errors.push(`block "${block.id}" must be at least 1 hour long`);
    }
  }

  for (let i = 0; i < blocks.length - 1; i++) {
    const a = getElement(blocks, i);
    const b = getElement(blocks, i + 1);
    if (a.startHour >= b.startHour) {
      errors.push(
        `block "${a.id}" must precede "${b.id}" (startHour ${a.startHour} >= ${b.startHour})`,
      );
    }
    if (a.endHour > b.startHour) {
      errors.push(`block "${a.id}" overlaps "${b.id}" (end ${a.endHour} > start ${b.startHour})`);
    } else if (a.endHour < b.startHour) {
      errors.push(`gap between "${a.id}" (end ${a.endHour}) and "${b.id}" (start ${b.startHour})`);
    }
  }

  const last = getElement(blocks, blocks.length - 1);
  if (last.endHour !== HOURS_PER_DAY) {
    errors.push(`last block "${last.id}" must end at hour 24, got ${last.endHour}`);
  }

  return { valid: errors.length === 0, errors };
}
