# Gate 2: Core Mechanics — Review Record

**Status:** TEMPLATE — populate on gate open. No reviewer names appear until agreements are signed.
**Authoritative source:** [`advisory/panel.md`](../panel.md) §5 (gate materials), §4 (decision rules), §2 (panel composition).
**Plan reference:** T32 in `.omo/plans/buddhist-inspired-incremental-rpg.md`.

---

## Gate metadata

| Field                                         | Value                                                                                                          |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Gate number                                   | 2                                                                                                              |
| Gate name                                     | Core Mechanics                                                                                                 |
| Date opened (deposit + notification)          | `[DATE_OPENED_YYYY-MM-DD]`                                                                                     |
| Date closed                                   | `[DATE_CLOSED_YYYY-MM-DD]`                                                                                     |
| Expected turnaround                           | 10 business days (panel.md §5)                                                                                 |
| Extension used?                               | `[NONE / ONE-5BD-EXTENSION-TO_YYYY-MM-DD]`                                                                     |
| Re-review?                                    | `[NO / ROUND_n — prior record: gate-2-core-mechanics.round-(n-1).md]`                                          |
| Materials deposit path                        | `advisory/gate-2-core-mechanics/`                                                                              |

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

Deposited in `advisory/gate-2-core-mechanics/` per panel.md §5 row 2. Core-mechanics-gate materials:

- `[ ]` Resource model spec (`advisory/gate-2-core-mechanics/resource-model.md`) — the mundane-resource econometrics (time, attention, relationships) and how they are framed
- `[ ]` Cross-life echo mechanic spec (`advisory/gate-2-core-mechanics/cross-life-echo.md`) — how Life 1 choices are echoed thematically in Life 2 (fictional narrative device, not a rebirth claim)
- `[ ]` Bardo between-lives UI screen copy (`advisory/gate-2-core-mechanics/bardo-ui.md`) — textual only, no visual depictions
- `[ ]` "No karma → identity" proof from the engine (`advisory/gate-2-core-mechanics/no-karma-identity-proof.md`) — the regression-test suite demonstrating no mechanic encodes "past-life conduct → present-life caste/class/identity"

Also carried forward for re-review if contested at Gate 1: `[LIST_ANY_GATE_1_CONTESTED_MATERIAL_OR_NONE]`.

---

## Scope of this gate

The Core Mechanics gate verifies that the **engine's mechanics do not encode or imply** any canonical karma/merit/rebirth claim. This is the gate where the single most dangerous misreading the project could produce — a karma → social-identity mechanic (panel.md §4.1.3) — is fenced off absolutely. Reviewers confirm:

1. The resource model is framed as **mundane** (time, attention, relationships), with **no karma meter, no merit currency, no enlightenment score, no enlightenment win-state** (panel.md §1).
2. The cross-life echo is a **fictional narrative device**, not a probabilistic reincarnation mechanic and not a claim about rebirth.
3. The bardo UI copy is **textual** and does not depict the bardo as a canonical judgment or transitional state with doctrinal authority.
4. The regression-test suite **proves** the absence of a karma → identity mechanic, and the proof is legible to non-engineer reviewers.

Per-reviewer remit at this gate:

- **R1** assesses whether Tang-era milieu vocabulary in mechanic/UI copy is historically plausible.
- **R2** assesses whether any mechanic could be read as a false doctrinal assertion about karma, rebirth, or emptiness (§4.1.4) — the most likely unanimous trigger at this gate.
- **R3** assesses whether resource or echo framing exoticizes or stereotypes.
- **R4** assesses whether the bardo UI and cross-life echo read as respectful to a lay household, or as a doctrinal claim the household would object to.

Explicitly **out of scope** (panel.md §3): game-design feel, difficulty tuning, technical architecture quality (covered by engineering QA), monetization.

---

## Applicable stop-ship triggers

The Core Mechanics gate is the **primary gate for §4.1.3 (karma → identity)** and a likely gate for **§4.1.4 (false doctrinal claim)**. All four unanimous triggers are checked:

