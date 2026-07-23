# Yakshetra Playtest Protocol (Task 33)

> **Status:** Operational runbook. Ready to execute as soon as (a) the T31 preview
> build is available, and (b) the user has recruited 8 testers (4 Buddhist-identifying
> Mahāyāna, 4 non-Buddhist). The protocol is self-contained — a new contractor or
> reviewer should be able to execute it without additional context.
>
> **Source:** Plan todo 33 at `.omo/plans/buddhist-inspired-incremental-rpg.md`
> lines 655–668. Draft hypotheses at
> `.omo/drafts/buddhist-inspired-incremental-rpg.md` lines 160–169.
>
> **Companion:** `docs/manual-qa-checklist.md` for the engine-build verification
> that runs in parallel (F3, plan lines 690–691).
>
> **Cross-references:**
>
> - Advisory scope, panel composition, and unanimous stop-ship triggers:
>   `advisory/panel.md` §1–§4.
> - Closed list of prohibited sacred/devotional names (do not appear in any
>   transcript, screenshot, or coded field): `advisory/prohibited-names.txt`.
> - Front-matter disclaimer and 9-category content-warning taxonomy:
>   `src/i18n/en.json` (`disclaimer.*`) and `src/content/warning-taxonomy.ts`.
> - The 4 demonstrable echo types: tendency, vow, unresolved-attachment,
>   pattern-break (see `src/engine/echo.ts` and T26 evidence
>   `.omo/evidence/task-26-echo-wiring.txt`).

---

## Section 1 — Recruitment

### 1.1 Cohort specification

Recruit exactly **8 testers** for a 60-minute remote session each:

- **4 Buddhist-identifying (across Mahāyāna traditions).** Target breadth:
  ideally **at least 1 East Asian diaspora practitioner** and **at least 1 convert
  practitioner**, with the remaining two drawn from any Mahāyāna background
  (Chan/Zen, Pure Land, Tiantai, Huayan, Yogācāra-influenced, etc.). The cohort
  is intentionally heterogeneous — the panel in `advisory/panel.md` already
  bounds representation harms; this cohort tests whether the _implementation_
  of that bounded design lands respectfully.
- **4 non-Buddhist.** Recruit from the same general population as the Buddhist
  cohort (similar age range, similar gaming familiarity). Non-Buddhist testers
  provide the comparison signal: do the cross-life echoes read as a general
  reflective mechanic rather than a covert teaching?

### 1.2 Recruitment channels (must NOT be friends/colleagues)

