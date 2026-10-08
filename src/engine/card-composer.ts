// Card composer — the bench writes from the life (docs/design/00-direction.md A).
//
// A catalog row is the floor, not the ceiling. `composeCard` lets a row carry
// `templates`: phrasings whose `{{slots}}` are filled from the window that
// actually produced the card — the hour, the era and role, the dominant
// practice, the strongest tie, the brief, the pin. Two harvests from one row
// therefore do not read alike, and a row with no templates still returns its
// verbatim copy, so tables always work.
//
// Pure: no Date, no Math.random, no I/O. Entropy arrives as an `Rng`, time as
// a `LifeContext`. Slot vocabulary lives in ./card-slots.

import { buildSlots, fillSlots, trimmedBrief, type SlotSource } from './card-slots';
import { normalizeProse } from './prose-normalize';
import type { ManifestFocus } from './focus';
import type { LifeContext } from './life-context';
import { atLeastRarity, type CatalogEra, type ManifestRarity } from './manifest-pick';
import type { Rng } from './rng';
import type { ResidueSummary } from './residue';
import type { CardTemplate, CatalogEntry } from './table-catalog';

export interface ComposeInput extends SlotSource {
  readonly summary: ResidueSummary;
  readonly lifeContext: LifeContext | null;
  readonly focus: ManifestFocus | null;
  readonly brief: string | null;
  readonly rarity: ManifestRarity;
  readonly qualityTier: number;
  readonly fire: 'short' | 'long';
  /** `detail` strings already in the archive; a fresh card is preferred. */
  readonly usedDetails: readonly string[];
  /**
   * `name + one_liner` pairs already in the archive. Titles are what the player
   * recognises across consecutive cards, so repeat avoidance checks them
   * directly rather than inferring variety from differing detail strings.
   */
  readonly usedTitles: readonly string[];
  readonly rng: Rng;
}

export interface ComposedCard {
  readonly name: string;
  readonly one_liner: string;
  readonly subject: string;
  readonly detail: string;
  readonly tags: readonly string[];
}

/**
 * Fallbacks for rows that have not authored their own long-fire or rare
 * sentence. At least six each, so seeded rotation spreads them, and none of
 * them may name a mechanic (see the banlist in docs/design/card-template-guide.md).
 *
 * Exported so the test suite can hold the shared pools to the same standard as
 * the authored rows: these lines are read just as often, because every row
 * without its own line lands here.
 */
export const LONG_FIRE_POOL: readonly string[] = [
  ' It was not hurried, and it shows.',
  ' Whatever else you did that day, this was the part you let run long.',
  ' It has the settled look of something given twice the attention it asked for.',
  ' You stopped early the second time round, which was the point of stopping.',
  ' It carries the extra hour like a change in the weather.',
  ' Nothing about it was rushed, and you can tell.',
];

export const RARE_POOL: readonly string[] = [
  ' It does not come like this often.',
  ' There is no second one of these on the shelf.',
  ' You would remember the day you found it.',
  ' It is the kind of thing that gets lent out once.',
  ' You keep it where you can see it, which is not your habit.',
  ' Whoever made it did not expect it to be kept.',
];

/** How many brief words a template's own copy already answers. */
function briefScore(template: CardTemplate | null, brief: string | null): number {
  if (brief === null) {
    return 0;
  }
  const words = brief
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);
  if (words.length === 0) {
    return 0;
  }
  // The row's own detail is a candidate like any template (see composeCard), so
  // a brief that names the row's own subject has to be able to score it.
  const haystack = `${template?.detail ?? ''} ${(template?.tags ?? []).join(' ')}`.toLowerCase();
  let hits = 0;
  for (const word of words) {
    if (haystack.includes(word)) {
      hits += 1;
    }
  }
  return hits;
}

/**
 * The extra sentence a long cook or a rare card earns. A row's own sentence
 * wins; otherwise the shared pool, picked by the same seeded rng the template
 * rotation uses.
 *
 * Returned as a value rather than drawn inside render(): render is called once
 * per *candidate* while the dedup pass compares templates, and a draw inside it
 * would advance the stream on every comparison, so the same candidate would
 * render differently each time it was inspected.
 */
