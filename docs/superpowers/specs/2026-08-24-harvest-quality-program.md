# Harvest Quality Program — Phases 5–8

Status: approved direction (user, 2026-08-24). Scope: all four open items, sequenced.
Amends: `SPEC.md` §14 (drift fix, Phase 5) and §16.2 (provider registry, Phase 6).
Does not touch §10 fences. Phase 8 opens with a §1.1 amendment that the user
approves before any code.

## 1. Why

The six-tier ladder is merged. `SPEC.md` §14 marks "named figures on the bench
(done)" and "SpaceXAI harvest behind `fillManifestSafe` (done)" — both are
documentation drift from the Phase 4 amendment; neither is implemented. The
`PEOPLE` catalog still harvests "the night clerk"; no `src/ai/` exists. §16 is
literally titled "Build notes for the next two," and those two briefs are the
designated next builds. The remaining open item in §14 is §10.15: quality
before width.

User direction (2026-08-24): build all four items, sequenced quality-first.
No `XAI_API_KEY` is available; the model layer uses **Z.ai** and **MiniMax**.

The order is: figures → model harvest → polish → width. Figures land before
the model layer so the model has named rows to reach for; polish rides real
content; width comes last behind an explicit fence amendment.

## 2. Program frame

| Phase | Branch                          | Content                                                           |
| ----- | ------------------------------- | ----------------------------------------------------------------- |
| 5     | `feat/phase-5-named-figures`    | §16.1 named figures on the bench + §14 drift fix                  |
| 6     | `feat/phase-6-model-harvest`    | §16.2 model harvest, provider-pluggable (Z.ai + MiniMax)          |
| 7     | `feat/phase-7-polish`           | §10.15 quality pass over cards and city/region content            |
| 8     | `feat/phase-8-ladder-extension` | ladder rungs beyond region, behind a user-approved §1.1 amendment |

Phase 5 branches from `main` (main now carries phases 0–4). Each later phase
stacks on the previous one, as before. Each phase runs the established
cadence: implementation plan → task-by-task subagent execution with per-task
review → final Oracle whole-branch review → fix wave → push. Gate:
`node node_modules/typescript/bin/tsc --noEmit`, `pnpm lint`, `pnpm test`,
all green, no snapshot of the count frozen — the count grows.

## 3. Phase 5 — Named figures on the bench

Goal (§16.1): a cooked window whose residue mentions a figure harvests a card
named for that figure — pinable, with `about_id` — not "the night clerk."

### 3.1 Catalog rows

`src/engine/manifest-catalog.ts`:

- `PEOPLE` gains 12 rows, one per core figure (`figure:shakyamuni` …
  `figure:bodhidharma`). Real names: Śākyamuni, Amitābha, Bhaiṣajyaguru,
  Vairocana, Maitreya, Avalokiteśvara (Guanyin), Mañjuśrī (Wenshu),
  Samantabhadra (Puxian), Kṣitigarbha (Dizang), Mahāsthāmaprāpta (Dashizhi),
  Nāgārjuna, Bodhidharma. Each row tags its figure id plus bound associations
  where they exist (`mantra:nianfo` on Amitābha, `mantra:medicine-buddha` on
  Bhaiṣajyaguru, `mantra:six-syllable` on Avalokiteśvara, and the figure-bound
  practice ids from `practices.json5`). Prose is inline in the catalog, same
  register as existing rows — descriptive, never doctrinal, no fabricated
  sayings.
