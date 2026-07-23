# Advisory Panel Scope Document

**Project:** Yakshetra (working title) — a text-management roguelite prototype for mobile and web
**Document owner:** Project engineer (author) and project principal (recruiter)
**Status:** Template — no advisor names appear in this document. Names, affiliations, and agreements are stored in `advisory/reviewer-agreements/` once recruited.
**Version:** 1.0 (authored as part of Wave 0 onboarding)
**Related plan:** `.omo/plans/buddhist-inspired-incremental-rpg.md` (todo 0)

---

## 1. Project Overview

Yakshetra is a small, single-engineer, two-life vertical slice of a Samsara-inspired, text-management roguelite for mobile (iOS, Android) and web. The prototype is built in Expo SDK 57 with TypeScript, and the content surface under review is intentionally narrow: **14 narrative events across two fictional lives, 8 endings, one "six-practice lens" framing screen, one cross-life echo mechanic, one bardo (between-lives) UI screen, the resource model, and the prohibition lists.**

**What the project is.** Life 1 is set in a fictionalized Tang-dynasty Chinese Mahāyāna milieu; Life 2 is set in an original fantasy setting that echoes Life 1 through thematic pattern (no canonical rebirth). The player manages a small set of mundane resources (time, attention, relationships) and reads short text vignettes. The design intent is reflective, not devotional; meditative, not instructional.

**What the project is NOT.** Yakshetra is **not a doctrinal simulator.** It does not teach Buddhism. It has **no karma meter, no merit currency, no enlightenment score, no enlightenment win-state, and no probabilistic reincarnation mechanic.** The cross-life echo is a fictional narrative device, not a claim about rebirth. The game does not present any generated or paraphrased text as canonical scripture.

**Whom the advisors are advising.** The panel advises on **cultural and religious representation in Buddhist-derived content for this prototype only** — not on doctrine, fun factor, monetization, or technology. Advisors do not endorse the project's religious accuracy; they bound the harm surface.

For scholarly context on the cultural-historical setting, see Jacques Gernet, _Buddhism in Chinese Society_; Stanley Weinstein, _Buddhism Under the T'ang_; and the _Stanford Encyclopedia of Philosophy_ entries on Madhyamaka and Yogācāra. David McMahan's _The Making of Buddhist Modernism_ informs our awareness of how "Buddhist-inspired" framing is read by Western audiences. These references situate the team's homework; they do not substitute for the panel.

---

## 2. Panel Composition

The panel is composed of four advisors, each with a distinct role. No single advisor covers the others' remit, and the panel exists precisely because no one reviewer can speak for the full scope.

- **R1 — East Asian Mahāyāna scholar-practitioner (Tang-era familiarity preferred).** Reviews the historical plausibility and in-milieu coherence of the Tang Life 1 setting (vocabulary, ritual texture, social institutions). Practitioner lens matters because the project engages lived tradition, not only text.
- **R2 — Buddhist-studies academic (Mahāyāna research focus).** Reviews whether any in-game claim, framing, or wording could be read as a false doctrinal assertion presented as canonical. Academic lens matters because the panel's unanimous stop-ship rules turn on this category.
- **R3 — Cultural-representation specialist (Chinese diaspora representation expertise).** Reviews stereotyping, exoticization, and representational harm to living Chinese and Chinese-diaspora communities. Representation lens matters because the Tang setting can still cause present-day harm.
- **R4 — Lay Mahāyāna community member.** Reviews whether content reads as respectful to a practicing lay household. Community lens matters because the audience includes practicing Buddhists; R4 is not asked to render doctrinal verdicts, only to flag what would land badly in a sangha context.

Recruitment is by **Buddhist-studies departments** (e.g., UCSB, McMaster, Leipzig, Vienna), **Mahāyāna community networks** (Fo Guang Shan academic liaison, Risshō Kōsei Kai, Sōtō Zen outreach), and **cultural-representation directories** (e.g., Smithsonian Asian Pacific American Center network). Recruitment is **user-owned**; the engineer authors this document and does not contact candidates.

