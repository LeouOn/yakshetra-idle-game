import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';

import {
  DAYS_PER_MONTH,
  HOURS_PER_DAY,
  MONTHS_PER_YEAR,
  calendarToHours,
  calendarToTick,
  formatCalendar,
  hoursToCalendar,
  tickToCalendar,
  type CalendarEpoch,
} from '../calendar';

const ORIGIN: CalendarEpoch = { year: 1, month: 1, day: 1, hour: 0 };
const TANG: CalendarEpoch = { year: 700, month: 1, day: 1, hour: 0 };
const HOURS_PER_YEAR = HOURS_PER_DAY * DAYS_PER_MONTH * MONTHS_PER_YEAR; // 8640

describe('tickToCalendar — known-answer', () => {
  it('tick 0 at the origin is year 1, month 1, day 1, hour 0, dayOfWeek 0', () => {
    expect(tickToCalendar(0n, ORIGIN)).toMatchObject({
      tick: 0n,
      year: 1,
      month: 1,
      day: 1,
      hour: 0,
      dayOfWeek: 0,
    });
  });

  it('tick 36278 at the origin is Year 5 / Month 3 / Day 12 / Hour 14 (format spec anchor)', () => {
    // (5-1)*8640 + (3-1)*720 + (12-1)*24 + 14 = 36278
    expect(tickToCalendar(36278n, ORIGIN)).toMatchObject({
      year: 5,
      month: 3,
      day: 12,
      hour: 14,
    });
  });

  it('the last hour of year 1 is tick 8639 → month 12, day 30, hour 23', () => {
    expect(tickToCalendar(BigInt(HOURS_PER_YEAR - 1), ORIGIN)).toMatchObject({
      year: 1,
      month: 12,
      day: 30,
      hour: 23,
    });
  });

  it('tick 8640 rolls over to year 2, month 1, day 1, hour 0', () => {
    expect(tickToCalendar(BigInt(HOURS_PER_YEAR), ORIGIN)).toMatchObject({
      year: 2,
      month: 1,
      day: 1,
      hour: 0,
    });
  });

  it('dayOfWeek wraps every 7 days (24 ticks/day)', () => {
    expect(tickToCalendar(0n, ORIGIN).dayOfWeek).toBe(0);
    expect(tickToCalendar(24n, ORIGIN).dayOfWeek).toBe(1);
    expect(tickToCalendar(168n, ORIGIN).dayOfWeek).toBe(0); // 7 * 24
  });

  it('epoch offset: tick 0 with Tang epoch lands on year 700', () => {
    expect(tickToCalendar(0n, TANG)).toMatchObject({ year: 700, month: 1, day: 1, hour: 0 });
  });

  it('epoch offset: 720 ticks (one month) past the Tang epoch is month 2', () => {
    expect(tickToCalendar(720n, TANG)).toMatchObject({ year: 700, month: 2, day: 1, hour: 0 });
  });

  it('very large ticks do not overflow bigint arithmetic', () => {
    const big = BigInt(HOURS_PER_YEAR) * 100000n; // 100,000 years
    expect(tickToCalendar(big, ORIGIN).year).toBe(100001);
  });
});

describe('calendarToTick — inverse', () => {
  it('recovers the format-spec anchor tick 36278 from its components', () => {
    expect(calendarToTick({ year: 5, month: 3, day: 12, hour: 14 }, ORIGIN)).toBe(36278n);
  });

  it('missing fields default to the epoch (year 700 month 3 → tick 1440)', () => {
    expect(calendarToTick({ month: 3 }, TANG)).toBe(720n * 2n);
  });

  it('throws RangeError when the date lands before the epoch', () => {
    expect(() => calendarToTick({ year: 699 }, TANG)).toThrow(RangeError);
  });
});

describe('round-trip property (fast-check)', () => {
  it('calendarToTick(tickToCalendar(tick, epoch)) === tick for non-negative ticks', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 0n, max: BigInt(HOURS_PER_YEAR) * 1000n }),
        fc.record({
          year: fc.integer({ min: 1, max: 9999 }),
          month: fc.integer({ min: 1, max: MONTHS_PER_YEAR }),
          day: fc.integer({ min: 1, max: DAYS_PER_MONTH }),
          hour: fc.integer({ min: 0, max: HOURS_PER_DAY - 1 }),
        }),
        (tick, epoch) => calendarToTick(tickToCalendar(tick, epoch), epoch) === tick,
      ),
      { numRuns: 200 },
    );
  });

  it('hoursToCalendar and calendarToHours are mutual inverses', () => {
    fc.assert(
      fc.property(fc.bigInt({ min: 0n, max: 10n ** 9n }), (hours) => {
        const c = hoursToCalendar(hours, TANG);
        return calendarToHours(c, TANG) === hours;
      }),
      { numRuns: 100 },
    );
  });
});

describe('formatCalendar', () => {
  const c = tickToCalendar(36278n, ORIGIN); // Year 5 / Month 3 / Day 12 / Hour 14

  it("short: 'Year 5, Month 3, Day 12, Hour 14'", () => {
    expect(formatCalendar(c, 'short')).toBe('Year 5, Month 3, Day 12, Hour 14');
  });

  it("long: 'Day 12 of Month 3, Year 5 — Hour 14:00'", () => {
    expect(formatCalendar(c, 'long')).toBe('Day 12 of Month 3, Year 5 — Hour 14:00');
  });

  it("era with name: 'Year 5 of the Tang Dynasty — Day 12, Hour 14'", () => {
    expect(formatCalendar(c, 'era', 'Tang Dynasty')).toBe(
      'Year 5 of the Tang Dynasty — Day 12, Hour 14',
    );
  });

  it("era without name falls back to 'Current Era'", () => {
    expect(formatCalendar(c, 'era')).toBe('Year 5 of the Current Era — Day 12, Hour 14');
  });

  it('long zero-pads single-digit hours', () => {
    const morning = tickToCalendar(9n, ORIGIN); // hour 9
    expect(formatCalendar(morning, 'long')).toContain('Hour 09:00');
  });
});

describe('edge cases and error paths', () => {
  it('tickToCalendar throws RangeError on negative tick', () => {
    expect(() => tickToCalendar(-1n, ORIGIN)).toThrow(RangeError);
  });

  it('hoursToCalendar throws RangeError on negative hours', () => {
    expect(() => hoursToCalendar(-5n, ORIGIN)).toThrow(RangeError);
  });

  it('tickToCalendar rejects an out-of-range epoch', () => {
    expect(() => tickToCalendar(0n, { year: 1, month: 13, day: 1, hour: 0 })).toThrow(RangeError);
    expect(() => tickToCalendar(0n, { year: 1, month: 1, day: 31, hour: 0 })).toThrow(RangeError);
    expect(() => tickToCalendar(0n, { year: 1, month: 1, day: 1, hour: 24 })).toThrow(RangeError);
  });
});
