"""Author two title/one_liner/detail variants for every OUTCOMES and CHANGES row.

Task C of revision 3: only THINGS rows had title variants, so a second harvest of
the same OUTCOMES or CHANGES row re-served its title verbatim. Each variant is a
different angle on the same row rather than a synonym, so three cards read like
three observations instead of one card with three titles.

The first attempt at this script used `index('\n  },')` to find each row's
closing brace. That is wrong in a way that is invisible until it is catastrophic:
a row's `templates` array is closed at four spaces and the row itself at two,
and the naive search happily lands on the *next* row's brace, so one row
swallowed the next row's variants and the file ended up with `},,`. Rows are
therefore located by their own brace span here, and the insertion point is the
matched bracket — never a string search.
"""
import re
import sys

sys.path.insert(0, __file__.rsplit('/', 1)[0])
from write_guard import require_clean  # noqa: E402


PATH = 'src/engine/manifest-catalog.ts'

VARIANTS = {
    # ---------------------------------------------------------------- OUTCOMES
    'A door that stays open': [
        ('The wedge that holds it',
         'An ash wedge, tapered by a hundred knuckles, keeping the postern off its latch through the whole patrol.',
         'You set it with your heel before you set anything else, and you take it out again at dawn, and nobody has ever asked you why you bother either way.'),
        ('Past the curfew bell',
         'The bolt stays lifted, the lane stays open, and neither of those is a kindness. It is arithmetic.',
         'A carter at the second hour is a carter who will be there again at the fourth, and the market pays for both. You have stopped calling it generosity and started calling it the price of a reputation.'),
    ],
    'A debt settled': [
        ('The stroke that closed it',
         'One brush stroke of vermilion, drawn hard enough to score the mulberry paper underneath.',
         'The man who owed you looked at the mark for a while before he looked at you, and whatever he decided to feel about it he kept to himself. The tab is a tab. That was the whole of it.'),
        ('Settled in bean paste',
         'Three jars of fermented paste and a re-shingled oil press, against an amount that cash could not argue with.',
         'You did the arithmetic twice and it came out the same both times, which is the only reason you slept. The jars are in the cellar now. The tab has a red line through it and no name beside it.'),
    ],
    'A storm that missed': [
        ('Over the southern ridge',
         'The black heads split above the ridge and went on south, and your drying mats got nothing.',
         'You stood in the yard with the lash-rope in both hands and watched it go, and the relief was worse than the fear had been. Nothing was ruined. Nothing was saved either. You lashed the mats anyway.'),
        ('The straw mats, lashed',
         'Every mat on the roof roped down before the wind found the gaps, and the hail landing four valleys away.',
         'It is not a skill anyone teaches you. It is the sort of thing your hands know and you did not, and afterwards you cannot remember deciding to do it.'),
    ],
    'A guest ate': [
        ('Three bowls of hot millet',
         'A drenched stranger, the last of the millet, and a stool nobody had to be asked for.',
         'He ate the way people eat when they have walked a long way in weather, and you sat down and let him get on with it, and that was the whole courtesy. The bowl went back on the rack unwashed for a while after.'),
        ('The hat on the flagstones',
         'A bamboo hat set down steaming on cold stone, and a man who had walked here from the pass.',
         'He left the hat where he dropped it and picked it up again when he was ready to go, and in between he said almost nothing, and you did not make him. The brazier is still warm.'),
    ],
    'A stray stayed': [
        ('On the warm kiln bricks',
         'A scarred yellow cat, three days on the perimeter wall, and then a decision.',
         'It drank the skimmed whey and went straight back up to the bricks it had been watching from, and it has been there every night since. Nobody in this house agreed to feed it. It never asked anyone to.'),
        ('The courtyard, defended',
         'Something yellow and scarred now sleeps where the work ends and the lane begins.',
         'You have stopped trying to work out what it wants. It sits where it sits, it eats what is put down, and the hands that used to try the drying racks have stopped coming by altogether.'),
    ],
    'A name remembered': [
        ('His surname, at the lock',
         'A wandering cooper, greeted by name before he could unroll the permit onto the damp stone.',
         'You said his surname and his home village and the line of porters passed it along behind him like dry kindling catching. By the time the constable got to him he was ordinary business, and nobody looked up twice.'),
        ('The permit, unrolled for nothing',
         'A document that was never needed, and a man who did not have to explain himself.',
         'He kept it in his hand a while after, folded again, and then he did not use it, and you understood that this had not been a courtesy to him. It had been a thing you did because you knew his name.'),
    ],
    # ----------------------------------------------------------------- CHANGES
    'A habit of returning': [
        ('Across the gravel, again',
         "Your feet arrive at the joiner's bench some seconds before you have decided anything.",
         'The bell no longer catches you hesitating at the threshold. You are through the gate, across the gravel, and standing at the bench with your hand already on a blade before the thought of the day has finished forming.'),
        ('The timber already marked',
         'You wake, and the next cut is notched where yesterday left it, and you have not yet opened your eyes to any of it.',
         'Somewhere in the last year the marking stopped being your work and started being how you found your work waiting. You would not call it devotion. You would not correct anyone who did.'),
    ],
    'A lighter pack': [
        ('What stayed at the bottom of the hamper',
         'Rusted tools, dead accounts, and a whole province of roads you never took.',
         'You set them out on the ridge to see what you had been hauling, and it was not gear. It was a set of anxieties wearing the shape of gear, and the wind took the list faster than any river would.'),
        ('The roads you never took',
         'Every mile of the crossing you worried about, and none of the miles you walked.',
         'The roads were not what made the pack heavy. You know that now, and you have not entirely forgiven the roads, and you have stopped packing for them.'),
    ],
    'A sharper ear': [
        ('The ping before the fracture',
         'Stressed iron announces itself a good half-mile before it lets go, if anyone is listening.',
         'You hear it now in a way you could not before, and it is not magic and it is not a gift. It is four years of stopping to look at the thing everyone else walked past, which turns out to be the whole mechanism.'),
        ('Under the road grit',
         'Where there is only creak, there is a dry whistle from an empty axle-box, and it has been there all along.',
         'You cannot switch it off. You have tried, at the market, at the well, in the middle of your own sentence. The world has more noise in it than it used to and you are simply the one standing still enough to notice.'),
    ],
    'A slower morning': [
        ('Before the first market drum',
         'Tools laid out, tea brewed, and the lane still not yet shouting at anyone.',
         'You used to be in the alley before the drum finished, and something in you decided that being early was the same as being useful. It was not. The quarter-hour you take now buys more than the hour you used to save did.'),
        ('The kettle first',
         'A bowl of tea, unasked for by anyone, at the top of a morning that used to begin in a run.',
         'No one is waiting on you. The joiner has his own hands and the queue forms whether you are in it or not. You have made the tea anyway, and you have never once been late because of it.'),
    ],
    'You look for a second cup': [
        ('Two cups, always',
         'The second celadon cup comes off the rack before the kettle has finished, every time.',
         'It stopped being a courtesy some while ago and became a question you ask yourself, and the answer is always yes. There is a place set at your bench. There has been for weeks.'),
        ('The cup opposite yours',
         'One cup, wiped, and set down across the bench in an empty workshop.',
         'You do it with the room empty, which is the part that would not survive being examined. There is no one to give it to. You set it down anyway, and you notice when the wind moves it, and you put it back.'),
    ],
}