---

## 3. Per-Reviewer Scope

**Each reviewer reviews the same artifact set**, not a divided one. Division of labor would let harms slip through the seams. The artifact set under review is:

- All **14 narrative events** (7 per life, across both lives)
- All **8 endings**
- The **six-practice lens** framing screen (a UI surface that names six generic contemplative patterns — no canonical names attached)
- The **cross-life echo** mechanic (how Life 1 choices are echoed thematically in Life 2)
- The **bardo** between-lives UI screen (textual; no visual depictions)
- The **resource model** (the mundane-resource econometrics and how they are framed in UI copy)
- The **prohibition lists** (the closed list of named sacred figures that the engine refuses to depict; the prohibited pure lands; the prohibited subject matter)

Each reviewer is also shown the **project front-matter disclaimer** (the in-game text that tells players this is a work of fiction, not a teaching) and is asked to confirm the disclaimer is adequate given the content reviewed.

**Explicitly OUT of scope for every reviewer:**

- Game-design feel, "fun factor," difficulty tuning, and play-test balance
- Monetization (the prototype has none) and business model
- Technical architecture, code quality, accessibility (covered by separate engineering QA)
- Any subject matter outside the Mahāyāna prototype scope (Theravāda and Vajrayāna content is excluded from this prototype entirely and is not the panel's remit)
- Doctrinal correction of the engineer's non-religious design choices (advisors are not editors of the design, only of its representation surface)

Reviewers are not asked to endorse the game, only to bound its harm surface and trigger the stop-ship rules in §4 when warranted.

---

## 4. Decision Rules

Stop-ship is the panel's only formal output. The panel does not approve content; it can only block content. All other feedback is advisory and non-binding on the engineer.

### 4.1 Unanimous stop-ship (all 4 reviewers; no override)

The engineer **cannot override** a unanimous stop-ship. The triggering content is cut from the prototype, full stop. The four unanimous triggers are:

1. **A named sacred figure is depicted against the prohibition list.** The prohibition list includes (but is not limited to) Shakyamuni, Buddha, Amitābha, Avalokiteśvara / Guanyin / Kannon / Chenrezig, Mañjuśrī, Samantabhadra, Kṣitigarbha, Mahāsthāmaprāpta, Tārā, Maitreya, Milarepa, Tsongkhapa, Nāgārjuna, Atīśa, Śāntideva, Bodhidharma, and the pure lands Sukhāvatī, Abhirati, and Vaidūryanirbhāsa. Any depiction (visual, named character, voice, or identifiable allusion) is a unanimous stop-ship.
2. **Restricted tantric material is included.** The prototype excludes Vajrayāna entirely; any tantric visualization, mantra-text, empowerment framing, or restricted teaching alluded to in content is a unanimous stop-ship regardless of how it was sourced.
3. **A karma → social-identity mechanic is present.** The prototype may not encode "past-life conduct → present-life caste/class/identity" as a causal game system. This is the single most dangerous misreading the project could produce; it is fenced off absolutely.
4. **A false doctrinal claim is presented as canonical.** If any in-game text asserts a Mahāyāna doctrinal position (on emptiness, buddha-nature, the two truths, etc.) as if it were canonical teaching, that is a unanimous stop-ship.

### 4.2 Majority stop-ship (3-of-4; override-possible with written response + next-gate re-review)

For **other representation harms** not captured above — stereotyping of Tang-era characters, exoticizing framings, appropriative word choices, tone-deaf UI copy, or analogous concerns — a 3-of-4 majority triggers a stop-ship at the current gate. The engineer may:

- (a) **Cut or rewrite the content** and re-submit at the same gate, OR
- (b) **Submit a written response** explaining why the engineer believes the content should stand; the response is appended to the gate record and the **next gate** re-reviews the contested content. If 3-of-4 reaffirms at the next gate, the content is cut.

### 4.3 Tie (2-2)

A 2-2 split is recorded as a **non-consensus** and the content **does not advance** to the next gate. The engineer must revise and re-submit at the same gate until at least 3-of-4 either passes or stop-ships the content.

### 4.4 Resignation mid-process

See §7.

---

## 5. Six Review Gates

The panel reviews the prototype at **six sequential gates**. A gate is opened by the engineer depositing the gate's materials in `advisory/gate-N-{name}/` and emailing the panel; a gate is closed when each reviewer has submitted a per-gate acknowledgment. **No gate's content ships without the gate being closed.**

| #   | Gate                  | Materials reviewed                                                                                                                                     | Expected turnaround |
| --- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| 1   | **Concept**           | One-page project brief, this panel document, the prohibition lists, the six-practice lens framing, the front-matter disclaimer text                    | 10 business days    |
| 2   | **Core Mechanics**    | The resource model spec, the cross-life echo mechanic spec, the bardo UI screen copy, the "no karma→identity" proof from the engine (regression tests) | 10 business days    |
| 3   | **Narrative**         | All 14 event scripts (text only), all 8 ending scripts, the choice graph, the in-event vocabulary lexicon                                              | 15 business days    |
| 4   | **Visual / Audio**    | All character portraits, all background art, all UI iconography, all ambient audio, the typography spec (especially for CJK rendering)                 | 10 business days    |
| 5   | **Economy-UI**        | The full resource-model UI, all in-game copy that frames resources, all tutorial text, the settings screen and any accessibility copy                  | 7 business days     |
| 6   | **Release-Candidate** | The full release-candidate build on the reviewer's device (TestFlight / Play Internal / web URL), with a 30-minute play-through script                 | 10 business days    |

**Per-gate expected turnaround** assumes the materials are deposited complete and the reviewer has been notified by email; turnaround starts on deposit + notification, not on the engineer finishing the work. Reviewers may request one 5-business-day extension per gate without penalty.

If a gate fails (stop-ship triggered), the engineer revises and re-opens the gate. Re-review turnaround is half the original (5, 5, 8, 5, 4, 5 business days respectively).

---

## 6. Compensation, Confidentiality, and Credit

### 6.1 Compensation

- **Flat fee per gate reviewed.** Each of the six gates carries a flat fee, paid on gate close regardless of outcome (pass, stop-ship, or tie). The flat fee is the reviewer's to keep even if the engineer cuts the content the reviewer flagged.
- **Hourly for follow-up.** Re-reviews after stop-ship, ad-hoc clarifying calls requested by the engineer, and release-candidate play-through time beyond 30 minutes are billed hourly at the reviewer's stated rate.
- **Documented in writing before first review.** The exact flat fee, hourly rate, payment schedule (net-30 from gate close), and payment instrument are recorded in `advisory/reviewer-agreements/R{N}-terms.md`, signed (PGP-signed markdown or PDF) **before Gate 1 begins**. No reviewer reviews any material before their terms are signed.
- **Out-of-pocket.** Any out-of-pocket cost the reviewer incurs to review (e.g., device procurement for the release-candidate build) is reimbursed in full on receipt.

Specific fee figures are set by the project principal during recruitment and recorded in the agreements; they are not hardcoded in this template document.

### 6.2 Confidentiality

Reviewers receive pre-release, confidential project materials. Reviewers agree:

- Not to redistribute gate materials outside the panel and the project team
- Not to publish, present, or post about the unreleased content without written permission
- To store materials on password-protected devices under their own institution's data-handling policy

The project agrees:

- Not to use a reviewer's name, affiliation, or words in any public-facing material without that reviewer's separate, explicit consent (see §6.3)
- To anonymize reviewer identity in all internal evidence files (`.omo/evidence/`) unless the reviewer has opted in to being named

### 6.3 Credit

Each reviewer **chooses**, per a written election at sign-on, one of:

- **Named credit** — the reviewer's name and affiliation appear in the game's credits screen, the README, and any public-facing advisory documentation, with the line "served on the cultural-representation advisory panel; does not endorse the project's religious content."
- **Anonymous credit** — the credits screen reads only "With thanks to an external cultural-representation advisory panel" and the reviewer's identity is held privately by the project principal.

The reviewer may change their election at any time before the release-candidate gate closes.

---

## 7. Stop-Ship Escalation Path

The panel exists because harm prevention cannot be fully automated. The escalation paths below cover the three cases the project anticipates.

### 7.1 Reviewer resigns mid-process

If a reviewer resigns before Gate 6 closes, the project principal:

1. Records the resignation in `advisory/recruitment-log.md` with the gate at which the reviewer left.
2. Begins recruitment for a replacement scoped to the same role (R1/R2/R3/R4).
3. **Pauses gate progression.** No further gates close until either the role is filled, or the fallback (§7.2) is invoked. Gates that have already closed stand.
4. The incoming reviewer re-reviews any content from gates that closed during the outgoing reviewer's tenure that falls under the outgoing reviewer's role-specific remit.

### 7.2 Recruitment stalls (fallback)

If, after **six calendar weeks** from project kickoff, fewer than four reviewers are seated, the project invokes the documented fallback:

1. Document the stall in `advisory/recruitment-log.md` (dates, channels contacted, responses received, gaps remaining).
2. **Defer the content waves that depend on panel sign-off** (the narrative, visual/audio, and release-candidate content) to a **post-ship advisory pass**. The engine and non-Buddhist-derived content still ship.
3. **Mark the prototype as "advisory review pending"** in all public-facing materials, including the front-matter disclaimer required at T28, the README, the app store listing copy, and the credits screen.
4. The fallback is a **scope reduction**, not a silent skip. The prototype ships narrower than planned, with the Buddhist-derived content held back until the panel is seated.

### 7.3 Reviewer and engineer disagree on a design (not on a stop-ship)

Disagreement on a non-stop-ship design question (e.g., the engineer believes a reviewer's _advisory_ suggestion would compromise the game's design intent) is mediated as follows:

1. The engineer writes a brief response in `advisory/gate-N-{name}/response.md` explaining the design rationale.
2. The reviewer writes a brief reply in the same file.
3. The **other three reviewers** read both and may add a one-paragraph note each.
4. The engineer makes the final call; the disagreement and the rationale are preserved in the gate record and surfaced again at the next gate.

This applies only to advisory feedback. Unanimous stop-ship (§4.1) is non-negotiable; majority stop-ship (§4.2) follows its own procedure.

---

## Appendix: Scope Boundaries Restated

- The panel reviews **Mahāyāna content only** for this prototype. Theravāda and Vajrayāna content is excluded from the prototype and is not in the panel's remit.
- The panel does **not** endorse the project's religious accuracy. The panel bounds the harm surface.
- The engineer authors the documents; the **user** recruits the reviewers.
- This document is committed to version control and is durable. Evidence files under `.omo/evidence/` are local and are not committed.

**Scholarship referenced (background reading for the team, not for the panel):**

- Jacques Gernet, _Buddhism in Chinese Society: An Economic History from the Fifth to the Tenth Centuries_
- Stanley Weinstein, _Buddhism Under the T'ang_
- Paul Williams, _Mahāyāna Buddhism: The Doctrinal Foundations_
- David McMahan, _The Making of Buddhist Modernism_
- Bhikkhu Bodhi (trans.), _The Connected Discourses of the Buddha_ (used only as a Theravāda reference point to clarify what the prototype does _not_ engage)
- Stanford Encyclopedia of Philosophy entries on Madhyamaka, Yogācāra, and Chinese Buddhism
- Metropolitan Museum of Art Heilbrunn Timeline essays on Tang-dynasty Buddhist art (visual reference for the art-director, not for the panel)
- Museums Association (UK), _Equitable and Inclusive Practice_ principles (https://www.museumsassociation.org/about/ethics/code-of-ethics/equitable-and-inclusive/)
