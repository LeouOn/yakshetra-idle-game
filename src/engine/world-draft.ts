// World draft — assemble harvested people and places into a setting.
// Deterministic: no rng. Pure: no Date, no fetch.

import { z } from 'zod';

import type { Manifest, ManifestScale } from './manifest';
import { isIdShaped } from './prose';
import { normalizeProse } from './prose-normalize';
import { canonicalStringify } from './serialize';
import { WORLD_DRAFT_TEMPLATES, pickTemplate, templatesForScale } from './world-draft-templates';

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

function stripPeriod(text: string): string {
  return text.trim().replace(/[.!?]+$/, '');
}

function withLowerArticle(phrase: string): string {
  return phrase.replace(/^(The|A|An)\b/, (m) => m.toLowerCase());
}

/**
 * Format a person's name into a template frame.
 * If the card name contains an appositive like ", the X" and a verb follows in the template,
 * close the appositive with a comma before the verb.
 */
export function formatPersonInTemplate(template: string, personName: string): string {
  if (/, the\b/i.test(personName)) {
    return template
      .replace(
        /{person}(\s+(?:is|are|was|were|has|have|keeps|stays|stands|walks|waits|sits|rests|works|watches|returns|wanders|tends|draws|holds|makes|leaves|[a-z]+s)\b)/gi,
        `${personName},$1`,
      )
      .replace(/{person}/g, personName);
  }
  return template.replace(/{person}/g, personName);
}

/** Compose a setting line from cards: person + place at person scale, or tier cards at higher scales. */
export function composeWorldDraftLine(
  first: Manifest | undefined | null,
  second?: Manifest | null,
  scale: ManifestScale = 'person',
): string {
  if (scale === 'person') {
    let personCard = first?.kind === 'person' ? first : second?.kind === 'person' ? second : null;
    let placeCard = first?.kind === 'place' ? first : second?.kind === 'place' ? second : null;

    if (!personCard && !placeCard) {
      if (first && !second) {
        if (first.kind === 'person') personCard = first;
        else placeCard = first;
      }
    }

    if (personCard && placeCard) {
      const template = pickTemplate(
        WORLD_DRAFT_TEMPLATES.personWithPlace,
        `${personCard.id}:${placeCard.id}:person`,
      );
      const rawPersonName = personCard.name;
      const personName = isIdShaped(rawPersonName) ? 'Someone' : stripPeriod(rawPersonName);
      const rawPlaceName = placeCard.name;
      const placeName = isIdShaped(rawPlaceName)
        ? 'the threshold'
        : withLowerArticle(stripPeriod(rawPlaceName));
      const personWhat = stripPeriod(personCard.one_liner);
      return normalizeProse(
        formatPersonInTemplate(template, personName)
          .replace(/{place}/g, placeName)
          .replace(/{line}/g, personWhat),
      );
    }

    if (personCard) {
      const template = pickTemplate(
        WORLD_DRAFT_TEMPLATES.personOnly,
        `${personCard.id}:person-only`,
      );
      const personWhat = stripPeriod(personCard.one_liner);
      return normalizeProse(template.replace(/{person}/g, personWhat));
    }

    if (placeCard) {
      const template = pickTemplate(WORLD_DRAFT_TEMPLATES.placeOnly, `${placeCard.id}:place-only`);
      const placeWhat = stripPeriod(placeCard.one_liner);
      return normalizeProse(template.replace(/{place}/g, placeWhat));
    }

    return 'A quiet threshold, waiting for someone to arrive.';
  }

  // Tier scales
  if (!first && !second) {
    return 'A quiet threshold, waiting for someone to arrive.';
  }
  const card1 = first ?? second!;
  const card2 = second ?? first!;
  const templates = templatesForScale(scale);
  const template = pickTemplate(templates, `${card1.id}:${card2.id}:${scale}`);
  const rawName = card1.name;
  const name = isIdShaped(rawName) ? 'the hall' : withLowerArticle(stripPeriod(rawName));
  const line1 = stripPeriod(card1.one_liner);
  const line2 = stripPeriod(card2.one_liner);

  return normalizeProse(
    template
      .replace(/{name}/g, name)
      .replace(/{line1}/g, line1)
      .replace(/{line2}/g, line2),
  );
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
  const firstPlace = archive.find((card) => card.kind === 'place');
  const firstPerson = archive.find((card) => card.kind === 'person');
  const rawName = firstPlace?.name ?? 'A street that is still deciding';
  const name = isIdShaped(rawName) ? 'A street that is still deciding' : rawName;
  const one_liner = composeWorldDraftLine(firstPerson, firstPlace, 'person');
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
