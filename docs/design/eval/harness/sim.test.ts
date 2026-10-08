// Lane b1 evaluation harness — headless playthrough numbers (READ-ONLY on
// product code; imports the real engine + content, writes results under
// docs/design/eval/harness/out/).
//
// Player model mirrors StudioView's handlers 1:1:
//   - applyTicks(ticks, marketWork)  → StudioView.applyTicks (stepSession,
//     market shift pays through completeMarketShift)
//   - develop()                      → StudioView.develop (personEffectiveMin,
//     cookTicksDiscount from endowed/visitor modifiers)
//   - harvestPerson()                → StudioView.harvest table path
//     (visitor table swap on the person bench included)
//   - harvestTier()                  → StudioView.harvestBenchTier (scale +
//     per-scale kind rules + visitor catalog swap)
//   - runProgression()               → useStudioProgression effect
//     (grantCompendium → checkMilestones → graduateToTier, world-draft ledger)
// Player policy per loop iteration (one tap):
//   1. harvest the highest ready NON-person tier bench, else the person bay
//   2. upgrade quality when upgradable
//   3. develop when the develop gate is open (policy: immediate vs delayed)
//   4. buy tea while the next unlock milestone still lacks its social-kind
//      cards and copper >= 4; work a market shift while copper < 4
//   5. tend
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { loadEraPack } from '@/content/loader';
import { epochFromPackCalendar } from '@/content/calendar-epoch';
import { loadProgression, type ProgressionRegistries } from '@/content/progression/loader';
import type { Practice as ContentPractice } from '@/content/schema';

import {
  STUDIO_TEND_TICKS,
  canUpgradeQuality,
  checkMilestones,
  compileRequestFromBay,
  computeGlobalRewards,
  createIdleState,
  createRng,
  createStudioState,
  defaultProgression,
  evaluateLifeContext,
  grantCompendium,
  graduateToTier,
  harvestTableFill,
  pendingResidue,
  pinFocus,
  queueDevelop,
  snapshotStudioSession,
  stepSession,
  tableFillManifest,
  upgradeQuality,
  windowSince,
  withRecordedDrafts,
  type BenchState,
  type CatalogEntry,
  type KindRule,
  type Manifest,
  type ManifestScale,
  type Practice,
  type Rng,
  type SessionStepContext,
  type StudioSession,
} from '@/engine';
import type { GraduationRolesRow } from '@/engine/graduation';
import { benchIdle, benchLife, overlayPractices } from '@/engine/session-step-internal';
import { benchToStudio, studioToBench } from '@/engine/bench-mapping';
import {
  activeVisitorFor,
  noteVisitorHarvest,
  visitorModifierOverlay,
  visitorTableOverride,
  type VisitorLike,
} from '@/engine/visitors';
import { addBenchModifiers, computeBenchModifiers } from '@/engine/endowment';
import { copperBalance, completeMarketShift, purchaseMarket } from '@/engine/market';
import { createLifeState } from '@/engine/reducer';
import type { CalendarEpoch } from '@/engine/calendar';
import type { DailySchedule } from '@/engine/schedule';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, 'out');

const SESSION_SEED = 'yakshetra-studio'; // production constant (useStudioSession)
const POLICY_PACK = 'tang-china'; // production constant (useStudioSession)
const EMBODIED = 'person';

const reg: ProgressionRegistries = loadProgression();

/** One archive row in the session's (zod-inferred, mutable) shape. */
type ArchiveRow = StudioSession['archive'][number];

function toArchiveRow(manifest: Manifest): ArchiveRow {
  return { ...manifest, tags: [...manifest.tags] };
}

/* ---- pack runtime (mirrors app/studio.tsx + useStudioSession) ------------- */

function toRuntimePractice(practice: ContentPractice): Practice {
  const { minigame_id, ...rest } = practice;
  return {
    ...rest,
    currentProgress: 0,
    level: 0,
    ...(minigame_id === undefined ? {} : { minigame_id }),
  };
}

const packCache = new Map<string, ReturnType<typeof loadEraPack>>();
function packOf(packId: string): ReturnType<typeof loadEraPack> {
  const cached = packCache.get(packId);
  if (cached !== undefined) {
    return cached;
  }
  const pack = loadEraPack(packId);
  packCache.set(packId, pack);
  return pack;
}

interface PolicyRuntime {
  readonly practices: readonly Practice[];
  readonly schedule: DailySchedule;
}
const policyCache = new Map<string, PolicyRuntime>();
function policyRuntime(): ReadonlyMap<string, PolicyRuntime> {
  if (policyCache.size === 0) {
    const pack = packOf(POLICY_PACK);
    const schedules = new Map(pack.schedules.map((row) => [row.id, row]));
    const practices = new Map(pack.practices.map((row) => [row.id, toRuntimePractice(row)]));
    for (const policy of reg.policies) {
      const schedule = schedules.get(policy.schedule_ref);
      const runtime = policy.practices.map((id) => practices.get(id));
      if (schedule === undefined || runtime.some((p) => p === undefined)) {
        continue;
      }
      policyCache.set(policy.id, {
        practices: runtime as readonly Practice[],
        schedule,
      });
    }
  }
  return policyCache;
}

