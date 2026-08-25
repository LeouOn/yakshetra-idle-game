# Phase 6: Model Harvest, Provider-Pluggable — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** At harvest, a host-injected model completer (Z.ai or MiniMax) writes the Manifest slots the tables write; any failure lands the player on a table card (SPEC §16.2, generalized per the harvest-quality program design §4).

**Architecture:** `src/ai/` (NEW, outside the engine) holds a provider registry and an async completer factory; the engine gains only a sync `oneShotFiller` so `fillManifestSafe` stays the single ingest. StudioView takes an optional `completeManifest` collaborator (default `undefined` → tables, no key in the bundle). Both harvest paths (person bay, tier benches) go model-first when the completer exists, falling back to their exact current table calls.

**Tech Stack:** TypeScript (strict, `exactOptionalPropertyTypes`), Vitest, OpenAI-shaped chat-completions HTTP (Z.ai `https://api.z.ai/api/paas/v4/chat/completions`, MiniMax `https://api.minimax.io/v1/chat/completions`).

## Global Constraints

- `src/engine/` stays pure and sync: no `fetch`, no `process.env`, no async. The completer lives in `src/ai/`; `src/engine` must never import `src/ai` (test-enforced in Task 2).
- `fillManifestSafe` is the only ingest. Invalid model output → table fallback. A table failure is never swallowed.
- Keys: `ZAI_API_KEY` / `MINIMAX_API_KEY` (selection override `YAK_FILLER_PROVIDER`). They appear ONLY in `src/ai/` and its tests. Never in `src/engine`, `src/ui`, `app/`, or git. The default Expo bundle never sees a key and never constructs a completer.
- Provider facts (librarian-verified 2026-08-24): Z.ai base `https://api.z.ai/api/paas/v4` + `/chat/completions`, Bearer auth, supports `response_format: {type: "json_object"}`, model `glm-4.6`, temperature max 1.0 (we send 0.7). MiniMax base `https://api.minimax.io/v1` + `/chat/completions`, Bearer, NO `response_format` (prompt-only JSON), model `MiniMax-M3`, thinking disableable, `<think>` blocks must be stripped pre-parse, non-standard error envelope (any non-2xx or missing `choices[0].message.content` = failure).
- Provenance truthfulness: `fill_status: 'model'` + `provenance.source: 'model'` only when the model's object actually parsed and passed the schema. A table fallback is never stamped model.
- No `as any`; no `@ts-ignore`/`@ts-expect-error`; no empty `catch` (do work in the catch: assign the fallback); optional properties: omit the key or spread conditionally.
- Model ids live in the registry (code), not env. Changing a model = edit the registry + re-read the provider docs.
- Gate: `node node_modules/typescript/bin/tsc --noEmit` exit 0; `pnpm lint` 0 errors; `pnpm test` all green (baseline 1051; count grows). Do NOT use `pnpm tsc`.
- Commit only the files each task names. NEVER `git add -A`. Imperative commit messages.

---

### Task 1: Engine `oneShotFiller`

**Files:**

- Modify: `src/engine/fill-adapter.ts` (append after `tableFillerWithCatalog`)
- Test: `src/engine/__tests__/one-shot-filler.test.ts` (new)

**Interfaces:**

- Consumes: `ManifestFiller` (fill-adapter.ts:44), `parseManifest` (manifest-migration.ts:55).
- Produces: `oneShotFiller(raw: unknown): ManifestFiller` — id `'model/one-shot'`; `fill` returns `parseManifest(raw)`, so garbage throws and `fillManifestSafe` falls back to tables. Tasks 2–3 rely on this name and behavior.

- [ ] **Step 1: Write the failing test**

