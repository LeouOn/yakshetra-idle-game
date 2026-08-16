// Progression design lint — referential integrity plus the game-design
// meter ban, applied to the progression registries. Pure and deterministic.

import { containsMeterToken, walkStrings, type LintReport, type LintViolation } from '../lint';
import type { ProgressionRegistries } from './loader';

export const R_PROG_REF_INTEGRITY = 'R-PROG-REF-INTEGRITY' as const;
export const R_PROG_CORE_KINDS = 'R-PROG-CORE-KINDS' as const;
export const R_PROG_NO_METER = 'R-PROG-NO-METER' as const;

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
 *  - R-PROG-NO-METER: no metaphysical-meter token in any progression row.
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

  const meterScope = {
    milestones: registries.milestones,
    policies: registries.policies,
    endowment: registries.endowment,
    visitors: registries.visitors,
    compendium: registries.compendium,
  };
  for (const { s, path } of walkStrings(meterScope)) {
    if (containsMeterToken(s)) {
      violations.push(
        error(R_PROG_NO_METER, `prohibited meter token "${s}" in progression data`, path),
      );
    }
  }

  const hasError = violations.some((v) => v.severity === 'error');
  return { passed: !hasError, violations };
}
