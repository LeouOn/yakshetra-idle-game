// SaveBlob migration tests: 0.1 -> 0.2 (idle-mode followup).
//
// Pins the contract:
//   - migrateSaveBlob upgrades 0.1 -> 0.2 with deterministic defaults
//     (last_visited_at_unix=created_at_unix, last_simulated_tick=0n,
//     pending_offline_summary=null), chain preserved by reference.
//   - migrateSaveBlob is a no-op for 0.2 (same reference).
//   - needsMigration / getBlobVersion discriminate versions.
//   - End-to-end: serialize -> deserialize -> migrate -> canonical equality.
//   - SaveBlobSchema (Zod) accepts both versions in their on-disk form.
//
// Pure: no Date, no Math.random, no platform APIs.

import { describe, expect, it } from 'vitest';

import {
  canonicalStringify,
  CURRENT_SCHEMA_VERSION,
  deserializeSaveBlob,
  getBlobVersion,
  migrateSaveBlob,
  needsMigration,
  SaveBlobSchema,
  serializeSaveBlob,
} from '@/engine';
import type {
  AnySaveBlob,
  Echo,
  EraId,
  IntentRoot,
  KarmaState,
  LifeId,
  LifeState,
  RoleId,
  SaveBlob,
  SaveBlobV2,
  SocialIdentity,
} from '@/engine/types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeLife(): LifeState {
  return {
    identity: {
      gender: 'woman',
      social_class: 'merchant',
      family_wealth_at_birth: 'modest',
      caste_status: 'none',
      disability_status: 'none',
    } satisfies SocialIdentity,
    id: 'life-001' as LifeId,
    era: 'era-childhood' as EraId,
    role: 'role-monastic-novice' as RoleId,
    age: 7,
    turn: 12,
    resources: { time: 8, energy: 5, provisions: 3, trust: 2, skill: 1, obligation: 0 },
    skills: { meditation: 1 },
    relationships: { 'teacher-ananda': { trust: 4, debt: 1, affection: 3 } },
    flags: new Set<string>(['vow-declared']),
    intent_root_history: ['care', 'care'] as IntentRoot[],
    chosen_lens: 'generosity',
    alive: true,
    last_narrative_sid: 'sid-card-0007',
    event_weights: {},
    cooldowns: {},
    history: ['evt-1'],
    fired_once_per_run: new Set<string>(),
    pending_events: [],
    schedule_id: null,
    practice_override_id: null,
  };
}

function makeKarma(): KarmaState {
  const echoes: Echo[] = [
    {
      type: 'tendency',
      key: 'generosity',
      weight: 0.5,
      source_life_id: 'life-001' as LifeId,
      narrative_sid: 'sid-echo-0001',
    },
  ];
  return {
    echoes,
    accumulated_intent_roots: { care: 1, greed: 0, aversion: 0, delusion: 0 },
    vows: {},
  };
}

function makeV01Blob(): SaveBlob {
  return {
    schema_version: '0.1',
    engine_compat: '0.1.0',
    created_at_unix: 1_700_000_000,
    run_id: 'run-abc',
    chain: { life_states: [makeLife()], karma_state: makeKarma(), current_life_index: 0 },
  };
}

function makeV02Blob(): SaveBlobV2 {
  return {
    schema_version: '0.2',
    engine_compat: '0.2.0',
    created_at_unix: 1_700_000_000,
    last_visited_at_unix: 1_700_000_500,
    last_simulated_tick: 42n,
    run_id: 'run-xyz',
    chain: { life_states: [makeLife()], karma_state: makeKarma(), current_life_index: 0 },
    pending_offline_summary: null,
  };
}

// ---------------------------------------------------------------------------
// getBlobVersion / needsMigration
// ---------------------------------------------------------------------------

describe('getBlobVersion / needsMigration', () => {
  it('reads the literal schema_version and discriminates the versions', () => {
    expect(getBlobVersion(makeV01Blob())).toBe('0.1');
    expect(getBlobVersion(makeV02Blob())).toBe('0.2');
    expect(needsMigration(makeV01Blob())).toBe(true);
    expect(needsMigration(makeV02Blob())).toBe(false);
  });

  it('uses CURRENT_SCHEMA_VERSION as the target', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe('0.2');
  });
});

// ---------------------------------------------------------------------------
// migrateSaveBlob
// ---------------------------------------------------------------------------

