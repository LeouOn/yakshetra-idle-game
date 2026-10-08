// The harvest drain (wave 2a extraction, lane b1) — moved VERBATIM from
// StudioView.tsx: tier benches drain highest rung first, the person bay
// lands last, visitor seats decay in one tiers write, reveal state is set
// for the stage. Pure move: no behavior change; StudioView supplies the
// session model through the deps below.

import { useRef } from 'react';

import {
  compileRequestFromBay,
  fillManifestSafe,
  harvestTableFill,
  harvestWithFiller,
  noteVisitorHarvest,
  tableFillManifest,
  DEFAULT_KIND_RULES,
  type BenchState,
  type WorldDraftReference,
  type HarvestResult,
  type LifeContext,
  type Manifest,
  type StudioSession,
  type StudioState,
  pinnedCards,
  resolveEncounter,
  summarizeResidue,
  type ActivityFamily,
  type EncounterRecipe,
  type ResolvedEncounter,
  Rng,
} from '@/engine';
import { oneShotFiller, type ManifestCompileRequest } from '@/engine/fill-adapter';
import type { CatalogEntry, CatalogMap } from '@/engine/table-catalog';
import { EMBODIED_TIER } from '@/engine/ladder-const';
import { activeVisitorFor, visitorTableOverride } from '@/engine/visitors';
import { formatSid } from '@/i18n';
import {
  kindRulesByScale,
  registries,
  sessionFromSlices,
  withRecordedDrafts,
  type BenchSlices,
} from '@/ui/hooks/useStudioSession';
import { isModelCard, tierScaleOf } from '@/ui/hooks/studio-view-selectors';
import type { SessionProgression } from '@/engine/studio-session-hydrate';

export interface UseStudioHarvestArgs {
  readonly completeManifest: ((request: ManifestCompileRequest) => Promise<unknown>) | undefined;
  /** Sought-encounter recipes (progression content) + the era's
   * practice-id -> activity-family lookup, for resolving the pinned pair. */
  readonly encounters: readonly EncounterRecipe[];
  readonly familyOf: (practiceId: string) => ActivityFamily | null;
  readonly rngRef: { readonly current: Rng };
  readonly benchRef: { readonly current: BenchSlices };
  readonly lifeContext: LifeContext;
  readonly lifeContextOf: (slices: BenchSlices) => LifeContext;
  readonly prefersReducedMotion: boolean;
  readonly setStudio: (value: StudioState | ((current: StudioState) => StudioState)) => void;
  readonly setBenches: (value: Record<string, BenchState>) => void;
  readonly setProgression: (updater: (current: SessionProgression) => SessionProgression) => void;
  readonly setWorldDrafts: (
    updater: (current: readonly WorldDraftReference[]) => readonly WorldDraftReference[],
  ) => void;
  readonly setFreshHarvestId: (id: string | null) => void;
  readonly setReveal: (
    reveal: {
      readonly card: Manifest;
      readonly alsoRevealed: readonly Manifest[];
      readonly soughtAnswered?: boolean;
    } | null,
  ) => void;
  readonly setExported: (value: boolean) => void;
  readonly report: (text: string) => void;
}

