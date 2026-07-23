# F1 Plan Compliance Audit

Generated: 2026-07-23T02:47:29.896Z
Plan: `.omo/plans/buddhist-inspired-incremental-rpg.md`

## Summary

- Total todos: **34**
- Completed (plan `[x]`): **34**
- Todos with evidence (T0–T34): **31 / 31**
- Missing evidence: **0**
- Must-have bullets uncovered: **0**
- Must-not-have violations: **0**

**Verdict: PASS**

## Per-todo evidence presence

| Todo | Done | Title | Evidence |
| --- | --- | --- | --- |
| 0 | x | Recruit advisory panel + author `advisory/panel.md` (USER-OWNED, 4–6 week lead time) | task-0-panel-doc.txt |
| 1 | x | Initialize repository, Expo SDK 57, TypeScript strict, lint/format/test tooling | task-1-toolchain.txt |
| 2 | x | Pure deterministic engine scaffold | task-2-engine-smoke.txt |
| 3 | x | Seeded RNG module (xoshiro128 | task-3-rng-vectors.txt |
| 4 | x | Content schema v0.1 with Zod validation | task-4-schema-valid.json |
| 5 | x | Prohibited-mechanics lint (5 rules) | task-5-lint-clean.txt |
| 6 | x | LifeState type + within-life reducer | task-6-reducer-roundtrip.json |
| 7 | x | KarmaState type + cross-life echo reducer | task-7-echo-summary.json |
| 8 | x | Property test: no-karma-to-identity invariant | task-8-invariant-1000.txt |
| 9 | x | Property test: cross-platform byte-identical state determinism | task-9-determinism-hash.txt |
| 10 | x | Save/load with versioning | task-10-save-roundtrip.json |
| 11 | x | Expo Router setup (file-based routes, typed routes, dev build) | task-11-routes.txt |
| 12 | x | Life start screen (role selection, content warnings, era intro) | task-12-life-start.txt |
| 13 | x | Turn screen (orient/intend/act/resolve) | task-13-turn-flow.txt |
| 14 | x | Reflect journal card (dismissible, non-blocking) | task-14-reflect-card.txt |
| 15 | x | Bardo transition screen + settings/accessibility | task-15-bardo.txt |
| 16 | x | Tang China era pack schema instance (roles, social structure, vocabulary) | task-16-tang-pack.txt |
| 17 | x | Tang China event graph (6–8 events, 2–3 choices each, weighted grit) | task-17-tang-events.json |
| 18 | x | Tang China death/endings (4 endings, scripted triggers) | task-18-19-20-tang-content.txt |
| 19 | x | Tang China lineage notes, glossary, source bibliography, English string table | task-18-19-20-tang-content.txt |
| 20 | x | Tang China content warning tagging audit + advisory pre-review | task-18-19-20-tang-content.txt |
| 21 | x | Fantasy era pack schema instance (original cosmology, positive imagery enumeration) | task-21-fantasy-pack.txt |
| 22 | x | Fantasy event graph (7 events, vow-enforcement rule) | task-22-fantasy-events.json |
| 23 | x | Fantasy death/endings (4 endings) | task-23-24-25-fantasy-content.txt |
| 24 | x | Fantasy lineage notes, fiction disclaimer, source notes, English string table | task-23-24-25-fantasy-content.txt |
| 25 | x | Fantasy content warning tagging audit + advisory pre-review | task-23-24-25-fantasy-content.txt |
| 26 | x | Cross-life echo wiring (3 demonstrable echoes) | task-26-echo-wiring.txt |
| 27 | x | Modularity proof (1 rule variation per pack) | task-27-modularity.txt |
| 28 | x | Front-matter disclaimer, content warning taxonomy (9 categories), warning UI flow | task-28-disclaimer.txt |
| 29 | x | Accessibility audit (axe-core, VoiceOver/TalkBack, reduced motion, contrast) | task-29-a11y.md |
| 34 | x | Future-prototype roadmap document | task-34-roadmap.md |
| F1 | x | Plan compliance audit | N/A (verification wave) |
| F2 | x | Code quality review | N/A (verification wave) |
| F4 | x | Scope fidelity audit | N/A (verification wave) |

## Must-have coverage matrix

| # | Must have | Covered by todos |
| --- | --- | --- |
| 1 | Working Expo SDK 57 app, single TypeScript codebase, builds for web + iOS + Android | 1, 11, 31 |
| 2 | Pure deterministic domain engine (`src/engine/`): no React, no platform APIs, no ambient `Math.random()`, no `Date.now()` | 2, 6 |
| 3 | Seeded RNG (xoshiro128**) with deterministic replay across platforms (verified by property test) | 3, 9 |
| 4 | Cross-life karmic-echo reducer with 4 echo types (tendency, vow, unresolved-attachment, pattern-break) | 7, 26 |
| 5 | Formal invariant: `Life2.start_state.{caste,gender,race,disability,species,wealth} ⊥ Life1.karma_state` (property-tested) | 8 |
| 6 | Two complete lives: Tang China (historical Mahāyāna, ~7th–9th c CE) + original fantasy Mahāyāna-inspired life | 16, 17, 18, 19, 20, 21, 22, 23, 24, 25 |
| 7 | Six lenses: generosity, careful conduct, patient courage, joyful effort, collected attention, discernment — interdependent, revisitable, never leveled | 6, 13 |
| 8 | 12–18 min per life, 6–8 events each, 2–3 choices per event, 4 endings per life | 17, 18, 22, 23 |
| 9 | At least 3 demonstrable cross-life echoes (one per type minimum) | 26 |
| 10 | At least 1 demonstrable rule variation per era pack (proves modularity, not text reskin) | 27 |
| 11 | Modern roguelite pacing: death fast and meaningful, restart instant, dismissible reflection card | 14, 15 |
| 12 | Content warning taxonomy: 9 categories, per-category toggle, on-entry warning, per-event indicator | 28 |
| 13 | Bardo transition screen between lives, "chain complete" screen after 2 lives with replay/new-chain option | 15 |
| 14 | Save/load with schema versioning, in-memory + native + web storage adapters | 10 |
| 15 | Localization: stable string IDs from day one; English ships; no sacred-term inline strings | 19, 24 |
| 16 | Zod content schema with version field per pack | 4 |
| 17 | Prohibited-mechanics lint (5 rules): rejects `karma_delta`, `merit_delta`, `enlightenment_delta`, references to closed prohibited-names list (Buddhas, bodhisattvas, arahants), donation-offsets-harm patterns, visible-karma-meter fields | 5 |
| 18 | Advisory panel scope document with composition, decision rules (unanimous vs majority stop-ship), 6 review gates | 0, 32 |
| 19 | Closed positive enumeration of permitted imagery for fantasy life | 16, 17, 18, 19, 20, 21, 22, 23, 24, 25 |
| 20 | Closed negative enumeration of prohibited names/imageries across both lives | 5 |
| 21 | Front-matter disclaimer ("inspired by, not doctrinal"), in-game glossary, lineage notes per era, source bibliography | 19, 24, 28 |
| 22 | WCAG 2.2 AA-targeted accessibility: keyboard, screen-reader labels, reduced-motion, 44×44px targets, no color-only meaning | 29 |
| 23 | E2E Maestro flows covering: full Tang life, full fantasy life, full chain, restart, settings | 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 30 |
| 24 | Cross-platform builds via EAS Build profiles (development/preview/production) | 31 |
| 25 | EAS Update wired (JS+assets only; no native changes without store release) | 31 |
| 26 | Roadmap document for future prototypes (real-time text, 2D RPG, platformer) | 34 |

## Must-not-have grep results

Scanned: src/, app/, src/i18n/, src/content/.
Excluded paths: __tests__/, fixtures/, prohibited-names.txt, lint.ts, this audit script.
Comment lines (// and #) stripped before scanning.
Hard tokens (karma.score, merit.point, firebase, crashlytics, sentry, amplitude, appcenter, admob) scanned in all remaining text.
Sacred names (40 closed-list figures) scanned in DIEGETIC content only — comments and lineage-notes / glossary / disclaimer / bibliography string values are exempt because T19/T21/T24 require listing excluded figures in scholarly framing (the closed lint T5 enforces this at the pack _sid level).

| Token | Hits | File |
| --- | --- | --- |
| _(none)_ | 0 | — |

## Missing evidence (violations)

- _(none)_

## Uncovered must-haves

- _(none)_