Create `src/engine/__tests__/one-shot-filler.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { createRng } from '../rng';
import {
  compileRequestFromBay,
  fillManifestSafe,
  oneShotFiller,
  tableFiller,
} from '../fill-adapter';
import { TABLE_FILL_REVISION, type Manifest } from '../manifest';

const BAY = {
  residue_window_id: 'w-1-2-2',
  residue: [
    { tick: 1, type: 'practice_tick' as const, ids: ['p:test'], numbers: { progress: 1 } },
    { tick: 2, type: 'practice_tick' as const, ids: ['p:test'], numbers: { progress: 1 } },
  ],
  brief: null,
  rng_seed: 'seed-1',
};

function request() {
  return compileRequestFromBay(BAY, 0, 0);
}

// A minimal valid manifest/v1 the "model" could have returned.
function modelPayload(): Record<string, unknown> {
  return {
    schema_version: 'manifest/v1',
    id: 'm-0-seed-1',
    rng_seed: 'seed-1',
    brief: null,
    residue_window_id: 'w-1-2-2',
    kind: 'thing',
    scale: 'person',
    name: 'A model-named card',
    one_liner: 'Written outside the tables.',
    subject: 'a model subject',
    detail: 'The model wrote this sentence.',
    tags: ['model'],
    rarity: 'common',
    fill_status: 'model',
    quality_tier: 0,
    provenance: { source: 'model', revision: 'zai/glm-4.6' },
  };
}

describe('oneShotFiller (SPEC 16.2)', () => {
  it('returns the parsed model payload when it satisfies the schema', () => {
    const filler = oneShotFiller(modelPayload());
    const manifest = filler.fill(request(), createRng(1n));
    expect(manifest.name).toBe('A model-named card');
    expect(manifest.fill_status).toBe('model');
    expect(manifest.provenance.source).toBe('model');
  });

  it('carries the model/one-shot filler id', () => {
    expect(oneShotFiller(modelPayload()).id).toBe('model/one-shot');
  });

  it('throws on garbage so fillManifestSafe falls back to a table card', () => {
    const safe = fillManifestSafe(request(), createRng(2n), oneShotFiller('not json'));
    expect(safe.fill_status).toBe('table');
    expect(safe.provenance).toEqual({ source: 'table', revision: TABLE_FILL_REVISION });
  });

  it('falls back to tables when the model omits a required field', () => {
    const broken = modelPayload();
    delete broken.name;
    const safe = fillManifestSafe(request(), createRng(3n), oneShotFiller(broken));
    expect(safe.fill_status).toBe('table');
  });

  it('accepts a v0 payload through the migration path', () => {
    const v0 = { ...modelPayload(), schema_version: 'manifest/v0' } as Record<string, unknown>;
    delete v0.scale;
    const manifest: Manifest = oneShotFiller(v0).fill(request(), createRng(4n));
    expect(manifest.scale).toBe('person');
  });

  it('table filler stays the default ingest (regression pin)', () => {
    const safe = fillManifestSafe(request(), createRng(5n), tableFiller());
    expect(safe.fill_status).toBe('table');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/engine/__tests__/one-shot-filler.test.ts`
Expected: FAIL — `oneShotFiller` is not exported.

- [ ] **Step 3: Implement in `src/engine/fill-adapter.ts`**

Append after `tableFillerWithCatalog`:

```ts
/**
 * A filler whose fill result is an externally produced payload (SPEC §16.2 —
 * the model path). Parsing happens here so `fillManifestSafe` remains the
 * only ingest: garbage throws, and the safe wrapper falls back to tables.
 * The payload's own `fill_status`/`provenance` must already say "model";
 * a table fallback is never stamped model.
 */
export function oneShotFiller(raw: unknown): ManifestFiller {
  return {
    id: 'model/one-shot',
    fill: () => parseManifest(raw),
  };
}
```

No new imports needed (`parseManifest` is already imported at the top of fill-adapter.ts).

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run src/engine/__tests__/one-shot-filler.test.ts` → PASS (6 tests).
Run: `pnpm vitest run src/engine/__tests__/fill-adapter.test.ts` → PASS (unchanged).

- [ ] **Step 5: Full gate**

`node node_modules/typescript/bin/tsc --noEmit` → 0; `pnpm lint` → 0 errors; `pnpm test` → all green (expect 1057).

- [ ] **Step 6: Commit**

```bash
git add src/engine/fill-adapter.ts src/engine/__tests__/one-shot-filler.test.ts
git commit -m "feat(engine): parse one-shot filler payloads through the safe ingest"
```

---

### Task 2: `src/ai` provider registry + completer

**Files:**

- Create: `src/ai/providers.ts`
- Create: `src/ai/manifest-completer.ts`
- Create: `src/ai/__tests__/providers.test.ts`
- Create: `src/ai/__tests__/manifest-completer.test.ts`
- Create: `src/ai/__tests__/engine-purity.test.ts`
- Create: `src/ai/__tests__/live.test.ts`

**Interfaces:**

- Consumes: `ManifestCompileRequest` (type-only import from `@/engine/fill-adapter`), Task 1's behavior contract.
- Produces (Task 3 consumes):
  - `ManifestCompleter = (request: ManifestCompileRequest) => Promise<unknown>`
  - `createManifestCompleter(providerId: ProviderId, apiKey: string, fetchImpl?: FetchLike): ManifestCompleter`
  - `makeCompleterFromEnv(env: EnvReader, fetchImpl?: FetchLike): ManifestCompleter | null`
  - `FetchLike = (url: string, init: RequestInit) => Promise<FetchResponseLike>`; `FetchResponseLike = { ok: boolean; status: number; json(): Promise<unknown> }`
  - `EnvReader = (key: string) => string | undefined`

- [ ] **Step 1: Write `src/ai/providers.ts`**

```ts
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
```

- [ ] **Step 2: Write `src/ai/manifest-completer.ts`**

```ts
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
```

- [ ] **Step 3: Write the provider + completer tests**

`src/ai/__tests__/providers.test.ts`:

```ts
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
```

`src/ai/__tests__/manifest-completer.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

