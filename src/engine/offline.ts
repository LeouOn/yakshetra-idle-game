// Offline catch-up — turns real elapsed wall-clock time into idle ticks.
//
// When the player closes the game and returns hours or days later, this module
// computes how many idle ticks elapsed, delegates the actual simulation to
// `simulateIdleTicks` (./idle.ts), and packages the result into an
// {@link OfflineSummary} bracketed by calendar snapshots.
//
// Pure: no `Date`, no `Math.random`, no platform APIs. The "current time"
// (`nowUnix`) and the RNG `rngSeed` are PARAMETERS — the engine never reads
// the wall clock or the global RNG. This keeps the module deterministic and
// fully testable: identical inputs always yield identical outputs.

import type { Ending } from '@/content/schema';

import type { CalendarComponents, CalendarEpoch } from './calendar';
import { tickToCalendar } from './calendar';
import { simulateIdleTicks } from './idle';
import { createRng } from './rng';
import type { DailySchedule } from './schedule';
import type { IdleState, LifeState, OfflineSummary, Practice } from './types';

/** Seconds per minute (kept symbolic for the elapsed-time math). */
const SECONDS_PER_MINUTE = 60;
/** Minutes per hour — one idle tick equals one hour (see ./calendar.ts). */
const MINUTES_PER_HOUR = 60;

/**
 * Compute what happened while the player was away and return the advanced
 * state, the advanced idle counters, and an {@link OfflineSummary}.
 *
 * Elapsed time is derived from `nowUnix - state.lastVisitedAtUnix` (both in
 * unix seconds), floored to whole minutes, then to whole hours (ticks). When
 * zero or fewer ticks elapsed the state is returned unchanged apart from
 * stamping `lastVisitedAtUnix = nowUnix`, and the summary is empty.
 *
 * The returned `state` always carries an updated `lastVisitedAtUnix` so the
 * next catch-up starts from the right point.
 */
export function computeOfflineSummary(
  state: LifeState,
  idle: IdleState,
  schedule: DailySchedule,
  practices: readonly Practice[],
  endings: readonly Ending[],
  epoch: CalendarEpoch,
  nowUnix: number,
  rngSeed: bigint,
): { state: LifeState; idle: IdleState; summary: OfflineSummary } {
  const calendarBefore: CalendarComponents = tickToCalendar(idle.lastSimulatedTick, epoch);
  const stamped: LifeState = { ...state, lastVisitedAtUnix: nowUnix };

  const lastVisited = state.lastVisitedAtUnix ?? 0;
  const elapsedSeconds = nowUnix - lastVisited;
  const elapsedMinutes = elapsedSeconds <= 0 ? 0 : Math.floor(elapsedSeconds / SECONDS_PER_MINUTE);
  const ticks = BigInt(Math.floor(elapsedMinutes / MINUTES_PER_HOUR));

  if (ticks <= 0n) {
    const empty: OfflineSummary = {
      idleTicksSimulated: 0n,
      resourcesGained: {},
      practicesAdvanced: [],
      eventsTriggered: [],
      endingTriggered: null,
      calendarBefore,
      calendarAfter: calendarBefore,
    };
    return { state: stamped, idle, summary: empty };
  }

  const rng = createRng(rngSeed);
  const {
    state: advanced,
    idle: newIdle,
    result,
  } = simulateIdleTicks(state, idle, schedule, practices, ticks, endings, rng);

  const calendarAfter: CalendarComponents = tickToCalendar(newIdle.lastSimulatedTick, epoch);

  const summary: OfflineSummary = {
    idleTicksSimulated: result.ticksSimulated,
    resourcesGained: result.resourcesGained,
    practicesAdvanced: result.practicesAdvanced,
    eventsTriggered: result.eventsTriggered,
    endingTriggered: result.endingTriggered,
    calendarBefore,
    calendarAfter,
  };

  return { state: { ...advanced, lastVisitedAtUnix: nowUnix }, idle: newIdle, summary };
}

/**
 * Render an {@link OfflineSummary} as a human-readable string for display.
 * The `eraName` (e.g. "Tang Dynasty") optionally contextualises the header.
 * Output is derived purely from the summary — no i18n lookup happens here.
 */
export function formatOfflineSummary(summary: OfflineSummary, eraName?: string): string {
  const ticks = summary.idleTicksSimulated;
  if (ticks <= 0n) {
    return 'Welcome back. No time has passed.';
  }

  const hours = Number(ticks);
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  const duration =
    days > 0
      ? `${days} day${days === 1 ? '' : 's'}, ${remHours} hour${remHours === 1 ? '' : 's'}`
      : `${remHours} hour${remHours === 1 ? '' : 's'}`;

  const setting = eraName === undefined ? '' : ` in the ${eraName}`;
  const lines: string[] = [`While you were away (${duration})${setting}:`];

  const gained = Object.entries(summary.resourcesGained).filter(([, v]) => v !== undefined);
  if (gained.length > 0) {
    lines.push(`  Resources gained: ${gained.map(([k, v]) => `${k} +${v}`).join(', ')}`);
  }

  const leveled = summary.practicesAdvanced.filter((p) => p.leveledUp);
  if (leveled.length > 0) {
    lines.push(`  Practices levelled up: ${leveled.map((p) => p.id).join(', ')}`);
  }

  if (summary.eventsTriggered.length > 0) {
    const unique = new Set(summary.eventsTriggered);
    lines.push(`  Events triggered: ${summary.eventsTriggered.length} (${unique.size} unique)`);
  }

  if (summary.endingTriggered !== null) {
    lines.push(`  Your life reached its conclusion: ${summary.endingTriggered}`);
  }

  return lines.join('\n');
}
