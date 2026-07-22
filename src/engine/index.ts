// Public barrel for the deterministic engine subpackage.
//
// Platform-pure fence: this package MUST NOT import `react`, `react-native`,
// `expo`, and must not touch the wall clock, the global RNG, the network, or
// the process environment. The fences are enforced by grep in todo 2's
// acceptance criteria and by the `src/engine/package.json` dependency
// allowlist (zod only).

export type {
  Choice,
  Echo,
  EchoType,
  EraId,
  IntentRoot,
  KarmaState,
  Lens,
  LifeId,
  LifeState,
  NextLifeSeed,
  ResourceId,
  RoleId,
  SaveBlob,
  SocialIdentity,
} from './types';

export { applyChoice } from './reducer';
export { summarizeLife, mergeKarma, applyEchoesToNextLife, emptyKarma } from './echo';
export { advanceTurn } from './turn';
export { createRng } from './rng';
export type { Rng } from './rng';
export { canonicalStringify } from './serialize';
