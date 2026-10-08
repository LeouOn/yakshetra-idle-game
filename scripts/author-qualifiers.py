"""Author per-row long_fire and rare sentences for the rows that have none.

Task D of revision 3: the shared fallback pools produced sentences like "It was
not hurried, and it shows." and "It carries the settled look of something given
twice the attention it asked for." — generic enough that a player reads them as
filler rather than as something this particular object would say about itself.
THINGS and OUTCOMES rows already author their own; this extends that to CHANGES,
PLACES and the generic PEOPLE rows.

The pools stay. A row with no authored line still has to render, and a pool that
never gets used is not a pool that can dominate a run. What changes is that the
pool stops being the common case.

Figure rows are deliberately untouched: they live in
manifest-catalog-figures.ts, they are a different authoring voice, and the brief
asked for PEOPLE-generic.
"""
import re
import sys

sys.path.insert(0, __file__.rsplit('/', 1)[0])
from write_guard import require_clean  # noqa: E402


PATH = 'src/engine/manifest-catalog.ts'

LINES = {
    # ----------------------------------------------------------------- CHANGES
    'A habit of returning': (
        ' You have not missed a morning yet, and you stopped noticing the not-missing some time before you noticed the habit.',
        ' A practice this old stops being a decision some weeks in, and starts being a thing that would have to be stopped deliberately.',
    ),
    'A lighter pack': (
        ' You packed it slower than it needed, and you would do it slower again.',
        ' Nothing in it will break. That is the point of it.',
    ),
    'A sharper ear': (
        ' You gave it long enough, standing still, and it gave the rest back.',
        ' There is not a second person on this road who can hear it, and you have stopped looking for one.',
    ),
    'A slower morning': (
        ' You did not hurry it, and the morning is still there.',
        ' You will do it again tomorrow, and you already know that.',
    ),
    'You look for a second cup': (
        ' You have not stopped scanning the rack, and you are not going to.',
        ' There has been a place set at your bench for a while now, and no one has mentioned it, which is its own kind of answer.',
    ),
    # ------------------------------------------------------------------ PLACES
    'The night market': (
        ' You went the long way round twice, and stayed longer than the errand needed.',
        ' Every stall-holder here knows which cup is yours, and one of them has started setting it out early.',
    ),
    'The river stair': (
        ' You sat on the middle riser longer than the washing took.',
        ' There is no second stair like it on this bank, and everyone on the water knows which one you mean.',
    ),
    'The dry cistern': (
        ' You went down and looked again, in case the waterlines had moved.',
        ' The water has not been in it in living memory, and the lines are the most careful record anyone kept of it.',
    ),
    'The clock attic': (
        ' You stayed up for all four, and counted them yourself.',
        ' There is one of these, and it has been keeping this city slightly wrong for longer than the city has been here.',
    ),
    'The unlisted quay': (
        ' You walked it twice, and nobody followed you, which is the point of it.',
        ' Somebody is paying to keep the cables greased, and nobody will say who, and everybody uses it.',
    ),
    'The extra seat': (
        ' You laid it again after the sweep, and again after that.',
        ' It has been there every evening since, and no one has ever once asked who it is for.',
    ),
    # ------------------------------------------------------- PEOPLE (generic)
    'Shen the night clerk': (
        ' He stayed on past the curfew to finish the column, and did not mention it to anyone.',
        ' He has not missed a night in nineteen years, and the ledger knows it better than he does.',
    ),
    'Zhao the early courier': (
        ' He waited out the weather with the parcel under his coat, and said nothing about the time it cost him.',
        ' He rides the long way whatever the hour, and there is no parcel in this city he will not carry.',
    ),
    'Auntie Qian the keyholder': (
        ' She turned the lock twice before she let you in, which is her way of saying she was waiting.',
        ' There is one of these keys, and she has never had it copied, and she has never had to.',
    ),
    'Old Lu the ferry counter': (
        ' He re-knotted the cord twice, and neither time was the knot loose.',
        ' Every crossing on this river goes through his hands, and he has never once weighed a man short.',
    ),
    'Master Yan the quiet mender': (
        ' He worked it twice, and would not take the second as payment.',
        ' He has mended the same gate-hung for three owners and will mend it for a fourth, and his price has not moved in twenty years.',
    ),
    'Old Wu the courtyard guest': (
        ' He waited out the whole storm on the step, and did not ask to be let in.',
        ' He is the only living thing on this lane that has never once been hungry here, and there is a reason.',
    ),
    'Elder Cui the evening caller': (
        ' He came in from the last of the rain and stayed past the second bell, talking.',
        ' He has called the evening at this temple for longer than the bell has hung there, and the two are not unrelated.',
    ),
    'Brother De the water-carrier': (
        ' He made the climb twice without being asked the second time.',
        ' There is no spring in this quarter that he does not fill, and no household that has gone thirsty in his lifetime.',
    ),
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
    raise SystemExit('unbalanced')


def lit(s):
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"


def main():
    require_clean(
        [
            'src/engine/manifest-catalog.ts',
        ],
        'the per-row long_fire/rare lines',
    )
    src = open(PATH).read()
    touched = 0
    for row, (long_fire, rare) in LINES.items():
        marker = f"name: '{row}',"
        if marker not in src:
            raise SystemExit(f'row not found: {row}')
        row_at = src.index(marker)
        row_open = src.rindex('{', 0, row_at)
        row_close = match_bracket(src, row_open)
        body = src[row_open:row_close + 1]
        if '    long_fire:' in body:
            print(f'  skip (already authored): {row}')
            continue

        # Qualifiers go after `tags:` and before `templates:`, matching the
        # field order the THINGS and OUTCOMES rows already use.
        t_at = body.find('    templates: [')
        if t_at == -1:
            insert_at = body.rindex('\n') + 1
        else:
            insert_at = t_at
        addition = (f"    long_fire:\n      {lit(long_fire)},\n"
                    f"    rare:\n      {lit(rare)},\n")
        body = body[:insert_at] + addition + body[insert_at:]
        src = src[:row_open] + body + src[row_close + 1:]
        touched += 1
    open(PATH, 'w').write(src)
    print('rows given qualifiers:', touched)


if __name__ == '__main__':
    sys.exit(main())