- `PLACES` gains 2 site rows: Wutai Shan (Mañjuśrī's bodhimanda) and Jiuhua
  Shan (Kṣitigarbha's), tagged with their figure ids.
- Generic clerk/courier rows stay untouched as fallbacks.

### 3.2 Pick wiring

`tableFillManifest` (in `src/engine/manifest.ts`) checks the compile
request's residue `ids[]` for `figure:*` / `mantra:*` / figure-bound practice
tokens. A catalog row whose tags match a token is preferred over the plain
table pick. Multiple matches → seeded rng among them (determinism preserved:
same seed, same card). No match → current behavior, unchanged. When the window
is about a figure, the manifest pins `about_id` / `about_name` to the figure.

### 3.3 A figure that acts

One Tang campaign practice or event bound to its figure, so play residue
actually carries figure ids across the bridge — nianfo recitation →
`figure:amitabha` is the leading candidate (mantra + figure already exist in
the pack). SIDs in `src/i18n/en.json` first. An event, not a glossary entry.

### 3.4 The last three of this era

Kakusandha, Koṇāgamana, Kassapa: four SIDs each (`display_name`, `attribute`,
`iconography`, `reverence`) under `figure.bhadrakalpa.21`–`23` in `en.json`,
then the rows in `figures.json5`. Count assertions go 32 → 35
(`pack.test.ts`, `sacred-types.test.ts`). No Krakucchanda / Kanakamuni rows —
those are Sanskrit aliases of two of the three.

### 3.5 §14 drift fix

`SPEC.md` §14: un-mark "named figures on the bench (done)" and "SpaceXAI
harvest behind `fillManifestSafe` (done)". After Phase 5 lands, figures is
true-done; model harvest stays open until Phase 6, marked accordingly.

### 3.6 Tests

Residue-id → figure-row pick; unmatched residue → generic fallback;
determinism (same seed → same card); figure count 35 with all SIDs resolving;
a play-residue bridge test showing a figure id reaching the studio catalog
pick; no new lint rule; `pnpm test` green.

Done when: a cooked window whose residue mentions `figure:avalokiteshvara`
(or the compassion practice / six-syllable mantra) harvests a card named for
Guanyin, pinable, with `about_id`. That is §16.1's own done-line.

## 4. Phase 6 — Model harvest with a provider registry

Goal (§16.2, generalized off SpaceXAI): at harvest, if a provider completer is
available outside the client bundle, a model writes the same Manifest slots
the tables write. Anything wrong — network, non-JSON, extra keys, missing
fields — the player gets a table card. The player never sees a failure.

### 4.1 Provider registry

`src/ai/providers.ts`. Two entries, one OpenAI-shaped request core
(chat/completions, `Authorization: Bearer`, non-streaming):

|               | `zai`                                      | `minimax`                                                                                                              |
| ------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Base URL      | `https://api.z.ai/api/paas/v4/`            | `https://api.minimax.io/v1`                                                                                            |
| Path          | `/chat/completions`                        | `/chat/completions`                                                                                                    |
| Default model | `glm-4.6`                                  | `MiniMax-M3`                                                                                                           |
| JSON mode     | `response_format: {type: "json_object"}`   | not supported — prompt-only                                                                                            |
| Thinking      | disable via `thinking: {type: "disabled"}` | disable on M3; strip `<think>` blocks pre-parse                                                                        |
| Temperature   | clamp to [0, 1] (provider max)             | [0, 2] as-is                                                                                                           |
| Error shape   | standard                                   | non-standard envelope (`base_resp.status_code`) — treat any non-2xx or missing `choices[0].message.content` as failure |

Model ids live in the registry, not in env. Changing a model is a code edit
plus re-reading the provider docs — the existing "confirm current model names
from provider docs before wiring" rule, now provider-agnostic. Verified facts
and sources in §8.

### 4.2 Completer factory

`src/ai/manifest-completer.ts`:

```
createManifestCompleter(provider, apiKey, fetchImpl?) →
  (request: ManifestCompileRequest) => Promise<unknown>
```

Builds the §16.2 prompt (return a single JSON object satisfying
`manifest/v0`; fill `name`, `one_liner`, `subject`, `detail`, `tags` only;
named figures from `life_context` and residue ids are in play; no extra keys;
no chat reply; no attainment claims), calls the provider, extracts
`choices[0].message.content`, strips think-blocks, returns the raw object as
`unknown`. It never parses-as-Manifest itself — `fillManifestSafe` is the
only ingest. `src/ai` is never imported by `src/engine` (test-enforced).

### 4.3 Selection and injection

`makeCompleterFromEnv(env)`: reads `ZAI_API_KEY` / `MINIMAX_API_KEY`, first
found wins; `YAK_FILLER_PROVIDER` overrides the order when both are set. No
other env vars. The UI layer (StudioView collaborators, alongside
`storage` / `clock` / `rng`) gains optional `completeManifest?:
(request) => Promise<unknown>`. Default `undefined` → tables. The harvest
path: compile the request, await the completer if present, feed the result to
`fillManifestSafe` through a one-shot filler; parse failure → table fallback
inside `fillManifestSafe`, unchanged. The default Expo web bundle never sees
a key.

### 4.4 Provenance

`fill_status: "model"` and `provenance: {source: "model", revision:
"zai/glm-4.6" | "minimax/MiniMax-M3"}` (registry slug + model) only when the
model's object actually parsed and passed the schema. A table fallback is
never stamped model. Existing contract, carried over verbatim.

### 4.5 Docs amendment

`SPEC.md` §16.2 and `AGENTS.md`: SpaceXAI / x.ai / `XAI_API_KEY` → the
provider registry (Z.ai + MiniMax named; the architecture stays
provider-agnostic — same request in, same Manifest shape out; adding a
provider is one registry row). Env keys `ZAI_API_KEY` / `MINIMAX_API_KEY`.

### 4.6 Tests

Mock-fetch suite for both providers (URL, headers, body shape; garbage /
non-JSON / think-block-polluted / extra-keys / missing-`name` responses all
→ valid table Manifest); completer selection from env; live tests skipped
without keys; engine-purity import test (`src/engine` imports nothing from
`src/ai`, no `process.env`); StudioView harvest without a completer still
returns table cards (existing behavior, regression-pinned).

## 5. Phase 7 — Polish pass (bounded here)

§10.15: the cards and the city/region content still have room to get better.
Polish, do not widen.

Shape: a written quality rubric (a harvest reads named, specific, usable
later — the AGENTS "Do" line), a per-tier audit of every catalog row against
it, and copy upgrades for the weakest rows — table copy and content quality
over new systems. City/region visitor and world flavor deepens within
existing systems. Copy-only: no schemas, no new mechanics, no new lint rules.
Full design lands when the phase opens, against real Phase 5+6 output.

Done when: every tier's `PEOPLE` / `THINGS` / `PLACES` rows pass the rubric
and the audit is recorded.

## 6. Phase 8 — Ladder extension (bounded here)

Rungs beyond region — nation, world as the working proposal. This phase opens
with a `SPEC.md` §1.1 + §10.15 amendment presented for explicit user approval
before any code: the amendment names the new rungs, their roster shapes, and
why width is now earned (Phases 5–7 landed). Then tiers ship as data in the
established Phase 3/4 pattern — kinds with TOTAL fallbacks, catalogs,
policies, schedules, roles, visitors, graduation, fold cadence. Full design
lands when the phase opens.

## 7. Fences honored

- `src/engine/` stays pure: no network, no env, no clock, no entropy. The
  completer lives in `src/ai/`, outside the engine, imported only by
  UI-layer code. `ManifestFiller.fill` stays sync.
- `fillManifestSafe` is the only ingest. Invalid JSON → table fallback. A
  table failure is never swallowed.
- Keys never enter the Expo bundle, `src/engine`, or git. Default build has
  no completer and never looks for one.
- Residue stays ids and numbers; the compiler writes sentences. Figure ids
  ride `ids[]`; names are compiled.
- No metaphysical currency, no pay-to-absolve, no identity scoring. Figure
  content stays descriptive — iconography, role, era context — never
  doctrinal claims or fabricated sayings.
- §10 untouched by this program. Phase 5 amends §14 wording to match
  reality; Phase 6 amends §16.2's provider facts; Phase 8 amends §1.1 behind
  explicit user approval. Nothing else in the constitution moves.

## 8. Verified provider facts (2026-08-24, librarian-verified)

**Z.ai** — base `https://api.z.ai/api/paas/v4/` + `/chat/completions`;
`Authorization: Bearer`; `response_format.type` accepts `json_object`;
models `glm-5.3` / `glm-5.2` / `glm-5.1` / `glm-4.7` / `glm-4.6` (200K
context, 128K out); temperature clamps to [0, 1]; thinking defaults on for
GLM-4.6+ and is disableable. Sources: `docs.z.ai/guides/develop/http/introduction`,
`docs.z.ai/api-reference/llm/chat-completion`, `docs.z.ai/guides/llm/glm-4.6`.

**MiniMax** — base `https://api.minimax.io/v1` + `/chat/completions`
(OpenAI-compatible; `api.minimax.chat` is not in official docs — do not use
it); `Authorization: Bearer`; models `MiniMax-M3` (1M context) and
`MiniMax-M2.x` variants; **no `response_format` on the OpenAI-compatible
endpoint** — prompt-only JSON; M3 thinking disableable, M2.x thinking cannot
be disabled and pollutes content with `<think>` blocks — strip before
parsing; non-standard error envelope (`base_resp.status_code`). Sources:
`platform.minimax.io/docs/api-reference/text-openai-api`,
`platform.minimax.io/docs/api-reference/text-chat-openai`,
`platform.minimax.io/docs/api-reference/api-overview`.

Consequence: Z.ai is the cleaner default; MiniMax rides the same defensive
parse + table fallback the architecture already requires. Both fit one
OpenAI-shaped request core with provider baseURL and auth.

## 9. Done-when summary

- Phase 5: figure-tagged residue harvests named, pinable figure cards;
  35 localized figures; §14 reads true.
- Phase 6: with a key in env, harvest fills from the model, provenance
  stamped only on real model parses; without a key or on any failure, tables
  — and the default bundle cannot see a key.
- Phase 7: rubric written, every tier's rows pass it.
- Phase 8: user-approved §1.1 amendment, then the new rungs ship as data.

## 10. Polish audit record (Phase 7, 2026-08-24)

Rubric: written into `src/content/progression/__tests__/catalogs.test.ts` and
enforced on every kind table and visitor table (name/one_liner/subject/detail
bands, sentence counts, tag counts, uniqueness, no meter tokens).

- Core tables: rows brought inside the rubric bands; names unchanged.
- Tier tables: deepened 4 → 5 rows each (10 new entries, one per kind).
- Figure reachability: Amitābha (nianfo), Bhaiṣajyaguru (medicine rite),
  Guanyin (six-syllable recitation) all reachable from real schedules.
- Visitor flavor: sample-arrival copy replaced; court-auditor and
  road-surveyor seated at real tables via the existing table_ref swap.
- One deviation from copy-only, accepted at review: `VisitorSchema`'s
  effects/table_ref refine relaxed from exclusive-or to at-least-one (the
  wired visitors carry both; the engine reads the two paths independently;
  the neither-present rejection stays test-pinned).

Verdict: every tier's rows pass the rubric. §10.15's quality work for cards
and city/region content is done; the deferred width item (second bay, new
family, new pack) remains deferred.
