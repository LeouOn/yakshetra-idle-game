// Round-trip + corruption-fallback tests for the persistence layer (plan todo 10).
//
// These run against `MemoryStorageAdapter` only — the platform-pure adapter with
// no RN/DOM dependencies. The native (expo-sqlite) and web (idb-keyval) adapters
// share the same integrity envelope via `./corruption.ts`, so the corruption
// contract proven here transitively holds for them once their backends ship.
//
// Coverage:
//   1. save -> load deep-equality on the canonical-normalized form (the
//      "byte-identical LifeState/KarmaState" contract — see below).
//   2. listSlots / deleteSlot semantics.
//   3. A 2-life chain serialized envelope stays < 100KB.
//   4. Corruption fallback: mangle the payload portion of a stored envelope ->
//      load returns null AND archives the bad payload (reason:
//      integrity-hash-mismatch). Bonus negative paths: unparseable JSON, wrong
//      envelope shape.
//
// ON "DEEP EQUALITY": the engine's `canonicalStringify` renders `Set` as a
// sorted array and `Map` as a sorted object (see `@/engine/serialize`), so the
// string stored on disk has `flags` / `fired_once_per_run` as arrays. After
// `JSON.parse` on load they remain arrays, not `Set` instances — the engine's
// `deserializeSaveBlob` does not (yet) revive containers. Revival is engine
// territory and tracked separately; for todo 10 we prove the *byte-identical
// canonical encoding* round-trips: `canonicalStringify(loaded) ===
// canonicalStringify(saved)`, plus structural deep equality on the
// canonical-normalized object form (`JSON.parse(canonicalStringify(...))`),
// which compares both sides with Sets normalized to sorted arrays.

import { describe, expect, it } from 'vitest';

import { canonicalStringify } from '@/engine/serialize';
import type {
  Echo,
  EraId,
  IntentRoot,
  KarmaState,
  LifeId,
  LifeState,
  RoleId,
  SaveBlob,
  SocialIdentity,
} from '@/engine/types';

import { MemoryStorageAdapter } from '../memory';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeIdentity(over: Partial<SocialIdentity> = {}): SocialIdentity {
  return {
    gender: 'woman',
    social_class: 'merchant',
    family_wealth_at_birth: 'modest',
    caste_status: 'none',
    disability_status: 'none',
    ...over,
  };
}

interface MakeLifeOptions {
  id?: string;
  age?: number;
  turn?: number;
  historyLen?: number;
  flags?: string[];
}

function makeLife(opts: MakeLifeOptions = {}): LifeState {
  const history: string[] = [];
  for (let i = 0; i < (opts.historyLen ?? 12); i++) {
    history.push(`evt-${i}`);
  }
  return {
    identity: makeIdentity(),
    id: (opts.id ?? 'life-001') as LifeId,
    era: 'era-childhood' as EraId,
    role: 'role-monastic-novice' as RoleId,
    age: opts.age ?? 7,
    turn: opts.turn ?? 12,
    resources: {
      time: 8,
      energy: 5,
      provisions: 3,
      trust: 2,
      skill: 1,
      obligation: 0,
    },
    skills: { meditation: 1, calligraphy: 0 },
    relationships: {
      'teacher-ananda': { trust: 4, debt: 1, affection: 3 },
    },
    flags: new Set<string>(opts.flags ?? ['vow-declared', 'met-teacher']),
    intent_root_history: ['care', 'care', 'greed'] as IntentRoot[],
    chosen_lens: 'generosity',
    alive: true,
    last_narrative_sid: 'sid-card-awakening-0007',
    event_weights: { 'evt-storm': 1.5 },
    cooldowns: { 'evt-storm': 2 },
    history,
    fired_once_per_run: new Set<string>(['evt-birth-complication']),
    pending_events: [],
    schedule_id: null,
    practice_override_id: null,
  };
}

function makeKarma(): KarmaState {
  const echoes: Echo[] = [
    {
      type: 'tendency',
      key: 'generosity-toward-strangers',
      weight: 0.6,
      source_life_id: 'life-001' as LifeId,
      narrative_sid: 'sid-echo-generosity-0001',
    },
    {
      type: 'vow',
      key: 'vow-of-honesty',
      weight: 0.9,
      source_life_id: 'life-001' as LifeId,
      narrative_sid: 'sid-echo-honesty-0002',
    },
  ];
  return {
    echoes,
    accumulated_intent_roots: { care: 14, greed: 3, aversion: 2, delusion: 1 },
    vows: { 'vow-of-honesty': 'declared' },
  };
}

function makeBlob(lifeCount: 1 | 2 = 1): SaveBlob {
  const life_states = [makeLife({ id: 'life-001', age: 7, turn: 12 })];
  if (lifeCount === 2) {
    life_states.push(
      makeLife({ id: 'life-002', age: 23, turn: 40, historyLen: 30, flags: ['reborn'] }),
    );
  }
  return {
    schema_version: '0.1',
    engine_compat: '0.1.0',
    created_at_unix: 1_700_000_000,
    run_id: 'run-abc-123',
    chain: {
      life_states,
      karma_state: makeKarma(),
      current_life_index: lifeCount - 1,
    },
  };
}

/**
 * The canonical-normalized object form of a blob: `JSON.parse(canonicalStringify(b))`.
 * Both `Set` and `Map` collapse to plain JSON containers and keys are
 * lexicographic, so this is the structural shape `load` returns. Comparing two
 * blobs via this normalization is the byte-identical round-trip contract.
 */
function canonicalNormalForm(b: SaveBlob): unknown {
  return JSON.parse(canonicalStringify(b));
}

