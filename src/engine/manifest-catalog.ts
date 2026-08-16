// Authored card catalogs for Manifest table-fill. Pure content-as-data:
// no imports beyond the kind union, no logic. Adding a kind = add a table
// here and register it in CATALOG.

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
    name: 'The night clerk',
    one_liner: 'Remembers what you owe before you do.',
    subject: 'a keeper of small debts',
    detail:
      'The ledger stays open at strange hours. They never charge for the waiting, and they never forget the tab.',
    tags: ['clerk', 'debts'],
  },
  {
    name: 'The early courier',
    one_liner: 'Arrives an hour before the letter says.',
    subject: 'a courier ahead of schedule',
    detail:
      'The parcel is always what you needed yesterday. They refuse the tip and are gone before the gate closes.',
    tags: ['courier', 'early'],
  },
  {
    name: 'The keyholder next door',
    one_liner: 'Keeps a spare key and does not use it.',
    subject: 'a neighbor holding a key',
    detail:
      'The key has opened your door exactly once, in weather you no longer discuss. It hangs by theirs, quiet as a promise.',
    tags: ['neighbor', 'key'],
  },
  {
    name: 'The ferry counter',
    one_liner: 'Counts everyone across, twice.',
    subject: 'a counter of crossings',
    detail:
      'The morning tally and the evening tally never match. They say the river keeps the difference, and they keep the ledger straight.',
    tags: ['ferry', 'tally'],
  },
  {
    name: 'The quiet mender',
    one_liner: 'Fixed the fence before you noticed it broke.',
    subject: 'an unasked mender',
    detail: 'No note, no bill. The work is good enough that someone must pass this way often.',
    tags: ['mender', 'unasked'],
  },
  {
    name: 'The courtyard guest',
    one_liner: 'Neither pet nor stranger. Just here.',
    subject: 'a being in the yard',
    detail:
      'It eats what is left and watches the door. You have started leaving the better scraps.',
    tags: ['guest', 'yard'],
  },
  {
    name: 'The evening caller',
    one_liner: 'Knocks once and waits, even when you are slow.',
    subject: 'someone at the door',
    detail: 'They do not fill the silence. The visit is the gift, and they know it.',
    tags: ['caller', 'evening'],
  },
  {
    name: 'The water-carrier',
    one_liner: "Fills other people's jars first.",
    subject: 'a carrier of water',
    detail: 'The well is public. They treat it as if it belonged to whoever is thirstiest.',
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
  person: PEOPLE,
  place: PLACES,
};