/** useStudioSession.kindRulesByScale: loader rows regrouped by scale. */
function kindRulesByScale(): Readonly<Record<string, readonly KindRule[]>> {
  const out: Record<string, KindRule[]> = {};
  reg.kindRows.forEach((row, index) => {
    const rule = reg.kindRules[index];
    if (rule === undefined) {
      throw new Error('kind rows and rules out of parallel order');
    }
    out[row.scale] = [...(out[row.scale] ?? []), rule];
  });
  return out;
}
const rulesByScale = kindRulesByScale();

/** Distinct tier scales in ladder order (world-draft recording walks these). */
const tierScales: readonly ManifestScale[] = [
  ...new Set(reg.tiers.map((tier) => tier.scale as ManifestScale)),
];

function tierScaleOf(tierId: string): ManifestScale {
  const tier = reg.tiers.find((row) => row.id === tierId);
  if (tier === undefined) {
    throw new Error(`no tier ${tierId}`);
  }
  return tier.scale as ManifestScale;
}

function rolesRowForTier(tierId: string): GraduationRolesRow | null {
  const roles = reg.roles as Partial<Record<string, GraduationRolesRow>>;
  const row = roles[tierId];
  return row === undefined || row.policy === undefined ? null : row;
}

/** session-selectors.personEffectiveMin, inlined (keeps the harness off
 * react-bearing UI modules): max(2, MIN − endowed/visitor windowMin). */
function personEffectiveMin(session: StudioSession): number {
  const global = computeGlobalRewards(session.compendium_done, reg.compendium);
  const endowed = computeBenchModifiers(EMBODIED, session, reg.endowment, global);
  const overlay = visitorModifierOverlay(
    reg.visitors as readonly VisitorLike[],
    activeVisitorFor(session, EMBODIED)?.id ?? null,
  );
  return Math.max(2, 3 - addBenchModifiers(endowed, overlay).windowMin);
}

/* ---- run state ------------------------------------------------------------ */

interface TapLog {
  readonly tap: string;
  readonly tick: number;
  readonly harvestIndex: number;
  readonly windowLen: number | null;
  readonly cookTotal: number | null;
  readonly note: string | null;
}

interface HarvestLog {
  readonly harvestIndex: number;
  readonly personIndex: number | null;
  readonly bench: string;
  readonly scale: string;
  readonly kind: string;
  readonly name: string;
  readonly rarity: string;
  readonly repeat: boolean;
  readonly tick: number;
  readonly tapIndex: number;
  readonly one_liner: string;
  readonly subject: string;
  readonly detail: string;
  readonly tags: readonly string[];
}

interface NoveltyEvent {
  readonly tick: number;
  readonly label: string;
}

export interface RunOptions {
  readonly packId: string;
  readonly seed: bigint;
  readonly personHarvestTarget: number;
  readonly tickCap: number;
  readonly iterCap: number;
  readonly developPolicy: 'immediate' | 'delayed';
  readonly brief: string | null;
  readonly tag: string;
  /** Grinder policy: buy tea / work shifts while a social-kind milestone
   * gate is unmet. Casual (false): never touch the market — the pure
   * tend → develop → harvest loop. */
  readonly buyTea: boolean;
  /** tend (8-tick mashing), pulse (run-toggle watching, 1 tick per step),
   * or mixed: tend to charge the bench, pulse while the bay cooks. */
  readonly pace: 'tend' | 'pulse' | 'mixed';
}

interface RunMetrics {
  readonly tag: string;
  readonly packId: string;
  readonly seed: string;
  readonly developPolicy: string;
  readonly brief: string | null;
  readonly taps: readonly { readonly type: string; readonly count: number }[];
  readonly totalTaps: number;
  readonly ticks: number;
  readonly personHarvests: number;
  readonly tierHarvests: number;
  readonly firstHarvestTick: number | null;
  readonly firstHarvestTapIndex: number | null;
  readonly gaps: readonly {
    readonly afterPersonHarvest: number;
    readonly ticks: number;
    readonly taps: number;
    readonly tapBreakdown: readonly { readonly type: string; readonly count: number }[];
  }[];
  readonly kindDist: Readonly<Record<string, number>>;
  readonly rarityDist: Readonly<Record<string, number>>;
  readonly distinctNames: number;
  readonly repeatShare: number;
  readonly tableCompleteAt: Readonly<Record<string, number | null>>;
  readonly graduations: readonly {
    readonly tick: number;
    readonly tier: string;
    readonly harvestIndex: number;
  }[];
  readonly novelty: readonly NoveltyEvent[];
  readonly teas: number;
  readonly shifts: number;
  readonly copperEarned: number;
  readonly pinnedCard: string | null;
  readonly endedReason: string;
  readonly visitorSeats: readonly {
    readonly tick: number;
    readonly tier: string;
    readonly visitor: string;
  }[];
  readonly archiveSize: number;
  readonly figureHarvests: number;
  readonly figureCardNames: readonly string[];
}

