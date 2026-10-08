// Develop-from-residue operations — one print bay, classic idle cook.
// Pure: no Date, no Math.random, no fetch.

import {
  compileRequestFromBay,
  fillManifestSafe,
  tableFiller,
  tableFillerWithCatalog,
  type CookFire,
  type ManifestFiller,
} from './fill-adapter';
import {
  EMPTY_COOK_CHOICES,
  MIN_RESIDUE_TO_DEVELOP,
  spendableResidue,
  type CookChoices,
} from './cook-window';
import type { LifeContext } from './life-context';
import { nextPinned, type ManifestFocus } from './focus';
import type { Manifest } from './manifest';
import type { PlayImportCursor } from './play-cursor';
import type { Rng } from './rng';
import type { ResidueEvent } from './residue';
import type { CatalogEntry } from './table-catalog';

// Back-compat re-exports of the BD6 splits (play-cursor, practice-progress);
// both modules import this one TYPE-ONLY, so no runtime cycle exists.
export { importPlayResidue, type PlayImportCursor } from './play-cursor';
export { applyPracticeProgress } from './practice-progress';

// Cook-window planning (lane B) lives in its own module; the public surface
// stays reachable from here for existing importers.
export {
  LONG_FIRE_EXTRA_TICKS,
  MIN_RESIDUE_TO_DEVELOP,
  heldPending,
  maxHoldBack,
  pendingResidue,
  queueDevelop,
  spendableResidue,
} from './cook-window';

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
  /** Cook length chosen at queue time (lane B). Schema-defaulted to 'short'
   * so bays saved before the field existed still parse. */
  readonly fire: CookFire;
  /** Sought-encounter figure id (wave 3): the resolved recipe's figure id. */
  readonly encounter_figure_id?: string | undefined;
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
  /** Residue indices held out of the last cook (lane B hold-back). Events at
   * these positions stay pending until a later cook spends them. */
  readonly held_residue: readonly number[];
  /** Queue-time choice counters for the wave-1 instrumented bar. */
  readonly cook_choices: CookChoices;
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
    held_residue: [],
    cook_choices: EMPTY_COOK_CHOICES,
  };
}

export function pinFocus(studio: StudioState, card: Manifest): StudioState {
  return { ...studio, pinned: nextPinned(studio.pinned, card) };
}

/** The spendable window (pending minus held) is what the queue gate reads.
 * `pendingResidue` itself is imported from cook-window and re-exported. */

export function canQueueDevelop(studio: StudioState): boolean {
  return studio.bay === null && spendableResidue(studio).length >= MIN_RESIDUE_TO_DEVELOP;
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
  opts?: { readonly encounterFigureId?: string },
): HarvestResult | null {
  const bay = studio.bay;
  if (bay === null || bay.status !== 'ready') {
    return null;
  }
  const request = compileRequestFromBay(
    opts?.encounterFigureId === undefined
      ? bay
      : { ...bay, encounter_figure_id: opts.encounterFigureId },
    studio.quality_tier,
    studio.harvest_count,
    lifeContext,
    'person',
    undefined,
    // Lane A contract: the composer's dedup guards read details AND titles
    // already in the archive so a repeat window prefers an unread variant
    // and does not repeat a card's name while an alternative exists.
    studio.archive.map((card) => card.detail),
    studio.archive.map((card) => card.name),
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

/** Fill the ready bay with the table compiler and archive the Manifest. Pass
 * `visitorTableEntries` to swap the default catalog for every kind (Phase 4
 * Task 2: the visitor `table_ref` swap on the person path). */
export function harvestTableFill(
  studio: StudioState,
  rng: Rng,
  lifeContext: LifeContext | null = null,
  visitorTableEntries: readonly CatalogEntry[] | null = null,
  opts?: { readonly encounterFigureId?: string },
): HarvestResult | null {
  if (visitorTableEntries === null) {
    return harvestWithFiller(studio, rng, tableFiller(), lifeContext, opts);
  }
  return harvestWithFiller(
    studio,
    rng,
    tableFillerWithCatalog(visitorTableEntries),
    lifeContext,
    opts,
  );
}

export function upgradeQuality(studio: StudioState): StudioState {
  if (!canUpgradeQuality(studio)) {
    return studio;
  }
  return { ...studio, quality_tier: 1 };
}
