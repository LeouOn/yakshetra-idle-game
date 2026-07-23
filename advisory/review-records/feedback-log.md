# Advisory Panel — Feedback Log

**Status:** TEMPLATE — append one row per finding as each gate's record is populated. This is the **running cross-gate log**: every finding raised by any reviewer at any gate is mirrored here so the project principal and engineer can see the full harm-surface history at a glance.

**Authoritative source:** [`advisory/panel.md`](../panel.md) §4 (decision rules), §7.3 (advisory disagreement), §6.2 (confidentiality of reviewer identity).
**Plan reference:** T32 acceptance criterion — "Feedback log documents every concern raised and how it was addressed."

---

## How to use this log

1. **One row per finding.** When a reviewer raises a finding in a gate record (`gate-N-*.md`), add a row here in the same edit.
2. **Status lifecycle:** `OPEN` → `RESOLVED` or `DEFERRED-TO-NEXT-GATE` or `CUT` or `WONT-FIX-WITH-RATIONALE`. Only `RESOLVED` and `CUT` close a finding.
3. **Unanimous stop-ship findings (§4.1) are always `CUT`** — there is no override. Mark them `CUT` immediately; the gate record holds the detail.
4. **Majority stop-ship with §4.2b deferral** is marked `DEFERRED-TO-NEXT-GATE` until the next gate re-reviews; then it becomes `RESOLVED` or `CUT`.
5. **Confidentiality (§6.2):** reviewer identity in this log is anonymized to role (R1/R2/R3/R4). The reviewer's actual name lives only in `advisory/reviewer-agreements/R{N}-terms.md`, held by the project principal. If the reviewer elected named credit (§6.3), the name may appear in public-facing materials but **not** in this internal log unless separately consented.
6. **Severity mapping:** `UNANIMOUS-STOP-SHIP` (§4.1) > `MAJORITY-STOP-SHIP` (§4.2) > `ADVISORY` (§7.3, non-binding).

---

## Summary dashboard

Updated as the log grows. Used to answer the T32 acceptance criterion "0 unresolved severe findings."

| Severity                | Total raised | RESOLVED | CUT | DEFERRED | OPEN |
| ----------------------- | ------------ | -------- | --- | -------- | ---- |
| UNANIMOUS-STOP-SHIP     | `[0]`        | n/a      | `[0]` | n/a      | `[0]` |
| MAJORITY-STOP-SHIP      | `[0]`        | `[0]`    | `[0]` | `[0]`    | `[0]` |
| ADVISORY                | `[0]`        | `[0]`    | n/a  | n/a      | `[0]` |

**Ship gate (T32 acceptance):** the prototype may not ship while any row is `OPEN` at severity `UNANIMOUS-STOP-SHIP` or `MAJORITY-STOP-SHIP`. Advisory `OPEN` findings may ship (they are non-binding) but are surfaced to the user before ship.

---

## Log entries

Each row: date raised, gate, reviewer role, severity, trigger (if any), finding summary, affected material, resolution path, status, date closed, link to full record.

| #   | Date raised   | Gate | Reviewer | Severity                | Trigger  | Finding summary                  | Affected material     | Resolution path           | Status      | Date closed   | Full record |
| --- | ------------- | ---- | -------- | ----------------------- | -------- | -------------------------------- | --------------------- | ------------------------- | ----------- | ------------- | ----------- |
| 1   | `[YYYY-MM-DD]` | `[G1-G6]` | `[R1-R4]` | `[UNANIMOUS / MAJORITY / ADVISORY]` | `[§4.1._ / §4.2 / n/a]` | `[FINDING_SUMMARY]` | `[MATERIAL_REF]` | `[CUT / REWRITE / RESPONSE / ACCEPTED / DECLINED]` | `[OPEN / RESOLVED / DEFERRED / CUT / WONT-FIX]` | `[YYYY-MM-DD or —]` | `[gate-N-*.md#finding-ref]` |
| 2   | `[...]`        | `[...]` | `[...]`   | `[...]`                 | `[...]`  | `[...]`                          | `[...]`               | `[...]`                   | `[...]`     | `[...]`        | `[...]`     |

<!-- Append new rows below row 2 as findings are raised. Do not delete or edit historical rows — add a corrective row referencing the original if a finding is re-classified. -->

---

## Cross-gate deferrals

Findings deferred under §4.2b (majority stop-ship with engineer written response) are re-reviewed at the **next gate**. This section tracks the deferral chain so nothing falls through.

| Finding # | Original gate | Deferred to gate | Re-review outcome | Date resolved |
| ---------- | ------------- | ---------------- | ----------------- | ------------- |
| `[N]`      | `[G1-G5]`     | `[G2-G6]`        | `[PENDING / REAFFIRMED-3of4 → CUT / OVERTURNED → RESOLVED]` | `[YYYY-MM-DD or —]` |

> Note: deferral to next gate is only available at Gates 1–5. Gate 6 (release-candidate) has no next gate; a majority stop-ship at Gate 6 must be resolved by revise-and-reopen (§4.2a) or cut.

---

## Confidentiality reminder

Per panel.md §6.2, the project agrees "to anonymize reviewer identity in all internal evidence files (`.omo/evidence/`) unless the reviewer has opted in to being named." This log is committed to version control and is therefore **internal-but-durable**; the anonymization rule applies here as well. Use role labels (R1/R2/R3/R4), not names.

---

## Cross-references

- [`advisory/panel.md`](../panel.md) — authoritative source for §4 decision rules and §6.2 confidentiality
- Per-gate records (where each finding's full text lives):
  - [`gate-1-concept.md`](gate-1-concept.md)
  - [`gate-2-core-mechanics.md`](gate-2-core-mechanics.md)
  - [`gate-3-narrative.md`](gate-3-narrative.md)
  - [`gate-4-visual-audio.md`](gate-4-visual-audio.md)
  - [`gate-5-economy-ui.md`](gate-5-economy-ui.md)
  - [`gate-6-release-candidate.md`](gate-6-release-candidate.md)
- [`recruitment-log.md`](../recruitment-log.md) — panel seating status (a finding from a vacant role is impossible; if a role is vacant, gate progression is paused per §7.1)
- [`reviewer-agreements/`](../reviewer-agreements/) — the only place reviewer names are recorded