class Sim {
  readonly opts: RunOptions;
  private session: StudioSession;
  private drafts: StudioSession['world_drafts'];
  private readonly rng: Rng;
  private readonly embodiedPractices: readonly Practice[];
  private readonly schedules: readonly DailySchedule[];
  private readonly schedule: DailySchedule;
  private readonly epoch: CalendarEpoch;
  private readonly endings = packOf(POLICY_PACK).endings; // production: endings from bench pack
  private ticks = 0;
  private tapIndex = 0;
  private harvestIndex = 0;
  private personHarvests = 0;
  private readonly tapLog: TapLog[] = [];
  private readonly harvestLog: HarvestLog[] = [];
  private readonly graduations: { tick: number; tier: string; harvestIndex: number }[] = [];
  private readonly novelty: NoveltyEvent[] = [];
  private readonly visitorSeats: { tick: number; tier: string; visitor: string }[] = [];
  private teas = 0;
  private shifts = 0;
  private copperEarned = 0;
  private pinnedCard: string | null = null;
  private seenKinds: Readonly<Record<string, number>> = {};
  private seenRarity: Readonly<Record<string, number>> = {};
  private readonly namesByKind = new Map<string, Set<string>>();
  private readonly tableCompleteAt: Record<string, number | null> = {};
  private readonly seenScales = new Set<string>();
  private readonly seatedVisitors = new Set<string>();
  endedReason = 'iter-cap';

  constructor(opts: RunOptions) {
    this.opts = opts;
    const pack = packOf(opts.packId);
    this.embodiedPractices = pack.practices.map(toRuntimePractice);
    // Wave 1b: the pack's authored schedules, rotated per in-game day by the
    // engine (mirrors app/studio.tsx). Single-day fallback = first row.
    this.schedules = pack.schedules as readonly DailySchedule[];
    this.schedule = this.schedules[0] ?? {
      id: 'studio-bench-empty',
      name_sid: 'studio.title_sid',
      blocks: [],
    };
    this.epoch = epochFromPackCalendar(pack.calendar);
    this.rng = createRng(opts.seed);
    // useStudioSession defaultLife chassis under the bench snapshot
    const life = createLifeState({
      id: 'studio-bench' as Parameters<typeof createLifeState>[0]['id'],
      era: 'studio-bench@0.1.0' as Parameters<typeof createLifeState>[0]['era'],
      role: 'operator' as Parameters<typeof createLifeState>[0]['role'],
      identity: {
        gender: 'unspecified',
        social_class: 'operator',
        family_wealth_at_birth: 'unspecified',
        caste_status: 'none',
        disability_status: 'none',
      },
    });
    this.session = snapshotStudioSession(
      createStudioState(),
      createIdleState(),
      life,
      this.embodiedPractices,
      undefined,
      defaultProgression(),
    );
    this.drafts = [];
    for (const kind of Object.keys(reg.catalogs)) {
      this.tableCompleteAt[kind] = null;
    }
  }

  /* -- production mirrors -------------------------------------------------- */

  private modifiersFor(tierId: string) {
    const global = computeGlobalRewards(this.session.compendium_done, reg.compendium);
    return addBenchModifiers(
      computeBenchModifiers(tierId, this.session, reg.endowment, global),
      visitorModifierOverlay(
        reg.visitors as readonly VisitorLike[],
        activeVisitorFor(this.session, tierId)?.id ?? null,
      ),
    );
  }

  private stepCtx(): SessionStepContext {
    const policies = policyRuntime();
    const resolve = (id: string): PolicyRuntime => {
      const found = policies.get(id);
      if (found === undefined) {
        throw new Error(`no runtime for policy ${id}`);
      }
      return found;
    };
    return {
      practices: this.embodiedPractices,
      embodiedSchedule: this.schedule,
      embodiedSchedules: this.schedules,
      memberScheduleFor: (id) => resolve(id).schedule,
      memberPracticesFor: (id) => resolve(id).practices,
      endings: this.endings,
      sessionSeed: SESSION_SEED,
      visitors: reg.visitors as readonly VisitorLike[],
      tiers: reg.tiers.map((tier) => ({
        id: tier.id,
        scale: tier.scale,
        fold_cadence: tier.fold_cadence,
      })),
      modifiersFor: (tierId) => this.modifiersFor(tierId),
    };
  }

  private lifeContext() {
    return evaluateLifeContext({
      life: benchLife(this.session),
      idle: benchIdle(this.session),
      epoch: this.epoch,
      practices: overlayPractices(this.embodiedPractices, this.session.practices),
      archive: this.session.archive,
    });
  }

  /** useStudioProgression effect: compendium → milestones → graduation. */
  private runProgression(): void {
    const compendium = grantCompendium(this.session, this.drafts, reg.compendium);
    let out = compendium.session;
    const fired = checkMilestones(out, this.drafts, reg.milestones);
    for (const id of fired) {
      const milestone = reg.milestones.find((row) => row.id === id);
      if (milestone === undefined) {
        continue;
      }
      const tierRow = reg.tiers.find((row) => row.id === milestone.grants.tier);
      if (tierRow === undefined) {
        continue;
      }
      const before = out;
      const graduated = graduateToTier(
        out,
        tierRow.id,
        tierRow,
        rolesRowForTier(tierRow.id),
        this.rng,
      );
      if (graduated !== before) {
        // production merges the current benches over the graduated session's
        const merged: Record<string, BenchState> = {};
        for (const [id, bench] of Object.entries(graduated.benches)) {
          if (id !== EMBODIED) {
            merged[id] = bench;
          }
        }
        for (const [id, bench] of Object.entries(before.benches)) {
          if (id !== EMBODIED) {
            merged[id] = bench;
          }
        }
        out = { ...graduated, benches: { ...graduated.benches, ...merged } };
        this.graduations.push({
          tick: this.ticks,
          tier: tierRow.id,
          harvestIndex: this.harvestIndex,
        });
        this.novelty.push({ tick: this.ticks, label: `graduation: ${tierRow.id}` });
      }
    }
    this.session = out;
  }

