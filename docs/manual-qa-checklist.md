# Yakshetra Manual QA Checklist (F3)

> **Status:** Operational runbook. Ready to execute as soon as (a) the T31
> preview builds (IPA + APK) are exported, and (b) the user has physical
> iPhone and Android devices available for testing. The web build at
> `dist/` (from T11) is partially testable today; the 7 mobile + web
> assertions from the F3 plan spec run in full once the T31 builds and
> devices are available.
>
> **Source:** Plan F3 at `.omo/plans/buddhist-inspired-incremental-rpg.md`
> lines 690–691.
>
> **Companion:** `docs/playtest-protocol.md` for the human-subjects
> evaluation (T33) that runs against the same builds.
>
> **Cross-references:**
>
> - Advisory scope, panel composition, and unanimous stop-ship triggers:
>   `advisory/panel.md` §1–§4.
> - Closed list of prohibited sacred/devotional names (the QA pass checks
>   that none of these appear on screen, in voiceover, or in save blobs):
>   `advisory/prohibited-names.txt`.
> - Front-matter disclaimer wiring (T28) and 9-category content-warning
>   taxonomy: `src/i18n/en.json` (`disclaimer.*`) and
>   `src/content/warning-taxonomy.ts`.

---

## 1 — Pre-flight checklist

Complete **before opening the build on any device**. If any item fails,
stop and surface to the engineer — do not proceed with a broken setup.

- [ ] **Build version recorded:** `[BUILD_VERSION]` (commit SHA from
      `git rev-parse HEAD` at the time T31 exported the IPA / APK / web
      URL). Confirm the build's reported version matches.
- [ ] **URL / device list:** - Web URL: `[WEB_URL]` (from `npx expo export --platform web` →
      `dist/index.html`, served via `npx serve dist` or equivalent). - iPhone: physical device `[IPHONE_MODEL]` running `[IOS_VERSION]`,
      with the T31 IPA installed via TestFlight invite `[TF_LINK]`. - Android: physical device `[ANDROID_MODEL]` running `[ANDROID_VERSION]`,
      with the T31 APK installed via Play Internal track `[PLAY_LINK]`.
- [ ] **Recording tool ready:** a screen recorder on each device that
      captures both screen and microphone simultaneously. Default:
      QuickTime (iOS), the built-in screen recorder (Android), and OBS
      (web).
- [ ] **Evidence directory created:**
      `.omo/evidence/F3-manual-qa/videos/` (gitignored). Subdirectories
      per platform: `web/`, `ios/`, `android/`.
- [ ] **Test log opened:** `.omo/evidence/F3-manual-qa/qa-log.md` with
      today's date and the build version at the top.
- [ ] **Stop-ship reference bookmarked:** `advisory/panel.md` §4.1 and
      `advisory/prohibited-names.txt` — the QA pass treats any depiction
      of a prohibited name as an automatic FAIL.

---

## 2 — Web checklist (Chrome + Safari, desktop and mobile)

Run this checklist against `[WEB_URL]` in **Chrome (desktop)** and
**Safari (mobile, on the same physical iPhone used for §3)**. Each item
is binary (pass / fail); capture screenshots or short screen recordings
for every pass.

### 2.1 First-launch surface

- [ ] **Disclaimer shows once.** Open the URL in a fresh browser profile
      (or hard-refresh with cache cleared). The "A Note Before You Begin"
      modal appears (`disclaimer.title_sid`, `disclaimer.body_sid`).
      Click "I understand". The modal disappears and **does not
      reappear** on subsequent reloads within the same browser storage
      state. Open in a private window — modal reappears (confirms
      per-storage persistence, not global).
- [ ] **Content warnings fire.** In `/settings`, verify there are
      **9 toggles** (one per category in `src/content/warning-taxonomy.ts`):
      `death-of-self`, `death-of-family`, `illness-chronic-suffering`,
      `war-political-violence`, `betrayal`, `poverty-starvation`,
      `social-oppression`, `forced-moral-compromise`,
      `separation-from-loved-ones`. Confirm there is **no global "disable
      all" toggle** (per T28 evidence). Toggle each category off and on;
      state persists across reload.

### 2.2 Full Tang + Fantasy chain (Chrome desktop)

- [ ] Start a new chain from the home screen.
- [ ] Play Life 1 (Tang) to completion. Capture video: `videos/web/tang-life.mp4`.
- [ ] **Bardo transitions work.** The bardo screen renders after Life 1
      ends; "Begin next life" advances to Life 2 without loss of state.
