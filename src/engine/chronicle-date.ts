// Chronicle date and ladder words — the gazetteer's furniture.
// Extracted from chronicle.ts (engine files stay under ~250 lines).
// Pure: no Date, no RNG, no I/O.

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

/** Player-facing words for the ladder's rungs (the engine ids are
 * build-internal tokens; the chronicle never prints them raw). */
export const SCALE_WORDS: Readonly<Record<string, string>> = {
  person: 'household of one',
  household: 'household',
  org: 'workshop',
  town: 'town',
  city: 'city',
  region: 'region',
  nation: 'nation',
  world: 'world',
};
