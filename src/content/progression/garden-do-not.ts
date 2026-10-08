// The Garden of Arrivals "do not" list, and the audit built on it.
//
// docs/design/fantasy-era-bible.md §6 lists the Tang-isms that must never
// appear in Garden of Arrivals card copy. This module turns that prose list into
// a test, and — more importantly — into the classifier that tags the authored
// rows, so "this row is Tang-only" is a decision the tree can explain rather
// than a judgement a person has to repeat in their head.
//
// Two different jobs use the same list, and the difference matters:
//
//   * A GARDEN row is rejected if it contains any of these. The list is a
//     closed vocabulary of things that only exist in Tang, so a hit is proof.
//   * A TANG row is TAGGED if it contains any of these. This is a heuristic,
//     not proof: a row can be Tang in its nouns and still be usable in the
//     Garden. A miss is a real miss. A false positive costs one extra
//     `era: 'tang'` tag, which only means the row stops being offered to a
//     Garden life — recoverable, and the catalog test reports every tag so the
//     list is reviewable.
//
// Whole words only, case-insensitive. `tael` must not fire inside `steely`, and
// `mule` must not fire inside `muleish`; the point is to catch the noun, and a
// substring match produces enough false hits on ordinary English to make the
// list unusable.

/** The bible's §6 list, verbatim, grouped so a failure names its category. */
export const GARDEN_DO_NOT: Readonly<Record<string, readonly string[]>> = {
  toponym: [
    "chang'an",
    'changan',
    'chang\u2019an',
    'luoyang',
    'the capital',
    'yellow river',
    'wei river',
    'huainan',
    'imperial highway',
    'city wards',
  ],
  role: [
    'peasant',
    'serf',
    'tenant',
    'landlord',
    'magistrate',
    'prefect',
    'bailiff',
    'imperial envoy',
    'eunuch',
    'courtesan',
    'tax collector',
    'muleteer',
    'tavern keeper',
  ],
  commerce: [
    'tael',
    'copper cash',
    'strings of coin',
    'granary receipts',
    'pawnshop',
    'market license',
    'pecks',
    'piculs',
  ],
  civic: [
    'curfew bell',
    'curfew drum',
    'night watchman',
    'city gate patrol',
    'yamen',
    'bastinado',
    'garrison',
    'conscription register',
    'drum tower',
  ],
  agrarian: [
    'mule litter',
    'pack ox',
    'grain cart',
    'tavern bench',
    'wine jar',
    'tallow dip',
    'courtyard hound',
    'pork fat',
    'slatted paper window',
    'loess',
    'tallow',
    'mule',
  ],
  religious: [
    'monk certificates',
    'abbot',
    'temple donation box',
    'temple estate',
    'incense burner for merit',
  ],
};

/** Every forbidden term, lower-cased. */
export const DO_NOT_TERMS: readonly string[] = Object.values(GARDEN_DO_NOT).flat();

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Both apostrophe forms, so a straight quote in one row and a curly one in
// another do not split the list. '\b' cannot be used on a phrase that starts or
// ends in a non-word character, so it is applied only where both ends are word
// characters and skipped otherwise.
const PATTERNS: readonly { term: string; re: RegExp }[] = DO_NOT_TERMS.map((term) => {
  const t = term.trim();
  const body = escapeRe(t);
  const startsWord = /^[\p{L}\p{N}]/u.test(t);
  const endsWord = /[\p{L}\p{N}]$/u.test(t);
  const pattern = (startsWord ? '\\b' : '') + body + (endsWord ? '\\b' : '');
  return { term, re: new RegExp(pattern, 'iu') };
});

/** Forbidden terms present in `text`, as a Set, whole-word and case-blind. */
export function forbiddenTerms(text: string): Set<string> {
  const hits = new Set<string>();
  for (const { term, re } of PATTERNS) {
    if (re.test(text)) {
      hits.add(term);
    }
  }
  return hits;
}

/** The category a term belongs to, for a readable failure message. */
export function categoryOf(term: string): string {
  for (const [category, terms] of Object.entries(GARDEN_DO_NOT)) {
    if (terms.includes(term)) {
      return category;
    }
  }
  return 'unknown';
}

/**
 * Every player-facing string a row can produce, concatenated.
 *
 * The row `detail` alone is not enough: a `templates` entry can carry Tang
 * nouns the row does not, and a one-liner is what the player reads on the card
 * face. Anything that reaches prose is included.
 */
export function rowProse(row: {
  readonly one_liner: string;
  readonly detail: string;
  readonly subject?: string;
  readonly templates?: readonly {
    readonly name?: string;
    readonly one_liner?: string;
    readonly detail: string;
  }[];
}): string {
  const parts: string[] = [row.one_liner, row.detail, row.subject ?? ''];
  for (const t of row.templates ?? []) {
    parts.push(t.name ?? '', t.one_liner ?? '', t.detail);
  }
  return parts.join('\n');
}
