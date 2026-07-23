# Gate 6: Release-Candidate — Review Record

**Status:** TEMPLATE — populate on gate open. No reviewer names appear until agreements are signed.
**Authoritative source:** [`advisory/panel.md`](../panel.md) §5 (gate materials), §4 (decision rules), §2 (panel composition).
**Plan reference:** T32 in `.omo/plans/buddhist-inspired-incremental-rpg.md`.

---

## Gate metadata

| Field                                         | Value                                                                                                          |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Gate number                                   | 6                                                                                                              |
| Gate name                                     | Release-Candidate                                                                                              |
| Date opened (deposit + notification)          | `[DATE_OPENED_YYYY-MM-DD]`                                                                                     |
| Date closed                                   | `[DATE_CLOSED_YYYY-MM-DD]`                                                                                     |
| Expected turnaround                           | 10 business days (panel.md §5)                                                                                 |
| Extension used?                               | `[NONE / ONE-5BD-EXTENSION-TO_YYYY-MM-DD]`                                                                     |
| Re-review?                                    | `[NO / ROUND_n — prior record: gate-6-release-candidate.round-(n-1).md]`                                       |
| Materials deposit path                        | `advisory/gate-6-release-candidate/`                                                                           |
| Build reference                               | `[BUILD_HASH / VERSION_TAG — from T31]`                                                                        |

> **This is the final gate.** No content ships until Gate 6 closes (panel.md §5). All five prior gates must be closed before Gate 6 opens.

---

## Reviewers

Per `panel.md` §2, all four reviewers review the same artifact set; division of labor is not permitted.

| Role                                                                                           | Name         | Agreement on file                                              | Submitted          |
| ---------------------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------- | ------------------ |
| R1 — East Asian Mahāyāna scholar-practitioner (Tang-era familiarity preferred)                 | `[R1_NAME]`  | [`R1-terms.md`](../reviewer-agreements/R1-terms.md)            | `[YES/NO/DATE]`    |
| R2 — Buddhist-studies academic (Mahāyāna research focus)                                       | `[R2_NAME]`  | [`R2-terms.md`](../reviewer-agreements/R2-terms.md)            | `[YES/NO/DATE]`    |
| R3 — Cultural-representation specialist (Chinese diaspora representation expertise)             | `[R3_NAME]`  | [`R3-terms.md`](../reviewer-agreements/R3-terms.md)            | `[YES/NO/DATE]`    |
| R4 — Lay Mahāyāna community member                                                             | `[R4_NAME]`  | [`R4-terms.md`](../reviewer-agreements/R4-terms.md)            | `[YES/NO/DATE]`    |

A reviewer who has not yet signed their terms **may not review any material** (panel.md §6.1).

---

## Materials reviewed

Deposited in `advisory/gate-6-release-candidate/` per panel.md §5 row 6. Release-candidate gate materials — **the integrated build, not individual artifacts**:

- `[ ]` Release-candidate build on the reviewer's device, distributed via:
  - `[ ]` TestFlight (iOS) — `[BUILD_NUMBER / INVITATION_CODE]`
  - `[ ]` Play Internal (Android) — `[TRACK_URL]`
  - `[ ]` Web URL — `[URL]`
- `[ ]` 30-minute play-through script (`advisory/gate-6-release-candidate/playthrough-script.md`) — a guided path through the build that exercises Life 1, the bardo, Life 2, the six-practice lens UI, and at least 3 of the 8 endings
- `[ ]` Build manifest (`advisory/gate-6-release-candidate/build-manifest.txt`) — the version, commit hash, and platform build identifiers, cross-referenced to T31 evidence
- `[ ]` Front-matter disclaimer as it appears **in the running build** (not as a text file — the actual first-launch screen the player sees)

Per panel.md §6.1, any play-through time **beyond 30 minutes** is billed hourly at the reviewer's stated rate; the playthrough-script is scoped to fit within the flat-fee 30 minutes.

Also carried forward for re-review if contested at Gate 5: `[LIST_ANY_GATE_5_CONTESTED_MATERIAL_OR_NONE]`.

---

## Scope of this gate

The Release-Candidate gate is the **end-to-end playtest** — the only gate where reviewers experience the project as a player would, with all systems integrated. This is the gate where emergent harms surface: a UI flow that reads inoffensively line-by-line (Gates 3 and 5) can become offensive when the player encounters it in sequence; a visual that passed in isolation (Gate 4) can become devotional in context. Reviewers assess the build against:

