# Wave 1 Engine Boundary Review

**Date**: 2026-10-03  
**Reviewer**: dev-check (cross-family review)  
**Target**: Wave 1 uncommitted engine & boundary changes  
**Scope**: Determinism & Saves, Cook & Holds, Card Composition, Persistence, Ladder & Kinds, Multi-Bench Drain

---

## 1. Executive Summary

Wave 1 introduces major gameplay and architectural systems: flexible cook-window shaping, card template composition with deduplication, offline catch-up and multi-bench ladder simulation, and platform-independent SHA-256 integrity.

While the test suite runs green (117 files passed, provider keys unset), cross-family review identified several critical correctness and data-loss defects. Most prominently:

1. `importPlayResidue` drops all `held_residue`, wiping held-back traces, telemetry counters, and fold positions upon campaign play import.
2. In multi-bench harvest, visitor seat decay on tier benches is completely overwritten and lost due to an unbatched read against stale component refs.
3. Card deduplication is broken in production: callers pass `card.name` while the composer checks `${name} ${one_liner}`, permanently disabling both title and detail deduplication whenever the archive contains prior cards.
4. Card templates leak raw `{{slot}}` syntax into user-facing prose when optional flourishes or qualifiers fail to resolve.
5. `reachableKinds` suffers from 32-bit bitwise overflow at 31 groups and exponential $O(2^g)$ freezing on realistic trace piles.

---

## 2. Findings Ranked by Severity

### CRITICAL: Data Loss & State Corruption

#### Finding 1: `importPlayResidue` drops `held_residue`, `cook_choices`, and `fold_position`

- **Location**: `src/persistence/play-bridge.ts:52-61`
- **Concrete Failing State**:
  A player holds back 2 traces on the person bench (`held_residue: [1, 3]`), achieves some cook choices, and has an advanced `fold_position`. The player plays a campaign life and returns to the studio. `playBridge.importPlayResidue` executes and updates storage.
- **Root Cause**:
  `play-bridge.ts` reconstructs `person: { ... }` explicitly enumerating fields (`residue`, `last_harvest_index`, `bay`, `quality_tier`, `harvest_count`, `play_import`, `pinned`, `surplus`), but completely omits `held_residue`, `cook_choices`, and `fold_position`. Because `BenchSchema` defines `.default(...)` for these fields, Zod parses successfully but silently replaces `held_residue` with `[]`, `cook_choices` with `{ long: 0, holdback: 0 }`, and `fold_position` with `0`. Any traces held back prior to campaign import become unrecoverable orphans because `last_harvest_index` has already advanced past them.
- **Why Tests Missed It**:
  `play-bridge.test.ts` only asserts on `next.residue.length` and `play_import.life_id`; it does not inspect `held_residue`, `cook_choices`, or `fold_position` on the bench after import.

#### Finding 2: Tier bench visitor seat decay is overwritten and lost during multi-bench harvest

- **Location**: `src/ui/components/StudioView.tsx:936-937, 955`, `src/ui/components/StudioView.tsx:692-695`
- **Concrete Failing State**:
  Both a tier bench (e.g. Household) and the Person bench have ready bays and seated visitors with `windows_left: 1`. The player clicks "Reveal a discovery" (harvest).
- **Root Cause**:
  The tier loop drains ready tier benches and computes `tiersAcc = noteVisitorHarvest(accSession, tier).tiers;`, which is queued via `setProgression((current) => ({ ...current, tiers: tiersAcc }))` at line 937. Immediately after, line 955 calls `decayVisitorSeat(EMBODIED_TIER)`. At line 693, `decayVisitorSeat` reads `sessionFromSlices(benchRef.current)`—which still holds the pre-harvest state without `tiersAcc`—and dispatches a second `setProgression` with `noted.tiers`. Because React state setters execute in order, the second update completely clobbers `tiersAcc`. The visitor on Household never decays and remains seated indefinitely.
- **Why Tests Missed It**:
  Existing visitor decay tests (`visitors.test.ts`) test the pure engine function `noteVisitorHarvest` in isolation. `StudioView.test.tsx` tests person harvests or mock harvests where tier visitors are absent or unasserted.

#### Finding 3: Dedup contract mismatch permanently disables card detail and title deduplication