- [ ] Play Life 2 (Fantasy) to completion. Capture video: `videos/web/fantasy-life.mp4`.
- [ ] **All 4 echo types demonstrable.** Plan a path through Life 1 that
      produces at least one echo of each type — `tendency`, `vow`,
      `unresolved-attachment`, `pattern-break` (see
      `src/engine/echo.ts` and T26 evidence). Confirm each echo type
      surfaces in Life 2 at the expected beat. Capture a short clip per
      echo: `videos/web/echo-{type}.mp4`.
- [ ] **No crashes** during the full chain. If any crash occurs,
      capture the browser console output and stop the run.

### 2.3 Persistence + export / import (Chrome desktop)

- [ ] **Settings persist.** Toggle a content-warning category off,
      reload, confirm the toggle is still off.
- [ ] **Save export.** Use the in-app "Export save" affordance (or the
      equivalent via the SaveBlob API in `src/persistence/`). The
      downloaded file is a valid JSON blob with the documented schema
      version. Save to `videos/web/exported-save.json` for inspection.
- [ ] **Save import.** Clear browser storage, then import the
      previously-exported blob. The home screen and active-life state
      match the pre-export state. Save the imported save's metadata to
      `videos/web/imported-save-meta.txt`.

### 2.4 Safari (mobile, on the iPhone)

Repeat §2.1–§2.3 in mobile Safari on the iPhone. Pay specific attention
to:

- [ ] Touch targets are ≥ 44 × 44 CSS px (WCAG 2.5.5 / 2.5.8; see T29
      evidence `.omo/evidence/task-29-a11y.md` for the static-audit
      baseline).
- [ ] Safe-area handling on notched devices (no content hidden behind
      the notch or the home indicator).
- [ ] No horizontal scroll on the standard portrait viewport.

### 2.5 Web pass criteria

- [ ] All 7 F3 assertions hold (disclaimer-once, warnings-fire,
      4-echo-types-demonstrable, bardo-works, settings-persist,
      export-import-works, no-crash) — see §7.
- [ ] No advisory-violating depiction on screen or in the save blob
      (grep the exported save for `advisory/prohibited-names.txt` —
      zero matches expected; see §6).

---

## 3 — iOS checklist (TestFlight on physical iPhone)

### 3.1 Install

- [ ] Accept the TestFlight invite `[TF_LINK]`.
- [ ] Install the build. Confirm the **version number** and **build SHA**
      match `[BUILD_VERSION]`.
- [ ] Launch. The first-launch surface renders without crashing.

### 3.2 First-launch + warnings

- [ ] **Disclaimer shows once** on first launch of a fresh install.
      Tap "I understand". Force-quit and relaunch — modal does not
      reappear. Confirm via TestFlight build settings that the
      acknowledgement is per-app-install (cleared on uninstall) and not
      per-account.
- [ ] **Content warnings fire.** Same 9-toggle check as §2.1.

### 3.3 Full Tang + Fantasy chain

- [ ] Play Life 1 (Tang) to completion. Capture video:
      `videos/ios/tang-life.mp4`.
- [ ] Bardo transition works.
- [ ] Play Life 2 (Fantasy) to completion. Capture video:
      `videos/ios/fantasy-life.mp4`.
- [ ] **All 4 echo types demonstrable** in the planned path. Capture
      `videos/ios/echo-{type}.mp4`.
- [ ] **No crashes.** Capture device crash log to
      `videos/ios/crash-log.txt` if any crash occurs.

### 3.4 Settings + persistence

- [ ] Toggle a content-warning category off. Force-quit. Relaunch.
      Toggle is still off.
- [ ] **Save export / import** via the in-app affordances. Confirm
      the round-trip preserves the full chain (both lives, all echoes,
      all toggles).

### 3.5 VoiceOver spot-check

- [ ] Enable VoiceOver (Settings → Accessibility → VoiceOver).
- [ ] Navigate the home screen, life-start screen, bardo screen,
      settings screen. Verify each interactive element has an
      `accessibilityLabel` and a sensible `accessibilityRole`.
- [ ] **Verify the 7 `document-title` and 7 `region` violations flagged
      in T29 (`task-29-a11y.md`) are resolved** on the release-candidate
      build. If any remain, log them as findings — they are
      release-blocking for an accessible PASS.