export function useStudioHarvest(args: UseStudioHarvestArgs) {
  const {
    completeManifest,
    encounters,
    familyOf,
    rngRef,
    benchRef,
    lifeContext,
    lifeContextOf,
    prefersReducedMotion,
    setStudio,
    setBenches,
    setProgression,
    setWorldDrafts,
    setFreshHarvestId,
    setReveal,
    setExported,
    report,
  } = args;
  /** The person bench's visitor table swap (tier-keyed entries), or null
   * when the default catalog is in force. */
  function personVisitorEntriesOf(session: StudioSession): readonly CatalogEntry[] | null {
    const reg = registries();
    const seat = activeVisitorFor(session, EMBODIED_TIER);
    const swap = visitorTableOverride(
      reg.visitors,
      seat?.id ?? null,
      reg.visitorTables,
      reg.catalogs,
    );
    return swap === reg.catalogs ? null : (swap[EMBODIED_TIER] ?? null);
  }

  /** Harvest priority among TIER benches: the highest-index rung with a
   * ready bench. The embodied person bay is excluded — the reveal press
   * drains tiers first and lands the person discovery last, on purpose. */
  function highestReadyTierIn(session: StudioSession): string | null {
    const ready = registries()
      .tiers.filter(
        (tier) => tier.id !== EMBODIED_TIER && session.benches[tier.id]?.bay?.status === 'ready',
      )
      .sort((a, b) => b.index - a.index);
    return ready[0]?.id ?? null;
  }

  /** The seated visitor's catalog for a tier, or null if no swap is active.
   * The override is the visitor table for every kind in the base catalog;
   * missing table_ref content falls back to the base catalog (no throw). */
  function visitorTierCatalogOf(tierId: string, session: StudioSession): CatalogMap | null {
    const reg = registries();
    const seat = activeVisitorFor(session, tierId);
    if (seat === null) {
      return null;
    }
    const catalog = visitorTableOverride(reg.visitors, seat.id, reg.visitorTables, reg.catalogs);
    return catalog === reg.catalogs ? null : catalog;
  }

  /** Fill one ready tier bay (compile + table/model fill). No state writes —
   * the reveal press accumulates and commits once. */
  async function fillTierBay(tierId: string, session: StudioSession): Promise<Manifest | null> {
    const bench = session.benches[tierId];
    if (bench === undefined) {
      return null;
    }
    const bay = bench.bay;
    if (bay === null || bay.status !== 'ready') {
      return null;
    }
    const scale = tierScaleOf(tierId);
    const rules = kindRulesByScale()[scale];
    if (rules === undefined) {
      throw new Error(`studio: no kind rules registered for the ${scale} scale`);
    }
    const request = compileRequestFromBay(
      { ...bay, focus: bay.focus ?? null },
      bench.quality_tier,
      bench.harvest_count,
      null,
      scale,
      rules,
      // Lane A dedup: feed the whole archive (details + titles) so a tier
      // harvest also prefers an unread variant and never reprints a name.
      session.archive.map((card) => card.detail),
      session.archive.map((card) => card.name),
    );
    const catalog = visitorTierCatalogOf(tierId, session) ?? registries().catalogs;
    const tableFill = (): Manifest =>
      tableFillManifest(
        request.residue,
        request.brief,
        request.quality_tier,
        rngRef.current,
        request.rng_seed,
        request.id,
        request.focus,
        request.life_context,
        request.scale,
        rules,
        catalog,
        // The direct call bypasses the request plumbing, so the archive
        // dedup inputs (and the bay's fire) are passed explicitly.
        request.archive_details ?? [],
        request.fire ?? 'short',
        undefined,
        request.archive_titles ?? [],
      );
    if (completeManifest === undefined) {
      return tableFill();
    }
    try {
      const raw = await completeManifest(request);
      const filled = fillManifestSafe(request, rngRef.current, oneShotFiller(raw));
      return filled.provenance.source === 'model' && filled.fill_status === 'model'
        ? filled
        : // Model garbage fell back inside the safe ingest — redo with the
          // tier's own rules and (possibly swapped) catalog.
          tableFill();
    } catch {
      return tableFill();
    }
  }

  const harvestingRef = useRef(false);

  /** Resolve the bay's pinned pair + window into the sought figure, or
   * null. Pure reads; recipes and the family lookup arrive as args. */
  function resolveSought(studio: StudioState): ResolvedEncounter | null {
    const bay = studio.bay;
    if (bay === null || bay.focus === null) {
      return null;
    }
    const pair = pinnedCards(bay.focus);
    if (pair.length === 0) {
      return null;
    }
    return resolveEncounter(pair, summarizeResidue(bay.residue), encounters, familyOf);
  }

  async function harvest(): Promise<void> {
    // Review fix: the guard covers ALL modes — fillTierBay is async even on
    // the table path (one microtask per tier bay), so an unguarded second
    // press re-entered on uncommitted benchRef state and double-harvested.
    if (harvestingRef.current) {
      return;
    }
    harvestingRef.current = true;
    try {
      // ONE press reveals everything ready. Tier benches drain first
      // (highest rung to lowest, against locally accumulated state so a
      // single press never reads a stale slice), and the embodied person
      // bay lands last — its card is the discovery the journey flourishes.
      // Before round 2 this drained exactly ONE bench per press, highest
      // rung first, so a ready household bay made "Reveal a discovery" a
      // two-click action while the develop button lied "more work needed".
      const base = sessionFromSlices(benchRef.current);
      const benchesAcc: Record<string, BenchState> = { ...base.benches };
      const archiveAcc: Manifest[] = [...base.archive];
      const tierManifests: Manifest[] = [];
      let tiersAcc = base.tiers;
      for (;;) {
        const accSession: StudioSession = {
          ...base,
          benches: benchesAcc,
          // The session's archive is the zod-inferred mutable shape; the
          // accumulated engine Manifests are structurally identical.
          archive: archiveAcc as StudioSession['archive'],
          tiers: tiersAcc,
        };
        const tier = highestReadyTierIn(accSession);
        if (tier === null) {
          break;
        }
        const manifest = await fillTierBay(tier, accSession);
        const spent = benchesAcc[tier];
        if (manifest === null || spent === undefined) {
          break;
        }
        benchesAcc[tier] = { ...spent, bay: null, harvest_count: spent.harvest_count + 1 };
        archiveAcc.push(manifest);
        tierManifests.push(manifest);
        tiersAcc = noteVisitorHarvest(accSession, tier).tiers;
      }
      const tierCount = tierManifests.length;

      // Person path, computed against this press's accumulated archive so a
      // tier reveal and the person discovery land in one commit.
      const slicesNow = benchRef.current;
      const personStudio: StudioState = { ...slicesNow.studio, archive: archiveAcc };
      const personSession: StudioSession = sessionFromSlices(slicesNow);
      const visitorEntries = personVisitorEntriesOf(personSession);
      const sought = resolveSought(personStudio);
      const soughtOpts = { ...(sought === null ? {} : { encounterFigureId: sought.figureId }) };
      const tableResult = (): HarvestResult | null =>
        harvestTableFill(personStudio, rngRef.current, lifeContext, visitorEntries, soughtOpts);

      const bay = personStudio.bay;
      let result: HarvestResult | null;
      if (completeManifest !== undefined && bay !== null && bay.status === 'ready') {
        const request = compileRequestFromBay(
          bay,
          personStudio.quality_tier,
          personStudio.harvest_count,
          lifeContext,
          'person',
          DEFAULT_KIND_RULES,
          personStudio.archive.map((card) => card.detail),
          personStudio.archive.map((card) => card.name),
        );
        void sought; // the completer request keeps the bay as-is; the table
        // fallbacks below carry the encounter figure.
        try {
          const raw = await completeManifest(request);
          // Real completer latency is seconds: a pulse tick or a tend press
          // may have landed while the fill was in flight. Read the live bench
          // slices (the applyTicks pattern) and compute both the model
          // attempt and the fallback against them, so the commit lands on
          // top of the newer state instead of rolling it back. The tier
          // manifests are still local, so re-attach them to whatever the
          // live slices now hold.
          const live = benchRef.current;
          const liveWithTiers: StudioState = {
            ...live.studio,
            archive: [...live.studio.archive, ...tierManifests],
          };
          const liveContext = lifeContextOf(live);
          const tableLive = (): HarvestResult | null =>
            harvestTableFill(
              liveWithTiers,
              rngRef.current,
              liveContext,
              personVisitorEntriesOf(sessionFromSlices(live)),
              soughtOpts,
            );
          const bayStillHarvestable =
            liveWithTiers.bay !== null &&
            liveWithTiers.bay.status === 'ready' &&
            liveWithTiers.bay.residue_window_id === request.residue_window_id;
          if (bayStillHarvestable) {
            const attempt = harvestWithFiller(
              liveWithTiers,
              rngRef.current,
              oneShotFiller(raw),
              liveContext,
              soughtOpts,
            );
            result = attempt !== null && isModelCard(attempt.manifest) ? attempt : tableLive();
          } else {
            // Mid-await the bay was replaced (a develop queued a different
            // window): archive a good model card, never touch the new bay.
            const card = fillManifestSafe(request, rngRef.current, oneShotFiller(raw));
            result = isModelCard(card)
              ? {
                  studio: { ...liveWithTiers, archive: [...liveWithTiers.archive, card] },
                  manifest: card,
                }
              : null;
          }
        } catch {
          const live = benchRef.current;
          const liveWithTiers: StudioState = {
            ...live.studio,
            archive: [...live.studio.archive, ...tierManifests],
          };
          result = harvestTableFill(
            liveWithTiers,
            rngRef.current,
            lifeContextOf(live),
            personVisitorEntriesOf(sessionFromSlices(live)),
            soughtOpts,
          );
        }
      } else {
        result = tableResult();
      }

      // A sought encounter that actually ANSWERED (the fill can refuse an
      // era-gated figure and fall through to a neutral card) records its
      // recipe and flags the reveal stage.
      const encounterAnswered =
        sought !== null &&
        result !== null &&
        (result.manifest.about_id === sought.figureId ||
          result.manifest.tags.includes(sought.figureId));
      if (encounterAnswered && sought !== null) {
        const recipeId = sought.id;
        setProgression((current) => ({
          ...current,
          encounters_done: [...(current.encounters_done ?? []), recipeId],
        }));
      }

      if (tierCount > 0) {
        setBenches(benchesAcc);
      }
      if (result === null) {
        if (tierCount === 0) {
          return;
        }
        // Tier benches revealed, person bay not ready: commit those alone.
        setStudio((current) => ({ ...current, archive: [...current.archive, ...tierManifests] }));
        setWorldDrafts((current) => withRecordedDrafts(archiveAcc, current));
        const named = tierManifests[tierManifests.length - 1];
        if (named !== undefined) {
          setFreshHarvestId(prefersReducedMotion ? null : named.id);
          setReveal({ card: named, alsoRevealed: tierManifests.slice(0, -1) });
          report(
            formatSid('studio.reveal_all_receipt_sid', { name: named.name, n: tierCount - 1 }),
          );
        }
        setExported(false);
        return;
      }
      // Review fix: ONE tiers write. The tier loop accumulated its visitor
      // decays in tiersAcc; the person seat decays ON TOP of that here.
      // (Before, decayVisitorSeat recomputed from the pre-harvest benchRef
      // and its write clobbered tiersAcc — tier guests never decayed.)
      const tiersWithPerson = noteVisitorHarvest({ ...base, tiers: tiersAcc }, EMBODIED_TIER).tiers;
      setProgression((current) => ({ ...current, tiers: tiersWithPerson }));
      setStudio(result.studio);
      setWorldDrafts((current) => withRecordedDrafts(result.studio.archive, current));
      setFreshHarvestId(prefersReducedMotion ? null : result.manifest.id);
      setReveal({
        card: result.manifest,
        alsoRevealed: tierManifests,
        ...(encounterAnswered ? { soughtAnswered: true } : {}),
      });
      report(
        tierCount > 0
          ? formatSid('studio.reveal_all_receipt_sid', { name: result.manifest.name, n: tierCount })
          : formatSid('studio.market_harvest_receipt_sid', { name: result.manifest.name }),
      );
      setExported(false);
    } finally {
      harvestingRef.current = false;
    }
  }

  return { harvest };
}