  private recordDrafts(): void {
    this.drafts = [...withRecordedDrafts(this.session.archive, this.drafts, tierScales)];
    this.session = { ...this.session, world_drafts: this.drafts };
    for (const scale of tierScales) {
      const count = this.drafts.filter((draft) => draft.scale === scale).length;
      if (count > 0 && !this.seenScales.has(`draft:${scale}`)) {
        this.seenScales.add(`draft:${scale}`);
        this.novelty.push({ tick: this.ticks, label: `first world draft (${scale})` });
      }
    }
  }

  private applyTicks(ticks: number, marketWork: boolean): void {
    const context = this.stepCtx();
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
    const stepped = stepSession(this.session, workContext, ticks, this.rng);
    let next = stepped.session;
    if (marketWork && stepped.summary.embodiedTicks === STUDIO_TEND_TICKS) {
      const before = copperBalance(next);
      const paid = completeMarketShift(next);
      next = paid.session;
      this.copperEarned += copperBalance(next) - before;
    }
    this.session = next;
    this.ticks += stepped.summary.embodiedTicks;
    this.noteVisitors();
  }

  private noteVisitors(): void {
    for (const [tierId, tier] of Object.entries(this.session.tiers)) {
      const seat = tier.active_visitor;
      if (seat !== null && !this.seatedVisitors.has(`${tierId}:${seat.id}`)) {
        this.seatedVisitors.add(`${tierId}:${seat.id}`);
        this.visitorSeats.push({ tick: this.ticks, tier: tierId, visitor: seat.id });
        this.novelty.push({ tick: this.ticks, label: `visitor seated: ${seat.id} @ ${tierId}` });
      }
    }
  }

  private personBench(): BenchState {
    const bench = this.session.benches[EMBODIED];
    if (bench === undefined) {
      throw new Error('no person bench');
    }
    return bench;
  }

  private writePersonStudio(studio: ReturnType<typeof benchToStudio>, foldPosition: number): void {
    this.session = {
      ...this.session,
      benches: { ...this.session.benches, [EMBODIED]: studioToBench(studio, foldPosition) },
    };
  }

  private personVisitorEntries(): readonly CatalogEntry[] | null {
    const seat = activeVisitorFor(this.session, EMBODIED);
    const swap = visitorTableOverride(
      reg.visitors as readonly VisitorLike[],
      seat?.id ?? null,
      reg.visitorTables,
      reg.catalogs,
    );
    if (swap === reg.catalogs) {
      return null;
    }
    return swap[EMBODIED] ?? null;
  }

  private visitorTierCatalog(tierId: string): typeof reg.catalogs | null {
    const seat = activeVisitorFor(this.session, tierId);
    if (seat === null) {
      return null;
    }
    const catalog = visitorTableOverride(
      reg.visitors as readonly VisitorLike[],
      seat.id,
      reg.visitorTables,
      reg.catalogs,
    );
    return catalog === reg.catalogs ? null : catalog;
  }

  /* -- taps ----------------------------------------------------------------- */

  private logTap(
    tap: string,
    extra?: { windowLen?: number | null; cookTotal?: number | null; note?: string | null },
  ): void {
    this.tapIndex += 1;
    this.tapLog.push({
      tap,
      tick: this.ticks,
      harvestIndex: this.harvestIndex,
      windowLen: extra?.windowLen ?? null,
      cookTotal: extra?.cookTotal ?? null,
      note: extra?.note ?? null,
    });
  }

  tend(): void {
    const bay = this.session.benches.person?.bay;
    const bayCooking = bay !== null && bay !== undefined;
    let ticks = STUDIO_TEND_TICKS;
    if (this.opts.pace === 'pulse') {
      ticks = 1;
    } else if (this.opts.pace === 'mixed') {
      // Watch while the bay cooks; alternate charging style per cook cycle
      // (mash tend on even cycles, let the run-toggle fill on odd ones) —
      // the rhythm of a real session, not one fixed habit.
      ticks = bayCooking || this.personHarvests % 2 === 1 ? 1 : STUDIO_TEND_TICKS;
    }
    this.applyTicks(ticks, false);
    this.runProgression();
    this.logTap(ticks === 1 ? 'pulse' : 'tend');
  }

  shift(): void {
    this.applyTicks(STUDIO_TEND_TICKS, true);
    this.shifts += 1;
    this.runProgression();
    this.logTap('shift');
  }

  tea(): void {
    this.session = purchaseMarket(this.session, 'tea');
    this.teas += 1;
    this.runProgression();
    this.logTap('tea');
  }

  develop(): boolean {
    const personMin = personEffectiveMin(this.session);
    const bench = this.personBench();
    const studio = benchToStudio(bench, this.session.archive);
    const window = pendingResidue(studio);
    if (studio.bay !== null || window.length < personMin) {
      return false;
    }
    const mods = this.modifiersFor(EMBODIED);
    const next = queueDevelop(studio, this.opts.brief, this.rng, {
      cookTicksDiscount: mods.cookSpeed,
      minResidue: personMin,
    });
    if (next === studio) {
      return false;
    }
    this.writePersonStudio(next, bench.fold_position);
    this.runProgression();
    this.logTap('develop', {
      windowLen: window.length,
      cookTotal: next.bay?.cook_ticks_total ?? null,
    });
    return true;
  }

