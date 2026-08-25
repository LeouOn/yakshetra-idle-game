import { describe, expect, it } from 'vitest';

import { PROVIDERS, providerKey } from '../providers';

describe('provider registry', () => {
  it('ships exactly zai and minimax with OpenAI-shaped endpoints', () => {
    expect(Object.keys(PROVIDERS).sort()).toEqual(['minimax', 'zai']);
    expect(PROVIDERS.zai.baseUrl).toBe('https://api.z.ai/api/paas/v4');
    expect(PROVIDERS.zai.path).toBe('/chat/completions');
    expect(PROVIDERS.minimax.baseUrl).toBe('https://api.minimax.io/v1');
    expect(PROVIDERS.minimax.path).toBe('/chat/completions');
  });

  it('marks JSON mode Z.ai-only (MiniMax ignores response_format)', () => {
    expect(PROVIDERS.zai.jsonMode).toBe(true);
    expect(PROVIDERS.minimax.jsonMode).toBe(false);
  });

  it('carries a revision slug per provider for provenance', () => {
    expect(PROVIDERS.zai.revision).toBe('zai/glm-4.6');
    expect(PROVIDERS.minimax.revision).toBe('minimax/MiniMax-M3');
  });

  it('maps providers to their env keys', () => {
    expect(providerKey('zai')).toBe('ZAI_API_KEY');
    expect(providerKey('minimax')).toBe('MINIMAX_API_KEY');
  });
});
