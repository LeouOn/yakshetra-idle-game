# Gate 4: Visual / Audio — Review Record

**Status:** TEMPLATE — populate on gate open. No reviewer names appear until agreements are signed.
**Authoritative source:** [`advisory/panel.md`](../panel.md) §5 (gate materials), §4 (decision rules), §2 (panel composition).
**Plan reference:** T32 in `.omo/plans/buddhist-inspired-incremental-rpg.md`.

---

## Gate metadata

| Field                                         | Value                                                                                                          |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Gate number                                   | 4                                                                                                              |
| Gate name                                     | Visual / Audio                                                                                                 |
| Date opened (deposit + notification)          | `[DATE_OPENED_YYYY-MM-DD]`                                                                                     |
| Date closed                                   | `[DATE_CLOSED_YYYY-MM-DD]`                                                                                     |
| Expected turnaround                           | 10 business days (panel.md §5)                                                                                 |
| Extension used?                               | `[NONE / ONE-5BD-EXTENSION-TO_YYYY-MM-DD]`                                                                     |
| Re-review?                                    | `[NO / ROUND_n — prior record: gate-4-visual-audio.round-(n-1).md]`                                            |
| Materials deposit path                        | `advisory/gate-4-visual-audio/`                                                                                |

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

Deposited in `advisory/gate-4-visual-audio/` per panel.md §5 row 4. Visual / audio gate materials:

- `[ ]` All character portraits (`advisory/gate-4-visual-audio/art/portraits/`) — every character the player sees depicted
- `[ ]` All background art (`advisory/gate-4-visual-audio/art/backgrounds/`) — every scene background
- `[ ]` All UI iconography (`advisory/gate-4-visual-audio/art/icons/`) — every in-game icon
- `[ ]` All ambient audio (`advisory/gate-4-visual-audio/audio/`) — the MVP has minimal audio per plan T30; any audio present is reviewed
- `[ ]` Typography spec (`advisory/gate-4-visual-audio/typography.md`) — **especially CJK rendering** (Chinese-character font choice, fallback chains, diacritic handling for Sanskrit transliteration)
- `[ ]` Permitted-imagery lists (`advisory/gate-4-visual-audio/permitted-imagery.md`) — the closed list of visual categories the art may depict; the inverse of the prohibition surface

**Mandatory cross-reference — the closed list of prohibited names.** Every portrait, background, icon, and visual element must be checked against [`advisory/prohibited-names.txt`](../prohibited-names.txt). The list is reproduced in full below for at-the-desk reference; the canonical file controls in case of divergence.

<details>
<summary>prohibited-names.txt (collapsed — click to expand)</summary>

```
Shakyamuni
Buddha
Amitabha
Amida
Amitayus
Avalokiteshvara
Avalokiteśvara
Guanyin
Kannon
Chenrezig
Manjushri
Mañjuśrī
Wenshu
Monju
Samantabhadra
Puxian
Fugen
Ksitigarbha
Kṣitigarbha
Dizang
Jizo
Mahasthamaprapta
Mahāsthāmaprāpta
Dashizhi
Daesaeji
Seishi
Tara
Tārā
Drolma
Maitreya
Mila
Milarepa
Padmasambhava
Tsongkhapa
Nagarjuna
Nāgārjuna
Atisha
Shantideva
Śāntideva
Bodhidharma
```

Plus the prohibited pure lands per panel.md §4.1.1: **Sukhāvatī, Abhirati, Vaidūryanirbhāsa**.

</details>

Also carried forward for re-review if contested at Gate 3: `[LIST_ANY_GATE_3_CONTESTED_MATERIAL_OR_NONE]`.

---

## Scope of this gate

The Visual / Audio gate is where **§4.1.1 (named sacred figure depicted)** is most directly at risk in visual form — a portrait that even resembles a canonical depiction of a bodhisattva, or an icon that echoes a ritual implement, can trigger the unanimous rule even without a name. Reviewers assess each visual and audio asset against:

- Does any portrait, background, or icon **depict** (visually, or by identifiable allusion in pose/attribute/gesture) a figure on the prohibited list? (§4.1.1)
- Does any visual encode **restricted tantric material** — a mandala form, a mudra from an empowerment cycle, a visualization aid? (§4.1.2)
- Does any visual or audio asset constitute **devotional mimicry** — e.g., audio that quotes a chant liturgically, imagery that arranges figures in a veneration composition? (advisory, escalates to §4.2 majority if harm is found)
- Does the typography spec render CJK and Sanskrit-transliteration diacritics **legibly and respectfully** — no broken glyph boxes, no tonal flattening, no font that caricatures brush calligraphy?

Per-reviewer remit at this gate:

- **R1** assesses whether Tang-era visual references (costume, architecture, ritual objects) are historically plausible and not flattened into a generic "ancient China" aesthetic.
- **R2** assesses whether any visual composition mirrors a canonical devotional form (thangka composition, mandala, veneration hierarchy) — the highest-risk unanimous trigger at this gate.
- **R3** assesses stereotyping and exoticization in the art (slanted-eye caricature, "mystical Orient" framing, yellow-face portraiture conventions).
- **R4** assesses whether any visual or audio would be recognized as devotional in a lay household (a home shrine arrangement, a chant the household would recognize).

Explicitly **out of scope** (panel.md §3): art technical quality (resolution, compression, palette optimization — covered by engineering QA), accessibility of color contrast for low-vision users (covered by separate accessibility QA), fun.

