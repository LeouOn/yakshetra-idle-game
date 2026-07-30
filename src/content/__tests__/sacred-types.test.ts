import { describe, expect, test } from 'vitest';

import { BuddhistFigureSchema, MantraSchema, SutraSchema } from '../schema';

const VALID_SUTRA = {
  id: 'sutra:diamond',
  title_sid: 'sutra.diamond.title_sid',
  transliterated_title_sid: 'sutra.diamond.translit_sid',
  translator_sid: 'sutra.diamond.translator_sid',
  translation_era_sid: 'sutra.diamond.era_sid',
  description_sid: 'sutra.diamond.desc_sid',
  excerpt_sid: 'sutra.diamond.excerpt_sid',
  attribution_note_sid: 'sutra.diamond.attribution_sid',
  school: 'prajnaparamita',
  language_of_origin: 'sanskrit',
};

const VALID_MANTRA = {
  id: 'mantra:compassion',
  label_sid: 'mantra.compassion.label_sid',
  transliteration_sid: 'mantra.compassion.translit_sid',
  translation_sid: 'mantra.compassion.translation_sid',
  associated_figure_id: 'figure:bodhisattva-of-compassion',
  practice_lens: 'collected_attention',
  description_sid: 'mantra.compassion.desc_sid',
  source_sutra_id: 'sutra:diamond',
};

const VALID_FIGURE = {
  id: 'figure:bodhisattva-of-compassion',
  display_name_sid: 'figure.compassion.display_name_sid',
  transliterated_names: ['avalokitesvara', 'guanyin'],
  role: 'bodhisattva',
  primary_attribute_sid: 'figure.compassion.attribute_sid',
  mantra_id: 'mantra:compassion',
  sutra_ids: ['sutra:diamond', 'sutra:lotus'],
  iconography_sid: 'figure.compassion.iconography_sid',
  reverence_note_sid: 'figure.compassion.reverence_sid',
};

describe('SutraSchema', () => {
  test('accepts a valid sutra', () => {
    const r = SutraSchema.safeParse(VALID_SUTRA);
    expect(r.success).toBe(true);
  });

  test('accepts every school value', () => {
    for (const school of [
      'prajnaparamita',
      'pure-land',
      'chan',
      'tiantai',
      'huayan',
      'vinaya',
      'miscellaneous-mahayana',
    ]) {
      const r = SutraSchema.safeParse({ ...VALID_SUTRA, school });
      expect(r.success).toBe(true);
    }
  });

  test('accepts every language_of_origin value', () => {
    for (const language_of_origin of ['sanskrit', 'chinese-indigenous', 'unknown']) {
      const r = SutraSchema.safeParse({ ...VALID_SUTRA, language_of_origin });
      expect(r.success).toBe(true);
    }
  });

  test('rejects an unknown school', () => {
    const r = SutraSchema.safeParse({ ...VALID_SUTRA, school: 'theravada' });
    expect(r.success).toBe(false);
  });

  test('rejects an unknown language_of_origin', () => {
    const r = SutraSchema.safeParse({ ...VALID_SUTRA, language_of_origin: 'pali' });
    expect(r.success).toBe(false);
  });

  test('rejects an extra field under .strict()', () => {
    const r = SutraSchema.safeParse({ ...VALID_SUTRA, extra: true });
    expect(r.success).toBe(false);
  });

  test('rejects a missing excerpt_sid', () => {
    const { excerpt_sid: _omit, ...rest } = VALID_SUTRA;
    void _omit;
    const r = SutraSchema.safeParse(rest);
    expect(r.success).toBe(false);
  });
});