import { compileRequestFromBay } from '@/engine/fill-adapter';

import {
  buildCompleterPrompt,
  createManifestCompleter,
  makeCompleterFromEnv,
  stripThinkBlocks,
  type FetchLike,
  type FetchResponseLike,
} from '../manifest-completer';
import { PROVIDERS } from '../providers';

const BAY = {
  residue_window_id: 'w-1-2-2',
  residue: [
    { tick: 1, type: 'practice_tick' as const, ids: ['p:test'], numbers: { progress: 1 } },
    { tick: 2, type: 'practice_tick' as const, ids: ['p:test'], numbers: { progress: 1 } },
  ],
  brief: null,
  rng_seed: 'seed-1',
};

const REQUEST = compileRequestFromBay(BAY, 0, 0);

interface Captured {
  readonly url: string;
  readonly init: RequestInit;
}

function captureFetch(payload: unknown, status = 200): { fetchLike: FetchLike; calls: Captured[] } {
  const calls: Captured[] = [];
  const fetchLike: FetchLike = async (url, init) => {
    calls.push({ url, init });
    const response: FetchResponseLike = {
      ok: status < 400,
      status,
      json: async () => payload,
    };
    return response;
  };
  return { fetchLike, calls };
}

function chatPayload(content: string): unknown {
  return { choices: [{ message: { content } }] };
}

describe('createManifestCompleter', () => {
  it('posts to the provider URL with Bearer auth and the model in the body', async () => {
    const card = JSON.stringify({ schema_version: 'manifest/v1', name: 'x' });
    const { fetchLike, calls } = captureFetch(chatPayload(card));
    const completer = createManifestCompleter('zai', 'key-1', fetchLike);
    await completer(REQUEST);
    const call = calls[0];
    expect(call).toBeDefined();
    expect(call?.url).toBe('https://api.z.ai/api/paas/v4/chat/completions');
    expect(call?.init.method).toBe('POST');
    expect(new Headers(call?.init.headers).get('Authorization')).toBe('Bearer key-1');
    const body = JSON.parse(String(call?.init.body)) as {
      model: string;
      response_format?: unknown;
    };
    expect(body.model).toBe('glm-4.6');
    expect(body.response_format).toEqual({ type: 'json_object' });
  });

  it('omits response_format for MiniMax and disables thinking', async () => {
    const card = JSON.stringify({ ok: true });
    const { fetchLike, calls } = captureFetch(chatPayload(`<think>hm</think>${card}`));
    const completer = createManifestCompleter('minimax', 'key-2', fetchLike);
    await completer(REQUEST);
    const body = JSON.parse(String(calls[0]?.init.body)) as {
      response_format?: unknown;
      thinking?: { type: string };
    };
    expect(body.response_format).toBeUndefined();
    expect(body.thinking).toEqual({ type: 'disabled' });
  });

  it('returns the parsed JSON object from the message content', async () => {
    const card = { schema_version: 'manifest/v1', name: 'A model card' };
    const { fetchLike } = captureFetch(chatPayload(JSON.stringify(card)));
    const completer = createManifestCompleter('zai', 'k', fetchLike);
    await expect(completer(REQUEST)).resolves.toEqual(card);
  });

  it('strips <think> blocks before parsing (MiniMax M-series)', async () => {
    const card = { a: 1 };
    const { fetchLike } = captureFetch(
      chatPayload('<think>reasoning here</think>\n' + JSON.stringify(card)),
    );
    const completer = createManifestCompleter('minimax', 'k', fetchLike);
    await expect(completer(REQUEST)).resolves.toEqual(card);
  });

  it('rejects on non-2xx (MiniMax non-standard envelope never reaches us)', async () => {
    const { fetchLike } = captureFetch({ base_resp: { status_code: 1004 } }, 429);
    const completer = createManifestCompleter('minimax', 'k', fetchLike);
    await expect(completer(REQUEST)).rejects.toThrow('429');
  });

  it('rejects when choices or content is missing', async () => {
    const missingChoices = captureFetch({ base_resp: { status_code: 0 } });
    await expect(
      createManifestCompleter('minimax', 'k', missingChoices.fetchLike)(REQUEST),
    ).rejects.toThrow('choices');
    const missingContent = captureFetch({ choices: [{ message: {} }] });
    await expect(
      createManifestCompleter('zai', 'k', missingContent.fetchLike)(REQUEST),
    ).rejects.toThrow('content');
  });

  it('rejects on non-JSON content', async () => {
    const { fetchLike } = captureFetch(chatPayload('Sure! Here is your card:'));
    const completer = createManifestCompleter('zai', 'k', fetchLike);
    await expect(completer(REQUEST)).rejects.toThrow();
  });

  it('propagates fetch failures (network throw)', async () => {
    const fetchLike: FetchLike = async () => {
      throw new Error('network down');
    };
    const completer = createManifestCompleter('zai', 'k', fetchLike);
    await expect(completer(REQUEST)).rejects.toThrow('network down');
  });
});