- Does any **emergent** combination of text, visual, and UI produce a unanimous stop-ship trigger that the per-gate reviews missed? (§4.1)
- Does the front-matter disclaimer still read as **adequate** now that the full content is playable? (panel.md §3)
- Do the six-practice lens UI, the bardo UI, and the resource-model UI read as intended **in the play flow**, or does the flow itself create a doctrinal framing? (§4.1.4)
- Does the cross-life echo, experienced as a player rather than read as a spec, land as a **fictional narrative device** or as a rebirth claim? (§4.1.3 / §4.1.4)

Per-reviewer remit at this gate:

- **R1** plays through and assesses whether the Tang Life 1 setting holds together historically in the integrated experience.
- **R2** plays through and assesses whether any emergent doctrinal assertion surfaces; this is the highest-effort review at this gate.
- **R3** plays through and assesses whether the integrated experience stereotypes or exoticizes.
- **R4** plays through and assesses whether a practicing lay household member playing this build would feel respected.

Explicitly **out of scope** (panel.md §3): playtest fun/balance/pacing (covered by T33 human playtest), crash bugs and performance (covered by engineering QA), accessibility compliance (covered by separate accessibility QA).

---

## Applicable stop-ship triggers

The Release-Candidate gate is the **integration gate** — all four unanimous triggers apply to emergent combinations, and this is the last chance to catch a harm before ship. All four are checked against the played-through build:

| #   | Unanimous trigger (§4.1)                                                                                                                                       | Applicability at Gate 6                                | Raised by any reviewer? |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------- |
| 4.1.1 | A named sacred figure is depicted against the prohibition list (including emergent depiction via text + visual + UI combination)                              | **INTEGRATION CHECK** — emergent forms surface here     | `[YES/NO]`              |
| 4.1.2 | Restricted tantric material is included (including emergent tantric framing)                                                                                   | **INTEGRATION CHECK**                                   | `[YES/NO]`              |
| 4.1.3 | A karma → social-identity mechanic is present (including emergent framing via cross-life echo + resource UI)                                                  | **INTEGRATION CHECK** — the echo experienced in play    | `[YES/NO]`              |
| 4.1.4 | A false doctrinal claim is presented as canonical (including emergent doctrinal framing via sequence)                                                         | **INTEGRATION CHECK** — sequence can assert doctrine    | `[YES/NO]`              |

Majority stop-ship (§4.2) and tie (§4.3) apply to any emergent representation harm.

> **Note on §4.2b at Gate 6.** Because Gate 6 is the final gate, a written-response majority stop-ship here has **no "next gate" to re-review at**. The engineer must instead revise and re-open Gate 6 (§4.2a), or cut the content. The §4.2b deferral path is only available at Gates 1–5.

---

## Findings

### Summary tally

| Finding class                             | R1 | R2 | R3 | R4 | Tally |
| ----------------------------------------- | -- | -- | -- | -- | ----- |
| Unanimous stop-ship trigger raised (§4.1) |    |    |    |    |       |
| Majority stop-ship raised (§4.2)          |    |    |    |    |       |
| Advisory (non-binding, panel.md §7.3)     |    |    |    |    |       |
| No finding                                |    |    |    |    |       |

### Per-reviewer findings

#### R1 — `[R1_NAME]`
- Finding class: `[NONE / ADVISORY / MAJORITY-STOP-SHIP / UNANIMOUS-STOP-SHIP]`
- Trigger cited (if any): `[§4.1.1 / §4.1.2 / §4.1.3 / §4.1.4 / §4.2]`
- Finding text: `[FINDING_TEXT]`
- Affected material: `[PLAYTHROUGH_MOMENT — e.g. "Life 1 event 4, after the lens selection, the combined read is..."]`
- Suggested resolution: `[RESOLUTION_TEXT]`

#### R2 — `[R2_NAME]`
- Finding class: `[NONE / ADVISORY / MAJORITY-STOP-SHIP / UNANIMOUS-STOP-SHIP]`
- Trigger cited (if any): `[§4.1.1 / §4.1.2 / §4.1.3 / §4.1.4 / §4.2]`
- Finding text: `[FINDING_TEXT]`
- Affected material: `[PLAYTHROUGH_MOMENT]`
- Suggested resolution: `[RESOLUTION_TEXT]`

#### R3 — `[R3_NAME]`
- Finding class: `[NONE / ADVISORY / MAJORITY-STOP-SHIP / UNANIMOUS-STOP-SHIP]`
- Trigger cited (if any): `[§4.1.1 / §4.1.2 / §4.1.3 / §4.1.4 / §4.2]`
- Finding text: `[FINDING_TEXT]`
- Affected material: `[PLAYTHROUGH_MOMENT]`
- Suggested resolution: `[RESOLUTION_TEXT]`

