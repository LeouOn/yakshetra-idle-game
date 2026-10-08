// Cook-group planning — the pure model behind the cook panel's chip groups
// and quick-picks (docs/design/00-direction.md, lane B round 2). Traces are
// grouped by their id tuple (identical traces merge: "alms round x6"); a
// cook plan spends a COUNT of each group. Reachable kinds are searched at
// group granularity so the panel can say "these traces can become: a person,
// a place" without enumerating chip subsets. Pure: no Date, no RNG, no I/O.

import { DEFAULT_KIND_RULES, previewKind, type KindRule } from './kind-registry';
import { summarizeResidue, type ResidueEvent } from './residue';

/** One group of interchangeable pending traces: same type AND id tuple.
 * Type matters because the registry's `dominantType` resolves by type-order
 * priority (residue.ts TYPE_ORDER), not by count — a single practice_level
 * fused into a practice_tick group would steer every subset to `change`. */
export interface CookGroup {
  /** Stable key: `type` + the trace's id tuple. */
  readonly key: string;
  /** Absolute residue indices in this group, ascending. */
  readonly indices: readonly number[];
  readonly events: readonly ResidueEvent[];
}

/** Group pending traces by type + id tuple, in first-appearance order. */
export function groupTraces(chips: readonly { index: number; event: ResidueEvent }[]): CookGroup[] {
  const order: string[] = [];
  const byKey = new Map<string, { indices: number[]; events: ResidueEvent[] }>();
  for (const chip of chips) {
    const key = `${chip.event.type}|${chip.event.ids.join('|')}`;
    let bucket = byKey.get(key);
    if (bucket === undefined) {
      bucket = { indices: [], events: [] };
      byKey.set(key, bucket);
      order.push(key);
    }
    bucket.indices.push(chip.index);
    bucket.events.push(chip.event);
  }
  return order.map((key) => {
    const bucket = byKey.get(key);
    // Buckets are created above for every key in `order`.
    const filled = bucket ?? { indices: [], events: [] };
    return { key, indices: filled.indices, events: filled.events };
  });
}

/** Spend counts per group key. Absent key = spend the whole group. */
export type SpendCounts = Readonly<Record<string, number>>;

/** Absolute indices a plan spends: each group's first `count` indices. */
export function spentIndices(groups: readonly CookGroup[], counts: SpendCounts): number[] {
  const out: number[] = [];
  for (const group of groups) {
    const count = counts[group.key] ?? group.indices.length;
    for (let i = 0; i < Math.min(count, group.indices.length); i += 1) {
      const index = group.indices[i];
      if (index !== undefined) {
        out.push(index);
      }
    }
  }
  return out;
}

/** Events a plan spends (for kind preview and the window itself). */
export function spentEvents(groups: readonly CookGroup[], counts: SpendCounts): ResidueEvent[] {
  const out: ResidueEvent[] = [];
  for (const group of groups) {
    const count = counts[group.key] ?? group.indices.length;
    for (let i = 0; i < Math.min(count, group.events.length); i += 1) {
      const event = group.events[i];
      if (event !== undefined) {
        out.push(event);
      }
    }
  }
  return out;
}

/** First-match kind of a plan, or null (total version of the registry pick). */
export function previewOf(groups: readonly CookGroup[], counts: SpendCounts): string | null {
  return previewKind(summarizeResidue(spentEvents(groups, counts)), DEFAULT_KIND_RULES);
}

/** A kind the pending pile can make, with the leanest plan that makes it. */
export interface ReachableKind {
  readonly kind: string;
  /** Spend counts per group key for a minimal plan previewing as `kind`. */
  readonly counts: SpendCounts;
  /** How many traces the plan spends. */
  readonly spent: number;
}

/**
 * Every kind some legal subset of the pile can become (group granularity,
 * whole-group spends, total spend at least `gate`). Ranked by leanest plan:
 * fewest groups spent, then fewest traces, then group order. Never returns a
 * kind the pile cannot make; an empty pile returns nothing.
 */
export function reachableKinds(
  groups: readonly CookGroup[],
  gate: number,
  rules: readonly KindRule[] = DEFAULT_KIND_RULES,
): readonly ReachableKind[] {
  if (groups.length === 0) {
    return [];
  }
  const sizes = groups.map((group) => group.events.length);
  const total = sizes.reduce((sum, n) => sum + n, 0);
  if (total < gate) {
    return [];
  }
  const found = new Map<string, ReachableKind>();
  // Enumeration cap (wave-1 review #2): a long life easily carries 20+
  // distinct trace kinds, and `1 << count` goes negative at 31+. The 11
  // LARGEST groups stay individual; every smaller group merges into one
  // "small traces" bucket that plans spend whole. Disclosure: a kind whose
  // only plans require splitting the small groups (spend some, hold some)
  // can drop off the quick-picks — the steppers still allow that shape by
  // hand, and the live preview always tells the truth.
  const MAX_PLAN_GROUPS = 12;
  let planGroups = groups;
  let mergedSmall: readonly CookGroup[] = [];
  if (groups.length > MAX_PLAN_GROUPS) {
    const sorted = [...groups].sort((a, b) => b.events.length - a.events.length);
    const keep = sorted.slice(0, MAX_PLAN_GROUPS - 1);
    mergedSmall = sorted.slice(MAX_PLAN_GROUPS - 1);
    planGroups = [
      ...keep,
      {
        key: 'merged:small-traces',
        indices: mergedSmall.flatMap((group) => group.indices),
        events: mergedSmall.flatMap((group) => group.events),
      },
    ];
  }
  const count = planGroups.length;
  for (let mask = 1; mask < 2 ** count; mask += 1) {
    const counts: Record<string, number> = {};
    // Every group starts at zero; included groups spend in full. (An absent
    // key means "spend everything" to spentEvents, so exclusion must be
    // explicit.)
    for (const group of groups) {
      counts[group.key] = 0;
    }
    let spent = 0;
    for (let g = 0; g < count; g += 1) {
      if ((mask & (1 << g)) !== 0) {
        const group = planGroups[g];
        if (group === undefined) {
          continue;
        }
        // Plans are expressed over REAL group keys: spending the merged
        // bucket spends every small group it stands for, so applying a plan
        // through the steppers does exactly what was previewed.
        if (group.key === 'merged:small-traces') {
          for (const small of mergedSmall) {
            counts[small.key] = small.events.length;
          }
        } else {
          counts[group.key] = group.events.length;
        }
        spent += group.events.length;
      }
    }
    if (spent < gate) {
      continue;
    }
    const kind = previewKind(summarizeResidue(spentEvents(groups, counts)), rules);
    if (kind === null) {
      continue;
    }
    // Rank by groups actually SPENT (zeros are explicit exclusions, not spend).
    const groupCount = groups.filter((group) => (counts[group.key] ?? 0) > 0).length;
    const best = found.get(kind);
    const bestGroups =
      best === undefined
        ? Number.MAX_SAFE_INTEGER
        : groups.filter((group) => (best.counts[group.key] ?? 0) > 0).length;
    if (
      best === undefined ||
      groupCount < bestGroups ||
      (groupCount === bestGroups && spent < best.spent)
    ) {
      found.set(kind, { kind, counts, spent });
    }
  }
  return [...found.values()].sort(
    (a, b) =>
      groups.filter((g) => (a.counts[g.key] ?? 0) > 0).length -
        groups.filter((g) => (b.counts[g.key] ?? 0) > 0).length || a.spent - b.spent,
  );
}