describe('buildCompleterPrompt', () => {
  it('instructs v1, the envelope echo, and the provider revision', () => {
    const prompt = buildCompleterPrompt(REQUEST, 'zai/glm-4.6');
    expect(prompt).toContain('manifest/v1');
    expect(prompt).toContain(`"id": "${REQUEST.id}"`);
    expect(prompt).toContain('"revision": "zai/glm-4.6"');
    expect(prompt).toContain('"fill_status": "model"');
    expect(prompt).toContain(JSON.stringify(REQUEST));
  });
});

describe('stripThinkBlocks', () => {
  it('removes paired blocks and trims', () => {
    expect(stripThinkBlocks('<think>a</think>{"x":1}')).toBe('{"x":1}');
    expect(stripThinkBlocks('  {"x":1}  ')).toBe('{"x":1}');
  });
});

describe('makeCompleterFromEnv', () => {
  it('returns null with no keys', () => {
    expect(makeCompleterFromEnv(() => undefined)).toBeNull();
  });

  it('prefers ZAI_API_KEY first', () => {
    const env = vi.fn((key: string) =>
      key === 'ZAI_API_KEY' ? 'z' : key === 'MINIMAX_API_KEY' ? 'm' : undefined,
    );
    const { fetchLike } = captureFetch(chatPayload('{}'));
    const completer = makeCompleterFromEnv(env, fetchLike);
    expect(completer).not.toBeNull();
    if (completer !== null) {
      await completer(REQUEST);
    }
    expect(env).toHaveBeenCalledWith('ZAI_API_KEY');
  });

  it('YAK_FILLER_PROVIDER overrides the order', () => {
    const env = (key: string): string | undefined =>
      key === 'YAK_FILLER_PROVIDER'
        ? 'minimax'
        : key === 'ZAI_API_KEY'
          ? 'z'
          : key === 'MINIMAX_API_KEY'
            ? 'm'
            : undefined;
    const { fetchLike, calls } = captureFetch(chatPayload('{}'));
    const completer = makeCompleterFromEnv(env, fetchLike);
    expect(completer).not.toBeNull();
    if (completer !== null) {
      await completer(REQUEST);
    }
    expect(calls[0]?.url).toContain('minimax.io');
  });

  it('explicit provider with no key yields null', () => {
    expect(makeCompleterFromEnv(() => 'minimax' as string | undefined)).toBeNull();
  });
});

describe('registry/provider coherence', () => {
  it('prompt revision matches the registry slug for both providers', () => {
    for (const p of Object.values(PROVIDERS)) {
      expect(buildCompleterPrompt(REQUEST, p.revision)).toContain(p.revision);
    }
  });
});
```

Note the last `makeCompleterFromEnv` test: the env reader returns `'minimax'` for every key, so `YAK_FILLER_PROVIDER='minimax'` and `MINIMAX_API_KEY='minimax'` — adjust so the explicit-provider-no-key case is actually exercised: return `'minimax'` only for `YAK_FILLER_PROVIDER` and `undefined` otherwise. Fix the literal before finalizing (read your own test once more; make the env function return `undefined` for every key except `YAK_FILLER_PROVIDER`).

- [ ] **Step 4: Write the engine-purity test**

`src/ai/__tests__/engine-purity.test.ts` (walk pattern borrowed from `src/__tests__/ladder-helpers-uniqueness.test.ts`):

```ts
// The engine never imports src/ai and never reads process.env (SPEC §16.2,
// AGENTS engine purity). Scanned as text so an import cycle or env read
// fails the gate even when types would compile.

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ENGINE_ROOT = join(__dirname, '..', '..', 'engine');

