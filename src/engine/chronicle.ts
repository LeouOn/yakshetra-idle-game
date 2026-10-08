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
// Dates: a card's only tick provenance is its residue window id
// (`w-{firstTick}-{lastTick}-{n}`); the entry is dated at the window's first
// tick through the engine calendar. A card with a malformed window id falls
// back to harvest order — one card per in-game day from the anchor — and that
// fallback is load-bearing for imported/migrated archives.

import { tickToCalendar, type CalendarEpoch } from './calendar';
import { normalizeProse } from './prose-normalize';
import { CHRONICLE_TEMPLATES } from './chronicle-templates';
import { SCALE_VALUES } from './manifest';
import type { Manifest } from './manifest';
import type { WorldDraftReference } from './studio-session';

export interface ChronicleEntry {
  /** 1-based, strictly increasing in reading order. */
  readonly ordinal: number;
  readonly date: { readonly year: number; readonly month: number; readonly day: number };
  readonly text: string;
  readonly cardId: string | null;
  readonly kind: string | null;
  readonly scale: string | null;
}

/** Player-facing words for the ladder's rungs (the engine ids are
 * build-internal tokens; the chronicle never prints them raw). */
const SCALE_WORDS: Readonly<Record<string, string>> = {
  person: 'household of one',
  household: 'household',
  org: 'workshop',
  town: 'town',
  city: 'city',
  region: 'region',
  nation: 'nation',
  world: 'world',
};

/** Indefinite article for a vowel-initial word ('edict' -> 'an edict'),
 * with the usual silent-h exceptions. */
const ARTICLE_EXCEPTIONS = new Set(['hour', 'honest', 'honor', 'heir']);
export function withArticle(word: string): string {
  const first = word.trim().slice(0, 1).toLowerCase();
  const head = word.trim().split(/\s+/)[0] ?? word;
  const an =
    (first === 'a' || first === 'e' || first === 'i' || first === 'o' || first === 'u') !==
    ARTICLE_EXCEPTIONS.has(head.toLowerCase());
  return `${an ? 'an' : 'a'} ${word}`;
}

/** Ordinal words for months and a readable day ordinal. */
const MONTH_WORDS = [
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
  'ninth',
  'tenth',
  'eleventh',
  'twelfth',
];
function dayOrdinal(day: number): string {
  const rem10 = day % 10;
  const rem100 = day % 100;
  const suffix =
    rem10 === 1 && rem100 !== 11
      ? 'st'
      : rem10 === 2 && rem100 !== 12
        ? 'nd'
        : rem10 === 3 && rem100 !== 13
          ? 'rd'
          : 'th';
  return `${day}${suffix}`;
}

/** 'The 2nd day of the first month, in the year 618' — a chronicle's date,
 * not a log timestamp. */
export function chronicleDatePhrase(date: {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}): string {
  const month = MONTH_WORDS[date.month - 1] ?? String(date.month);
  return `The ${dayOrdinal(date.day)} day of the ${month} month, in the year ${date.year}`;
}

/** FNV-1a over the card id — the deterministic "rotation" seed. */
function hashOf(key: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    hash = Math.imul(hash ^ key.charCodeAt(i), 0x01000193) >>> 0;
  }
  return hash;
}

function pick<T>(rows: readonly T[], key: string): T {
  return rows[hashOf(key) % rows.length] ?? rows[0]!;
}

function firstSentence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^.*?[.!?](?:\s|$)/);
  let sentence = match ? match[0].trim() : trimmed;
  if (!/[.!?]$/.test(sentence) && sentence.length > 0) {
    sentence += '.';
  }
  return sentence;
}

function figureAliases(name: string): readonly string[] {
  const rawParts = name
    .split(/[,/()]/)
    .map((p) => p.trim())
    .filter((p) => p.length > 2);
  const aliases = new Set<string>();
  for (const part of rawParts) {
    const clean = part.replace(/^the\s+/i, '').trim();
    if (clean.length > 2) {
      aliases.add(clean.toLowerCase());
      const normalized = clean
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
      aliases.add(normalized);
    }
  }
  return [...aliases];
}

export function namesFigureOrClearSubject(sentence: string, figureName: string): boolean {
  const s = sentence.replace(/^{{\w+}}\s*/, '').trim();

  for (const alias of figureAliases(figureName)) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, 'i');
    if (re.test(s)) {
      return true;
    }
  }

  if (/^(?:he|she|they|his|her|their)\b/i.test(s)) {
    return true;
  }

  const commaParts = s.split(',');
  if (commaParts.length > 1) {
    for (let i = 1; i < commaParts.length; i += 1) {
      const after = commaParts.slice(i).join(',').trim();
      if (/^(?:he|she|they|his|her|their)\b/i.test(after)) {
        return true;
      }
    }
  }

  if (
    /^(?:through|at|in|on|before|after|with)\s+[a-z\s]+?\s+(?:he|she|they|his|her|their)\b/i.test(s)
  ) {
    return true;
  }

  return false;
}