function utf8ByteLength(s: string): number {
  return new TextEncoder().encode(s).byteLength;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MemoryStorageAdapter — round trip', () => {
  it('save -> load yields a byte-identical (canonical) blob with deep-equal normalized form', async () => {
    const adapter = new MemoryStorageAdapter();
    const blob = makeBlob(1);

    await adapter.save(0, blob);
    const loaded = await adapter.load(0);

    expect(loaded).not.toBeNull();

    // (a) Byte-identical canonical encoding — the determinism/integrity contract.
    expect(canonicalStringify(loaded)).toBe(canonicalStringify(blob));
    // (b) Structural deep equality on the normalized object form (Sets -> sorted
    //     arrays on both sides).
    expect(canonicalNormalForm(loaded as SaveBlob)).toEqual(canonicalNormalForm(blob));

    // Sanity: schema_version is the literal pinned in the type.
    expect(loaded?.schema_version).toBe('0.1');
    expect(loaded?.run_id).toBe('run-abc-123');
    expect(loaded?.chain.current_life_index).toBe(0);
    expect(loaded?.chain.karma_state.accumulated_intent_roots.care).toBe(14);
  });

  it('listSlots reports occupied slots ascending; deleteSlot removes a slot', async () => {
    const adapter = new MemoryStorageAdapter();
    expect(await adapter.listSlots()).toEqual([]);

    await adapter.save(2, makeBlob(1));
    await adapter.save(0, makeBlob(1));
    await adapter.save(5, makeBlob(1));
    expect(await adapter.listSlots()).toEqual([0, 2, 5]);

    await adapter.deleteSlot(2);
    expect(await adapter.listSlots()).toEqual([0, 5]);

    // deleteSlot on an absent slot is a no-op.
    await adapter.deleteSlot(99);
    expect(await adapter.listSlots()).toEqual([0, 5]);
  });

  it('load returns null for an absent slot', async () => {
    const adapter = new MemoryStorageAdapter();
    expect(await adapter.load(42)).toBeNull();
  });

  it('a 2-life chain serializes to < 100KB', async () => {
    const adapter = new MemoryStorageAdapter();
    const blob = makeBlob(2);
    await adapter.save(0, blob);
    const raw = adapter.getRaw(0);
    expect(raw).toBeDefined();
    const sizeBytes = utf8ByteLength(raw ?? '');
    // Plan acceptance criterion: a 2-life chain envelope is well under 100KB.
    expect(sizeBytes).toBeLessThan(100 * 1024);
    // Sanity floor: it must also be non-trivially populated.
    expect(sizeBytes).toBeGreaterThan(500);
  });
});

describe('MemoryStorageAdapter — corruption fallback', () => {
  it('a one-byte mangle inside the payload -> load returns null and archives the payload', async () => {
    const adapter = new MemoryStorageAdapter();
    const blob = makeBlob(1);
    await adapter.save(3, blob);

    // Baseline: the slot loads cleanly before tampering.
    const before = await adapter.load(3);
    expect(before).not.toBeNull();
    expect(adapter.archivedCorruptions).toHaveLength(0);

    // Tamper: change one byte inside the payload (bump `age`), but keep the
    // ORIGINAL stored integrity_hash. This is exactly what a partial write /
    // bit-flip / hand-edit looks like on disk: content changed, hash stale.
    const raw = adapter.getRaw(3);
    expect(raw).toBeDefined();
    const envelope = JSON.parse(raw ?? '{}') as {
      integrity_hash: string;
      payload: SaveBlob;
    };
    const originalAge = envelope.payload.chain.life_states[0]!.age;
    envelope.payload.chain.life_states[0]!.age = originalAge + 1;
    const mangled = JSON.stringify({
      integrity_hash: envelope.integrity_hash,
      payload: envelope.payload,
    });
    adapter.setRaw(3, mangled);

    // Reload: integrity check must fail.
    const after = await adapter.load(3);
    expect(after).toBeNull();

    // The bad payload must be archived.
    expect(adapter.archivedCorruptions).toHaveLength(1);
    const [entry] = adapter.archivedCorruptions;
    expect(entry?.slot).toBe(3);
    expect(entry?.reason).toBe('integrity-hash-mismatch');
    expect(entry?.rawPayload).toBe(mangled);
    expect(entry?.detected_at_unix_ms).toBeGreaterThan(0);
  });

  it('unparseable JSON -> load returns null and archives as json-parse-error', async () => {
    const adapter = new MemoryStorageAdapter();
    adapter.setRaw(7, '{ this is not json');
    const loaded = await adapter.load(7);
    expect(loaded).toBeNull();
    expect(adapter.archivedCorruptions).toHaveLength(1);
    expect(adapter.archivedCorruptions[0]?.reason).toBe('json-parse-error');
    expect(adapter.archivedCorruptions[0]?.slot).toBe(7);
  });

  it('a payload with the wrong envelope shape -> load returns null (envelope-shape-mismatch)', async () => {
    const adapter = new MemoryStorageAdapter();
    // payload carries the wrong schema_version -> fails the envelope type guard.
    adapter.setRaw(
      9,
      JSON.stringify({ integrity_hash: 'deadbeef', payload: { schema_version: '9.9' } }),
    );
    const loaded = await adapter.load(9);
    expect(loaded).toBeNull();
    expect(adapter.archivedCorruptions).toHaveLength(1);
    expect(adapter.archivedCorruptions[0]?.reason).toBe('envelope-shape-mismatch');
  });

  it('save is idempotent and overwrites the prior slot', async () => {
    const adapter = new MemoryStorageAdapter();
    await adapter.save(1, makeBlob(1));
    await adapter.save(1, makeBlob(2));
    const loaded = await adapter.load(1);
    expect(loaded?.chain.life_states).toHaveLength(2);
    expect(await adapter.listSlots()).toEqual([1]);
  });
});
