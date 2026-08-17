// Pack calendar id → epoch. Lives in content so the engine stays era-agnostic.

import type { CalendarEpoch } from '@/engine/calendar';

const TANG_EPOCH: CalendarEpoch = { year: 780, month: 1, day: 1, hour: 0 };
const DEFAULT_EPOCH: CalendarEpoch = { year: 1, month: 1, day: 1, hour: 0 };

export function epochFromPackCalendar(calendar: string): CalendarEpoch {
  if (calendar.startsWith('tang')) {
    return TANG_EPOCH;
  }
  return DEFAULT_EPOCH;
}
