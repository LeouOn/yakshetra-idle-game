// Develop-from-residue operations — one print bay, classic idle cook.
//
// StudioState is fiction-agnostic. The engine queues a job on a residue
// window, cooks it on ticks, and harvests a Manifest via table-fill.
// Pure: no Date, no Math.random, no fetch.

import {
  compileRequestFromBay,
  fillManifestSafe,
  tableFiller,
  type ManifestFiller,
} from './fill-adapter';
import type { LifeContext } from './life-context';
import { nextPinned, type ManifestFocus } from './focus';
import type { Manifest } from './manifest';
import type { Practice } from './types';
import type { Rng } from './rng';
import { residueWindowId, windowSince, type ResidueEvent } from './residue';

/** Minimum window size before a develop job can start. */
export const MIN_RESIDUE_TO_DEVELOP = 3;

/** Harvests required before the first quality upgrade. */
export const QUALITY_UPGRADE_HARVESTS = 3;

/** Idle ticks applied when the player tends the bench. */
export const STUDIO_TEND_TICKS = 8;

export type OperationStatus = 'cooking' | 'ready' | 'harvested';

export interface DevelopOperation {
  readonly id: string;
  readonly type: 'develop_from_residue';
  readonly residue_window_id: string;
  readonly residue: readonly ResidueEvent[];
  readonly brief: string | null;
  readonly cook_ticks_total: number;
  readonly cook_ticks_done: number;
  readonly status: OperationStatus;
  readonly rng_seed: string;
  readonly focus: ManifestFocus | null;
}

/** How far this bench has already imported a campaign life's residue log. */
export interface PlayImportCursor {
  readonly life_id: string;
  readonly index: number;
}

export interface StudioState {
  readonly residue: readonly ResidueEvent[];
  readonly last_harvest_index: number;
  readonly bay: DevelopOperation | null;
  readonly archive: readonly Manifest[];
  readonly quality_tier: number;
  readonly harvest_count: number;
  readonly play_import: PlayImportCursor | null;
  readonly pinned: ManifestFocus | null;
  /** Extra cook ticks from tending after the charge bar is already full. */
  readonly surplus: number;
}

export function createStudioState(): StudioState {
  return {
    residue: [],
    last_harvest_index: -1,
    bay: null,
    archive: [],
    quality_tier: 0,
    harvest_count: 0,
    play_import: null,
    pinned: null,
    surplus: 0,
  };
}

export function pinFocus(studio: StudioState, card: Manifest): StudioState {
  return { ...studio, pinned: nextPinned(studio.pinned, card) };
}

/** Residue collected since the last successful queue. */
export function pendingResidue(studio: StudioState): readonly ResidueEvent[] {
  return windowSince(studio.residue, studio.last_harvest_index);
}

export function canQueueDevelop(studio: StudioState): boolean {
  return studio.bay === null && pendingResidue(studio).length >= MIN_RESIDUE_TO_DEVELOP;
}

export function canHarvest(studio: StudioState): boolean {
  return studio.bay !== null && studio.bay.status === 'ready';
}

export function canUpgradeQuality(studio: StudioState): boolean {
  return studio.quality_tier === 0 && studio.harvest_count >= QUALITY_UPGRADE_HARVESTS;
}

export function recordStudioResidue(studio: StudioState, event: ResidueEvent): StudioState {
  return { ...studio, residue: [...studio.residue, event] };
}

export function recordStudioResidues(
  studio: StudioState,
  events: readonly ResidueEvent[],
): StudioState {
  if (events.length === 0) {
    return studio;
  }
  return { ...studio, residue: [...studio.residue, ...events] };
}

/**
 * Fold a campaign life's residue log into the bench.
 * Same life: only events after `play_import.index`. New life: import all.
 */
export function importPlayResidue(
  studio: StudioState,
  lifeId: string,
  lifeLog: readonly ResidueEvent[],
): StudioState {
  if (lifeLog.length === 0) {
    const cursor = studio.play_import;
    if (cursor !== null && cursor.life_id === lifeId && cursor.index === -1) {
      return studio;
    }
    return { ...studio, play_import: { life_id: lifeId, index: -1 } };
  }
  const sameLife = studio.play_import !== null && studio.play_import.life_id === lifeId;
  const start = sameLife ? studio.play_import.index + 1 : 0;
  const last = lifeLog.length - 1;
  if (start > last) {
    return studio;
  }
  const fresh = lifeLog.slice(start);
  return {
    ...recordStudioResidues(studio, fresh),
    play_import: { life_id: lifeId, index: last },
  };
}

function cookTicksFor(windowLength: number): number {
  const extra = windowLength < 8 ? windowLength : 8;
  return 4 + extra;
}

const MIN_COOK_TICKS = 2;