- [ ] Disable VoiceOver.

### 3.6 iOS pass criteria

- [ ] All 7 F3 assertions hold on the iOS build — see §7.
- [ ] No advisory-violating depiction (see §6).
- [ ] VoiceOver spot-check clean.

---

## 4 — Android checklist (Play Internal on physical Android)

### 4.1 Install

- [ ] Accept the Play Internal track invite `[PLAY_LINK]`.
- [ ] Install the APK. Confirm the **version number** and **build SHA**
      match `[BUILD_VERSION]`.
- [ ] Launch. First-launch surface renders without crashing.

### 4.2 First-launch + warnings

- [ ] **Disclaimer shows once** on first launch of a fresh install.
      Tap "I understand". Force-quit and relaunch — modal does not
      reappear.
- [ ] **Content warnings fire.** Same 9-toggle check as §2.1.

### 4.3 Full Tang + Fantasy chain

- [ ] Play Life 1 (Tang) to completion. Capture video:
      `videos/android/tang-life.mp4`.
- [ ] Bardo transition works.
- [ ] Play Life 2 (Fantasy) to completion. Capture video:
      `videos/android/fantasy-life.mp4`.
- [ ] **All 4 echo types demonstrable** in the planned path. Capture
      `videos/android/echo-{type}.mp4`.
- [ ] **No crashes.** Capture `logcat` output to
      `videos/android/logcat.txt` if any crash occurs (use
      `adb logcat -d > videos/android/logcat.txt`).

### 4.4 Settings + persistence

- [ ] Toggle a content-warning category off. Force-quit. Relaunch.
      Toggle is still off.
- [ ] **Save export / import** round-trip preserves the full chain.

### 4.5 TalkBack spot-check

- [ ] Enable TalkBack (Settings → Accessibility → TalkBack).
- [ ] Navigate the home screen, life-start screen, bardo screen,
      settings screen. Verify each interactive element has an
      `accessibilityLabel` and a sensible `accessibilityRole`.
- [ ] **Verify the 7 `document-title` and 7 `region` violations flagged
      in T29 are resolved** on the release-candidate build.
- [ ] Disable TalkBack.

### 4.6 Android pass criteria

- [ ] All 7 F3 assertions hold on the Android build — see §7.
- [ ] No advisory-violating depiction (see §6).
- [ ] TalkBack spot-check clean.

---

## 5 — Video capture instructions

Each platform produces a folder of MP4s and a few text artifacts.
Naming and content conventions:

- **Per-life captures:** `tang-life.mp4` and `fantasy-life.mp4` in the
  platform's `videos/{platform}/` subfolder.
- **Per-echo captures:** `echo-tendency.mp4`, `echo-vow.mp4`,
  `echo-unresolved-attachment.mp4`, `echo-pattern-break.mp4`. Each
  clip starts at the moment the echo surfaces in Life 2 and ends at
  the next user-initiated action.
- **Crash / log artifacts:** `crash-log.txt` (iOS), `logcat.txt`
  (Android), `console-output.txt` (web).
- **Save round-trip:** `exported-save.json` plus `imported-save-meta.txt`
  per platform.

**Capture settings (recommended):**

- iOS: QuickTime Player → New Movie Recording, with the iPhone
  selected as the camera. Record the device screen + the
  facilitator's voiceover.
- Android: built-in screen recorder (varies by manufacturer; on
  Pixel, the Recorder app; on Samsung, the Game Plugins tool).
- Web: OBS → Window Capture, with a microphone audio track.

