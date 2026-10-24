// Studio session state container — the bench's load/catch-up/step/save loop.
//
// Extracted from StudioView (Phase 3 Task 4) with behavior parity: the same
// slices, the same effects, the same dependency arrays. The view keeps
// render + handlers; this hook owns the session model:
//   - slice state (life, idle, studio, practices, progression, members,
//     world drafts, tier benches) and the benchRef the handlers read;
//   - the persisted load + away catch-up (catchUpSession over the absence);
//   - the save effect;
//   - adoption (hydrate a stepped session back into the slices).
//
// Tier-generalized: the non-person benches live in ONE map keyed by tier id
// (any unlocked tier's bench rides the session), and world-draft recording
// walks every tier scale from the registry instead of hardcoding person.
// Tier enumeration comes from registries().tiers — never a tier literal.

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import { loadEraPack } from '@/content/loader';
import type { Practice as ContentPractice, Ending } from '@/content/schema';
import { loadProgression, type ProgressionRegistries } from '@/content/progression/loader';
import {
  catchUpSession,
  computeGlobalRewards,
  createIdleState,
  createLifeState,
  createRng,
  createStudioState,
  defaultProgression,
  hydrateStudioSession,
  snapshotStudioSession,
  type BenchState,
  type IdleState,
  type KindRule,
  type LifeState,
  type Manifest,
  type ManifestScale,
  type MemberSlice,
  type Practice,
  type Rng,
  type SessionProgression,
  type SessionStepContext,
  type StudioSession,
  type StudioState,
  type WorldDraftReference,
} from '@/engine';
import { withRecordedDrafts as withRecordedDraftsForScales } from '@/engine/world-scale';
import {
  addBenchModifiers,
  computeBenchModifiers,
  effectiveAwayCap,
  type BenchModifiers,
} from '@/engine/endowment';
import { activeVisitorFor, visitorModifierOverlay } from '@/engine/visitors';
import { loadStudioSession, saveStudioSession, type StudioKv } from '@/persistence';
import type { DailySchedule } from '@/engine/schedule';
import { EMBODIED_TIER } from '@/engine/ladder-const';
import { deriveReturnSummary, type ReturnSummary } from '@/ui/hooks/away-summary';
import { DEFAULT_BENCH_ERA } from '@/ui/hooks/bench-era';

/**
 * The pack the roster policies are AUTHORED against: their schedules (`schedule:household-morning`
 * ...) and practices (`practice:tang/alms-round` ...) exist only in the Tang pack. A bench in another
 * era tries its own pack first and falls back here for any policy that pack does not carry, so the
 * roster keeps running; closing that gap needs per-era policy content, not wiring.
 */
const POLICY_FALLBACK_PACK = DEFAULT_BENCH_ERA;

/**
 * Stable session seed for the autonomous member rng streams: roster
 * `memberSeed` derives each member's stream from `<sessionSeed>:<memberId>`,
 * so member days replay identically across reloads and devices.
 */
const SESSION_SEED = 'yakshetra-studio';

let registriesCache: ProgressionRegistries | null = null;

export function registries(): ProgressionRegistries {
  if (registriesCache === null) {
    registriesCache = loadProgression();
  }
  return registriesCache;
}

interface PolicyRuntime {
  readonly practices: readonly Practice[];
  readonly schedule: DailySchedule;
}

const policyRuntimeCache = new Map<string, ReadonlyMap<string, PolicyRuntime>>();

function toRuntimePractice(practice: ContentPractice): Practice {
  const { minigame_id, ...rest } = practice;
  return {
    ...rest,
    currentProgress: 0,
    level: 0,
    ...(minigame_id === undefined ? {} : { minigame_id }),
  };
}

type LoadedPack = ReturnType<typeof loadEraPack>;

/** One policy resolved against one pack; throws when the pack lacks its schedule or a practice. */
function resolvePolicy(
  policy: ProgressionRegistries['policies'][number],
  pack: LoadedPack,
): PolicyRuntime {
  const schedule = pack.schedules.find((row) => row.id === policy.schedule_ref);
  if (schedule === undefined) {
    throw new Error(`studio: policy "${policy.id}" has no schedule "${policy.schedule_ref}"`);
  }
  return {
    practices: policy.practices.map((id) => {
      const found = pack.practices.find((row) => row.id === id);
      if (found === undefined) {
        throw new Error(`studio: policy "${policy.id}" has no practice "${id}"`);
      }
      return toRuntimePractice(found);
    }),
    schedule,
  };
}

