// Manifest bench — tend work, cook a residue window, harvest a card.
//
// Presentational + local session state. The engine stays pure; this view
// steps the whole session through stepSession (embodied bench, autonomous
// members, household cook) and fills harvests via the table fallback.
// All copy is SIDs.
//
// Graduation: the session's progression slices (tiers, milestones, members,
// world drafts, household bench) live here, are persisted with the bench, and
// are checked against the content milestones after every change — crossing
// `unlock-household` graduates through the engine and raises the ceremony.

import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { loadEraPack } from '@/content/loader';
import type { Ending, Practice as ContentPractice } from '@/content/schema';
import { loadProgression, type ProgressionRegistries } from '@/content/progression/loader';
import {
  MIN_RESIDUE_TO_DEVELOP,
  QUALITY_UPGRADE_HARVESTS,
  STUDIO_TEND_TICKS,
  assembleWorldDraft,
  canHarvest,
  canUpgradeQuality,
  canonicalStringify,
  checkMilestones,
  computeGlobalRewards,
  compileRequestFromBay,
  computeArchiveStats,
  createIdleState,
  createLifeState,
  createRng,
  createStudioState,
  defaultProgression,
  evaluateLifeContext,
  graduateToHousehold,
  grantCompendium,
  harvestTableFill,
  hydrateStudioSession,
  pendingResidue,
  pinFocus,
  queueDevelop,
  snapshotStudioSession,
  stepSession,
  studioTicksAway,
  tableFillManifest,
  upgradeQuality,
  type ArchiveStats,
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
import {
  addBenchModifiers,
  computeBenchModifiers,
  effectiveAwayCap,
  type BenchModifiers,
} from '@/engine/endowment';
import { activeVisitorFor, noteVisitorHarvest, visitorModifierOverlay } from '@/engine/visitors';
import { loadStudioSession, saveStudioSession, type StudioKv } from '@/persistence';
import type { CalendarEpoch } from '@/engine/calendar';
import type { DailySchedule } from '@/engine/schedule';
import { resolveScheduleState } from '@/engine/schedule';
import { formatSid, resolveSid } from '@/i18n';
import { studioTheme as t } from '@/ui/studio-theme';
import StudioActivities from './StudioActivities';
import StudioArchive from './StudioArchive';
import StudioJuice from './StudioJuice';
import StudioLife from './StudioLife';
import StudioRail, { type RailTier } from './StudioRail';
import StudioWorld from './StudioWorld';

export const STUDIO_TEND_COUNT = STUDIO_TEND_TICKS;

const DEFAULT_EPOCH: CalendarEpoch = { year: 1, month: 1, day: 1, hour: 0 };

/** Phase 1: the embodied bench life is the person tier; the household rides beside it. */
const EMBODIED_SCALE: ManifestScale = 'person';
const HOUSEHOLD_SCALE: ManifestScale = 'household';
const EMBODIED_TIER = 'person';
const HOUSEHOLD_TIER = 'household';
const UNLOCK_HOUSEHOLD = 'unlock-household';

/** The two gte operands of `unlock-household`, hardcoded for Phase 1. */
const HOUSEHOLD_GATE: readonly { readonly key: string; readonly m: number }[] = [
  { key: 'archived.person', m: 3 },
  { key: 'world_drafts.total', m: 1 },
];

let registriesCache: ProgressionRegistries | null = null;

function registries(): ProgressionRegistries {
  if (registriesCache === null) {
    registriesCache = loadProgression();
  }
  return registriesCache;
}

let rulesByScaleCache: Readonly<Record<string, readonly KindRule[]>> | null = null;

/** Shared default so the `endings` prop keeps one identity across renders. */
const NO_ENDINGS: readonly Ending[] = [];

/** Phase 1 residue-source pack; roster policies resolve against it. */
const POLICY_PACK = 'tang-china';

/**
 * Stable session seed for the autonomous member rng streams: roster
 * `memberSeed` derives each member's stream from `<sessionSeed>:<memberId>`,
 * so member days replay identically across reloads and devices.
 */
const SESSION_SEED = 'yakshetra-studio';

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

/** The session-relevant state slices, in the shape snapshotStudioSession eats. */
interface BenchSlices {
  readonly studio: StudioState;
  readonly idle: IdleState;
  readonly life: LifeState;
  readonly practices: readonly Practice[];
  readonly progression: SessionProgression;
  readonly members: Record<string, MemberSlice>;
  readonly worldDrafts: readonly WorldDraftReference[];
  readonly householdBench: BenchState | null;
}

function sessionFromSlices(slices: BenchSlices, lastVisitedAtUnix?: number): StudioSession {
  const base = snapshotStudioSession(
    slices.studio,
    slices.idle,
    slices.life,
    slices.practices,
    lastVisitedAtUnix,
    slices.progression,
    { members: slices.members, world_drafts: slices.worldDrafts },
  );
  return slices.householdBench === null
    ? base
    : { ...base, benches: { ...base.benches, household: slices.householdBench } };
}

/** Loader kind rules regrouped by row scale, file order preserved. */
function kindRulesByScale(): Readonly<Record<string, readonly KindRule[]>> {
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

/**
 * Endowment modifiers for one session's tiers, composed with the seated
 * visitor's overlay and the compendium's per-session global bonus. Track
 * rows and visitor rows are mount-stable content; the endowed lists,
 * visitor seats, and compendium_done list live on the session, so the
 * resolver is rebuilt per session.
 */
function modifiersForSession(session: StudioSession): (tierId: string) => BenchModifiers {
  const tracks = registries().endowment;
  const visitorRows = registries().visitors;
  const global = computeGlobalRewards(session.compendium_done, registries().compendium);
  return (tierId: string): BenchModifiers =>
    addBenchModifiers(
      computeBenchModifiers(tierId, session, tracks, global),
      visitorModifierOverlay(visitorRows, activeVisitorFor(session, tierId)?.id ?? null),
    );
}

function statValue(stats: ArchiveStats, key: string): number {
  const dot = key.indexOf('.');
  if (dot <= 0) {
    return 0;
  }
  const section = key.slice(0, dot);
  const tail = key.slice(dot + 1);
  if (section === 'pinned') {
    return stats.pinned[tail] ?? 0;
  }
  if (section === 'archived') {
    return stats.archived[tail] ?? 0;
  }
  if (section === 'world_drafts') {
    return stats.world_drafts[tail] ?? 0;
  }
  if (section === 'harvests') {
    return stats.harvests[tail] ?? 0;
  }
  return 0;
}

/** The least-satisfied gte operand of the household gate, as n/m. */
function householdProgress(stats: ArchiveStats): { n: number; m: number } {
  let worstKey = HOUSEHOLD_GATE[0]?.key ?? 'archived.person';
  let worstM = HOUSEHOLD_GATE[0]?.m ?? 1;
  let worstRatio = Number.POSITIVE_INFINITY;
  for (const gate of HOUSEHOLD_GATE) {
    const ratio = Math.min(1, statValue(stats, gate.key) / gate.m);
    if (ratio < worstRatio) {
      worstRatio = ratio;
      worstKey = gate.key;
      worstM = gate.m;
    }
  }
  return { n: Math.min(statValue(stats, worstKey), worstM), m: worstM };
}

export interface StudioViewProps {
  readonly onBack?: () => void;
  readonly practices: readonly Practice[];
  readonly schedule: DailySchedule;
  readonly endings?: readonly Ending[];
  readonly initialLife?: LifeState;
  readonly initialIdle?: IdleState;
  readonly initialStudio?: StudioState;
  /** Full session to open the bench from (tests, embeds); overrides the piecemeal initials. */
  readonly initialSession?: StudioSession;
  readonly rng?: Rng;
  readonly onExport?: (json: string) => void;
  /** When true, load/save the bench through {@link storage}. */
  readonly persist?: boolean;
  readonly storage?: StudioKv;
  /** Unix seconds. Injected so catch-up stays testable. */
  readonly clock?: () => number;
  readonly epoch?: CalendarEpoch;
}

function defaultClock(): number {
  return Math.floor(Date.now() / 1000);
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

export const HARVEST_FLOURISH_MS = 1600;
/** Wall-clock gap between automatic single-tick pulses while the bench is running. */
export const STUDIO_PULSE_MS = 4000;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(readWebReducedMotion);
  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return;
      }
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      const handler = (event: MediaQueryListEvent): void => setReduced(event.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled: boolean) => {
      // Asymmetric on purpose: motion-on is the initial state; a false probe
      // would dispatch a no-op update.
      if (!cancelled && enabled) {
        setReduced(true);
      }
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled: boolean) => {
        if (!cancelled) {
          setReduced(enabled);
        }
      },
    );
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);
  return reduced;
}

