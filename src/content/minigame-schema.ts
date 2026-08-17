/**
 * Minigame content schema v0.1.
 *
 * Minigames are optional engagement layers triggered from practices,
 * schedules, or events. They are defined in content packs as JSON5 files
 * and validated against this schema.
 *
 * Design invariants:
 * - Rewards are EffectOp[] — the SAME closed union the engine uses.
 *   This means minigames structurally CANNOT mint karma/merit/score/points.
 * - No new EffectOp variant is introduced.
 * - All timing uses virtual ticks (caller-supplied integers), never wall-clock.
 */

import { z } from 'zod';

import { EffectOpSchema, SidSchema, TokenSchema } from './schema';

/* -------------------------------------------------------------------------------------------------
 * Reward tier
 * -----------------------------------------------------------------------------------------------*/

export const RewardTierSchema = z
  .object({
    minScore: z.number().min(0).max(100).describe('Inclusive lower bound score for this tier'),
    rewards: z.array(EffectOpSchema).describe('Effects applied when this tier is reached'),
    summary_sid: SidSchema.describe('Journal card text for this tier'),
  })
  .strict();

export type RewardTier = z.infer<typeof RewardTierSchema>;

/* -------------------------------------------------------------------------------------------------
 * Per-type config schemas
 * -----------------------------------------------------------------------------------------------*/

export const BreathCountConfigSchema = z
  .object({
    target: z.number().int().positive().default(10).describe('Count to N before cycling'),
    maxInputs: z.number().int().positive().describe('Total input budget'),
  })
  .strict();

export const RhythmConfigSchema = z
  .object({
    beats: z.array(z.number().int().min(0)).min(2).describe('Absolute tick positions'),
    window: z.number().int().positive().describe('+/- tolerance in ticks'),
    mantra_id: TokenSchema.nullable().describe('Associated mantra id'),
  })
  .strict();

export const TraceConfigSchema = z
  .object({
    strokes: z
      .array(
        z
          .object({
            target_sid: SidSchema,
            tolerance: z.number().min(0).max(1),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export const AllocationConfigSchema = z
  .object({
    budget: z.number().positive(),
    recipients: z
      .array(
        z
          .object({
            id: TokenSchema,
            label_sid: SidSchema,
            need: z.number().min(0),
          })
          .strict(),
      )
      .min(2),
  })
  .strict();

export const ReflectionConfigSchema = z
  .object({
    root_node: TokenSchema,
    nodes: z
      .array(
        z
          .object({
            id: TokenSchema,
            prompt_sid: SidSchema,
            options: z
              .array(
                z
                  .object({
                    id: TokenSchema,
                    label_sid: SidSchema,
                    intent_root: z.enum(['care', 'greed', 'aversion', 'delusion']),
                    insight_sid: SidSchema,
                    next: TokenSchema.nullable(),
                  })
                  .strict(),
              )
              .min(1),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export const WalkingConfigSchema = z
  .object({
    targetCadence: z.number().int().positive(),
    requiredSteps: z.number().int().positive(),
    window: z.number().int().positive(),
  })
  .strict();

export type BreathCountConfig = z.infer<typeof BreathCountConfigSchema>;
export type RhythmConfig = z.infer<typeof RhythmConfigSchema>;
export type TraceConfig = z.infer<typeof TraceConfigSchema>;
export type AllocationConfig = z.infer<typeof AllocationConfigSchema>;
export type ReflectionConfig = z.infer<typeof ReflectionConfigSchema>;
export type WalkingConfig = z.infer<typeof WalkingConfigSchema>;

/* -------------------------------------------------------------------------------------------------
 * Minigame definition (discriminated union)
 * -----------------------------------------------------------------------------------------------*/

export const MinigameDefSchema = z.discriminatedUnion('type', [
  z
    .object({
      id: TokenSchema,
      type: z.literal('breath_count'),
      label_sid: SidSchema,
      description_sid: SidSchema,
      lens: z.enum(['collected_attention', 'discernment']),
      config: BreathCountConfigSchema,
      rewardTiers: z.array(RewardTierSchema).min(1),
    })
    .strict(),
  z
    .object({
      id: TokenSchema,
      type: z.literal('rhythm'),
      label_sid: SidSchema,
      description_sid: SidSchema,
      lens: z.enum(['collected_attention', 'discernment']),
      config: RhythmConfigSchema,
      rewardTiers: z.array(RewardTierSchema).min(1),
    })
    .strict(),
  z
    .object({
      id: TokenSchema,
      type: z.literal('trace'),
      label_sid: SidSchema,
      description_sid: SidSchema,
      lens: z.enum(['joyful_effort', 'careful_conduct']),
      config: TraceConfigSchema,
      rewardTiers: z.array(RewardTierSchema).min(1),
    })
    .strict(),
  z
    .object({
      id: TokenSchema,
      type: z.literal('allocation'),
      label_sid: SidSchema,
      description_sid: SidSchema,
      lens: z.enum(['generosity', 'careful_conduct']),
      config: AllocationConfigSchema,
      rewardTiers: z.array(RewardTierSchema).min(1),
    })
    .strict(),
  z
    .object({
      id: TokenSchema,
      type: z.literal('reflection'),
      label_sid: SidSchema,
      description_sid: SidSchema,
      lens: z.enum(['discernment', 'collected_attention']),
      config: ReflectionConfigSchema,
      rewardTiers: z.array(RewardTierSchema).min(1),
    })
    .strict(),
  z
    .object({
      id: TokenSchema,
      type: z.literal('walking'),
      label_sid: SidSchema,
      description_sid: SidSchema,
      lens: z.enum(['patient_courage', 'collected_attention']),
      config: WalkingConfigSchema,
      rewardTiers: z.array(RewardTierSchema).min(1),
    })
    .strict(),
]);

export type MinigameDef = z.infer<typeof MinigameDefSchema>;
export type MinigameType = MinigameDef['type'];