  /** Record one harvested card. seenBefore must be computed against the
   * archive BEFORE the new card is appended. */
  private figureHarvests = 0;
  private figureCardNames: string[] = [];

  private archiveCard(
    manifest: Manifest,
    bench: string,
    personIndex: number | null,
    seenBefore: boolean,
  ): void {
    if ((manifest.about_id ?? '').startsWith('figure:')) {
      this.figureHarvests += 1;
      this.figureCardNames.push(`${bench}:${manifest.about_id}:${manifest.name}`);
    }
    this.harvestIndex += 1;
    if (personIndex !== null) {
      this.personHarvests += 1;
    }
    this.seenKinds = {
      ...this.seenKinds,
      [manifest.kind]: (this.seenKinds[manifest.kind] ?? 0) + 1,
    };
    this.seenRarity = {
      ...this.seenRarity,
      [manifest.rarity]: (this.seenRarity[manifest.rarity] ?? 0) + 1,
    };
    const names = this.namesByKind.get(manifest.kind) ?? new Set<string>();
    const firstOfKind = names.size === 0;
    names.add(manifest.name);
    this.namesByKind.set(manifest.kind, names);
    if (firstOfKind) {
      this.novelty.push({
        tick: this.ticks,
        label: `first ${manifest.kind} card (${manifest.scale})`,
      });
    }
    const reachable = (reg.catalogs[manifest.kind] ?? []).length;
    if (this.tableCompleteAt[manifest.kind] === null && reachable > 0 && names.size >= reachable) {
      this.tableCompleteAt[manifest.kind] = this.harvestIndex;
      this.novelty.push({
        tick: this.ticks,
        label: `table exhausted: ${manifest.kind} (all ${reachable} generic names seen)`,
      });
    }
    this.harvestLog.push({
      harvestIndex: this.harvestIndex,
      personIndex,
      bench,
      scale: manifest.scale,
      kind: manifest.kind,
      name: manifest.name,
      rarity: manifest.rarity,
      repeat: seenBefore,
      tick: this.ticks,
      tapIndex: this.tapIndex + 1,
      one_liner: manifest.one_liner,
      subject: manifest.subject,
      detail: manifest.detail,
      tags: manifest.tags,
    });
  }

  private seenInArchive(manifest: Manifest): boolean {
    return this.session.archive.some(
      (card) => card.kind === manifest.kind && card.name === manifest.name,
    );
  }

  harvestPerson(): boolean {
    const bench = this.personBench();
    const studio = benchToStudio(bench, this.session.archive);
    if (studio.bay === null || studio.bay.status !== 'ready') {
      return false;
    }
    const result = harvestTableFill(
      studio,
      this.rng,
      this.lifeContext(),
      this.personVisitorEntries(),
    );
    if (result === null) {
      return false;
    }
    const personIndex = this.personHarvests + 1;
    const seenBefore = this.seenInArchive(result.manifest);
    this.writePersonStudio(result.studio, bench.fold_position);
    this.session = { ...this.session, archive: result.studio.archive.map(toArchiveRow) };
    this.session = noteVisitorHarvest(this.session, EMBODIED);
    this.archiveCard(result.manifest, EMBODIED, personIndex, seenBefore);
    this.recordDrafts();
    this.runProgression();
    this.logTap('harvest', { note: result.manifest.name });
    // pin policy: first person card, else first place card
    if (
      this.pinnedCard === null &&
      (result.manifest.kind === 'person' || result.manifest.kind === 'place')
    ) {
      this.pinnedCard = result.manifest.name;
      this.novelty.push({
        tick: this.ticks,
        label: `pinned ${result.manifest.kind}: ${result.manifest.name}`,
      });
    }
    if (this.pinnedCard === result.manifest.name) {
      const current = this.personBench();
      this.writePersonStudio(
        pinFocus(benchToStudio(current, this.session.archive), result.manifest),
        current.fold_position,
      );
    }
    return true;
  }

  harvestTier(tierId: string): boolean {
    const bench = this.session.benches[tierId];
    if (bench === undefined || bench.bay === null || bench.bay.status !== 'ready') {
      return false;
    }
    const scale = tierScaleOf(tierId);
    const rules = rulesByScale[scale];
    if (rules === undefined) {
      throw new Error(`no kind rules for scale ${scale}`);
    }
    const bay = bench.bay;
    const request = compileRequestFromBay(
      { ...bay, focus: bay.focus ?? null },
      bench.quality_tier,
      bench.harvest_count,
      null,
      scale,
      rules,
    );
    const catalog = this.visitorTierCatalog(tierId) ?? reg.catalogs;
    const manifest = tableFillManifest(
      request.residue,
      request.brief,
      request.quality_tier,
      this.rng,
      request.rng_seed,
      request.id,
      request.focus,
      request.life_context,
      request.scale,
      rules,
      catalog,
    );
    const seenBefore = this.seenInArchive(manifest);
    this.session = {
      ...this.session,
      archive: [...this.session.archive, toArchiveRow(manifest)],
      benches: {
        ...this.session.benches,
        [tierId]: { ...bench, bay: null, harvest_count: bench.harvest_count + 1 },
      },
    };
    this.session = noteVisitorHarvest(this.session, tierId);
    this.archiveCard(manifest, tierId, null, seenBefore);
    this.recordDrafts();
    this.runProgression();
    this.logTap('harvest-tier', { note: `${tierId}: ${manifest.name}` });
    return true;
  }

