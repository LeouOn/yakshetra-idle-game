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

export { applyChoice, applyEffect, applyEvent, createLifeState, reduceIdleTick } from './reducer';
export type { CreateLifeStateOptions, IdleTickAction } from './reducer';
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
export { canonicalStringify, deserializeSaveBlob, serializeSaveBlob, sha256 } from './serialize';
export { SaveBlobSchema } from './serialize';
export type { DeserializedSave } from './serialize';
export {
  CURRENT_SCHEMA_VERSION,
  getBlobVersion,
  migrateSaveBlob,
  needsMigration,
} from './migration';
