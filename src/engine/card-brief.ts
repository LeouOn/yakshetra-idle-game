// Brief scoring — how well a template's own words answer the player's brief.
//
// Extracted from card-composer.ts to keep that file inside the engine budget.
// Pure: string work only.

import type { CardTemplate } from './table-catalog';

/** How many brief words a template's own copy already answers. */
export function briefScore(template: CardTemplate | null, brief: string | null): number {
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