function walkTs(dir: string): readonly string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walkTs(full));
      continue;
    }
    if (entry.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

describe('engine purity vs the ai layer', () => {
  it('no engine file imports src/ai or reads process.env', () => {
    const offenders: string[] = [];
    for (const file of walkTs(ENGINE_ROOT)) {
      const text = readFileSync(file, 'utf8');
      if (/from\s+['"][^'"]*\/ai\//.test(text) || /from\s+['"]@\/ai\//.test(text)) {
        offenders.push(`${file}: imports src/ai`);
      }
      if (/process\.env/.test(text)) {
        offenders.push(`${file}: reads process.env`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 5: Write the live test (skipped without keys)**

`src/ai/__tests__/live.test.ts`:

```ts
// One optional live round-trip per provider, skipped without its key.
// CI never needs a key; the mock suite above is the contract.

import { describe, expect, it } from 'vitest';

import { compileRequestFromBay } from '@/engine/fill-adapter';

import { createManifestCompleter } from '../manifest-completer';

const BAY = {
  residue_window_id: 'w-live-1-1-1',
  residue: [
    {
      tick: 1,
      type: 'practice_tick' as const,
      ids: ['p:tang/nianfo-recitation'],
      numbers: { progress: 1 },
    },
  ],
  brief: null,
  rng_seed: 'live-seed',
};
const REQUEST = compileRequestFromBay(BAY, 0, 0);

describe.skipIf(process.env.ZAI_API_KEY === undefined)('live zai round-trip', () => {
  it('resolves to a JSON object', async () => {
    const completer = createManifestCompleter('zai', process.env.ZAI_API_KEY ?? '');
    const raw = await completer(REQUEST);
    expect(typeof raw).toBe('object');
  });
});

describe.skipIf(process.env.MINIMAX_API_KEY === undefined)('live minimax round-trip', () => {
  it('resolves to a JSON object', async () => {
    const completer = createManifestCompleter('minimax', process.env.MINIMAX_API_KEY ?? '');
    const raw = await completer(REQUEST);
    expect(typeof raw).toBe('object');
  });
});
```

- [ ] **Step 6: Run tests + full gate**

Run: `pnpm vitest run src/ai` → PASS (expect ~20 tests, 0 skipped without keys).
Full gate: `node node_modules/typescript/bin/tsc --noEmit` → 0; `pnpm lint` → 0 errors; `pnpm test` → all green (expect ~1077).

- [ ] **Step 7: Commit**

```bash
git add src/ai/providers.ts src/ai/manifest-completer.ts src/ai/__tests__/providers.test.ts src/ai/__tests__/manifest-completer.test.ts src/ai/__tests__/engine-purity.test.ts src/ai/__tests__/live.test.ts
git commit -m "feat(ai): complete manifests through the zai and minimax registries"
```

---

### Task 3: StudioView model-first harvest

**Files:**

- Modify: `src/ui/components/StudioView.tsx` (props ~98-116; `harvestBenchTier` ~526-570; `harvest` ~572-596; the harvest `onPress` ~905)
- Test: `src/ui/__tests__/StudioViewModelFill.test.tsx` (new)

**Interfaces:**

- Consumes: Task 1 `oneShotFiller`; Task 2 `ManifestCompleter`; engine `harvestWithFiller`, `fillManifestSafe`, `Manifest` type (add to the existing `@/engine` import block — check the current import list and extend it, do not duplicate).
- Produces: `StudioViewProps.completeManifest?: ManifestCompleter`. Default `undefined` → both paths byte-identical to today (existing tests pin this).

- [ ] **Step 1: Write the failing test**

Create `src/ui/__tests__/StudioViewModelFill.test.tsx`.

READ-FIRST: open `src/ui/__tests__/StudioView.test.tsx` and copy its smallest "ready bay" fixture (the `initialStudio`/bay construction + render wrapper with `practices`/`schedule`/`clock`) into this file verbatim, then write these four tests around it. Do not invent fixture shapes — reuse what exists. Also read `StudioViewTiers.test.tsx` if you add the tier-bench case (optional; see Step 4).

```tsx
import { fireEvent, waitFor } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';

import { createRng } from '@/engine/rng';
// … fixture imports copied from StudioView.test.tsx (practices, schedule, a
// ready-bay initialStudio) — reuse the exact helper names/shapes there …

function modelPayload(id: string): Record<string, unknown> {
  return {
    schema_version: 'manifest/v1',
    id,
    rng_seed: 'bench-seed',
    brief: null,
    residue_window_id: 'w-model',
    kind: 'person',
    scale: 'person',
    name: 'The model clerk',
    one_liner: 'Written by the completer.',
    subject: 'a model subject',
    detail: 'The model wrote this sentence.',
    tags: ['model'],
    rarity: 'common',
    fill_status: 'model',
    quality_tier: 0,
    provenance: { source: 'model', revision: 'zai/glm-4.6' },
  };
}

describe('StudioView model-first harvest (SPEC 16.2)', () => {
  it('archives the model manifest when the completer resolves a valid card', async () => {
    const completer = vi.fn(async () => modelPayload('m-model-1'));
    const { studio } = await renderReadyBenchHarvested({ completeManifest: completer });
    expect(studio.archive.at(-1)?.name).toBe('The model clerk');
    expect(studio.archive.at(-1)?.fill_status).toBe('model');
    expect(completer).toHaveBeenCalledTimes(1);
  });

  it('falls back to a table card when the completer rejects', async () => {
    const completer = vi.fn(async () => {
      throw new Error('network down');
    });
    const { studio } = await renderReadyBenchHarvested({ completeManifest: completer });
    expect(studio.archive.at(-1)?.fill_status).toBe('table');
    expect(studio.archive.at(-1)?.provenance.source).toBe('table');
  });

  it('falls back to a table card when the completer returns garbage', async () => {
    const completer = vi.fn(async () => 'not json at all');
    const { studio } = await renderReadyBenchHarvested({ completeManifest: completer });
    expect(studio.archive.at(-1)?.fill_status).toBe('table');
  });

  it('harvests tables unchanged with no completer (pin)', async () => {
    const { studio } = await renderReadyBenchHarvested({});
    expect(studio.archive.at(-1)?.fill_status).toBe('table');
  });
});
```

`renderReadyBenchHarvested(props)` is a local helper you write on top of the copied fixture: renders StudioView with a ready person bay (same construction StudioView.test.tsx uses), fires the `studio-harvest` button inside `act`/`waitFor` (async presses need `await waitFor(() => …)`), and returns the archived studio via the same state-observation trick the sibling tests use (persisted storage spy or `initialStudio` mutation capture — copy whichever pattern the existing harvest tests use). Adapt to the real fixture; keep assertions as written.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/ui/__tests__/StudioViewModelFill.test.tsx`
Expected: FAIL — `completeManifest` is not a StudioView prop (TS/render error or completer never called).

- [ ] **Step 3: Add the prop**

In `StudioViewProps` (after `clock?`, before `epoch?`):

```ts
  /** Host-injected model completer (SPEC §16.2). Undefined → tables only;
   * the default Expo bundle never provides one. */
  readonly completeManifest?: (request: ManifestCompileRequest) => Promise<unknown>;
```

Import `type ManifestCompileRequest` from `@/engine/fill-adapter` (add to the existing import from that module — `compileRequestFromBay` already comes from there or from `@/engine`; check and extend without duplicating). Destructure `completeManifest` in the component's props.

- [ ] **Step 4: Wire the tier-bench path (`harvestBenchTier`)**

Make it async and model-first. The table call stays byte-identical (it becomes the fallback). Replace the manifest construction block (the `const manifest = tableFillManifest(...)` call) with:

```ts
const tableFill = (): Manifest =>
  tableFillManifest(
    request.residue,
    request.brief,
    request.quality_tier,
    rngRef.current,
    request.rng_seed,
    request.id,
    request.focus,
    request.life_context,
    request.scale,
    rules,
    catalog,
  );
let manifest: Manifest;
if (completeManifest === undefined) {
  manifest = tableFill();
} else {
  try {
    const raw = await completeManifest(request);
    const filled = fillManifestSafe(request, rngRef.current, oneShotFiller(raw));
    manifest =
      filled.provenance.source === 'model'
        ? filled
        : // Model garbage fell back inside the safe ingest — redo with the
          // tier's own rules and (possibly swapped) catalog.
          tableFill();
  } catch {
    manifest = tableFill();
  }
}
```

Add `fillManifestSafe` and `oneShotFiller` to the engine import block, and `type Manifest` if not already imported. Mark the function `async function harvestBenchTier(tierId: string): Promise<void>` and update its caller(s): `harvest()` calls it with `void harvestBenchTier(priority);` — or make `harvest` async and await it (Step 5 makes harvest async anyway; awaiting is fine).

- [ ] **Step 5: Wire the person path (`harvest`)**

Make it async, guard double-harvest during the await, model-first with exact fallback to today's call:

```ts
const harvestingRef = useRef(false);

async function harvest(): Promise<void> {
  if (harvestingRef.current) {
    return;
  }
  harvestingRef.current = true;
  try {
    const priority = highestReadyTier();
    if (priority !== null) {
      await harvestBenchTier(priority);
      return;
    }
    const reg = registries();
    const seat = activeVisitorFor(buildSession(), EMBODIED_TIER);
    const swap = visitorTableOverride(
      reg.visitors,
      seat?.id ?? null,
      reg.visitorTables,
      reg.catalogs,
    );
    const visitorEntries = swap === reg.catalogs ? null : (swap[EMBODIED_TIER] ?? null);
    const tableResult = (): HarvestResult | null =>
      harvestTableFill(studio, rngRef.current, lifeContext, visitorEntries);

    const bay = studio.bay;
    let result: HarvestResult | null;
    if (completeManifest !== undefined && bay !== null && bay.status === 'ready') {
      const request = compileRequestFromBay(
        bay,
        studio.quality_tier,
        studio.harvest_count,
        lifeContext,
      );
      try {
        const raw = await completeManifest(request);
        const attempt = harvestWithFiller(studio, rngRef.current, oneShotFiller(raw), lifeContext);
        result =
          attempt !== null && attempt.manifest.provenance.source === 'model'
            ? attempt
            : tableResult();
      } catch {
        result = tableResult();
      }
    } else {
      result = tableResult();
    }
    if (result === null) {
      return;
    }
    decayVisitorSeat(EMBODIED_TIER);
    setStudio(result.studio);
    setWorldDrafts(withRecordedDrafts(result.studio.archive, worldDrafts));
    setFreshHarvestId(prefersReducedMotion ? null : result.manifest.id);
    setExported(false);
  } finally {
    harvestingRef.current = false;
  }
}
```

Import `harvestWithFiller` (and `type HarvestResult` if the file wants the annotation — otherwise drop the local type annotation and let inference carry it; prefer the explicit import from `@/engine`).

- [ ] **Step 6: Update the press handler**

At the harvest button (~line 905):

```tsx
      onPress={harvestable ? () => void harvest() : undefined}
```

- [ ] **Step 7: Run tests**

Run: `pnpm vitest run src/ui/__tests__/StudioViewModelFill.test.tsx` → PASS (4 tests).
Run: `pnpm vitest run src/ui` → PASS — the whole existing StudioView suite must stay green with no completer (proves the default path is unchanged; async-without-await keeps state updates synchronous there).

- [ ] **Step 8: Full gate**

`node node_modules/typescript/bin/tsc --noEmit` → 0; `pnpm lint` → 0 errors (watch for exhaustive-deps complaints in the modified functions — these are plain functions, not effects, so none expected); `pnpm test` → all green (expect ~1081).

- [ ] **Step 9: Commit**

```bash
git add src/ui/components/StudioView.tsx src/ui/__tests__/StudioViewModelFill.test.tsx
git commit -m "feat(ui): harvest model-first when a completer is injected"
```

---

### Task 4: Docs amendment — provider registry replaces SpaceXAI

**Files:**

- Modify: `SPEC.md` (§9 line ~182; §14 line ~295; §16.2 lines ~344-400; done-when ~413)
- Modify: `AGENTS.md` (Secrets ~31; Do-not ~138; Where-to-look table)

**Interfaces:** none — docs only; full gate re-run as close-out.

- [ ] **Step 1: SPEC §9 line ~182** — replace the provider line:

> Provider is **SpaceXAI** (xAI API). Base URL `https://api.x.ai/v1`. Key env var `XAI_API_KEY`.

with:

> Providers are **Z.ai** and **MiniMax** behind the registry in `src/ai/providers.ts` (Z.ai `https://api.z.ai/api/paas/v4`, MiniMax `https://api.minimax.io/v1`). Key env vars `ZAI_API_KEY` / `MINIMAX_API_KEY`, override `YAK_FILLER_PROVIDER`.

- [ ] **Step 2: SPEC §16.2** — retitle `### 16.2 SpaceXAI harvest` → `### 16.2 Model harvest`. Within it:
  - Replace every `XAI_API_KEY` / `api.x.ai` / SpaceXAI / `SPACEXAI_*` mention with the registry equivalents (`src/ai/providers.ts`, `ZAI_API_KEY` / `MINIMAX_API_KEY`, `YAK_FILLER_PROVIDER`). The "confirm the current model" rule becomes: "Confirm current model ids from the provider docs before editing the registry."
  - In **Shape**, update the file sketch (`src/ai/spacexai-manifest.ts` → `src/ai/manifest-completer.ts` + `src/ai/providers.ts`) and the prompt block: the model returns `manifest/v1` (v0's kind enum cannot carry higher-scale kinds), `provenance.revision` is the registry slug (`zai/glm-4.6`, `minimax/MiniMax-M3`), and MiniMax gets a line: no `response_format` on its OpenAI-compatible endpoint — prompt-only JSON plus `<think>` stripping; thinking disabled where the model allows it.
  - In **Where the key lives (v0)**, keep the structure; tests read `ZAI_API_KEY` / `MINIMAX_API_KEY`; `StudioView` takes an optional `completeManifest` collaborator.
  - In **Tests to write**, swap the live-key names and add: "the engine-purity test walks `src/engine` and fails on any `src/ai` import or `process.env` read."
  - In **Done when**, change the last line to: `` `rg 'ZAI_API_KEY|MINIMAX_API_KEY' src/engine app src/ui` is empty. ``

- [ ] **Step 3: SPEC §14** — the sentence added in Phase 5 ("Model harvest behind `fillManifestSafe` is the one open build item; it ships provider-pluggable (Z.ai, MiniMax) as Phase 6…") becomes done. Replace with:

> Model harvest behind `fillManifestSafe` shipped provider-pluggable (Z.ai, MiniMax) as Phase 6 of the harvest-quality program (`docs/superpowers/specs/2026-08-24-harvest-quality-program.md`); the default build still harvests from tables alone.

- [ ] **Step 4: AGENTS.md** — three edits:
  - Secrets (~31): rewrite to — `ZAI_API_KEY` / `MINIMAX_API_KEY` never enter the Expo bundle, never enter `src/engine`, never get committed. LLM calls live in `src/ai/manifest-completer.ts`, invoked from UI-side code through StudioView's optional `completeManifest` collaborator. Provider facts (base URLs, models, JSON-mode support) live in `src/ai/providers.ts`; confirm current model ids from the provider docs before editing the registry.
  - Do-not (~138): replace the `SPACEXAI_*` line with — Do not invent provider env vars. The keys are `ZAI_API_KEY` / `MINIMAX_API_KEY` (override `YAK_FILLER_PROVIDER`); models change in the registry, not env.
  - Where-to-look table: add a row `| Model completer | src/ai/providers.ts, src/ai/manifest-completer.ts |`.

- [ ] **Step 5: Full gate + commit**

`node node_modules/typescript/bin/tsc --noEmit` → 0; `pnpm lint` → 0 errors; `pnpm test` → all green. Then verify the done-when line yourself: `rg 'XAI_API_KEY|api\.x\.ai|SpaceXAI|SPACEXAI' SPEC.md AGENTS.md` returns nothing.

```bash
git add SPEC.md AGENTS.md
git commit -m "docs: ratify the provider registry for the model harvest"
```

---

## Self-Review (completed during planning)

- **Spec coverage:** design §4.1 registry → Task 2 providers.ts; §4.2 completer → Task 2 manifest-completer.ts; §4.3 selection/injection → Task 2 makeCompleterFromEnv + Task 3 prop; §4.4 provenance → Task 1 oneShotFiller + Task 3 source checks; §4.5 docs → Task 4; §4.6 tests → Tasks 1–3 test blocks + purity test + live test. SPEC §16.2 prompt requirements (single JSON object, slots only, figures in play, no chat reply, no attainment) → buildCompleterPrompt.
- **Type consistency:** `oneShotFiller` name identical in Tasks 1/3; `ManifestCompleter`/`FetchLike`/`EnvReader`/`FetchResponseLike` defined Task 2, consumed Task 3; `providerKey` used in makeCompleterFromEnv; provider slugs (`zai/glm-4.6`, `minimax/MiniMax-M3`) consistent across registry, prompt, tests, and SPEC amendments.
- **Placeholders:** none. Two read-first adaptations are explicit (Task 3 fixture copy; Task 2's flagged env-literal fix in the last makeCompleterFromEnv test).
- **Known deliberate choices:** the model path may consume extra rng draws before a fallback (per-path determinism, not cross-path — the no-completer path is unchanged and pinned); garbage-model fallback on the person path re-runs `harvestTableFill` so the visitor swap survives; `manifest/v1` in the prompt (not v0) because tier kinds exceed v0's enum.
