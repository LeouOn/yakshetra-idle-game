/**
 * Prohibited sacred/devotional names — embedded as a TypeScript constant.
 *
 * This is the BROWSER-SAFE copy of the closed list. The authoritative source
 * is `advisory/prohibited-names.txt` (one name per line, comments with `#`).
 * This file exists because `process.cwd()` + `readFileSync` (the original
 * load mechanism) crashes in the browser — the web bundle has no filesystem.
 *
 * If you add a name to `advisory/prohibited-names.txt`, add it here too.
 * The test at `src/content/__tests__/lint.test.ts` verifies this array
 * matches the .txt file when running under Node.
 *
 * Diacritic and ASCII transliterations of the same figure are both listed
 * so the lint catches either spelling.
 */
export const PROHIBITED_NAMES: readonly string[] = [
  'Shakyamuni',
  'Buddha',
  'Amitabha',
  'Amida',
  'Amitayus',
  'Avalokiteshvara',
  'Avalokiteśvara',
  'Guanyin',
  'Kannon',
  'Chenrezig',
  'Manjushri',
  'Mañjuśrī',
  'Wenshu',
  'Monju',
  'Samantabhadra',
  'Puxian',
  'Fugen',
  'Ksitigarbha',
  'Kṣitigarbha',
  'Dizang',
  'Jizo',
  'Mahasthamaprapta',
  'Mahāsthāmaprāpta',
  'Dashizhi',
  'Daesaeji',
  'Seishi',
  'Tara',
  'Tārā',
  'Drolma',
  'Maitreya',
  'Mila',
  'Milarepa',
  'Padmasambhava',
  'Tsongkhapa',
  'Nagarjuna',
  'Nāgārjuna',
  'Atisha',
  'Shantideva',
  'Śāntideva',
  'Bodhidharma',
];