- **Location**: `src/engine/card-composer.ts:236, 244-247` vs `src/engine/operations.ts:190` & `src/ui/components/StudioView.tsx:747, 858`
- **Concrete Failing State**:
  The player has harvested 1 card ("Old Hermit", one-liner "Resting by the well"). The archive contains this card. The player harvests again from the same catalog row, which has an alternate template with an unseen detail.
- **Root Cause**:
  All production callers pass `archive.map((card) => card.name)` into `compileRequestFromBay` as `archive_titles` (`usedTitles`). However, in `card-composer.ts:236`, `seenTitle` checks:
  ```ts
  const seenTitle = (t: { t: CardTemplate }): boolean =>
    input.usedTitles.includes(`${draw(t.t).name} ${draw(t.t).one_liner}`);
  ```
  Because `usedTitles` only contains names (`"Old Hermit"`), it never matches `"Old Hermit Resting by the well"`. Therefore, `seenTitle` always returns `false`. Consequently, at line 244:
  `const freshTitle = hasTitleHistory ? rotated.find((c) => !seenTitle(c)) : undefined;`
  `!seenTitle(c)` is always true, so `freshTitle` immediately selects candidate 0 (`rotated[0]`). At line 246:
  `const chosen = hasTitleHistory ? (freshTitle ?? unseenDetail ?? top[0]) : ...;`
  `freshTitle` always short-circuits `unseenDetail`. Detail dedup never runs when `archive.length > 0`, causing duplicate cards to be generated even when alternative templates exist.
- **Why Tests Missed It**:
  In `card-composer.test.ts:232`, the unit test hand-crafted its test input with `usedTitles: [`${first.name} ${first.one_liner}`]`, matching the composer's internal expectation rather than what `operations.ts` and `StudioView.tsx` actually pass in production.

---

### HIGH: Runtime Failures & Algorithmic Bugs

#### Finding 4: Unfilled `{{slot}}` tokens leak into final player-facing card prose

- **Location**: `src/engine/card-composer.ts:125, 152`
- **Concrete Failing State**:
  A template authors a `flourish`, `long_fire`, or `rare` clause containing a slot (such as `{{tie}}` or `{{brief}}`). A cook occurs without a brief or in a life with no valid tie.
- **Root Cause**:
  In `composeCard`, template eligibility is only filtered by `fillSlots(t.detail, slots) !== null` (line 199). It does not validate `flourish`, `long_fire`, or `rare`. During `render`, line 152 evaluates:
  ```ts
  const flourish =
    input.rarity === 'rare' && template?.flourish !== undefined
      ? ` ${fillSlots(template.flourish, slots) ?? template.flourish}`
      : '';
  ```
  And line 125 in `qualifier` evaluates:
  ```ts
  if (owned !== undefined) {
    return fillSlots(owned, slots) ?? owned;
  }
  ```
  When `fillSlots` returns `null` (because `{{tie}}` or `{{brief}}` is missing), the null-coalescing operator falls back to the raw template string containing `{{slot}}`. That raw string is normalized and presented directly to the player.
- **Why Tests Missed It**:
  `card-composer.test.ts` tests template slot validity against the known dictionary (`it('every template slot is one the composer can actually fill')`), but does not test rendering a card with a missing optional slot in flourish or qualifier clauses.

#### Finding 5: `reachableKinds` bitwise overflow and exponential explosion on realistic piles

- **Location**: `src/engine/cook-groups.ts:116`
- **Concrete Failing State**:
  A player accumulates a 200-trace residue pile across several life activities, yielding $\ge 31$ distinct `(type, ids)` groups. The player opens the Cook panel.
- **Root Cause**:
  `reachableKinds` iterates over all group subsets using bitwise shift:
  ```ts
  const count = groups.length;
  for (let mask = 1; mask < 1 << count; mask += 1)
  ```
  In JavaScript, bitwise operators operate on signed 32-bit integers. When `count >= 31`, `1 << 31` evaluates to `-2147483648`. The loop condition `1 < -2147483648` is false on the first iteration, and `reachableKinds` silently exits returning `[]` (no quick-picks).
  For `16 <= count <= 30`, $2^{\text{count}}$ represents $65,536$ to $1,073,741,824$ iterations, performing allocations and residue summaries on every step, completely freezing the UI thread. There is no cap on `groups.length`.
- **Why Tests Missed It**:
  Unit tests in `cook-window.test.ts` test small synthetic groups of length 2 to 4 ($2^4 = 16$ iterations).

#### Finding 6: Schedule rotation freezes on starting schedule during multi-tick/multi-day batches

