// Statically-bundled progression content. Same pattern as ../registry:
// the bundler (Metro transformer / Vite plugin) inlines parsed JSON5 at
// build time, so there is no disk read at runtime.

import compendium from './base/compendium.json5';
import endowment from './base/endowment.json5';
import kinds from './base/kinds.json5';
import milestones from './base/milestones.json5';
import policies from './base/policies.json5';
import tiers from './base/tiers.json5';
import visitors from './base/visitors.json5';

export interface ProgressionBundle {
  readonly tiers: unknown;
  readonly kinds: unknown;
  readonly milestones: unknown;
  readonly policies: unknown;
  readonly endowment: unknown;
  readonly visitors: unknown;
  readonly compendium: unknown;
}

export function getProgressionBundle(): ProgressionBundle {
  return { tiers, kinds, milestones, policies, endowment, visitors, compendium };
}
