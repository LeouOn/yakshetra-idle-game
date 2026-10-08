// Sought encounters — resolve a pinned pair + a compiled window into the
// named figure it summons (wave 3, engine half; recipes live in
// src/content/progression/base/encounters.json5). Pure: no Date, no RNG,
// no content imports — recipes and the family lookup arrive as arguments.
//
// Design fences held (SPEC §3, §10): figures act, they never preach or
// grade; no new currency; this is REACHABILITY for authored figure rows,
// not new rows (§10.15). Determinism: several matching recipes resolve to
// the lowest id.

import { previewKind, DEFAULT_KIND_RULES } from './kind-registry';
import type { ActivityFamily } from './activities';
import type { ManifestFocus } from './focus';
import type { ResidueSummary } from './residue';

/** What a recipe requires of one pinned card. Era-neutral: kinds and tags,
 * never pack ids. */
export interface EncounterPinNeed {
  readonly kind?: 'person' | 'place';
  readonly tag?: string;
}

/** What a recipe requires of the cooked window. `family` is the window's
 * dominant activity family; `kind` is the registry's compiled kind;
 * `min_count` is the window length. */
export interface EncounterWindowNeed {
  readonly family?: ActivityFamily;
  readonly kind?: string;
  readonly min_count?: number;
}

/** Structural engine view of one recipe row (the content schema stays in
 * src/content/progression/schema.ts; this is what the engine reads). */
export interface EncounterRecipe {
  readonly id: string;
  readonly figure_id: string;
  readonly needs: {
    readonly pinned: readonly EncounterPinNeed[];
    readonly window: EncounterWindowNeed;
  };
  readonly hint_sid: string;
}

/** A recipe that fired, for the fill's figure preference. */
export interface ResolvedEncounter {
  readonly id: string;
  readonly figureId: string;
}

function pinSatisfies(focus: ManifestFocus, need: EncounterPinNeed): boolean {
  if (need.kind !== undefined && focus.kind !== need.kind) {
    return false;
  }
  if (need.tag !== undefined && !(focus.tags ?? []).includes(need.tag)) {
    return false;
  }
  return true;
}

function pairSatisfies(
  pinned: readonly ManifestFocus[],
  needs: readonly EncounterPinNeed[],
): boolean {
  if (pinned.length < needs.length) {
    return false;
  }
  // Every need is met by some pinned card; one card may satisfy several
  // needs (a tagged place meeting both a place need and its tag need).
  return needs.every((need) => pinned.some((focus) => pinSatisfies(focus, need)));
}

/** The window's dominant activity family, or null on a tie / no practices.
 * `familyOf` maps a practice id to its family (the caller derives it from
 * the pack's practice lenses — the engine never loads content). */
export function dominantWindowFamily(
  summary: ResidueSummary,
  familyOf: (practiceId: string) => ActivityFamily | null,
): ActivityFamily | null {
  const counts = new Map<ActivityFamily, number>();
  for (const id of summary.ids) {
    const family = familyOf(id);
    if (family === null) {
      continue;
    }
    counts.set(family, (counts.get(family) ?? 0) + 1);
  }
  let best: ActivityFamily | null = null;
  let bestCount = 0;
  let tie = false;
  for (const [family, count] of counts) {
    if (count > bestCount) {
      best = family;
      bestCount = count;
      tie = false;
    } else if (count === bestCount && best !== null) {
      tie = true;
    }
  }
  return tie ? null : best;
}

function windowSatisfies(
  summary: ResidueSummary,
  need: EncounterWindowNeed,
  family: ActivityFamily | null,
): boolean {
  if (need.min_count !== undefined && summary.count < need.min_count) {
    return false;
  }
  if (need.family !== undefined && family !== need.family) {
    return false;
  }
  if (need.kind !== undefined && previewKind(summary, DEFAULT_KIND_RULES) !== need.kind) {
    return false;
  }
  return true;
}

/**
 * Resolve the encounter the pinned pair + window summon. Pure and
 * deterministic: several matching recipes resolve to the lowest id.
 * `pinned` is 0-2 focused cards; `familyOf` supplies the era's
 * practice-to-family mapping.
 */
export function resolveEncounter(
  pinned: readonly ManifestFocus[],
  summary: ResidueSummary,
  recipes: readonly EncounterRecipe[],
  familyOf: (practiceId: string) => ActivityFamily | null,
): ResolvedEncounter | null {
  const family = dominantWindowFamily(summary, familyOf);
  let best: EncounterRecipe | null = null;
  for (const recipe of recipes) {
    if (!pairSatisfies(pinned, recipe.needs.pinned)) {
      continue;
    }
    if (!windowSatisfies(summary, recipe.needs.window, family)) {
      continue;
    }
    if (best === null || recipe.id < best.id) {
      best = recipe;
    }
  }
  return best === null ? null : { id: best.id, figureId: best.figure_id };
}

/** One row of the "Sought" list the UI half renders. */
export interface SoughtEncounterRow {
  readonly id: string;
  readonly figureId: string;
  readonly discovered: boolean;
  readonly hintSid: string;
  /** Short shape name for the silhouette (the figure id's last segment). */
  readonly silhouette: string;
}

/** The selector the UI row consumes: every recipe, flagged discovered. */
export function soughtEncounters(
  recipes: readonly EncounterRecipe[],
  encounteredIds: readonly string[],
): readonly SoughtEncounterRow[];
export function soughtEncounters(
  session: { readonly encounters_done?: readonly string[] },
  recipes: readonly EncounterRecipe[],
): readonly SoughtEncounterRow[];
export function soughtEncounters(
  arg1: readonly EncounterRecipe[] | { readonly encounters_done?: readonly string[] },
  arg2?: readonly string[] | readonly EncounterRecipe[],
): readonly SoughtEncounterRow[] {
  if (Array.isArray(arg1)) {
    const recipes = arg1 as readonly EncounterRecipe[];
    const encounteredIds = (arg2 as readonly string[] | undefined) ?? [];
    const seen = new Set(encounteredIds);
    return recipes.map((recipe) => ({
      id: recipe.id,
      figureId: recipe.figure_id,
      discovered: seen.has(recipe.id),
      hintSid: recipe.hint_sid,
      silhouette: recipe.figure_id.split(':').pop() ?? recipe.figure_id,
    }));
  }
  const session = arg1 as { readonly encounters_done?: readonly string[] };
  const recipes = (arg2 as readonly EncounterRecipe[] | undefined) ?? [];
  const seen = new Set(session.encounters_done ?? []);
  return recipes.map((recipe) => ({
    id: recipe.id,
    figureId: recipe.figure_id,
    discovered: seen.has(recipe.id),
    hintSid: recipe.hint_sid,
    silhouette: recipe.figure_id.split(':').pop() ?? recipe.figure_id,
  }));
}
