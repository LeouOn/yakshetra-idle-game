# Yakshetra

**Status:** living constitution.  
**Supersedes:** the product pitch in `README.md`, the content-authoring contract in `CONTRIBUTING.md`, the representation-fenced framing in `ARCHITECTURE.md`, the six-gate process in `advisory/`, and the P2–P4 experiment ladder in `docs/roadmap.md`.

If those documents disagree with this one, this one is right. Rewrite them when you touch them. Do not quietly obey the old rules.

Agents: start at [`AGENTS.md`](AGENTS.md).

---

## 1. What this is

Yakshetra is a game.

You live a life. You work, give, sit with other beings, study, and meditate. That work leaves **residue**. Residue cooks on a bench. When it is ready you harvest a **Manifest** — a thing, an outcome, a change, a person, or a place. Manifests pin onto later work. People and places assemble into a **world**. The world is the prize.

The name stays. A _yakṣa-kṣetra_ is a field where beings and work meet. Play that. Do not translate the name away, and do not treat it as a disclaimer.

This is the project. It is not a tool we are building so a later game can exist. World drafts may be exported. Fun is not deferred.

### 1.1 The ladder

Six tiers compose. A tier's roster reflects its rung: member-bearing tiers (household, org, city) seat autonomous lives for that tier; unit tiers (town, region) seat one inert row per unlocked lower rung. Every bench keeps its own residue window and cooks its own tier's Manifests; in addition, a fixed share of each bench's residue (every `fold_cadence`-th event) flows into its parent bench's window as a copy carrying one extra id, `folded_from:<childBenchId>`. Unlocked benches tick, cook, and hold harvests on their own; only the tier with the embodied member takes active play. The archive — pinned Manifests and world drafts — is the only proof of progress. Nothing is spent.

| #   | Tier      | Roster contains                                         | Unlock                                                                 |
| --- | --------- | ------------------------------------------------------- | ---------------------------------------------------------------------- |
| 0   | person    | one life                                                | —                                                                      |
| 1   | household | 3–8 lives under one roof                                | 1 world draft + 3 archived `person`                                    |
| 2   | org       | households + loose members                              | 2 archived `tradition` + 1 household-scale world draft                 |
| 3   | town      | households + organizations                              | 1 archived `charter` + 2 org-scale world drafts                        |
| 4   | city      | city institutions (member-bearing, autonomous)          | 1 archived `festival` + 1 archived `landmark` + 2 town-scale drafts    |
| 5   | region    | person + households + orgs + towns + cities (unit rows) | 1 archived `institution` + 1 archived `monument` + 2 city-scale drafts |

Crossing a milestone fires a graduation (ceremony + guaranteed first harvest auto-queued at the new tier). Kind registry, endowment tracks, visitors, compendium, offline cap, and the studio shell all generalize through region — the chain ships.

---

## 2. What this is not

- Not a museum of Mahāyāna.
- Not a teaching, a lineage, an initiation, or a substitute for a teacher.
- Not a karma accountant.
- Not a sci-fi reboot.
- Not an ethically-restrained incremental life-RPG whose highest virtue is what it refuses to depict.
- Not middleware.

The older two-life campaign (Tang China → fantasy Mahāyāna, bardo, echoes) is still in the repo. It is a **residue source** and a setting, not the product identity. Do not delete it. Do not let it set the fences.

---

## 3. Fantasy

A life you can inhabit and a bench you can work.

The Tang pack and the fantasy pack are places, not caution tape. Named Buddhas, bodhisattvas, historical teachers, yakṣas, mantras, and practices may appear as game content: figures, patrons, opponents, place-names, harvest material, flavor.

The remaining religious boundary is one sentence:

> The app does not claim the authority of a sangha.

Do not impersonate a teacher. Do not sell blessing. Do not tell the player they have attained anything real. Inside that line, the field is open.

Tone of the fiction: warm, specific, slightly occult-workshop. Objects have weight. Names are allowed to land. Copy should feel like handling something, not like labeling a vitrine and not like a sermon.

---

## 4. Player loop

Classic idle, not a turn puzzle pretending to be idle.

