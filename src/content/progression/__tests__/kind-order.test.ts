// Kind-row ordering per scale (wave 1b, lane b1).
//
// SPEC §6 lists the pick rules in order: level-up windows → change FIRST,
// then social windows → person. The engine's DEFAULT_KIND_RULES follow that
// order at person scale, but the authored tier rows put the social kind
// before the level kind — so once engagement markers made social windows
// common, the level kinds (heirloom, monument, road, edict, horizon) starved
// and the region/nation/world gates (which require them) became unreachable.
// This pins the SPEC order for every scale.
import { describe, expect, it } from 'vitest';

import { loadProgression } from '@/content/progression/loader';
import { DEFAULT_KIND_RULES } from '@/engine/kind-registry';

describe('kind rule order per scale', () => {
  it('person-scale content rows mirror DEFAULT_KIND_RULES exactly', () => {
    const personRows = loadProgression()
      .kindRows.filter((row) => row.scale === 'person')
      .map((row) => row.id);
    const defaults = DEFAULT_KIND_RULES.map((rule) => rule.kind);
    expect(personRows).toEqual(defaults);
  });

  it('every scale puts its level kind before its social kind', () => {
    const { kindRows } = loadProgression();
    const scales = [...new Set(kindRows.map((row) => row.scale))];
    expect(scales.length).toBeGreaterThan(1);
    for (const scale of scales) {
      const rows = kindRows.filter((row) => row.scale === scale);
      const matchOf = (id: string) => rows.filter((row) => row.id === id)[0]?.match ?? null;
      // The level kind is the row matching dominant practice_level; the
      // social kind is the row matching social windows.
      const levelIndex = rows.findIndex((row) => row.match.dominant === 'practice_level');
      const socialIndex = rows.findIndex((row) => row.match.social === true);
      expect(levelIndex).toBeGreaterThanOrEqual(0);
      expect(socialIndex).toBeGreaterThanOrEqual(0);
      expect(levelIndex).toBeLessThan(socialIndex);
      expect(matchOf(rows[socialIndex]?.id ?? '')).not.toBeNull();
    }
  });
});
