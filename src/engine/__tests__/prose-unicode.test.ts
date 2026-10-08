// Sentence capitalization must be Unicode-aware.
//
// The rule was ASCII-only: capitalise `[a-z]` after a start-of-string or after
// `.!?` and whitespace. A sentence opening with a diacritic lower-case letter
// (a name, a transliterated term) was left alone, as was a sentence opening
// inside a quotation mark. Both are real in this content: the figure rows carry
// macrons, and the authored copy quotes.
//
// Abbreviations are explicitly OUT OF SCOPE. Deciding that "a.m." ends a
// sentence and "Mr." does not needs a real abbreviation list and a real parser,
// and guessing at it would corrupt more copy than it fixed. A card that says
// "a.m." and gets over-capitalized is a much smaller problem than a
// capitalization rule that mangles prose on a hunch.

import { describe, expect, it } from 'vitest';
import { normalizeProse } from '../prose-normalize';

describe('sentence capitalization is Unicode-aware', () => {
  it('capitalises a lower-case sentence opening that carries a diacritic', () => {
    expect(normalizeProse('he came to the gate. ācārya stood aside.')).toContain('Ācārya');
    expect(normalizeProse('iḍā meets the wall. óṅ exactly.')).toContain('Óṅ');
  });

  it('capitalises after an opening quote or bracket', () => {
    expect(normalizeProse('she said. "he is at the gate."')).toContain('"He');
    expect(normalizeProse('she said. ‘he is at the gate.’')).toContain('‘He');
    expect(normalizeProse('a note: Ācārya was waiting.')).toContain('Ācārya');
  });

  it('does NOT treat a colon as a sentence boundary', () => {
    // A colon looks like a boundary and is not one. `the bell rang at 6:30
    // exactly` and `note: ācārya` both break if the rule widens to `:`, and the
    // first is far more common in this content than the second. Recorded here
    // so the next person to widen the rule has to read the counter-example.
    expect(normalizeProse('the bell rang at 6:30 exactly.')).toBe('The bell rang at 6:30 exactly.');
    expect(normalizeProse('a note: ācārya was waiting.')).toContain('note: ācārya');
  });

  it('still capitalises plain ASCII, and leaves mid-sentence text alone', () => {
    expect(normalizeProse('the bell rings. the lane empties.')).toBe(
      'The bell rings. The lane empties.',
    );
    expect(normalizeProse('he carried the Ācārya’s ledger to the gate.')).toBe(
      'He carried the Ācārya’s ledger to the gate.',
    );
  });

  it('does not touch a word that is not sentence-initial', () => {
    // The macron case that is NOT a bug: a diacritic lower-case letter in the
    // middle of a sentence must survive untouched.
    expect(normalizeProse('the stone is ācārya-soft.')).toContain('ācārya-soft');
  });
});