1. **Tend.** Practices tick. Events resolve. Residue appends. Tending fills a charge bar. Overflow past full becomes surplus cook — extra production, not a wasted tap.
2. **Cook.** Once enough residue has gathered (minimum 3 events), queue a develop job on that window. The bay cooks on studio ticks.
3. **Harvest.** A filler writes a Manifest into the schema. Tables always work. A model may write the same slots. Invalid model output falls back to tables. The player always gets a card.
4. **Pin.** A harvested person or place can be pinned. The next window is _about_ that focus.
5. **Assemble.** One place, or two people who need somewhere to stand, becomes a world draft: name, line, cast, places, tensions, bonds.
6. **Return.** Pins and world drafts feed later play. Export is JSON. The archive persists separately from a weak life-chain save.

Away-from-keyboard: 1 studio tick = 60 seconds of real time, catch-up capped at 240 ticks. The engine never reads the clock. The caller passes `nowUnix` in.

---

## 5. One system

There is one game with two surfaces.

| Surface | Route          | Job                                                |
| ------- | -------------- | -------------------------------------------------- |
| Life    | `app/life/...` | Live. Emit residue. Carry setting, ties, time.     |
| Studio  | `app/studio`   | Archive and compile. Cook, harvest, pin, assemble. |

They share an engine. Play residue folds into the bench through `importPlayResidue` / `syncPlayResidueToStudio`. Studio session (`studio_session/v0`) persists on its own store, not inside the life-chain `SaveBlob`. That split is load-bearing: the bench must survive a rotten life save.

Still owed:

- Pin and world draft actually change the next life, not only the next harvest.
- Life-chain persistence as durable as the bench.
- One visual language. Studio is already dark; the campaign screens should follow.

---

## 6. Manifest

The Manifest is the product object.

```
manifest/v0
  kind          thing | outcome | change | person | place
  name
  one_liner
  subject
  detail
  tags[]
  rarity        common | uncommon | rare
  fill_status   latent | table | model
  quality_tier
  provenance    { source: table | model, revision }
  about_id?     pinned person/place the card is about
  about_name?
```

Kind is compiled from the residue window, not chosen by the player.

- Level-up windows → **change**
- Resolved-event windows → **outcome**
- Several distinct ids plus an engagement marker → **person**
- Several practices, no social marker → **place**
- Otherwise → **thing**

Quality upgrades after three harvests. Quality first; more bays and families later. Do not add a second bay because the first one is boring. Make the first one better.

World draft (`world_draft/v0`) is assembled deterministically from the archive. No extra RNG. Export is `canonicalStringify`.

---

## 7. Residue

Residue is the work log. It is fiction-agnostic on purpose.

```
ResidueEvent
  tick: number
  type: practice_tick | practice_level | lens_chosen
        | event_resolved | resource_edge | life_ended
  ids: string[]
  numbers: { [key: string]: number }
```

No prose. No sacred names. No flavor. The compiler (table or model) is the only thing that writes sentences.

The engine appends. It never rewrites history.

---

## 8. Life context

At harvest the filler may receive a structured snapshot of the life (`life_context/v0`):

- setting (era, role, calendar date and hour)
- ties (close / owed / warm / thin) and the strongest one
- flags, lens, age, whether the life is still going
- residue summary
- activity totals by family
- current world name and line, if any

Activity families: `work`, `generosity`, `beings`, `learning`, `meditation`, `other`.

Lenses map onto those families. Generosity and other beings are first-class, not afterthoughts.

This snapshot is prompt material. It is not a soul score.

---

## 9. Harvest and the model

The engine never fetches. It never reads `process.env`. It never sees an API key.

A `ManifestFiller` is a function: `(request, rng) → Manifest`. `tableFiller` is the default. A model adapter is another filler that writes the **same slots**. `fillManifestSafe` validates with `ManifestSchema` and falls back to tables on any throw or parse miss. Table failure is not swallowed.

When a model filler is wired:

- Providers are **Z.ai** and **MiniMax** behind the registry in `src/ai/providers.ts` (Z.ai `https://api.z.ai/api/paas/v4`, MiniMax `https://api.minimax.io/v1`). Key env vars `ZAI_API_KEY` / `MINIMAX_API_KEY`, override `YAK_FILLER_PROVIDER`.
- The key lives server-side or in a git-ignored local env. It is never in the Expo bundle, never in `src/engine`, never committed.
- Call at harvest first. Background fill comes later.
- The model compiles residue + life context + brief + focus into slots. It does not invent fields. It does not chat with the player.
- Provenance records `source: "model"` and a revision string.