| #   | Unanimous trigger (§4.1)                                                                                                                                       | Applicability at Gate 2                  | Raised by any reviewer? |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ----------------------- |
| 4.1.1 | A named sacred figure is depicted against the prohibition list                                                                                                | Unlikely (no figures in mechanics)        | `[YES/NO]`              |
| 4.1.2 | Restricted tantric material is included                                                                                                                        | Unlikely (no tantric content in MVP)      | `[YES/NO]`              |
| 4.1.3 | A karma → social-identity mechanic is present                                                                                                                  | **PRIMARY** — regression proof must hold  | `[YES/NO]`              |
| 4.1.4 | A false doctrinal claim is presented as canonical                                                                                                              | **LIKELY** — mechanic/UI copy under review | `[YES/NO]`              |

Majority stop-ship (§4.2) and tie (§4.3) apply to other representation harms (e.g., appropriative vocabulary in mechanic names).

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
- Affected material: `[MATERIAL_REFERENCE — e.g. resource-model.md §3]`
- Suggested resolution: `[RESOLUTION_TEXT]`

#### R2 — `[R2_NAME]`
- Finding class: `[NONE / ADVISORY / MAJORITY-STOP-SHIP / UNANIMOUS-STOP-SHIP]`
- Trigger cited (if any): `[§4.1.1 / §4.1.2 / §4.1.3 / §4.1.4 / §4.2]`
- Finding text: `[FINDING_TEXT]`
- Affected material: `[MATERIAL_REFERENCE]`
- Suggested resolution: `[RESOLUTION_TEXT]`

#### R3 — `[R3_NAME]`
- Finding class: `[NONE / ADVISORY / MAJORITY-STOP-SHIP / UNANIMOUS-STOP-SHIP]`
- Trigger cited (if any): `[§4.1.1 / §4.1.2 / §4.1.3 / §4.1.4 / §4.2]`
- Finding text: `[FINDING_TEXT]`
- Affected material: `[MATERIAL_REFERENCE]`
- Suggested resolution: `[RESOLUTION_TEXT]`

#### R4 — `[R4_NAME]`
- Finding class: `[NONE / ADVISORY / MAJORITY-STOP-SHIP / UNANIMOUS-STOP-SHIP]`
- Trigger cited (if any): `[§4.1.1 / §4.1.2 / §4.1.3 / §4.1.4 / §4.2]`
- Finding text: `[FINDING_TEXT]`
- Affected material: `[MATERIAL_REFERENCE]`
- Suggested resolution: `[RESOLUTION_TEXT]`

---

## Resolutions

For each finding above, the engineer records the resolution path here. See panel.md §4.2 (majority), §7.3 (advisory disagreement). Unanimous stop-ship (§4.1) has **no override** — the triggering content is cut.

| Finding ref | Resolution path | Disposition |
| ----------- | --------------- | ----------- |
| `[R1-001]`  | `[CUT / REWRITE-AND-RESUBMIT / WRITTEN-RESPONSE-APPENDED / ADVISORY-ACCEPTED / ADVISORY-DECLINED-WITH-RATIONALE]` | `[DETAIL]` |
| `[R2-001]`  | `[...]` | `[...]` |
| `[R3-001]`  | `[...]` | `[...]` |
| `[R4-001]`  | `[...]` | `[...]` |

If any finding is a written-response majority stop-ship (§4.2b), the response is appended below and the **next gate** (Gate 3: Narrative) re-reviews the contested content.

### Written responses (if any)

`[APPEND_ENGINEER_RESPONSE_HERE_OR_WRITE_NONE]`

---

## Outcome

- Gate result: `[PASS / STOP-SHIP-UNANIMOUS / STOP-SHIP-MAJORITY / TIE-2-2 / RE-REVIEW-REQUIRED]`
- Unanimous stop-ship triggered? `[NO / YES — trigger §4.1._]`
- If majority stop-ship and engineer elects §4.2b: contested content re-reviewed at Gate 3.
- Next action: `[advance to Gate 3 / revise & re-open Gate 2 / escalate per §7]`
- Re-review scheduled for: `[DATE_OR_NA]`
- Re-review turnaround (if applicable): 5 business days (panel.md §5: half of original 10).

---

## Signatures

All four reviewers must sign before the gate is closed. panel.md §5: "No gate's content ships without the gate being closed." Signature = PGP-signed markdown commit OR signed PDF deposited at `advisory/review-records/signatures/gate-2-[date]/`.

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
- Prior gate: [`gate-1-concept.md`](gate-1-concept.md)
- Next gate: [`gate-3-narrative.md`](gate-3-narrative.md)
- Engine regression tests for the no-karma-identity proof: `src/engine/__tests__/` (visible-karma, karma-meter, donation-offset suites)