def match_bracket(text, i, opener='{', closer='}'):
    depth = 0
    quote = None
    while i < len(text):
        ch = text[i]
        if quote is not None:
            if ch == '\\':
                i += 2
                continue
            if ch == quote:
                quote = None
            i += 1
            continue
        if ch in "'\"":
            quote = ch
            i += 1
            continue
        if ch == opener:
            depth += 1
        elif ch == closer:
            depth -= 1
            if depth == 0:
                return i
        i += 1
    raise SystemExit(f'unbalanced {opener} at {i}')


def lit(s):
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"


def variant_block(variants):
    parts = []
    for name, one_liner, detail in variants:
        parts.append(
            '      {\n'
            f'        name: {lit(name)},\n'
            '        one_liner:\n'
            f'          {lit(one_liner)},\n'
            '        detail:\n'
            f'          {lit(detail)},\n'
            "        tags: ['variant'],\n"
            '      },'
        )
    return '\n'.join(parts)


def main():
    require_clean(
        [
            'src/engine/manifest-catalog.ts',
        ],
        'the OUTCOMES/CHANGES title variants',
    )
    src = open(PATH).read()
    touched = 0
    skipped = 0
    for row, variants in VARIANTS.items():
        marker = f"name: '{row}',"
        if marker not in src:
            raise SystemExit(f'row not found: {row}')
        row_at = src.index(marker)
        # The row object opens on the line *before* its `name:`, so search the
        # whole prefix: nothing else opens a brace between the row's `{` and its
        # first field.
        row_open = src.rindex('{', 0, row_at)
        row_close = match_bracket(src, row_open)
        body = src[row_open:row_close + 1]

        # Idempotence. This script appends, so a second run against a file that
        # already carries the variants duplicates them -- and a duplicated row
        # quietly becomes a duplicated harvest, which is exactly the defect the
        # variants exist to remove. Check before writing, not after.
        already = [v for v in variants if v[0] in body]
        if already:
            print(f'  skip (already authored): {row}')
            skipped += 1
            continue

        t_at = body.find('templates: [')
        if t_at == -1:
            # No templates yet. Insert the array after the row's `tags:` line,
            # which is the last field before the row closes.
            tags_at = body.index('    tags: [')
            tags_end = body.index('\n', tags_at) + 1
            new_body = (body[:tags_end] + '    templates: [\n'
                        + variant_block(variants) + '\n    ],\n' + body[tags_end:])
        else:
            arr_open = body.index('[', t_at)
            arr_close = match_bracket(body, arr_open, '[', ']')
            new_body = (body[:arr_close] + variant_block(variants) + '\n    '
                        + body[arr_close:])

        src = src[:row_open] + new_body + src[row_close + 1:]
        touched += 1
    open(PATH, 'w').write(src)
    print('rows given variants:', touched,
          '| variant templates:', sum(len(v) for v in VARIANTS.values()),
          '| rows skipped as already authored:', skipped)


if __name__ == '__main__':
    sys.exit(main())
