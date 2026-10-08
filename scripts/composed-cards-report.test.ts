// Report generator for docs/design/eval/05-composed-cards.md.
//
// This is a generator, not an assertion: it WRITES a checked-in document. It is
// therefore inert unless explicitly asked for, so `pnpm test` never rewrites the
// report as a side effect. Run it with:
//
//   YAKSHETRA_WRITE_REPORT=1 \
//   env -u ZAI_API_KEY -u MINIMAX_API_KEY -u YAK_FILLER_PROVIDER \
//   pnpm exec vitest run scripts/report.vitest.config.ts
//
// It lives in the repo rather than in /tmp because it was lost twice: a /tmp
// wipe took the first copy, and then the report became impossible to regenerate
// without rewriting the generator from scratch. Every input is deterministic —
// the seeds are literals below and the archive threads through in order — so the
// same checkout always produces the same document.
//
// The measurements it prints are deliberately the ones a reader can check by
// looking, not a distinctness percentage. See docs/design/card-template-guide.md
// for why that number was abandoned.

import { writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';

import {
  createRng,
  summarizeResidue,
  tableFillManifest,
  type KindRule,
  type LifeContext,
  type ResidueEvent,
} from '../src/engine';
import type { ManifestFire } from '../src/engine/manifest';
import { loadEraPack } from '../src/content/loader';
import { resolveSid } from '../src/i18n';

const TANG = resolveSid(loadEraPack('tang-china').name_sid);
const FANTASY = resolveSid(loadEraPack('fantasy-mahayana').name_sid);

const OUT = 'docs/design/eval/05-composed-cards.md';

/** Whole-word mechanic vocabulary. Authored row copy is exempt from this. */
const BANNED = [
  'window',
  'cook',
  'tier',
  'bay',
  'residue',
  'manifest',
  'batch',
  'archive',
  'slot',
] as const;

const TIES = [
  'relationship:old-wu',
  'relationship:auntie-qian',
  'cast:shen-the-night-clerk',
  null,
] as const;

const WINDOW: ResidueEvent[] = [
  { tick: 1, type: 'practice_tick', ids: ['practice:tang/alms-round'], numbers: { progress: 2 } },
  { tick: 2, type: 'practice_tick', ids: ['practice:tang/alms-round'], numbers: { progress: 2 } },
  { tick: 3, type: 'practice_tick', ids: ['bench:person'], numbers: { progress: 2 } },
];

const FIGURE_WINDOW: ResidueEvent[] = [
  {
    tick: 1,
    type: 'practice_tick',
    ids: ['practice:tang/nianfo-recitation'],
    numbers: { progress: 3 },
  },
  { tick: 2, type: 'practice_tick', ids: ['mantra:nianfo'], numbers: { progress: 3 } },
  { tick: 3, type: 'lens_chosen', ids: ['lens:collected_attention'], numbers: {} },
];

function force(kind: string): KindRule[] {
  return [{ kind, match: { dominant: WINDOW[0]?.type ?? 'practice_tick' } }];
}

function ctx(i: number, era: string, hour: number, tie: string | null): LifeContext {
  return {
    schema_version: 'life_context/v0',
    life_id: `life-${i}`,
    age: 19 + ((i * 7) % 44),
    turn: i,
    alive: true,
    lens: ['patient_courage', 'generosity', 'discernment', 'joyful_effort'][i % 4] ?? null,
    setting: {
      era_id: era === TANG ? 'tang-china' : 'fantasy-mahayana',
      era_name: era,
      role_id: 'peasant',
      role_name: 'Peasant farmer',
      year: 742 + (i % 9),
      month: 1 + (i % 12),
      day: 1 + (i % 28),
      hour,
      calendar_label: `Year ${742 + (i % 9)}`,
    },
    ties: [],
    strongest_tie: tie,
    flags: [],
    residue_summary: summarizeResidue(WINDOW),
    activity: { work: 12, generosity: 3, beings: 1, learning: 0, meditation: 2, other: 0 },
    world_name: null,
    world_line: null,
  };
}

interface Spec {
  readonly kind: string;
  readonly era: string;
  readonly hour: number;
  readonly fire: ManifestFire;
  readonly brief: string | null;
  readonly tie: string | null;
  readonly figure?: boolean;
  readonly label: string;
}

const SPECS: Spec[] = [];
for (const kind of ['thing', 'outcome', 'change', 'person', 'place']) {
  for (let n = 0; n < 6; n += 1) {
    SPECS.push({
      kind,
      era: n % 2 === 0 ? TANG : FANTASY,
      hour: (n * 5 + 2) % 24,
      fire: n % 3 === 0 ? 'long' : 'short',
      brief: null,
      tie: TIES[n % TIES.length] ?? null,
      label: '',
    });
  }
}
SPECS[0] = { ...SPECS[0]!, brief: 'something heavy enough to carry all day', label: 'briefed' };
SPECS[29] = { ...SPECS[29]!, figure: true, fire: 'long', label: 'figure + long fire' };

interface Card {
  readonly name: string;
  readonly one_liner: string;
  readonly subject: string;
  readonly detail: string;
  readonly era: string;
  readonly kind: string;
  readonly fire: ManifestFire;
  readonly rarity: string;
  readonly hour: number;
  readonly label: string;
}

describe('05-composed-cards report', () => {
  it('writes the report when explicitly asked', () => {
    if (process.env.YAKSHETRA_WRITE_REPORT !== '1') {
      // Inert by default. This writes a tracked file; a test suite must not do
      // that behind someone's back.
      return;
    }

    const cards: Card[] = [];
    const details: string[] = [];
    const titles: string[] = [];
    const lines: string[] = [];

    for (const [i, maybeSpec] of SPECS.entries()) {
      const spec = maybeSpec;
      if (spec === undefined) {
        continue;
      }
      const rng = createRng(4099551n + BigInt(i) * 977n);
      const m = tableFillManifest(
        spec.figure === true ? FIGURE_WINDOW : WINDOW,
        spec.brief,
        i % 5 === 0 ? 1 : 0,
        rng,
        `r${i}`,
        `card-${i + 1}`,
        null,
        ctx(i, spec.era, spec.hour, spec.tie),
        'person',
        spec.figure === true ? undefined : force(spec.kind),
        undefined,
        details,
        spec.fire,
        undefined,
        titles,
      );
      details.push(m.detail);
      titles.push(`${m.name} ${m.one_liner}`);
      cards.push({
        name: m.name,
        one_liner: m.one_liner,
        subject: m.subject,
        detail: m.detail,
        era: spec.era,
        kind: m.kind,
        fire: spec.fire,
        rarity: m.rarity,
        hour: spec.hour,
        label: spec.label,
      });

      const tag = [
        spec.label !== '' ? spec.label : '',
        `kind: \`${m.kind}\``,
        `fire: \`${spec.fire}\``,
        `rarity: \`${m.rarity}\``,
        `era: ${spec.era}`,
        `hour: ${spec.hour}`,
      ]
        .filter(Boolean)
        .join(' · ');

      lines.push(
        `### ${i + 1}. ${m.name}`,
        '',
        `*${tag}*`,
        '',
        `- **one_liner** — ${m.one_liner}`,
        `- **subject** — ${m.subject}`,
        `- **detail** — ${m.detail}`,
        '',
      );
    }

    // --- five consecutive cards from one kind, archive threaded through ---
    const runDetails: string[] = [];
    const runTitles: string[] = [];
    const runNames: string[] = [];
    const runCards: {
      name: string;
      oneLiner: string;
      detail: string;
      fire: ManifestFire;
      era: string;
      rarity: string;
    }[] = [];
    for (let n = 0; n < 5; n += 1) {
      const rng = createRng(6600555n + BigInt(n) * 89n);
      const fire: ManifestFire = n % 2 === 0 ? 'long' : 'short';
      const era = n % 2 === 0 ? TANG : FANTASY;
      const m = tableFillManifest(
        WINDOW,
        null,
        0,
        rng,
        `run-${n}`,
        `run-${n + 1}`,
        null,
        ctx(100 + n, era, (n * 4 + 3) % 24, TIES[n % TIES.length] ?? null),
        'person',
        force('thing'),
        undefined,
        runDetails,
        fire,
        undefined,
        runTitles,
      );
      runDetails.push(m.detail);
      runTitles.push(`${m.name} ${m.one_liner}`);
      runNames.push(m.name);
      runCards.push({
        name: m.name,
        oneLiner: m.one_liner,
        detail: m.detail,
        fire,
        era,
        rarity: m.rarity,
      });
    }

    // --- E: the same window, three different briefs, side by side ---
    // The brief-steering test passes, but a passing test is not a card anyone
    // has read. This is the evidence: one row, one seed, three briefs, three
    // cards. Two of the three change the title as well as the body, which is
    // the part that matters — a brief that only rewords the body reads like a
    // paraphrase, not like an answer.
    const DEMO_BRIEFS = [
      'nothing fragile has spilled on the road',
      'being early in the alley before the drum',
      'the joiner has his own hands and the queue forms',
    ];
    const demoRules: KindRule[] = [{ kind: 'change', match: { dominant: 'practice_tick' } }];
    const demoCards = DEMO_BRIEFS.map((brief, n) => {
      const m = tableFillManifest(
        WINDOW,
        brief,
        0,
        createRng(1234n),
        `demo-${n}`,
        `demo-${n}`,
        null,
        ctx(500 + n, TANG, 11, 'relationship:auntie-qian'),
        'person',
        demoRules,
        undefined,
        [],
        'short',
        undefined,
        [],
      );
      return { brief, name: m.name, oneLiner: m.one_liner, detail: m.detail };
    });

    // --- measures a reader can check ---
    const tieRe = /Auntie Qian|Old Wu|Shen the night clerk/;
    const footerRe =
      /It is year \d+|Closest tie\b|in Late Tang China\b|tang-china|\bpeasant farmer\b/i;
    const bannedRe = new RegExp(`\\b(${[...BANNED].join('|')})\\b`, 'i');
    const n = cards.length;
    const withTie = cards.filter((c) => tieRe.test(c.detail)).length;
    const withFooter = cards.filter((c) => footerRe.test(c.detail)).length;
    const withBanned = cards.filter((c) => bannedRe.test(c.detail)).length;
    const titleSet = new Set(titles).size;
    const detailSet = new Set(details).size;
    const tang = cards.filter((c) => c.era === TANG).map((c) => c.detail);
    const fantasy = cards.filter((c) => c.era === FANTASY).map((c) => c.detail);
    const both = new Set(tang.filter((d) => fantasy.includes(d))).size;
    const counts: Record<string, number> = {};
    for (const c of cards) {
      counts[c.kind] = (counts[c.kind] ?? 0) + 1;
    }

    const runBlock = runCards
      .map((c, n2) =>
        [
          `**${n2 + 1}. ${c.name}** — *${c.rarity}, fire \`${c.fire}\`, ${c.era}*`,
          '',
          `> ${c.oneLiner}`,
          '>',
          `> ${c.detail}`,
          '',
        ].join('\n'),
      )
      .join('\n');

    const body = [
      '# 05 — Composed cards, read aloud',
      '',
      '**Seat:** dev-b2 · **Wave:** 1, revision 2 · **Queue:** `qitem-20261003072257-9778eae9`',
      '',
      'Thirty cards from the real `tableFillManifest` path through `src/engine/card-composer.ts`,',
      'plus a run of five consecutive cards from one kind. Every string below is verbatim engine',
      'output — nothing is hand-edited. Each card was compiled with the archive of the cards',
      'above it already in hand, so row and template dedup were both live.',
      '',
      '> This is the **second** pass. The first one scored 96–98% distinct detail strings and',
      '> that number was worthless: a footer printed the year, the era and the activity totals on',
      '> every card, so two identical cards differed as strings while the player read the same',
      '> card twice. The footer is gone. Everything measured below is something a reader can',
      '> check by looking.',
      '',
      '## What is measured',
      '',
      '| Measure | Result |',
      '| --- | --- |',
      `| Cards carrying a year / era / tie / activity footer | **${withFooter} / ${n}** |`,
      `| Cards naming a mechanic (${[...BANNED].join(', ')}) | **${withBanned} / ${n}** |`,
      `| Cards naming a tie | **${withTie} / ${n}** (${Math.round((withTie / n) * 1000) / 10}%, ceiling is a third) |`,
      `| Distinct titles across ${n} cards | **${titleSet} / ${n}** |`,
      `| Distinct details across ${n} cards | ${detailSet} / ${n} — reported for completeness, not as a bar |`,
      `| Cards identical between the Tang and Fantasy runs | ${both} |`,
      '',
      '**Kind spread:** ' +
        Object.entries(counts)
          .map(([k, v]) => `${k} ${v}`)
          .join(' · '),
      '',
      '**On ties.** Three quarters of the cards above were compiled with a tie in context, and',
      `${withTie} of them named it. That is well under the ceiling, and the honest reading is`,
      'that the `{{tie}}` templates are too thinly spread: 14 rows carry one, out of 45, so a',
      'given card lands on one only by luck. Under-using the slot is safer than over-using it,',
      'so this is a content gap to close next, not a rule to relax.',
      '',
      '**Five consecutive `thing` cards** are the last section. The first version of this report',
      'had no such run, which is why it could claim variety it never showed: consecutive cards',
      'were not a thing anyone looked at.',
      '',
      '**Content gaps, stated rather than hidden.** All 31 non-figure rows now author their',
      'own `long_fire` and `rare`, and every `outcome` and `change` row carries two title',
      'variants, so a run of those kinds no longer re-serves its row title. The remaining gap',
      'is era-specific templates: only `thing` has them, so the other four kinds read as a',
      'Tang workshop in a different year. See `docs/design/card-template-guide.md` §8.',
      '',
      '---',
      '',
      lines.join('\n'),
      '---',
      '',
      '## One window, three briefs',
      '',
      'Same residue window, same seed, same row (`A slower morning`). Only the brief',
      'changes. Each brief is answered by the template whose own copy already contains',
      'that vocabulary, so the request picks the phrasing instead of being appended to it',
      'as a note. Two of the three change the **title** as well as the body.',
      '',
      ...demoCards.flatMap((c) => [
        `**brief: _${c.brief}_**`,
        '',
        `*${c.name}*`,
        '',
        `> ${c.oneLiner}`,
        '>',
        `> ${c.detail}`,
        '',
      ]),
      '---',
      '',
      '## Five consecutive `thing` cards',
      '',
      'Same kind, archive threaded through each one, alternating era and fire.',
      `**${new Set(runNames).size} distinct names across 5 consecutive cards.**`,
      '',
      runBlock,
    ].join('\n');

    writeFileSync(OUT, `${body}\n`);
    process.stdout.write(
      `\n  wrote ${n} cards to ${OUT}\n` +
        `  footer ${withFooter} · banned ${withBanned} · tie ${withTie} · titles ${titleSet} · era-shared ${both}\n`,
    );
  });
});
