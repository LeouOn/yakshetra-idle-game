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

import { useEffect, useState } from 'react';
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

import type { Ending } from '@/content/schema';
import type { ArchivePredicate, EndowmentTrack } from '@/content/progression/schema';
import {
  MIN_RESIDUE_TO_DEVELOP,
  QUALITY_UPGRADE_HARVESTS,
  STUDIO_TEND_TICKS,
  canHarvest,
  canUpgradeQuality,
  canonicalStringify,
  compileRequestFromBay,
  computeArchiveStats,
  computeGlobalRewards,
  endowableSlots,
  evaluateLifeContext,
  harvestTableFill,
  hydrateStudioSession,
  pendingResidue,
  pinnableCards,
  pinFocus,
  queueDevelop,
  stepSession,
  swapEmbodiment,
  tableFillManifest,
  upgradeQuality,
  type ArchiveStats,
  type IdleState,
  type LifeState,
  type Manifest,
  type ManifestScale,
  type Practice,
  type Rng,
  type RosterMember,
  type StudioSession,
  type StudioState,
} from '@/engine';
import { canEndow, endowManifest } from '@/engine/endowment';
import { activeVisitorFor, noteVisitorHarvest, visitorTableOverride } from '@/engine/visitors';
import type { CatalogMap } from '@/engine/table-catalog';
import type { StudioKv } from '@/persistence';
import type { CalendarEpoch } from '@/engine/calendar';
import type { DailySchedule } from '@/engine/schedule';
import { resolveScheduleState } from '@/engine/schedule';
import { formatSid, resolveSid } from '@/i18n';
import { studioTheme as t } from '@/ui/studio-theme';
import {
  kindRulesByScale,
  modifiersForSession,
  nonPersonBenches,
  registries,
  sessionFromSlices,
  useStudioSession,
  withRecordedDrafts,
} from '@/ui/hooks/useStudioSession';
import { useStudioProgression } from '@/ui/hooks/useStudioProgression';
import { nextAction } from '@/ui/hooks/next-action';
import { EMBODIED_TIER } from '@/engine/ladder-const';
import { personEffectiveMin, statValue } from '@/ui/hooks/session-selectors';
import StudioActivities from './StudioActivities';
import StudioArchive, { type EndowChipState } from './StudioArchive';
import StudioJuice from './StudioJuice';
import StudioLife from './StudioLife';
import StudioNextAction from './StudioNextAction';
import StudioRail, { type RailTier } from './StudioRail';
import StudioRoster from './StudioRoster';
import StudioWorld from './StudioWorld';

export const STUDIO_TEND_COUNT = STUDIO_TEND_TICKS;

const DEFAULT_EPOCH: CalendarEpoch = { year: 1, month: 1, day: 1, hour: 0 };

/** Shared default so the `endings` prop keeps one identity across renders. */
const NO_ENDINGS: readonly Ending[] = [];

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

/** Harvest-priority tier for endowing: the highest unlocked tier that HAS
 * endowment tracks (content-driven; today person + household). */
function endowTierOf(session: StudioSession): string {
  const withTracks = new Set(registries().endowment.map((track) => track.tier));
  const candidates = registries()
    .tiers.filter((tier) => session.tiers[tier.id]?.unlocked === true && withTracks.has(tier.id))
    .sort((a, b) => b.index - a.index);
  return candidates[0]?.id ?? EMBODIED_TIER;
}

/**
 * Tracks the endow chip may offer for the session: tier match, requires met,
 * not already endowed, slot cost fitting the remaining slots (compendium
 * bonus included). Empty → every chip renders locked.
 */
