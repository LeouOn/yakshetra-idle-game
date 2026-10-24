// One name per era. The start screen reads the pack's `name_sid` (`tang.name_sid`,
// `fantasy.name_sid`); the bardo and the chain-complete screen read
// `era.<id>.name_sid`. They are two strings for one thing, and they had drifted
// ("Late Tang China" on one screen, "Tang Dynasty Chang’an" on the next). This
// pins them together so a player never meets one era under two names.

import { describe, expect, it } from 'vitest';

import { loadEraPack } from '@/content/loader';
import { resolveSid } from '@/i18n';

describe('era names', () => {
  for (const eraId of ['tang-china', 'fantasy-mahayana'] as const) {
    it(`${eraId} carries the same name on the start screen and in the bardo`, () => {
      const pack = loadEraPack(eraId);
      expect(resolveSid(`era.${eraId}.name_sid`)).toBe(resolveSid(pack.name_sid));
    });
  }

  it('names the Tang era after the capital, with the typographic apostrophe', () => {
    expect(resolveSid('era.tang-china.name_sid')).toBe('Late Tang Chang’an');
  });
});