export function figureScene(card: Manifest): string {
  const oneLiner = card.one_liner ? firstSentence(card.one_liner) : '';
  const detail = card.detail ? firstSentence(card.detail) : '';
  const figureName = card.about_name ?? card.name;
  if (
    detail.length > 0 &&
    detail !== card.one_liner &&
    (namesFigureOrClearSubject(detail, figureName) || namesFigureOrClearSubject(detail, card.name))
  ) {
    return detail;
  }
  return oneLiner;
}

function pickWithMemory(
  templates: readonly string[],
  key: string,
  recent: readonly string[],
): string {
  const h = hashOf(key);
  for (let offset = 0; offset < templates.length; offset += 1) {
    const candidate = templates[(h + offset) % templates.length]!;
    if (!recent.includes(candidate)) {
      return candidate;
    }
  }
  return templates[h % templates.length]!;
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

interface Draft {
  readonly tick: bigint;
  readonly index: number;
  readonly text: string;
  readonly scale: string;
}

function draftEntries(
  archive: readonly Manifest[],
  worldDrafts: readonly WorldDraftReference[],
  cardTicks: readonly bigint[],
): Draft[] {
  const out: Draft[] = [];
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
        scale,
        text: pick(CHRONICLE_TEMPLATES.worldDraft, `${scale}-world-${k}`)
          .replace(/{line}/g, `${first?.name ?? 'a place'} — ${second.one_liner}`)
          .replace(/{scale-word}/g, SCALE_WORDS[scale] ?? scale),
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
  const seenKinds = new Set<string>();
  const seenFigures = new Set<string>();
  const seenScales = new Set<string>();
  const seenKept = new Set<string>();

  interface Row {
    readonly tick: bigint;
    readonly index: number;
    readonly text: string;
    readonly cardId: string | null;
    readonly kind: string | null;
    readonly scale: string | null;
  }
  const rows: Row[] = [];

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
  const recentReturnFrames: string[] = [];

  archive.forEach((card, index) => {
    const tick = cardTicks[index]!;
    const slots = {
      '{title}': card.name,
      '{one_liner}': card.one_liner,
      '{subject}': card.subject,
      '{figure}': card.about_name ?? card.name,
      '{scene}': figureScene(card),
    };
    const fill = (frame: string): string =>
      Object.entries(slots).reduce((text, [slot, value]) => text.split(slot).join(value), frame);
    const foundsScale = !seenScales.has(card.scale) && card.scale !== 'person';
    if (!seenKinds.has(card.kind) && !foundsScale) {
      seenKinds.add(card.kind);
      rows.push({
        tick,
        index,
        text: fill(pick(CHRONICLE_TEMPLATES.firstKind, `${card.id}-first`)),
        cardId: card.id,
        kind: card.kind,
        scale: card.scale,
      });
    }
    if (foundsScale) {
      seenScales.add(card.scale);
      rows.push({
        tick,
        index,
        text: fill(
          pick(CHRONICLE_TEMPLATES.tierFirst, `${card.scale}-tier`).replace(
            /{scale-word}/g,
            SCALE_WORDS[card.scale] ?? card.scale,
          ),
        ),
        cardId: card.id,
        kind: card.kind,
        scale: card.scale,
      });
    }
    const about = card.about_id ?? null;
    const aboutName = card.about_name ?? null;
    if (about !== null && about.startsWith('figure:') && aboutName !== null) {
      const first = !seenFigures.has(about);
      seenFigures.add(about);
      let template: string;
      if (first) {
        template = pick(CHRONICLE_TEMPLATES.figureFirst, `${card.id}-figure`);
      } else {
        template = pickWithMemory(
          CHRONICLE_TEMPLATES.figureReturn,
          `${card.id}-figure`,
          recentReturnFrames,
        );
        recentReturnFrames.push(template);
        if (recentReturnFrames.length > 4) {
          recentReturnFrames.shift();
        }
      }
      rows.push({
        tick,
        index,
        text: fill(template),
        cardId: card.id,
        kind: card.kind,
        scale: card.scale,
      });
    } else if (
      !foundsScale &&
      about !== null &&
      aboutName !== null &&
      (card.kind === 'person' || card.kind === 'place') &&
      !seenKept.has(about)
    ) {
      seenKept.add(about);
      rows.push({
        tick,
        index,
        text: fill(pick(CHRONICLE_TEMPLATES.kept, `${card.id}-kept`)),
        cardId: card.id,
        kind: card.kind,
        scale: card.scale,
      });
    }
  });

  for (const draft of draftEntries(archive, worldDrafts, cardTicks)) {
    rows.push({
      tick: draft.tick,
      index: draft.index,
      text: draft.text,
      cardId: null,
      kind: null,
      scale: draft.scale,
    });
  }

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
