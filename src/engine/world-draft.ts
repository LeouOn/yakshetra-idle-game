// World draft — assemble harvested people and places into a setting.
// Deterministic: no rng. Pure: no Date, no fetch.

import { z } from 'zod';

import type { Manifest } from './manifest';
import { canonicalStringify } from './serialize';

export const WORLD_DRAFT_VERSION = 'world_draft/v0' as const;

export interface WorldDraftMember {
  readonly id: string;
  readonly name: string;
  readonly one_liner: string;
}

export interface WorldDraftBond {
  readonly card_id: string;
  readonly card_name: string;
  readonly about_id: string;
  readonly about_name: string;
}

export interface WorldDraft {
  readonly schema_version: typeof WORLD_DRAFT_VERSION;
  readonly name: string;
  readonly one_liner: string;
  readonly places: readonly WorldDraftMember[];
  readonly cast: readonly WorldDraftMember[];
  readonly tensions: readonly WorldDraftMember[];
  readonly bonds: readonly WorldDraftBond[];
}

const MemberSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    one_liner: z.string().min(1),
  })
  .strict();

export const WorldDraftSchema = z
  .object({
    schema_version: z.literal(WORLD_DRAFT_VERSION),
    name: z.string().min(1),
    one_liner: z.string().min(1),
    places: z.array(MemberSchema),
    cast: z.array(MemberSchema),
    tensions: z.array(MemberSchema),
    bonds: z.array(
      z
        .object({
          card_id: z.string().min(1),
          card_name: z.string().min(1),
          about_id: z.string().min(1),
          about_name: z.string().min(1),
        })
        .strict(),
    ),
  })
  .strict();

function member(card: Manifest): WorldDraftMember {
  return { id: card.id, name: card.name, one_liner: card.one_liner };
}

/** A world starts with one place, or with two people who need somewhere to stand. */
export function canAssembleWorld(archive: readonly Manifest[]): boolean {
  const places = archive.filter((card) => card.kind === 'place').length;
  const people = archive.filter((card) => card.kind === 'person').length;
  return places >= 1 || people >= 2;
}

export function assembleWorldDraft(archive: readonly Manifest[]): WorldDraft | null {
  if (!canAssembleWorld(archive)) {
    return null;
  }
  const places = archive.filter((card) => card.kind === 'place').map(member);
  const cast = archive.filter((card) => card.kind === 'person').map(member);
  const tensions = archive
    .filter((card) => card.kind === 'outcome' || card.kind === 'change')
    .map(member);
  const firstPlace = places[0];
  const firstPerson = cast[0];
  const name = firstPlace?.name ?? 'A street that is still deciding';
  const one_liner =
    firstPlace !== undefined && firstPerson !== undefined
      ? `${firstPerson.name} keeps returning to ${firstPlace.name}.`
      : firstPlace !== undefined
        ? firstPlace.one_liner
        : `${firstPerson?.name ?? 'Someone'} is waiting for a place to land.`;
  const bonds: WorldDraftBond[] = [];
  for (const card of archive) {
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
    name,
    one_liner,
    places,
    cast,
    tensions,
    bonds,
  });
}

export function stringifyWorldDraft(draft: WorldDraft): string {
  return canonicalStringify(WorldDraftSchema.parse(draft));
}
