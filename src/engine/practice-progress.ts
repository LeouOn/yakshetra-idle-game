// Practice-progress folding — idle practice deltas onto runtime Practice
// values. Pure move from operations.ts (Binding Decision 6 split); operations
// re-exports it so the historical import surface holds. types is imported
// TYPE-ONLY, so no runtime cycle exists.
// Pure: no Date, no Math.random, no fetch.

import type { Practice } from './types';

/** Fold idle practice deltas back onto runtime Practice values. */
export function applyPracticeProgress(
  practices: readonly Practice[],
  advanced: readonly { readonly id: string; readonly progressGained: number }[],
): Practice[] {
  return practices.map((practice) => {
    const row = advanced.find((a) => a.id === practice.id);
    if (row === undefined || row.progressGained === 0) {
      return practice;
    }
    const max = practice.maxProgress;
    const raw = practice.currentProgress + row.progressGained;
    if (max <= 0) {
      return { ...practice, currentProgress: raw };
    }
    const gainedLevels = Math.floor(raw / max);
    return {
      ...practice,
      currentProgress: raw - gainedLevels * max,
      level: practice.level + gainedLevels,
    };
  });
}
