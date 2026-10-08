import { describe, expect, it } from 'vitest';

import {
  createRng,
  createStudioState,
  dominantWindowFamily,
  nextPinned,
  pinFocus,
  pinnedCards,
  resolveEncounter,
  soughtEncounters,
  summarizeResidue,
  type ActivityFamily,
  type EncounterRecipe,
  type Manifest,
  type ManifestFocus,
  type ResidueEvent,
} from '@/engine';
import { compileRequestFromBay, tableFiller, type CompileBayInput } from '@/engine/fill-adapter';
import { DevelopOperationSchema } from '@/engine/studio-session-v0';
import { StudioSessionSchema } from '@/engine/studio-session';
import { EncounterRecipeSchema, EncountersFileSchema } from '@/content/progression/schema';
import { loadProgression } from '@/content/progression/loader';
import { loadEraPack } from '@/content/loader';
import { resolveSid } from '@/i18n';
import { activityFamilyForLens } from '@/engine/activities';

function mockEvent(
  tick: number,
  practiceId: string,
  type: ResidueEvent['type'] = 'practice_tick',
): ResidueEvent {
  return {
    tick,
    type,
    ids: [practiceId],
    numbers: {},
  };
}

function mockCard(
  id: string,
  name: string,
  kind: 'person' | 'place',
  tags: readonly string[] = [],
): Manifest {
  return {
    schema_version: 'manifest/v1',
    id,
    rng_seed: 'seed-mock',
    brief: null,
    residue_window_id: 'w-mock',
    name,
    kind,
    one_liner: `${name} test one-liner`,
    detail: `${name} detail`,
    subject: name,
    tags,
    rarity: 'common',
    scale: 'person',
    quality_tier: 0,
    fill_status: 'table',
    provenance: { source: 'table', revision: 'table/v0' },
  };
}

