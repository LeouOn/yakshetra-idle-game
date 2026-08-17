// Idle tick reducer — the heart of the idle-game loop.
//
// `simulateIdleTicks` advances time by N ticks, resolving the daily schedule
// at each tick to find the active practice, folding that practice's effects
// into LifeState, accumulating practice progress (with level-ups), and
// checking life-ending triggers. Pure: no Date, no Math.random, no platform
// APIs — every stochastic path runs through the seeded {@link Rng}.
//
// The single-tick bookkeeping (turn+1, time-1, cooldown-1) is delegated to
// `advanceIdleTick` in ./turn.ts so there is exactly one owner of per-tick
// state advancement. Effect application reuses `applyEffect` from ./reducer.ts
// and predicate evaluation reuses `evaluatePredicate` from ./predicates.ts.

import type { Ending } from '@/content/schema';

import type { IdleState, IdleTickResult, LifeState, Practice, ResourceId } from './types';
import type { DailySchedule } from './schedule';
import { resolveScheduleState } from './schedule';
import type { Rng } from './rng';
import { applyEffect } from './reducer';
import { evaluatePredicate } from './predicates';
import { advanceIdleTick } from './turn';
import { appendResidue, residueLog, type ResidueEvent } from './residue';

/** Initial idle state: no ticks simulated yet, mode idle. */
export function createIdleState(): IdleState {
  return { mode: 'idle', lastSimulatedTick: 0n, totalIdleTicks: 0n };
}

/**
 * Fold a practice's effects into state, returning a NEW state. Each effect
 * runs through {@link applyEffect}; the `rng` slot is reserved for future
 * stochastic effects.
 */
export function applyPracticeEffects(state: LifeState, practice: Practice, rng: Rng): LifeState {
  return practice.effects.reduce<LifeState>((acc, effect) => applyEffect(acc, effect, rng), state);
}

/**
 * Return the id of the first ending whose `trigger` predicate matches `state`,
 * or null when no ending matches. Endings are evaluated in declaration order.
 */
export function checkEndingTrigger(state: LifeState, endings: readonly Ending[]): string | null {
  for (const ending of endings) {
    if (evaluatePredicate(state, ending.trigger)) {
      return ending.id;
    }
  }
  return null;
}

interface PracticeAcc {
  progress: number;
  level: number;
  leveledUp: boolean;
  gained: number;
}

/**
 * Simulate `ticksToSimulate` idle ticks. For each tick: resolve the schedule
 * block at the current absolute tick, find the matching practice, apply its
 * effects, accumulate progress (levelling up past `maxProgress`), advance the
 * single-tick bookkeeping, then check for a life-ending trigger — halting on
 * the first match.
 *
 * Returns the new LifeState, the advanced IdleState, and an aggregated result.
 * Inputs are never mutated.
 */
