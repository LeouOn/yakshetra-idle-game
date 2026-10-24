// The era the studio bench runs. The session records it (`bench_era`, written from the campaign
// life's era); a studio-only player has none and gets Tang. A recorded id that is not a real pack
// (a stale or hand-edited save) is treated as absent, so the bench never opens on a missing pack.

import { hasEraBundle } from '@/content/registry';

/** The era a bench with no recorded era runs: the UI layer owns the default, the engine names none. */
export const DEFAULT_BENCH_ERA = 'tang-china';

export function resolveBenchEra(recorded: string | null | undefined): string {
  return recorded !== null && recorded !== undefined && hasEraBundle(recorded)
    ? recorded
    : DEFAULT_BENCH_ERA;
}