function endowPlan(session: StudioSession): readonly EndowmentTrack[] {
  const tierId = endowTierOf(session);
  const tier = session.tiers[tierId];
  if (tier === undefined) {
    return [];
  }
  const global = computeGlobalRewards(session.compendium_done, registries().compendium);
  const slots = endowableSlots(tierId, session, registries().endowment, registries().tiers, global);
  return registries().endowment.filter(
    (track) =>
      track.tier === tierId &&
      !tier.endowed.includes(track.id) &&
      (track.requires === null || session.milestones_done.includes(track.requires)) &&
      track.slot_cost <= slots,
  );
}

/** Display label for a track row; tracks carry no SID namespace, so the id tail names them. */
function endowTrackLabel(track: EndowmentTrack): string {
  const parts = track.id.split('/');
  return parts[parts.length - 1] ?? track.id;
}

interface GateOperand {
  readonly key: string;
  readonly m: number;
}

/** The gte leaves of a conjunction — the badge-able operands. Non-gte
 * comparisons and or/not junctions yield none (no badge is rendered). */
function gteOperandsOf(predicate: ArchivePredicate): readonly GateOperand[] {
  if (predicate.op === 'gte') {
    return [{ key: predicate.key, m: predicate.value }];
  }
  if (predicate.op === 'and') {
    return predicate.operands.flatMap(gteOperandsOf);
  }
  return [];
}

/** The least-satisfied gte operand of the tier's unlock milestone, as n/m. */
function tierProgress(stats: ArchiveStats, tierId: string): { n: number; m: number } | null {
  const tier = registries().tiers.find((row) => row.id === tierId);
  if (tier === undefined || tier.unlock_milestone === null) {
    return null;
  }
  const milestone = registries().milestones.find((row) => row.id === tier.unlock_milestone);
  if (milestone === undefined) {
    return null;
  }
  const gates = gteOperandsOf(milestone.predicate);
  if (gates.length === 0) {
    return null;
  }
  let worst = gates[0]!;
  let worstRatio = Number.POSITIVE_INFINITY;
  for (const gate of gates) {
    const ratio = Math.min(1, statValue(stats, gate.key) / gate.m);
    if (ratio < worstRatio) {
      worstRatio = ratio;
      worst = gate;
    }
  }
  return { n: Math.min(statValue(stats, worst.key), worst.m), m: worst.m };
}

/** The tier row's scale, as the manifest compiler names it.
 * Throws on an unknown tier id by design: the rail and the harvest path
 * only ever pass `tierId`s they read from `session.tiers` or
 * `registries().tiers`, so a miss means a bug, not a user input. */
