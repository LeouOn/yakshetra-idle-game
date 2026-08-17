# Yakshetra

You live a life. The work leaves residue. Residue cooks into Manifests.
Manifests become a world.

**Product law:** [`SPEC.md`](SPEC.md)
**How to work in this repo:** [`AGENTS.md`](AGENTS.md)

Those two documents supersede the older museum pitch below, the
content-authoring bans in `CONTRIBUTING.md`, and the six-gate process in
`advisory/`. Named figures and real mantras are in play. The engine stays
pure. Harvest stays a schema.

Expo SDK 57 / TypeScript / web + iOS + Android.

---

## What this is

Yakshetra is a game: an idle operations bench fed by a life. The older
two-life campaign (Tang China → fantasy Mahāyāna) is still playable and
is the residue source. Read `SPEC.md` for the current identity. The
paragraphs after this one are historical and should not steer new work.

The plan was **approved by Oracle** after a 5+ hour build that resolved
all 15 Metis-flagged gaps (Mahāyāna anachronism, no-karma-to-identity
invariant, 4 echo types, advisory stop-ship rules, etc.). The 34-todo
prototype is complete and working. The 5 remaining items are genuinely
blocked on external resources you must provide.

---

## Quick start

```bash
# Install deps
pnpm install

# Run all checks (typecheck + lint + test)
pnpm tsc --noEmit && pnpm lint && pnpm test

# Run the web build
pnpm exec expo export --platform web
# → dist/ (7 HTML routes + JS bundle)

# Start dev (uses development build, NOT Expo Go — see "Toolchain notes" below)
pnpm exec expo run:web       # web dev
pnpm exec expo run:ios       # iOS simulator (needs macOS + Xcode 26)
pnpm exec expo run:android   # Android emulator (needs Android SDK)
```

---

## What's implemented vs blocked

### ✅ Implemented (34 todos done, 210 tests passing)

| Area                                                                                                                                | Status |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Toolchain (Expo SDK 57, strict TS, vitest, ESLint, Prettier, Husky, EAS profiles)                                                   | ✅     |
| Engine (deterministic RNG, LifeState reducer, cross-life echo reducer, canonical serialization, save/load with corruption fallback) | ✅     |
| Content (Zod EraPackSchema, 5-rule prohibited-mechanics lint, 9-category warning taxonomy, Tang China pack + Fantasy Mahāyāna pack) | ✅     |
| UI (Expo Router + 7 routes, life start, turn screen, bardo, settings, about, disclaimer, ReflectCard)                               | ✅     |
| Tests (210 passing: property tests for determinism + no-karma-to-identity, echo integration, modularity, a11y audit)                | ✅     |
| Verification (F1 PASSES, F2 APPROVED 12/12, F4 PASSES, a11y audit + fixes committed)                                                | ✅     |
| CI workflows (`.github/workflows/test.yml` + `eas-build.yml` + `maestro-e2e.yml`)                                                   | ✅     |
| Advisory infrastructure (`advisory/panel.md` + 6 gate templates + feedback log)                                                     | ✅     |
| Playtest protocol + manual QA checklist                                                                                             | ✅     |
| Future-prototype roadmap (`docs/roadmap.md`)                                                                                        | ✅     |

### ⛔ Blocked on external resources (5 items, `- [~]`)

These require something no orchestrator subagent can provide. Each is
documented with the specific blocker and the preparation work that
makes it executable the moment you supply the missing piece.

| Todo                              | Blocker                                                                                                                                                         | When you provide it                                                                    |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **T30** Maestro E2E execution     | Maestro CLI install + iOS Simulator + Android Emulator + T31 APK                                                                                                | Tell me "Maestro ready" → I'll run the 6 flows committed at `.maestro/flows/`          |
| **T31** EAS cross-platform builds | Expo account + Apple Developer creds + Google Play creds + physical devices                                                                                     | Tell me "EAS ready" → CI workflow at `.github/workflows/eas-build.yml` will run        |
| **T32** Advisory 6-gate review    | You recruit 4 advisors (East Asian Mahāyāna scholar-practitioner, Buddhist-studies academic, cultural representation specialist, lay Mahāyāna community member) | Tell me "panel seated" → gate templates at `advisory/review-records/` are ready to use |
| **T33** n=8 human playtest        | You recruit 8 testers (4 Buddhist, 4 non-Buddhist)                                                                                                              | Tell me "playtesters ready" → `docs/playtest-protocol.md` is the runbook               |
| **F3** Real manual QA             | Physical iPhone + Android + T31 builds                                                                                                                          | Tell me "devices here" → `docs/manual-qa-checklist.md` is the runbook                  |

---

## Where to find things

