import { describe, it } from 'vitest';
import {
  assembleWorldDraft,
  assembleWorldDraftAtScale,
  type Manifest,
  type ManifestScale,
} from '../';

function mkCard(
  kind: Manifest['kind'],
  id: string,
  name: string,
  scale: ManifestScale,
  one_liner: string,
  subject?: string,
): Manifest {
  return {
    schema_version: 'manifest/v1',
    scale,
    id,
    rng_seed: '1',
    brief: null,
    residue_window_id: 'w-1',
    kind,
    name,
    one_liner,
    subject: subject ?? name,
    detail: 'detail',
    tags: ['eval'],
    rarity: 'common',
    fill_status: 'table',
    quality_tier: 0,
    provenance: { source: 'table', revision: 'table/v0' },
  };
}

describe('generate 12 drafts for 09-world-drafts.md', () => {
  it('prints 12 verbatim drafts', () => {
    const tangDrafts = [
      // 1. Person: Shen the night clerk + The night market
      assembleWorldDraft([
        mkCard(
          'person',
          'tang-p1',
          'Shen the night clerk',
          'person',
          'He works his abacus by tallow dip, noting tea and grain before you recall what was spent.',
        ),
        mkCard(
          'place',
          'tang-pl1',
          'The night market',
          'person',
          'Oiled paper lanterns illuminate rows of noodle cauldrons and scrap-iron stalls along the west canal.',
          'canal-side stalls after curfew',
        ),
      ])!,
      // 2. Person: Amitābha + The river stair
      assembleWorldDraft([
        mkCard(
          'person',
          'tang-p2',
          'Amitābha',
          'person',
          'He leans out from the west with an open palm, and it is not the gesture you expect.',
        ),
        mkCard(
          'place',
          'tang-pl2',
          'The river stair',
          'person',
          'Forty granite slabs cut with high-water marks and worn smooth by the bare feet of three dynasties.',
          'granite slabs down to the ferry slip',
        ),
      ])!,
      // 3. Household: The dumpling fold + The hall beam
      assembleWorldDraftAtScale(
        [
          mkCard(
            'tradition',
            'tang-h1',
            'The dumpling fold',
            'household',
            'A pinch the family passes before the new year.',
          ),
          mkCard(
            'place',
            'tang-h2',
            'The hall beam',
            'household',
            'The plank that holds up the room where everyone argues.',
          ),
        ],
        'household',
      )!,
      // 4. Org: The weavers\' charter + The stamped roof tiles
      assembleWorldDraftAtScale(
        [
          mkCard(
            'charter',
            'tang-o1',
            "The weavers' charter",
            'org',
            'One width of cloth, one price, sworn before the looms.',
          ),
          mkCard(
            'thing',
            'tang-o2',
            'The stamped roof tiles',
            'org',
            'Every tile on the hall carries the same thumb-wide seal.',
          ),
        ],
        'org',
      )!,
      // 5. Town: The bell tower at dusk + The grain-counting day
      assembleWorldDraftAtScale(
        [
          mkCard(
            'landmark',
            'tang-t1',
            'The bell tower at dusk',
            'town',
            'The town tells its time by a tower with no clock face.',
          ),
          mkCard(
            'thing',
            'tang-t2',
            'The grain-counting day',
            'town',
            'The whole town spends a day agreeing on the number.',
          ),
        ],
        'town',
      )!,
      // 6. City: The watch\'s muster hall + The relief bureau
      assembleWorldDraftAtScale(
        [
          mkCard(
            'place',
            'tang-c1',
            "The watch's muster hall",
            'city',
            "The room where the city's lanterns line up before dusk.",
          ),
          mkCard(
            'place',
            'tang-c2',
            'The relief bureau',
            'city',
            'Where a hungry household learns whether the city remembers it.',
          ),
        ],
        'city',
      )!,
    ];

    const fantasyDrafts = [
      // 7. Person: Cor, the bell striker + The Bell Pavilion
      assembleWorldDraft([
        mkCard(
          'person',
          'fan-p1',
          'Cor, the bell striker',
          'person',
          'Still at the cedar pillar, mallet held in, giving the nod before the one note.',
        ),
        mkCard(
          'place',
          'fan-pl1',
          'The Bell Pavilion',
          'person',
          'A low-hung bronze bell in four cedar posts, close enough to feel it arrive.',
          'four posts and a low-hung bell',
        ),
      ])!,
      // 8. Person: Mire, the water tender + The Twin Fountains terrace
      assembleWorldDraft([
        mkCard(
          'person',
          'fan-p2',
          'Mire, the water tender',
          'person',
          'Skimming the slow reach and watching the current at the sluice.',
        ),
        mkCard(
          'place',
          'fan-pl2',
          'The Twin Fountains terrace',
          'person',
          'Two low basins and the straight worn line of flags walked between them.',
          'flagstones between two low basins',
        ),
      ])!,
      // 9. Household: The needle case + The bowl on the sill
      assembleWorldDraftAtScale(
        [
          mkCard(
            'thing',
            'fan-h1',
            'The needle case',
            'household',
            'A bamboo tube with three needles and a story per slot.',
          ),
          mkCard(
            'thing',
            'fan-h2',
            'The bowl on the sill',
            'household',
            'A brown earthenware bowl kept by the pot and not in the cupboard, for whoever turns up after the household has eaten.',
          ),
        ],
        'household',
      )!,
      // 10. Org: The celadon glazes + Six-leaf rule
      assembleWorldDraftAtScale(
        [
          mkCard(
            'thing',
            'fan-o1',
            'The celadon glazes',
            'org',
            'Greens the kiln finds once in twenty firings.',
          ),
          mkCard(
            'thing',
            'fan-o2',
            'Six-leaf rule',
            'org',
            'A six-fold boxwood rule with flat brass pins, unhurried in the hand, and the only straight edge in the workshop.',
          ),
        ],
        'org',
      )!,
      // 11. Town: The unlisted quay + Lantern night
      assembleWorldDraftAtScale(
        [
          mkCard(
            'place',
            'fan-t1',
            'The unlisted quay',
            'town',
            'A hidden stone wharf tucked behind weeping willows where uninspected barges discharge their cargo before dawn.',
          ),
          mkCard(
            'thing',
            'fan-t2',
            'Lantern night',
            'town',
            'Oiled paper lanterns strung along the canal wire before dusk settles.',
          ),
        ],
        'town',
      )!,
      // 12. Region: The southern ridge + The mountain pass
      assembleWorldDraftAtScale(
        [
          mkCard(
            'place',
            'fan-r1',
            'The southern ridge',
            'region',
            'The black heads split above the ridge and went on south, and your drying mats got nothing.',
          ),
          mkCard(
            'place',
            'fan-r2',
            'The mountain pass',
            'region',
            'A cold track through limestone where carts must drop their trailing axle.',
          ),
        ],
        'region',
      )!,
    ];

    console.log('=== TANG DRAFTS ===');
    tangDrafts.forEach((d, i) => {
      console.log(`[Tang ${i + 1}]`);
      console.log(`Name: ${d.name}`);
      console.log(`Line: ${d.one_liner}`);
      console.log(`Cast: ${d.cast.map((c) => c.name).join(', ') || '(none)'}`);
      console.log(`Places: ${d.places.map((p) => p.name).join(', ') || '(none)'}`);
      console.log('---');
    });

    console.log('=== FANTASY DRAFTS ===');
    fantasyDrafts.forEach((d, i) => {
      console.log(`[Fantasy ${i + 1}]`);
      console.log(`Name: ${d.name}`);
      console.log(`Line: ${d.one_liner}`);
      console.log(`Cast: ${d.cast.map((c) => c.name).join(', ') || '(none)'}`);
      console.log(`Places: ${d.places.map((p) => p.name).join(', ') || '(none)'}`);
      console.log('---');
    });
  });
});
