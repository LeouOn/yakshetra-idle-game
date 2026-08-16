// Pinned person or place — the next working is about this card.

import type { Manifest } from './manifest';

export interface ManifestFocus {
  readonly id: string;
  readonly name: string;
  readonly kind: 'person' | 'place';
  readonly one_liner: string;
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
  };
}

export function pinnableCards(archive: readonly Manifest[]): readonly Manifest[] {
  return archive.filter((card) => isPinnableKind(card.kind));
}

/** Toggle pin. Non-pinnable cards are ignored. */
export function nextPinned(current: ManifestFocus | null, card: Manifest): ManifestFocus | null {
  const focus = focusFromManifest(card);
  if (focus === null) {
    return current;
  }
  if (current !== null && current.id === focus.id) {
    return null;
  }
  return focus;
}
