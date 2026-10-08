// Stage contrast (wave 2c) — WCAG AA over the reveal stage's token pairs.
// The ratio is computed from the theme colors the component actually uses,
// so a token drift that drops a chip below 4.5:1 fails here, not in a browser.
import { describe, expect, it } from 'vitest';

import { rarityColor } from '@/ui/components/StudioRevealStage';
import { studioTheme as t } from '@/ui/studio-theme';
import type { Manifest } from '@/engine';

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

describe('reveal stage contrast (WCAG AA)', () => {
  const rarities: readonly Manifest['rarity'][] = ['common', 'uncommon', 'rare'];

  it('chip text meets 4.5:1 against the chip background for every rarity', () => {
    for (const rarity of rarities) {
      expect(contrast(rarityColor(rarity), t.bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('the rarity edge reads against the card surface (UI edge, 3:1)', () => {
    for (const rarity of rarities) {
      expect(contrast(rarityColor(rarity), t.surface)).toBeGreaterThanOrEqual(3);
    }
  });

  it('primary button text meets 4.5:1 on the tinted button for every rarity', () => {
    for (const rarity of rarities) {
      expect(contrast(t.bg, rarityColor(rarity))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('card prose meets 4.5:1 on the card surface', () => {
    expect(contrast(t.text, t.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.muted, t.surface)).toBeGreaterThanOrEqual(4.5);
  });
});
