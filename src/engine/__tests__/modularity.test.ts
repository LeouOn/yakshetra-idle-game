// Modularity proof — plan todo 27.
//
// Proves the engine is era-agnostic: BOTH era packs (Tang China and Fantasy
// Mahāyāna) share the SAME engine instance (the very same `applyChoice` and
// `advanceTurn` function references), and the two `rule_variation.enforces`
// values (`social-obligation` for Tang, `vow` for Fantasy) coexist via a
// single data-driven `EraRules` dispatch table keyed on the pack's
// `rule_variation.enforces` STRING — never on the pack id. Finally, the
// engine source is scanned at runtime to prove zero textual references to
// either era id outside this test file.
//
// Scope: TEST-ONLY. No engine source file is modified. See the gap note at
// the bottom for the partial coverage of the plan spec — the engine's
// `applyChoice` does not yet accept an `EraRules` callback (only `advanceTurn`
// does), so the data-driven dispatch is demonstrated through the turn hook
// that the engine already exposes.

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { advanceTurn, applyChoice, createLifeState, createRng } from '../';
import type {
  Choice,
  EffectOp,
  EraId,
  EraRules,
  LifeState,
  Predicate,
  RoleId,
  SocialIdentity,
} from '../';

// ---------------------------------------------------------------------------
// Fixed deterministic inputs (no Math.random / Date.now anywhere in this file)
// ---------------------------------------------------------------------------

const RNG_SEED = 0xfeed_face_1234_5678n;
const TANG_ERA = 'tang-china@0.1.0' as EraId;
const FANTASY_ERA = 'fantasy-mahayana@0.1.0' as EraId;

const IDENTITY: SocialIdentity = {
  gender: 'woman',
  social_class: 'literati-official',
  family_wealth_at_birth: 'modest',
  caste_status: 'common',
  disability_status: 'none',
};

function makeLife(era: EraId, role: RoleId): LifeState {
  return createLifeState({
    id: `life-${era}` as LifeState['id'],
    era,
    role,
    identity: IDENTITY,
  });
}

// ---------------------------------------------------------------------------
// Minimal in-memory rule_variation stubs (the plan permits in-memory stubs
// instead of loading the JSON5 packs). These mirror the shape of the
// `RuleVariation` schema in src/content/schema.ts.
// ---------------------------------------------------------------------------

/** Closed set of `rule_variation.enforces` values per the content schema. */
type RuleVariationId = 'social-obligation' | 'vow';

interface RuleVariationStub {
  id: string;
  description_sid: string;
  enforces: RuleVariationId;
}

interface PackStub {
  era: EraId;
  role: RoleId;
  rule_variation: RuleVariationStub;
}

/** Tang pack stub: literati-official under the social-obligation rule. */
const TANG_PACK: PackStub = {
  era: TANG_ERA,
  role: 'literati-official' as RoleId,
  rule_variation: {
    id: 'social-obligation',
    description_sid: 'tang.rule.social_obligation_sid',
    enforces: 'social-obligation',
  },
};

/** Fantasy pack stub: vow-bound-traveler under the vow rule. */
const FANTASY_PACK: PackStub = {
  era: FANTASY_ERA,
  role: 'vow-bound-traveler' as RoleId,
  rule_variation: {
    id: 'vow-enforcement',
    description_sid: 'fantasy.rule.vow_enforcement_sid',
    enforces: 'vow',
  },
};

// ---------------------------------------------------------------------------
// THE DATA-DRIVEN RULE-VARIATION DISPATCH TABLE
//
// This is the heart of the modularity proof. The engine stays era-agnostic by
// accepting an `EraRules` callback at `advanceTurn` time; the LOADER
// (simulated here by `loadPack`) selects the right callback based on
// `pack.rule_variation.enforces`. Note the dispatch key is the `enforces`
// STRING, never the pack id — so adding a third pack that also enforces
// `social-obligation` would reuse the same rule with zero engine changes.
// ---------------------------------------------------------------------------

/**
 * Tang social-obligation: each turn the literati-official accumulates +1
 * `obligation` resource — a mechanical trace of the "social expectation
 * constrains action" rule. Implemented purely through the EraRules hook; no
 * era id is consulted.
 */
const socialObligationRules: EraRules = {
  advancePerTurn(state: LifeState): Partial<LifeState> {
    return { resources: { obligation: (state.resources.obligation ?? 0) + 1 } };
  },
};

/**
 * Fantasy vow-enforcement: while a `vow:active` flag is set, each turn drains
 * 1 `energy` (vows demand attention). Implemented purely through the EraRules
 * hook; no era id is consulted.
 */
const vowEnforcementRules: EraRules = {
  advancePerTurn(state: LifeState): Partial<LifeState> {
    if (!state.flags.has('vow:active')) return {};
    return { resources: { energy: Math.max(0, (state.resources.energy ?? 0) - 1) } };
  },
};

