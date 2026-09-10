// Authored card catalogs for Manifest table-fill. Pure content-as-data:
// no imports beyond the kind union, no logic. Adding a kind = add a table
// here and register it in CATALOG.

import { FIGURE_PEOPLE, FIGURE_PLACES } from './manifest-catalog-figures';

export interface CatalogEntry {
  readonly name: string;
  readonly one_liner: string;
  readonly subject: string;
  readonly detail: string;
  readonly tags: readonly string[];
}

const THINGS: readonly CatalogEntry[] = [
  {
    name: 'Sealed token',
    one_liner: 'A small mark that still holds a decision.',
    subject: 'a kept token',
    detail: 'Work pressed a choice into something you can hold. It is quiet, and it is finished.',
    tags: ['token', 'kept'],
  },
  {
    name: 'Worn ledger',
    one_liner: 'Columns of effort, still adding up.',
    subject: 'a record of tending',
    detail: 'The page is smudged where the same motion returned. The sum is not empty.',
    tags: ['ledger', 'return'],
  },
  {
    name: 'Folded measure',
    one_liner: 'A length you can take somewhere else.',
    subject: 'a portable measure',
    detail: 'What you practiced became a unit. Later work can spend it without guessing.',
    tags: ['measure', 'portable'],
  },
  {
    name: 'Quiet instrument',
    one_liner: 'It only speaks when you pick it up again.',
    subject: 'a tool at rest',
    detail: 'The bench kept a tool warm. It has a use, even if the next use is not named yet.',
    tags: ['instrument', 'rest'],
  },
  {
    name: 'Second bowl',
    one_liner: 'There is always one more than you needed.',
    subject: 'an extra bowl',
    detail: 'You set it down without a name on it. Something else finished the meal.',
    tags: ['bowl', 'given'],
  },
  {
    name: 'Shared cloak',
    one_liner: 'Warmth that left your shoulders and stayed in the room.',
    subject: 'a cloak given over',
    detail: 'The night was shorter for someone else. You walked home lighter and colder.',
    tags: ['cloak', 'shared'],
  },
];

const OUTCOMES: readonly CatalogEntry[] = [
  {
    name: 'A door that stays open',
    one_liner: 'Someone can still walk through later.',
    subject: 'an opening that held',
    detail: 'The work did not slam. A way remains, narrower than hope and wider than nothing.',
    tags: ['opening', 'held'],
  },
  {
    name: 'A debt settled',
    one_liner: 'The account is quiet on one line.',
    subject: 'a closed account',
    detail: 'Attention paid what was owed. The rest of the book is still being written.',
    tags: ['settled', 'account'],
  },
  {
    name: 'A name remembered',
    one_liner: 'It did not slip while you were away.',
    subject: 'a kept name',
    detail: 'Repetition did the remembering. The name is available to the next scene.',
    tags: ['name', 'kept'],
  },
  {
    name: 'A storm that missed',
    one_liner: 'The worst thing did not arrive on time.',
    subject: 'averted weather',
    detail: 'Idle care moved a pressure. What would have broken passed to the side.',
    tags: ['averted', 'weather'],
  },
  {
    name: 'A guest ate',
    one_liner: 'The extra seat was used.',
    subject: 'a meal that was received',
    detail: 'No speech required. The bowl came back empty and the house felt occupied.',
    tags: ['guest', 'fed'],
  },
  {
    name: 'A stray stayed',
    one_liner: 'It chose the courtyard again.',
    subject: 'a being that returned',
    detail: 'You left the gate unlatched. In the morning there were two sets of prints.',
    tags: ['stray', 'stayed'],
  },
];

const CHANGES: readonly CatalogEntry[] = [
  {
    name: 'A habit of returning',
    one_liner: 'The hands know the way back to the bench.',
    subject: 'a practiced return',
    detail: 'Leveling the same work left a groove. Coming back costs less than it did.',
    tags: ['habit', 'return'],
  },
  {
    name: 'A lighter pack',
    one_liner: 'Something you no longer have to carry.',
    subject: 'a dropped weight',
    detail: 'The work filed an edge off the day. The next hour has more room in it.',
    tags: ['lighter', 'space'],
  },
  {
    name: 'A sharper ear',
    one_liner: 'You notice the click before the break.',
    subject: 'a keener notice',
    detail: 'Attention trained on a small signal. The next change will be harder to miss.',
    tags: ['notice', 'signal'],
  },
  {
    name: 'A slower morning',
    one_liner: 'The first hour no longer rushes you.',
    subject: 'a paced start',
    detail: 'Collected work stretched the beginning of the day. Haste lost a little ground.',
    tags: ['pace', 'morning'],
  },
  {
    name: 'You look for a second cup',
    one_liner: 'The hand reaches for two before it thinks.',
    subject: 'a habit of offering',
    detail: 'Hospitality moved into the body. The kettle is already too full for one.',
    tags: ['habit', 'offering'],
  },
];

