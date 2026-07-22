// Cross-life echo wiring integration test (plan todo 26).
//
// Verifies that the 4 echo types produced by a single completed Life 1 (Tang
// China) visibly flow into the Life 2 (Fantasy Mahayana) NextLifeSeed via the
// real reducer pipeline:
//
//   summarizeLife  ->  mergeKarma  ->  applyEchoesToNextLife
//
// Unlike echo.test.ts (which exercises each echo type in isolation), this test
// builds ONE Life 1 fixture that yields all 4 echo types simultaneously and
// asserts they survive the full pipeline into Life 2's seed — end to end, with
// no mocking of the engine functions under test.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { applyEchoesToNextLife, emptyKarma, mergeKarma, summarizeLife } from '../echo';
import { createRng } from '../rng';
import type {
  EraId,
  IntentRoot,
  LifeId,
  LifeState,
  ResourceId,
  RoleId,
  SocialIdentity,
} from '../types';

// ---------------------------------------------------------------------------
// Branded-string constructors (tests are the trust boundary for fixtures).
// ---------------------------------------------------------------------------

const lifeId = (s: string): LifeId => s as LifeId;
const eraId = (s: string): EraId => s as EraId;
const roleId = (s: string): RoleId => s as RoleId;

const NEUTRAL_IDENTITY: SocialIdentity = {
  gender: 'unspecified',
  social_class: 'unspecified',
  family_wealth_at_birth: 'unspecified',
  caste_status: 'unspecified',
  disability_status: 'unspecified',
};