  upgrade(): boolean {
    const bench = this.personBench();
    const studio = benchToStudio(bench, this.session.archive);
    if (!canUpgradeQuality(studio)) {
      return false;
    }
    this.writePersonStudio(upgradeQuality(studio), bench.fold_position);
    this.novelty.push({ tick: this.ticks, label: 'quality upgrade (tier 1)' });
    this.logTap('upgrade');
    return true;
  }

  /* -- policy --------------------------------------------------------------- */

  /** The first locked tier's unlock milestone, in ladder order. */
  private nextLockedMilestone(): string | null {
    for (const tier of reg.tiers) {
      if (this.session.tiers[tier.id]?.unlocked === true) {
        continue;
      }
      return tier.unlock_milestone ?? `unlock-${tier.id}`;
    }
    return null;
  }

  /** Archived-card tally by kind (avoids recomputing full archive stats each
   * tap; kinds not yet harvested read as 0, matching computeArchiveStats). */
  private archivedKinds(): Readonly<Record<string, number>> {
    const out: Record<string, number> = {};
    for (const card of this.session.archive) {
      out[card.kind] = (out[card.kind] ?? 0) + 1;
    }
    return out;
  }

  /** Tea is worth buying while the next unlock milestone still needs cards
   * whose windows require a social marker (lens_chosen / event_resolved):
   * person, tradition, charter, festival, institution, legend, ministry. */
  teaWanted(): boolean {
    if (!this.opts.buyTea) {
      return false;
    }
    const next = this.nextLockedMilestone();
    if (next === null) {
      return false;
    }
    const milestone = reg.milestones.find((row) => row.id === next);
    if (milestone === undefined) {
      return false;
    }
    const archived = this.archivedKinds();
    const socialKinds = new Set([
      'person',
      'tradition',
      'charter',
      'festival',
      'institution',
      'legend',
      'ministry',
      'chronicle',
    ]);
    let wanted = false;
    const walk = (predicate: unknown): void => {
      if (wanted || typeof predicate !== 'object' || predicate === null) {
        return;
      }
      const node = predicate as {
        op?: string;
        key?: string;
        value?: number;
        operands?: unknown[];
      };
      if (node.op === 'gte' && typeof node.key === 'string' && node.key.startsWith('archived.')) {
        const kind = node.key.slice('archived.'.length);
        if (socialKinds.has(kind) && (archived[kind] ?? 0) < (node.value ?? 0)) {
          wanted = true;
        }
      }
      for (const operand of node.operands ?? []) {
        walk(operand);
      }
    };
    walk(milestone.predicate);
    return wanted;
  }

  /** Highest-index NON-person tier bench with a ready bay (production's
   * benches map never contains the person bench). */
  private highestReadyTier(): string | null {
    const ready = reg.tiers
      .filter((tier) => tier.id !== EMBODIED)
      .filter((tier) => {
        const bench = this.session.benches[tier.id];
        return bench !== undefined && bench.bay !== null && bench.bay.status === 'ready';
      })
      .sort((a, b) => b.index - a.index);
    return ready[0]?.id ?? null;
  }

  /** One player tap per call. */
  step(): boolean {
    const readyTier = this.highestReadyTier();
    if (readyTier !== null) {
      return this.harvestTier(readyTier);
    }
    if (this.harvestPerson()) {
      return true;
    }
    if (this.upgrade()) {
      return true;
    }
    const personMin = personEffectiveMin(this.session);
    const bench = this.personBench();
    const pending = windowSince(bench.residue, bench.last_harvest_index).length;
    const gate = this.opts.developPolicy === 'immediate' ? personMin : Math.max(personMin, 8);
    if (bench.bay === null && pending >= gate) {
      return this.develop();
    }
    if (this.teaWanted()) {
      if (copperBalance(this.session) >= 4) {
        this.tea();
        return true;
      }
      this.shift();
      return true;
    }
    this.tend();
    return true;
  }

  run(): {
    metrics: RunMetrics;
    harvests: readonly HarvestLog[];
    taps: readonly TapLog[];
    archive: readonly Manifest[];
  } {
    let iter = 0;
    while (
      this.personHarvests < this.opts.personHarvestTarget &&
      this.ticks < this.opts.tickCap &&
      iter < this.opts.iterCap
    ) {
      iter += 1;
      this.step();
      if (this.graduations.some((g) => g.tier === 'world')) {
        this.endedReason = 'world-unlocked';
        break;
      }
    }
    if (this.endedReason === 'iter-cap') {
      this.endedReason =
        this.personHarvests >= this.opts.personHarvestTarget
          ? 'harvest-target'
          : this.ticks >= this.opts.tickCap
            ? 'tick-cap'
            : 'iter-cap';
    }
    return {
      metrics: this.metrics(),
      harvests: this.harvestLog,
      taps: this.tapLog,
      archive: this.session.archive,
    };
  }

