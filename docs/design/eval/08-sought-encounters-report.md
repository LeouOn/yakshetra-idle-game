# Sought-Encounters Engine (Wave 3) Report

**Author / Seat**: `dev-check@yakshetra-idle-game`  
**Queue Reference**: `qitem-20261003204127-a556e4c4`  
**Date**: 2026-10-03

---

## 1. Overview & Outcome

The sought-encounters engine allows players to deliberately aim at and summon named Buddhist/historical figures into their world without introducing artificial meta-currencies, scores, or pay-to-absolve mechanics (SPEC §3, §10, §10.15, §16.1).

By pinning up to two cards on their bench (e.g. a Person and a Place) and cooking a residue window matching specific activity families and window types, the compiler deterministically resolves the matching recipe and summons the authored figure card into the harvest.

This wave adds **reachability for authored rows**, not duplicate or generic rows.

---

## 2. Recipe Table (11 Authored Recipes)

Authored in `src/content/progression/base/encounters.json5` under schema `encounter/v0`:

| Recipe ID                           | Figure ID                 | Target Name      | Pinned Needs       | Window Needs                                      | Hint SID                                  |
| :---------------------------------- | :------------------------ | :--------------- | :----------------- | :------------------------------------------------ | :---------------------------------------- |
| `encounter/shakyamuni-witness`      | `figure:shakyamuni`       | Śākyamuni        | 1 Person           | family: `learning`, kind: `outcome`, min_count: 5 | `encounter.shakyamuni.hint_sid`           |
| `encounter/vairocana-every-rafter`  | `figure:vairocana`        | Vairocana        | 1 Person + 1 Place | family: `work`, min_count: 6                      | `encounter.vairocana.hint_sid`            |
| `encounter/maitreya-waiting-room`   | `figure:maitreya`         | Maitreya         | 1 Place            | family: `meditation`, min_count: 5                | `encounter.maitreya.hint_sid`             |
| `encounter/manjushri-knot`          | `figure:manjushri`        | Mañjuśrī         | 1 Person           | family: `learning`, kind: `thing`, min_count: 4   | `encounter.manjushri.hint_sid`            |
| `encounter/samantabhadra-ditch`     | `figure:samantabhadra`    | Samantabhadra    | 1 Place            | family: `work`, kind: `thing`, min_count: 6       | `encounter.samantabhadra.hint_sid`        |
| `encounter/ksitigarbha-stair`       | `figure:ksitigarbha`      | Kṣitigarbha      | 1 Person           | family: `beings`, min_count: 5                    | `encounter.ksitigarbha.hint_sid`          |
| `encounter/mahasthamaprapta-stride` | `figure:mahasthamaprapta` | Mahāsthāmaprāpta | 1 Person + 1 Place | family: `work`, kind: `outcome`, min_count: 4     | `encounter.mahasthamaprapta.hint_sid`     |
| `encounter/nagarjuna-rafters`       | `figure:nagarjuna`        | Nāgārjuna        | 1 Person           | family: `learning`, kind: `person`, min_count: 4  | `encounter.nagarjuna.hint_sid`            |
| `bodhidharma-rock`                  | `figure:bodhidharma`      | Bodhidharma      | 1 Place            | family: `meditation`, kind: `thing`, min_count: 6 | `encounter.bodhidharma.hint_sid`          |
| `encounter/wutai-terrace`           | `figure:manjushri`        | Wutai Shan       | 1 Place + 1 Person | family: `meditation`, kind: `place`, min_count: 5 | `encounter.wutai.hint_sid`                |
| `encounter/ksitigarbha-mountain`    | `figure:ksitigarbha`      | Jiuhua Shan      | 1 Place            | family: `beings`, kind: `place`, min_count: 6     | `encounter.ksitigarbha_mountain.hint_sid` |

---

## 3. Verification & Test Proofs

All tests executed with provider keys strictly unset (`env -u ZAI_API_KEY -u MINIMAX_API_KEY -u YAK_FILLER_PROVIDER`):