describe('Sought Encounters Engine', () => {
  const familyOf = (practiceId: string): ActivityFamily | null => {
    if (practiceId.includes('work')) return 'work';
    if (practiceId.includes('learn')) return 'learning';
    if (practiceId.includes('meditate')) return 'meditation';
    if (practiceId.includes('being')) return 'beings';
    if (practiceId.includes('gift')) return 'generosity';
    return null;
  };

  const sampleRecipes: readonly EncounterRecipe[] = [
    {
      id: 'encounter/shakyamuni-witness',
      figure_id: 'figure:shakyamuni',
      needs: {
        pinned: [{ kind: 'person' }],
        window: { family: 'learning', kind: 'outcome', min_count: 5 },
      },
      hint_sid: 'encounter.shakyamuni.hint_sid',
    },
    {
      id: 'encounter/vairocana-every-rafter',
      figure_id: 'figure:vairocana',
      needs: {
        pinned: [{ kind: 'person' }, { kind: 'place' }],
        window: { family: 'work', min_count: 6 },
      },
      hint_sid: 'encounter.vairocana.hint_sid',
    },
    {
      id: 'encounter/tie-breaker-a',
      figure_id: 'figure:manjushri',
      needs: {
        pinned: [{ kind: 'person' }],
        window: { family: 'learning', min_count: 3 },
      },
      hint_sid: 'encounter.manjushri.hint_sid',
    },
    {
      id: 'encounter/tie-breaker-b',
      figure_id: 'figure:nagarjuna',
      needs: {
        pinned: [{ kind: 'person' }],
        window: { family: 'learning', min_count: 3 },
      },
      hint_sid: 'encounter.nagarjuna.hint_sid',
    },
  ];

  /* ----------------------------------------------------------------------- */
  /* 1. Pure Resolution                                                      */
  /* ----------------------------------------------------------------------- */
  describe('pure resolution', () => {
    it('returns null when pinned requirements are not met', () => {
      const events: ResidueEvent[] = [
        mockEvent(1, 'practice:learn'),
        mockEvent(2, 'practice:learn'),
        mockEvent(3, 'practice:learn'),
        mockEvent(4, 'practice:learn'),
        mockEvent(5, 'practice:learn'),
        mockEvent(6, 'practice:learn'),
      ];
      const summary = summarizeResidue(events);
      // Shakyamuni requires person pin, we pass no pinned cards
      const result = resolveEncounter([], summary, sampleRecipes, familyOf);
      expect(result).toBeNull();
    });

    it('matches single-pin recipe when window and pin match', () => {
      const pinned: ManifestFocus[] = [
        { id: 'p1', name: 'Scholar', kind: 'person', one_liner: 'A student' },
      ];
      // Need family learning, kind outcome (dominant: event_resolved), min_count 5
      const events: ResidueEvent[] = [
        mockEvent(1, 'practice:learn', 'event_resolved'),
        mockEvent(2, 'practice:learn', 'event_resolved'),
        mockEvent(3, 'practice:learn', 'event_resolved'),
        mockEvent(4, 'practice:learn', 'practice_tick'),
        mockEvent(5, 'practice:learn', 'practice_tick'),
      ];
      const summary = summarizeResidue(events);
      expect(dominantWindowFamily(summary, familyOf)).toBe('learning');
      const result = resolveEncounter(pinned, summary, sampleRecipes, familyOf);
      expect(result).toEqual({
        id: 'encounter/shakyamuni-witness',
        figureId: 'figure:shakyamuni',
      });
    });

    it('matches pair-pin recipe when both person and place are pinned', () => {
      const pinned: ManifestFocus[] = [
        { id: 'p1', name: 'Mason', kind: 'person', one_liner: 'A builder' },
        { id: 'pl1', name: 'Pagoda', kind: 'place', one_liner: 'A shrine' },
      ];
      const events: ResidueEvent[] = [
        mockEvent(1, 'practice:work'),
        mockEvent(2, 'practice:work'),
        mockEvent(3, 'practice:work'),
        mockEvent(4, 'practice:work'),
        mockEvent(5, 'practice:work'),
        mockEvent(6, 'practice:work'),
      ];
      const summary = summarizeResidue(events);
      const result = resolveEncounter(pinned, summary, sampleRecipes, familyOf);
      expect(result).toEqual({
        id: 'encounter/vairocana-every-rafter',
        figureId: 'figure:vairocana',
      });
    });

    it('fails when window count is below min_count', () => {
      const pinned: ManifestFocus[] = [
        { id: 'p1', name: 'Mason', kind: 'person', one_liner: 'A builder' },
        { id: 'pl1', name: 'Pagoda', kind: 'place', one_liner: 'A shrine' },
      ];
      const events: ResidueEvent[] = [
        mockEvent(1, 'practice:work'),
        mockEvent(2, 'practice:work'),
        mockEvent(3, 'practice:work'),
        mockEvent(4, 'practice:work'),
        mockEvent(5, 'practice:work'), // only 5, needs 6
      ];
      const summary = summarizeResidue(events);
      const result = resolveEncounter(pinned, summary, sampleRecipes, familyOf);
      expect(result).toBeNull();
    });

    it('breaks ties deterministically by lowest recipe id', () => {
      const pinned: ManifestFocus[] = [
        { id: 'p1', name: 'Scholar', kind: 'person', one_liner: 'A student' },
      ];
      // Window satisfies both tie-breaker-a and tie-breaker-b
      const events: ResidueEvent[] = [
        mockEvent(1, 'practice:learn'),
        mockEvent(2, 'practice:learn'),
        mockEvent(3, 'practice:learn'),
      ];
      const summary = summarizeResidue(events);
      const result = resolveEncounter(pinned, summary, sampleRecipes, familyOf);
      expect(result?.id).toBe('encounter/tie-breaker-a');
      expect(result?.figureId).toBe('figure:manjushri');
    });

    it('is purely deterministic across multiple calls', () => {
      const pinned: ManifestFocus[] = [
        { id: 'p1', name: 'Mason', kind: 'person', one_liner: 'A builder' },
        { id: 'pl1', name: 'Pagoda', kind: 'place', one_liner: 'A shrine' },
      ];
      const events: ResidueEvent[] = [
        mockEvent(1, 'practice:work'),
        mockEvent(2, 'practice:work'),
        mockEvent(3, 'practice:work'),
        mockEvent(4, 'practice:work'),
        mockEvent(5, 'practice:work'),
        mockEvent(6, 'practice:work'),
      ];
      const summary = summarizeResidue(events);
      const r1 = resolveEncounter(pinned, summary, sampleRecipes, familyOf);
      const r2 = resolveEncounter(pinned, summary, sampleRecipes, familyOf);
      expect(r1).toEqual(r2);
    });
  });

  /* ----------------------------------------------------------------------- */
  /* 2. Pair Pin API                                                         */
  /* ----------------------------------------------------------------------- */
  describe('pair pin mechanics', () => {
    it('pins second card to form a pair, third pin replaces second', () => {
      const c1 = mockCard('c1', 'First Person', 'person', ['tag1']);
      const c2 = mockCard('c2', 'First Place', 'place');
      const c3 = mockCard('c3', 'Second Place', 'place');

      let studio = createStudioState();
      expect(nextPinned(null, c1)?.name).toBe('First Person');
      studio = pinFocus(studio, c1);
      expect(pinnedCards(studio.pinned)).toHaveLength(1);
      expect(studio.pinned?.name).toBe('First Person');

      studio = pinFocus(studio, c2);
      expect(pinnedCards(studio.pinned)).toHaveLength(2);
      expect(studio.pinned?.second?.name).toBe('First Place');

      // Pinning c3 replaces the second slot
      studio = pinFocus(studio, c3);
      expect(pinnedCards(studio.pinned)).toHaveLength(2);
      expect(studio.pinned?.name).toBe('First Person');
      expect(studio.pinned?.second?.name).toBe('Second Place');

      // Unpinning the primary promotes second to primary
      studio = pinFocus(studio, c1);
      expect(pinnedCards(studio.pinned)).toHaveLength(1);
      expect(studio.pinned?.name).toBe('Second Place');
    });
  });

  /* ----------------------------------------------------------------------- */
  /* 3. Session Schema Backward Compatibility                                */
  /* ----------------------------------------------------------------------- */
  describe('session schema backward compatibility', () => {
    it('parses old session with single pin and no encounters_done', () => {
      const raw = {
        schema_version: 'studio_session/v1',
        benches: {
          person: {
            residue: [],
            last_harvest_index: -1,
            bay: null,
            quality_tier: 0,
            harvest_count: 0,
            play_import: null,
            pinned: {
              id: 'p1',
              name: 'Elder',
              kind: 'person',
              one_liner: 'Old monk',
            },
            surplus: 0,
            held_residue: [],
            cook_choices: { long: 0, holdback: 0 },
            fold_position: 0,
          },
        },
        archive: [],
        tiers: {},
        milestones_done: [],
        compendium_done: [],
        embodied_member: null,
        idle: {
          mode: 'idle',
          last_simulated_tick: '0',
          total_idle_ticks: '0',
        },
        life: {
          turn: 1,
          resources: {},
          skills: {},
          residue: [],
        },
        practices: [],
        members: {},
        world_drafts: [],
      };
      const parsed = StudioSessionSchema.parse(raw);
      expect(parsed.encounters_done).toEqual([]);
      expect(parsed.benches.person?.pinned?.second).toBeUndefined();
    });

    it('parses develop operation focus with pair pin and encounter_figure_id', () => {
      const op = {
        id: 'op-1-12345',
        type: 'develop_from_residue',
        residue_window_id: 'w1',
        residue: [],
        brief: null,
        cook_ticks_total: 10,
        cook_ticks_done: 0,
        status: 'cooking',
        rng_seed: '12345',
        fire: 'short',
        focus: {
          id: 'p1',
          name: 'Elder',
          kind: 'person',
          one_liner: 'Old monk',
          tags: ['historical'],
          second: {
            id: 'pl1',
            name: 'Temple',
            kind: 'place',
            one_liner: 'Old pagoda',
          },
        },
        encounter_figure_id: 'figure:shakyamuni',
      };
      const parsed = DevelopOperationSchema.parse(op);
      expect(parsed.focus?.second?.name).toBe('Temple');
      expect(parsed.encounter_figure_id).toBe('figure:shakyamuni');
    });
  });

  /* ----------------------------------------------------------------------- */
  /* 4. Sought Encounters Selector                                           */
  /* ----------------------------------------------------------------------- */
  describe('soughtEncounters selector', () => {
    it('returns rows with silhouette, hint, and discovered flag', () => {
      const rows = soughtEncounters(sampleRecipes, ['encounter/shakyamuni-witness']);
      expect(rows).toHaveLength(4);
      expect(rows[0]).toEqual({
        id: 'encounter/shakyamuni-witness',
        figureId: 'figure:shakyamuni',
        discovered: true,
        hintSid: 'encounter.shakyamuni.hint_sid',
        silhouette: 'shakyamuni',
      });
      expect(rows[1]?.discovered).toBe(false);
      expect(rows[1]?.silhouette).toBe('vairocana');
    });

    it('supports (session, recipes) invocation signature', () => {
      const session = { encounters_done: ['encounter/shakyamuni-witness'] };
      const rows = soughtEncounters(session, sampleRecipes);
      expect(rows[0]?.discovered).toBe(true);
      expect(rows[1]?.discovered).toBe(false);
    });
  });

  /* ----------------------------------------------------------------------- */
  /* 5. 300-Seed Sweep & Fill Adapter Integration                            */
  /* ----------------------------------------------------------------------- */
  describe('300-seed sweep & filler integration', () => {
    it('guarantees encounter figure appears in 300/300 seeds when encounter_figure_id is set', () => {
      const filler = tableFiller();
      const bay: CompileBayInput = {
        residue_window_id: 'test-win',
        residue: [
          mockEvent(1, 'practice:tang/sutra-copying', 'practice_tick'),
          mockEvent(2, 'practice:tang/sutra-copying', 'practice_tick'),
          mockEvent(3, 'practice:tang/sutra-copying', 'practice_tick'),
          mockEvent(4, 'practice:tang/sutra-copying', 'practice_tick'),
          mockEvent(5, 'practice:tang/sutra-copying', 'event_resolved'),
        ],
        brief: null,
        rng_seed: 'seed-sweep',
        encounter_figure_id: 'figure:shakyamuni',
      };

      for (let i = 0; i < 300; i++) {
        const rng = createRng(BigInt(1000 + i));
        const req = compileRequestFromBay(bay, 0, i);
        expect(req.encounter_figure_id).toBe('figure:shakyamuni');
        const manifest = filler.fill(req, rng);
        expect(manifest.name).toBe('Śākyamuni');
        expect(manifest.tags).toContain('figure:shakyamuni');
        expect(manifest.about_id).toBe('figure:shakyamuni');
      }
    });

    it('never summons Shakyamuni when encounter_figure_id is absent', () => {
      const filler = tableFiller();
      const bay: CompileBayInput = {
        residue_window_id: 'test-win-no-figure',
        residue: [
          mockEvent(1, 'practice:generic', 'practice_tick'),
          mockEvent(2, 'practice:generic', 'practice_tick'),
          mockEvent(3, 'practice:generic', 'practice_tick'),
        ],
        brief: null,
        rng_seed: 'seed-no-figure',
      };

      for (let i = 0; i < 50; i++) {
        const rng = createRng(BigInt(5000 + i));
        const req = compileRequestFromBay(bay, 0, i);
        const manifest = filler.fill(req, rng);
        expect(manifest.tags).not.toContain('figure:shakyamuni');
        expect(manifest.name).not.toBe('Śākyamuni');
      }
    });

    it('composes encounter figure with long fire rarity floor', () => {
      const filler = tableFiller();
      const bay: CompileBayInput = {
        residue_window_id: 'test-win-long',
        residue: [
          mockEvent(1, 'practice:tang/sutra-copying'),
          mockEvent(2, 'practice:tang/sutra-copying'),
          mockEvent(3, 'practice:tang/sutra-copying'),
        ],
        brief: null,
        rng_seed: 'seed-long',
        fire: 'long',
        encounter_figure_id: 'figure:shakyamuni',
      };

      const rng = createRng(42n);
      const req = compileRequestFromBay(bay, 0, 0);
      const manifest = filler.fill(req, rng);
      expect(manifest.name).toBe('Śākyamuni');
      expect(manifest.rarity).not.toBe('common');
    });
  });

  /* ----------------------------------------------------------------------- */
  /* 6. Content Progression: Schema, Loader, Lint, and Satisfiability        */
  /* ----------------------------------------------------------------------- */
  describe('content progression encounters', () => {
    it('validates encounters.json5 against EncountersFileSchema directly', () => {
      const bundle = loadProgression();
      expect(bundle.encounters.length).toBe(11);
      for (const recipe of bundle.encounters) {
        expect(() =>
          EncounterRecipeSchema.parse({ ...recipe, schema_version: 'encounter/v0' }),
        ).not.toThrow();
      }
      expect(() =>
        EncountersFileSchema.parse({
          encounters: bundle.encounters.map((r) => ({ ...r, schema_version: 'encounter/v0' })),
        }),
      ).not.toThrow();
    });

    it('loads encounters from encounters.json5 with exactly 11 recipes', () => {
      const progression = loadProgression();
      expect(progression.encounters).toBeDefined();
      expect(progression.encounters).toHaveLength(11);
      for (const recipe of progression.encounters) {
        expect(recipe.id).toMatch(/^encounter\//);
        expect(recipe.figure_id).toMatch(/^figure:/);
        expect(recipe.needs.pinned.length).toBeGreaterThanOrEqual(1);
        expect(recipe.needs.pinned.length).toBeLessThanOrEqual(2);
        // Verify hint SID resolves cleanly in en.json
        expect(() => resolveSid(recipe.hint_sid)).not.toThrow();
      }
    });

    it('satisfiability property test: every recipe in encounters.json5 is satisfiable in Tang and Fantasy', () => {
      const progression = loadProgression();
      const recipes = progression.encounters;

      const tang = loadEraPack('tang-china');
      const fantasy = loadEraPack('fantasy-mahayana');

      for (const pack of [tang, fantasy]) {
        const practiceMap = new Map(pack.practices.map((p) => [p.id, p.lens]));
        const eraFamilyOf = (practiceId: string): ActivityFamily | null => {
          const lens = practiceMap.get(practiceId);
          return lens !== undefined ? activityFamilyForLens(lens) : null;
        };

        // Collect all activity families supported by this pack
        const supportedFamilies = new Set<ActivityFamily>();
        for (const practice of pack.practices) {
          supportedFamilies.add(activityFamilyForLens(practice.lens));
        }

        for (const recipe of recipes) {
          // If the recipe needs a family, this pack must have at least one practice in that family
          if (recipe.needs.window.family !== undefined) {
            expect(
              supportedFamilies.has(recipe.needs.window.family),
              `Pack ${pack.id} lacks practice for family ${recipe.needs.window.family} needed by ${recipe.id}`,
            ).toBe(true);
          }

          // Pick primary practice matching recipe family, and an other practice for multi-id windows
          const matchingPractices = pack.practices.filter(
            (p) => activityFamilyForLens(p.lens) === (recipe.needs.window.family ?? 'work'),
          );
          const practice = matchingPractices[0]!;
          const otherPractices = pack.practices.filter((p) => p.id !== practice.id);
          const otherPractice = matchingPractices[1] ?? otherPractices[0]!;
          const count = Math.max(6, recipe.needs.window.min_count ?? 5);

          // Construct residue events matching the required kind:
          // - 'outcome': event_resolved is dominant
          // - 'place': spatial (>=2 ids, practice_tick >= 2, !isSocial)
          // - 'person': social (>=2 ids, plus social marker)
          // - 'thing': single id, practice_tick
          let events: ResidueEvent[];
          if (recipe.needs.window.kind === 'outcome') {
            events = Array.from({ length: count }, (_, i) => ({
              tick: i + 1,
              type: 'event_resolved' as const,
              ids: [practice.id],
              numbers: {},
            }));
          } else if (recipe.needs.window.kind === 'place') {
            events = [
              ...Array.from({ length: count - 1 }, (_, i) => ({
                tick: i + 1,
                type: 'practice_tick' as const,
                ids: [practice.id],
                numbers: {},
              })),
              {
                tick: count,
                type: 'practice_tick' as const,
                ids: [otherPractice.id],
                numbers: {},
              },
            ];
          } else if (recipe.needs.window.kind === 'person') {
            events = [
              ...Array.from({ length: count - 1 }, (_, i) => ({
                tick: i + 1,
                type: 'practice_tick' as const,
                ids: [practice.id],
                numbers: {},
              })),
              {
                tick: count,
                type: 'lens_chosen' as const,
                ids: [otherPractice.id],
                numbers: {},
              },
            ];
          } else {
            // 'thing' or undefined kind: pure practice ticks of the single practice
            events = Array.from({ length: count }, (_, i) => ({
              tick: i + 1,
              type: 'practice_tick' as const,
              ids: [practice.id],
              numbers: {},
            }));
          }

          const summary = summarizeResidue(events);

          // Construct pinned cards satisfying recipe.needs.pinned
          const pinned: ManifestFocus[] = recipe.needs.pinned.map((p, idx) => ({
            id: `pin-${idx}`,
            name: `Pinned ${p.kind ?? 'card'}`,
            kind: p.kind ?? 'person',
            one_liner: 'one liner',
            ...(p.tag !== undefined ? { tags: [p.tag] } : {}),
          }));

          const resolved = resolveEncounter(pinned, summary, [recipe], eraFamilyOf);
          expect(
            resolved,
            `Recipe ${recipe.id} failed resolution in pack ${pack.id}`,
          ).not.toBeNull();
          expect(resolved?.figureId).toBe(recipe.figure_id);

          // An unmatched window (e.g. empty window) never fires
          const emptySummary = summarizeResidue([]);
          expect(resolveEncounter(pinned, emptySummary, [recipe], eraFamilyOf)).toBeNull();
        }
      }
    });
  });
});