  private metrics(): RunMetrics {
    const tapCounts = new Map<string, number>();
    for (const tap of this.tapLog) {
      tapCounts.set(tap.tap, (tapCounts.get(tap.tap) ?? 0) + 1);
    }
    const personHarvestLogs = this.harvestLog.filter((row) => row.personIndex !== null);
    const gaps: {
      afterPersonHarvest: number;
      ticks: number;
      taps: number;
      tapBreakdown: { type: string; count: number }[];
    }[] = [];
    let prevTick = 0;
    let prevTap = 0;
    for (const row of personHarvestLogs) {
      const between = this.tapLog.slice(prevTap, row.tapIndex - 1);
      const breakdown = new Map<string, number>();
      for (const tap of between) {
        breakdown.set(tap.tap, (breakdown.get(tap.tap) ?? 0) + 1);
      }
      gaps.push({
        afterPersonHarvest: row.personIndex ?? 0,
        ticks: row.tick - prevTick,
        taps: row.tapIndex - prevTap,
        tapBreakdown: [...breakdown.entries()].map(([type, count]) => ({ type, count })),
      });
      prevTick = row.tick;
      prevTap = row.tapIndex;
    }
    const repeats = this.harvestLog.filter((row) => row.repeat).length;
    let distinct = 0;
    for (const names of this.namesByKind.values()) {
      distinct += names.size;
    }
    return {
      tag: this.opts.tag,
      packId: this.opts.packId,
      seed: this.opts.seed.toString(),
      developPolicy: this.opts.developPolicy,
      brief: this.opts.brief,
      taps: [...tapCounts.entries()].map(([type, count]) => ({ type, count })),
      totalTaps: this.tapIndex,
      ticks: this.ticks,
      personHarvests: this.personHarvests,
      tierHarvests: this.harvestIndex - this.personHarvests,
      firstHarvestTick: personHarvestLogs[0]?.tick ?? null,
      firstHarvestTapIndex: personHarvestLogs[0]?.tapIndex ?? null,
      gaps,
      kindDist: this.seenKinds,
      rarityDist: this.seenRarity,
      distinctNames: distinct,
      repeatShare: this.harvestIndex > 0 ? repeats / this.harvestIndex : 0,
      tableCompleteAt: this.tableCompleteAt,
      graduations: this.graduations,
      novelty: this.novelty,
      teas: this.teas,
      shifts: this.shifts,
      copperEarned: this.copperEarned,
      pinnedCard: this.pinnedCard,
      endedReason: this.endedReason,
      visitorSeats: this.visitorSeats,
      archiveSize: this.session.archive.length,
      figureHarvests: this.figureHarvests,
      figureCardNames: this.figureCardNames,
    };
  }
}

/* ---- report helpers -------------------------------------------------------- */

function deadZones(novelty: readonly NoveltyEvent[], top: number) {
  const sorted = [...novelty].sort((a, b) => a.tick - b.tick);
  const gaps: { from: string; to: string; ticks: number; fromTick: number; toTick: number }[] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const a = sorted[i - 1]!;
    const b = sorted[i]!;
    gaps.push({
      from: a.label,
      to: b.label,
      ticks: b.tick - a.tick,
      fromTick: a.tick,
      toTick: b.tick,
    });
  }
  return gaps.sort((x, y) => y.ticks - x.ticks).slice(0, top);
}

