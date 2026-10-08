// Pinned person or place — the next working is about this card.
// Wave 3: a pin can be a PAIR (a primary plus one more card). Pinning is
// how a player aims a sought encounter: two cards plus the right window
// summon a named figure no generic pool can serve.

import type { Manifest } from './manifest';

export interface ManifestFocus {
  readonly id: string;
  readonly name: string;
  readonly kind: 'person' | 'place';
  readonly one_liner: string;
  /** Card tags, carried for era-neutral recipe matchers. */
  readonly tags?: readonly string[] | undefined;
  /** The second pinned card (a pair). Absent on old saves. */
  readonly second?: ManifestFocus | undefined;
}

export function isPinnableKind(kind: string): kind is 'person' | 'place' {
  return kind === 'person' || kind === 'place';
}

export function focusFromManifest(card: Manifest): ManifestFocus | null {
  if (!isPinnableKind(card.kind)) {
    return null;
  }
  return {
    id: card.id,
    name: card.name,
    kind: card.kind,
    one_liner: card.one_liner,
    ...(card.tags.length === 0 ? {} : { tags: card.tags }),
  };
}

export function pinnableCards(archive: readonly Manifest[]): readonly Manifest[] {
  return archive.filter((card) => isPinnableKind(card.kind));
}

/** The pinned cards as a flat list: primary first, second if present. */
export function pinnedCards(focus: ManifestFocus | null): readonly ManifestFocus[] {
  if (focus === null) {
    return [];
  }
  return focus.second === undefined ? [focus] : [focus, focus.second];
}

/**
 * Pin toggle with pair semantics. Pinning a held card unpins it (unpinning
 * the primary promotes the second); a third pin replaces the second slot.
 * Pure: same inputs, same focus out. Non-pinnable cards are ignored.
 */
export function nextPinned(current: ManifestFocus | null, card: Manifest): ManifestFocus | null {
  const focus = focusFromManifest(card);
  if (focus === null) {
    return current;
  }
  if (current === null) {
    return focus;
  }
  if (current.id === focus.id) {
    return current.second ?? null;
  }
  if (current.second !== undefined && current.second.id === focus.id) {
    const { second, ...rest } = current;
    void second;
    return rest;
  }
  return { ...current, second: focus };
}