No model, no key, or a bad payload: the player still harvests a table card.

---

## 10. Fences

The old constitution was a museum. These are the new walls. They are fewer and they are load-bearing.

### Keep — craft

1. **`src/engine` is pure.** No React, no React Native, no Expo, no `Date.now`, no `new Date`, no `Math.random`, no `fetch`, no `process.env`, no `console`. Time and entropy enter as arguments. RNG is seeded xoshiro128\*\*.
2. **Harvest is a schema.** Every Manifest, world draft, life context, and studio session parses or it does not exist.
3. **Tables always work.** A model is an upgrade, not a dependency.
4. **Secrets stay out of the client.**
5. **Residue carries ids and numbers.** Prose is compiled, not logged.
6. **No metaphysical currency.** Do not add `karma`, `merit`, `enlightenment`, or `spiritual_rank` as a number the player farms. That is a bad incremental game, not a piety. Practices produce residue. Residue becomes objects. That is the economy.
7. **No pay-to-absolve.** A donation does not cancel a harm. That loop is boring and it is false.
8. **Identity is not a score.** `SocialIdentity` stays opaque. The echo reducer does not set the next life's caste, gender, class, wealth, or disability. Next life is not a reward table.
9. **TypeScript stays strict.** `exactOptionalPropertyTypes` is on. No `as any`. No `@ts-ignore`. No empty `catch`. Optional props are omitted, not set to `undefined`, unless the type says `| undefined`.
10. **Engine files stay small.** Over ~250 lines in `src/engine/` means extract a module.

### Keep — design

11. **Do not impersonate a teacher.** Fiction may name the sacred. The app may not claim to transmit it.
12. **Do not lecture the player.** No moral grade. No "you have understood."
13. **Disclaimer is a toast.** Show it once. Remember "Got it." Do not make it a ritual gate. Do not delete the settings path that can bring it back.
14. **Content warnings are player filters**, not ship gates. Keep the taxonomy as a courtesy. Do not block a pack because an advisory folder is empty.
15. **Quality before width.** One bay, one compile, better cards — then more families, then more bays.

### Drop

These rules are retired. Enforcement is already gone from `src/content/lint.ts` and from `scripts/audit-plan.mjs`. Do not add tests that restore them.

- **R-NO-SACRED-NAMES** and the 40-name list (`advisory/prohibited-names.txt`, `src/content/prohibited-names.ts` — archive only)
- **R-NO-REAL-MANTRA**
- Advisory panel seating, six gates, stop-ship, reviewer agreements, as a condition of shipping
- "This is a work of fiction, not a teaching" as the product identity
- "Ethically-restrained" as a pitch
- The P2 real-time / P3 sprite RPG / P4 platformer ladder as the future of this repo

`advisory/` is archive. Leave it on disk. Do not run the process.

---

## 11. Content

Era packs stay data: Zod + JSON5 under `src/content/packs/`. Player-facing strings stay SIDs in `src/i18n/en.json`.

You may now:

- Name Shakyamuni, Guanyin, Mañjuśrī, Dizang, a yakṣa at the gate, a historical teacher.
- Put a real mantra on a practice, a figure, or a harvested card.
- Write events in which those figures act.

You still:

- Put every player-visible string behind a SID.
- Tag genuinely hard material with the existing warning taxonomy.
- Let the schema reject a karma-meter effect.
- Prefer a named figure who _does something_ over a glossary entry.

The six lenses stay six until the activity families need a new one. Do not add a lens because a tradition has more _pāramitās_. Add one when the bench cannot tell two kinds of work apart.

---

## 12. Stack

- Expo SDK 57, Expo Router, React Native Web
- pnpm
- TypeScript, strict, `exactOptionalPropertyTypes`
- Vitest
- Zod + JSON5 packs
- Persistence: life-chain via `SaveAdapter` (idb-keyval / expo-sqlite); studio via `studio-kv` (`localStorage` on web)

Run:

```bash
pnpm install
pnpm exec expo start --web
```

Checks:

```bash
pnpm tsc --noEmit
pnpm lint
pnpm test
```

Use a development build, not Expo Go.

---

## 13. What is already built

- Deterministic life engine, echoes, idle ticks, calendar
- Residue log on `LifeState`
- Studio state, one develop bay, tend, surplus overflow, catch-up
- Table-fill Manifests, pin/focus, world draft, life context
- Play → studio residue bridge
- Studio route and dark bench UI
- Campaign routes still playable; they emit residue