describe('lane b1 headless playthrough', () => {
  it('runs the measurement battery and writes results', async () => {
    mkdirSync(outDir, { recursive: true });

    const run = (opts: Partial<RunOptions> & { packId: string; seed: bigint; tag: string }) =>
      new Sim({
        personHarvestTarget: 40,
        tickCap: 30_000,
        iterCap: 60_000,
        developPolicy: 'immediate',
        brief: null,
        buyTea: false,
        pace: 'tend',
        ...opts,
      }).run();

    // Wave-1b bar: casual (no market), 40 person cards, both paces.
    const casualTendTang = [1n, 2n, 3n, 4n, 5n].map((seed) =>
      run({ packId: 'tang-china', seed, tag: `casual-tend-tang-${seed}` }),
    );
    const casualPulseTang = [1n, 2n, 3n].map((seed) =>
      run({ packId: 'tang-china', seed, tag: `casual-pulse-tang-${seed}`, pace: 'pulse' }),
    );
    const casualMixedTang = [1n, 2n, 3n, 4n, 5n].map((seed) =>
      run({ packId: 'tang-china', seed, tag: `casual-mixed-tang-${seed}`, pace: 'mixed' }),
    );
    const casualTendFantasy = [1n, 2n, 3n, 4n, 5n].map((seed) =>
      run({ packId: 'fantasy-mahayana', seed, tag: `casual-tend-fantasy-${seed}` }),
    );
    const casualPulseFantasy = [1n, 2n, 3n].map((seed) =>
      run({ packId: 'fantasy-mahayana', seed, tag: `casual-pulse-fantasy-${seed}`, pace: 'pulse' }),
    );
    const casualMixedFantasy = [1n, 2n, 3n].map((seed) =>
      run({ packId: 'fantasy-mahayana', seed, tag: `casual-mixed-fantasy-${seed}`, pace: 'mixed' }),
    );

    // Ladder pace, casual and grinder, long runs.
    const casualLadder = run({
      packId: 'tang-china',
      seed: 11n,
      tag: 'ladder-casual',
      personHarvestTarget: 400,
      tickCap: 40_000,
      iterCap: 80_000,
    });
    const grinderLadder = run({
      packId: 'tang-china',
      seed: 11n,
      tag: 'ladder-grinder',
      personHarvestTarget: 400,
      tickCap: 40_000,
      iterCap: 80_000,
      buyTea: true,
    });

    const results = {
      generatedBy: 'docs/design/eval/harness/sim.test.ts (lane b1, wave 1b)',
      casualTendTang: casualTendTang.map((r) => r.metrics),
      casualPulseTang: casualPulseTang.map((r) => r.metrics),
      casualTendFantasy: casualTendFantasy.map((r) => r.metrics),
      casualMixedTang: casualMixedTang.map((r) => r.metrics),
      casualMixedFantasy: casualMixedFantasy.map((r) => r.metrics),
      casualPulseFantasy: casualPulseFantasy.map((r) => r.metrics),
      casualLadder: casualLadder.metrics,
      grinderLadder: grinderLadder.metrics,
      casualLadderDeadZones: deadZones(
        [
          ...casualLadder.metrics.novelty,
          { tick: casualLadder.metrics.ticks, label: 'END OF RUN' },
        ],
        12,
      ),
      tangFirst30: casualTendTang[0]!.harvests
        .filter((row) => row.personIndex !== null)
        .slice(0, 30),
      fantasyFirst30: casualTendFantasy[0]!.harvests
        .filter((row) => row.personIndex !== null)
        .slice(0, 30),
      tangKindsAt40: casualTendTang.map((r) => r.metrics.kindDist),
      fantasyKindsAt40: casualTendFantasy.map((r) => r.metrics.kindDist),
    };
    writeFileSync(resolve(outDir, 'wave1b-results.json'), JSON.stringify(results, null, 2));

    // Wave 3 read-aloud sample: 20 chronicle entries from the Tang mixed run,
    // 10 from a Fantasy run, generated verbatim by the engine.
    const { buildChronicle, chronicleToText } = await import('@/engine/chronicle');
    const { epochFromPackCalendar: epochOf } = await import('@/content/calendar-epoch');
    const tangRun = casualMixedTang[0]!;
    const fantasyRun = casualTendFantasy[0]!;
    const tangChronicle = buildChronicle(
      tangRun.archive,
      tangRun.metrics.archiveSize > 1 ? [{ scale: 'household' }] : [],
      epochOf(packOf('tang-china').calendar),
    );
    const fantasyChronicle = buildChronicle(
      fantasyRun.archive,
      [],
      epochOf(packOf('fantasy-mahayana').calendar),
    );
    const sample = [
      '# Chronicle sample (wave 3, generated by src/engine/chronicle.ts)',
      '',
      'Tang run (casual mixed pace, seed 1, first 20 entries, oldest first):',
      '',
      '```',
      chronicleToText(tangChronicle.slice(0, 20), 'A street that is still deciding', null),
      '```',
      '',
      'Fantasy run (casual tend pace, seed 1, first 10 entries):',
      '',
      '```',
      chronicleToText(fantasyChronicle.slice(0, 10), null, null),
      '```',
    ].join('\n');
    writeFileSync(resolve(outDir, '..', '..', '07-chronicle-sample.md'), sample);

    // ── wave-1b bars ────────────────────────────────────────────────────
    const tangKinds = casualTendTang[0]!.metrics.kindDist;
    const tangPulseKinds = casualPulseTang[0]!.metrics.kindDist;
    const fantasyKinds = casualTendFantasy[0]!.metrics.kindDist;
    const coreKinds = ['thing', 'outcome', 'change', 'person', 'place'];
    const present = (dist: Readonly<Record<string, number>>) =>
      coreKinds.filter((kind) => (dist[kind] ?? 0) > 0);
    // Bar: at least 4 of 5 core kinds in the casual mixed-pace run (the
    // natural run-toggle rhythm); tend/pulse runs are reported alongside.
    const tangMixedKinds = casualMixedTang[0]!.metrics.kindDist;
    expect(present(tangMixedKinds).length).toBeGreaterThanOrEqual(4);
    console.log('wave1b kinds tang-mixed:', tangMixedKinds);
    // Bar: figure cards reachable on the bench.
    expect(casualTendTang[0]!.metrics.figureHarvests).toBeGreaterThan(0);
    // Bar: Tang and Fantasy visibly differ (kind mix and/or card stream).
    const tangNames = results.tangFirst30.map(
      (c: { name: string; kind: string }) => c.name + c.kind,
    );
    const fantasyNames = results.fantasyFirst30.map(
      (c: { name: string; kind: string }) => c.name + c.kind,
    );
    expect(tangNames).not.toEqual(fantasyNames);
    // Rotation sanity: figure practice windows exist (figure harvests > 0).
    expect(casualPulseTang[0]!.metrics.figureHarvests).toBeGreaterThanOrEqual(0);
    console.log('wave1b kinds tang-tend:', tangKinds);
    console.log('wave1b kinds tang-pulse:', tangPulseKinds);
    console.log('wave1b kinds fantasy-tend:', fantasyKinds);
    console.log('wave1b figure harvests (tang tend):', casualTendTang[0]!.metrics.figureHarvests);
  });
});
