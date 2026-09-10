// Named-figure catalog rows (SPEC §16.1). Each row carries exactly one
// `figure:<id>` tag; other tags bind the mantras and practices that name the
// figure, so the compiler can prefer the row when residue carries those ids.
// Prose is descriptive — iconography, role, Tang context — never doctrinal
// claims and never fabricated sayings. Pure data, like manifest-catalog.

import type { CatalogEntry } from './manifest-catalog';

/** The twelve core Tang figures, in figures.json5 order. */
export const FIGURE_IDS = [
  'figure:shakyamuni',
  'figure:amitabha',
  'figure:medicine-buddha',
  'figure:vairocana',
  'figure:maitreya',
  'figure:avalokiteshvara',
  'figure:manjushri',
  'figure:samantabhadra',
  'figure:ksitigarbha',
  'figure:mahasthamaprapta',
  'figure:nagarjuna',
  'figure:bodhidharma',
] as const;

export const FIGURE_PEOPLE: readonly CatalogEntry[] = [
  {
    name: 'Śākyamuni',
    one_liner:
      'He touches the bare earth when challenged, calling the common soil itself as witness.',
    subject: 'the teacher touching the earth',
    detail:
      'He walks the morning street with an earthen bowl, stopping wherever ordinary work is done. When doubts rise, he presses his right fingers into the common dust, refusing debate while the firm ground answers for him.',
    tags: ['figure:shakyamuni', 'teacher', 'historical'],
  },
  {
    name: 'Amitābha',
    one_liner: "He extends an open hand westward each dusk as the day's labor closes.",
    subject: 'the welcoming light of the west',
    detail:
      'At sundown when the market drum signals closing, his name passes among tired laborers packing their stalls. He leans outward from the western sky with an open palm, taking in every weary call without asking for credentials.',
    tags: ['figure:amitabha', 'mantra:nianfo', 'practice:tang/nianfo-recitation', 'western'],
  },
  {
    name: 'Bhaiṣajyaguru, the Medicine Buddha',
    one_liner: 'He offers bitter herbs and clean water to whoever is burning with fever.',
    subject: 'the healer with the medicine bowl',
    detail:
      'He sits beside the sickbed with an iron bowl of steeped myrobalan, cooling hot foreheads through the midnight watch. His twelve vows answer common aches directly, dispensing bitter draughts without asking what copper is in your purse.',
    tags: [
      'figure:medicine-buddha',
      'mantra:medicine-buddha',
      'practice:tang/medicine-rite',
      'healing',
    ],
  },
  {
    name: 'Vairocana',
    one_liner: 'He illuminates every rafter, loom, and dust mote without casting a single shadow.',
    subject: 'the primordial light at work',
    detail:
      "He turns his hands in the wisdom-fist, sending dawn through the courtyard tiles and kitchen smoke. Nothing is pushed aside; the cobbler's hammer and the abbot's bell catch the same unbroken brightness at the very same instant.",
    tags: ['figure:vairocana', 'cosmic', 'huayan'],
  },
  {
    name: 'Maitreya',
    one_liner: 'He sits with ankles crossed, leaning forward to watch the city wake.',
    subject: 'the coming teacher keeping watch',
    detail:
      "He rests his chin on two fingers, watching the carts roll through Chang'an's south gate. He has prepared his seat for centuries, yet his gaze stays fixed on muddy sandals and hurried footsteps, waiting for his hour to step down.",
    tags: ['figure:maitreya', 'future', 'patience'],
  },
  {
    name: 'Avalokiteśvara (Guanyin)',
    one_liner: 'She dips a willow branch in clean water and steps into the crowded lane.',
    subject: 'the hearer of cries stepping near',
    detail:
      'She walks directly toward shouting boatmen and frightened children, listening before anyone explains the trouble. With a flick of the damp willow she cools the heat of an argument, changing shape so easily that you mistake her for an aunt.',
    tags: [
      'figure:avalokiteshvara',
      'mantra:six-syllable',
      'practice:tang/six-syllable-recitation',
      'compassion',
      'guanyin',
    ],
  },
  {
    name: 'Mañjuśrī (Wenshu)',
    one_liner: 'He raises a flaming blade to sever the tangled knot of your dispute.',
    subject: 'the sword cutting the knot',
    detail:
      'He rides down through northern pine groves on a roaring green lion, holding a palm-leaf scroll in his left hand. The bright blade does not strike flesh; it cleaves through stubborn evasions and muddled ledgers until only honest ground remains.',
    tags: ['figure:manjushri', 'wisdom', 'sword', 'wutai'],
  },
  {
    name: 'Samantabhadra (Puxian)',
    one_liner: 'He urges his six-tusked mount along the rocky ditch to haul the wagon out.',
    subject: 'the heavy labor carried through',
    detail:
      'Where sharp words settle the law, he arrives with ropes and an unhurried white elephant to do the digging. He steps into the mud alongside laborers, steadying timber and testing bridge foundations until the promised road is truly built.',
    tags: ['figure:samantabhadra', 'practice', 'elephant'],
  },
  {
    name: 'Kṣitigarbha (Dizang)',
    one_liner: 'He strikes the flagstones with his ringed staff, lighting the darkest pit.',
    subject: 'the staff ringing in the dark',
    detail:
      'He walks down into damp prisons and forgotten ditches where no candle is ever lit. His bronze rings chime against stone, shattering iron padlocks and guiding lost wanderers up the stairs by the glow of a warm jewel cupped in his palm.',
    tags: ['figure:ksitigarbha', 'vow', 'dizang'],
  },
  {
    name: 'Mahāsthāmaprāpta (Dashizhi)',
    one_liner: 'He steps onto the firm road and the ground shivers with sudden courage.',
    subject: 'the surging stride of wisdom',
    detail:
      "He stands at Amitābha's right shoulder, but his stride belongs to active ground. When indecision paralyzes a workshop, his heavy footstep shakes the rafters, waking sluggish minds and filling timid hands with quiet, resolute strength.",
    tags: ['figure:mahasthamaprapta', 'wisdom', 'western'],
  },
  {
    name: 'Nāgārjuna',
    one_liner: 'He sits in the courtyard taking apart rigid arguments like dry wicker.',
    subject: 'the dismantler of false claims',
    detail:
      'He leans over the stone bench with ink-stained fingers, showing that neither gain nor loss stands by itself. When disputants grow heated, he points to two rafters propping up the barn roof: each stands only because the other leans in.',
    tags: ['figure:nagarjuna', 'teacher', 'madhyamaka'],
  },
  {
    name: 'Bodhidharma',
    one_liner: 'He sits wrapped in rough wool, ignoring flowery speech to point at the stone.',
    subject: 'the teacher facing the rock',
    detail:
      'He sits through freezing frost on Shaoshi mountain with his boots kicked off and his gaze pinned to bare rock. When clever scholars arrive with written treatises, he turns his head just enough to tell them to fetch firewood instead.',
    tags: ['figure:bodhidharma', 'chan', 'teacher'],
  },
];

export const FIGURE_PLACES: readonly CatalogEntry[] = [
  {
    name: 'Wutai Shan',
    one_liner: "The northern mountain revered as Mañjuśrī's seat.",
    subject: 'a mountain of wisdom',
    detail:
      'Pilgrims climb past terraces where the sword is said to have been seen. The cold is part of the teaching, the way the climb is part of the arrival.',
    tags: ['figure:manjushri', 'mountain', 'pilgrimage'],
  },
  {
    name: 'Jiuhua Shan',
    one_liner: "The southern mountain of Kṣitigarbha's great vow.",
    subject: 'a mountain of the vow',
    detail:
      'Mist, stone steps, and a bell that the visitor from Korea is said to have rung first. The ground holds the promise longer than the season.',
    tags: ['figure:ksitigarbha', 'mountain', 'vow'],
  },
];