function qualifier(
  template: CardTemplate | null,
  entry: CatalogEntry,
  input: ComposeInput,
  slots: Readonly<Record<string, string>>,
): string {
  // A template that names a different object overrides the row's sentence; see
  // CardTemplate.long_fire.
  const owned =
    input.fire === 'long'
      ? (template?.long_fire ?? entry.long_fire)
      : input.rarity === 'rare'
        ? (template?.rare ?? entry.rare)
        : undefined;
  if (owned !== undefined) {
    // A clause that cannot be filled is DROPPED, not printed raw. The old
    // `?? owned` fallback emitted the authored source, so a `{{tie}}` in a
    // long_fire reached the player as "whatever else {{tie}} keeps quiet
    // about" on every life that had no tie to name. Eligibility only ever
    // checked `detail`, so nothing caught it.
    return fillSlots(owned, slots) ?? '';
  }
  if (input.fire !== 'long' && input.rarity !== 'rare') {
    return '';
  }
  const pool = input.fire === 'long' ? LONG_FIRE_POOL : RARE_POOL;
  return pool[input.rng.nextInt(0, pool.length)] ?? '';
}

function render(
  entry: CatalogEntry,
  template: CardTemplate | null,
  input: ComposeInput,
  slots: Readonly<Record<string, string>>,
  notes: string,
): ComposedCard {
  const pick = (field: 'name' | 'one_liner' | 'subject' | 'detail'): string => {
    if (template !== null) {
      const filled = fillSlots(template[field] ?? '', slots);
      if (filled !== null && filled.length > 0) {
        return filled;
      }
    }
    return entry[field];
  };
  // Same rule as the qualifier: an unfillable flourish is dropped, never
  // printed as source. Dropping costs a rare card its flourish; printing the
  // raw string costs the player their trust in the text.
  const flourish =
    input.rarity === 'rare' && template?.flourish !== undefined
      ? (() => {
          const filled = fillSlots(template.flourish, slots);
          return filled === null || filled.length === 0 ? '' : ` ${filled}`;
        })()
      : '';
  // Everything the player reads goes through the normalizer. The authored copy
  // is held to the same standard by tests, but the composer is the layer that
  // glues machine-chosen phrases into human-written frames, so it is the layer
  // that cleans up after itself. See src/engine/prose-normalize.ts.
  return {
    name: normalizeProse(pick('name')),
    one_liner: normalizeProse(pick('one_liner')),
    subject: normalizeProse(pick('subject')),
    detail: normalizeProse(`${pick('detail')}${flourish}${notes}`),
    tags: [...(template?.tags ?? []), ...(template?.gate === undefined ? [] : [template.gate])],
  };
}

/**
 * Which era family a life is in, read from the era id. The display name alone
 * cannot answer this: it is content, and packs are free to rename themselves.
 * A life with no era (an old save, a bare test) is era-neutral, which matches
 * the era-neutral templates.
 *
 * `null` means "not one of ours", and callers treat that as era-neutral rather
 * than guessing. Guessing would be worse than abstaining: a mis-guess silently
 * removes half the catalog, while an abstention only loses the era separation.
 */
export function eraFamilyOf(eraId: string | undefined): CatalogEra | null {
  if (eraId === undefined) {
    return null;
  }
  const lower = eraId.toLowerCase();
  if (lower.includes('tang')) {
    return 'tang';
  }
  return lower.includes('mahayana') || lower.includes('fantasy') ? 'fantasy' : null;
}

/**
 * Compose one card from a catalog row.
 *
 * Selection order: templates whose rarity gate the roll satisfies, whose era
 * matches the life (or which are era-neutral), and whose slots this window can
 * fill, narrowed to the ones the brief's own words best answer, then rotated by
 * the seeded rng, then the first whose detail is not already in the archive.
 * With no brief every score is equal, so the rotation alone decides — that is
 * where repeat-session variety comes from.
 */
