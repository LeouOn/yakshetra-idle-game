# Gate 5: Economy-UI — Review Record

**Status:** TEMPLATE — populate on gate open. No reviewer names appear until agreements are signed.
**Authoritative source:** [`advisory/panel.md`](../panel.md) §5 (gate materials), §4 (decision rules), §2 (panel composition).
**Plan reference:** T32 in `.omo/plans/buddhist-inspired-incremental-rpg.md`.

---

## Gate metadata

| Field                                         | Value                                                                                                          |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Gate number                                   | 5                                                                                                              |
| Gate name                                     | Economy-UI                                                                                                     |
| Date opened (deposit + notification)          | `[DATE_OPENED_YYYY-MM-DD]`                                                                                     |
| Date closed                                   | `[DATE_CLOSED_YYYY-MM-DD]`                                                                                     |
| Expected turnaround                           | 7 business days (panel.md §5 — **shortest** gate; UI copy surface is bounded)                                  |
| Extension used?                               | `[NONE / ONE-5BD-EXTENSION-TO_YYYY-MM-DD]`                                                                     |
| Re-review?                                    | `[NO / ROUND_n — prior record: gate-5-economy-ui.round-(n-1).md]`                                              |
| Materials deposit path                        | `advisory/gate-5-economy-ui/`                                                                                  |

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

Deposited in `advisory/gate-5-economy-ui/` per panel.md §5 row 5. Economy-UI gate materials:

- `[ ]` Full resource-model UI (`advisory/gate-5-economy-ui/resource-ui.md` + screenshots/mockups) — every screen where a resource is shown, spent, or gained
- `[ ]` All in-game copy that frames resources (`advisory/gate-5-economy-ui/resource-copy.md`) — the strings that name and describe time, attention, relationships, and any other mundane resource
- `[ ]` Six-practice lens UI (`advisory/gate-5-economy-ui/lens-ui.md`) — the framing screen that names six generic contemplative patterns (no canonical names); copy + interaction flow
- `[ ]` Bardo between-lives UI (`advisory/gate-5-economy-ui/bardo-ui.md`) — copy + interaction flow for the between-lives screen (textual; no visual depictions, per panel.md §3)
- `[ ]` All tutorial text (`advisory/gate-5-economy-ui/tutorial.md`) — onboarding copy the player reads
- `[ ]` Settings screen and accessibility copy (`advisory/gate-5-economy-ui/settings.md`)

Also carried forward for re-review if contested at Gate 4: `[LIST_ANY_GATE_4_CONTESTED_MATERIAL_OR_NONE]`.

---

## Scope of this gate

The Economy-UI gate verifies that the **framing of resources in UI copy does not smuggle in a spiritual currency** — the project's prohibition on a karma meter, merit currency, enlightenment score, or enlightenment win-state (panel.md §1) must hold at the UI-text layer, not only at the engine layer (which was proven at Gate 2). Reviewers assess:

- Does any UI copy frame a mundane resource (time, attention, relationships) as if it were **merit, karma, or spiritual progress**? (§4.1.3 / §4.1.4 if doctrinal)
- Does the six-practice lens UI present the six patterns as a **doctrinal taxonomy** rather than as generic contemplative patterns with no canonical names? (§4.1.4)
- Does the bardo UI copy present the between-lives screen as a **canonical judgment** or doctrinally authoritative transition, rather than as a fictional narrative device? (§4.1.4)
- Does any tutorial or settings copy inadvertently introduce a **karma → identity framing** in how it teaches the cross-life echo? (§4.1.3)

Per-reviewer remit at this gate:

- **R1** assesses whether any Tang-era milieu vocabulary in UI copy (resource names, lens names) is historically plausible and not flattening.
- **R2** assesses whether any UI copy line could be read as a false doctrinal assertion — especially the lens UI and bardo UI copy, which sit closest to doctrinal framing.
- **R3** assesses whether resource framing or tutorial copy exoticizes or stereotypes.
- **R4** assesses whether the bardo UI and lens UI read as respectful to a lay household, or as a doctrinal intrusion the household would object to.

Explicitly **out of scope** (panel.md §3): UI/UX usability, information architecture, accessibility WCAG compliance (covered by separate accessibility QA), fun.

---

## Applicable stop-ship triggers

The Economy-UI gate is a **co-primary gate for §4.1.3 (karma → identity framing in UI)** and a likely gate for **§4.1.4 (doctrinal framing in lens/bardo UI copy)**. All four unanimous triggers are checked:

| #   | Unanimous trigger (§4.1)                                                                                                                                       | Applicability at Gate 5                                              | Raised by any reviewer? |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------- |
| 4.1.1 | A named sacred figure is depicted against the prohibition list                                                                                                | Unlikely (no figures in UI copy; checked at Gate 4 if any art reuses) | `[YES/NO]`              |
| 4.1.2 | Restricted tantric material is included                                                                                                                        | Unlikely (no tantric content in UI)                                   | `[YES/NO]`              |
| 4.1.3 | A karma → social-identity mechanic is present (including **UI framing** of mundane resources as karma/merit)                                                  | **CO-PRIMARY** — UI copy under review                                 | `[YES/NO]`              |
| 4.1.4 | A false doctrinal claim is presented as canonical (especially **lens UI and bardo UI copy**)                                                                  | **LIKELY** — lens/bardo copy closest to doctrinal framing              | `[YES/NO]`              |

Majority stop-ship (§4.2) and tie (§4.3) apply to tone-deaf UI copy, appropriative resource names, exoticizing tutorial framing.

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
- Affected material: `[UI_SURFACE — e.g. lens-ui.md §2, line "the six lenses are..."]`
- Suggested resolution: `[RESOLUTION_TEXT]`

#### R2 — `[R2_NAME]`
- Finding class: `[NONE / ADVISORY / MAJORITY-STOP-SHIP / UNANIMOUS-STOP-SHIP]`
- Trigger cited (if any): `[§4.1.1 / §4.1.2 / §4.1.3 / §4.1.4 / §4.2]`
- Finding text: `[FINDING_TEXT]`
- Affected material: `[UI_SURFACE]`
- Suggested resolution: `[RESOLUTION_TEXT]`

#### R3 — `[R3_NAME]`
- Finding class: `[NONE / ADVISORY / MAJORITY-STOP-SHIP / UNANIMOUS-STOP-SHIP]`
- Trigger cited (if any): `[§4.1.1 / §4.1.2 / §4.1.3 / §4.1.4 / §4.2]`
- Finding text: `[FINDING_TEXT]`
- Affected material: `[UI_SURFACE]`
- Suggested resolution: `[RESOLUTION_TEXT]`

#### R4 — `[R4_NAME]`
- Finding class: `[NONE / ADVISORY / MAJORITY-STOP-SHIP / UNANIMOUS-STOP-SHIP]`
- Trigger cited (if any): `[§4.1.1 / §4.1.2 / §4.1.3 / §4.1.4 / §4.2]`
- Finding text: `[FINDING_TEXT]`
- Affected material: `[UI_SURFACE]`
- Suggested resolution: `[RESOLUTION_TEXT]`

---

## Resolutions

For each finding above, the engineer records the resolution path here. See panel.md §4.2 (majority), §7.3 (advisory disagreement). Unanimous stop-ship (§4.1) has **no override** — the triggering copy is cut or rewritten.

| Finding ref | Resolution path | Disposition |
| ----------- | --------------- | ----------- |
| `[R1-001]`  | `[CUT / REWRITE-AND-RESUBMIT / WRITTEN-RESPONSE-APPENDED / ADVISORY-ACCEPTED / ADVISORY-DECLINED-WITH-RATIONALE]` | `[DETAIL]` |
| `[R2-001]`  | `[...]` | `[...]` |
| `[R3-001]`  | `[...]` | `[...]` |
| `[R4-001]`  | `[...]` | `[...]` |

If any finding is a written-response majority stop-ship (§4.2b), the response is appended below and the **next gate** (Gate 6: Release-Candidate) re-reviews the contested content.

### Written responses (if any)

`[APPEND_ENGINEER_RESPONSE_HERE_OR_WRITE_NONE]`

---

## Outcome

- Gate result: `[PASS / STOP-SHIP-UNANIMOUS / STOP-SHIP-MAJORITY / TIE-2-2 / RE-REVIEW-REQUIRED]`
- Unanimous stop-ship triggered? `[NO / YES — trigger §4.1._]`
- If majority stop-ship and engineer elects §4.2b: contested content re-reviewed at Gate 6.
- Next action: `[advance to Gate 6 / revise & re-open Gate 5 / escalate per §7]`
- Re-review scheduled for: `[DATE_OR_NA]`
- Re-review turnaround (if applicable): 4 business days (panel.md §5: half of original 7, rounded up).

---

## Signatures

All four reviewers must sign before the gate is closed. panel.md §5: "No gate's content ships without the gate being closed." Signature = PGP-signed markdown commit OR signed PDF deposited at `advisory/review-records/signatures/gate-5-[date]/`.

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
- [`feedback-log.md`](feedback-log.md) — running log (mirror each finding above into a row)
- [`recruitment-log.md`](../recruitment-log.md) — panel seating status
- Prior gate: [`gate-4-visual-audio.md`](gate-4-visual-audio.md)
- Next gate: [`gate-6-release-candidate.md`](gate-6-release-candidate.md)
- Engine-layer proof of no-karma-identity (UI must not contradict this): Gate 2 record — [`gate-2-core-mechanics.md`](gate-2-core-mechanics.md)
