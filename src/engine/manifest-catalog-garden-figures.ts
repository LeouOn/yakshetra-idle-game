// Garden-native and Garden-told Buddhist figures (era bible section 4; plan c1-garden-plan.md).
// Every row is `era: 'fantasy'`: a life that carries an era never draws one of these in Tang. A
// `figure:<id>` tag makes a row reachable by a window that names it (a pinned figure card).
// No row is bound to a Garden practice. Measured with the kind-mix instrument (30 seeds), a bound
// figure row fires on every fifth harvest whose window carries its practice and forces the card
// kind to person, which moved the Garden's place share from 34% to 8%; so these rows are reached
// through the shared pool, and, once Patch C exists, through Sought recipes.
//
// The figures do a deed; they never preach, grade or promise (SPEC section 3). Sources, claim by
// claim, are in the sources ledger delivered with this patch: Dṛḍhā (Golden Light Sūtra, T 663 ch. 9),
// Kumbhīra and the twelve generals (T 450), Sudhana (Gaṇḍavyūha), Ākāśagarbha (T 405, T 409, T 1145).
// The Gardener of the Notched Spade and the Bell Warden Cor are the game's own and claim no scripture.

import type { CatalogEntry } from './manifest-catalog';

/** The figure ids this file adds (Cor's tag lives on his existing row in manifest-catalog.ts). */
export const GARDEN_FIGURE_IDS = [
  'figure:drdha',
  'figure:kumbhira',
  'figure:sudhana',
  'figure:akasagarbha',
  'figure:garden-gardener',
  'figure:garden-cor',
] as const;

