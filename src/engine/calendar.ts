/**
 * Pure calendar module — converts between game ticks and human-readable
 * calendar dates. Deterministic only: no `Date`, no `Math.random`, no
 * platform APIs. Tick arithmetic uses bigint because ticks accumulate
 * over years of play and would overflow a safe-integer `number`.
 *
 * Calendar geometry (fixed, era-independent):
 *   1 tick   = 1 hour
 *   24 hours = 1 day    (24 ticks)
 *   30 days  = 1 month  (720 ticks)
 *   12 months = 1 year  (8640 ticks)
 *   7 days   = 1 week
 *
 * The epoch pins where tick=0 lands on the calendar (e.g. a Tang-era
 * pack sets epoch = year 700, month 1, day 1, hour 0).
 */

/** The reference point for a calendar (when tick=0). */
export interface CalendarEpoch {
  readonly year: number;
  readonly month: number; // 1-12
  readonly day: number; // 1-30
  readonly hour: number; // 0-23
}

/** A decomposed calendar date. */
export interface CalendarComponents {
  readonly tick: bigint;
  readonly year: number;
  readonly month: number; // 1-12
  readonly day: number; // 1-30
  readonly hour: number; // 0-23
  readonly dayOfWeek: number; // 0-6
}

/** Format options for display. */
export type CalendarFormat = 'short' | 'long' | 'era';

/** 1 tick = 1 hour. */
export const TICKS_PER_HOUR = 1n;
export const HOURS_PER_DAY = 24;
export const DAYS_PER_MONTH = 30;
export const MONTHS_PER_YEAR = 12;
export const DAYS_PER_WEEK = 7;

const HOURS_PER_MONTH = HOURS_PER_DAY * DAYS_PER_MONTH; // 720
const HOURS_PER_YEAR = HOURS_PER_DAY * DAYS_PER_MONTH * MONTHS_PER_YEAR; // 8640

const BIG_24 = BigInt(HOURS_PER_DAY);
const BIG_7 = BigInt(DAYS_PER_WEEK);
const BIG_30 = BigInt(DAYS_PER_MONTH);
const BIG_12 = BigInt(MONTHS_PER_YEAR);

/** Exhaustiveness guard for the `CalendarFormat` union. */
function assertNeverFormat(format: never): never {
  throw new RangeError(`formatCalendar: unknown format ${String(format)}`);
}

/**
 * Validates an epoch-shaped value at the boundary. Throws RangeError on any
 * out-of-range field — calendar geometry bugs from a mis-specified era pack
 * must fail loudly, not silently roll the date forward.
 */
function assertEpochLike(epoch: CalendarEpoch, label: string): void {
  const { year, month, day, hour } = epoch;
  if (!Number.isInteger(year) || year < 1) {
    throw new RangeError(`${label}: year must be a positive integer (got ${year})`);
  }
  if (!Number.isInteger(month) || month < 1 || month > MONTHS_PER_YEAR) {
    throw new RangeError(`${label}: month must be 1..${MONTHS_PER_YEAR} (got ${month})`);
  }
  if (!Number.isInteger(day) || day < 1 || day > DAYS_PER_MONTH) {
    throw new RangeError(`${label}: day must be 1..${DAYS_PER_MONTH} (got ${day})`);
  }
  if (!Number.isInteger(hour) || hour < 0 || hour >= HOURS_PER_DAY) {
    throw new RangeError(`${label}: hour must be 0..${HOURS_PER_DAY - 1} (got ${hour})`);
  }
}

/** Absolute hours from the calendar origin (year 1, month 1, day 1, hour 0). */
function absoluteHours(epoch: CalendarEpoch): bigint {
  return (
    BigInt(epoch.year - 1) * BigInt(HOURS_PER_YEAR) +
    BigInt(epoch.month - 1) * BigInt(HOURS_PER_MONTH) +
    BigInt(epoch.day - 1) * BIG_24 +
    BigInt(epoch.hour)
  );
}

/** Decompose absolute-hours-from-origin into calendar fields. */
function decompose(
  absHour: bigint,
): Pick<CalendarComponents, 'year' | 'month' | 'day' | 'hour' | 'dayOfWeek'> {
  const hour = Number(absHour % BIG_24);
  const totalDays = absHour / BIG_24;
  const dayOfWeek = Number(totalDays % BIG_7);
  const day = Number(totalDays % BIG_30) + 1;
  const totalMonths = totalDays / BIG_30;
  const month = Number(totalMonths % BIG_12) + 1;
  const year = Number(totalMonths / BIG_12) + 1;
  return { year, month, day, hour, dayOfWeek };
}

/**
 * Converts a tick to calendar components relative to the given epoch.
 * Throws RangeError if `tick` is negative.
 */
export function tickToCalendar(tick: bigint, epoch: CalendarEpoch): CalendarComponents {
  if (tick < 0n) {
    throw new RangeError(`tickToCalendar: tick must be non-negative (got ${tick})`);
  }
  assertEpochLike(epoch, 'CalendarEpoch');
  const absHour = absoluteHours(epoch) + tick;
  return { tick, ...decompose(absHour) };
}

/**
 * Converts calendar components back to a tick relative to the epoch.
 * Missing fields default to the epoch's values. Throws RangeError if the
 * resolved date lands before the epoch (negative tick).
 */
export function calendarToTick(
  components: Partial<CalendarComponents>,
  epoch: CalendarEpoch,
): bigint {
  assertEpochLike(epoch, 'CalendarEpoch');
  const resolved: CalendarEpoch = {
    year: components.year ?? epoch.year,
    month: components.month ?? epoch.month,
    day: components.day ?? epoch.day,
    hour: components.hour ?? epoch.hour,
  };
  assertEpochLike(resolved, 'calendarToTick: components');
  const tick = absoluteHours(resolved) - absoluteHours(epoch);
  if (tick < 0n) {
    throw new RangeError(`calendarToTick: date is before the epoch (tick ${tick})`);
  }
  return tick;
}

/**
 * Formats calendar components for display.
 * - `'short'`: `"Year 5, Month 3, Day 12, Hour 14"`
 * - `'long'`:  `"Day 12 of Month 3, Year 5 — Hour 14:00"`
 * - `'era'`:   `"Year 5 of the Tang Dynasty — Day 12, Hour 14"`
 *   (`eraName` defaults to `"Current Era"` when omitted.)
 */
export function formatCalendar(
  c: CalendarComponents,
  format: CalendarFormat,
  eraName?: string,
): string {
  const hour2 = String(c.hour).padStart(2, '0');
  switch (format) {
    case 'short':
      return `Year ${c.year}, Month ${c.month}, Day ${c.day}, Hour ${c.hour}`;
    case 'long':
      return `Day ${c.day} of Month ${c.month}, Year ${c.year} — Hour ${hour2}:00`;
    case 'era':
      return `Year ${c.year} of the ${eraName ?? 'Current Era'} — Day ${c.day}, Hour ${c.hour}`;
    default:
      return assertNeverFormat(format);
  }
}

/** Total hours since the epoch for the given calendar components (= tick). */
export function calendarToHours(c: CalendarComponents, epoch: CalendarEpoch): bigint {
  assertEpochLike(epoch, 'CalendarEpoch');
  return (
    absoluteHours({ year: c.year, month: c.month, day: c.day, hour: c.hour }) - absoluteHours(epoch)
  );
}

/** Converts hours since the epoch to calendar components. Throws on negative hours. */
export function hoursToCalendar(hours: bigint, epoch: CalendarEpoch): CalendarComponents {
  return tickToCalendar(hours, epoch);
}