export function composeCard(entry: CatalogEntry, input: ComposeInput): ComposedCard {
  const slots = buildSlots(input);
  const era = eraFamilyOf(input.lifeContext?.setting.era_id);
  const usable = (entry.templates ?? []).filter(
    (t) =>
      (t.gate === undefined || atLeastRarity(input.rarity, t.gate)) &&
      fillSlots(t.detail, slots) !== null,
  );
  // An era's own phrasings take the whole field rather than competing with the
  // era-neutral ones. Letting both sit in one rotation meant the neutral
  // template won the same seeded index in both eras, and Tang and Fantasy came
  // out byte-identical again — the same defect b1 reported, one layer down.
  const eraScoped = era === null ? [] : usable.filter((t) => t.era === era);
  const eligible = eraScoped.length > 0 ? eraScoped : usable.filter((t) => t.era === undefined);
  // Once per card, not once per candidate: see qualifier().
  // The qualifier is chosen for the *winning* template only, after the dedup
  // pass. Candidates are compared on their own prose; a per-candidate draw
  // would advance the stream once per comparison and render the same candidate
  // differently each time it was inspected.
  const draw = (t: CardTemplate | null): ComposedCard => render(entry, t, input, slots, '');
  if (eligible.length === 0) {
    return draw(null);
  }
  const brief = trimmedBrief(input.brief);
  // The row's OWN copy is a candidate, not a fallback.
  //
  // It used to be reachable only when `eligible` was empty, so any row with
  // templates could never render its own title or detail: the figure card
  // always came out under a variant's title, and a long fire — which rolls
  // uncommon or better and so satisfies every gate — produced 0 of 300 cards
  // carrying the figure's own name. To a player that reads as "the figure is
  // not there", which is how a long fire came to look like it dropped every
  // named figure. The row is one of its own phrasings and belongs in the
  // rotation beside the variants.
  const candidates = [...eligible.map((t) => ({ t })), { t: null }];
  const ranked = candidates
    .map((t) => ({ ...t, score: briefScore(t.t, brief) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0]?.score ?? 0;
  const top = ranked.filter((r) => r.score === best);
  // A brief that actually matches a phrasing gets it, deterministically. The
  // seeded rotation only breaks ties among equally matching candidates, which
  // is what makes three different briefs over one window able to produce three
  // genuinely different cards instead of one card with a coin flip in it.
  const offset = best === 0 ? input.rng.nextInt(0, top.length) : 0;
  const rotated = [...top.slice(offset), ...top.slice(0, offset)];
  // Repeat avoidance is title-first, not detail-first. The lead read thirty
  // cards and found the same name and one_liner twice in a row with identical
  // prose; matching on `detail` alone hid that whenever a slot made two
  // renderings of the same title differ. A card is "new" when either its
  // detail or its title pair is unseen.
  const used = new Set(input.usedDetails);
  const unseenDetail = rotated.find((c) => !used.has(draw(c.t).detail));
  const hasTitleHistory = input.usedTitles.length > 0;
  // COMPACT: `usedTitles` is a list of card TITLES, and that is what every
  // production caller passes — `studio.archive.map((card) => card.name)`. It
  // was previously compared against a combined `name one_liner` key, which no
  // caller produces: the comparison was therefore always false, `freshTitle`
  // always won, and detail dedup never ran once the archive was non-empty. The
  // unit test hid this by hand-building the combined format.
  const heldTitles = new Set(input.usedTitles);
  const seenTitle = (t: { t: CardTemplate | null }): boolean => heldTitles.has(draw(t.t).name);
  // Order of preference, and why:
  //  - with title history, an unseen title beats an unseen detail, because the
  //    player recognises titles across consecutive cards and not details;
  //  - without title history there is nothing to prefer, and the detail check
  //    has to be the one that runs. (Treating "no history" as "every title is
  //    fresh" made freshTitle win outright and disabled detail dedup.)
  const freshTitle = hasTitleHistory ? rotated.find((c) => !seenTitle(c)) : undefined;
  const chosen = hasTitleHistory
    ? (freshTitle ?? unseenDetail ?? top[0])
    : (unseenDetail ?? top[0]);
  const winner = chosen?.t ?? null;
  return render(entry, winner, input, slots, qualifier(winner, entry, input, slots));
}
