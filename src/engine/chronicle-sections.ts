// Chronicle sections — which entries one card contributes, and with what
// frame. Extracted from chronicle.ts (engine files stay under ~250 lines).
//
// One card can light several sections (first-of-kind, a tier founding, a
// figure meeting, a kept tie); each section fires at most once per subject,
// and every frame pick walks the shared ChronicleMemory so recently printed
// frames are skipped. Pure: no Date, no RNG, no I/O.

import { CHRONICLE_TEMPLATES } from './chronicle-templates';
import type { Manifest } from './manifest';
import type { ChronicleMemory } from './chronicle-pick';
import { figureKey, figureScene, firstSentence } from './chronicle-figure';
import { SCALE_WORDS } from './chronicle-date';

export interface ChronicleRow {
  readonly tick: bigint;
  readonly index: number;
  readonly text: string;
  readonly cardId: string | null;
  readonly kind: string | null;
  readonly scale: string | null;
}

/** Section subjects already covered by earlier cards in this build. */
export interface SectionSeen {
  readonly kinds: Set<string>;
  readonly scales: Set<string>;
  readonly kept: Set<string>;
}

export function sectionRowsFor(
  card: Manifest,
  index: number,
  tick: bigint,
  memory: ChronicleMemory,
  seen: SectionSeen,
): readonly ChronicleRow[] {
  const rows: ChronicleRow[] = [];
  const slots: Record<string, string> = {
    '{title}': card.name,
    '{one_liner}': card.one_liner,
    '{subject}': card.subject,
    '{figure}': card.about_name ?? card.name,
    '{scene}': figureScene(card),
  };
  const fill = (frame: string): string =>
    Object.entries(slots).reduce((text, [slot, value]) => text.split(slot).join(value), frame);
  const base = { cardId: card.id, kind: card.kind, scale: card.scale };
  const foundsScale = !seen.scales.has(card.scale) && card.scale !== 'person';
  // The fact this entry would quote: this object's own one-liner. A second
  // card of the same catalog row (the same object harvested at another
  // scale or kind) must not earn a second entry quoting the identical
  // sentence — the kind's first simply waits for a card with new prose.
  const fact = `${figureKey(card.name)}::${card.one_liner}`;
  const factIsNew = !memory.factAlreadyQuoted(fact);

  if (!seen.kinds.has(card.kind) && !foundsScale && factIsNew) {
    seen.kinds.add(card.kind);
    memory.quoteFact(fact);
    rows.push({
      ...base,
      tick,
      index,
      text: fill(memory.sectionFrame(CHRONICLE_TEMPLATES.firstKind, `${card.id}-first`)),
    });
  }
  if (foundsScale && factIsNew) {
    seen.scales.add(card.scale);
    memory.quoteFact(fact);
    rows.push({
      ...base,
      tick,
      index,
      text: fill(
        memory
          .sectionFrame(CHRONICLE_TEMPLATES.tierFirst, `${card.scale}-tier`)
          .replace(/{scale-word}/g, SCALE_WORDS[card.scale] ?? card.scale),
      ),
    });
  }

  const about = card.about_id ?? null;
  const aboutName = card.about_name ?? null;
  if (about === null || aboutName === null || !about.startsWith('figure:')) {
    if (
      !foundsScale &&
      (card.kind === 'person' || card.kind === 'place') &&
      about !== null &&
      !seen.kept.has(about) &&
      factIsNew
    ) {
      seen.kept.add(about);
      memory.quoteFact(fact);
      rows.push({
        ...base,
        tick,
        index,
        text: fill(memory.sectionFrame(CHRONICLE_TEMPLATES.kept, `${card.id}-kept`)),
      });
    }
    return rows;
  }

  // A figure card: first sighting once per NAME (alias catalog ids are one
  // being), and afterwards only with something new to say — the authored
  // pools are small, and a return that reprints a scene the figure already
  // said is how the chronicle repeated itself. Try the scene, then the
  // one-liner; a visit with nothing new is already on the record.
  const key = figureKey(aboutName);
  if (memory.firstSightingOf(key)) {
    memory.figureSays(key, firstSentence(card.one_liner));
    rows.push({
      ...base,
      tick,
      index,
      text: fill(memory.sectionFrame(CHRONICLE_TEMPLATES.figureFirst, `${card.id}-figure`)),
    });
    return rows;
  }
  const scene = figureScene(card);
  if (scene.length === 0) {
    return rows;
  }
  if (memory.figureAlreadySaid(key, scene)) {
    const alt = firstSentence(card.one_liner);
    if (alt.length === 0 || memory.figureAlreadySaid(key, alt)) {
      return rows;
    }
    slots['{scene}'] = alt;
    memory.figureSays(key, alt);
  } else {
    memory.figureSays(key, scene);
  }
  rows.push({
    ...base,
    tick,
    index,
    text: fill(memory.figureFrame(CHRONICLE_TEMPLATES.figureReturn, key, `${card.id}-figure`)),
  });
  return rows;
}
