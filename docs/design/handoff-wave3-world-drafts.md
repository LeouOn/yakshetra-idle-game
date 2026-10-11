# Handoff: Wave 3 World Draft Line Composition (b3)

## Summary of Changes

1. **`src/engine/world-draft-templates.ts`**:
   - Authored phrasing templates for all settings:
     - 10 frames for `personWithPlace` (joining person's what and place's where).
     - 10 frames for `personOnly` honest fallbacks.
     - 10 frames for `placeOnly` honest fallbacks.
     - 10 frames each for tier scales: `household`, `org`, `town`, `city`, `region`, `nation`, `world`.
   - 32-bit FNV-1a hash with avalanche bit mixer (`hashOf`) and uniform modulo picker (`pickTemplate`).
   - Fences respected: no engine concept tokens (`org`, `tier`, `scale`, `breadth`), no id-shaped tokens, no moral grading, no teacher impersonation.

2. **`src/engine/world-draft.ts`**:
   - Implemented and exported `composeWorldDraftLine(first, second, scale)`.
   - `assembleWorldDraft` builds the world draft line via `composeWorldDraftLine` from first person and first place cards.
   - World `name` is strictly the place card's name (never an id-shaped token, falling back to 'A street that is still deciding', never two cards spliced).
   - Exact schema and determinism preserved (`canonicalStringify` export, pure TypeScript, no RNG/Date).
   - File length: 199 lines (under 250-line engine limit).

3. **`src/engine/world-scale.ts`**:
   - `assembleWorldDraftAtScale` uses `composeWorldDraftLine(first, second, scale)` for tier drafts, rendering settings that read at their scale rather than as person-and-place pairs.
   - Guards against id-shaped names.
   - File length: 120 lines (under 250-line engine limit).

4. **`src/engine/chronicle.ts`**:
   - Line 244 replaced `${first?.name ?? 'a place'} — ${second.one_liner}` with `composeWorldDraftLine(first, second, scale as ManifestScale)`. Eliminates the title/line splice in chronicle quotes.
   - Consolidated imports from `./manifest` to avoid duplicate import linter warnings.

5. **`src/engine/index.ts`**:
   - Exported `composeWorldDraftLine`.

6. **Golden Fixtures Updated**:
   - `src/engine/__tests__/world-scale.test.ts`:
     - Line 103 (household): `'By the shared hearth: The hearth row waits. Across the threshold: Old Shi waits.'`
     - Line 115 (town): `'Where the parish lanes meet at the west bridge: Lantern night waits.'`
     - Line 132 (org world0): `'Sworn before the hall: The charter hall waits. Here: The oath keeper waits.'`
     - Line 140 (org world1): `'Through the counted yard, the guild found its footing: The tally master waits.'`

7. **Evaluation Document**:
   - `docs/design/eval/09-world-drafts.md`: 12 world drafts printed verbatim (6 Tang, 6 Fantasy, across mixed scales: person, household, org, town, city, region).

## Test Verification

- Boundary tests: 40 / 40 passing.
  - `src/engine/__tests__/world-draft.test.ts`: 11 / 11 passing (includes variety verification where no frame exceeds 25% across 40 drafts, determinism, fallbacks, banlist fences, id-token fences, Buddhist figure preservation).
  - `src/engine/__tests__/world-scale.test.ts`: 15 / 15 passing.
  - `src/engine/__tests__/chronicle.test.ts`: 13 / 13 passing.
  - `src/engine/__tests__/eval-drafts.test.ts`: 1 / 1 passing.
- Full suite (`env -u ZAI_API_KEY -u MINIMAX_API_KEY -u YAK_FILLER_PROVIDER pnpm test`):
  - 1499 tests passed across 138 test files.
  - Note on out-of-boundary failure: 1 failing test file was untracked `src/ui/__tests__/StudioLifeTies.test.tsx` (an in-flight test from a peer where mock `epoch` had `year0` instead of `year`, throwing RangeError in `assertEpochLike`).
- `pnpm lint`: 0 errors.
- `EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 pnpm exec expo export --platform web`: clean export (10 static routes, 0 errors).
- Engine purity: 0 `Date`, 0 `Math.random`, 0 network, 0 console.
