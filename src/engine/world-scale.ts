// World drafts at scale — one setting per tier scale.
//
// Person keeps assembleWorldDraft's exact rules over the person-scale cards
// (a place, or two people). Every other scale assembles once the archive
// holds at least two cards of that scale: the world is named after the
// first card and its one-liner comes from the second. Recording appends a
// scale reference at most once per archive (dedup by scale presence), so
// `world_drafts.<scale>` counts distinct recorded worlds. Deterministic:
// no rng. Pure: no Date, no network.

import { type Manifest, type ManifestScale } from './manifest';
import {
  WORLD_DRAFT_VERSION,
  WorldDraftSchema,
  assembleWorldDraft,
  type WorldDraft,
  type WorldDraftBond,
  type WorldDraftMember,
} from './world-draft';
import type { WorldDraftReference } from './studio-session';

function member(card: Manifest): WorldDraftMember {
  return { id: card.id, name: card.name, one_liner: card.one_liner };
}

/** Assemble the world draft of `scale` from the archive, or null when the
 * scale's cards do not meet its assembly rule. */
export function assembleWorldDraftAtScale(
  archive: readonly Manifest[],
  scale: ManifestScale,
): WorldDraft | null {
  const cards = archive.filter((card) => card.scale === scale);
  if (scale === 'person') {
    return assembleWorldDraft(cards);
  }
  const first = cards[0];
  const second = cards[1];
  if (first === undefined || second === undefined) {
    return null;
  }
  const places = cards.filter((card) => card.kind === 'place').map(member);
  const cast = cards.filter((card) => card.kind === 'person').map(member);
  const tensions = cards
    .filter((card) => card.kind === 'outcome' || card.kind === 'change')
    .map(member);
  const bonds: WorldDraftBond[] = [];
  for (const card of cards) {
    if (card.about_id !== undefined && card.about_name !== undefined) {
      bonds.push({
        card_id: card.id,
        card_name: card.name,
        about_id: card.about_id,
        about_name: card.about_name,
      });
    }
  }
  return WorldDraftSchema.parse({
    schema_version: WORLD_DRAFT_VERSION,
    name: first.name,
    one_liner: second.one_liner,
    places,
    cast,
    tensions,
    bonds,
  });
}

/** The world-draft references with `scale` appended, or the same array when
 * that scale is already recorded. */
export function recordWorldDraftAtScale(
  worldDrafts: readonly WorldDraftReference[],
  scale: ManifestScale,
): readonly WorldDraftReference[] {
  if (worldDrafts.some((draft) => draft.scale === scale)) {
    return worldDrafts;
  }
  return [...worldDrafts, { scale }];
}