const PEOPLE: readonly CatalogEntry[] = [
  {
    name: 'Shen the night clerk',
    one_liner:
      'He works his abacus by tallow dip, noting tea and grain before you recall what was spent.',
    subject: 'a keeper of small debts',
    detail:
      'His abacus clicks long past the market curfew while moth wings flutter around the tallow dip. He leaves the back shutter unbolted for late grain porters, charging only what was weighed and never a copper for the late hour.',
    tags: ['clerk', 'debts'],
  },
  {
    name: 'Zhao the early courier',
    one_liner:
      'He arrives while frost still silvers the gate latch, smelling of road dust and river mist.',
    subject: 'a courier ahead of schedule',
    detail:
      "His pony's breath clouds the cold courtyard while he slices the oiled twine around your parcel. He waves off the hot tea you offer, already tightening his girth strap to beat the morning packet boat downriver.",
    tags: ['courier', 'early'],
  },
  {
    name: 'Auntie Qian the keyholder',
    one_liner: 'She keeps your spare iron key on a braided cord behind her kitchen hearth.',
    subject: 'a neighbor holding a key',
    detail:
      'The heavy latch-key hangs beside her dried peppers, turned once during an autumn flood to save your flour sacks. She never mentions the favor, but always checks your chimney smoke before lighting her own morning stove.',
    tags: ['neighbor', 'key'],
  },
  {
    name: 'Old Lu the ferry counter',
    one_liner:
      'He notches his willow tally-stick for every cart and mendicant that boards the barge.',
    subject: 'a counter of crossings',
    detail:
      'He stands on the gravel slip with hemp cords knotted around his wrist, balancing peasant grain carts against mule litters. When the muddy current swells, he holds the stern rope with his boot until every passenger sits safe.',
    tags: ['ferry', 'tally'],
  },
  {
    name: 'Master Yan the quiet mender',
    one_liner: 'He binds splintered garden hurdles with peeled willow before anyone asks.',
    subject: 'an unasked mender',
    detail:
      'He carries an adze and a coil of split bamboo tucked into his hemp sash. You wake to find the garden gate swinging true on greased leather hinges, with only clean cedar shavings left on the swept flagstones.',
    tags: ['mender', 'unasked'],
  },
  {
    name: 'Old Wu the courtyard guest',
    one_liner: 'A stray tortoiseshell hound that sleeps under the tool shed and watches the gate.',
    subject: 'a being in the yard',
    detail:
      'He takes steamed bun crusts from your palm with soft jaws, never barking at late arrivals. By midday he curls over the warm flagstones where the sun hits, keeping sparrows away from your medicinal herbs with a single tail-thump.',
    tags: ['guest', 'yard'],
  },
  {
    name: 'Elder Cui the evening caller',
    one_liner: 'He taps his cane on the threshold at dusk and sits without demanding conversation.',
    subject: 'someone at the door',
    detail:
      'He steps inside with damp sleeves as the evening temple bell rings, setting a small basket of roasted chestnuts on the low table. He sips bitter tea in silence, watching the wick gutter, leaving you feeling less alone in the house.',
    tags: ['caller', 'evening'],
  },
  {
    name: 'Brother De the water-carrier',
    one_liner:
      'He balances twin cedar buckets from the public cistern, filling the neighborhood vats first.',
    subject: 'a carrier of water',
    detail:
      "His shoulder-pole creaks under heavy pails through every morning frost. He dumps clear spring water into the communal crock and the baker's trough before drawing a single ladle for his own kettle, humming an old boatman chant.",
    tags: ['water', 'carrier'],
  },
];

const PLACES: readonly CatalogEntry[] = [
  {
    name: 'The night market',
    one_liner: 'Stalls that only open after the lamps agree.',
    subject: 'a market after dark',
    detail:
      'Aisles rearrange when you look away. The same coin buys a different street the second time.',
    tags: ['market', 'night'],
  },
  {
    name: 'The river stair',
    one_liner: 'Steps that remember every crossing.',
    subject: 'a stair into water',
    detail: 'High-water marks are cut into the stone like names. The lowest step is always wet.',
    tags: ['river', 'stair'],
  },
  {
    name: 'The dry cistern',
    one_liner: 'A room that used to be a well.',
    subject: 'an emptied cistern',
    detail: 'Echoes arrive late. People still lower buckets out of habit and pull up air.',
    tags: ['cistern', 'dry'],
  },
  {
    name: 'The clock attic',
    one_liner: 'Gears that keep a time no one asked for.',
    subject: 'an attic of clocks',
    detail: 'None of the faces agree. One of them is always right for a town you have not reached.',
    tags: ['attic', 'clocks'],
  },
  {
    name: 'The unlisted quay',
    one_liner: 'A dock that does not appear on the harbor map.',
    subject: 'a quay without a name',
    detail: 'Boats tie up and leave no cargo. The ropes remember more than the clerks do.',
    tags: ['quay', 'unlisted'],
  },
  {
    name: 'The extra seat',
    one_liner: 'A place kept empty on purpose.',
    subject: 'a seat for someone else',
    detail: 'The table is set for more than the household. The empty place is the point.',
    tags: ['seat', 'offered'],
  },
];

export const CATALOG: Readonly<Record<string, readonly CatalogEntry[]>> = {
  thing: THINGS,
  outcome: OUTCOMES,
  change: CHANGES,
  person: [...PEOPLE, ...FIGURE_PEOPLE],
  place: [...PLACES, ...FIGURE_PLACES],
};