The facilitator narrates as they go ("Toggling content warning
`death-of-self` off — confirming persistence on reload"). The
narration is what makes the videos auditable.

---

## 6 — Advisory-violation check (runs on every platform)

After the per-platform runs, run the following grep on the **exported
save blobs** and on any captured on-screen text transcripts. This is a
release-blocking check.

```
grep -niE "Shakyamuni|Amit[āa]bha|Avalokite[sś]vara|Guanyin|Kannon|T[āa]r[āa]|Maitreya|Sukh[āa]vat[īi]|Bodhidharma|N[āa]g[āa]rjuna|..." \
  videos/web/exported-save.json \
  videos/ios/exported-save.json \
  videos/android/exported-save.json
```

The full list of patterns to grep is `advisory/prohibited-names.txt`
(see also `advisory/panel.md` §4.1 unanimous-stop-ship trigger 1).

**Pass criteria:** zero matches across all save blobs and transcripts.
**Failure:** any single match → FAIL the QA pass, escalate to the user
within 24 hours, and forward the finding to the advisory panel for the
gate-6 release-candidate review.

---

## 7 — Pass criteria (F3 overall)

F3 passes when **all** of the following hold (per plan line 691):

1. **No crashes** on any platform across the full Tang + Fantasy chain.
2. **No data loss** — save export / import round-trips identically;
   settings persist across force-quit.
3. **No advisory-violating depiction** — §6 grep returns zero matches.
4. **The 7 F3 assertions hold on each platform:**
   - [ ] (i) Disclaimer shows once.
   - [ ] (ii) Content warnings fire correctly (9 categories, no
         global off).
   - [ ] (iii) All 4 echo types demonstrable in a single chain
         (`tendency`, `vow`, `unresolved-attachment`,
         `pattern-break`).
   - [ ] (iv) Bardo transitions work.
   - [ ] (v) Settings persist.
   - [ ] (vi) Save export / import works.
   - [ ] (vii) No crashes.

A single failed assertion on any platform → F3 FAILS for that
platform. If F3 fails on iOS or Android but passes on web, the
**device-specific failure** is the blocker (web is not sufficient
to ship per the plan).

### 7.1 Escalation on FAIL

If F3 fails:

1. Document the failure in `.omo/evidence/F3-manual-qa/qa-log.md`
   with: platform, assertion, observed behavior, expected behavior,
   capture artifact (video / log / save blob).
2. Surface to the user via the project's normal communication channel.
3. The user decides: (a) fix the bug and re-run, (b) accept the
   limitation and document it, (c) other.
4. F3 is **not** marked passing until the user gives explicit
   instruction.

### 7.2 Stop conditions (must NOT do)

- Do **not** mark F3 passing with a known crash, a known data-loss
  bug, or a known advisory-violating depiction.
- Do **not** skip the save export / import round-trip — schema drift
  is the most likely silent failure.
- Do **not** skip the grep in §6 even if the run "looked clean" — the
  grep is the auditable artifact.
- Do **not** substitute a simulator for a physical device for the
  iOS / Android PASS. Simulators do not exercise the platform-specific
  a11y stack (VoiceOver / TalkBack), the TestFlight / Play Internal
  install path, or the platform-specific persistence adapter.

---

## Appendix A — Evidence output structure

```
.omo/evidence/F3-manual-qa/
├── qa-log.md
├── videos/
│   ├── web/
│   │   ├── tang-life.mp4
│   │   ├── fantasy-life.mp4
│   │   ├── echo-tendency.mp4
│   │   ├── echo-vow.mp4
│   │   ├── echo-unresolved-attachment.mp4
│   │   ├── echo-pattern-break.mp4
│   │   ├── exported-save.json
│   │   ├── imported-save-meta.txt
│   │   └── console-output.txt
│   ├── ios/
│   │   ├── tang-life.mp4
│   │   ├── fantasy-life.mp4
│   │   ├── echo-{type}.mp4  (x4)
│   │   ├── exported-save.json
│   │   ├── imported-save-meta.txt
│   │   └── crash-log.txt
│   └── android/
│       ├── tang-life.mp4
│       ├── fantasy-life.mp4
│       ├── echo-{type}.mp4  (x4)
│       ├── exported-save.json
│       ├── imported-save-meta.txt
│       └── logcat.txt
```

## Appendix B — Quick-reference IDs

| Item                           | Value                                                           |
| ------------------------------ | --------------------------------------------------------------- |
| Plan source for F3             | `.omo/plans/buddhist-inspired-incremental-rpg.md` lines 690–691 |
| Advisory scope / stop-ship     | `advisory/panel.md` §4                                          |
| Prohibited names (lint-closed) | `advisory/prohibited-names.txt`                                 |
| Disclaimer (T28)               | `src/i18n/en.json` `disclaimer.*`                               |
| Content-warning taxonomy (T28) | `src/content/warning-taxonomy.ts` (9 categories)                |
| Echo types (T26)               | tendency, vow, unresolved-attachment, pattern-break             |
| a11y baseline (T29)            | `.omo/evidence/task-29-a11y.md`                                 |
| Web build (T11)                | `dist/` from `npx expo export --platform web`                   |
| Evidence output                | `.omo/evidence/F3-manual-qa/`                                   |