---

## Applicable stop-ship triggers

The Visual / Audio gate is the **primary gate for §4.1.1 (visual depiction of sacred figures)** and the **primary gate for §4.1.2 (restricted tantric visual material)**. All four unanimous triggers are checked:

| #   | Unanimous trigger (§4.1)                                                                                                                                       | Applicability at Gate 4                                  | Raised by any reviewer? |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------- |
| 4.1.1 | A named sacred figure is depicted against the prohibition list (**visual depiction or identifiable allusion is sufficient — no name required**)              | **PRIMARY** — every portrait/background/icon under review | `[YES/NO]`              |
| 4.1.2 | Restricted tantric material is included (mandala, mudra, visualization aid, chant quoted liturgically)                                                        | **PRIMARY** — visual/audio surfaces checked              | `[YES/NO]`              |
| 4.1.3 | A karma → social-identity mechanic is present                                                                                                                  | Unlikely (no mechanics at this gate)                      | `[YES/NO]`              |
| 4.1.4 | A false doctrinal claim is presented as canonical                                                                                                              | Unlikely (text reviewed at Gate 3)                        | `[YES/NO]`              |

Majority stop-ship (§4.2) and tie (§4.3) apply to devotional mimicry, stereotyping in art, exoticizing typography, appropriative audio.

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
- Affected material: `[ASSET_PATH — e.g. art/portraits/character-3.png]`
- Suggested resolution: `[RESOLUTION_TEXT]`

#### R2 — `[R2_NAME]`
- Finding class: `[NONE / ADVISORY / MAJORITY-STOP-SHIP / UNANIMOUS-STOP-SHIP]`
- Trigger cited (if any): `[§4.1.1 / §4.1.2 / §4.1.3 / §4.1.4 / §4.2]`
- Finding text: `[FINDING_TEXT]`
- Affected material: `[ASSET_PATH]`
- Suggested resolution: `[RESOLUTION_TEXT]`

#### R3 — `[R3_NAME]`
- Finding class: `[NONE / ADVISORY / MAJORITY-STOP-SHIP / UNANIMOUS-STOP-SHIP]`
- Trigger cited (if any): `[§4.1.1 / §4.1.2 / §4.1.3 / §4.1.4 / §4.2]`
- Finding text: `[FINDING_TEXT]`
- Affected material: `[ASSET_PATH]`
- Suggested resolution: `[RESOLUTION_TEXT]`

#### R4 — `[R4_NAME]`
- Finding class: `[NONE / ADVISORY / MAJORITY-STOP-SHIP / UNANIMOUS-STOP-SHIP]`
- Trigger cited (if any): `[§4.1.1 / §4.1.2 / §4.1.3 / §4.1.4 / §4.2]`
- Finding text: `[FINDING_TEXT]`
- Affected material: `[ASSET_PATH]`
- Suggested resolution: `[RESOLUTION_TEXT]`

---

## Resolutions

For each finding above, the engineer records the resolution path here. See panel.md §4.2 (majority), §7.3 (advisory disagreement). Unanimous stop-ship (§4.1) has **no override** — the triggering asset is cut or reworked.

| Finding ref | Resolution path | Disposition |
| ----------- | --------------- | ----------- |
| `[R1-001]`  | `[CUT / REWORK-AND-RESUBMIT / WRITTEN-RESPONSE-APPENDED / ADVISORY-ACCEPTED / ADVISORY-DECLINED-WITH-RATIONALE]` | `[DETAIL]` |
| `[R2-001]`  | `[...]` | `[...]` |
| `[R3-001]`  | `[...]` | `[...]` |
| `[R4-001]`  | `[...]` | `[...]` |

If any finding is a written-response majority stop-ship (§4.2b), the response is appended below and the **next gate** (Gate 5: Economy-UI) re-reviews the contested content.

### Written responses (if any)

`[APPEND_ENGINEER_RESPONSE_HERE_OR_WRITE_NONE]`

---

## Outcome

- Gate result: `[PASS / STOP-SHIP-UNANIMOUS / STOP-SHIP-MAJORITY / TIE-2-2 / RE-REVIEW-REQUIRED]`
- Unanimous stop-ship triggered? `[NO / YES — trigger §4.1._]`
- If majority stop-ship and engineer elects §4.2b: contested content re-reviewed at Gate 5.
- Next action: `[advance to Gate 5 / revise & re-open Gate 4 / escalate per §7]`
- Re-review scheduled for: `[DATE_OR_NA]`
- Re-review turnaround (if applicable): 5 business days (panel.md §5: half of original 10).

---

## Signatures

All four reviewers must sign before the gate is closed. panel.md §5: "No gate's content ships without the gate being closed." Signature = PGP-signed markdown commit OR signed PDF deposited at `advisory/review-records/signatures/gate-4-[date]/`.

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
- [`advisory/prohibited-names.txt`](../prohibited-names.txt) — closed list referenced by §4.1.1; **the canonical file controls** over the reproduction in this template
- [`feedback-log.md`](feedback-log.md) — running log (mirror each finding above into a row)
- [`recruitment-log.md`](../recruitment-log.md) — panel seating status
- Prior gate: [`gate-3-narrative.md`](gate-3-narrative.md)
- Next gate: [`gate-5-economy-ui.md`](gate-5-economy-ui.md)
- Art source assets: `src/assets/` or equivalent (the canonical art; this gate reviews copies deposited under `advisory/gate-4-visual-audio/`)