/** Overflow tend time becomes faster cooking, never discarded. */
export function absorbSurplus(studio: StudioState, extraTicks: number): StudioState {
  if (extraTicks <= 0) {
    return studio;
  }
  if (studio.bay !== null && studio.bay.status === 'cooking') {
    return tickStudio(studio, extraTicks);
  }
  return { ...studio, surplus: studio.surplus + extraTicks };
}

/**
 * Snapshot the pending window into the single bay. The window is spent even
 * if harvest later fails — charge must be earned again.
 *
 * `opts.cookTicksDiscount` (endowment cook_speed) shortens the cook but never
 * below MIN_COOK_TICKS; `opts.minResidue` lowers the queue gate (default
 * MIN_RESIDUE_TO_DEVELOP) so a window_min modifier can start earlier cooks,
 * floored at 1 so no modifier can ever queue an empty window.
 */
export function queueDevelop(
  studio: StudioState,
  brief: string | null,
  rng: Rng,
  opts?: { readonly cookTicksDiscount?: number; readonly minResidue?: number },
): StudioState {
  const window = pendingResidue(studio);
  const gate = Math.max(1, opts?.minResidue ?? MIN_RESIDUE_TO_DEVELOP);
  if (studio.bay !== null || window.length < gate) {
    return studio;
  }
  const seed = rng.nextInt(1, 0x7fffffff);
  const id = `op-${studio.archive.length}-${seed}`;
  const baseCook = Math.max(
    MIN_COOK_TICKS,
    cookTicksFor(window.length) - (opts?.cookTicksDiscount ?? 0),
  );
  const used = Math.min(studio.surplus, Math.max(0, baseCook - MIN_COOK_TICKS));
  const bay: DevelopOperation = {
    id,
    type: 'develop_from_residue',
    residue_window_id: residueWindowId(window),
    residue: window,
    brief,
    cook_ticks_total: baseCook - used,
    cook_ticks_done: 0,
    status: 'cooking',
    rng_seed: String(seed),
    focus: studio.pinned,
  };
  return {
    ...studio,
    bay,
    last_harvest_index: studio.residue.length - 1,
    surplus: studio.surplus - used,
  };
}

/** Advance the bay by `ticks`. No-op when the bay is empty or already ready. */
export function tickStudio(studio: StudioState, ticks: number): StudioState {
  const bay = studio.bay;
  if (bay === null || bay.status !== 'cooking' || ticks <= 0) {
    return studio;
  }
  const done = bay.cook_ticks_done + ticks;
  const ready = done >= bay.cook_ticks_total;
  return {
    ...studio,
    bay: {
      ...bay,
      cook_ticks_done: ready ? bay.cook_ticks_total : done,
      status: ready ? 'ready' : 'cooking',
    },
  };
}

export interface HarvestResult {
  readonly studio: StudioState;
  readonly manifest: Manifest;
}

/** Fill the ready bay through `filler` (default: tables) and archive it. */
export function harvestWithFiller(
  studio: StudioState,
  rng: Rng,
  filler: ManifestFiller = tableFiller(),
  lifeContext: LifeContext | null = null,
): HarvestResult | null {
  const bay = studio.bay;
  if (bay === null || bay.status !== 'ready') {
    return null;
  }
  const request = compileRequestFromBay(
    bay,
    studio.quality_tier,
    studio.harvest_count,
    lifeContext,
  );
  const manifest = fillManifestSafe(request, rng, filler);
  const next: StudioState = {
    ...studio,
    bay: null,
    archive: [...studio.archive, manifest],
    harvest_count: studio.harvest_count + 1,
  };
  return { studio: next, manifest };
}

/** Fill the ready bay with the table compiler and archive the Manifest. */
export function harvestTableFill(
  studio: StudioState,
  rng: Rng,
  lifeContext: LifeContext | null = null,
): HarvestResult | null {
  return harvestWithFiller(studio, rng, tableFiller(), lifeContext);
}

export function upgradeQuality(studio: StudioState): StudioState {
  if (!canUpgradeQuality(studio)) {
    return studio;
  }
  return { ...studio, quality_tier: 1 };
}

/** Fold idle practice deltas back onto runtime Practice values. */
export function applyPracticeProgress(
  practices: readonly Practice[],
  advanced: readonly { readonly id: string; readonly progressGained: number }[],
): Practice[] {
  return practices.map((practice) => {
    const row = advanced.find((a) => a.id === practice.id);
    if (row === undefined || row.progressGained === 0) {
      return practice;
    }
    const max = practice.maxProgress;
    const raw = practice.currentProgress + row.progressGained;
    if (max <= 0) {
      return { ...practice, currentProgress: raw };
    }
    const gainedLevels = Math.floor(raw / max);
    return {
      ...practice,
      currentProgress: raw - gainedLevels * max,
      level: practice.level + gainedLevels,
    };
  });
}
