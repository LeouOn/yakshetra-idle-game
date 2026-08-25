# AGENTS.md

How to work in this repo. Read [`SPEC.md`](SPEC.md) before changing product behavior.

## Authority

1. `SPEC.md` — what the game is
2. this file — how to touch it
3. tests and Zod schemas — what the code must actually do
4. the code
5. everything else (`README.md`, `CONTRIBUTING.md`, `ARCHITECTURE.md`, `advisory/`, `docs/roadmap.md`)

If an older doc forbids a named Buddha, a real mantra, an LLM harvest, or shipping without an advisory panel, ignore that document and follow the spec. When you edit an old doc, bring it into line. Do not add new rules that restore the museum.

## What you are building

A game. Life produces **residue**. The studio **cooks** a window of residue and **harvests** a **Manifest** (thing / outcome / change / person / place). People and places become a **world**.

The campaign lives (`app/life/...`) are a residue source and a setting. The studio (`app/studio`) is the compiler. One engine. This is the project, not a tool for a later one.

## Hard rules

These are not style. Breaking them is a bug.

**Engine purity.** `src/engine/` is pure TypeScript. No `react`, `react-native`, `expo`, `Date.now`, `new Date`, `Math.random`, `fetch`, `process.env`, `console`. Time enters as `nowUnix`. Entropy enters as a seeded `Rng` (`src/engine/rng.ts`, xoshiro128**). The engine never talks to a network.

**Schema or it does not exist.** Manifests, world drafts, life contexts, and studio sessions parse with Zod. A filler that returns extra keys or missing required fields has failed.

**Table fallback.** `fillManifestSafe` must still produce a valid table Manifest if the model throws or misses the schema. Do not swallow a table failure.

**Secrets.** `ZAI_API_KEY` / `MINIMAX_API_KEY` never enter the Expo bundle, never enter `src/engine`, never get committed. LLM calls live in `src/ai/manifest-completer.ts`, invoked from UI-side code through StudioView's optional `completeManifest` collaborator. Provider facts (base URLs, models, JSON-mode support) live in `src/ai/providers.ts`; confirm current model ids from the provider docs before editing the registry.

**Residue is ids and numbers.** No prose on `ResidueEvent`. The compiler writes sentences.

**No metaphysical currency.** Do not add `karma` / `merit` / `enlightenment` / `spiritual_rank` as a farmable number, effect op, or visible meter. Residue → Manifest is the economy.

**No pay-to-absolve.** A donation does not cancel a harm.

**Identity is not a score.** Do not put `social_identity` on `NextLifeSeed`. Do not let echoes set caste, gender, class, wealth, or disability.

**TypeScript.** `exactOptionalPropertyTypes` is on. No `as any`, no `@ts-ignore` / `@ts-expect-error`, no empty `catch`. For optional properties, omit the key; do not assign `undefined` unless the type is `T | undefined`. Spread only when defined: `...(x === undefined ? {} : { x })`.

**Engine size.** Split `src/engine/` files that grow past ~250 lines.

**No new import cycles.** `fill-adapter.ts` takes `CompileBayInput`, not `DevelopOperation`, on purpose.

## Content rules

Allowed: named Buddhas, bodhisattvas, historical teachers, yakṣas, real mantras, figures who act.

Not allowed: claiming the app is a lineage, an initiation, or a teacher. Lecturing the player. Scoring their soul.

Player-facing strings are SIDs in `src/i18n/en.json`. Packs are Zod + JSON5 under `src/content/packs/`.

**Lint.** `R-NO-SACRED-NAMES` and `R-NO-REAL-MANTRA` are gone. Do not restore them. `R-NO-KARMA-METER`, `R-NO-VISIBLE-KARMA-METER`, `R-NO-DONATION-OFFSET`, and `R-NO-PRACTICE-AS-CURRENCY` stay — they are game-design rules, not piety. `advisory/prohibited-names.txt` and `src/content/prohibited-names.ts` are archive.

`advisory/` is archive. Do not seat a panel. Do not treat empty gates as a blocker.

Disclaimer is a toast that remembers "Got it" (`yakshetra.disclaimer.v1`). Do not promote it back to a modal gate.

## Persistence

Two stores:

- Life-chain `SaveBlob` — `src/persistence/` (`SaveAdapter`)
- Studio session `studio_session/v0` — `src/persistence/studio-kv.ts`