/** A minimal valid LifeState; the test overrides the fields it cares about. */
function makeLife(
  overrides: Partial<LifeState> & Pick<LifeState, 'intent_root_history'>,
): LifeState {
  const resources: Record<ResourceId, number> = {
    time: 0,
    energy: 0,
    provisions: 0,
    trust: 0,
    skill: 0,
    obligation: 0,
  };
  return {
    identity: NEUTRAL_IDENTITY,
    id: lifeId('life-1'),
    era: eraId('era:test'),
    role: roleId('role:test'),
    age: 0,
    turn: 0,
    resources,
    skills: {},
    relationships: {},
    flags: new Set<string>(),
    chosen_lens: null,
    alive: true,
    last_narrative_sid: null,
    event_weights: {},
    cooldowns: {},
    history: [],
    fired_once_per_run: new Set<string>(),
    pending_events: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Fantasy Mahayana event graph — the Life 2 integration target.
//
// The engine produces NextLifeSeed.narrative_seed_events namespaced by the next
// era id (e.g. `fantasy-mahayana:tendency:aversion`). The content layer maps
// those seeds onto the concrete event ids below. We read events.json5 here only
// to assert the wiring TARGET exists; LifeState fixtures are built inline.
// ---------------------------------------------------------------------------

const HERE = dirname(fileURLToPath(import.meta.url));
// HERE = .../src/engine/__tests__/. Two '..' lands in src/, then content/...
const EVENTS_PATH = join(HERE, '..', '..', 'content', 'packs', 'fantasy-mahayana', 'events.json5');

/** Extract every `id: '...'` event id declared in the fantasy events graph. */
function readFantasyEventIds(): string[] {
  const text = readFileSync(EVENTS_PATH, 'utf8');
  const matches = [...text.matchAll(/id:\s*'(event:[^']+)'/g)];
  const ids: string[] = [];
  for (const m of matches) {
    const captured = m[1];
    if (captured !== undefined) ids.push(captured);
  }
  return ids;
}

describe('cross-life echo wiring — Life 1 (Tang) flows into Life 2 (Fantasy)', () => {
  it('demonstrates all 4 echo types flowing end-to-end through the real reducer pipeline', () => {
    // ---------------------------------------------------------------------
    // Given: ONE completed Life 1 (Tang China) that yields all 4 echo types
    // in a single summarizeLife pass:
    //
    //   intent_root_history:
    //     9 aversion turns then 6 care turns (15 total)
    //       - aversion share = 9/15 = 60%  -> tendency:aversion
    //       - 6 consecutive care AFTER prior aversion -> pattern_break
    //   flags:
    //     vow:protect-family:broken         -> vow:protect-family:broken
    //     attachment:daughter (uncleared)   -> unresolved_attachment:daughter
    // ---------------------------------------------------------------------
    const aversionRun: IntentRoot[] = Array.from({ length: 9 }, () => 'aversion');
    const careRun: IntentRoot[] = Array.from({ length: 6 }, () => 'care');

    const life1 = makeLife({
      id: lifeId('life-tang-1'),
      era: eraId('tang-china'),
      intent_root_history: [...aversionRun, ...careRun],
      flags: new Set<string>(['vow:protect-family:broken', 'attachment:daughter']),
    });

    // ---------------------------------------------------------------------
    // When: summarize Life 1 into its karma delta.
    // ---------------------------------------------------------------------
    const summary = summarizeLife(life1);

    // Then: all 4 echo types are present in the summary.
    const summaryTypes = new Set(summary.echoes.map((e) => e.type));
    expect(summaryTypes.has('tendency')).toBe(true);
    expect(summaryTypes.has('vow')).toBe(true);
    expect(summaryTypes.has('unresolved_attachment')).toBe(true);
    expect(summaryTypes.has('pattern_break')).toBe(true);
    expect(summary.echoes.length).toBe(4);

    // And: specifically the aversion tendency at exactly 60% share.
    const tendency = summary.echoes.find((e) => e.type === 'tendency');
    expect(tendency).toBeDefined();
    expect(tendency?.key).toBe('aversion');
    expect(tendency?.weight).toBeCloseTo(-0.6, 10); // -share = -(9/15)

    // And: the broken family vow (weight negative).
    const vow = summary.echoes.find((e) => e.type === 'vow');
    expect(vow).toBeDefined();
    expect(vow?.key).toBe('protect-family');
    expect(vow?.weight).toBe(-0.6);
    expect(summary.vows['protect-family']).toBe('broken');

    // And: the open daughter attachment.
    const attachment = summary.echoes.find((e) => e.type === 'unresolved_attachment');
    expect(attachment).toBeDefined();
    expect(attachment?.key).toBe('daughter');
    expect(attachment?.weight).toBe(-0.4);

    // And: the care-after-aversion pattern break.
    const patternBreak = summary.echoes.find((e) => e.type === 'pattern_break');
    expect(patternBreak).toBeDefined();
    expect(patternBreak?.key).toBe('care_after_aversion');
    expect(patternBreak?.weight).toBe(0.5);

    // ---------------------------------------------------------------------
    // When: fold the life summary into the (initially empty) chain karma.
    // ---------------------------------------------------------------------
    const merged = mergeKarma(emptyKarma(), summary);

    // Then: all 4 echo types survive the merge (cap is 6; we emit 4).
    const mergedTypes = new Set(merged.echoes.map((e) => e.type));
    expect(mergedTypes.size).toBe(4);
    expect(merged.echoes.length).toBe(4);
    // And: intent-root tallies carry forward.
    expect(merged.accumulated_intent_roots.aversion).toBe(9);
    expect(merged.accumulated_intent_roots.care).toBe(6);

    // ---------------------------------------------------------------------
    // When: project the merged karma into the Life 2 seed, deterministically.
    // ---------------------------------------------------------------------
    const rng = createRng(0x1234_5678_9abc_def0n);
    const seed = applyEchoesToNextLife(merged, eraId('fantasy-mahayana'), rng);

    // ---------------------------------------------------------------------
    // Then: narrative_seed_events is non-empty and every entry is namespaced
    // to the fantasy-mahayana era — i.e. the echoes visibly flow into Life 2.
    // ---------------------------------------------------------------------
    expect(seed.narrative_seed_events.length).toBeGreaterThan(0);
    for (const evt of seed.narrative_seed_events) {
      expect(evt.startsWith('fantasy-mahayana:')).toBe(true);
    }

    // And: each of the 4 echo types contributes at least one seeded event,
    // plus the broken vow contributes an additional vow_broken beat.
    const seedJoined = seed.narrative_seed_events.join('\n');
    expect(seedJoined).toContain('fantasy-mahayana:tendency:aversion');
    expect(seedJoined).toContain('fantasy-mahayana:vow:protect-family');
    expect(seedJoined).toContain('fantasy-mahayana:vow_broken:protect-family');
    expect(seedJoined).toContain('fantasy-mahayana:unresolved_attachment:daughter');
    expect(seedJoined).toContain('fantasy-mahayana:pattern_break:care_after_aversion');

    // And: the Life 2 event graph (the integration target) exists and contains
    // the echo-relevant events the spec cites — proving the wiring lands in a
    // real pack, not a void.
    const fantasyEventIds = readFantasyEventIds();
    expect(fantasyEventIds.length).toBeGreaterThan(0);
    expect(fantasyEventIds).toContain('event:fantasy/soul-in-torment'); // tendency target
    expect(fantasyEventIds).toContain('event:fantasy/vow-reminder'); // vow target

    // And: the aversion tendency projected its canonical resource penalty.
    expect(seed.starting_resources_modifier.time).toBe(-5);

    // And: an imagery tag was drawn deterministically from the tendency.
    expect(seed.permitted_imagery_tag).toBe('smoke'); // aversion -> smoke

    // ---------------------------------------------------------------------
    // CRITICAL INVARIANT (plan todo 7): the seed MUST NOT touch any
    // SocialIdentity field. Verified structurally (NextLifeSeed has none) and
    // here at runtime against every identity-shaped key.
    // ---------------------------------------------------------------------
    const identityFields: readonly string[] = [
      'gender',
      'social_class',
      'family_wealth_at_birth',
      'caste_status',
      'disability_status',
      'social_identity',
      'caste',
      'race',
      'wealth',
    ];
    for (const field of identityFields) {
      expect(Object.prototype.hasOwnProperty.call(seed, field)).toBe(false);
    }
    // And: the seed's own field keys carry no identity-shaped names.
    for (const key of Object.keys(seed)) {
      expect(/social_identity|caste|gender|race|disability|wealth/i.test(key)).toBe(false);
    }
  });
});