describe('MantraSchema', () => {
  test('accepts a valid mantra', () => {
    const r = MantraSchema.safeParse(VALID_MANTRA);
    expect(r.success).toBe(true);
  });

  test('accepts a null associated_figure_id', () => {
    const r = MantraSchema.safeParse({ ...VALID_MANTRA, associated_figure_id: null });
    expect(r.success).toBe(true);
  });

  test('accepts a null source_sutra_id', () => {
    const r = MantraSchema.safeParse({ ...VALID_MANTRA, source_sutra_id: null });
    expect(r.success).toBe(true);
  });

  test('accepts every practice_lens value', () => {
    for (const practice_lens of ['collected_attention', 'discernment']) {
      const r = MantraSchema.safeParse({ ...VALID_MANTRA, practice_lens });
      expect(r.success).toBe(true);
    }
  });

  test('rejects an unknown practice_lens (the four other lenses)', () => {
    const r = MantraSchema.safeParse({ ...VALID_MANTRA, practice_lens: 'generosity' });
    expect(r.success).toBe(false);
  });

  test('rejects an extra field under .strict()', () => {
    const r = MantraSchema.safeParse({ ...VALID_MANTRA, extra: true });
    expect(r.success).toBe(false);
  });

  test('rejects a missing description_sid', () => {
    const { description_sid: _omit, ...rest } = VALID_MANTRA;
    void _omit;
    const r = MantraSchema.safeParse(rest);
    expect(r.success).toBe(false);
  });
});

describe('BuddhistFigureSchema', () => {
  test('accepts a valid figure', () => {
    const r = BuddhistFigureSchema.safeParse(VALID_FIGURE);
    expect(r.success).toBe(true);
  });

  test('accepts every role value', () => {
    for (const role of [
      'historical-buddha',
      'pure-land-buddha',
      'cosmic-buddha',
      'bodhisattva',
      'historical-teacher',
      'arhat',
    ]) {
      const r = BuddhistFigureSchema.safeParse({ ...VALID_FIGURE, role });
      expect(r.success).toBe(true);
    }
  });

  test('accepts a null mantra_id', () => {
    const r = BuddhistFigureSchema.safeParse({ ...VALID_FIGURE, mantra_id: null });
    expect(r.success).toBe(true);
  });

  test('accepts an empty sutra_ids array', () => {
    const r = BuddhistFigureSchema.safeParse({ ...VALID_FIGURE, sutra_ids: [] });
    expect(r.success).toBe(true);
  });

  test('rejects an empty transliterated_names (min(1))', () => {
    const r = BuddhistFigureSchema.safeParse({ ...VALID_FIGURE, transliterated_names: [] });
    expect(r.success).toBe(false);
  });

  test('rejects an unknown role', () => {
    const r = BuddhistFigureSchema.safeParse({ ...VALID_FIGURE, role: 'deity' });
    expect(r.success).toBe(false);
  });

  test('rejects an extra field under .strict()', () => {
    const r = BuddhistFigureSchema.safeParse({ ...VALID_FIGURE, extra: true });
    expect(r.success).toBe(false);
  });

  test('rejects a missing reverence_note_sid', () => {
    const { reverence_note_sid: _omit, ...rest } = VALID_FIGURE;
    void _omit;
    const r = BuddhistFigureSchema.safeParse(rest);
    expect(r.success).toBe(false);
  });
});

describe('loadEraPack — sutras + mantras + figures loading', () => {
  test('LoadedEraPack carries the populated sacred-text collections for tang-china', async () => {
    const { loadEraPack } = await import('../loader');
    const pack = loadEraPack('tang-china');
    expect(Array.isArray(pack.sutras)).toBe(true);
    expect(pack.sutras.length).toBe(7);
    expect(Array.isArray(pack.mantras)).toBe(true);
    expect(pack.mantras.length).toBe(10);
    expect(Array.isArray(pack.figures)).toBe(true);
    expect(pack.figures.length).toBe(32);
  });

  test('LoadedEraPack carries the new fields for fantasy-mahayana too', async () => {
    const { loadEraPack } = await import('../loader');
    const pack = loadEraPack('fantasy-mahayana');
    expect(Array.isArray(pack.sutras)).toBe(true);
    expect(Array.isArray(pack.mantras)).toBe(true);
    expect(Array.isArray(pack.figures)).toBe(true);
  });
});

describe('registry — EraBundle carries the new fields', () => {
  test('EraBundle type carries sutras/mantras/figures for both eras', async () => {
    const { getEraBundle, listEraIds } = await import('../registry');
    for (const id of listEraIds()) {
      const bundle = getEraBundle(id);
      expect(bundle).toHaveProperty('sutras');
      expect(bundle).toHaveProperty('mantras');
      expect(bundle).toHaveProperty('figures');
    }
  });
});
