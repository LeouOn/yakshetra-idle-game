// Internal life-signal analysis helpers for the cross-life echo reducer.
//
// These functions read a completed life's `intent_root_history` and `flags` and
// surface the raw signals (dominant tendency, pattern breaks, vows, unresolved
// attachments). The public `summarizeLife` / `mergeKarma` / `applyEchoesToNextLife`
// reducers live in `./echo` and compose these helpers.
//
// This module is an internal implementation detail: it is intentionally NOT
// re-exported from the engine barrel.

import type { Echo, IntentRoot, LifeId } from './types';

/** The closed set of intent roots, for exhaustive iteration. */
export const INTENT_ROOTS: readonly IntentRoot[] = ['care', 'greed', 'aversion', 'delusion'];

/** A zeroed intent-root tally. */
export function emptyIntentRoots(): Record<IntentRoot, number> {
  return { care: 0, greed: 0, aversion: 0, delusion: 0 };
}

/** Count each intent root in a history, returning a fresh tally. */
export function countIntentRoots(history: readonly IntentRoot[]): Record<IntentRoot, number> {
  const counts = emptyIntentRoots();
  for (const root of history) {
    counts[root] += 1;
  }
  return counts;
}

/** The dominant intent root and its share, when that share exceeds 0.4. */
export function detectDominantTendency(
  history: readonly IntentRoot[],
): { root: IntentRoot; share: number } | null {
  const total = history.length;
  if (total === 0) return null;
  const counts = countIntentRoots(history);
  let topRoot: IntentRoot | null = null;
  let topCount = -1;
  for (const root of INTENT_ROOTS) {
    if (counts[root] > topCount) {
      topRoot = root;
      topCount = counts[root];
    }
  }
  // INTENT_ROOTS is non-empty and counts[root] >= 0 > -1, so topRoot is set;
  // the guard exists for the compiler's control-flow narrowing only.
  if (topRoot === null) return null;
  const share = topCount / total;
  if (share <= 0.4) return null;
  return { root: topRoot, share };
}

/**
 * Detect a pattern_break: a sustained run of care (>= 5 consecutive turns)
 * that begins only AFTER the history has already seen aversion.
 */
export function detectPatternBreak(history: readonly IntentRoot[]): boolean {
  let seenAversion = false;
  let careRun = 0;
  for (const root of history) {
    if (root === 'aversion') {
      seenAversion = true;
      careRun = 0;
    } else if (root === 'care') {
      careRun += 1;
      if (seenAversion && careRun >= 5) return true;
    } else {
      careRun = 0;
    }
  }
  return false;
}

/** Parse a `vow:<name>[:<state>]` flag into a name + lifecycle state. */
function parseVowFlag(
  flag: string,
): { name: string; state: 'kept' | 'broken' | 'declared' } | null {
  const rest = flag.slice('vow:'.length);
  if (rest.length === 0) return null;
  const segments = rest.split(':');
  const name = segments[0];
  if (name === undefined || name.length === 0) return null;
  const stateRaw = segments[1];
  if (stateRaw === 'broken') return { name, state: 'broken' };
  if (stateRaw === 'kept') return { name, state: 'kept' };
  return { name, state: 'declared' };
}

/** Scan flags for vows, returning the vows map plus one echo per distinct vow. */
export function scanVows(
  flags: ReadonlySet<string>,
  lifeId: LifeId,
): { vows: Record<string, 'kept' | 'broken' | 'declared'>; echoes: Echo[] } {
  const order: string[] = [];
  const states = new Map<string, 'kept' | 'broken' | 'declared'>();
  for (const flag of flags) {
    if (!flag.startsWith('vow:')) continue;
    const parsed = parseVowFlag(flag);
    if (parsed === null) continue;
    if (!states.has(parsed.name)) order.push(parsed.name);
    states.set(parsed.name, parsed.state);
  }
  const vows: Record<string, 'kept' | 'broken' | 'declared'> = {};
  const echoes: Echo[] = [];
  for (const name of order) {
    const state = states.get(name) ?? 'declared';
    vows[name] = state;
    echoes.push({
      type: 'vow',
      key: name,
      weight: state === 'broken' ? -0.6 : state === 'kept' ? 0.5 : 0.2,
      source_life_id: lifeId,
      narrative_sid: `echo:vow:${name}:${state}`,
    });
  }
  return { vows, echoes };
}

/** Scan flags for open (uncleared) attachments, returning one echo each. */
export function scanAttachments(flags: ReadonlySet<string>, lifeId: LifeId): Echo[] {
  const cleared = new Set<string>();
  const subjects: string[] = [];
  for (const flag of flags) {
    if (!flag.startsWith('attachment:')) continue;
    const rest = flag.slice('attachment:'.length);
    const segments = rest.split(':');
    const subject = segments[0];
    if (subject === undefined || subject.length === 0) continue;
    if (segments[1] === 'cleared') {
      cleared.add(subject);
    } else {
      subjects.push(subject);
    }
  }
  const seen = new Set<string>();
  const echoes: Echo[] = [];
  for (const subject of subjects) {
    if (cleared.has(subject) || seen.has(subject)) continue;
    seen.add(subject);
    echoes.push({
      type: 'unresolved_attachment',
      key: subject,
      weight: -0.4,
      source_life_id: lifeId,
      narrative_sid: `echo:attachment:${subject}`,
    });
  }
  return echoes;
}

/** Keep the strongest `limit` echoes by absolute weight (stable, deterministic). */
export function capEchoes(echoes: readonly Echo[], limit: number): Echo[] {
  return echoes
    .slice()
    .sort(
      (a, b) =>
        Math.abs(b.weight) - Math.abs(a.weight) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0),
    )
    .slice(0, limit);
}
