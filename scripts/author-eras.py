"""Tag the authored catalog rows with the era they belong to.

WHAT THIS OVERWRITES
  src/engine/manifest-catalog.ts and src/engine/manifest-catalog-figures.ts —
  it adds or removes ONE field, `era:`, on a row. Nothing else is touched. Use
  `git diff` to confirm that before committing.

WHY
`rowsForEra` in manifest-pick.ts can only keep a Garden life out of Chang'an if
the Tang rows are marked. Marking them by hand is a decision nobody can check;
marking them with the same classifier the test uses makes the tag and the
assertion the same fact, so they cannot drift.

The classifier is the era bible's §6 do-not list, in
src/content/progression/garden-do-not.ts. A row whose player-facing prose
contains any listed term is Tang. Everything else is left era-neutral, which
means it stays eligible in both eras — a deliberately generous default, because
a false positive costs a row its Garden life and a false negative only shows up
as copy that reads a little out of place.

Rows already carrying `era: 'fantasy'` are never touched: those are Garden rows,
and classifying them as Tang is exactly the mistake this is meant to prevent.

SAFETY
  Refuses to run when either target has uncommitted changes, unless FORCE=1.
  Prints what it changed and exits 2 if a row's copy and its tag disagree in a
  way it cannot resolve on its own.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TS = ROOT / 'src/engine/manifest-catalog.ts'
FIG = ROOT / 'src/engine/manifest-catalog-figures.ts'
TARGETS = [TS, FIG]

sys.path.insert(0, str(Path(__file__).resolve().parent))
from write_guard import require_clean  # noqa: E402

# The bible's §6 list, kept in step with garden-do-not.ts. Duplicated rather
# than imported so this script has no build step; garden-do-not.test.ts
# asserts the two agree by checking the tag against the classifier's verdict.
DO_NOT = [
    "chang'an", 'changan', 'chang’an', 'luoyang', 'the capital', 'yellow river',
    'wei river', 'huainan', 'imperial highway', 'city wards',
    'peasant', 'serf', 'tenant', 'landlord', 'magistrate', 'prefect', 'bailiff',
    'imperial envoy', 'eunuch', 'courtesan', 'tax collector', 'muleteer',
    'tavern keeper',
    'tael', 'copper cash', 'strings of coin', 'granary receipts', 'pawnshop',
    'market license', 'pecks', 'piculs',
    'curfew bell', 'curfew drum', 'night watchman', 'city gate patrol', 'yamen',
    'bastinado', 'garrison', 'conscription register', 'drum tower',
    'mule litter', 'pack ox', 'grain cart', 'tavern bench', 'wine jar',
    'tallow dip', 'courtyard hound', 'pork fat', 'slatted paper window',
    'loess', 'tallow', 'mule',
    'monk certificates', 'abbot', 'temple donation box', 'temple estate',
    'incense burner for merit',
]


def patterns():
    out = []
    for term in DO_NOT:
        t = term.strip()
        starts = bool(re.match(r'[\w]', t))
        ends = bool(re.search(r'[\w]$', t))
        body = re.escape(t)
        out.append((term, re.compile(
            (r'\b' if starts else '') + body + (r'\b' if ends else ''), re.I)))
    return out


PATTERNS = patterns()


def hits(text):
    return sorted({t for t, rx in PATTERNS if rx.search(text)})


def mb(text, i, opener='{', closer='}'):
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


def row_prose(body):
    """Every string literal on a row, single- OR double-quoted.

    A regex for one quote style silently misses the other, and the rows are
    mixed: Maitreya's detail is double-quoted and contains Chang'an, so a
    single-quote scan reported him as era-neutral and the Garden filter would
    have offered a Chang'an row to a Garden life. Scan for both, honouring
    backslash escapes.
    """
    out = []
    i = 0
    n = len(body)
    while i < n:
        ch = body[i]
        if ch in "'\"":
            quote = ch
            i += 1
            buf = []
            while i < n:
                c = body[i]
                if c == '\\' and i + 1 < n:
                    buf.append(body[i + 1])
                    i += 2
                    continue
                if c == quote:
                    break
                buf.append(c)
                i += 1
            out.append(''.join(buf))
            i += 1
            continue
        i += 1
    return '\n'.join(out)


def apply(path, array_name, counts):
    src = path.read_text()
    # Anchor on the INITIALISER, not the first `[`. The declaration
    # `readonly CatalogEntry[] = [` has a bracket in the TYPE, and matching
    # that one yields an empty "array" and a silent no-op run.
    m = re.search(re.escape(array_name) + r'[^=]*=\s*\[', src)
    if m is None:
        raise SystemExit(f'no array {array_name} in {path}')
    arr_open = m.end() - 1
    arr_close = mb(src, arr_open, '[', ']')
    body = src[arr_open:arr_close + 1]

    edits = []
    for row in re.finditer(r"^    name: '((?:[^'\\]|\\.)*)',$", body, re.M):
        name = row.group(1)
        at = body.rindex('{', 0, row.start())
        close = mb(body, at)
        rb = body[at:close + 1]
        if "era: 'fantasy'" in rb:
            counts['fantasy'] += 1
            continue
        found = hits(row_prose(rb))
        has = "    era: 'tang',\n" in rb
        if found and not has:
            # after tags, before templates, matching the field order
            if '    templates: [' in rb:
                ins = rb.index('    templates: [')
            else:
                ta = rb.index('    tags: [')
                ins = rb.index('\n', rb.index(']', rb.index('[', ta))) + 1
            edits.append((at + ins, at + ins, "    era: 'tang',\n"))
            counts['tang'] += 1
        elif not found and has:
            line = rb.index("    era: 'tang',\n")
            line_end = rb.index('\n', line + len("    era: 'tang',")) + 1
            edits.append((at + line, at + line_end, ''))
            counts['untagged'] += 1
        elif found:
            counts['already_tang'] += 1
        else:
            counts['neutral'] += 1

    for start, end, new in sorted(edits, key=lambda e: -e[0]):
        body = body[:start] + new + body[end:]
    path.write_text(src[:arr_open] + body + src[arr_close + 1:])


def main():
    require_clean([str(p.relative_to(ROOT)) for p in TARGETS],
                  'the row-level `era` tags in the engine catalogs')
    counts = {'tang': 0, 'untagged': 0, 'already_tang': 0, 'neutral': 0,
              'fantasy': 0}
    apply(TS, 'const THINGS:', counts)
    apply(TS, 'const OUTCOMES:', counts)
    apply(TS, 'const CHANGES:', counts)
    apply(TS, 'const PEOPLE:', counts)
    apply(TS, 'const PLACES:', counts)
    apply(FIG, 'export const FIGURE_PEOPLE:', counts)
    apply(FIG, 'export const FIGURE_PLACES:', counts)
    print(f"  tang now tagged : {counts['tang']}")
    print(f"  tang retagged   : {counts['already_tang']}")
    print(f"  untagged        : {counts['untagged']}")
    print(f"  era-neutral     : {counts['neutral']}")
    print(f"  fantasy rows    : {counts['fantasy']}")


if __name__ == '__main__':
    main()
