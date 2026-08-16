// Manifest v0 -> v1 migration. Additive: v0 entries gain scale: "person".
// Pure: no Date, no platform APIs. Unknown payloads throw loudly.

import { z } from 'zod';

import {
  MANIFEST_LEGACY_VERSION,
  MANIFEST_SCHEMA_VERSION,
  ManifestSchema,
  type Manifest,
} from './manifest';

const ManifestV0Schema = z
  .object({
    schema_version: z.literal(MANIFEST_LEGACY_VERSION),
    id: z.string().min(1),
    rng_seed: z.string().min(1),
    brief: z.string().nullable(),
    residue_window_id: z.string().min(1),
    kind: z.enum(['thing', 'outcome', 'change', 'person', 'place']),
    name: z.string().min(1),
    one_liner: z.string().min(1),
    subject: z.string().min(1),
    detail: z.string().min(1),
    tags: z.array(z.string().min(1)).min(1),
    rarity: z.enum(['common', 'uncommon', 'rare']),
    fill_status: z.enum(['latent', 'table', 'model']),
    quality_tier: z.number().int().min(0),
    provenance: z
      .object({
        source: z.enum(['table', 'model']),
        revision: z.string().min(1),
      })
      .strict(),
    about_id: z.string().min(1).optional(),
    about_name: z.string().min(1).optional(),
  })
  .strict();

export type ManifestV0 = z.infer<typeof ManifestV0Schema>;

export function migrateManifestV0(v0: ManifestV0): Manifest {
  return ManifestSchema.parse({
    ...v0,
    schema_version: MANIFEST_SCHEMA_VERSION,
    scale: 'person',
  });
}

/**
 * Parse any supported Manifest payload, migrating v0 to v1. Throws when the
 * payload is neither — a filler that returns garbage has failed, and the
 * caller (fillManifestSafe) falls back to tables.
 */
export function parseManifest(raw: unknown): Manifest {
  const v1 = ManifestSchema.safeParse(raw);
  if (v1.success) {
    return v1.data;
  }
  const v0 = ManifestV0Schema.safeParse(raw);
  if (v0.success) {
    return migrateManifestV0(v0.data);
  }
  throw new Error('parseManifest: payload is neither manifest/v1 nor manifest/v0');
}
