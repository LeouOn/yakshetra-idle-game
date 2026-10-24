// Two verses that promise nothing, as harvest material (SPEC section 11: a real mantra on a harvested card).
// "Ye dhammā hetuppabhavā": Pali Mahāvagga I.23 (Vin I 40), the verse stamped on clay tablets and sealed in
// stupas (Boucher, JIABS 14.1, 1991). "Aniccā vata saṅkhārā": SN 6.15, DN 16. The cards state what the
// verse says, never what it does. The Ākāśagarbha formula (T 1145) is held back: its meaning is unknown
// and its text promises results.

import type { CatalogEntry } from './manifest-catalog';

export const GARDEN_VERSES: readonly CatalogEntry[] = [
  {
    name: 'A clay tablet stamped with a verse',
    one_liner: 'Four lines pressed into damp clay, the edges soft from the stamp.',
    subject: 'the tablet with the verse on it',
    detail:
      'The verse begins "Ye dhammā hetuppabhavā" and goes on to say that of whatever arises from a cause, the Tathāgata has told the cause, and the ending of it too. It is pressed into the clay again and again, and the tablets are stacked behind the memory stones to dry.',
    long_fire:
      ' The stamp has been used so often that the verse has worn shallow; the newest tablets read only where the clay is deepest.',
    rare: ' One tablet in the stack was pressed in a different hand, and nobody remembers whose.',
    tags: ['verse', 'clay', 'tablet'],
    era: 'fantasy',
  },
  {
    name: 'A slate cut with the bell verse',
    one_liner: 'Four lines cut shallow into the slate beneath the bell cord.',
    subject: 'the slate under the bell',
    detail:
      'The verse begins "Aniccā vata saṅkhārā" and says that conditions rise and fall, that having arisen they cease, and that their stilling is a kind of ease. It is cut shallow, so the rain fills the letters and the single note of the bell seems to come up out of the stone.',
    long_fire: ' The letters hold rainwater a full day after the weather has passed.',
    rare: " It is one of the verses said to have been spoken at the Teacher's passing, and nobody at the bell has ever said it aloud.",
    tags: ['verse', 'slate', 'bell'],
    era: 'fantasy',
  },
];