- **Location**: `src/engine/session-step.ts:101-115`
- **Concrete Failing State**:
  `stepSession` is called with `ticks: 48` (e.g. after a player absence or offline catch-up) with a rotation of 7 authored schedules.
- **Root Cause**:
  `session-step.ts` determines `daySchedule` once at the beginning of the step:
  ```ts
  const daySchedule =
    rotation === undefined || rotation.length === 0
      ? ctx.embodiedSchedule
      : (rotation[Number((embodiedIdle.lastSimulatedTick / 24n) % BigInt(rotation.length))] ??
        ctx.embodiedSchedule);
  ```
  It passes this single `daySchedule` to `stepStudio` for all 48 ticks. All 48 ticks (representing Day 0 and Day 1) execute exclusively on Day 0's schedule. On the subsequent step, `lastSimulatedTick` is 48 ($48/24 = 2$), jumping directly to Day 2. Day 1's schedule is completely skipped.
- **Why Tests Missed It**:
  `bench-schedule-rotation.test.ts` only asserted ticks $\le 24$ where step boundaries matched test expectations, and explicitly encoded in test 2 that a batch crossing midnight uses the starting day.

#### Finding 7: SplitMix64 fixed point at zero leaves first draw at 0 for seed 0 and matching-half seeds

- **Location**: `src/engine/rng.ts:76-83`
- **Concrete Failing State**:
  `createRng(0n)` or `createRng((X << 64n) | X)`.
- **Root Cause**:
  `expandSeed` computes:
  ```ts
  const lo = seed & MASK_64;
  const hi = (seed >> 64n) & MASK_64;
  return (mix64(lo ^ hi) << 64n) | mix64((lo + GOLDEN_GAMMA) ^ (hi + MIX_A));
  ```
  `mix64(value)` is the SplitMix64 output permutation without adding Weyl gamma. For `value = 0n`, `mix64(0n) === 0n`. Whenever `lo === hi` (which includes `seed = 0n`), `lo ^ hi = 0n`, so the high 64 bits of the expanded seed are `0n`.
  In `seedBigIntToState`, `state[0]` and `state[1]` become `0`. Because xoshiro128**'s first output is `rotl(s1 * 5, 7) * 9`, having `s1 = 0` guarantees the first draw is always `0`. This leaves the exact first-draw bias in place for `seed = 0n`.
- **Why Tests Missed It**:
  `rng.test.ts:242` only asserted `expect(() => createRng(0n)).not.toThrow()`, but never checked `createRng(0n).next() !== 0`.

---

### MEDIUM: State Inconsistencies & Edge Cases

#### Finding 8: Ghost entries in `held_residue` bypass gate and queue empty develop bays

- **Location**: `src/engine/cook-window.ts:55, 161-167`
- **Concrete Failing State**:
  `studio.held_residue` contains an index $\ge \text{residue.length}$ (e.g. from an out-of-sync save).
- **Root Cause**:
  `pendingIndices(studio)` populates `out` with `studio.held_residue` without verifying that each index is `< studio.residue.length`.
  In `queueDevelop`, `spent` contains these ghost indices, so `spent.length >= gate` evaluates to true. However, `window` filters them out because `studio.residue[index] === undefined`. If all spent indices are ghost indices, `window.length === 0`. An empty develop bay (`residue: []`) is queued, and `last_harvest_index` is erroneously advanced past future events.
- **Why Tests Missed It**:
  Tests always construct `held_residue` using valid existing indices.

#### Finding 9: Schema forward-incompatibility due to `.strict()`

- **Location**: `src/engine/studio-session.ts:77, 104`, `src/engine/studio-session-v0.ts:57`
- **Concrete Failing State**:
  A save written by the wave 1 build (containing `held_residue`, `cook_choices`, `fold_position` on benches, and `fire` on bay) is opened in a build predating wave 1.
- **Root Cause**:
  `BenchSchema`, `DevelopOperationSchema`, and `StudioSessionSchema` all enforce `.strict()`. While the new build can load old sessions via `.default()`, an older build parsing a new session throws `ZodError: Unrecognized key(s)` and rejects the save as invalid/corrupted.
- **Why Tests Missed It**:
  Tests verify backward compatibility (loading old shapes into current schemas), but cross-version forward compatibility is not tested.

#### Finding 10: `useSaveSlot.dispatch(PERSIST)` silently swallows storage write errors

