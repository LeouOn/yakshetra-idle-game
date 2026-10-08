# Studio component map (after the wave 2a split)

- `StudioView.tsx` (~1164 lines, down from 1525) — the assembly + light handlers (tend/shift/market/develop/confirmCook/pin/endow/embody/focus/export) and JSX. The harvest drain and the gate/rail math now live in hooks (below). REMAINING pure moves if more room is wanted: the compendium JSX section, the module helpers (lifeDisplayNames/activePracticeLine/awayDuration), the bay/charge JSX — together ~250 lines.
- `src/ui/hooks/useStudioHarvest.ts` (354 lines, wave 2a) — the drain, moved verbatim: tier benches highest-rung-first, person bay last, one-write visitor decay, reveal state for the stage, all-mode re-entrancy guard.
- `src/ui/hooks/studio-view-selectors.ts` (118 lines, wave 2a) — endowTierOf/endowPlan/endowTrackLabel/gteOperandsOf/tierProgress/tierScaleOf/isModelCard, moved verbatim.
- `StudioRevealStage.tsx` (NEW) — the card as the screen: name, rarity chip, kind chip, one_liner, subject, detail, about line, also-revealed drain list, Pin, continue. One 320ms scale/fade with rarity-tinted edge; no Animated call under reduced motion. Rendered PINNED ABOVE the ScrollView (always in view — no scroll-into-view needed).
- `StudioTabs.tsx` (NEW) — the hierarchy: bench / life / market / archive. All sections stay mounted; inactive collapse via `display: none` (tests + screen readers still reach them). `TabSection` is the wrapper.
- `StudioRail.tsx` — gained `variant: 'side' | 'strip'`: side column ≥720px, horizontal top strip on phones.
- `StudioJuice.tsx` — DELETED. Decision: the five static glyphs never moved, overprinted the tend label, and duplicated what the charge bar already says; the reveal stage took the animation budget (the actual reward moment). Its overprint class is gone with it.
- Overflow/surplus: now `banked heat: N` — small muted caption in the charge panel, never gold, never the loudest line.
- Unchanged (owned elsewhere): StudioCookPanel, StudioCookGroupRow (b4), StudioJourney (the single primary action: journey-primary), StudioMarket/Life/Activities/World/Roster/Milestone/Archive/NextAction.
