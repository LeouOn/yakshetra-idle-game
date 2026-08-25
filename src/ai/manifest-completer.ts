// Model completer for the Manifest harvest (SPEC §16.2). Lives OUTSIDE the
// engine: this module fetches, the engine never does. The completer returns
// raw parsed JSON as `unknown`; schema validation belongs to
// `fillManifestSafe` + `oneShotFiller` in the engine. Any failure here
// (network, non-2xx, missing content, non-JSON) rejects — the UI falls back
// to tables.

import type { ManifestCompileRequest } from '@/engine/fill-adapter';

import { PROVIDERS, providerKey, type ProviderConfig, type ProviderId } from './providers';

export type ManifestCompleter = (request: ManifestCompileRequest) => Promise<unknown>;

/** Structural slice of Response the completer needs — mocks stay cheap. */
export interface FetchResponseLike {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}

export type FetchLike = (url: string, init: RequestInit) => Promise<FetchResponseLike>;

export type EnvReader = (key: string) => string | undefined;

/** 0.7 sits inside both providers' ranges (Z.ai max 1.0, MiniMax max 2.0). */
const TEMPERATURE = 0.7;
const MAX_TOKENS = 2048;

/** MiniMax M-series thinking emits <think>…</think> inside content; strip before parse. */
export function stripThinkBlocks(content: string): string {
  return content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

/**
 * Instructions per SPEC §16.2: one JSON object, envelope echoed from the
 * request, prose slots filled, no chat reply, no attainment claims, no
 * extra keys. The model returns manifest/v1 (v0's kind enum cannot carry
 * the higher-scale kinds; parseManifest accepts v1 natively).
 */
export function buildCompleterPrompt(request: ManifestCompileRequest, revision: string): string {
  return [
    'You fill one card for an idle game. Reply with a single JSON object and nothing else.',
    'The object must satisfy this schema exactly:',
    '- schema_version: "manifest/v1"',
    `- id: "${request.id}"`,
    `- rng_seed: "${request.rng_seed}"`,
    `- brief: ${JSON.stringify(request.brief)}`,
    `- residue_window_id: "${request.residue_window_id}"`,
    '- kind: one of "thing", "outcome", "change", "person", "place" — pick by these rules, in order: residue dominated by level-ups → "change"; by resolved events → "outcome"; two or more distinct ids with an event or lens marker → "person"; two or more practice ids without a marker → "place"; empty → "thing". Keep the picked kind unless the residue clearly demands another by these same rules.',
    `- scale: "${request.scale}"`,
    '- name, one_liner, subject, detail: fill these four yourself. Named figures in the residue ids or life context are in play — if the window is about a figure, the card is about that figure and about_id/about_name are the figure id and display name. Prose is concrete, adult, a sentence or two. No attainment claims, no merit, no karma.',
    '- tags: three to five short tags',
    '- rarity: one of "common", "uncommon", "rare"',
    '- fill_status: "model"',
    '- quality_tier: ' + String(request.quality_tier),
    `- provenance: { "source": "model", "revision": "${revision}" }`,
    'If the window is about a figure, add about_id and about_name (the figure id and its display name). Otherwise omit both keys.',
    'Do not add any other keys. Do not write a chat reply.',
    'The residue window and life context follow as JSON:',
    JSON.stringify(request),
  ].join('\n');
}

interface ChatChoicesShape {
  readonly choices?: readonly { readonly message?: { readonly content?: unknown } }[];
}

function isChatChoicesShape(value: unknown): value is ChatChoicesShape {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const choices = (value as { readonly choices?: unknown }).choices;
  return Array.isArray(choices);
}

function extractContent(data: unknown): string {
  if (!isChatChoicesShape(data)) {
    throw new Error('completer: response has no choices array');
  }
  const first = data.choices?.[0];
  const content = first?.message?.content;
  if (typeof content !== 'string' || content.length === 0) {
    throw new Error('completer: choices[0].message.content is missing');
  }
  return content;
}

export function createManifestCompleter(
  providerId: ProviderId,
  apiKey: string,
  fetchImpl: FetchLike = fetch,
): ManifestCompleter {
  const provider: ProviderConfig = PROVIDERS[providerId];
  return async (request) => {
    const body = {
      model: provider.model,
      messages: [
        { role: 'system', content: buildCompleterPrompt(request, provider.revision) },
        { role: 'user', content: JSON.stringify(request) },
      ],
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      stream: false,
      thinking: { type: 'disabled' },
      ...(provider.jsonMode ? { response_format: { type: 'json_object' } } : {}),
    };
    const response = await fetchImpl(provider.baseUrl + provider.path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`completer: ${provider.id} responded ${response.status}`);
    }
    const data = await response.json();
    const cleaned = stripThinkBlocks(extractContent(data));
    return JSON.parse(cleaned);
  };
}

/**
 * First-found-wins: an explicit YAK_FILLER_PROVIDER picks its provider's key;
 * otherwise ZAI_API_KEY, then MINIMAX_API_KEY. No key anywhere → null (the
 * UI harvest stays on tables). Never call this from the default Expo bundle.
 */
export function makeCompleterFromEnv(
  env: EnvReader,
  fetchImpl: FetchLike = fetch,
): ManifestCompleter | null {
  const explicit = env('YAK_FILLER_PROVIDER');
  if (explicit === 'zai' || explicit === 'minimax') {
    const key = env(providerKey(explicit));
    return key === undefined ? null : createManifestCompleter(explicit, key, fetchImpl);
  }
  for (const id of ['zai', 'minimax'] as const satisfies readonly ProviderId[]) {
    const key = env(providerKey(id));
    if (key !== undefined) {
      return createManifestCompleter(id, key, fetchImpl);
    }
  }
  return null;
}