function readWebReducedMotion(): boolean {
  if (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function'
  ) {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return false;
}

function activePracticeLine(
  schedule: DailySchedule,
  idle: IdleState,
  practices: readonly Practice[],
): string {
  const block = resolveScheduleState(schedule, idle.lastSimulatedTick + 1n).currentBlock;
  if (block.practice_id === null) {
    return resolveSid('studio.practice_rest_sid');
  }
  const practice = practices.find((row) => row.id === block.practice_id);
  if (practice === undefined) {
    return resolveSid('studio.practice_rest_sid');
  }
  let label = practice.label_sid;
  try {
    label = resolveSid(practice.label_sid);
  } catch {
    label = practice.id;
  }
  return formatSid('studio.practice_now_sid', { practice: label });
}

function awayDuration(ticks: number): string {
  if (ticks < 60) {
    return `${ticks} min`;
  }
  const hours = Math.floor(ticks / 60);
  const minutes = ticks % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

/**
 * World-draft ledger: once the archive assembles a draft at the embodied
 * scale, the assembly is recorded (once) in the session. Called wherever the
 * archive can grow — mount, persisted load, and each harvest.
 */
function withRecordedDraft(
  archive: readonly Manifest[],
  drafts: readonly WorldDraftReference[],
): readonly WorldDraftReference[] {
  if (assembleWorldDraft(archive) === null) {
    return drafts;
  }
  if (drafts.some((entry) => entry.scale === EMBODIED_SCALE)) {
    return drafts;
  }
  return [...drafts, { scale: EMBODIED_SCALE }];
}

export default function StudioView({
  onBack,
  practices,
  schedule,
  endings = NO_ENDINGS,
  initialLife,
  initialIdle,
  initialStudio,
  initialSession,
  rng,
  onExport,
  persist = false,
  storage,
  clock = defaultClock,
  epoch = DEFAULT_EPOCH,
}: StudioViewProps) {
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
    withRecordedDraft(
      (bootstrap?.studio ?? initialStudio ?? createStudioState()).archive,
      bootstrap?.world_drafts ?? [],
    ),
  );
  const [householdBench, setHouseholdBench] = useState<BenchState | null>(
    () => initialSession?.benches['household'] ?? null,
  );
  const [graduationCeremony, setGraduationCeremony] = useState<string | null>(null);
  const [brief, setBrief] = useState('');
  const [exported, setExported] = useState(false);
  const [worldExported, setWorldExported] = useState(false);
  const [juiceBurst, setJuiceBurst] = useState(0);
  const [ready, setReady] = useState(!persist);
  const [away, setAway] = useState<StudioAwaySummary | null>(null);
  const [freshHarvestId, setFreshHarvestId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const benchRef = useRef<BenchSlices>({
    studio,
    idle,
    life,
    practices: runtimePractices,
    progression,
    members,
    worldDrafts,
    householdBench,
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
      householdBench,
    };
  }, [studio, idle, life, runtimePractices, progression, members, worldDrafts, householdBench]);

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
    if (freshHarvestId === null) {
      return;
    }
    const timer = setTimeout(() => setFreshHarvestId(null), HARVEST_FLOURISH_MS);
    return () => clearTimeout(timer);
  }, [freshHarvestId]);

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
        // via studioTicksAway) so autonomous members and the household bench
        // advance during absence too; a household-locked session reduces to
        // the old person-only catch-up by stepSession's golden invariant.
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
        setWorldDrafts(withRecordedDraft(hydrated.studio.archive, hydrated.world_drafts));
        setHouseholdBench(next.benches['household'] ?? null);
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

  /** Session as it stands right now, household bench included. */
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
        householdBench,
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
    householdBench,
  ]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    const current = buildSession();
    const compendiumResult = grantCompendium(current, worldDrafts, registries().compendium);
    const sessionAfterGrant = compendiumResult.session;
    const compendiumChanged = compendiumResult.granted.length > 0;
    const fired = checkMilestones(sessionAfterGrant, worldDrafts, registries().milestones);
    const graduationNeeded = fired.includes(UNLOCK_HOUSEHOLD);
    if (!compendiumChanged && !graduationNeeded) {
      return;
    }
    if (graduationNeeded) {
      const graduated = graduateToHousehold(
        sessionAfterGrant,
        registries().roles.household,
        rngRef.current,
      );
      setProgression({
        tiers: graduated.tiers,
        milestones_done: graduated.milestones_done,
        compendium_done: graduated.compendium_done,
        embodied_member: graduated.embodied_member,
      });
      setMembers({ ...graduated.members });
      setWorldDrafts([...graduated.world_drafts]);
      setHouseholdBench((current2) => current2 ?? graduated.benches['household'] ?? null);
      setGraduationCeremony(UNLOCK_HOUSEHOLD);
      return;
    }
    setProgression((prev) => ({
      ...prev,
      compendium_done: sessionAfterGrant.compendium_done,
    }));
    // Same rationale as the save effect: buildSession reads the listed values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ready,
    studio,
    idle,
    life,
    runtimePractices,
    progression,
    members,
    worldDrafts,
    householdBench,
  ]);

  const pending = pendingResidue(studio);
  const charge = pending.length;
  const chargeRatio = Math.min(1, charge / MIN_RESIDUE_TO_DEVELOP);
  const householdUnlocked = progression.tiers['household']?.unlocked === true;
  const householdBayReady =
    householdBench !== null && householdBench.bay !== null && householdBench.bay.status === 'ready';
  const harvestable = canHarvest(studio) || householdBayReady;
  // Endowed window_min widens the manual develop gate; floored at 2 so a
  // develop always cooks a real window.
  const personEffectiveMin = Math.max(
    2,
    MIN_RESIDUE_TO_DEVELOP - modifiersForSession(buildSession())(EMBODIED_SCALE).windowMin,
  );
  const developable = studio.bay === null && pending.length >= personEffectiveMin;
  const upgradable = canUpgradeQuality(studio);
  const remainingForUpgrade = Math.max(0, QUALITY_UPGRADE_HARVESTS - studio.harvest_count);
  const latest = studio.archive[studio.archive.length - 1];
  const stats = computeArchiveStats(buildSession(), worldDrafts);
  const seatedVisitors: readonly { readonly sidNs: string; readonly windows: number }[] = (
    [EMBODIED_TIER, HOUSEHOLD_TIER] as const
  )
    .map((tierId) => {
      const seat = progression.tiers[tierId]?.active_visitor;
      if (seat === undefined || seat === null) {
        return null;
      }
      const row = registries().visitors.find((candidate) => candidate.id === seat.id);
      return row === undefined ? null : { sidNs: row.sid_ns, windows: seat.windows_left };
    })
    .filter(
      (entry): entry is { readonly sidNs: string; readonly windows: number } => entry !== null,
    );
  const railTiers: readonly RailTier[] = [
    {
      id: 'person',
      labelSid: 'studio.tier_person_sid',
      unlocked: progression.tiers['person']?.unlocked !== false,
      readyCount: canHarvest(studio) ? 1 : 0,
      progress: null,
    },
    {
      id: 'household',
      labelSid: 'studio.tier_household_sid',
      unlocked: householdUnlocked,
      readyCount: householdBayReady ? 1 : 0,
      progress: householdUnlocked ? null : householdProgress(stats),
    },
  ];

  /** Drive the person-bench slices, members, household bench, and visitor
   * seats (they live on the tiers slice) from a stepped session. */
  function adoptSteppedSession(next: StudioSession): void {
    const back = hydrateStudioSession(next, benchRef.current.life, benchRef.current.practices);
    setLife(back.life);
    setIdle(back.idle);
    setStudio(back.studio);
    setRuntimePractices(back.practices);
    setMembers({ ...back.members });
    setProgression((current) => ({ ...current, tiers: next.tiers }));
    setHouseholdBench(next.benches['household'] ?? null);
  }

  function applyTicks(ticks: number): void {
    // stepSession keeps the embodied bench on exact stepStudio semantics (its
    // golden-tested invariant) and adds autonomous members plus the household
    // cook once the tier unlocks; a locked session is indistinguishable here.
    const session = sessionFromSlices(benchRef.current);
    const stepped = stepSession(session, stepCtx(session), ticks, rngRef.current);
    adoptSteppedSession(stepped.session);
    setExported(false);
    if (ticks > 0) {
      setJuiceBurst((n) => n + 1);
    }
  }

  function tend(): void {
    applyTicks(STUDIO_TEND_TICKS);
  }

  useEffect(() => {
    if (!running || !ready) {
      return;
    }
    const timer = setInterval(() => {
      applyTicks(1);
    }, STUDIO_PULSE_MS);
    return () => clearInterval(timer);
    // applyTicks reads benchRef; listing it would reset the interval every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, ready, schedule, endings]);

  function develop(): void {
    const trimmed = brief.trim();
    // The manual develop path queues the person bench, so its endowed
    // cook_speed discounts the cook (floored at MIN_COOK_TICKS in the
    // engine) and its window_min widens the queue gate above.
    const personMods = modifiersForSession(buildSession())(EMBODIED_SCALE);
    setStudio(
      queueDevelop(studio, trimmed.length === 0 ? null : trimmed, rngRef.current, {
        cookTicksDiscount: personMods.cookSpeed,
        minResidue: personEffectiveMin,
      }),
    );
  }

  const lifeContext = evaluateLifeContext({
    life,
    idle,
    epoch,
    practices: runtimePractices,
    archive: studio.archive,
  });

  /** A harvest from a tier's bench sees its guest off — the seat's windows decay. */
  function decayVisitorSeat(tierId: string): void {
    const noted = noteVisitorHarvest(buildSession(), tierId);
    setProgression((current) => ({ ...current, tiers: noted.tiers }));
  }

  function harvest(): void {
    if (
      householdBench !== null &&
      householdBench.bay !== null &&
      householdBench.bay.status === 'ready'
    ) {
      harvestHousehold(householdBench);
      return;
    }
    const result = harvestTableFill(studio, rngRef.current, lifeContext);
    if (result === null) {
      return;
    }
    decayVisitorSeat(EMBODIED_TIER);
    setStudio(result.studio);
    setWorldDrafts(withRecordedDraft(result.studio.archive, worldDrafts));
    setFreshHarvestId(prefersReducedMotion ? null : result.manifest.id);
    setExported(false);
  }

  /** Folded-residue bays fill at household scale with the household rule set. */
  function harvestHousehold(bench: BenchState): void {
    const bay = bench.bay;
    if (bay === null) {
      return;
    }
    const rules = kindRulesByScale()[HOUSEHOLD_SCALE];
    if (rules === undefined) {
      throw new Error('studio: no kind rules registered for the household scale');
    }
    const request = compileRequestFromBay(
      { ...bay, focus: bay.focus ?? null },
      bench.quality_tier,
      bench.harvest_count,
      null,
      HOUSEHOLD_SCALE,
    );
    const manifest = tableFillManifest(
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
      registries().catalogs,
    );
    setStudio((current) => ({ ...current, archive: [...current.archive, manifest] }));
    setWorldDrafts(withRecordedDraft([...studio.archive, manifest], worldDrafts));
    decayVisitorSeat(HOUSEHOLD_TIER);
    setHouseholdBench({ ...bench, bay: null, harvest_count: bench.harvest_count + 1 });
    setFreshHarvestId(prefersReducedMotion ? null : manifest.id);
    setExported(false);
  }

  function deepen(): void {
    setStudio(upgradeQuality(studio));
  }

  function pin(card: Manifest): void {
    setStudio(pinFocus(studio, card));
  }

  function exportWorld(json: string): void {
    onExport?.(json);
    setWorldExported(true);
  }

  function exportLatest(): void {
    if (latest === undefined) {
      return;
    }
    const json = canonicalStringify(latest);
    onExport?.(json);
    setExported(true);
  }

  if (!ready) {
    return (
      <View testID="studio-screen" role="main" style={[styles.container, styles.screen]}>
        <Text style={styles.hint}>{resolveSid('studio.loading_sid')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.shell}>
      <StudioRail tiers={railTiers} />
      <ScrollView
        testID="studio-screen"
        role="main"
        style={styles.screen}
        contentContainerStyle={styles.container}
      >
        {onBack === undefined ? null : (
          <Pressable
            role="button"
            accessibilityLabel={resolveSid('studio.back_button_sid')}
            onPress={onBack}
            style={styles.back}
          >
            <Text style={styles.backText}>{resolveSid('studio.back_button_sid')}</Text>
          </Pressable>
        )}

        <Text accessibilityRole="header" style={styles.title}>
          {resolveSid('studio.title_sid')}
        </Text>
        <Text style={styles.subtitle}>{resolveSid('studio.subtitle_sid')}</Text>

        {away === null ? null : (
          <View testID="studio-away" style={styles.away}>
            <Text style={styles.awayText}>
              {formatSid('studio.away_sid', {
                duration: awayDuration(away.ticksSimulated),
                residue: away.residueGained,
              })}
            </Text>
            {away.capped ? (
              <Text style={styles.hint}>{resolveSid('studio.away_capped_sid')}</Text>
            ) : null}
            {away.bayReady ? (
              <Text style={styles.ready}>{resolveSid('studio.away_ready_sid')}</Text>
            ) : null}
            <Pressable
              role="button"
              testID="studio-away-dismiss"
              accessibilityLabel={resolveSid('studio.away_dismiss_sid')}
              onPress={() => setAway(null)}
            >
              <Text style={styles.backText}>{resolveSid('studio.away_dismiss_sid')}</Text>
            </Pressable>
          </View>
        )}

        {seatedVisitors.map(({ sidNs, windows }) => (
          <View key={sidNs} testID="studio-visitor" style={styles.away}>
            <Text style={styles.awayText}>
              {formatSid('studio.visitor_banner_sid', { name: resolveSid(`${sidNs}.name_sid`) })}
            </Text>
            <Text style={styles.hint}>
              {formatSid('studio.visitor_windows_sid', { n: windows })}
            </Text>
          </View>
        ))}

        <View style={styles.panel}>
          <Text style={styles.panelLabel}>
            {formatSid('studio.charge_label_sid', { n: charge, min: MIN_RESIDUE_TO_DEVELOP })}
          </Text>
          <View
            style={styles.barTrack}
            accessibilityLabel={formatSid('studio.charge_label_sid', {
              n: charge,
              min: MIN_RESIDUE_TO_DEVELOP,
            })}
          >
            <View style={[styles.barFill, { width: `${Math.round(chargeRatio * 100)}%` }]} />
          </View>
          <Text style={styles.hint}>
            {developable
              ? resolveSid('studio.charge_ready_sid')
              : resolveSid('studio.charge_hint_sid')}
          </Text>
          <Text testID="studio-practice-now" style={styles.hint}>
            {activePracticeLine(schedule, idle, runtimePractices)}
          </Text>
          {studio.surplus <= 0 ? null : (
            <Text testID="studio-surplus" style={styles.gold}>
              {formatSid('studio.surplus_sid', { n: studio.surplus })}
            </Text>
          )}
        </View>

        <View style={styles.tendWrap}>
          <Pressable
            role="button"
            testID="studio-tend"
            accessibilityLabel={resolveSid('studio.tend_button_sid')}
            onPress={tend}
            style={styles.button}
          >
            <Text style={styles.buttonText}>{resolveSid('studio.tend_button_sid')}</Text>
          </Pressable>
          <StudioJuice burstId={juiceBurst} reducedMotion={prefersReducedMotion} />
        </View>

        <Pressable
          role="button"
          testID="studio-run"
          accessibilityLabel={
            running ? resolveSid('studio.run_on_sid') : resolveSid('studio.run_off_sid')
          }
          onPress={() => setRunning((value) => !value)}
          style={[styles.button, styles.buttonSecondary]}
        >
          <Text style={styles.buttonText}>
            {running ? resolveSid('studio.run_on_sid') : resolveSid('studio.run_off_sid')}
          </Text>
        </Pressable>

        <Text style={styles.panelLabel}>{resolveSid('studio.brief_label_sid')}</Text>
        <TextInput
          testID="studio-brief"
          accessibilityLabel={resolveSid('studio.brief_label_sid')}
          placeholder={resolveSid('studio.brief_placeholder_sid')}
          value={brief}
          onChangeText={setBrief}
          style={styles.input}
        />

        <Pressable
          role="button"
          testID="studio-develop"
          accessibilityLabel={resolveSid('studio.develop_button_sid')}
          disabled={!developable}
          onPress={developable ? develop : undefined}
          style={[styles.button, developable ? null : styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>
            {developable
              ? resolveSid('studio.develop_button_sid')
              : resolveSid('studio.develop_locked_sid')}
          </Text>
        </Pressable>

        <View style={styles.panel}>
          {studio.bay === null ? (
            householdBayReady ? (
              <Text style={styles.ready}>{resolveSid('studio.bay_ready_sid')}</Text>
            ) : (
              <Text style={styles.hint}>{resolveSid('studio.bay_empty_sid')}</Text>
            )
          ) : studio.bay.status === 'ready' ? (
            <Text style={styles.ready}>{resolveSid('studio.bay_ready_sid')}</Text>
          ) : (
            <Text style={styles.hint}>
              {formatSid('studio.bay_cooking_sid', {
                done: studio.bay.cook_ticks_done,
                total: studio.bay.cook_ticks_total,
              })}
            </Text>
          )}
        </View>

        <Pressable
          role="button"
          testID="studio-harvest"
          accessibilityLabel={resolveSid('studio.harvest_button_sid')}
          disabled={!harvestable}
          onPress={harvestable ? harvest : undefined}
          style={[styles.button, harvestable ? styles.buttonHarvest : styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>{resolveSid('studio.harvest_button_sid')}</Text>
        </Pressable>

        {upgradable ? (
          <Pressable
            role="button"
            testID="studio-upgrade"
            accessibilityLabel={resolveSid('studio.upgrade_button_sid')}
            onPress={deepen}
            style={[styles.button, styles.buttonSecondary]}
          >
            <Text style={styles.buttonText}>{resolveSid('studio.upgrade_button_sid')}</Text>
          </Pressable>
        ) : remainingForUpgrade > 0 ? (
          <Text style={styles.hint}>
            {formatSid('studio.upgrade_hint_sid', { n: remainingForUpgrade })}
          </Text>
        ) : null}

        <StudioLife context={lifeContext} {...(onExport === undefined ? {} : { onExport })} />

        <StudioActivities practices={runtimePractices} />

        <StudioWorld
          archive={studio.archive}
          pinned={studio.pinned}
          onPin={pin}
          onExportWorld={exportWorld}
          worldExported={worldExported}
        />

        <Text accessibilityRole="header" style={styles.archiveHeading}>
          {resolveSid('studio.archive_heading_sid')}
        </Text>
        <StudioArchive archive={studio.archive} freshId={freshHarvestId} />

        {latest === undefined ? null : (
          <Pressable
            role="button"
            testID="studio-export"
            accessibilityLabel={resolveSid('studio.export_button_sid')}
            onPress={exportLatest}
            style={[styles.button, styles.buttonSecondary]}
          >
            <Text style={styles.buttonText}>
              {exported
                ? resolveSid('studio.export_copied_sid')
                : resolveSid('studio.export_button_sid')}
            </Text>
          </Pressable>
        )}

        <View testID="studio-compendium" style={styles.compendium}>
          <Text accessibilityRole="header" style={styles.archiveHeading}>
            {resolveSid('studio.compendium_heading_sid')}
          </Text>
          {registries().compendium.map((entry) => {
            const done = progression.compendium_done.includes(entry.id);
            return (
              <View
                key={entry.id}
                testID={`studio-compendium-row-${entry.id}`}
                style={styles.compendiumRow}
              >
                <Text style={styles.compendiumName}>{resolveSid(`${entry.sid_ns}.name_sid`)}</Text>
                {done ? (
                  <>
                    <Text style={styles.hint}>{resolveSid(`${entry.sid_ns}.desc_sid`)}</Text>
                    <Text style={styles.compendiumStatus}>
                      {resolveSid('studio.compendium_done_sid')}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.hint}>{resolveSid('studio.compendium_locked_sid')}</Text>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {graduationCeremony === null ? null : (
        <View testID="graduation-overlay" style={styles.overlay}>
          <Text style={styles.overlayTitle}>{resolveSid('graduation.household_title_sid')}</Text>
          <Text style={styles.overlayLine}>{resolveSid('graduation.household_line_sid')}</Text>
          <Pressable
            role="button"
            testID="graduation-dismiss"
            accessibilityLabel={resolveSid('graduation.dismiss_button_sid')}
            onPress={() => setGraduationCeremony(null)}
            style={[styles.button, styles.buttonSecondary, styles.overlayButton]}
          >
            <Text style={styles.buttonText}>{resolveSid('graduation.dismiss_button_sid')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row', backgroundColor: t.bg },
  screen: { flex: 1, backgroundColor: t.bg },
  container: { padding: 24, gap: 12, paddingBottom: 48, backgroundColor: t.bg },
  back: { alignSelf: 'flex-start', paddingVertical: 8 },
  backText: { fontSize: 16, color: t.muted },
  title: { fontSize: 32, fontWeight: '700', color: t.text },
  subtitle: { fontSize: 16, color: t.muted, marginBottom: 8 },
  away: {
    borderWidth: 1,
    borderColor: t.line,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    backgroundColor: t.surface,
  },
  awayText: { fontSize: 15, color: t.text },
  panel: { gap: 8, marginTop: 4 },
  panelLabel: { fontSize: 14, fontWeight: '600', color: t.text },
  barTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: t.chip,
    overflow: 'hidden',
  },
  barFill: { height: 12, backgroundColor: t.accent },
  hint: { fontSize: 14, color: t.muted },
  gold: { fontSize: 14, color: t.gold, fontWeight: '600' },
  ready: { fontSize: 16, fontWeight: '600', color: t.harvestText },
  tendWrap: { position: 'relative' },
  input: {
    borderWidth: 1,
    borderColor: t.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: t.text,
    backgroundColor: t.surface,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: t.accentDeep,
    alignItems: 'center',
  },
  buttonSecondary: { backgroundColor: t.chip },
  buttonHarvest: { backgroundColor: t.harvest },
  buttonDisabled: { backgroundColor: '#3f3a4a' },
  buttonText: { color: t.text, fontSize: 16, fontWeight: '600' },
  archiveHeading: { fontSize: 20, fontWeight: '700', marginTop: 16, color: t.text },
  compendium: { gap: 8, marginTop: 8 },
  compendiumRow: {
    borderWidth: 1,
    borderColor: t.line,
    borderRadius: 10,
    padding: 10,
    gap: 4,
    backgroundColor: t.surface,
  },
  compendiumName: { fontSize: 15, fontWeight: '600', color: t.text },
  compendiumStatus: { fontSize: 13, fontWeight: '600', color: t.gold },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: t.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  overlayTitle: { fontSize: 28, fontWeight: '700', color: t.gold, textAlign: 'center' },
  overlayLine: { fontSize: 16, color: t.muted, textAlign: 'center' },
  overlayButton: { alignSelf: 'center' },
});
