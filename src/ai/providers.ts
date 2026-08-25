// Provider registry for the model harvest (SPEC §16.2, harvest-quality
// program §4). One OpenAI-shaped request core; per-provider facts live HERE
// as data — changing a model is a code edit plus a re-read of the provider
// docs, never an env var. Keys (ZAI_API_KEY / MINIMAX_API_KEY) are read by
// the caller, never here.

export type ProviderId = 'zai' | 'minimax';

export interface ProviderConfig {
  readonly id: ProviderId;
  readonly baseUrl: string;
  readonly path: string;
  readonly model: string;
  /** true → send response_format json_object (Z.ai supports it; MiniMax does not). */
  readonly jsonMode: boolean;
  /** Stamped into the prompt so the model echoes it in provenance.revision. */
  readonly revision: string;
}

export const PROVIDERS: Readonly<Record<ProviderId, ProviderConfig>> = {
  zai: {
    id: 'zai',
    baseUrl: 'https://api.z.ai/api/paas/v4',
    path: '/chat/completions',
    model: 'glm-4.6',
    jsonMode: true,
    revision: 'zai/glm-4.6',
  },
  minimax: {
    id: 'minimax',
    baseUrl: 'https://api.minimax.io/v1',
    path: '/chat/completions',
    model: 'MiniMax-M3',
    jsonMode: false,
    revision: 'minimax/MiniMax-M3',
  },
};

export function providerKey(id: ProviderId): string {
  return id === 'zai' ? 'ZAI_API_KEY' : 'MINIMAX_API_KEY';
}
