// Public barrel for the deterministic engine subpackage.
//
// Platform-pure fence: this package MUST NOT import `react`, `react-native`,
// `expo`, and must not touch the wall clock, the global RNG, the network, or
// the process environment. The fences are enforced by grep in todo 2's
// acceptance criteria and by the `src/engine/package.json` dependency
// allowlist (zod only).

export type {
  AnySaveBlob,
  Choice,
  Echo,
  EchoType,
  EffectOp,
  Ending,
  EngineMode,
  EraId,
  EraRules,
  Event,
  IdleState,
  IdleTickResult,
  IntentRoot,
  KarmaState,
  Lens,
  LifeId,
  LifeState,
  NextLifeSeed,
  OfflineSummary,
  Practice,
  Predicate,
  ResourceId,
  RoleId,
  SaveBlob,
  SaveBlobV2,
  SocialIdentity,
} from './types';

export {
  applyChoice,
  applyEffect,
  applyEffects,
  applyEvent,
  createLifeState,
  intendLens,
  reduceIdleTick,
} from './reducer';
export type { CreateLifeStateOptions, IdleTickAction } from './reducer';
export {
  appendResidue,
  recordLifeResidue,
  residueLog,
  residueWindowId,
  summarizeResidue,
  windowSince,
} from './residue';
export type { ResidueEvent, ResidueEventType, ResidueSummary } from './residue';
export {
  MANIFEST_LEGACY_VERSION,
  MANIFEST_SCHEMA_VERSION,
  ManifestSchema,
  SCALE_VALUES,
  TABLE_FILL_REVISION,
  tableFillManifest,
} from './manifest';
export type {
  FillStatus,
  Manifest,
  ManifestKind,
  ManifestProvenance,
  ManifestRarity,
  ManifestScale,
} from './manifest';
export {
  MIN_RESIDUE_TO_DEVELOP,
  QUALITY_UPGRADE_HARVESTS,
  STUDIO_TEND_TICKS,
  applyPracticeProgress,
  canHarvest,
  canQueueDevelop,
  canUpgradeQuality,
  createStudioState,
  harvestTableFill,
  harvestWithFiller,
  importPlayResidue,
  pinFocus,
  absorbSurplus,
  pendingResidue,
  queueDevelop,
  recordStudioResidue,
  recordStudioResidues,
  tickStudio,
  upgradeQuality,
} from './operations';
export type {
  DevelopOperation,
  HarvestResult,
  OperationStatus,
  PlayImportCursor,
  StudioState,
} from './operations';
export {
  STUDIO_SESSION_VERSION,
  StudioSessionSchema,
  emptyHydratedSession,
  hydrateStudioSession,
  parseStudioSession,
  snapshotStudioSession,
} from './studio-session';
export type { HydratedStudioSession, StudioSession } from './studio-session';
export { evaluatePredicate } from './predicates';
export { summarizeLife, mergeKarma, applyEchoesToNextLife, emptyKarma } from './echo';
export { advanceTurn, advanceIdleTick } from './turn';
export {
  createIdleState,
  simulateIdleTicks,
  applyPracticeEffects,
  checkEndingTrigger,
} from './idle';
export { createRng } from './rng';
export type { Rng } from './rng';
export { computeOfflineSummary, formatOfflineSummary } from './offline';
export {
  STUDIO_AWAY_TICK_CAP,
  STUDIO_SECONDS_PER_TICK,
  catchUpStudio,
  stepStudio,
  studioTicksAway,
} from './studio-offline';
export type { StudioAwaySummary, StudioCatchUpResult } from './studio-offline';
export {
  MANIFEST_COMPILE_VERSION,
  compileRequestFromBay,
  fillManifestSafe,
  tableFiller,
  tableFillerWithCatalog,
} from './fill-adapter';
export type { CompileBayInput, ManifestCompileRequest, ManifestFiller } from './fill-adapter';
export {
  WORLD_DRAFT_VERSION,
  WorldDraftSchema,
  assembleWorldDraft,
  canAssembleWorld,
  stringifyWorldDraft,
} from './world-draft';
export type { WorldDraft, WorldDraftBond, WorldDraftMember } from './world-draft';
export {
  assembleWorldDraftAtScale,
  recordWorldDraftAtScale,
  withRecordedDrafts,
} from './world-scale';
export { focusFromManifest, isPinnableKind, nextPinned, pinnableCards } from './focus';
export { activityFamilyForLens, emptyActivityTotals, summarizeActivities } from './activities';
export {
  LIFE_CONTEXT_VERSION,
  LifeContextSchema,
  classifyBond,
  evaluateLifeContext,
  stringifyLifeContext,
} from './life-context';
export type { BondKind, LifeContext, LifeSetting, LifeTie } from './life-context';
export type { ActivityFamily, ActivityTotals } from './activities';
export type { ManifestFocus } from './focus';
export { canonicalStringify, deserializeSaveBlob, serializeSaveBlob, sha256 } from './serialize';
export { SaveBlobSchema } from './serialize';
export type { DeserializedSave } from './serialize';
export {
  CURRENT_SCHEMA_VERSION,
  getBlobVersion,
  migrateSaveBlob,
  needsMigration,
} from './migration';
export {
  DEFAULT_KIND_RULES,
  isSocialWindow,
  isSpatialWindow,
  pickKindFromRegistry,
} from './kind-registry';
export type { CoreManifestKind, KindMatch, KindRule } from './kind-registry';
export { migrateManifestV0, parseManifest } from './manifest-migration';
export type { ManifestV0 } from './manifest-migration';
export {
  TIER_STATE_VERSION,
  ActiveVisitorSchema,
  RosterMemberSchema,
  RosterSchema,
  TierStateSchema,
  createTierState,
} from './tier-state';
export type { ActiveVisitor, Roster, RosterMember, TierState } from './tier-state';
export { migrateStudioSessionV0, STUDIO_SESSION_V0_VERSION } from './studio-session-v0';
export { defaultProgression } from './studio-session';
export type {
  BenchState,
  MemberSlice,
  SessionProgression,
  WorldDraftReference,
} from './studio-session';
export { checkMilestones } from './milestones';
export type { MilestoneLike } from './milestones';
export { grantCompendium, computeGlobalRewards } from './compendium';
export type { CompendiumEntryLike, CompendiumGrantResult } from './compendium';
export {
  computeArchiveStats,
  evaluateArchivePredicate,
  validateArchivePredicateKeys,
} from './archive-stats';
export type {
  ArchiveComparisonLike,
  ArchiveJunctionLike,
  ArchiveNegationLike,
  ArchivePredicateLike,
  ArchiveStats,
  WorldDraftStatSource,
} from './archive-stats';
export { graduateToHousehold, graduateToTier } from './graduation';
export type { HouseholdRolesTable } from './graduation';
export { createMemberLife, memberSeed, runAutonomousMember } from './roster';
export { foldUpEvents, swapEmbodiment } from './roster-fold';
export { stepSession } from './session-step';
export type { SessionStepContext, SessionStepResult, SessionStepSummary } from './session-step';
export { buildCatalog } from './table-catalog';
export type { CatalogEntry, CatalogMap } from './table-catalog';
export {
  BASE_AWAY_CAP,
  EMPTY_BENCH_MODIFIERS,
  MODIFIER_KEY_WHITELIST,
  addBenchModifiers,
  canEndow,
  computeBenchModifiers,
  effectiveAwayCap,
  endowManifest,
  endowableSlots,
  modifiersFromEffects,
} from './endowment';
export type { BenchModifiers, EndowBlockReason, EndowCheck, EndowmentTrackLike } from './endowment';
export {
  activeVisitorFor,
  noteVisitorHarvest,
  stepVisitors,
  visitorModifierOverlay,
  visitorTableOverride,
} from './visitors';
export type { VisitorLike, VisitorStepContext, VisitorTablesView } from './visitors';
export { EMBODIED_TIER } from './ladder-const';