/**
 * Roster policy rows resolved to runtime practices + schedules for a bench era: the era's own
 * pack first, the Tang pack the policies are authored against for any policy the era pack does
 * not carry (today every policy, in the Garden).
 */
export function policyRuntime(era: string): ReadonlyMap<string, PolicyRuntime> {
  const cached = policyRuntimeCache.get(era);
  if (cached !== undefined) {
    return cached;
  }
  const fallback = loadEraPack(POLICY_FALLBACK_PACK);
  let own: LoadedPack | null = null;
  if (era !== POLICY_FALLBACK_PACK) {
    try {
      own = loadEraPack(era);
    } catch {
      own = null;
    }
  }
  const out = new Map<string, PolicyRuntime>();
  for (const policy of registries().policies) {
    let resolved: PolicyRuntime | null = null;
    if (own !== null) {
      try {
        resolved = resolvePolicy(policy, own);
      } catch {
        resolved = null;
      }
    }
    out.set(policy.id, resolved ?? resolvePolicy(policy, fallback));
  }
  policyRuntimeCache.set(era, out);
  return out;
}

let rulesByScaleCache: Readonly<Record<string, readonly KindRule[]>> | null = null;

/** Loader kind rules regrouped by row scale, file order preserved. */
export function kindRulesByScale(): Readonly<Record<string, readonly KindRule[]>> {
  if (rulesByScaleCache === null) {
    const { kindRows, kindRules } = registries();
    const out: Record<string, KindRule[]> = {};
    kindRows.forEach((row, index) => {
      const rule = kindRules[index];
      if (rule === undefined) {
        throw new Error('studio: progression kind rows and rules are out of parallel order');
      }
      out[row.scale] = [...(out[row.scale] ?? []), rule];
    });
    rulesByScaleCache = out;
  }
  return rulesByScaleCache;
}

let tierScalesCache: readonly ManifestScale[] | null = null;

/** Distinct tier scales in ladder order — world-draft recording walks these. */
function tierScales(): readonly ManifestScale[] {
  if (tierScalesCache === null) {
    tierScalesCache = [...new Set(registries().tiers.map((tier) => tier.scale))];
  }
  return tierScalesCache;
}

/** The session's non-person benches, keyed by tier id. */
export function nonPersonBenches(session: StudioSession): Readonly<Record<string, BenchState>> {
  const out: Record<string, BenchState> = {};
  for (const [id, bench] of Object.entries(session.benches)) {
    if (id !== EMBODIED_TIER) {
      out[id] = bench;
    }
  }
  return out;
}

/** The session-relevant state slices, in the shape snapshotStudioSession eats. */
export interface BenchSlices {
  readonly studio: StudioState;
  readonly idle: IdleState;
  readonly life: LifeState;
  readonly practices: readonly Practice[];
  readonly progression: SessionProgression;
  readonly members: Record<string, MemberSlice>;
  readonly worldDrafts: readonly WorldDraftReference[];
  readonly benches: Readonly<Record<string, BenchState>>;
  /** The era the bench runs, carried so a re-snapshot never resets what the bridge wrote. */
  readonly benchEra?: string | undefined;
}

export function sessionFromSlices(slices: BenchSlices, lastVisitedAtUnix?: number): StudioSession {
  const base = snapshotStudioSession(
    slices.studio,
    slices.idle,
    slices.life,
    slices.practices,
    lastVisitedAtUnix,
    slices.progression,
    {
      members: slices.members,
      world_drafts: slices.worldDrafts,
      ...(slices.benchEra === undefined ? {} : { bench_era: slices.benchEra }),
    },
  );
  const ids = Object.keys(slices.benches);
  if (ids.length === 0) {
    return base;
  }
  const benches: Record<string, BenchState> = { ...base.benches };
  for (const id of ids) {
    benches[id] = slices.benches[id]!;
  }
  return { ...base, benches };
}

