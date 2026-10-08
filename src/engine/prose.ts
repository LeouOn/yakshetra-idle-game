// Turning internal ids into words a sentence can use, and refusing the ones
// that cannot. Pure string work, kept in its own module because three files
// need it (the picker, the slot builder and the life context) and importing
// the picker from the life context would risk a cycle.

/** Namespaces that carry a second, more meaningful segment after them. */
const ID_PREFIXES: readonly string[] = [
  'practice',
  'lens',
  'cast',
  'relationship',
  'drink',
  'mantra',
  'bench',
  'life',
];

export function lastSegment(id: string): string {
  const tail = id.split(/[:/]/).pop();
  return tail ?? id;
}

/**
 * A residue id as a phrase a reader can use in a sentence: the namespace
 * dropped, the tail split on `-`/`_`. `practice:tang/nianfo-recitation` becomes
 * `nianfo recitation`. This is the only way an id reaches card prose, so no
 * template can leak a `ns:path` token.
 */
export function humanizeId(id: string): string {
  const tail = lastSegment(id);
  const head = tail.split('/')[0] ?? tail;
  if (ID_PREFIXES.includes(head) && head.length < tail.length) {
    return humanizeId(tail.slice(head.length + 1));
  }
  return head.replace(/[-_]+/g, ' ').trim();
}

/**
 * True when a string is an internal handle rather than a name: a manifest id
 * ("m-0-464489159") or a UUID. Those must never be printed, and humanizing them
 * only makes them quieter ("m 0 464489159"), not safe.
 *
 * A namespaced content id ("practice:tang/nianfo-recitation") is deliberately
 * NOT in this set: the namespace carries a second, more meaningful segment and
 * `humanizeId` exists to drop it down to the word worth printing. Treating
 * those as unprintable would silence every tie and practice slot in the game.
 */
export function isIdShaped(value: string): boolean {
  if (/^[0-9a-f]{8,}-[0-9a-f]{4,}/i.test(value)) {
    return true;
  }
  if (/^[a-z]{1,3}-[0-9]+-[0-9]{4,}$/i.test(value)) {
    return true;
  }
  // A studio manifest handle: `m-` plus a short body, minted per card. It names
  // a card, not a person, so there is no name behind it to recover.
  return /^m-[0-9a-z]+(?:-[0-9a-z]+)*$/i.test(value);
}

/**
 * Small words left lower case inside a display name, so "shen the night clerk"
 * becomes "Shen the Night Clerk" and not "Shen The Night Clerk".
 */
const NAME_MINOR_WORDS: ReadonlySet<string> = new Set([
  'the',
  'of',
  'and',
  'in',
  'on',
  'at',
  'to',
  'for',
  'from',
  'with',
  'a',
  'an',
  'de',
  'la',
  'le',
  'bin',
  'ibn',
]);

/**
 * A name as it should be printed: authored casing preserved when there is a
 * real name, title cased otherwise.
 *
 * Cast ties already carry the card's authored `name` and must not be touched.
 * Relationship ties are only ids ("old-wu"), and the tree has no authored
 * roster for them, so this is the one place a name is synthesized. Getting it
 * wrong is visible and ugly in a way a lowercase "old wu" is not, so the rule
 * is explicit rather than implied: capitalise each word except a small set of
 * particles and function words.
 */
export function displayName(value: string): string {
  return value
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word, index) => {
      if (index > 0 && NAME_MINOR_WORDS.has(word.toLowerCase())) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * `humanizeId`, but only for values that are safe to print. Returns null for a
 * handle rather than a name. Every card slot that interpolates an external
 * string goes through this, so a caller that forgets to resolve a name first
 * still cannot leak.
 *
 * The refusal is deliberately total. Humanizing a handle does not make it
 * safer, it makes it quieter and wrong: "m-guest" becomes "M Guest", which
 * reads to the player as a real person's name and is not one. A caller that
 * gets null prints nothing — it does not fall back to the raw id, and it does
 * not try harder.
 */
export function safePhrase(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (isIdShaped(value)) {
    return null;
  }
  const phrase = humanizeId(value);
  return phrase.length === 0 ? null : phrase;
}

/**
 * `safePhrase` for anything read as a person's name: same refusal of handles,
 * plus the casing rule. The lead read "old wu" and "auntie qian" on cards and
 * called it out, so a name is never emitted lower case.
 */
export function safeName(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (isIdShaped(value)) {
    return null;
  }
  const phrase = humanizeId(value);
  return phrase.length === 0 ? null : displayName(phrase);
}
