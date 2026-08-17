// Studio session state container — the bench's load/catch-up/step/save loop.
//
// Extracted from StudioView (Phase 3 Task 4) with behavior parity: the same
// slices, the same effects, the same dependency arrays. The view keeps
// render + handlers; this hook owns the session model:
//   - slice state (life, idle, studio, practices, progression, members,
//     world drafts, tier benches) and the benchRef the handlers read;
//   - the persisted load + away catch-up (stepSession over the absence);
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
  computeGlobalRewards,
  createIdleState,
  createLifeState,
  createRng,
  createStudioState,
  defaultProgression,
  hydrateStudioSession,
  snapshotStudioSession,
  stepSession,
  studioTicksAway,
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
  type StudioAwaySummary,
  type StudioSession,
  type StudioState,
  type WorldDraftReference,
} from '@/engine';
import { assembleWorldDraftAtScale, recordWorldDraftAtScale } from '@/engine/world-scale';
import {
  addBenchModifiers,
  computeBenchModifiers,
  effectiveAwayCap,
  type BenchModifiers,
} from '@/engine/endowment';
import { activeVisitorFor, visitorModifierOverlay } from '@/engine/visitors';
import { loadStudioSession, saveStudioSession, type StudioKv } from '@/persistence';
import type { DailySchedule } from '@/engine/schedule';

/** The embodied life's tier — the ladder's first rung and the person bench. */
export const EMBODIED_TIER = 'person';

/** Phase 1 residue-source pack; roster policies resolve against it. */
const POLICY_PACK = 'tang-china';

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

let policyRuntimeCache: ReadonlyMap<string, PolicyRuntime> | null = null;

function toRuntimePractice(practice: ContentPractice): Practice {
  const { minigame_id, ...rest } = practice;
  return {
    ...rest,
    currentProgress: 0,
    level: 0,
    ...(minigame_id === undefined ? {} : { minigame_id }),
  };
}

/** Roster policy rows resolved to pack runtime practices + schedule. */
function policyRuntime(): ReadonlyMap<string, PolicyRuntime> {
  if (policyRuntimeCache === null) {
    const pack = loadEraPack(POLICY_PACK);
    const schedules = new Map(pack.schedules.map((row) => [row.id, row]));
    const practices = new Map(pack.practices.map((row) => [row.id, toRuntimePractice(row)]));
    const out = new Map<string, PolicyRuntime>();
    for (const policy of registries().policies) {
      const schedule = schedules.get(policy.schedule_ref);
      if (schedule === undefined) {
        throw new Error(`studio: policy "${policy.id}" has no schedule "${policy.schedule_ref}"`);
      }
      out.set(policy.id, {
        practices: policy.practices.map((id) => {
          const found = practices.get(id);
          if (found === undefined) {
            throw new Error(`studio: policy "${policy.id}" has no practice "${id}"`);
          }
          return found;
        }),
        schedule,
      });
    }
    policyRuntimeCache = out;
  }
  return policyRuntimeCache;
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
}

export function sessionFromSlices(slices: BenchSlices, lastVisitedAtUnix?: number): StudioSession {
  const base = snapshotStudioSession(
    slices.studio,
    slices.idle,
    slices.life,
    slices.practices,
    lastVisitedAtUnix,
    slices.progression,
    { members: slices.members, world_drafts: slices.worldDrafts },
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
 * World-draft ledger: once the archive assembles a draft at ANY tier scale,
 * that assembly is recorded (once per scale). Called wherever the archive
 * can grow — mount, persisted load, and each harvest.
 */
export function withRecordedDrafts(
  archive: readonly Manifest[],
  drafts: readonly WorldDraftReference[],
): readonly WorldDraftReference[] {
  let out = drafts;
  for (const scale of tierScales()) {
    if (assembleWorldDraftAtScale(archive, scale) === null) {
      continue;
    }
    out = recordWorldDraftAtScale(out, scale);
  }
  return out;
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
  readonly endings: readonly Ending[];
  readonly initialLife?: LifeState;
  readonly initialIdle?: IdleState;
  readonly initialStudio?: StudioState;
  /** Full session to open the bench from (tests, embeds); overrides the piecemeal initials. */
  readonly initialSession?: StudioSession;
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
  readonly away: StudioAwaySummary | null;
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
  readonly setAway: Dispatch<SetStateAction<StudioAwaySummary | null>>;
  /** Session as it stands right now, every tier bench included. */
  readonly buildSession: (lastVisitedAtUnix?: number) => StudioSession;
  readonly stepCtx: (session: StudioSession) => SessionStepContext;
  /** Drive the bench slices, members, tier benches, and visitor seats from a stepped session. */
  readonly adoptSteppedSession: (next: StudioSession) => void;
}

function defaultLife(): LifeState {
  return createLifeState({
    id: 'studio-bench' as LifeState['id'],
    era: 'studio-bench@0.1.0' as LifeState['era'],
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
  endings,
  initialLife,
  initialIdle,
  initialStudio,
  initialSession,
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
      : hydrateStudioSession(initialSession, initialLife ?? defaultLife(), practices),
  );
  const [life, setLife] = useState<LifeState>(
    () => bootstrap?.life ?? initialLife ?? defaultLife(),
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
  const [away, setAway] = useState<StudioAwaySummary | null>(null);
  const benchRef = useRef<BenchSlices>({
    studio,
    idle,
    life,
    practices: runtimePractices,
    progression,
    members,
    worldDrafts,
    benches,
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
    };
  }, [studio, idle, life, runtimePractices, progression, members, worldDrafts, benches]);

  const stepCtxRef = useRef<SessionStepContext | null>(null);

  /**
   * Session-step context. The pack-constant members are captured once per
   * mount; `modifiersFor` must see the CURRENT session's endowed tiers, so it
   * is layered over the cached capture on every call.
   */
  function stepCtx(session: StudioSession): SessionStepContext {
    if (stepCtxRef.current === null) {
      const policies = policyRuntime();
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
        // Catch-up rides the same stepSession path as live ticks (ticks math
        // via studioTicksAway) so autonomous members and every unlocked tier
        // bench advance during absence too; a household-locked session reduces
        // to the old person-only catch-up by stepSession's golden invariant.
        // The away cap carries the person tier's endowed offline_cap.
        const awayTicks = studioTicksAway(
          session.last_visited_at_unix ?? 0,
          clock(),
          effectiveAwayCap(
            session,
            registries().endowment,
            computeGlobalRewards(session.compendium_done, registries().compendium),
          ),
        );
        const stepped =
          awayTicks.ticks > 0
            ? stepSession(session, stepCtx(session), awayTicks.ticks, rngRef.current)
            : null;
        const next = stepped === null ? session : stepped.session;
        const hydrated = hydrateStudioSession(
          next,
          initialLife ?? defaultLife(),
          packPracticesRef.current,
        );
        setLife(hydrated.life);
        setIdle(hydrated.idle);
        setStudio(hydrated.studio);
        setRuntimePractices(hydrated.practices);
        setProgression(hydrated.progression);
        setMembers({ ...hydrated.members });
        setWorldDrafts(withRecordedDrafts(hydrated.studio.archive, hydrated.world_drafts));
        setBenches(nonPersonBenches(next));
        if (stepped !== null && stepped.summary.embodiedTicks > 0) {
          setAway({
            ticksSimulated: stepped.summary.embodiedTicks,
            residueGained: next.life.residue.length - session.life.residue.length,
            bayReady: stepped.summary.benchesReady.length > 0,
            capped: awayTicks.capped,
          });
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