/**
 * World-draft ledger: one reference per assembled world at every tier scale
 * (person caps at one; every other scale accrues floor(cards/2)). The pure
 * recorder lives in the engine (`withRecordedDrafts` in world-scale.ts);
 * this wrapper injects the registry's tier scales. Called wherever the
 * archive can grow — mount, persisted load, and each harvest.
 */
export function withRecordedDrafts(
  archive: readonly Manifest[],
  drafts: readonly WorldDraftReference[],
): readonly WorldDraftReference[] {
  return withRecordedDraftsForScales(archive, drafts, tierScales());
}

/**
 * Endowment modifiers for one session's tiers, composed with the seated
 * visitor's overlay and the compendium's per-session global bonus. Track
 * rows and visitor rows are mount-stable content; the endowed lists,
 * visitor seats, and compendium_done list live on the session, so the
 * resolver is rebuilt per session.
 */
export function modifiersForSession(session: StudioSession): (tierId: string) => BenchModifiers {
  const tracks = registries().endowment;
  const visitorRows = registries().visitors;
  const global = computeGlobalRewards(session.compendium_done, registries().compendium);
  return (tierId: string): BenchModifiers =>
    addBenchModifiers(
      computeBenchModifiers(tierId, session, tracks, global),
      visitorModifierOverlay(visitorRows, activeVisitorFor(session, tierId)?.id ?? null),
    );
}

export interface UseStudioSessionArgs {
  readonly practices: readonly Practice[];
  readonly schedule: DailySchedule;
  /** Authored day schedules the bench rotates through per in-game day
   * (lane b1). Absent → the embodied life runs on `schedule` alone. */
  readonly embodiedSchedules?: readonly DailySchedule[];
  readonly endings: readonly Ending[];
  readonly initialLife?: LifeState;
  readonly initialIdle?: IdleState;
  readonly initialStudio?: StudioState;
  /** Full session to open the bench from (tests, embeds); overrides the piecemeal initials. */
  readonly initialSession?: StudioSession;
  /** The era the bench life carries (a real pack id). Absent: the era-neutral stand-in token. */
  readonly benchEra?: string;
  readonly rng?: Rng;
  /** When true, load/save the bench through {@link storage}. */
  readonly persist: boolean;
  readonly storage?: StudioKv;
  /** Unix seconds. Injected so catch-up stays testable. */
  readonly clock: () => number;
}

export interface UseStudioSessionResult {
  readonly life: LifeState;
  readonly idle: IdleState;
  readonly studio: StudioState;
  readonly runtimePractices: readonly Practice[];
  readonly progression: SessionProgression;
  readonly members: Record<string, MemberSlice>;
  readonly worldDrafts: readonly WorldDraftReference[];
  readonly benches: Readonly<Record<string, BenchState>>;
  readonly ready: boolean;
  readonly away: ReturnSummary | null;
  readonly rngRef: { readonly current: Rng };
  readonly benchRef: { readonly current: BenchSlices };
  readonly setLife: Dispatch<SetStateAction<LifeState>>;
  readonly setIdle: Dispatch<SetStateAction<IdleState>>;
  readonly setStudio: Dispatch<SetStateAction<StudioState>>;
  readonly setRuntimePractices: Dispatch<SetStateAction<Practice[]>>;
  readonly setProgression: Dispatch<SetStateAction<SessionProgression>>;
  readonly setMembers: Dispatch<SetStateAction<Record<string, MemberSlice>>>;
  readonly setWorldDrafts: Dispatch<SetStateAction<readonly WorldDraftReference[]>>;
  readonly setBenches: Dispatch<SetStateAction<Readonly<Record<string, BenchState>>>>;
  readonly setAway: Dispatch<SetStateAction<ReturnSummary | null>>;
  /** Session as it stands right now, every tier bench included. */
  readonly buildSession: (lastVisitedAtUnix?: number) => StudioSession;
  readonly stepCtx: (session: StudioSession) => SessionStepContext;
  /** Drive the bench slices, members, tier benches, and visitor seats from a stepped session. */
  readonly adoptSteppedSession: (next: StudioSession) => void;
}

