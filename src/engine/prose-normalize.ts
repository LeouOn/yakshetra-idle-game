// Render-time cleanup for composed card text.
//
// Every defect this file prevents was found by reading cards aloud, not by
// reasoning about them, and every one of them is a class rather than a typo:
//
//   - a template written with a leading space renders one;
//   - a slot value is a phrase, not a word, so a frame that adds its own
//     preposition yields "set out at at first light";
//   - a slot value that opens a sentence arrives lower case, so the card reads
//     "...the account is closed. a few minutes went into settling it";
//   - a stuttered preposition survives when two authored halves meet.
//
// The authored copy is fixed too — see the row-level edits — but the composer
// is the layer that cannot be trusted, because it is the layer that glues
// machine-chosen phrases into human-written frames. So it cleans up after
// itself, and the normalizer is the reason the whole sweep is green rather than
// the reason one string was hand-patched.
//
// Pure string work. No Date, no Math.random, no environment.

/** Function words that must never double: "at at", "the the". */
const STUTTERED = [
  'the',
  'a',
  'an',
  'of',
  'in',
  'on',
  'at',
  'to',
  'for',
  'by',
  'with',
  'and',
  'or',
  'but',
  'from',
  'into',
  'over',
  'under',
  'as',
  'is',
  'was',
  'it',
  'its',
  'that',
  'this',
  'they',
  'them',
  'their',
] as const;

const STUTTER_RE = new RegExp(`\\b(${STUTTERED.join('|')})\\s+\\1\\b`, 'gi');

/**
 * Sentence-final punctuation followed by whitespace. Splitting on this is what
 * makes the capitalisation rule safe: a connector after a comma or a semicolon
 * is not a new sentence and must not be touched.
 */
const SENTENCE_BREAK = /([.!?])\s+/g;

/** Collapse whitespace runs, and trim the ends. */
function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** Upper-case the first letter of every sentence. */
function capitalizeSentences(text: string): string {
  return text
    .replace(SENTENCE_BREAK, (_m, stop: string) => `${stop} `)
    .replace(
      // \p{Ll} rather than [a-z]: the content carries macrons, and a sentence
      // opening with 'ācārya' or 'óṅ' was left lower-case. The middle group is
      // the opening quotes and brackets. It is an explicit list rather than
      // \p{Qu}\p{Ps} because JavaScript's property escapes only accept
      // single-letter general categories — `\p{Qu}` is a syntax error, not a
      // miss.
      //
      // Abbreviations are out of scope on purpose — see
      // __tests__/prose-unicode.test.ts for why guessing is worse than not
      // trying.
      /(^|[.!?]\s+)(["'“‘([{«‹「『¿¡]*)(\p{Ll})/gu,
      (_m, lead: string, open: string, letter: string) => `${lead}${open}${letter.toUpperCase()}`,
    );
}

/** Drop a doubled function word. */
function collapseStutter(text: string): string {
  let out = text;
  // Iterate: "the the the" needs more than one pass, and a short fixed point is
  // both simpler to reason about and impossible to run away.
  for (let i = 0; i < 3; i += 1) {
    const next = out.replace(STUTTER_RE, '$1');
    if (next === out) {
      break;
    }
    out = next;
  }
  return out;
}

/**
 * Normalize one rendered field.
 *
 * Applied to name, one_liner, subject and detail alike, and to the qualifier as
 * well, because the qualifier is appended to the detail and a qualifier that
 * starts with a space is the single most common source of leading whitespace.
 */
export function normalizeProse(text: string): string {
  return collapseStutter(capitalizeSentences(collapse(text)));
}
