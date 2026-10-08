// Manifest bench — tend work, cook a residue window, harvest a card.
//
// Render + handlers only: the session model (slices, load/catch-up/step/save)
// lives in useStudioSession; the progression effects (compendium, milestones,
// graduation) live in useStudioProgression. The engine stays pure; this view
// steps the whole session through stepSession and fills harvests via the
// table fallback. All copy is SIDs.
//
// Tier-generalized: tier enumeration — rail rows, visitor banners, rosters,
// harvest priority, gate badges — iterates registries().tiers; no tier id is
// hardcoded past the embodied person tier.

import {
  AccessibilityInfo,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { useCallback, useEffect, useState, useMemo } from 'react';
import type { Ending } from '@/content/schema';
import { loadEraPack } from '@/content/loader';
import {
  QUALITY_UPGRADE_HARVESTS,
  STUDIO_TEND_TICKS,
  canHarvest,
  canUpgradeQuality,
  canonicalStringify,
  heldPending,
  pendingIndices,
  computeArchiveStats,
  computeGlobalRewards,
  evaluateLifeContext,
  hydrateStudioSession,
  spendableResidue,
  pinnableCards,
  pinFocus,
  queueDevelop,
  stepSession,
  swapEmbodiment,
  upgradeQuality,
  type IdleState,
  type LifeContext,
  type LifeState,
  type Manifest,
  type Practice,
  type Rng,
  type RosterMember,
  type StudioSession,
  type StudioState,
  activityFamilyForLens,
} from '@/engine';
import { canEndow, endowManifest } from '@/engine/endowment';
import type { StudioKv } from '@/persistence';
import type { CalendarEpoch } from '@/engine/calendar';
import type { DailySchedule } from '@/engine/schedule';
import { resolveScheduleState } from '@/engine/schedule';
import { formatSid, resolveSid } from '@/i18n';
import { studioTheme as t } from '@/ui/studio-theme';
import {
  modifiersForSession,
  nonPersonBenches,
  registries,
  sessionFromSlices,
  useStudioSession,
  type BenchSlices,
} from '@/ui/hooks/useStudioSession';
import { useStudioProgression } from '@/ui/hooks/useStudioProgression';
import { nextAction } from '@/ui/hooks/next-action';
import { useStudioHarvest } from '@/ui/hooks/useStudioHarvest';
import {
  endowPlan,
  endowTierOf,
  endowTrackLabel,
  tierProgress,
} from '@/ui/hooks/studio-view-selectors';
import { EMBODIED_TIER } from '@/engine/ladder-const';
import { personEffectiveMin } from '@/ui/hooks/session-selectors';
import StudioActivities from './StudioActivities';
import StudioArchive, { type EndowChipState } from './StudioArchive';
import StudioLife from './StudioLife';
import StudioNextAction from './StudioNextAction';
import StudioJourney from './StudioJourney';
import StudioCookPanel, { type CookChip, type CookChoice } from './StudioCookPanel';
import StudioMarket from './StudioMarket';
import {
  completeMarketShift,
  copperBalance,
  purchaseMarket,
  TEA_COST,
  SUPPLIES_COST,
  type MarketPurchase,
} from '@/engine/market';
import StudioMilestone from './StudioMilestone';
import StudioRail, { type RailTier } from './StudioRail';
import StudioRevealStage from './StudioRevealStage';
import StudioTabs, { TabSection, type StudioTab } from './StudioTabs';
import StudioRoster from './StudioRoster';
import StudioWorld from './StudioWorld';
import StudioChronicle from './StudioChronicle';
import { buildChronicle } from '@/engine/chronicle';
import { assembleWorldDraft } from '@/engine/world-draft';

export const STUDIO_TEND_COUNT = STUDIO_TEND_TICKS;

const DEFAULT_EPOCH: CalendarEpoch = { year: 1, month: 1, day: 1, hour: 0 };

/** Shared default so the `endings` prop keeps one identity across renders. */
const NO_ENDINGS: readonly Ending[] = [];

/**
 * Player-facing era/role names for a life, resolved from its era pack.
 *
 * The engine stores ids but cannot turn them into labels (no i18n in
 * `src/engine`), and those ids are build-internal tokens: the bench stand-in
 * life carries `era: 'studio-bench@0.1.0'` and `role: 'operator'`. When there
 * is no pack behind the life, both names come back absent — and every consumer
 * omits the text rather than printing the token. Returns no keys (not
 * `undefined` values) because `exactOptionalPropertyTypes` is on.
 */
function lifeDisplayNames(life: LifeState): { eraName?: string; roleName?: string } {
  try {
    const pack = loadEraPack(life.era);
    const role = pack.starting_roles?.find((candidate) => candidate.id === life.role);
    const eraName = resolveSid(pack.name_sid);
    const roleSid = role?.label_sid ?? role?.title_sid;
    return {
      eraName,
      ...(roleSid === undefined ? {} : { roleName: resolveSid(roleSid) }),
    };
  } catch {
    return {};
  }
}

export interface StudioViewProps {
  readonly onBack?: () => void;
  readonly practices: readonly Practice[];
  readonly schedule: DailySchedule;
  /** Authored day schedules the bench rotates per in-game day (lane b1).
   * Absent → the embodied life runs on `schedule` alone. */
  readonly embodiedSchedules?: readonly DailySchedule[];
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
  /** Host-injected model completer (SPEC §16.2). Undefined → tables only. */
  readonly completeManifest?: (
    request: import('@/engine/fill-adapter').ManifestCompileRequest,
  ) => Promise<unknown>;
  readonly storage?: StudioKv;
  /** Unix seconds. Injected so catch-up stays testable. */
  readonly clock?: () => number;
  /** Host-injected model completer (SPEC §16.2). Undefined → tables only;
   * the default Expo bundle never provides one. */
  readonly epoch?: CalendarEpoch;
}

function writeChronicleClipboard(text: string): void {
  // Web-only affordance; guarded so tests and native never throw.
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  void nav?.clipboard?.writeText?.(text);
}

function defaultClock(): number {
  return Math.floor(Date.now() / 1000);
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

export default function StudioView({
  onBack,
  practices,
  schedule,
  embodiedSchedules,
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
  completeManifest,
  epoch = DEFAULT_EPOCH,
}: StudioViewProps) {
  const {
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
  } = useStudioSession({
    practices,
    schedule,
    ...(embodiedSchedules === undefined ? {} : { embodiedSchedules }),
    endings,
    ...(initialLife === undefined ? {} : { initialLife }),
    ...(initialIdle === undefined ? {} : { initialIdle }),
    ...(initialStudio === undefined ? {} : { initialStudio }),
    ...(initialSession === undefined ? {} : { initialSession }),
    ...(rng === undefined ? {} : { rng }),
    persist,
    ...(storage === undefined ? {} : { storage }),
    clock,
  });
  const { graduationCeremony, setGraduationCeremony } = useStudioProgression({
    ready,
    studio,
    idle,
    life,
    runtimePractices,
    progression,
    members,
    worldDrafts,
    benches,
    buildSession,
    rngRef,
    setProgression,
    setMembers,
    setWorldDrafts,
    setBenches,
  });
  const [receipt, setReceipt] = useState<{ id: number; text: string } | null>(null);
  function report(text: string): void {
    setReceipt((current) => ({ id: (current?.id ?? 0) + 1, text }));
  }
  const [brief, setBrief] = useState('');
  const [cookOpen, setCookOpen] = useState(false);
  const [cookPile, setCookPile] = useState<readonly CookChip[] | null>(null);
  const [cookHeat, setCookHeat] = useState(0);
  const [cookDiscount, setCookDiscount] = useState(0);
  const [endowSelection, setEndowSelection] = useState<{
    readonly cardId: string;
    readonly trackIndex: number;
  } | null>(null);
  const [exported, setExported] = useState(false);
  const [worldExported, setWorldExported] = useState(false);
  const [freshHarvestId, setFreshHarvestId] = useState<string | null>(null);
  const [reveal, setReveal] = useState<{
    readonly card: Manifest;
    readonly alsoRevealed: readonly Manifest[];
    /** A sought encounter answered on this reveal (wave 3b). */
    readonly soughtAnswered?: boolean;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<StudioTab>('bench');
  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [chronicleCopied, setChronicleCopied] = useState(false);
  const { width: viewportWidth } = useWindowDimensions();
  const compact = viewportWidth < 720;
  const [running, setRunning] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (freshHarvestId === null) {
      return;
    }
    const timer = setTimeout(() => setFreshHarvestId(null), HARVEST_FLOURISH_MS);
    return () => clearTimeout(timer);
  }, [freshHarvestId]);

  // Chips for the cook panel: every pending trace, held-out ones flagged.
  const cookChips: CookChip[] = [];
  {
    const held = new Set(heldPending(studio));
    for (const index of pendingIndices(studio)) {
      const event = studio.residue[index];
      if (event !== undefined) {
        cookChips.push({ index, event, held: held.has(index) });
      }
    }
  }
  // Lane B: the charge the player can actually cook — pending minus held-out
  // traces. Held traces stay visible material for the NEXT cook.
  const spendable = spendableResidue(studio);
  const charge = spendable.length;
  // Endowed/visitor window_min widens the manual develop gate; floored at 2.
  // The bar fills to 100% when develop is actually ready, not against the
  // fixed canonical MIN_RESIDUE_TO_DEVELOP.
  const personMin = personEffectiveMin(buildSession(), registries());
  const chargeRatio = Math.min(1, charge / personMin);
  const endowTracks = endowPlan(buildSession());
  const benchReady = (tierId: string): boolean => benches[tierId]?.bay?.status === 'ready';
  const anyBenchReady = Object.keys(benches).some((tierId) => benchReady(tierId));
  const harvestable = canHarvest(studio) || anyBenchReady;
  const developable = studio.bay === null && spendable.length >= personMin;
  const upgradable = canUpgradeQuality(studio);
  const remainingForUpgrade = Math.max(0, QUALITY_UPGRADE_HARVESTS - studio.harvest_count);
  const latest = studio.archive[studio.archive.length - 1];
  const stats = computeArchiveStats(buildSession(), worldDrafts);
  const chronicle = useMemo(
    () => buildChronicle(studio.archive, worldDrafts, epoch),
    [studio.archive, worldDrafts, epoch],
  );
  const worldDraft = useMemo(() => assembleWorldDraft(studio.archive), [studio.archive]);
  // Rung-by-rung disclosure: unlocked tiers plus the next locked one (its
  // badge is the climb ahead); deeper rungs stay masked until it unlocks.
  // ASSUMPTION: tiers unlock in registry order. The ladder's milestones
  // gate each tier on the previous one, so this loop walks the badge list
  // in ladder order and stops at the first locked rung — that is the next
  // climb. If a milestone is skipped (e.g. for testing), the iterator
  // would still order by registry position, not by unlock date.
  const railTiers: RailTier[] = [];
  for (const tier of registries().tiers) {
    const tierState = progression.tiers[tier.id];
    const unlocked = tierState?.unlocked ?? tier.unlock_milestone === null;
    railTiers.push({
      id: tier.id,
      labelSid: `studio.tier_${tier.id}_sid`,
      unlocked,
      readyCount:
        tier.id === EMBODIED_TIER ? (canHarvest(studio) ? 1 : 0) : benchReady(tier.id) ? 1 : 0,
      progress: unlocked ? null : tierProgress(stats, tier.id),
    });
    if (!unlocked) {
      break;
    }
  }
  const seatedVisitors: readonly {
    readonly key: string;
    readonly sidNs: string;
    readonly windows: number;
  }[] = registries().tiers.flatMap((tier) => {
    const seat = progression.tiers[tier.id]?.active_visitor;
    if (seat === undefined || seat === null) {
      return [];
    }
    const row = registries().visitors.find((candidate) => candidate.id === seat.id);
    return row === undefined
      ? []
      : [{ key: tier.id, sidNs: row.sid_ns, windows: seat.windows_left }];
  });
  const ceremonyMilestone =
    graduationCeremony === null
      ? null
      : (registries().milestones.find((row) => row.id === graduationCeremony) ?? null);

  function applyTicks(ticks: number, marketWork = false, showReceipt = true): void {
    // stepSession keeps the embodied bench on exact stepStudio semantics (its
    // golden-tested invariant) and adds autonomous members plus every
    // unlocked tier bench; a locked session is indistinguishable here.
    const session = sessionFromSlices(benchRef.current);
    const context = stepCtx(session);
    const workContext = marketWork
      ? {
          ...context,
          embodiedSchedule: {
            ...context.embodiedSchedule,
            blocks: context.embodiedSchedule.blocks.map((block) => ({
              ...block,
              practice_id: null,
            })),
          },
        }
      : context;
    const stepped = stepSession(session, workContext, ticks, rngRef.current);
    const paid =
      marketWork && stepped.summary.embodiedTicks === STUDIO_TEND_TICKS
        ? completeMarketShift(stepped.session)
        : null;
    adoptSteppedSession(paid?.session ?? stepped.session);
    const gained =
      (stepped.session.benches.person?.residue.length ?? 0) -
      (session.benches.person?.residue.length ?? 0);
    if (showReceipt) {
      report(
        formatSid(
          paid === null ? 'studio.market_tend_receipt_sid' : 'studio.market_work_receipt_sid',
          {
            n: gained,
            ticks: stepped.summary.embodiedTicks,
            copper: paid?.copper ?? 0,
            bonus: paid !== null && paid.copper > 1 ? resolveSid('studio.market_bonus_sid') : '',
          },
        ),
      );
    }
    setExported(false);
  }

  function buyMarket(purchase: MarketPurchase): void {
    const current = sessionFromSlices(benchRef.current);
    const next = purchaseMarket(current, purchase);
    if (next === current) return;
    adoptSteppedSession(next);
    report(
      formatSid(
        purchase === 'tea' ? 'studio.market_tea_receipt_sid' : 'studio.market_supplies_receipt_sid',
        {
          cost: purchase === 'tea' ? TEA_COST : SUPPLIES_COST,
        },
      ),
    );
  }

  function tend(): void {
    applyTicks(STUDIO_TEND_TICKS);
  }

  useEffect(() => {
    if (!running || !ready) {
      return;
    }
    const timer = setInterval(() => {
      applyTicks(1, false, false);
    }, STUDIO_PULSE_MS);
    return () => clearInterval(timer);
    // applyTicks reads benchRef; listing it would reset the interval every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, ready, schedule, endings]);

  function develop(): void {
    // The cook is a hand (lane B): pressing develop opens the shaping panel
    // instead of queueing immediately. The queue call lives in confirmCook.
    if (!developable) {
      return;
    }
    // Lock the pile at open: the bench keeps ticking while the panel is up,
    // and a quick-pick plan computed against a pile that then grew could
    // preview (and land) as a different kind. New traces wait for the next
    // cook; they are still pending.
    setCookPile(cookChips);
    setCookHeat(studio.surplus);
    setCookDiscount(modifiersForSession(buildSession())(EMBODIED_TIER).cookSpeed);
    setCookOpen(true);
  }

  /** The develop control names the REAL blocker (round 2): a bay waiting to
   * be revealed, or a working already cooking — never "more work needed"
   * while a ready bay is the actual hold-up. */
  function developLabel(): string {
    if (developable) {
      return resolveSid('studio.develop_button_sid');
    }
    if (studio.bay?.status === 'ready') {
      return resolveSid('studio.develop_bay_ready_sid');
    }
    if (studio.bay !== null) {
      return resolveSid('studio.develop_bay_cooking_sid');
    }
    return resolveSid('studio.develop_locked_sid');
  }

  function confirmCook(choice: CookChoice): void {
    setCookOpen(false);
    setCookPile(null);
    setCookHeat(0);
    setCookDiscount(0);
    const trimmed = brief.trim();
    // The manual develop path queues the person bench, so its endowed
    // cook_speed discounts the cook (floored at MIN_COOK_TICKS in the
    // engine) and its endowed/visitor window_min widens the queue gate.
    const personMods = modifiersForSession(buildSession())(EMBODIED_TIER);
    const queued = queueDevelop(studio, trimmed.length === 0 ? null : trimmed, rngRef.current, {
      cookTicksDiscount: personMods.cookSpeed,
      minResidue: personMin,
      fire: choice.fire,
      holdBack: choice.holdBack,
    });
    setStudio(queued);
    if (queued.bay !== null) {
      report(
        formatSid('studio.cook_receipt_sid', {
          n: queued.bay.residue.length,
          fire: resolveSid(`studio.cook_fire_word_${choice.fire}_sid`),
          ticks: queued.bay.cook_ticks_total,
        }),
      );
    }
  }

  const lifeContext = evaluateLifeContext({
    life,
    idle,
    epoch,
    practices: runtimePractices,
    archive: studio.archive,
    ...lifeDisplayNames(life),
  });

  /** Live-slice reads for the post-await paths in harvest(): the completer
   * can be in flight for seconds, so render-time closures may be stale. */
  // Sought encounters (wave 3b): the era's recipes + the practice-id ->
  // activity-family lookup the resolver needs. familyOf reads the runtime
  // practices' lenses (activityFamilyForLens), so it works in both eras.
  const encounterFamilyOf = useCallback(
    (practiceId: string) => {
      const practice = runtimePractices.find((row) => row.id === practiceId);
      return practice === undefined ? null : activityFamilyForLens(practice.lens);
    },
    [runtimePractices],
  );

  const { harvest } = useStudioHarvest({
    completeManifest,
    encounters: registries().encounters,
    familyOf: encounterFamilyOf,
    rngRef,
    benchRef,
    lifeContext,
    lifeContextOf,
    prefersReducedMotion,
    setStudio,
    setBenches,
    setProgression,
    setWorldDrafts,
    setFreshHarvestId,
    setReveal,
    setExported,
    report,
  });

  function lifeContextOf(slices: BenchSlices): LifeContext {
    return evaluateLifeContext({
      life: slices.life,
      idle: slices.idle,
      epoch,
      practices: slices.practices,
      archive: slices.studio.archive,
      ...lifeDisplayNames(slices.life),
    });
  }

  function deepen(): void {
    setStudio(upgradeQuality(studio));
  }

  function pin(card: Manifest): void {
    setStudio(pinFocus(studio, card));
  }

  /** Endow chip state for one archive card, from the render-scope plan. */
  function endowStateFor(cardId: string): EndowChipState {
    if (endowTracks.length === 0) {
      return { mode: 'locked' };
    }
    if (endowSelection?.cardId === cardId) {
      const track = endowTracks[endowSelection.trackIndex];
      if (track === undefined) {
        return { mode: 'pick' };
      }
      return { mode: 'chosen', trackLabel: endowTrackLabel(track) };
    }
    return { mode: 'pick' };
  }

  /** First press selects the first eligible track; further presses cycle. */
  function endowPick(cardId: string): void {
    if (endowTracks.length === 0) {
      return;
    }
    setEndowSelection((current) =>
      current?.cardId === cardId
        ? { cardId, trackIndex: (current.trackIndex + 1) % endowTracks.length }
        : { cardId, trackIndex: 0 },
    );
  }

  /** Commit the chosen track through the engine gate, then adopt the cascade
   * (archive, cleared pins, roster focus, endowed tier) session-wide. */
  function endowCommit(cardId: string): void {
    if (endowSelection === null || endowSelection.cardId !== cardId) {
      return;
    }
    const track = endowTracks[endowSelection.trackIndex];
    if (track === undefined) {
      return;
    }
    const session = sessionFromSlices(benchRef.current);
    const tierId = endowTierOf(session);
    const global = computeGlobalRewards(session.compendium_done, registries().compendium);
    const check = canEndow(
      session,
      tierId,
      track,
      cardId,
      registries().endowment,
      registries().tiers,
      global,
    );
    if (!check.ok) {
      setEndowSelection(null);
      return;
    }
    const endowed = endowManifest(session, tierId, track.id, cardId, registries().endowment);
    const back = hydrateStudioSession(endowed, benchRef.current.life, benchRef.current.practices);
    setLife(back.life);
    setIdle(back.idle);
    setStudio(back.studio);
    setRuntimePractices(back.practices);
    setMembers({ ...back.members });
    setProgression(back.progression);
    setBenches(nonPersonBenches(endowed));
    setEndowSelection(null);
  }

  /** Swap the embodied life for a roster member's slice (null restores the
   * default person life). Adoption mirrors adoptSteppedSession. */
  function embody(id: string | null): void {
    const swapped = swapEmbodiment(sessionFromSlices(benchRef.current), id);
    const back = hydrateStudioSession(swapped, benchRef.current.life, benchRef.current.practices);
    setLife(back.life);
    setIdle(back.idle);
    setStudio(back.studio);
    setRuntimePractices(back.practices);
    setMembers({ ...back.members });
    setProgression((prev) => ({
      ...prev,
      tiers: swapped.tiers,
      embodied_member: swapped.embodied_member,
    }));
  }

  /** Focus is roster-row state only: the member's focus_id, never the bench pin. */
  function assignFocus(tierId: string, id: string, cardId: string | null): void {
    setProgression((prev) => {
      const tier = prev.tiers[tierId];
      if (tier === undefined) {
        return prev;
      }
      const members = tier.roster.members.map((member): RosterMember => {
        if (member.id !== id) {
          return member;
        }
        if (cardId === null) {
          const next: RosterMember = { ...member };
          delete next.focus_id;
          return next;
        }
        return { ...member, focus_id: cardId };
      });
      return {
        ...prev,
        tiers: {
          ...prev.tiers,
          [tierId]: { ...tier, roster: { ...tier.roster, members } },
        },
      };
    });
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
    <View style={compact ? styles.shellCompact : styles.shell}>
      <StudioRail tiers={railTiers} variant={compact ? 'strip' : 'side'} />
      <View style={styles.screenColumn}>
        {reveal === null ? null : (
          <StudioRevealStage
            card={reveal.card}
            alsoRevealed={reveal.alsoRevealed}
            reducedMotion={prefersReducedMotion}
            pinned={studio.pinned}
            onPin={pin}
            soughtAnswered={reveal.soughtAnswered === true}
            onContinue={() => setReveal(null)}
          />
        )}
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

          <StudioTabs active={activeTab} onSelect={setActiveTab} />

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

          {seatedVisitors.map(({ key, sidNs, windows }) => (
            <View key={key} testID="studio-visitor" style={styles.away}>
              <Text style={styles.awayText}>
                {formatSid('studio.visitor_banner_sid', { name: resolveSid(`${sidNs}.name_sid`) })}
              </Text>
              <Text style={styles.hint}>
                {formatSid('studio.visitor_windows_sid', { n: windows })}
              </Text>
            </View>
          ))}

          <TabSection tab="market" active={activeTab}>
            <StudioMarket
              copper={copperBalance(buildSession())}
              receipt={receipt}
              onWork={() => applyTicks(STUDIO_TEND_TICKS, true)}
              onBuy={buyMarket}
            />
          </TabSection>
          <TabSection tab="bench" active={activeTab}>
            <StudioJourney
              studio={studio}
              minimum={personMin}
              harvestable={harvestable}
              onTend={tend}
              onDevelop={develop}
              onHarvest={() => void harvest()}
              onPin={pin}
              {...(reveal === null ? {} : { hideDiscovery: true })}
            />
            <StudioNextAction action={nextAction(buildSession(), worldDrafts, registries())} />

            <View style={styles.panel}>
              <Text style={styles.panelLabel}>
                {formatSid('studio.charge_label_sid', { n: charge, min: personMin })}
              </Text>
              <View
                style={styles.barTrack}
                accessibilityLabel={formatSid('studio.charge_label_sid', {
                  n: charge,
                  min: personMin,
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
                <Text testID="studio-surplus" style={styles.banked}>
                  {formatSid('studio.banked_heat_sid', { n: studio.surplus })}
                </Text>
              )}
            </View>

            <Pressable
              role="button"
              testID="studio-tend"
              accessibilityLabel={resolveSid('studio.tend_button_sid')}
              onPress={tend}
              style={[styles.button, styles.buttonSecondary]}
            >
              <Text style={styles.buttonText}>{resolveSid('studio.tend_button_sid')}</Text>
            </Pressable>

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
              <Text testID="studio-develop-label" style={styles.buttonText}>
                {developLabel()}
              </Text>
            </Pressable>

            {cookOpen && developable ? (
              <StudioCookPanel
                chips={cookPile ?? cookChips}
                gate={personMin}
                onCook={confirmCook}
                cookTicksDiscount={cookDiscount}
                surplus={cookHeat}
                onCancel={() => {
                  setCookOpen(false);
                  setCookPile(null);
                  setCookHeat(0);
                  setCookDiscount(0);
                }}
              />
            ) : null}

            <View style={styles.panel}>
              {studio.bay === null ? (
                anyBenchReady ? (
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
              onPress={harvestable ? () => void harvest() : undefined}
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
            <Pressable
              role="button"
              testID="studio-milestone-disclosure"
              accessibilityLabel={resolveSid('studio.milestone_disclosure_sid')}
              onPress={() => setMilestoneOpen((value) => !value)}
              style={styles.disclosure}
            >
              <Text style={styles.disclosureText}>
                {resolveSid('studio.milestone_disclosure_sid')}
              </Text>
            </Pressable>
            {milestoneOpen ? (
              <StudioMilestone session={buildSession()} stats={stats} registries={registries()} />
            ) : null}
          </TabSection>

          <TabSection tab="life" active={activeTab}>
            <StudioLife context={lifeContext} {...(onExport === undefined ? {} : { onExport })} />

            <StudioActivities
              practices={runtimePractices}
              marketShifts={buildSession().life.skills.market_shifts}
              copper={copperBalance(buildSession())}
              residueCount={buildSession().benches.person?.residue.length}
            />

            <StudioWorld
              archive={studio.archive}
              pinned={studio.pinned}
              onPin={pin}
              onExportWorld={exportWorld}
              worldExported={worldExported}
            />

            {registries()
              .tiers.filter(
                (tier) =>
                  tier.id !== EMBODIED_TIER &&
                  (progression.tiers[tier.id]?.roster.members.length ?? 0) > 0,
              )
              .map((tier) => (
                <StudioRoster
                  key={tier.id}
                  members={progression.tiers[tier.id]?.roster.members ?? []}
                  embodiedMemberId={progression.embodied_member?.member ?? null}
                  pinnable={pinnableCards(studio.archive)}
                  onEmbody={embody}
                  onFocus={(id, cardId) => assignFocus(tier.id, id, cardId)}
                />
              ))}
          </TabSection>

          <TabSection tab="archive" active={activeTab}>
            <Text accessibilityRole="header" style={styles.archiveHeading}>
              {resolveSid('studio.archive_heading_sid')}
            </Text>
            <StudioArchive
              archive={studio.archive}
              freshId={freshHarvestId}
              endowState={endowStateFor}
              onEndow={endowPick}
              onEndowCommit={endowCommit}
            />

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
                    <Text style={styles.compendiumName}>
                      {resolveSid(`${entry.sid_ns}.name_sid`)}
                    </Text>
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
          </TabSection>

          <TabSection tab="world" active={activeTab}>
            <StudioChronicle
              entries={chronicle}
              worldName={worldDraft?.name ?? null}
              worldLine={worldDraft?.one_liner ?? null}
              onCopy={(text) => {
                setChronicleCopied(true);
                writeChronicleClipboard(text);
              }}
              copied={chronicleCopied}
            />
          </TabSection>
        </ScrollView>
      </View>

      {ceremonyMilestone === null ? null : (
        <View testID="graduation-overlay" style={styles.overlay}>
          <Text style={styles.overlayTitle}>
            {resolveSid(`${ceremonyMilestone.grants.ceremony_sid}_title_sid`)}
          </Text>
          <Text style={styles.overlayLine}>
            {resolveSid(`${ceremonyMilestone.grants.ceremony_sid}_line_sid`)}
          </Text>
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
  shellCompact: { flex: 1, flexDirection: 'column', backgroundColor: t.bg },
  screen: { flex: 1, backgroundColor: t.bg },
  screenColumn: { flex: 1, backgroundColor: t.bg },
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
  banked: { fontSize: 12, color: t.muted },
  disclosure: { minHeight: 44, justifyContent: 'center', paddingVertical: 8 },
  disclosureText: { fontSize: 14, fontWeight: '600', color: t.muted },
  ready: { fontSize: 16, fontWeight: '600', color: t.harvestText },
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
  buttonDisabled: { backgroundColor: t.disabled },
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