```
yakshetra/
├── README.md                         (you are here)
├── ARCHITECTURE.md                   (system architecture + invariants)
├── CONTRIBUTING.md                   (how to add events, eras, lenses)
├── package.json                      (pnpm scripts)
├── tsconfig.json                     (strict TS settings)
├── eas.json                          (EAS build profiles)
├── app/                              (Expo Router routes — 7 routes)
│   ├── index.tsx                     (chain picker home)
│   ├── life/start.tsx                (life start with role selection)
│   ├── life/[lifeId].tsx             (active life turn screen, 4-phase)
│   ├── bardo.tsx                     (between-lives transition with echoes)
│   ├── chain-complete.tsx            (after 2 lives)
│   ├── settings.tsx                  (content warnings, reduced motion, font, save)
│   ├── about.tsx                     (disclaimer, lineage, glossary)
│   └── +html.tsx                     (web static rendering)
├── src/
│   ├── engine/                       (pure TS — NO React, NO platform APIs)
│   │   ├── types.ts                  (LifeState, KarmaState, Echo, Lens, IntentRoot)
│   │   ├── reducer.ts                (applyChoice, applyEvent, applyEffect)
│   │   ├── predicates.ts             (extracted predicate evaluator, ≤250 LOC)
│   │   ├── echo.ts                   (summarizeLife, mergeKarma, applyEchoesToNextLife)
│   │   ├── rng.ts                    (xoshiro128** seeded RNG)
│   │   ├── turn.ts                   (advanceTurn)
│   │   ├── serialize.ts              (canonical JSON + SHA-256 integrity)
│   │   └── index.ts                  (barrel)
│   ├── content/                      (Zod schema + lint + era packs)
│   │   ├── schema.ts                 (EraPackSchema — prohibits karma/merit effects)
│   │   ├── lint.ts                   (5-rule prohibited-mechanics lint)
│   │   ├── loader.ts                 (loadEraPack helper)
│   │   ├── warning-taxonomy.ts       (9-category taxonomy)
│   │   └── packs/
│   │       ├── tang-china/           (pack.json5 + events.json5 + endings.json5 + meta)
│   │       └── fantasy-mahayana/     (pack.json5 + events.json5 + endings.json5 + meta)
│   ├── persistence/                  (save/load adapters: memory, native, web)
│   ├── ui/                           (React components + hooks)
│   │   ├── components/               (BardoView, SettingsView, AboutView, DisclaimerModal, etc.)
│   │   └── hooks/                    (useSaveSlot, useEngineReducer)
│   ├── i18n/en.json                  (all player-facing strings as stable SIDs)
│   └── a11y/                         (axe-core audit helpers + report generator)
├── advisory/
│   ├── panel.md                      (2507 words — reviewer composition, 6 gates, decision rules, fallback)
│   ├── prohibited-names.txt           (40-name closed list)
│   └── review-records/               (6 gate templates + feedback-log.md)
├── docs/
│   ├── roadmap.md                    (3 future prototypes + shared-core extraction)
│   ├── playtest-protocol.md          (T33 runbook)
│   └── manual-qa-checklist.md        (F3 runbook)
├── scripts/
│   └── audit-plan.mjs                (F1 plan compliance audit — run with `node scripts/audit-plan.mjs`)
├── .maestro/flows/                   (6 E2E YAML flows for T30)
├── .github/workflows/                (3 CI workflows for test + EAS build + Maestro)
└── .omo/                             (gitignored — local-only state: plans, drafts, evidence, boulder.json)
```

---

## Toolchain notes

- **DO NOT use Expo Go** — it was deprecated for SDK 55+ (see
  https://expo.dev/changelog/expo-go-and-app-store-may-2026). The project uses
  development builds via EAS Build profiles.
- **`eas.json` is pre-configured** with three profiles (development / preview /
  production). Production submission is a separate user-gated decision.
- **Node 20+** required; **pnpm** preferred (lockfile committed).
- **iOS builds require Xcode 26** (per Apple requirement effective April 28, 2026).
- **Engine has zero platform dependencies** — `src/engine/` imports nothing from
  react, react-native, or expo. This is enforced by the F2 code-quality review.

---

## Cultural representation commitments

This project engages directly with Mahāyāna Buddhist and bodhisattva-inspired
themes. The product scope is deliberately narrow: two fictional lives, one
historical (Tang China, late 8th–early 9th century) and one original fantasy
(the Garden of Arrivals — an allegorical cosmic realm). We make these
commitments to the traditions we engage with:

1. **No named sacred figures** — no named Buddhas, bodhisattvas, arahants, or
   historical teachers appear as game characters. The closed list is at
   `advisory/prohibited-names.txt` (40 names) and enforced by the 5-rule lint.
2. **No karma-as-identity** — a 1000-case property test (`.omo/evidence/task-8-invariant-1000.txt`)
   asserts that karmic echoes never touch SocialIdentity fields. This is the
   load-bearing representation fence: no "bad karma → bad rebirth" mechanic
   ever appears in the game.
3. **No doctrinal claims as canonical** — no sutra quotes, no fabricated
   sayings attributed to historical teachers, no generated Buddhist text
   presented as scripture. The 6-gate advisory review (templates at
   `advisory/review-records/`) verifies this.
4. **Real Mahāyāna concepts as inspiration, not simulation** — the six
   practices (generosity, careful conduct, patient courage, joyful effort,
   collected attention, discernment) are used as player-facing lenses, never
   as skill trees or progression axes.
5. **Theravāda and Vajrayāna are out of scope** for this prototype. A
   Mahāyāna-specific advisory panel reviews the Mahāyāna engagement; other
   traditions are not depicted and not reviewed.

The full decision framework (including stop-ship rules, escalation paths,
and the 6-week recruitment fallback) is at `advisory/panel.md`.

---

## Running the F1 audit

```bash
node scripts/audit-plan.mjs
# → .omo/evidence/F1-compliance.md
# → Verdict: PASS (31/31 evidence files present, 0 must-not violations)
```

---

## License

Private. Not yet licensed for public distribution. The advisory process
must complete before any external release.

---

## See also

- `ARCHITECTURE.md` — system architecture, data flow, invariants
- `CONTRIBUTING.md` — how to add events, era packs, lenses, and tests
- `docs/roadmap.md` — three future prototypes (real-time text, 2D RPG, platformer)
- `advisory/panel.md` — representation framework and stop-ship rules
- `.omo/plans/buddhist-inspired-incremental-rpg.md` — the full implementation plan