- **Location**: `src/ui/hooks/useSaveSlot.ts:323-329`
- **Concrete Failing State**:
  `adapter().save(slot, action.blob)` throws (e.g. `QuotaExceededError` in `localStorage`).
- **Root Cause**:
  In `useSaveSlot.ts`, the catch block records `setError(...)` and executes `return;`. The dispatched Promise resolves with `undefined`. Calling code awaiting `dispatch({ type: 'PERSIST', blob })` receives a successful resolution and may navigate away or confirm to the player, while the save was dropped.
- **Why Tests Missed It**:
  `useSaveSlotErrors.test.tsx` verifies that `error` state is populated, but does not assert whether the dispatch promise rejects or indicates failure to the caller.

#### Finding 11: `capitalizeSentences` breaks on Sanskrit diacritics, opening quotes, and abbreviations

- **Location**: `src/engine/prose-normalize.ts:43-47`
- **Concrete Failing State**:
  - `ācārya arrived.` -> `ācārya arrived.` (not capitalized)
  - `"hello world."` -> `"hello world."` (not capitalized)
  - `He arrived at 6 a.m. today.` -> `He arrived at 6 a.m. Today.` (falsely capitalized)
- **Root Cause**:
  `capitalizeSentences` uses `/(^|[.!?]\s+)([a-z])/g`. ASCII `[a-z]` excludes Unicode lowercase letters with diacritics (`ā, ī, ū, ṛ, ś, ṣ`). Words preceded by punctuation marks like quotes `"` do not match `^` or `[.!?]\s+`. Abbreviation periods are indistinguishable from sentence terminators.
- **Why Tests Missed It**:
  `card-copy.test.ts` only tested ASCII English strings without diacritics or leading quotation marks.

#### Finding 12: Disabled re-entrancy guard in default table harvest allows double-harvesting

- **Location**: `src/ui/components/StudioView.tsx:809, 839`
- **Concrete Failing State**:
  Player rapidly double-taps "Reveal a discovery" in default table harvest mode.
- **Root Cause**:
  Line 809 only gates when `completeManifest !== undefined`. In table mode, the guard is bypassed under the assumption that table harvest is synchronous. However, `fillTierBay` is an `async` function; `await fillTierBay` yields to the microtask queue for each tier bay. A secondary press during this yield re-enters `harvest()` with uncommitted `benchRef.current` state, triggering a duplicate harvest of the same tier bays.
- **Why Tests Missed It**:
  React testing library events in `StudioView.test.tsx` fire serially with single `fireEvent.press` calls.

---

## 3. Unverified Observations

The following items were noted during review as questionable or brittle, but could not be confirmed as active failures:

- **UNVERIFIED-1 (`src/engine/prose.ts:32`)**: In `humanizeId`, `head.length < tail.length` appears unreachable because `lastSegment` already splits on both `:` and `/`.
- **UNVERIFIED-2 (`src/engine/life-ties.ts:97`)**: `strongestTieName` falls back to `top.id` if `top.name` is null and `!isIdShaped(top.id)`. Non-namespaced identifiers like `vendor` or `friend-1` could potentially reach display slots if raw IDs are ever filed.
- **UNVERIFIED-3 (`src/engine/session-ladder.ts:170`)**: Tier benches auto-queue without passing `opts.holdBack`. If a tier bench ever acquired a held trace, it would never be spent by autonomous stepping.

---

## 4. Recommendations for Next Lane

1. In `src/persistence/play-bridge.ts`, ensure `person` retains `held_residue: bench.held_residue`, `cook_choices: bench.cook_choices`, and `fold_position: bench.fold_position`.
2. In `src/ui/components/StudioView.tsx`, pass `tiersAcc` into `noteVisitorHarvest(accSession, EMBODIED_TIER)` or batch visitor decays in a single state transformation.
3. In `src/engine/operations.ts` and `src/ui/components/StudioView.tsx`, pass `card => `${card.name} ${card.one_liner}`` as `archive_titles` to match `card-composer.ts`'s dedup contract.
4. In `src/engine/card-composer.ts`, filter candidate templates against `flourish` and `qualifier` slot requirements, and never fall back to raw strings containing `{{` when interpolation fails.
5. In `src/engine/cook-groups.ts:reachableKinds`, cap group count (e.g. `Math.min(groups.length, 12)`) and avoid 32-bit shift overflow.