Do not fold the bench into a weak life save. Play residue crosses via `src/persistence/play-bridge.ts` → `importPlayResidue`.

## UI

Studio is the visual lead: dark, `src/ui/studio-theme.ts`. New player-facing work follows that language. Campaign screens still exist; migrate them toward the bench when you touch them, do not invent a third palette.

All copy through SIDs. Juice (tend → bar) lives in `StudioJuice`. Tests that collide on visible text should use `testID`s, not unique poetry.

If you change UI, verify with tests at minimum (`src/ui/__tests__/`). There is no browser-tooling requirement beyond that unless a live web session is already up.

## How to run

```bash
pnpm install
pnpm exec expo start --web
```

Checks before you claim done:

```bash
pnpm tsc --noEmit
pnpm lint
pnpm test
```

Not Expo Go. `curl` in PowerShell is an alias; use the real tool or `Invoke-WebRequest` if you need HTTP.

## Where to look

| Want                       | Path                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------ |
| Product law                | `SPEC.md`                                                                            |
| Life state, echoes         | `src/engine/types.ts`, `reducer.ts`, `echo.ts`                                       |
| Residue                    | `src/engine/residue.ts`                                                              |
| Manifest + tables          | `src/engine/manifest.ts`, `manifest-catalog.ts`                                      |
| Cook / harvest / pin       | `src/engine/operations.ts`, `play-cursor.ts`, `practice-progress.ts`, `focus.ts`     |
| Filler slot                | `src/engine/fill-adapter.ts`                                                         |
| Model completer            | `src/ai/providers.ts`, `src/ai/manifest-completer.ts`                                |
| World                      | `src/engine/world-draft.ts`, `world-scale.ts`                                        |
| Six-tier ladder            | `src/engine/session-ladder.ts`, `graduation.ts`, `bench-mapping.ts`, `tier-state.ts` |
| Shared ladder constants    | `src/engine/ladder-const.ts`                                                         |
| Life snapshot for harvest  | `src/engine/life-context.ts`                                                         |
| Activity families          | `src/engine/activities.ts`                                                           |
| Endowment (upgrade tracks) | `src/engine/endowment.ts`, `endowment-validators.ts`                                 |
| Visitors                   | `src/engine/visitors.ts`                                                             |
| Compendium                 | `src/engine/compendium.ts`                                                           |
| Studio persist             | `src/engine/studio-session.ts`, `src/persistence/studio-kv.ts`                       |
| Play → bench               | `src/persistence/play-bridge.ts`                                                     |
| Bench UI                   | `src/ui/components/StudioView.tsx`                                                   |
| Studio session hook        | `src/ui/hooks/useStudioSession.ts`                                                   |
| Studio progression hook    | `src/ui/hooks/useStudioProgression.ts`                                               |
| Session selectors          | `src/ui/hooks/session-selectors.ts`                                                  |
| Studio route               | `app/studio.tsx`                                                                     |
| Packs                      | `src/content/packs/`                                                                 |
| Progression content        | `src/content/progression/`                                                           |

## Do

- Make the harvest feel like a reward. Named, specific, usable later.
- Prefer upgrading table copy and quality over adding systems.
- Keep fillers swappable. Same request in, same Manifest shape out.
- Named figures: see SPEC.md §16.1. Add SIDs before rows. Kakusandha / Koṇāgamana / Kassapa are the next three, not duplicate Sanskrit aliases.
- Model harvest: see SPEC.md §16.2. Engine stays sync. Key never in the bundle.
- Write a test next to the module you change (`src/engine/__tests__/`, `src/ui/__tests__/`).

## Do not

- Do not silently dissolve engine purity, schema harvest, or table fallback to ship flavor.
- Do not restore sacred-name or mantra bans.
- Do not add a second develop bay before quality tier and named-figure harvest feel good.
- Do not put LLM calls or API keys in `src/engine`.
- Do not invent provider env vars. The keys are `ZAI_API_KEY` / `MINIMAX_API_KEY` (override `YAK_FILLER_PROVIDER`); models change in the registry, not env.
- Do not treat `docs/roadmap.md` (P2–P4) as the plan.
- Do not expand scope into "the next game." Export JSON if you must; ship this one.

## Commit voice

Imperative, specific. `Harvest named figures through the filler slot`, not `Update stuff`. Do not commit secrets, `dist/`, or `.omo/`.