## 14. What to build next

The ladder (§1.1) is shipped through region — six tiers, archive milestones, graduation, residue fold-up, endowment, visitors, compendium, offline cap, the studio shell. The order once listed here is closed: named figures on the bench (done), pinned persons/places changing the next life (done), life-chain persistence at parity with the bench (done), campaign screens on the studio visual language (done). Model harvest behind `fillManifestSafe` shipped provider-pluggable (Z.ai, MiniMax) as Phase 6 of the harvest-quality program (`docs/superpowers/specs/2026-08-24-harvest-quality-program.md`); the default build still harvests from tables alone.

**Another item is deferred**, on purpose: a second develop bay, a new family, or a new pack. §10.15 said quality before width; the cards and the city/region content still have room to get better. Polish, do not widen.

---

## 15. Tone of this document

Spare. Adult. Specific. The last constitution sounded like a museum grant. This one should sound like a game we intend to finish.

If a future sentence in this file starts protecting a tradition from being depicted, delete the sentence and check whether the game got worse. If it starts dissolving engine purity or schema harvest so a card can feel more magical, delete that sentence too.

---

## 16. Build notes for the next two

These are implementation briefs, not a second constitution. Follow the fences in §10.

### 16.1 Named figures on the bench

**Done already**

- `R-NO-SACRED-NAMES` and `R-NO-REAL-MANTRA` are removed from `lintPack`.
- `scripts/audit-plan.mjs` no longer greps the 40-name list.
- Tests assert those rules stay gone (`retired R-NO-SACRED-NAMES` / `retired R-NO-REAL-MANTRA` in `src/content/__tests__/lint.test.ts`).
- Incomplete `figure:bhadrakalpa-21`…`25` rows (no SIDs, two of them aliases) were stripped; `21`–`23` later landed localized, and the count is 35.

**Goal**

A harvest can come back as Guanyin, Dizang, a courtyard yakṣa, Bodhidharma — a person the player can pin — not only "the night clerk." A practice or event can name the figure it is about.

**Do this**

