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
    one_liner: 'The historical teacher, seated at the center of every hall.',
    subject: 'the historical teacher',
    detail:
      "Chang'an's monasteries seat him as the teacher of our era. The robe, the ushṇīṣa, the earth-touching gesture — fixed long before the Tang, and every school bows to the same form.",
    tags: ['figure:shakyamuni', 'teacher', 'historical'],
  },
  {
    name: 'Amitābha',
    one_liner: 'The Buddha of the Western direction, recited by name.',
    subject: 'the Buddha of the western direction',
    detail:
      "Pure Land halls in Chang'an chant his name through the day. The hand holds a lotus; the face waits for whoever looks west.",
    tags: ['figure:amitabha', 'mantra:nianfo', 'practice:tang/nianfo-recitation', 'western'],
  },
  {
    name: 'Bhaiṣajyaguru, the Medicine Buddha',
    one_liner: 'Called on when someone is sick.',
    subject: 'a healer of the sick',
    detail:
      'Tang monasteries held his rite for the ill. The bowl holds medicine, not gold, and the hand that lifts it does not ask who can pay.',
    tags: ['figure:medicine-buddha', 'mantra:medicine-buddha', 'healing'],
  },
  {
    name: 'Vairocana',
    one_liner: 'The cosmic Buddha the Huayan masters placed at the source.',
    subject: 'the cosmic Buddha',
    detail:
      'In Huayan halls he sits at the center of the array, and every other figure arranges itself around him like light around a lamp.',
    tags: ['figure:vairocana', 'cosmic', 'huayan'],
  },
  {
    name: 'Maitreya',
    one_liner: 'The future teacher, waiting in Tuṣita.',
    subject: 'the coming teacher',
    detail:
      'He is honored now for a patience the world has not needed yet. Tang sculptors give him a seat already, so the room is ready when he stands.',
    tags: ['figure:maitreya', 'future', 'patience'],
  },
  {
    name: 'Avalokiteśvara (Guanyin)',
    one_liner: 'The bodhisattva of great compassion, known here as Guanyin.',
    subject: 'the one who hears the cries',
    detail:
      "The Lotus Sutra's universal gate chapter reached Chang'an as Guanyin. A willow branch, a vase of water, and a willingness to arrive in whatever shape the hour needs.",
    tags: ['figure:avalokiteshvara', 'mantra:six-syllable', 'compassion', 'guanyin'],
  },
  {
    name: 'Mañjuśrī (Wenshu)',
    one_liner: 'The bodhisattva whose sword cuts confusion.',
    subject: 'wielding discriminative wisdom',
    detail:
      'Wutai Shan in the north is his seat. The sword is not raised at anyone; it is raised at the knot.',
    tags: ['figure:manjushri', 'wisdom', 'sword', 'wutai'],
  },
  {
    name: 'Samantabhadra (Puxian)',
    one_liner: 'The bodhisattva of great practice, riding the six-tusked elephant.',
    subject: 'practice carried through',
    detail:
      'The Lotus Sutra closes with him. Where Mañjuśrī cuts, he walks the ground afterward and makes the path real.',
    tags: ['figure:samantabhadra', 'practice', 'elephant'],
  },
  {
    name: 'Kṣitigarbha (Dizang)',
    one_liner: 'The bodhisattva who stays until the last cell opens.',
    subject: 'the great vow held',
    detail:
      'Dizang in Tang China, strongest at Jiuhua Shan. The staff rings in the places no one else goes, and he does not leave early.',
    tags: ['figure:ksitigarbha', 'vow', 'dizang'],
  },
  {
    name: 'Mahāsthāmaprāpta (Dashizhi)',
    one_liner: 'One of the three sages of the West, standing beside Amitābha.',
    subject: 'the power of wisdom arriving',
    detail:
      'Dashizhi in Chinese halls, less carved than his companions and named exactly as often in the sutras.',
    tags: ['figure:mahasthamaprapta', 'wisdom', 'western'],
  },
  {
    name: 'Nāgārjuna',
    one_liner: 'The teacher whose arguments grounded the Prajñāpāramitā.',
    subject: 'a founder of the middle way',
    detail:
      'Tang scholastics read him as the fourteenth patriarch of the lineages Chan claimed. The works are older than the claim and outlast it.',
    tags: ['figure:nagarjuna', 'teacher', 'madhyamaka'],
  },
  {
    name: 'Bodhidharma',
    one_liner: 'The teacher who came from the west and sat facing a wall.',
    subject: 'the first patriarch of Chan',
    detail:
      'Wall-gazing, one sandal, and a refusal to explain what can be done instead of said. Tang Chan traces its beginning to his arrival.',
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