export const GARDEN_FIGURE_PEOPLE: readonly CatalogEntry[] = [
  {
    name: 'Dṛḍhā, the Firm',
    one_liner: 'Kneeling under the low bench with the weight of the seat on her head.',
    subject: 'the one kneeling under the bench',
    detail:
      'Dṛḍhā kneels under the low bench with the crown of her head against the underside of the seat, and she does not shift when anyone sits down. The ground around her knees is dark and loose. The hedge behind the bench has put on a season of growth in a week.',
    long_fire:
      " The bench legs have sunk a hand's breadth into ground that was hard clay last winter, and she has not moved.",
    rare: ' Herbs nobody sowed come up in the cracks beside the bench, and Dṛḍhā leaves every one of them standing.',
    tags: ['figure:drdha', 'bench', 'soil', 'hedge'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'A stranger sits down on the low bench without looking, and the bench does not rock. Under it a pair of bare knees press into the soil, and the soil around them is the colour of wet slate.',
        tags: ['bench', 'soil', 'knees'],
      },
      {
        detail:
          'The hedge behind the bench is greener at the root than anywhere else along the walk. Under the seat there is a hollow in the soil the size and shape of a kneeling woman.',
        tags: ['hedge', 'hollow', 'seat'],
      },
    ],
  },
  {
    name: 'Kumbhīra, the ditch warden',
    one_liner: 'Heavy-shouldered, bracing a timber screen against the storm edge.',
    subject: 'the one bracing the storm screen',
    detail:
      'Kumbhīra is one of twelve who hold the outer ditch, each with a company at his back, and he is the one you meet first because the screen at the gate is his. He sets his shoulder to the timber and waits until the squall has leaned on it all it means to.',
    long_fire:
      " A five-coloured cord hangs from the screen's post with a name knotted into it, and he lets it hang.",
    rare: ' Eleven others hold the rest of the ditch, and he can tell each one by the sound of the mallet.',
    tags: ['figure:kumbhira', 'ditch', 'screen', 'storm'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'The timber screen groans under the gust and Kumbhīra groans with it, a low note, not unfriendly, and neither of them gives. When the wind drops he tries each peg with the flat of his hand.',
        tags: ['screen', 'wind', 'peg'],
      },
      {
        detail:
          'The sky above the ditch is the colour of a bruise, and Kumbhīra is already standing in the gap where the screen has sprung a board. He does not look round at who has come to watch.',
        tags: ['ditch', 'gap', 'board'],
      },
    ],
  },
  {
    name: 'Sudhana, who asks at every door',
    one_liner: 'Dusty to the knee, asking the first person he meets how they learned their work.',
    subject: 'the young traveler at the door',
    detail:
      'Sudhana comes up from the road with dust to the knee and asks the first person he meets how they learned what they do. He listens to the whole answer, thanks them, and goes on to the next door as if there were a great many more behind it.',
    long_fire:
      ' He writes nothing down; the dust on his boots is the only record of the doors he has passed.',
    rare: ' A woman at the basin and a child at the hedge have each taught him something, and he thanked them both the same way.',
    tags: ['figure:sudhana', 'road', 'door', 'question'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'A young traveler stands at the washing basin asking the woman there how she keeps the water clear, and she tells him, slowly, because he is writing none of it down. Then he bows and is gone down the walk.',
        tags: ['basin', 'question', 'walk'],
      },
      {
        detail:
          'Sudhana has been asking at doors since before the road dried, and the boots show it. At the low gate he asks only one thing, and the answer takes the whole of the afternoon.',
        tags: ['gate', 'boots', 'question'],
      },
    ],
  },
  {
    name: 'Ākāśagarbha, keeper of the empty slate',
    one_liner: 'Setting a clean slate beside the memory stone, and waiting.',
    subject: 'the one with the clean slate',
    detail:
      'Ākāśagarbha sets a clean slate down beside the memory stone and sits where the open space between the benches is widest. He does not read what is cut into the stone, and he does not hurry anyone who is still reading.',
    long_fire:
      ' The slate has been wiped so often the surface has gone smooth as the inside of a bowl.',
    rare: ' On the nights the stones are hardest to read, the empty place beside him is the only one on the bench that stays empty.',
    tags: ['figure:akasagarbha', 'slate', 'memory', 'stone'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'Beside the memory stone there is a slate with nothing written on it, and a man sitting by it who is looking at the open sky above the benches rather than at the stone. When you finish reading, he slides the slate a little nearer.',
        tags: ['slate', 'stone', 'sky'],
      },
      {
        detail:
          'Ākāśagarbha keeps the space between the benches clear the way others keep a hedge, and the clear space has a shape, wide and level and unhurried, that people walk into without being told.',
        tags: ['space', 'benches', 'clear'],
      },
    ],
  },
  {
    name: 'The Gardener of the Notched Spade',
    one_liner: 'Leaning on the notched spade at the low gate and saying nothing.',
    subject: 'the one with the notched spade',
    detail:
      'A traveler goes down at the low gate, ashamed of what they carried across, and the Gardener leans the spade on the post and kneels beside them. The dried mud on their boots comes away under the notched edge in long flakes, and the Gardener points toward the hearth and does not say a word of reproach.',
    long_fire:
      ' The notch in the spade fits the lip of the gate latch exactly, as if one had been cut to mind the other.',
    rare: ' Nobody has seen the Gardener sleep, and the furrows are straight again by morning.',
    tags: ['figure:garden-gardener', 'spade', 'gate', 'mud'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'The Gardener cuts the blackthorn back from the flagged path without hurry, one stroke for each shoot, and stops when you stop. Then the spade goes back against the post and the question comes: what did you carry across?',
        tags: ['blackthorn', 'path', 'question'],
      },
      {
        detail:
          'Where the Gardener has been, the furrows run dark and straight, and there is a spade-width of turned earth beside every bench. The spade itself leans at the gate, notch out, as if someone had only just put it down.',
        tags: ['furrows', 'bench', 'earth'],
      },
    ],
  },
];

/** Harvest material tied to a Garden figure: Kumbhīra's five-coloured vow cord (T 450). */
export const GARDEN_FIGURE_THINGS: readonly CatalogEntry[] = [
  {
    name: 'A five-coloured vow cord',
    one_liner: 'Five threads twisted tight, with a name knotted into the middle.',
    subject: 'the cord with a name in it',
    detail:
      'Five threads, one of each colour, twisted tight, and a name knotted into the middle of the cord by a hand that was not steady. The knot is to be undone when what was asked for has come, and not before.',
    long_fire:
      ' The colours have run a little where a thumb worked the knot, and the knot has not slipped.',
    rare: ' Someone has undone a knot like this one before, and the creases of the old knot are still in the thread.',
    tags: ['figure:kumbhira', 'cord', 'thread', 'vow'],
    era: 'fantasy',
  },
];