1. **Red-First Discipline**:
   - `src/engine/__tests__/encounters.test.ts` initially run red (14 failing tests before implementation, 0 passes).
   - Now passing 17/17 tests in 57ms.
2. **Era Gating & Cross-Kind Fix**:
   - `src/engine/__tests__/sought-encounter-era.test.ts` passes 4/4 tests:
     - Refuses Tang-only figure sought in Fantasy era (falls through to neutral harvest).
     - Successfully serves sought figures belonging to current era.
     - Does not allow sought tags to cross kinds erroneously.
     - Unreached figure candidates stay era-filtered on the unsought path.
3. **Satisfiability Across Packs**:
   - Exhaustive property test verifies every single recipe is satisfiable by legal residue windows and pinned card pairs in both `tang-china` and `fantasy-mahayana`.
   - Verifies unmatched/empty windows never trigger encounter resolution.
4. **300-Seed Deterministic Sweep**:
   - Tested 300 random seeds (`BigInt(1000..1299)`); 300/300 seeds produce the exact targeted encounter figure with `manifest.name`, `manifest.tags`, and `manifest.about_id` correctly bound.
   - Without `encounter_figure_id`, Śākyamuni is never summoned from generic residue.
   - Long fire cleanly composes with encounter figures, elevating rarity floor while retaining figure provenance.
5. **Session Schema Backward Compatibility**:
   - Old sessions with single-card pin and missing `encounters_done` field parse without errors via Zod defaults (`encounters_done: []`, `pinned.second: undefined`).
6. **Lint and Typecheck**:
   - `pnpm tsc --noEmit` exits 0 (zero errors).
   - `pnpm lint` exits 0 (zero errors).
   - `pnpm exec expo export --platform web` passes and generates `dist/`.

---

## 4. UI Contract & Handoff Specifications

For the UI half (compendium "Sought" tab and bench pin interaction):

### A. Pair-Pin Focus API (`src/engine/focus.ts`)

- **Types**:
  ```ts
  export interface PinnedCard {
    readonly id: string;
    readonly name: string;
    readonly kind: string;
    readonly one_liner: string;
    readonly tags?: readonly string[] | undefined;
  }
  export interface Pinned extends PinnedCard {
    readonly second?: PinnedCard | undefined;
  }
  ```
- **Helper functions**:
  - `nextPinned(current: Pinned | null, card: ManifestFocus): Pinned | null`:
    - If unpinned: pins `card` as primary.
    - If `card` is already primary: unpins primary, promotes `second` to primary (or `null` if none).
    - If `card` is already `second`: unpins `second`.
    - If 1 card pinned: pins `card` as `second` (pair).
    - If 2 cards already pinned: replaces `second` with `card`.
  - `pinnedCards(pinned: Pinned | null | undefined): readonly ManifestFocus[]`:
    - Returns array of 0, 1, or 2 cards for easy mapping/rendering in React.

### B. Session State (`src/engine/studio-session-v0.ts`)

- `session.encounters_done: readonly string[]`:
  - Stores array of completed encounter recipe IDs (e.g. `['encounter/shakyamuni-witness']`).
  - Serialized in `studio_session/v1`.

### C. Compendium Selector (`src/engine/encounters.ts`)

- `soughtEncounters(session, recipes)` (or `soughtEncounters(recipes, encounters_done)`):
  - Returns `readonly SoughtEncounterRow[]`:
    ```ts
    export interface SoughtEncounterRow {
      readonly id: string;
      readonly figureId: string;
      readonly discovered: boolean;
      readonly hintSid: string;
      readonly silhouette: string; // e.g. "shakyamuni", "vairocana"
    }
    ```
  - `silhouette` is derived from the figure id (`figure:shakyamuni` → `"shakyamuni"`).
  - `hintSid` points to localized text in `src/i18n/en.json` (e.g. `encounter.shakyamuni.hint_sid`).
