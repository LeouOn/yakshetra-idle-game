// Ladder-level constants shared across the engine ladder runtime and the UI
// bench surfaces. Engine-pure: no React, no network, no clock, no global RNG.

/**
 * The embodied life's tier — the ladder's first rung and the person bench.
 * Every stepper, view, and selector keys on this id; there is exactly one
 * definition (see src/__tests__/ladder-helpers-uniqueness.test.ts).
 */
export const EMBODIED_TIER = 'person';