- **Buddhist-studies departments** at universities with Mahāyāna research
  programs (UCSB, McMaster, Leipzig, Vienna, etc.) — academic-list
  announcements are appropriate. Direct individual contact by the engineer is
  not appropriate; the **user recruits the testers** as documented in
  `advisory/panel.md` §2 ("Recruitment is user-owned; the engineer authors this
  document and does not contact candidates").
- **Mahāyāna community mailing lists** and sangha newsletters, via the user.
- **A playtesting service** (e.g., UserTesting, PlaytestCloud, or equivalent)
  for the non-Buddhist cohort and any Buddhist-identifying testers who prefer
  that channel.

### 1.3 Screening questions

Send each prospective tester a short screening form (5 questions, ~5 minutes)
before scheduling. The screening form does **not** disclose the game's
Buddhist framing; that is disclosed at consent time so that recruitment does
not bias the sample toward people with strong prior opinions.

1. Age range (18–24, 25–34, 35–44, 45–54, 55–64, 65+).
2. Gaming familiarity on a 1–5 scale ("How often do you play narrative or
   text-based games?": 1 = never, 5 = weekly or more).
3. Self-identified religious or philosophical background (free text, 1–2
   sentences). This is the only field used for cohort assignment.
4. Availability for a 60-minute remote session in the next 3 weeks (list 3
   candidate slots in their timezone).
5. Consent to audio + screen recording for research purposes (yes/no;
   recorded-only-with-consent is the operating mode).

**Exclusion criteria:** testers who have worked on the project, who have
played an earlier Yakshetra build, or who are immediate family / household
members of the engineer or the user. Testers who decline recording consent
may participate only in the non-recorded shadow arm (see §2.4) — they count
toward the cohort but produce no transcript evidence.

### 1.4 Sample recruitment email

```
Subject: 60-minute remote playtest of a short narrative game — paid

Hello [NAME],

We are recruiting testers for a 60-minute remote playtest of Yakshetra, a
short narrative game about two linked lives. The session is conducted over
Zoom (or equivalent) with screen-share and audio recording; you would play
through the game (~30–40 minutes) and then talk with the researcher for
~20 minutes about your experience.

Compensation: $[AMOUNT] (paid via [INSTRUMENT] within 7 days of the session).

You would see the game for the first time during the session; we will not
ask you to prepare anything beforehand. The session is recorded only with
your consent, and the recording is used solely for internal research and
advisory review — it is not published.

If you are interested, please reply with your availability for the next 3
weeks and confirm that you consent to audio + screen recording. I will
follow up with a 5-minute screening form.

Thank you,
[USER_NAME] on behalf of the Yakshetra team
```

The **user** sends this email from their own account; the engineer does not
contact testers directly.

### 1.5 Compensation and confidentiality

- **Flat fee per completed session** regardless of outcome. Documented in
  `advisory/reviewer-agreements/` style (see `advisory/panel.md` §6) —
  figures set by the user during recruitment, not hardcoded here.
- **Confidentiality:** testers receive the preview build under the same
  confidentiality terms as the advisory panel — they agree not to
  redistribute recordings, screenshots, or build artifacts. The build is
  **not released publicly** at any point during playtesting (see T33
  "Must NOT do" list, plan line 657).

---

## Section 2 — Pre-session setup

### 2.1 Build and tooling checklist (24h before each session)

- [ ] **Build version recorded:** `[BUILD_VERSION]` (commit SHA from `git
    rev-parse HEAD` at the time the T31 preview was exported).
- [ ] **T31 preview build available** for the tester's platform (web URL,
      TestFlight invite, or Play Internal link). The web URL is the
      simplest channel; mobile requires the T31 IPA / APK.
- [ ] **Screen-share + recording tool tested** (Zoom, OBS, or equivalent).
      Confirm recording captures both screen-share and tester audio
      simultaneously.
- [ ] **Stopwatch / timing tool** ready for per-turn, per-life, and
      total-session timing.
- [ ] **Structured interview rubric printed or open in a second window**
      (see §4 below).
- [ ] **Aggregation template open** (see §5) for live notes during the
      session.
- [ ] **Advisory stop-ship reference** bookmarked:
      `advisory/panel.md` §4.1 (the 4 unanimous triggers) — used if any
      tester surfaces something during the session that looks like a
      depiction of a name from `advisory/prohibited-names.txt`.

### 2.2 Recording consent (at session start, before any gameplay)

The facilitator opens the session with the following script (read aloud,
verbatim):

> "Before we start, I want to confirm two things. First, do you consent to
> audio and screen recording of this session for internal research and
> advisory review? The recording will not be published, and you can ask
> me to pause or stop recording at any time. Second, this game is a work
> of fiction inspired by Buddhist thought, but it does not teach
> Buddhism and it does not present itself as a religious text. You will
> see a short disclaimer to that effect when the game opens. If at any
> point you want to stop, just say so — there is no penalty and you will
> still be paid the full fee."

If the tester does **not** consent to recording, the facilitator offers
the shadow arm (notes only, no transcript) and continues if the tester
agrees. If the tester wants to stop entirely, the session ends and the
facilitator documents the withdrawal in
`.omo/evidence/task-33-playtest-report.md` §"Withdrawals" without
disclosing identity.

### 2.3 Disclosure of the game's framing

The Buddhist framing is disclosed at the consent step (above) so that
testers who do not wish to engage with Buddhist-inspired content can
decline before any gameplay. The game's own front-matter disclaimer (T28)
re-discloses this at first launch per save slot — both disclosures are
required, not alternatives.

### 2.4 60-minute slot timing

```
00:00 – 02:00   Consent + framing disclosure (§2.2–2.3)
02:00 – 05:00   Warm-up + walkthrough of controls
05:00 – 25:00   Life 1 (Tang): play-through, facilitator takes notes
25:00 – 27:00   Pause-point: brief check-in, then bardo transition
27:00 – 47:00   Life 2 (Fantasy): play-through, facilitator takes notes
47:00 – 50:00   Pause-point: brief check-in before ending
50:00 – 60:00   Structured interview (§4)
```

If the tester runs faster (e.g., completes Life 2 by minute 40), the
facilitator uses the freed time for the interview. If the tester runs
slower, the facilitator prioritizes completing **at least one life**
plus the interview; the second life may be partial and that is noted in
the transcript.

### 2.5 Debrief timing

Within 24 hours of the session, the facilitator:

- Uploads the recording to `.omo/evidence/task-33-playtest-recordings/`
  (gitignored; see T1).
- Fills in the per-tester row of the aggregation template (see §5).
- Flags any items that look like unanimous stop-ship material (see
  `advisory/panel.md` §4.1) to the user within the same 24h window.

---

## Section 3 — In-session script

### 3.1 Warm-up (minutes 0–5)

> "Today you'll play through two linked lives. There is no way to lose
> and no score to optimize. The game asks you to make choices when
> events come up; there are no obviously-right answers. After both
> lives, I'll ask you some questions about your experience. Feel free to
> think out loud as you play — your reactions are data."

Confirm the tester can see the screen, hear the facilitator, and has a
working keyboard / touch input. Confirm the build version displayed in
the corner of the screen matches `[BUILD_VERSION]`.

### 3.2 Play-through instructions (minute 5 onward)

> "Start by clicking 'New chain'. You'll see a short disclaimer — please
> read or skim it, then click 'I understand'. From there, the game will
> walk you through starting your first life."

The facilitator does **not** play the game for the tester. The
facilitator may answer clarifying questions about controls ("how do I
scroll?") but does not interpret content ("what does this symbol mean?").

### 3.3 Pause-points

There are two formal pause-points, both at predetermined moments:

- **Pause-point A: end of Life 1 / bardo transition (~minute 25).**
  The facilitator asks: "How are you doing? Anything you want to ask
  before we continue into the second life?" The facilitator then
  prompts the tester to proceed into the bardo screen. The tester reads
  the bardo screen aloud or to themselves; the facilitator does not
  interpret it.
- **Pause-point B: end of Life 2 / chain complete (~minute 47).**
  The facilitator asks: "Take a breath. Before we move to the questions,
  is there anything that struck you about the second life compared to
  the first?" Capture the open response verbatim in the transcript.

### 3.4 Note-taking during play-through

The facilitator takes **timestamped notes** in a second window. Format:

```
[MM:SS]  tester: "..."           ← direct quote
[MM:SS]  action: chose option B  ← mechanical observation
[MM:SS]  body: tester sighed      ← affective observation
```

Do **not** interrupt play to interpret. Do **not** ask leading questions
during play (e.g., "did you love that?" — see T33 "Must NOT do", plan
line 657).

---

## Section 4 — Structured interview rubric

The interview has **8 hypothesis probes**, one per draft hypothesis from
`.omo/drafts/buddhist-inspired-incremental-rpg.md` lines 160–169. The
plan's (a)–(h) probes (plan line 656) feed these hypotheses; the mapping
is shown below each probe. Where a plan probe (e.g., (d) frustration)
feeds more than one hypothesis, the probe is asked once and its data is
applied to both hypotheses.

For Likert items, use the standard 5-point scale:
`1 = Strongly disagree / Not at all` … `5 = Strongly agree / Very much`.

For open-response items, capture the verbatim quote in the transcript.

### H1 — Multi-life loop and cross-life echo are comprehensible

**Plan probes (a):** comprehension, 0–3 score per item.

- Open: "In your own words, describe the multi-life loop." (capture verbatim)
- Open: "Describe the cross-life echo you experienced." (capture verbatim)
- Score each open response 0–3 on the rubric:
  - `0` = no description / wrong description
  - `1` = mentions one element (e.g., "two lives" but not echo)
  - `2` = mentions both elements with minor gaps
  - `3` = clear, accurate, includes the echo
- Combined score: sum of the two 0–3 scores, range 0–6, normalize to
  0–5 by `floor(sum * 5 / 6)`.
- **Pass:** normalized score ≥ 4.

### H2 — Voluntary replay intent

**Plan probe (c):** would-replay, yes/no.

- "Would you start a third life if the game offered one?"
- Yes / No / Unsure. Mark "Yes" = pass, "Unsure" = half-credit
  (counts as 0.5 toward the cohort tally), "No" = fail.
- **Pass:** the tester's response is "Yes" or "Unsure".

### H3 — Moral difficulty is present per life

**Plan probe (b):** moral weight, 1–5 Likert.

- "Did any choice feel meaningfully difficult, with no obviously-right
  answer?" — asked once after each life.
- 1–5 Likert per life.
- Combined score: `floor((life1 + life2) / 2)`, range 1–5.
- **Pass:** combined score ≥ 4 (i.e., tester found at least one
  difficult choice in each life on average).

### H4 — Second life's starting conditions feel caused by the first

**Custom probe** (the plan does not have a dedicated probe for H4; this
fills the gap).

- "Did the second life's starting conditions feel caused by choices
  you made in the first life?" — 1–5 Likert.
- Secondary signal: plan probe (d) "how frustrating was death?" — a low
  frustration score (1–2) is consistent with the tester feeling that
  death had meaningful consequences; a high frustration score (5) is
  consistent with death feeling arbitrary, which **fails** H4.
- **Pass:** primary score ≥ 4.

### H5 — Grit feels weighty, not graphic

**Plan probe (f):** grit weight, 1–5 Likert.

- "Did the suffering feel weighty without being graphic?" — 1–5 Likert.
- Open follow-up: "Was there a moment that stuck with you?" (capture
  verbatim; do not lead).
- **Pass:** Likert ≥ 4.

### H6 — Pāramitā-lens balance

**Plan probe (g):** lens balance, exit survey.

- Exit survey: "Which of the six lenses did you most often choose?
  Which second-most? Which least?" (facilitator reads the six lens
  names from the build so testers do not have to recall from memory).
- Aggregate at §5 below. **Pass** is computed at the cohort level, not
  per-tester.
- **Pass:** across the cohort, no single lens is selected more than
  2.5× the least-selected lens (per draft hypothesis 6).

### H7 — Advisory panel records zero severe representation defects

**Note:** this hypothesis is verified by **Task 32 (advisory panel
6-gate review)**, not by playtest. The playtest contributes **plan probe
(h) — advisory representation open response**, which is recorded
qualitatively and forwarded to the panel for the Gate 6 release-candidate
review (`advisory/panel.md` §5, gate 6).

- Open: "Did anything feel disrespectful to Buddhist traditions, or to
  any tradition represented in the game?" (capture verbatim).
- **Pass:** T32 6-gate review closes with zero unresolved severe
  findings; playtest contributes supporting qualitative data.

### H8 — Absence / rest felt safe and non-punitive

**Custom probe** (the plan does not have a dedicated probe for H8).

- "Did resting or stepping away from a turn ever feel safe and
  non-punitive?" — 1–5 Likert.
- Secondary signal: plan probe (d) "how frustrating was death?" — if
  the tester reports rest as punitive, frustration tends to score high;
  if rest felt safe, frustration tends to score low-to-mid.
- **Pass:** primary score ≥ 4.

### Plan probes not mapped to a hypothesis directly

The plan's (d) perceived frustration and (e) perceived pacing are
captured as **secondary signals** that feed H4, H8, and the qualitative
thematic aggregation (§5). They are recorded on the per-tester row but
do not gate pass/fail on their own.

- (d) "How frustrating was death?" — 1–5 Likert. Captured; gates H4
  and H8 as secondary signal.
- (e) "Was the pace right, too fast, or too slow?" — 1–5 Likert.
  Captured for the qualitative aggregation; not a hypothesis gate.

### Cohort-size scaling note

The draft hypotheses were authored at a 5-tester cohort
(thresholds `4/5`, `3/5`). T33 recruits n=8 (4+4). Per-hypothesis pass
thresholds scale as follows:

| Draft threshold | Fraction | n=8 integer cutoff (ceiling) |
| --------------- | -------- | ---------------------------- |
| 4 / 5           | 80%      | ≥ 7 testers pass             |
| 3 / 5           | 60%      | ≥ 5 testers pass             |

The cohort-level "≥ 6 / 8 hypotheses pass" rule (plan line 663) is
applied at §6 and is unchanged.

---

## Section 5 — Results aggregation template

The aggregation lives at
`.omo/evidence/task-33-playtest-report.md` (plan line 664). The format
below is filled in once per tester; aggregate tables follow.

### 5.1 Per-tester row (one row per tester)

```
| TesterID      | [TESTER_ID]                          |
| Date          | [YYYY-MM-DD]                         |
| BuildVersion  | [BUILD_VERSION]                      |
| Cohort        | Buddhist-identifying | Non-Buddhist   |
| TradBackground| [e.g., Chan practitioner, convert; or "none"] |
| RecordingConsent| yes | no (shadow arm)              |
| Life1Timing   | [MM:SS start–end]                    |
| BardoTiming   | [MM:SS start–end]                    |
| Life2Timing   | [MM:SS start–end]                    |
| TotalPlayMin  | [minutes]                            |
| H1 Score      | [0–5 normalized]                     |
| H2 Replay     | Yes / Unsure / No                    |
| H3 Score      | [1–5 combined]                       |
| H4 Score      | [1–5 primary Likert]                 |
| H5 Score      | [1–5 Likert]                         |
| H6 MostChosen | [lens name]                          |
| H6 LeastChosen| [lens name]                          |
| H7 OpenResp   | [verbatim quote or "n/a"]            |
| H8 Score      | [1–5 Likert]                         |
| Plan (d) Frustration | [1–5 Likert]                |
| Plan (e) Pacing      | [1–5 Likert]                |
| Notes         | [verbatim quotes, red flags]         |
```

### 5.2 Per-hypothesis pass / fail (one column per hypothesis)

```
| Tester | H1 | H2 | H3 | H4 | H5 | H6* | H7† | H8 |
|--------|----|----|----|----|----|----|----|----|
| T01    |    |    |    |    |    |    |    |    |
| T02    |    |    |    |    |    |    |    |    |
| ...    |    |    |    |    |    |    |    |    |
| T08    |    |    |    |    |    |    |    |    |
| Pass   | Y/N| Y/N| Y/N| Y/N| Y/N| Y/N| Y/N| Y/N|
| Count  | n/8| n/8| n/8| n/8| n/8| n/8| n/8| n/8|

*H6 is computed at the cohort level (see below).
†H7 pass is determined by T32, not playtest.
```

### 5.3 Lens-balance computation (H6)

For the cohort, count how many testers named each lens as
**most-often-chosen**:

```
| Lens              | Most-chosen count | Ratio vs. least |
|-------------------|-------------------|-----------------|
| [Lens 1]          |                   |                 |
| [Lens 2]          |                   |                 |
| ...               |                   |                 |
| [Lens 6]          |                   |                 |
```

Pass = `max(count) ≤ 2.5 × min(count)`. Document the ratio for each
lens even on pass.

### 5.4 Qualitative themes

After all 8 sessions, the facilitator writes a 1–2 paragraph **themes**
section capturing cross-tester patterns. Examples of themes to look for
(do not pre-fill):

- "Testers who chose [lens] frequently reported [pattern]."
- "Non-Buddhist testers described the cross-life echo as [X] while
  Buddhist-identifying testers described it as [Y] — investigate whether
  the framing reads differently by cohort."
- "H5 (grit weighty) scored [pass/fail] with qualitative reasons
  clustered around [theme]."
- "H8 (rest safe non-punitive) — testers who played quickly reported
  [X]; testers who paused reported [Y]."

### 5.5 Red flags

Any verbatim tester quote that resembles a `advisory/panel.md` §4.1
unanimous stop-ship trigger — particularly any name from
`advisory/prohibited-names.txt` appearing in the transcript, or any
description that sounds like karma-to-social-identity mapping — is
extracted to a "Red flags" subsection and flagged to the user within
24 hours (see §2.5). A red flag does not auto-fail T33; it triggers
the same escalation path as a T32 finding.

---

## Section 6 — Pass criteria and escalation

### 6.1 Pass criteria (from plan line 663)

T33 is **done** when **all** of the following hold:

1. All 8 testers completed the play-through (or withdrew per §2.2 and
   were replaced from the recruitment pool).
2. All 8 hypotheses are scored with pass / fail at the cohort level.
3. **At least 6 / 8 hypotheses pass** at the cohort level (using the
   per-tester thresholds in §4 and the cohort-level lens-balance
   computation in §5.3).
4. `.omo/evidence/task-33-playtest-report.md` exists with the filled
   per-tester rows, per-hypothesis pass / fail columns, lens-balance
   computation, qualitative themes, and red-flag section.

### 6.2 Escalation if fewer than 6 hypotheses pass

Per plan line 663 ("If fewer than 6/8 hypotheses pass, escalate to user
before declaring T33 done") and plan line 667 (the failure scenario),
the facilitator does **not** silently ship. The escalation:

1. The facilitator drafts a 1-page memo at
   `.omo/evidence/task-33-playtest-report.md` §"Escalation" with:
   - which hypotheses failed,
   - the qualitative themes from §5.4 that explain the failures,
   - the recommended changes (do not implement them yet),
   - the question for the user.
2. The facilitator surfaces the memo to the user via the project's
   normal communication channel.
3. The user decides: (a) iterate the build and re-run T33 with a fresh
   cohort, (b) cut the failing mechanic and re-run, (c) accept the
   failure and ship with a documented limitation, or (d) other.
4. T33 is **not** marked done until the user gives explicit instruction.

### 6.3 Escalation on red flags (§5.5)

A red flag from §5.5 escalates **immediately** — independent of the
6/8 hypotheses rule. The escalation path is the same as a T32 unanimous
stop-ship trigger: the content is cut from the prototype, full stop
(`advisory/panel.md` §4.1 — "The engineer cannot override a unanimous
stop-ship"). The playtest does not have the authority to _trigger_ a
unanimous stop-ship, but a red flag is forwarded to the panel and the
user for adjudication.

### 6.4 Stop conditions (must NOT do, plan line 657)

- Do **not** recruit only friends or colleagues (channels in §1.2).
- Do **not** ask leading questions during play-through (§3.4).
- Do **not** skip the Buddhist-identifying cohort.
- Do **not** release the playtest build publicly at any point during
  playtesting (§1.5).
- Do **not** mark T33 done if fewer than 6/8 hypotheses pass without
  escalating to the user (§6.2).

---

## Appendix A — Quick-reference IDs

| Item                           | Value                                                            |
| ------------------------------ | ---------------------------------------------------------------- |
| Plan source for T33            | `.omo/plans/buddhist-inspired-incremental-rpg.md` lines 655–668  |
| Draft hypotheses source        | `.omo/drafts/buddhist-inspired-incremental-rpg.md` lines 160–169 |
| Advisory scope / stop-ship     | `advisory/panel.md` §4                                           |
| Prohibited names (lint-closed) | `advisory/prohibited-names.txt`                                  |
| Disclaimer (T28)               | `src/i18n/en.json` `disclaimer.*`                                |
| Content-warning taxonomy (T28) | `src/content/warning-taxonomy.ts` (9 categories)                 |
| Echo types (T26)               | tendency, vow, unresolved-attachment, pattern-break              |
| Evidence output                | `.omo/evidence/task-33-playtest-report.md`                       |
| Recording storage (gitignored) | `.omo/evidence/task-33-playtest-recordings/`                     |
