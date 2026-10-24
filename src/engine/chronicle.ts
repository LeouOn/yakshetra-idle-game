// The chronicle — the world reads the lives back (wave 3, lane b1).
//
// buildChronicle compiles the archive into a dated, ordered gazetteer:
// firsts, figures, kept cards, tier foundings, assembled worlds. PURE and
// DERIVED — never stored, so there is no schema or save migration. The
// phrasing is data (chronicle-templates.ts), rotated deterministically by a
// hash of the card id, so the same archive yields the same chronicle on every
// device and every re-render. Prose rules: state what happened and who was
// near; never what it meant; never print an id (titles only; prose.ts).
//
// Repetition (2026-10-24): a ChronicleMemory walks every pick — section
// frames skip recently printed frames (chronicle-pick.ts); a returning
// figure never reprints a sentence it already said, and a figure is a FIRST
// sighting only once per NAME (chronicle-sections.ts), so alias catalog ids
// cannot earn two first meetings.
//
// Dates: a card's only tick provenance is its residue window id
// (`w-{firstTick}-{lastTick}-{n}`); the entry is dated at the window's first
// tick through the engine calendar. A card with a malformed window id falls
// back to harvest order — one card per in-game day from the anchor — and that
// fallback is load-bearing for imported/migrated archives.

import { tickToCalendar, type CalendarEpoch } from './calendar';
import { normalizeProse } from './prose-normalize';
import { CHRONICLE_TEMPLATES } from './chronicle-templates';
import { SCALE_VALUES, type Manifest, type ManifestScale } from './manifest';
import { composeWorldDraftLine } from './world-draft';
import { ChronicleMemory } from './chronicle-pick';
import { chronicleDatePhrase, SCALE_WORDS } from './chronicle-date';
import { sectionRowsFor, type ChronicleRow } from './chronicle-sections';
import type { WorldDraftReference } from './studio-session';

export { chronicleDatePhrase, withArticle } from './chronicle-date';
export { figureScene, namesFigureOrClearSubject } from './chronicle-figure';

export interface ChronicleEntry {
  /** 1-based, strictly increasing in reading order. */
  readonly ordinal: number;
  readonly date: { readonly year: number; readonly month: number; readonly day: number };
  readonly text: string;
  readonly cardId: string | null;
  readonly kind: string | null;
  readonly scale: string | null;
}

/** The window's first tick, or null when the id is not window-shaped. */
function windowFirstTick(card: Manifest): bigint | null {
  const parts = card.residue_window_id.split('-');
  if (parts.length !== 4 || parts[0] !== 'w') {
    return null;
  }
  const tick = Number(parts[1]);
  return Number.isFinite(tick) && tick >= 0 ? BigInt(tick) : null;
}

/** World-draft entries: one per assembled draft, dated at its second
 * founding card, quoting the world's own line (which is composed from the
 * two founding cards — naming the stones a world is made of is the entry's
 * job; each founding one-liner appears exactly once more, here). */
function draftEntries(
  archive: readonly Manifest[],
  worldDrafts: readonly WorldDraftReference[],
  cardTicks: readonly bigint[],
  memory: ChronicleMemory,
): readonly ChronicleRow[] {
  const out: ChronicleRow[] = [];
  for (const scale of new Set(worldDrafts.map((draft) => draft.scale))) {
    const cards = archive.filter((card) => card.scale === scale);
    const count = worldDrafts.filter((draft) => draft.scale === scale).length;
    for (let k = 0; k < count; k += 1) {
      const second = cards[2 * k + 1];
      if (second === undefined) {
        continue;
      }
      const secondIndex = archive.indexOf(second);
      const tick = cardTicks[secondIndex] ?? windowFirstTick(second) ?? BigInt(2 * k + 1) * 24n;
      const first = cards[2 * k];
      out.push({
        tick,
        index: secondIndex >= 0 ? secondIndex + 0.5 : archive.length,
        text: memory
          .sectionFrame(CHRONICLE_TEMPLATES.worldDraft, `${scale}-world-${k}`)
          .replace(/{line}/g, composeWorldDraftLine(first, second, scale as ManifestScale))
          .replace(/{scale-word}/g, SCALE_WORDS[scale] ?? scale),
        cardId: null,
        kind: null,
        scale,
      });
    }
  }
  return out;
}

export function buildChronicle(
  archive: readonly Manifest[],
  worldDrafts: readonly WorldDraftReference[],
  calendarAnchor: CalendarEpoch,
): readonly ChronicleEntry[] {
  const memory = new ChronicleMemory();
  const seen = { kinds: new Set<string>(), scales: new Set<string>(), kept: new Set<string>() };
  const rows: ChronicleRow[] = [];

  // Date inheritance: person-bench cards carry real window ticks; tier cards
  // compile from fold windows whose ticks are small fold counters. Each tier
  // entry takes the date of the nearest PRECEDING person-bench card with a
  // real tick (anchor before the first). Monotonic by construction; folding
  // the absolute tick into fold events would make it exact (engine change,
  // outside this lane).
  let lastRealTick = 0n;
  const tickOf = (card: Manifest, index: number): bigint => {
    const real = windowFirstTick(card);
    if (card.scale === 'person' && real !== null) {
      lastRealTick = real;
      return real;
    }
    if (real !== null && real > lastRealTick) {
      return real;
    }
    return lastRealTick > 0n ? lastRealTick : BigInt(index + 1) * 24n;
  };

  const cardTicks = archive.map((card, index) => tickOf(card, index));

  archive.forEach((card, index) => {
    rows.push(...sectionRowsFor(card, index, cardTicks[index]!, memory, seen));
  });
  rows.push(...draftEntries(archive, worldDrafts, cardTicks, memory));

  const scaleRank = (scale: string | null): number => {
    if (scale === null) {
      return SCALE_VALUES.length;
    }
    return Math.max(0, SCALE_VALUES.indexOf(scale as (typeof SCALE_VALUES)[number]));
  };
  rows.sort((a, b) =>
    a.tick === b.tick
      ? scaleRank(a.scale) === scaleRank(b.scale)
        ? a.index - b.index
        : scaleRank(a.scale) - scaleRank(b.scale)
      : a.tick < b.tick
        ? -1
        : 1,
  );
  return rows.map((row, i) => {
    const cal = tickToCalendar(row.tick, calendarAnchor);
    return {
      ordinal: i + 1,
      date: { year: cal.year, month: cal.month, day: cal.day },
      text: normalizeProse(row.text),
      cardId: row.cardId,
      kind: row.kind,
      scale: row.scale,
    };
  });
}

/** A clean plain-text chronicle for the clipboard: title, line, dated entries. */
export function chronicleToText(
  entries: readonly ChronicleEntry[],
  worldName: string | null,
  worldLine: string | null,
): string {
  const parts: string[] = [];
  if (worldName !== null && worldName.length > 0) {
    parts.push(worldName);
    if (worldLine !== null && worldLine.length > 0) {
      parts.push(worldLine);
    }
    parts.push('');
  }
  for (const entry of entries) {
    parts.push(`${chronicleDatePhrase(entry.date)} — ${entry.text}`);
  }
  return parts.join('\n');
}
