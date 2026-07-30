/**
 * Pure minigame runtime types.
 *
 * No wall-clock, no platform APIs. All timing uses virtual ticks
 * (caller-supplied integers). This file holds TYPE DEFINITIONS ONLY — there
 * is no runtime code here, so there is no opportunity for a global-RNG or
 * clock read to leak in.
 *
 * Dependency direction: the only imports are TYPE-ONLY (`import type`), which
 * are erased at compile time and create zero runtime coupling. This mirrors
 * the engine package, which type-only imports the content schema without
 * declaring a runtime dependency on content. The runtime-purity fence is the
 * `package.json` allowlist (only `@yakshetra/engine` + `zod`); the content
 * import exists purely so `MinigameType` has one canonical source of truth.
 */

import type { EffectOp } from '@/engine';
import type { MinigameType } from '@/content/minigame-schema';

/** Phase of a minigame session. */
export type MinigamePhase = 'intro' | 'playing' | 'resolved' | 'aborted';

/** Base state shared by all minigame types. */
export interface MinigameStateBase {
  readonly id: string;
  readonly type: MinigameType;
  readonly phase: MinigamePhase;
  readonly tick: number;
}

/** Per-type state interfaces. */
export interface BreathCountState extends MinigameStateBase {
  readonly type: 'breath_count';
  readonly count: number;
  readonly lapses: number;
  readonly cycles: number;
  readonly inputsUsed: number;
}

export interface RhythmState extends MinigameStateBase {
  readonly type: 'rhythm';
  readonly hits: readonly number[];
  readonly nextBeatIndex: number;
}

export interface TraceState extends MinigameStateBase {
  readonly type: 'trace';
  readonly strokes: readonly number[];
  readonly nextStrokeIndex: number;
}

export interface AllocationState extends MinigameStateBase {
  readonly type: 'allocation';
  readonly allocations: Readonly<Record<string, number>>;
  readonly submitted: boolean;
}

export interface ReflectionState extends MinigameStateBase {
  readonly type: 'reflection';
  readonly currentNodeId: string;
  readonly insightsCollected: readonly string[];
  readonly path: readonly string[];
}

export interface WalkingState extends MinigameStateBase {
  readonly type: 'walking';
  readonly steps: readonly number[];
}

/** Discriminated union of all minigame states. */
export type MinigameState =
  BreathCountState | RhythmState | TraceState | AllocationState | ReflectionState | WalkingState;

/** Input events that drive minigame state transitions. */
export type MinigameInput =
  | { type: 'START' }
  | { type: 'ABORT' }
  | { type: 'TICK'; dt: number }
  | { type: 'COUNT' }
  | { type: 'LAPSE' }
  | { type: 'TAP'; nowTick: number }
  | { type: 'STEP'; nowTick: number }
  | { type: 'STROKE'; index: number; accuracy: number }
  | { type: 'ALLOCATE'; allocations: Record<string, number> }
  | { type: 'CHOOSE'; nodeId: string; optionId: string };

/** Result of a completed minigame. */
export interface MinigameResult {
  readonly score: number;
  readonly tierIndex: number;
  readonly rewards: readonly EffectOp[];
  readonly summary_sid: string;
}
