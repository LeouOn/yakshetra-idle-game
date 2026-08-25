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
    expect(prompt).toContain(`- id: "${REQUEST.id}"`);
    expect(prompt).toContain('"revision": "zai/glm-4.6"');
    expect(prompt).toContain('- fill_status: "model"');
    expect(prompt).toContain(JSON.stringify(REQUEST));
  });

  it('echoes and pins the compiled kind when the request carries one', () => {
    const tierRules = [
      { kind: 'tradition', match: { social: true } },
      { kind: 'heirloom', match: { dominant_in: ['practice_tick', 'lens_chosen'] } },
    ] as const;
    const request = compileRequestFromBay(BAY, 0, 0, null, 'household', tierRules);
    expect(request.compiled_kind).toBe('heirloom');
    const prompt = buildCompleterPrompt(request, 'zai/glm-4.6');
    expect(prompt).toContain('- kind: "heirloom"');
    expect(prompt).toContain('keep this compiled kind');
    expect(prompt).not.toContain('one of "thing", "outcome"');
  });

  it('keeps the five-kind instruction when no compiled kind is present', () => {
    expect('compiled_kind' in REQUEST).toBe(false);
    const prompt = buildCompleterPrompt(REQUEST, 'zai/glm-4.6');
    expect(prompt).toContain('one of "thing", "outcome", "change", "person", "place"');
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

  it('prefers ZAI_API_KEY first', async () => {
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

  it('YAK_FILLER_PROVIDER overrides the order', async () => {
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
    const env = (key: string): string | undefined =>
      key === 'YAK_FILLER_PROVIDER' ? 'minimax' : undefined;
    expect(makeCompleterFromEnv(env)).toBeNull();
  });
});

describe('registry/provider coherence', () => {
  it('prompt revision matches the registry slug for both providers', () => {
    for (const p of Object.values(PROVIDERS)) {
      expect(buildCompleterPrompt(REQUEST, p.revision)).toContain(p.revision);
    }
  });
});