function tierScaleOf(tierId: string): ManifestScale {
  const tier = registries().tiers.find((row) => row.id === tierId);
  if (tier === undefined) {
    throw new Error(`studio: no registered tier "${tierId}"`);
  }
  return tier.scale;
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
  const [brief, setBrief] = useState('');
  const [endowSelection, setEndowSelection] = useState<{
    readonly cardId: string;
    readonly trackIndex: number;
  } | null>(null);
  const [exported, setExported] = useState(false);
  const [worldExported, setWorldExported] = useState(false);
  const [juiceBurst, setJuiceBurst] = useState(0);
  const [freshHarvestId, setFreshHarvestId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (freshHarvestId === null) {
      return;
    }
    const timer = setTimeout(() => setFreshHarvestId(null), HARVEST_FLOURISH_MS);
    return () => clearTimeout(timer);
  }, [freshHarvestId]);

  const pending = pendingResidue(studio);
  const charge = pending.length;
  // Endowed/visitor window_min widens the manual develop gate; floored at 2.
  // The bar fills to 100% when develop is actually ready, not against the
  // fixed canonical MIN_RESIDUE_TO_DEVELOP.
  const personMin = personEffectiveMin(buildSession(), registries());
  const chargeRatio = Math.min(1, charge / personMin);
  const endowTracks = endowPlan(buildSession());
  const benchReady = (tierId: string): boolean => benches[tierId]?.bay?.status === 'ready';
  const anyBenchReady = Object.keys(benches).some((tierId) => benchReady(tierId));
  const harvestable = canHarvest(studio) || anyBenchReady;
  const developable = studio.bay === null && pending.length >= personMin;
  const upgradable = canUpgradeQuality(studio);
  const remainingForUpgrade = Math.max(0, QUALITY_UPGRADE_HARVESTS - studio.harvest_count);
  const latest = studio.archive[studio.archive.length - 1];
  const stats = computeArchiveStats(buildSession(), worldDrafts);
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

  function applyTicks(ticks: number): void {
    // stepSession keeps the embodied bench on exact stepStudio semantics (its
    // golden-tested invariant) and adds autonomous members plus every
    // unlocked tier bench; a locked session is indistinguishable here.
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
    // engine) and its endowed/visitor window_min widens the queue gate.
    const personMods = modifiersForSession(buildSession())(EMBODIED_TIER);
    setStudio(
      queueDevelop(studio, trimmed.length === 0 ? null : trimmed, rngRef.current, {
        cookTicksDiscount: personMods.cookSpeed,
        minResidue: personMin,
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

  /** Harvest priority: the highest-index tier with a ready bench, else the
   * person bench (the bay the player queued by hand). */
  function highestReadyTier(): string | null {
    const ready = registries()
      .tiers.filter((tier) => benches[tier.id] !== undefined && benchReady(tier.id))
      .sort((a, b) => b.index - a.index);
    return ready[0]?.id ?? null;
  }

  /** The seated visitor's catalog for a tier, or null if no swap is active.
   * The override is the visitor table for every kind in the base catalog;
   * missing table_ref content falls back to the base catalog (no throw). */
  function visitorTierCatalog(tierId: string): CatalogMap | null {
    const reg = registries();
    const seat = activeVisitorFor(buildSession(), tierId);
    if (seat === null) {
      return null;
    }
    const catalog = visitorTableOverride(reg.visitors, seat.id, reg.visitorTables, reg.catalogs);
    return catalog === reg.catalogs ? null : catalog;
  }

  /** Folded-residue bays fill at the tier's scale with its rule set. */
  function harvestBenchTier(tierId: string): void {
    const bench = benches[tierId];
    if (bench === undefined) {
      return;
    }
    const bay = bench.bay;
    if (bay === null || bay.status !== 'ready') {
      return;
    }
    const scale = tierScaleOf(tierId);
    const rules = kindRulesByScale()[scale];
    if (rules === undefined) {
      throw new Error(`studio: no kind rules registered for the ${scale} scale`);
    }
    const request = compileRequestFromBay(
      { ...bay, focus: bay.focus ?? null },
      bench.quality_tier,
      bench.harvest_count,
      null,
      scale,
    );
    const catalog = visitorTierCatalog(tierId) ?? registries().catalogs;
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
      catalog,
    );
    setStudio((current) => ({ ...current, archive: [...current.archive, manifest] }));
    setWorldDrafts(withRecordedDrafts([...studio.archive, manifest], worldDrafts));
    decayVisitorSeat(tierId);
    setBenches((current) => ({
      ...current,
      [tierId]: { ...bench, bay: null, harvest_count: bench.harvest_count + 1 },
    }));
    setFreshHarvestId(prefersReducedMotion ? null : manifest.id);
    setExported(false);
  }

  function harvest(): void {
    const priority = highestReadyTier();
    if (priority !== null) {
      harvestBenchTier(priority);
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
    const result = harvestTableFill(studio, rngRef.current, lifeContext, visitorEntries);
    if (result === null) {
      return;
    }
    decayVisitorSeat(EMBODIED_TIER);
    setStudio(result.studio);
    setWorldDrafts(withRecordedDrafts(result.studio.archive, worldDrafts));
    setFreshHarvestId(prefersReducedMotion ? null : result.manifest.id);
    setExported(false);
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

        <StudioNextAction action={nextAction(buildSession(), worldDrafts, registries())} />

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
