/**
 * Pure minigame scoring helpers.
 *
 * All functions here are deterministic and side-effect-free: no wall-clock,
 * no global RNG, no platform APIs (mirrors the runtime-purity fence enforced
 * across the `@yakshetra/minigames` package). They operate only on their
 * arguments so they can be unit-tested without any harness and replayed
 * deterministically from recorded inputs.
 *
 * The only import is TYPE-ONLY (`import type`), which is erased at compile
 * time and creates zero runtime coupling to the content package.
 */

import type { RewardTier } from '@/content/minigame-schema';

/** Clamp a number into the closed unit interval [0, 1]. Non-finite → 0. */
export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/** Arithmetic mean of a (possibly empty) numeric array. Empty → 0. */
export function mean(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  let sum = 0;
  for (const x of xs) sum += x;
  return sum / xs.length;
}

/**
 * Population variance of a numeric array. Empty → 0. A single element or a
 * constant array → 0. Uses the population (not sample) definition: the mean
 * of squared deviations, dividing by n rather than n-1.
 */
export function variance(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  const m = mean(xs);
  let sum = 0;
  for (const x of xs) {
    const d = x - m;
    sum += d * d;
  }
  return sum / xs.length;
}

/**
 * Timing accuracy for a single hit, in [0, 1].
 *
 * Returns 1 for an exact hit, 0 once the absolute miss reaches `window` or
 * beyond, and a linear ramp between. A non-positive window yields 0 (no hit
 * can lie inside a zero-width window).
 */
export function timingAccuracy(hitTick: number, targetTick: number, window: number): number {
  if (window <= 0) return 0;
  const delta = Math.abs(hitTick - targetTick);
  if (delta >= window) return 0;
  return 1 - delta / window;
}

/**
 * Fairness score for an allocation minigame, in [0, 100].
 *
 * Combines need coverage (how much of total need was satisfied, capped at each
 * recipient's need) with budget discipline (over-spend scales the score down
 * proportionally). Returns 0 when there is no budget or no recipient; returns
 * 100 when total need is zero (nothing is needed, so the allocation is trivially
 * fair). Per-recipient allocations are clamped at 0 from below and missing ids
 * count as 0.
 */
export function fairnessScore(
  allocations: Record<string, number>,
  recipients: readonly { id: string; need: number }[],
  budget: number,
): number {
  if (recipients.length === 0 || budget <= 0) return 0;
  let totalAllocated = 0,
    needSatisfied = 0,
    totalNeed = 0;
  for (const r of recipients) {
    const allocated = Math.max(0, allocations[r.id] ?? 0);
    totalAllocated += allocated;
    totalNeed += r.need;
    needSatisfied += Math.min(allocated, r.need);
  }
  if (totalNeed === 0) return 100;
  const coverage = needSatisfied / totalNeed;
  const withinBudget = totalAllocated <= budget ? 1 : budget / totalAllocated;
  return clamp01(coverage * withinBudget) * 100;
}

/**
 * Pick the highest reward tier whose inclusive lower bound `minScore` the
 * `score` reaches. Tiers are assumed sorted ascending by `minScore`; the last
 * tier whose threshold is met wins. Returns -1 when no tier is reached (or the
 * list is empty).
 */
export function pickRewardTier(tiers: readonly RewardTier[], score: number): number {
  let best = -1;
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    if (tier !== undefined && tier.minScore <= score) best = i;
  }
  return best;
}
