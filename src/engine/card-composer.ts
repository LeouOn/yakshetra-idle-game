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
import { chooseFigureBody, figureTagOf } from './figure-memory';
import { briefScore } from './card-brief';
import { qualifier } from './card-qualifier';
import type { Rng } from './rng';
import type { ResidueSummary } from './residue';
import type { CardTemplate, CatalogEntry } from './table-catalog';

export { LONG_FIRE_POOL, RARE_POOL } from './card-pools';

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
  /** `detail` strings already printed for each figure id. The archive's own
   * `about_id`/`detail` pairs answer this; no persisted state. Optional so a
   * caller with no figure history keeps the old global-dedup path. */
  readonly figureUsage?: Readonly<Record<string, readonly string[]>>;
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
  // The row's own body joins the rotation only when it belongs to the era
  // reading it. Figure rows are authored in their Tang iconography; a Garden
  // life with era-scoped phrasings for that figure must not draw the Tang
  // scene as a "neutral" competitor (13.7% of Garden figure cards did).
  const rowBodyEligible = era !== 'fantasy';
  const candidates = [...eligible.map((t) => ({ t })), ...(rowBodyEligible ? [{ t: null }] : [])];
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
  // A figure has its OWN body history: prefer a body it has not printed yet,
  // then start a new hash-rotated cycle instead of always landing on body 0.
  const figureId = figureTagOf(entry);
  const figureBody =
    figureId === null
      ? undefined
      : chooseFigureBody(
          rotated,
          input.figureUsage?.[figureId] ?? [],
          (candidate) => draw(candidate.t).detail,
        );
  const chosen =
    figureId !== null
      ? (figureBody ?? top[0])
      : hasTitleHistory
        ? (freshTitle ?? unseenDetail ?? top[0])
        : (unseenDetail ?? top[0]);
  const winner = chosen?.t ?? null;
  return render(entry, winner, input, slots, qualifier(winner, entry, input, slots));
}