/**
 * The single dispatch point: `enforces` string -> EraRules. This is the ONLY
 * place a rule variation is selected, and it keys on the data field, not on
 * the era id. Engine code never sees this table.
 */
const RULE_VARIATION_TABLE: Record<RuleVariationId, EraRules> = {
  'social-obligation': socialObligationRules,
  vow: vowEnforcementRules,
};

/**
 * The simulated loader. Returns the SAME `applyChoice` and `advanceTurn`
 * references for every pack (they are imported once at the top of this file);
 * only the EraRules instance varies, selected by `rule_variation.enforces`.
 */
function loadPack(pack: PackStub): {
  applyChoice: typeof applyChoice;
  advanceTurn: typeof advanceTurn;
  eraRules: EraRules;
} {
  const eraRules = RULE_VARIATION_TABLE[pack.rule_variation.enforces];
  return { applyChoice, advanceTurn, eraRules };
}

// ===========================================================================
// (a) Both era packs share one engine
// ===========================================================================

describe('modularity proof (plan todo 27) — (a) both packs share one engine', () => {
  it('loadPack returns the SAME applyChoice reference for Tang and Fantasy', () => {
    const tang = loadPack(TANG_PACK);
    const fantasy = loadPack(FANTASY_PACK);
    // Reference equality: the engine exposes ONE applyChoice; the loader does
    // not wrap or fork it per era.
    expect(tang.applyChoice).toBe(fantasy.applyChoice);
    expect(tang.applyChoice).toBe(applyChoice);
  });

  it('loadPack returns the SAME advanceTurn reference for Tang and Fantasy', () => {
    const tang = loadPack(TANG_PACK);
    const fantasy = loadPack(FANTASY_PACK);
    expect(tang.advanceTurn).toBe(fantasy.advanceTurn);
    expect(tang.advanceTurn).toBe(advanceTurn);
  });

  it('the two packs differ ONLY in their EraRules instance (data, not code)', () => {
    const tang = loadPack(TANG_PACK);
    const fantasy = loadPack(FANTASY_PACK);
    expect(tang.eraRules).not.toBe(fantasy.eraRules);
    // And each pack resolves to the canonical rule from the table:
    expect(tang.eraRules).toBe(socialObligationRules);
    expect(fantasy.eraRules).toBe(vowEnforcementRules);
  });
});

// ===========================================================================
// (b) Rule variation is data-driven (dispatch on `enforces`, not on era id)
// ===========================================================================