1. **Catalog first.** Add named entries to `PEOPLE` (and a couple of `PLACES` / `THINGS` if a site or object is the figure's) in `src/engine/manifest-catalog.ts`. Start with the twelve core Tang figures that already have SIDs (`figure:shakyamuni` … `figure:bodhidharma`). Use the real names. Keep the generic clerk/courier rows as fallbacks.
2. **Wire pick.** `tableFillManifest` should prefer a catalog row whose tags or id match a residue `ids[]` token (`figure:…`, `mantra:…`, a practice bound to that figure). If nothing matches, keep the current table pick. Pin `about_id` / `about_name` when the window is about a figure.
3. **Let figures act.** One Tang event or practice that _does something with_ a named figure — a guest, a demand, a courtyard presence — with SIDs in `src/i18n/en.json`. Prefer an event over a glossary entry.
4. **The last three of this era are done.** Kakusandha, Koṇāgamana, Kassapa shipped with four SIDs each under `figure.bhadrakalpa.21`–`23`. Krakucchanda / Kanakamuni live in `transliterated_names` only — the same two people, not extra rows. The count assertions sit at 35.
5. **Mantras.** Pack mantras already exist (`mantra:nianfo`, Heart Sutra close, six-syllable, etc.). You may put the seed syllables in player-facing SID text. Do not mint a `merit` resource for reciting them.

**Do not**

- Dump the old 40-name list into the catalog as a phone book.
- Restore `prohibited-names.ts` to the lint.
- Put prose on `ResidueEvent`. The figure's _id_ goes in `ids[]`; the name is compiled.
- Change figure count without SIDs. `resolveSid` throws on a missing key.

**Done when**

- A cooked window whose residue mentions `figure:avalokiteshvara` (or the compassion practice) harvests a card named for Guanyin / Avalokiteśvara, pinable, with `about_id`.
- `pnpm test` is green. Tang pack still loads. No new lint rule.

### 16.2 Model harvest

**Goal**

At harvest, if a key is available _outside the client bundle_, a model writes the same Manifest slots the tables write. If anything is wrong, the player still gets a table card.

**Hard constraints**

- `src/engine` stays sync and network-free. Do not make `ManifestFiller.fill` async. Do not import `fetch` or `process.env` there.
- `fillManifestSafe` remains the only ingest path. Invalid JSON → table fallback. Table failure is not swallowed.
- Key env vars are `ZAI_API_KEY` / `MINIMAX_API_KEY` (override `YAK_FILLER_PROVIDER`). Provider facts live in the registry at `src/ai/providers.ts`: Z.ai `https://api.z.ai/api/paas/v4` (model `glm-4.6`, JSON mode via `response_format`), MiniMax `https://api.minimax.io/v1` (model `MiniMax-M3`, no `response_format` on its OpenAI-compatible endpoint — prompt-only JSON plus `<think>` stripping; thinking disabled where the model allows it). Confirm current model ids from the provider docs before editing the registry. Never invent provider env vars.
- The key must not appear in the Expo web bundle. That means no `EXPO_PUBLIC_*` key vars, no key in `app.json`, no key in any file under `src/ui` or `app/` that Metro will pack.

**Shape**

```
src/ai/providers.ts             // provider facts as data; NOT imported by src/engine
src/ai/manifest-completer.ts    // NOT imported by src/engine
  createManifestCompleter(providerId, apiKey, fetchImpl?) → (request) => Promise<unknown>
  makeCompleterFromEnv(env, fetchImpl?) → completer | null

src/engine/fill-adapter.ts      // unchanged contract
  ManifestFiller.fill is sync
  fillManifestSafe(request, rng, filler)

UI / hook (StudioView harvest path)
  1. compileRequestFromBay(...)
  2. if a host-injected completeManifest exists, await it
  3. harvestWithFiller(studio, rng, oneShotFiller(raw), lifeContext)
  4. else harvestTableFill(...)
```

`oneShotFiller(raw)` is a `ManifestFiller` whose `fill` returns `raw`. `fillManifestSafe` parses it. If parse throws, tables win. Provenance: set `fill_status: "model"` and `provenance.source: "model"` only when the parsed object actually came from the model and passed the schema. Do not stamp `model` on a table fallback.

**Where the key lives (v0)**

Expo has no server in this repo. Do not pretend it does.

- **Tests (Node):** read `process.env.ZAI_API_KEY` / `process.env.MINIMAX_API_KEY` in `src/ai/` or the test file. Mock `fetch` for the default suite so CI does not need a key. One optional live test per provider, skipped without its key, is enough.
- **App:** `StudioView` already takes injectable collaborators (`storage`, `clock`, `rng`). Add an optional `completeManifest?: (req) => Promise<unknown>`. Default is undefined → tables. A later local proxy or desktop host injects the function. The default Expo web build never sees the key.

**Prompt**

Send the `ManifestCompileRequest` as JSON (`schema_version`, residue, summary, brief, focus, `life_context`, quality_tier). Instruct the model:

- Return a single JSON object that satisfies `manifest/v1` (v0's kind enum cannot carry the higher-scale kinds).
- Fill `name`, `one_liner`, `subject`, `detail`, `tags` only. Keep `kind` as compiled unless the request's residue clearly demands a different kind in the existing pick rules.
- Named figures from `life_context` and residue ids are in play.
- Do not add keys. Do not write a chat reply. Do not claim attainment.
- `fill_status` must be `"model"`. `provenance` is `{ source: "model", revision: "<registry slug>" }` — `zai/glm-4.6`, `minimax/MiniMax-M3`.

**Tests to write**

- `fillManifestSafe` + garbage one-shot filler → table card (`fill-adapter.test.ts` already covers this pattern).
- `completeManifest` builds the right URL, header `Authorization: Bearer …`, and body. Mock fetch.
- Missing key / fetch throw / non-JSON / extra keys / missing `name` → harvest still returns a valid table Manifest.
- No file under `src/engine` imports `src/ai` or `process.env` (an engine-purity test walks `src/engine` and fails on either).
- `StudioView` without `completeManifest` still harvests (existing test).

**Do not**

- Put the model call inside `operations.ts`.
- Chat with the player.
- Block harvest on network.
- Add a second bay to "use the model more."

**Done when**

- `pnpm test` is green with no API key.
- Injecting a stub `completeManifest` that returns a valid Manifest produces `fill_status: "model"` in the archive.
- Breaking that stub still produces a table card.
- `rg 'ZAI_API_KEY|MINIMAX_API_KEY' src/engine app src/ui` is empty.