function defaultLife(era?: string): LifeState {
  return createLifeState({
    id: 'studio-bench' as LifeState['id'],
    // A real era id lets `eraFamilyOf` resolve, so harvests follow the era; the token does not.
    era: (era ?? 'studio-bench@0.1.0') as LifeState['era'],
    role: 'operator' as LifeState['role'],
    identity: {
      gender: 'unspecified',
      social_class: 'operator',
      family_wealth_at_birth: 'unspecified',
      caste_status: 'none',
      disability_status: 'none',
    },
  });
}

export function useStudioSession({
  practices,
  schedule,
  embodiedSchedules,
  endings,
  initialLife,
  initialIdle,
  initialStudio,
  initialSession,
  benchEra: benchEraArg,
  rng,
  persist,
  storage,
  clock,
}: UseStudioSessionArgs): UseStudioSessionResult {
  const rngRef = useRef<Rng>(rng ?? createRng(0x5eedn));
  const packPracticesRef = useRef(practices);
  const [bootstrap] = useState(() =>
    initialSession === undefined
      ? null
      : hydrateStudioSession(initialSession, initialLife ?? defaultLife(benchEraArg), practices),
  );
  const [life, setLife] = useState<LifeState>(
    () => bootstrap?.life ?? initialLife ?? defaultLife(benchEraArg),
  );
  // What the session records as the bench's era: the argument, else what the saved session holds.
  const [benchEra, setBenchEra] = useState<string | undefined>(
    () => benchEraArg ?? initialSession?.bench_era,
  );
  const [idle, setIdle] = useState<IdleState>(
    () => bootstrap?.idle ?? initialIdle ?? createIdleState(),
  );
  const [studio, setStudio] = useState<StudioState>(
    () => bootstrap?.studio ?? initialStudio ?? createStudioState(),
  );
  const [runtimePractices, setRuntimePractices] = useState<Practice[]>(() =>
    bootstrap === null ? [...practices] : [...bootstrap.practices],
  );
  const [progression, setProgression] = useState<SessionProgression>(
    () => bootstrap?.progression ?? defaultProgression(),
  );
  const [members, setMembers] = useState<Record<string, MemberSlice>>(
    () => bootstrap?.members ?? {},
  );
  const [worldDrafts, setWorldDrafts] = useState<readonly WorldDraftReference[]>(() =>
    withRecordedDrafts(
      (bootstrap?.studio ?? initialStudio ?? createStudioState()).archive,
      bootstrap?.world_drafts ?? [],
    ),
  );
  const [benches, setBenches] = useState<Readonly<Record<string, BenchState>>>(() =>
    initialSession === undefined ? {} : nonPersonBenches(initialSession),
  );
  const [ready, setReady] = useState(!persist);
  const [away, setAway] = useState<ReturnSummary | null>(null);
  const benchRef = useRef<BenchSlices>({
    studio,
    idle,
    life,
    practices: runtimePractices,
    progression,
    members,
    worldDrafts,
    benches,
    benchEra,
  });

  useEffect(() => {
    benchRef.current = {
      studio,
      idle,
      life,
      practices: runtimePractices,
      progression,
      members,
      worldDrafts,
      benches,
      benchEra,
    };
  }, [studio, idle, life, runtimePractices, progression, members, worldDrafts, benches, benchEra]);

  const stepCtxRef = useRef<SessionStepContext | null>(null);

  /**
   * Session-step context. The pack-constant members are captured once per
   * mount; `modifiersFor` must see the CURRENT session's endowed tiers, so it
   * is layered over the cached capture on every call.
   */
  function stepCtx(session: StudioSession): SessionStepContext {
    if (stepCtxRef.current === null) {
      const policies = policyRuntime(benchEraArg ?? DEFAULT_BENCH_ERA);
      const resolve = (id: string): PolicyRuntime => {
        const found = policies.get(id);
        if (found === undefined) {
          throw new Error(`studio: no runtime registered for policy "${id}"`);
        }
        return found;
      };
      stepCtxRef.current = {
        practices,
        embodiedSchedule: schedule,
        ...(embodiedSchedules === undefined ? {} : { embodiedSchedules }),
        memberScheduleFor: (id) => resolve(id).schedule,
        memberPracticesFor: (id) => resolve(id).practices,
        endings,
        sessionSeed: SESSION_SEED,
        visitors: registries().visitors,
        tiers: registries().tiers.map((tier) => ({
          id: tier.id,
          scale: tier.scale,
          fold_cadence: tier.fold_cadence,
        })),
      };
    }
    return { ...stepCtxRef.current, modifiersFor: modifiersForSession(session) };
  }

  useEffect(() => {
    if (!persist) {
      return;
    }
    let cancelled = false;
    void loadStudioSession(storage).then((session) => {
      if (cancelled) {
        return;
      }
      if (session !== null) {
        // Catch-up is one engine call: capped ticks, stepSession, stamp
        // last_visited. Autonomous members and every unlocked tier advance;
        // a household-locked session reduces to person-only by stepSession's
        // golden invariant. Persist the stamped session before ready so a
        // remount cannot re-apply the same absence.
        const nowUnix = clock();
        const caught = catchUpSession(
          session,
          stepCtx(session),
          nowUnix,
          rngRef.current,
          effectiveAwayCap(
            session,
            registries().endowment,
            computeGlobalRewards(session.compendium_done, registries().compendium),
            registries().visitors,
          ),
        );
        const next = caught.session;
        const hydrated = hydrateStudioSession(
          next,
          initialLife ?? defaultLife(benchEraArg),
          packPracticesRef.current,
        );
        setBenchEra((current) => current ?? session.bench_era);
        setLife(hydrated.life);
        setIdle(hydrated.idle);
        setStudio(hydrated.studio);
        setRuntimePractices(hydrated.practices);
        setProgression(hydrated.progression);
        setMembers({ ...hydrated.members });
        setWorldDrafts(withRecordedDrafts(hydrated.studio.archive, hydrated.world_drafts));
        setBenches(nonPersonBenches(next));
        if (caught.summary.embodiedTicks > 0) {
          const summary = deriveReturnSummary({
            ticksSimulated: caught.summary.embodiedTicks,
            residueGained: next.life.residue.length - session.life.residue.length,
            harvested: caught.harvested,
            benchesReady: caught.summary.benchesReady,
            capped: caught.summary.capped,
          });
          if (summary !== null) {
            setAway(summary);
          }
          void saveStudioSession(next, storage);
        }
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
    // stepCtx reads mount-stable refs/props; listing the render-scoped
    // function would re-run the load on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persist, storage, initialLife, schedule, endings, clock]);

  /** Session as it stands right now, every tier bench included. */
  function buildSession(lastVisitedAtUnix?: number): StudioSession {
    return sessionFromSlices(
      {
        studio,
        idle,
        life,
        practices: runtimePractices,
        progression,
        members,
        worldDrafts,
        benches,
        benchEra,
      },
      lastVisitedAtUnix,
    );
  }

  useEffect(() => {
    if (!persist || !ready) {
      return;
    }
    void saveStudioSession(buildSession(clock()), storage);
    // buildSession folds the current render's state into the snapshot; listing
    // the underlying values keeps this effect honest without a memo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    persist,
    ready,
    storage,
    clock,
    studio,
    idle,
    life,
    runtimePractices,
    progression,
    members,
    worldDrafts,
    benches,
    benchEra,
  ]);

  /** Drive the person-bench slices, members, tier benches, and visitor
   * seats (they live on the tiers slice) from a stepped session. */
  function adoptSteppedSession(next: StudioSession): void {
    const back = hydrateStudioSession(next, benchRef.current.life, benchRef.current.practices);
    setLife(back.life);
    setIdle(back.idle);
    setStudio(back.studio);
    setRuntimePractices(back.practices);
    setMembers({ ...back.members });
    setProgression((current) => ({ ...current, tiers: next.tiers }));
    setBenches(nonPersonBenches(next));
  }

  return {
    life,
    idle,
    studio,
    runtimePractices,
    progression,
    members,
    worldDrafts,
    benches,
    ready,
    away,
    rngRef,
    benchRef,
    setLife,
    setIdle,
    setStudio,
    setRuntimePractices,
    setProgression,
    setMembers,
    setWorldDrafts,
    setBenches,
    setAway,
    buildSession,
    stepCtx,
    adoptSteppedSession,
  };
}