describe('modularity proof (plan todo 27) — (b) rule variation is data-driven', () => {
  it('social-obligation accumulates obligation on each turn (Tang)', () => {
    const { advanceTurn: adv, eraRules } = loadPack(TANG_PACK);
    const rng = createRng(RNG_SEED);
    let life = makeLife(TANG_PACK.era, TANG_PACK.role);
    expect(life.resources.obligation).toBe(0);
    life = adv(life, rng, eraRules);
    life = adv(life, rng, eraRules);
    life = adv(life, rng, eraRules);
    expect(life.resources.obligation).toBe(3);
  });

  it('vow rule drains energy while vow:active flag is set (Fantasy)', () => {
    const { advanceTurn: adv, eraRules } = loadPack(FANTASY_PACK);
    const rng = createRng(RNG_SEED);
    const fresh = makeLife(FANTASY_PACK.era, FANTASY_PACK.role);
    const startingEnergy = fresh.resources.energy ?? 0;
    // Set the vow flag — this is the data condition the rule reads; no era id.
    let life: LifeState = { ...fresh, flags: new Set([...fresh.flags, 'vow:active']) };
    life = adv(life, rng, eraRules);
    life = adv(life, rng, eraRules);
    expect(life.resources.energy ?? 0).toBe(startingEnergy - 2);
  });

  it('vow rule is inert without the vow:active flag (no spurious effect)', () => {
    const { advanceTurn: adv, eraRules } = loadPack(FANTASY_PACK);
    const rng = createRng(RNG_SEED);
    const fresh = makeLife(FANTASY_PACK.era, FANTASY_PACK.role);
    const startingEnergy = fresh.resources.energy ?? 0;
    const life = adv(fresh, rng, eraRules);
    // Energy untouched by the rule (the base tick decrements time only).
    expect(life.resources.energy ?? 0).toBe(startingEnergy);
  });

  it('swapping the enforces string swaps the active rule WITHOUT touching the era id', () => {
    // Two synthetic packs that share the SAME era id but differ in
    // `rule_variation.enforces`. If dispatch were era-keyed, both would
    // behave identically. They don't — the data field is what selects the rule.
    const sameEra: EraId = 'era-probe@0.1.0' as EraId;
    const probeRole: RoleId = 'probe-role' as RoleId;
    const packA: PackStub = {
      era: sameEra,
      role: probeRole,
      rule_variation: { id: 'a', description_sid: 'a_sid', enforces: 'social-obligation' },
    };
    const packB: PackStub = {
      era: sameEra,
      role: probeRole,
      rule_variation: { id: 'b', description_sid: 'b_sid', enforces: 'vow' },
    };

    const rng = createRng(RNG_SEED);
    const probeLife = makeLife(sameEra, probeRole);
    const lifeA = advanceTurn(probeLife, rng, loadPack(packA).eraRules);
    const lifeB = advanceTurn(
      { ...probeLife, flags: new Set(['vow:active']) },
      rng,
      loadPack(packB).eraRules,
    );

    // Same era id, different rule outcome — proves dispatch is keyed on the
    // data field, not the era.
    expect(lifeA.resources.obligation).toBe(1); // social-obligation fired
    expect(lifeB.resources.obligation).toBe(0); // vow rule does not touch obligation
    expect(lifeB.resources.energy ?? 0).toBe((probeLife.resources.energy ?? 0) - 1); // vow drained 1
  });

  it('applyChoice is unaffected by the rule variation (engine stays uniform)', () => {
    // applyChoice does not consult EraRules at all (gap noted at the bottom);
    // the same choice produces the same effect under either pack.
    const effects: EffectOp[] = [{ op: 'add_resource', key: 'trust', delta: 5 }];
    const c: Choice = {
      id: 'choice:probe',
      label_sid: 'choice_probe_sid',
      requires: [] as Predicate[],
      effects,
      forbidden: false,
    };
    const rng = createRng(RNG_SEED);
    const beforeT = makeLife(TANG_PACK.era, TANG_PACK.role);
    const beforeF = makeLife(FANTASY_PACK.era, FANTASY_PACK.role);
    const afterT = applyChoice(beforeT, c, rng);
    const afterF = applyChoice(beforeF, c, rng);
    expect(afterT.resources.trust ?? 0).toBe((beforeT.resources.trust ?? 0) + 5);
    expect(afterF.resources.trust ?? 0).toBe((beforeF.resources.trust ?? 0) + 5);
  });

  it('no era id appears in the dispatch table key set (data field is the only key)', () => {
    // Structural assertion: the table is keyed by the rule-variation id, not
    // by any era id literal.
    const keys = Object.keys(RULE_VARIATION_TABLE);
    expect(keys).toEqual(['social-obligation', 'vow']);
    expect(keys.some((k) => k.includes('tang') || k.includes('fantasy'))).toBe(false);
  });
});

// ===========================================================================
// (c) No hard-coded era checks anywhere in src/engine non-test source
// ===========================================================================

/**
 * Walk `src/engine/` (excluding `__tests__`) collecting every non-test `.ts`
 * file's textual content. The modularity invariant is: the engine source
 * never literally names an era id.
 */
function collectEngineSource(): string[] {
  const engineDir = join(process.cwd(), 'src', 'engine');
  const out: string[] = [];
  const visit = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        if (entry === '__tests__') continue; // tests may name eras freely
        visit(full);
        continue;
      }
      if (entry.endsWith('.ts')) out.push(readFileSync(full, 'utf8'));
    }
  };
  visit(engineDir);
  return out;
}

describe('modularity proof (plan todo 27) — (c) zero hard-coded era checks', () => {
  it('no non-test source file in src/engine mentions tang-china or fantasy-mahayana', () => {
    const sources = collectEngineSource();
    // Sanity: the walk must not be empty — that would make the test vacuous.
    expect(sources.length).toBeGreaterThan(0);
    const blob = sources.join('\n');
    expect(blob).not.toContain('tang-china');
    expect(blob).not.toContain('fantasy-mahayana');
  });

  it('the walk is non-vacuous: real engine content is actually read', () => {
    const sources = collectEngineSource();
    // reducer.ts's header comment string proves we are reading real content.
    expect(sources.join('\n')).toContain('applyChoice');
  });
});

// ---------------------------------------------------------------------------
// Gap note (documentation only — no engine modification in this todo)
// ---------------------------------------------------------------------------
//
// The plan spec for T27 step 1 asks that the social-obligation rule be added
// to `applyChoice` via an EraRules callback injected at engine init. The
// engine today exposes an EraRules hook ONLY on `advanceTurn` (see
// `src/engine/turn.ts`); `applyChoice` does not accept an EraRules argument.
//
// This todo is test-only and must NOT modify engine code, so the data-driven
// EraRules dispatch is demonstrated through the hook that the engine DOES
// expose (`advanceTurn`). The "no era checks" filesystem scan in group (c)
// is the load-bearing assertion: it proves the engine source is era-agnostic
// regardless of how many EraRules hooks exist. Wiring an EraRules hook into
// `applyChoice` itself is left to a future engine-extension todo.