#### R4 — `[R4_NAME]`
- Finding class: `[NONE / ADVISORY / MAJORITY-STOP-SHIP / UNANIMOUS-STOP-SHIP]`
- Trigger cited (if any): `[§4.1.1 / §4.1.2 / §4.1.3 / §4.1.4 / §4.2]`
- Finding text: `[FINDING_TEXT]`
- Affected material: `[PLAYTHROUGH_MOMENT]`
- Suggested resolution: `[RESOLUTION_TEXT]`

---

## Resolutions

For each finding above, the engineer records the resolution path here. See panel.md §4.2 (majority), §7.3 (advisory disagreement). Unanimous stop-ship (§4.1) has **no override** — the triggering content is cut. At Gate 6, the §4.2b deferral path is **not available**; the engineer must revise and re-open (§4.2a) or cut.

| Finding ref | Resolution path | Disposition |
| ----------- | --------------- | ----------- |
| `[R1-001]`  | `[CUT / REWRITE-AND-RESUBMIT / ADVISORY-ACCEPTED / ADVISORY-DECLINED-WITH-RATIONALE]` | `[DETAIL]` |
| `[R2-001]`  | `[...]` | `[...]` |
| `[R3-001]`  | `[...]` | `[...]` |
| `[R4-001]`  | `[...]` | `[...]` |

### Written responses (if any)

`[APPEND_ENGINEER_RESPONSE_HERE_OR_WRITE_NONE]`

---

## Outcome

- Gate result: `[PASS / STOP-SHIP-UNANIMOUS / STOP-SHIP-MAJORITY / TIE-2-2 / RE-REVIEW-REQUIRED]`
- Unanimous stop-ship triggered? `[NO / YES — trigger §4.1._]`
- **Ship readiness:** `[READY-TO-SHIP / NOT-READY — see finding refs above]`
- Next action: `[SHIP / revise & re-open Gate 6 / escalate per §7]`
- Re-review scheduled for: `[DATE_OR_NA]`
- Re-review turnaround (if applicable): 5 business days (panel.md §5: half of original 10).

---

## Signatures

All four reviewers must sign before the gate is closed. panel.md §5: "No gate's content ships without the gate being closed." This is the **final sign-off** — closure of Gate 6 authorizes ship. Signature = PGP-signed markdown commit OR signed PDF deposited at `advisory/review-records/signatures/gate-6-[date]/`.

| Reviewer         | Signature              | Date          |
| ---------------- | ---------------------- | ------------- |
| R1 — `[R1_NAME]` | `[SIGNATURE_OR_HASH]`  | `[YYYY-MM-DD]` |
| R2 — `[R2_NAME]` | `[SIGNATURE_OR_HASH]`  | `[YYYY-MM-DD]` |
| R3 — `[R3_NAME]` | `[SIGNATURE_OR_HASH]`  | `[YYYY-MM-DD]` |
| R4 — `[R4_NAME]` | `[SIGNATURE_OR_HASH]`  | `[YYYY-MM-DD]` |

Engineer acknowledgment (non-voting):

| Engineer          | Acknowledgment | Date          |
| ----------------- | -------------- | ------------- |
| `[ENGINEER_NAME]` | `[ACK]`        | `[YYYY-MM-DD]` |

---

## Cross-references

- [`advisory/panel.md`](../panel.md) — authoritative source
- [`advisory/prohibited-names.txt`](../prohibited-names.txt) — closed list referenced by §4.1.1
- [`feedback-log.md`](feedback-log.md) — running log (mirror each finding above into a row; this is the final gate so the log should be complete after Gate 6 closes)
- [`recruitment-log.md`](../recruitment-log.md) — panel seating status
- Prior gate: [`gate-5-economy-ui.md`](gate-5-economy-ui.md)
- Prior gates (all must be closed before Gate 6 opens): [`gate-1-concept.md`](gate-1-concept.md), [`gate-2-core-mechanics.md`](gate-2-core-mechanics.md), [`gate-3-narrative.md`](gate-3-narrative.md), [`gate-4-visual-audio.md`](gate-4-visual-audio.md), [`gate-5-economy-ui.md`](gate-5-economy-ui.md)
- Build provenance: T31 cross-platform preview builds (`.omo/evidence/task-31-builds/`)
- Human playtest (separate from advisory; runs in parallel): T33
