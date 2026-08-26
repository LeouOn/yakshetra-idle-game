// World drafts at scale — one setting per tier scale, accrued per assembly.
//
// Person keeps assembleWorldDraft's exact rules over the person-scale cards
// (a place, or two people) and records at most one world. Every other scale
// pairs its cards: world `k` is assembled from `cards[2k]` and
// `cards[2k+1]` — the name comes from the first card of the pair, the
// one-liner from the second — so each scale accrues one reference per
// assembled world and `world_drafts.<scale>` counts distinct worlds.
// Deterministic: no rng. Pure: no Date, no network.

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

/** Assemble world `ordinal` of `scale` from the archive, or null when that
 * world's cards do not meet its assembly rule. Non-person world `k` is the
 * pair `cards[2k]`, `cards[2k+1]`; person ignores the ordinal and keeps the
 * single-draft rule. */
export function assembleWorldDraftAtScale(
  archive: readonly Manifest[],
  scale: ManifestScale,
  ordinal = 0,
): WorldDraft | null {
  const cards = archive.filter((card) => card.scale === scale);
  if (scale === 'person') {
    return assembleWorldDraft(cards);
  }
  const first = cards[2 * ordinal];
  const second = cards[2 * ordinal + 1];
  if (first === undefined || second === undefined) {
    return null;
  }
  const world = [first, second];
  const places = world.filter((card) => card.kind === 'place').map(member);
  const cast = world.filter((card) => card.kind === 'person').map(member);
  const tensions = world
    .filter((card) => card.kind === 'outcome' || card.kind === 'change')
    .map(member);
  const bonds: WorldDraftBond[] = [];
  for (const card of world) {
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

/** The ledger with `scale` grown to `count` references — appended only when
 * fewer than `count` are already recorded; a ledger holding `count` or more
 * is returned unchanged. */
export function recordWorldDraftAtScale(
  worldDrafts: readonly WorldDraftReference[],
  scale: ManifestScale,
  count: number,
): readonly WorldDraftReference[] {
  const existing = worldDrafts.filter((draft) => draft.scale === scale).length;
  if (existing >= count) {
    return worldDrafts;
  }
  const grown = [...worldDrafts];
  for (let i = existing; i < count; i += 1) {
    grown.push({ scale });
  }
  return grown;
}

/** How many worlds the archive assembles at `scale`: person keeps its
 * single-draft rule (0 or 1); every other scale pairs cards, so the count
 * is floor(cards of the scale / 2). */
function assembleableWorldsAtScale(archive: readonly Manifest[], scale: ManifestScale): number {
  if (scale === 'person') {
    return assembleWorldDraftAtScale(archive, scale) === null ? 0 : 1;
  }
  const cards = archive.filter((card) => card.scale === scale).length;
  return Math.floor(cards / 2);
}

/** The world-draft ledger grown to one reference per assembleable world at
 * every scale in `scales`. This is the recorder the production graduation
 * path runs: the milestone stat `world_drafts.<scale>` reads the ledger's
 * length, so gates like `>= 2` need two distinct assembled worlds. */
export function withRecordedDrafts(
  archive: readonly Manifest[],
  drafts: readonly WorldDraftReference[],
  scales: readonly ManifestScale[],
): readonly WorldDraftReference[] {
  let out = drafts;
  for (const scale of scales) {
    out = recordWorldDraftAtScale(out, scale, assembleableWorldsAtScale(archive, scale));
  }
  return out;
}
