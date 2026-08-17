// Progression design lint — referential integrity plus the game-design
// meter ban, applied to the progression registries. Pure and deterministic.

import { MODIFIER_KEY_WHITELIST } from '@/engine/endowment';

import { containsMeterToken, walkStrings, type LintReport, type LintViolation } from '../lint';
import type { EffectOp } from '../schema';
import type { ProgressionRegistries } from './loader';

export const R_PROG_REF_INTEGRITY = 'R-PROG-REF-INTEGRITY' as const;
export const R_PROG_CORE_KINDS = 'R-PROG-CORE-KINDS' as const;
export const R_PROG_KIND_CATALOG = 'R-PROG-KIND-CATALOG' as const;
export const R_PROG_NO_METER = 'R-PROG-NO-METER' as const;
export const R_PROG_MODIFIER_KEYS = 'R-PROG-MODIFIER-KEYS' as const;

const CORE_KIND_IDS = ['thing', 'outcome', 'change', 'person', 'place'] as const;

function error(rule: string, message: string, location: string): LintViolation {
  return { rule, severity: 'error', message, location };
}

/**
 * Lint the loaded progression registries.
 *  - R-PROG-REF-INTEGRITY: tier unlock milestones and milestone grants point
 *    at rows that exist.
 *  - R-PROG-CORE-KINDS: the five SPEC §6 core kinds all have registry rows,
 *    so the table fallback can never lose a person-scale kind.
 *  - R-PROG-KIND-CATALOG: every kind row has ≥1 catalog entry — the table
 *    fallback is mandatory, so a kind without a table cannot ship.
 *  - R-PROG-NO-METER: no metaphysical-meter token in any progression row.
 *  - R-PROG-MODIFIER-KEYS: every `add_resource` key in endowment, visitor
 *    and compendium rows belongs to the five-key bench modifier vocabulary
 *    exported by the engine, and every delta is a non-negative integer —
 *    fractional surplus leaks fractional cook ticks and negative deltas are
 *    nonsense. Off-vocabulary keys can never be summed, so they are
 *    rejected at content-load time.
 */
export function lintProgression(registries: ProgressionRegistries): LintReport {
  const violations: LintViolation[] = [];

  const tierIds = new Set(registries.tiers.map((t) => t.id));
  const milestoneIds = new Set(registries.milestones.map((m) => m.id));

  for (const tier of registries.tiers) {
    if (tier.unlock_milestone !== null && !milestoneIds.has(tier.unlock_milestone)) {
      violations.push(
        error(
          R_PROG_REF_INTEGRITY,
          `tier "${tier.id}" references missing milestone "${tier.unlock_milestone}"`,
          `tiers[${tier.id}].unlock_milestone`,
        ),
      );
    }
  }
  for (const milestone of registries.milestones) {
    if (!tierIds.has(milestone.grants.tier)) {
      violations.push(
        error(
          R_PROG_REF_INTEGRITY,
          `milestone "${milestone.id}" grants unknown tier "${milestone.grants.tier}"`,
          `milestones[${milestone.id}].grants.tier`,
        ),
      );
    }
  }

  const kindIds = new Set(registries.kindRows.map((r) => r.id));
  for (const core of CORE_KIND_IDS) {
    if (!kindIds.has(core)) {
      violations.push(error(R_PROG_CORE_KINDS, `core kind "${core}" has no registry row`, 'kinds'));
    }
  }

  for (const row of registries.kindRows) {
    const entries = registries.catalogs[row.id];
    if (entries === undefined || entries.length === 0) {
      violations.push(
        error(
          R_PROG_KIND_CATALOG,
          `kind "${row.id}" has no catalog entries (table fallback is mandatory)`,
          `catalogs[${row.id}]`,
        ),
      );
    }
  }

  const meterScope = {
    milestones: registries.milestones,
    policies: registries.policies,
    endowment: registries.endowment,
    visitors: registries.visitors,
    compendium: registries.compendium,
    catalogs: registries.catalogs,
    roles: registries.roles,
  };
  for (const { s, path } of walkStrings(meterScope)) {
    if (containsMeterToken(s)) {
      violations.push(
        error(R_PROG_NO_METER, `prohibited meter token "${s}" in progression data`, path),
      );
    }
  }

  const modifierScopes: readonly { effects: readonly EffectOp[]; location: string }[] = [
    ...registries.endowment.map((row) => ({
      effects: row.effects,
      location: `endowment[${row.id}]`,
    })),
    ...registries.visitors.flatMap((row) =>
      row.effects === undefined
        ? ([] as readonly { effects: readonly EffectOp[]; location: string }[])
        : [{ effects: row.effects, location: `visitors[${row.id}]` }],
    ),
    ...registries.compendium.flatMap((row) =>
      row.reward.effects === undefined
        ? ([] as readonly { effects: readonly EffectOp[]; location: string }[])
        : [{ effects: row.reward.effects, location: `compendium[${row.id}]` }],
    ),
  ];
  for (const { effects, location } of modifierScopes) {
    for (const op of effects) {
      if (op.op !== 'add_resource') {
        continue;
      }
      if (!MODIFIER_KEY_WHITELIST.includes(op.key)) {
        violations.push(
          error(
            R_PROG_MODIFIER_KEYS,
            `add_resource key "${op.key}" is not in the bench modifier vocabulary [${MODIFIER_KEY_WHITELIST.join(', ')}]`,
            `${location}.effects`,
          ),
        );
        continue;
      }
      if (!Number.isInteger(op.delta) || op.delta < 0) {
        violations.push(
          error(
            R_PROG_MODIFIER_KEYS,
            `add_resource delta ${op.delta} must be a non-negative integer`,
            `${location}.effects`,
          ),
        );
      }
    }
  }

  const hasError = violations.some((v) => v.severity === 'error');
  return { passed: !hasError, violations };
}
