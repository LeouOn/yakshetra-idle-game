// Compile + discrimination + purity-fence tests for the pure minigames types.
// (1) public types compile when used as documented; (2) MinigameState narrows
// on `state.type`, surfacing variant-specific fields with no cast; (3) package
// source has no wall-clock / global-RNG / platform tokens (mirrors engine's
// modularity test).

import { describe, expect, expectTypeOf, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import type {
  AllocationState,
  BreathCountState,
  MinigameInput,
  MinigamePhase,
  MinigameResult,
  MinigameState,
  MinigameStateBase,
  ReflectionState,
  RhythmState,
  TraceState,
  WalkingState,
} from '../';

// Compile-correctness fixtures: one valid instance per variant. A mistyped or
// missing field fails `tsc --noEmit` before vitest ever runs.
const base = { id: 'mg-session-1', phase: 'playing' as MinigamePhase, tick: 0 };

const breath: BreathCountState = {
  ...base,
  type: 'breath_count',
  count: 7,
  lapses: 1,
  cycles: 2,
  inputsUsed: 8,
};
const rhythm: RhythmState = { ...base, type: 'rhythm', hits: [10, 20, 31], nextBeatIndex: 3 };
const trace: TraceState = { ...base, type: 'trace', strokes: [95, 88, 76], nextStrokeIndex: 3 };
const allocation: AllocationState = {
  ...base,
  type: 'allocation',
  allocations: { time: 2, energy: 3 },
  submitted: false,
};
const reflection: ReflectionState = {
  ...base,
  type: 'reflection',
  currentNodeId: 'node-root',
  insightsCollected: ['insight-a'],
  path: ['node-root'],
};
const walking: WalkingState = { ...base, type: 'walking', steps: [100, 102, 105] };

const allStates: readonly MinigameState[] = [
  breath,
  rhythm,
  trace,
  allocation,
  reflection,
  walking,
];

describe('minigames types compile correctly', () => {
  it('every state variant is assignable to MinigameState', () => {
    expectTypeOf<BreathCountState>().toMatchTypeOf<MinigameState>();
    expectTypeOf<RhythmState>().toMatchTypeOf<MinigameState>();
    expectTypeOf<TraceState>().toMatchTypeOf<MinigameState>();
    expectTypeOf<AllocationState>().toMatchTypeOf<MinigameState>();
    expectTypeOf<ReflectionState>().toMatchTypeOf<MinigameState>();
    expectTypeOf<WalkingState>().toMatchTypeOf<MinigameState>();
    expect(allStates).toHaveLength(6);
  });

  it('MinigameStateBase is the structural common ancestor', () => {
    expectTypeOf<MinigameState>().toMatchTypeOf<MinigameStateBase>();
    expectTypeOf<MinigameStateBase['id']>().toEqualTypeOf<string>();
    expectTypeOf<MinigameStateBase['phase']>().toEqualTypeOf<MinigamePhase>();
    expectTypeOf<MinigameStateBase['tick']>().toEqualTypeOf<number>();
  });

  it('MinigamePhase is the closed four-value union', () => {
    expectTypeOf<MinigamePhase>().toEqualTypeOf<'intro' | 'playing' | 'resolved' | 'aborted'>();
  });

  it('every input variant is assignable to MinigameInput', () => {
    const inputs: MinigameInput[] = [
      { type: 'START' },
      { type: 'ABORT' },
      { type: 'TICK', dt: 16 },
      { type: 'COUNT' },
      { type: 'LAPSE' },
      { type: 'TAP', nowTick: 40 },
      { type: 'STEP', nowTick: 41 },
      { type: 'STROKE', index: 2, accuracy: 0.9 },
      { type: 'ALLOCATE', allocations: { time: 1 } },
      { type: 'CHOOSE', nodeId: 'n1', optionId: 'o1' },
    ];
    expect(inputs).toHaveLength(10);
  });

  it('MinigameResult has the documented required fields', () => {
    const result: MinigameResult = {
      score: 42,
      tierIndex: 1,
      rewards: [{ op: 'add_resource', key: 'trust', delta: 5 }],
      summary_sid: 'mg.summary.breath',
    };
    expectTypeOf<MinigameResult['score']>().toEqualTypeOf<number>();
    expectTypeOf<MinigameResult['tierIndex']>().toEqualTypeOf<number>();
    expect(result.rewards).toHaveLength(1);
  });
});

// Switch over the discriminant touching one variant-specific field per branch.
// If narrowing broke, the field accesses below would be compile errors.
function variantMarker(state: MinigameState): string {
  switch (state.type) {
    case 'breath_count':
      return `bc:${state.count}:${state.lapses}`;
    case 'rhythm':
      return `rh:${state.nextBeatIndex}`;
    case 'trace':
      return `tr:${state.nextStrokeIndex}`;
    case 'allocation':
      return `al:${state.submitted ? 1 : 0}`;
    case 'reflection':
      return `rf:${state.currentNodeId}`;
    case 'walking':
      return `wk:${state.steps.length}`;
  }
}

describe('MinigameState is properly discriminated', () => {
  it('each variant narrows to its own branch and yields a distinct marker', () => {
    const markers = allStates.map((s) => variantMarker(s));
    expect(new Set(markers).size).toBe(6); // all six discriminants fire once
    expect(variantMarker(breath)).toBe('bc:7:1');
    expect(variantMarker(rhythm)).toBe('rh:3');
    expect(variantMarker(trace)).toBe('tr:3');
    expect(variantMarker(allocation)).toBe('al:0');
    expect(variantMarker(reflection)).toBe('rf:node-root');
    expect(variantMarker(walking)).toBe('wk:3');
  });

  it('two states that differ only in discriminant are distinguishable', () => {
    // Same id/phase/tick, different `type` -> different markers, proving the
    // discriminant (not some shared field) drives the narrowing.
    const a: MinigameState = {
      ...base,
      type: 'breath_count',
      count: 0,
      lapses: 0,
      cycles: 0,
      inputsUsed: 0,
    };
    const b: MinigameState = { ...base, type: 'walking', steps: [] };
    expect(variantMarker(a)).not.toBe(variantMarker(b));
    expect(variantMarker(a)).toBe('bc:0:0');
    expect(variantMarker(b)).toBe('wk:0');
  });

  it('the `type` discriminant is one of the six MinigameType literals', () => {
    const allowed = new Set<MinigameState['type']>([
      'breath_count',
      'rhythm',
      'trace',
      'allocation',
      'reflection',
      'walking',
    ]);
    for (const s of allStates) expect(allowed.has(s.type)).toBe(true);
  });
});

// Purity fence: forbidden platform tokens that must never appear in package src.
const FORBIDDEN_TOKENS = [
  'Date.now',
  'performance.now',
  'new Date(',
  'Math.random',
  'setTimeout',
  'setInterval',
  'requestAnimationFrame',
  'fetch(',
  'XMLHttpRequest',
  'localStorage',
] as const;

/** Walk `src/minigames/` (excluding __tests__) collecting non-test .ts text. */
function collectMinigamesSource(): string[] {
  const dir = join(process.cwd(), 'src', 'minigames');
  const out: string[] = [];
  const visit = (d: string): void => {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      if (statSync(full).isDirectory()) {
        if (entry !== '__tests__') visit(full);
        continue;
      }
      if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) {
        out.push(readFileSync(full, 'utf8'));
      }
    }
  };
  visit(dir);
  return out;
}

describe('minigames package purity fence', () => {
  it('no non-test source mentions a forbidden platform token', () => {
    const blob = collectMinigamesSource().join('\n');
    expect(blob.length).toBeGreaterThan(0); // non-vacuous walk
    expect(blob).toContain('MinigameState'); // real source was read
    for (const token of FORBIDDEN_TOKENS) expect(blob).not.toContain(token);
  });

  it('package.json allowlist permits only @yakshetra/engine and zod', () => {
    const pkgPath = join(process.cwd(), 'src', 'minigames', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
      dependencies?: Record<string, string>;
    };
    const deps = Object.keys(pkg.dependencies ?? {}).sort();
    expect(deps).toEqual(['@yakshetra/engine', 'zod']);
    // The heavy platform stacks must be absent — the runtime-purity fence the
    // engine package also relies on (type-only imports are erased, not deps).
    for (const banned of ['react', 'react-native', 'expo']) {
      expect(deps).not.toContain(banned);
    }
  });
});
