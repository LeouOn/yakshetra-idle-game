// Progression loader — validates the base JSON5 files against the
// progression schemas and flattens kind rows into engine KindRules.
// Pure and synchronous, mirroring ../loader.

import { z } from 'zod';

import type { KindRule } from '@/engine/kind-registry';
import { buildCatalog, type CatalogEntry, type CatalogMap } from '@/engine/table-catalog';

import { getProgressionBundle } from './registry';
import { lintProgression } from './lint';
import {
  CatalogTableSchema,
  CompendiumEntrySchema,
  EndowmentTrackSchema,
  KindRowSchema,
  MilestoneSchema,
  PolicySchema,
  RolesFileSchema,
  TierSchema,
  VisitorSchema,
  VisitorTableMapSchema,
  type CompendiumEntry,
  type EndowmentTrack,
  type KindRow,
  type Milestone,
  type Policy,
  type RolesFile,
  type Tier,
  type Visitor,
} from './schema';

export interface ProgressionRegistries {
  readonly tiers: readonly Tier[];
  readonly kindRows: readonly KindRow[];
  /** Engine-shaped rules, in file order. First match wins at compile. */
  readonly kindRules: readonly KindRule[];
  /** Table catalogs keyed by kind id — the table-fill fallback data. */
  readonly catalogs: CatalogMap;
  readonly milestones: readonly Milestone[];
  readonly policies: readonly Policy[];
  readonly endowment: readonly EndowmentTrack[];
  readonly visitors: readonly Visitor[];
  readonly compendium: readonly CompendiumEntry[];
  readonly roles: RolesFile;
  /** `visitor_tables` namespace → catalog entries. Phase 4 Task 2: a seated
   * visitor with `table_ref` swaps the tier catalog for this table. */
  readonly visitorTables: Readonly<Record<string, readonly CatalogEntry[]>>;
}

function extractArray(raw: unknown, key: string, filename: string): unknown[] {
  if (raw === null || typeof raw !== 'object') {
    throw new Error(`loadProgression: ${filename} must be an object with a "${key}" array`);
  }
  const value = (raw as Record<string, unknown>)[key];
  if (Array.isArray(value)) {
    return value;
  }
  throw new Error(`loadProgression: ${filename} must be an object with a "${key}" array`);
}

function parseFile<S extends z.ZodType>(
  schema: S,
  rows: unknown[],
  filename: string,
): z.infer<S>[] {
  const result = schema.array().safeParse(rows);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join('.') ?? '(root)';
    throw new Error(
      `loadProgression: ${filename} validation failed at "${path}": ${
        issue?.message ?? 'unknown error'
      }`,
    );
  }
  return result.data as z.infer<S>[];
}

function parseSingleton<S extends z.ZodType>(
  schema: S,
  raw: unknown,
  filename: string,
): z.infer<S> {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join('.') ?? '(root)';
    throw new Error(
      `loadProgression: ${filename} validation failed at "${path}": ${
        issue?.message ?? 'unknown error'
      }`,
    );
  }
  return result.data as z.infer<S>;
}

export function loadProgression(): ProgressionRegistries {
  const bundle = getProgressionBundle();
  const tiers = parseFile(
    TierSchema,
    extractArray(bundle.tiers, 'tiers', 'tiers.json5'),
    'tiers.json5',
  );
  const kindRows = parseFile(
    KindRowSchema,
    extractArray(bundle.kinds, 'kinds', 'kinds.json5'),
    'kinds.json5',
  );
  const catalogTables = parseFile(
    CatalogTableSchema,
    extractArray(bundle.catalogs, 'catalogs', 'catalogs.json5'),
    'catalogs.json5',
  );
  const byKind: Record<string, readonly CatalogEntry[]> = {};
  for (const table of catalogTables) {
    byKind[table.kind] = [...(byKind[table.kind] ?? []), ...table.entries];
  }
  const milestones = parseFile(
    MilestoneSchema,
    extractArray(bundle.milestones, 'milestones', 'milestones.json5'),
    'milestones.json5',
  );
  const policies = parseFile(
    PolicySchema,
    extractArray(bundle.policies, 'policies', 'policies.json5'),
    'policies.json5',
  );
  const endowment = parseFile(
    EndowmentTrackSchema,
    extractArray(bundle.endowment, 'endowment', 'endowment.json5'),
    'endowment.json5',
  );
  const visitors = parseFile(
    VisitorSchema,
    extractArray(bundle.visitors, 'visitors', 'visitors.json5'),
    'visitors.json5',
  );
  const compendium = parseFile(
    CompendiumEntrySchema,
    extractArray(bundle.compendium, 'compendium', 'compendium.json5'),
    'compendium.json5',
  );
  const roles = parseSingleton(RolesFileSchema, bundle.roles, 'roles.json5');
  const kindRules: KindRule[] = kindRows.map((row) => ({ kind: row.id, match: row.match }));
  const catalogsRaw = bundle.catalogs as { visitor_tables?: unknown };
  const visitorTables = parseSingleton(
    VisitorTableMapSchema,
    catalogsRaw.visitor_tables ?? {},
    'catalogs.json5 (visitor_tables)',
  );
  const registries: ProgressionRegistries = {
    tiers,
    kindRows,
    kindRules,
    catalogs: byKind,
    milestones,
    policies,
    endowment,
    visitors,
    compendium,
    roles,
    visitorTables,
  };
  const lintReport = lintProgression(registries);
  if (!lintReport.passed) {
    const first = lintReport.violations[0];
    throw new Error(
      `loadProgression: lint rejected progression content (rule ${first?.rule ?? 'unknown'}): ${
        first?.message ?? 'unknown violation'
      }`,
    );
  }
  return {
    ...registries,
    catalogs: buildCatalog(
      kindRows.map((row) => row.id),
      byKind,
    ),
  };
}
