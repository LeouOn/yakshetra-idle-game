// The extra sentence a long cook or a rare card earns — extracted from
// card-composer.ts to keep that file inside the engine budget.
// Pure: fills a template's slots; no RNG of its own (the caller passes one).

import type { CardTemplate, CatalogEntry } from './table-catalog';
import { fillSlots } from './card-slots';
import { LONG_FIRE_POOL, RARE_POOL } from './card-pools';
import type { ComposeInput } from './card-composer';

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
export function qualifier(
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