describe('migrateSaveBlob', () => {
  it('0.1 -> 0.2: stamps version, defaults idle fields, preserves everything else', () => {
    const original = makeV01Blob();
    const migrated = migrateSaveBlob(original);

    expect(migrated.schema_version).toBe('0.2');
    // Defaulted idle fields:
    expect(migrated.last_visited_at_unix).toBe(original.created_at_unix);
    expect(migrated.last_simulated_tick).toBe(0n);
    expect(migrated.pending_offline_summary).toBeNull();
    // Preserved fields:
    expect(migrated.engine_compat).toBe(original.engine_compat);
    expect(migrated.created_at_unix).toBe(original.created_at_unix);
    expect(migrated.run_id).toBe(original.run_id);
    // Chain shared by reference (read-only nested):
    expect(migrated.chain).toBe(original.chain);
    expect(migrated.chain.life_states[0]?.id).toBe('life-001');
    expect(migrated.chain.karma_state.accumulated_intent_roots.care).toBe(1);
    // Purity: the original 0.1 blob is untouched; the migrated object is new.
    expect(original.schema_version).toBe('0.1');
    expect(migrated).not.toBe(original);
  });

  it('0.1 -> 0.2 is deterministic (canonical SHA-256 stability)', () => {
    const a = migrateSaveBlob(makeV01Blob());
    const b = migrateSaveBlob(makeV01Blob());
    expect(canonicalStringify(a)).toBe(canonicalStringify(b));
  });

  it('0.2 passthrough: returns the same reference with all fields intact', () => {
    const blob = makeV02Blob();
    const out = migrateSaveBlob(blob);
    expect(out).toBe(blob);
    expect(out.last_visited_at_unix).toBe(1_700_000_500);
    expect(out.last_simulated_tick).toBe(42n);
    expect(out.pending_offline_summary).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Round-trip: serialize -> deserialize -> migrate
// ---------------------------------------------------------------------------

describe('serialize -> deserialize round-trip survives migration', () => {
  it('0.1 blob: migrate after deserialize, then re-serialize byte-identically', () => {
    const v01 = makeV01Blob();
    const restored = deserializeSaveBlob(serializeSaveBlob(v01)).saveBlob;
    expect(getBlobVersion(restored)).toBe('0.1');

    const migrated = migrateSaveBlob(restored);
    expect(getBlobVersion(migrated)).toBe('0.2');

    // Migrate-then-serialize-then-deserialize is idempotent on the canonical form.
    const reRestored = deserializeSaveBlob<SaveBlobV2>(serializeSaveBlob(migrated)).saveBlob;
    expect(canonicalStringify(reRestored)).toBe(canonicalStringify(migrated));
  });

  it('0.2 blob round-trips byte-identically without migration', () => {
    const v02 = makeV02Blob();
    const restored = deserializeSaveBlob<SaveBlobV2>(serializeSaveBlob(v02)).saveBlob;
    expect(canonicalStringify(restored)).toBe(canonicalStringify(v02));
  });
});

// ---------------------------------------------------------------------------
// SaveBlobSchema (Zod discriminated union — validates the on-disk form)
// ---------------------------------------------------------------------------

describe('SaveBlobSchema (Zod)', () => {
  // After serializeSaveBlob + JSON.parse, bigints appear as `{"__bigint":"..."}`
  // (the canonical encoded form), not real bigints. Validate that form here.
  function onDiskPayload(blob: AnySaveBlob): unknown {
    return (JSON.parse(serializeSaveBlob(blob)) as { payload: unknown }).payload;
  }

  it('accepts a 0.1 payload and a 0.2 payload', () => {
    expect(getBlobVersion(SaveBlobSchema.parse(onDiskPayload(makeV01Blob())) as AnySaveBlob)).toBe(
      '0.1',
    );
    expect(getBlobVersion(SaveBlobSchema.parse(onDiskPayload(makeV02Blob())) as AnySaveBlob)).toBe(
      '0.2',
    );
  });

  it('rejects an unknown schema_version', () => {
    expect(() => SaveBlobSchema.parse({ schema_version: '9.9', engine_compat: 'x' })).toThrow();
  });

  it('rejects a 0.2 payload whose last_simulated_tick is not the encoded bigint form', () => {
    // Real number where the schema expects {"__bigint":"42"}.
    const bad = {
      schema_version: '0.2',
      engine_compat: '0.2.0',
      created_at_unix: 1,
      last_visited_at_unix: 1,
      last_simulated_tick: 42,
      run_id: 'r',
      chain: {},
      pending_offline_summary: null,
    };
    expect(() => SaveBlobSchema.parse(bad)).toThrow();
  });
});
