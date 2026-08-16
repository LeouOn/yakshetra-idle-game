// Tier state — per-tier progression slice of the studio session.
// Roster members arrive in Phase 1; the schema ships now so sessions are
// forward-compatible. Pure: no Date, no platform APIs.

import { z } from 'zod';

export const TIER_STATE_VERSION = 'tier_state/v0' as const;

export const RosterMemberSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    role: z.string().min(1),
    policy: z.string().min(1),
    embodied: z.boolean(),
    focus_id: z.string().min(1).optional(),
    seed: z.number().int(),
  })
  .strict();
export type RosterMember = z.infer<typeof RosterMemberSchema>;

export const RosterSchema = z
  .object({
    tier: z.string().min(1),
    members: z.array(RosterMemberSchema),
  })
  .strict();
export type Roster = z.infer<typeof RosterSchema>;

export const ActiveVisitorSchema = z
  .object({
    id: z.string().min(1),
    windows_left: z.number().int().min(0),
  })
  .strict();
export type ActiveVisitor = z.infer<typeof ActiveVisitorSchema>;

export const TierStateSchema = z
  .object({
    schema_version: z.literal(TIER_STATE_VERSION),
    tier: z.string().min(1),
    unlocked: z.boolean(),
    roster: RosterSchema,
    endowed: z.array(z.string().min(1)),
    active_visitor: ActiveVisitorSchema.nullable(),
  })
  .strict();
export type TierState = z.infer<typeof TierStateSchema>;

export function createTierState(tier: string, unlocked: boolean): TierState {
  return {
    schema_version: TIER_STATE_VERSION,
    tier,
    unlocked,
    roster: { tier, members: [] },
    endowed: [],
    active_visitor: null,
  };
}