export function simulateIdleTicks(
  state: LifeState,
  idle: IdleState,
  schedule: DailySchedule,
  practices: readonly Practice[],
  ticksToSimulate: bigint,
  endings: readonly Ending[],
  rng: Rng,
): { state: LifeState; idle: IdleState; result: IdleTickResult } {
  const acc = new Map<string, PracticeAcc>();
  for (const p of practices) {
    acc.set(p.id, { progress: p.currentProgress, level: p.level, leveledUp: false, gained: 0 });
  }

  const resourcesGained: Partial<Record<ResourceId, number>> = {};
  const eventsTriggered: string[] = [];
  let endingTriggered: string | null = null;
  let ticksProcessed = 0n;
  let current = state;

  const total = ticksToSimulate < 0n ? 0n : ticksToSimulate;

  for (let i = 0n; i < total; i++) {
    const tick = idle.lastSimulatedTick + i + 1n;
    const block = resolveScheduleState(schedule, tick).currentBlock;
    const active =
      block.practice_id === null ? undefined : practices.find((p) => p.id === block.practice_id);

    if (active !== undefined) {
      current = applyPracticeEffects(current, active, rng);
      const a = acc.get(active.id);
      if (a !== undefined) {
        a.progress += active.progressPerTick;
        a.gained += active.progressPerTick;
        while (active.maxProgress > 0 && a.progress >= active.maxProgress) {
          a.progress -= active.maxProgress;
          a.level += 1;
          a.leveledUp = true;
        }
      }
      for (const eff of active.effects) {
        if (eff.op === 'add_resource') {
          const key = eff.key as ResourceId;
          resourcesGained[key] = (resourcesGained[key] ?? 0) + eff.delta;
        } else if (eff.op === 'trigger_event') {
          eventsTriggered.push(eff.event_id);
        }
      }
    }

    current = advanceIdleTick(current);
    ticksProcessed += 1n;

    const ending = checkEndingTrigger(current, endings);
    if (ending !== null) {
      endingTriggered = ending;
      break;
    }
  }

  const practicesAdvanced = practices.map((p) => {
    const a = acc.get(p.id);
    if (a === undefined) return { id: p.id, progressGained: 0, leveledUp: false };
    return { id: p.id, progressGained: a.gained, leveledUp: a.leveledUp };
  });

  const newIdle: IdleState = {
    mode: 'idle',
    lastSimulatedTick: idle.lastSimulatedTick + ticksProcessed,
    totalIdleTicks: idle.totalIdleTicks + ticksProcessed,
  };

  const result: IdleTickResult = {
    ticksSimulated: ticksProcessed,
    resourcesGained,
    practicesAdvanced,
    eventsTriggered,
    endingTriggered,
  };

  const stamped = stampIdleResidue(
    current,
    state.resources,
    idle.lastSimulatedTick + ticksProcessed,
    result,
  );
  return { state: stamped, idle: newIdle, result };
}

/**
 * One aggregated residue event per practice that moved, plus level-ups and
 * resources that *became* zero this batch. Compact enough for a compiler.
 */
function stampIdleResidue(
  state: LifeState,
  resourcesBefore: Record<string, number>,
  tick: bigint,
  result: IdleTickResult,
): LifeState {
  const tickNumber = Number(tick);
  const extra: ResidueEvent[] = [];
  for (const row of result.practicesAdvanced) {
    if (row.progressGained > 0) {
      extra.push({
        tick: tickNumber,
        type: 'practice_tick',
        ids: [row.id],
        numbers: { progress: row.progressGained },
      });
    }
    if (row.leveledUp) {
      extra.push({
        tick: tickNumber,
        type: 'practice_level',
        ids: [row.id],
        numbers: {},
      });
    }
  }
  for (const key of Object.keys(state.resources)) {
    const before = resourcesBefore[key] ?? 0;
    const after = state.resources[key] ?? 0;
    if (before > 0 && after === 0) {
      extra.push({
        tick: tickNumber,
        type: 'resource_edge',
        ids: [key],
        numbers: { value: 0 },
      });
    }
  }
  if (result.endingTriggered !== null) {
    extra.push({
      tick: tickNumber,
      type: 'life_ended',
      ids: [result.endingTriggered],
      numbers: {},
    });
  }
  if (extra.length === 0) {
    return state;
  }
  let log = residueLog(state);
  for (const event of extra) {
    log = appendResidue(log, event);
  }
  return { ...state, residue: log };
}

/** Action payload for the IDLE_TICK reducer case. */
export interface IdleTickAction {
  readonly type: 'IDLE_TICK';
  readonly ticks: bigint;
  readonly schedule: DailySchedule;
  readonly practices: readonly Practice[];
  readonly endings: readonly Ending[];
  readonly rng: Rng;
}

/**
 * Reduce an {@link IdleTickAction}: delegate to {@link simulateIdleTicks} and
 * return the new LifeState + IdleState + result. This is the dispatch entry
 * point the UI layer calls to advance idle time.
 */
export function reduceIdleTick(
  state: LifeState,
  idle: IdleState,
  action: IdleTickAction,
): { state: LifeState; idle: IdleState; result: IdleTickResult } {
  return simulateIdleTicks(
    state,
    idle,
    action.schedule,
    action.practices,
    action.ticks,
    action.endings,
    action.rng,
  );
}
