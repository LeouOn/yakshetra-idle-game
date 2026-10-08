"""Rebuild the five core kind arrays in src/engine/manifest-catalog.ts from the
shipped JSON5 mirror.

WHAT THIS OVERWRITES
  src/engine/manifest-catalog.ts  -- the five core arrays (THINGS, OUTCOMES,
  CHANGES, PEOPLE, PLACES) and nothing else in the file. Everything else,
  including the figure-table imports and the CATALOG map, is preserved.

WHY IT EXISTS
  A `git checkout -- src/engine/manifest-catalog.ts` in a shared tree destroyed a
  full day of uncommitted catalog authoring. It was recovered only by luck: the
  JSON5 mirror had been regenerated from the live engine moments earlier and the
  mirror test was green, so it was a faithful snapshot of what was lost.

  This is now the documented recovery path. Run it whenever the engine catalog
  and the mirror have drifted.

THREE THINGS THIS HAS TO GET RIGHT

  1. The mirror's `person` and `place` tables are already MERGED with the figure
     tables, because they are generated from the runtime CATALOG. Writing that
     merged list into PEOPLE and letting CATALOG re-merge it double-counts every
     figure row. So figure rows are split back out here and left to
     manifest-catalog-figures.ts, which is the module that owns them.
  2. The file must not declare its own `CatalogEntry`. The type lives in
     ./table-catalog; a second, narrower copy is how `templates` ends up
     type-checking in one place and not the other.
  3. The mirror is JSON5, which Python cannot parse. It is read through the
     repo's own `json5` package via node, so this script has no dependency
     outside the repository and nothing cached in /tmp.

SAFETY
  Refuses to run when the target file has uncommitted changes, unless FORCE=1.
  See write_guard.py.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TS = ROOT / 'src/engine/manifest-catalog.ts'
JSON5 = ROOT / 'src/content/progression/base/catalogs.json5'
CORE_KINDS = ('thing', 'outcome', 'change', 'person', 'place')

sys.path.insert(0, str(Path(__file__).resolve().parent))
from write_guard import require_clean  # noqa: E402

CATALOG_MAP = """export const CATALOG: CatalogMap = {
  thing: THINGS,
  outcome: OUTCOMES,
  change: CHANGES,
  person: [...PEOPLE, ...FIGURE_PEOPLE],
  place: [...PLACES, ...FIGURE_PLACES],
};
"""

KIND_TO_CONST = {
    'thing': 'THINGS', 'outcome': 'OUTCOMES', 'change': 'CHANGES',
    'person': 'PEOPLE', 'place': 'PLACES',
}
# Row-level qualifiers, in the field order the authored rows already use.
QUALIFIERS = ('long_fire', 'rare')
# Template-level fields that are copied when present.
TEMPLATE_FIELDS = ('name', 'one_liner', 'subject', 'gate', 'flourish', 'era',
                   'long_fire', 'rare')


def require_clean_for_this_script():
    require_clean(
        [str(TS.relative_to(ROOT))],
        'the five core catalog arrays in src/engine/manifest-catalog.ts',
    )


def read_mirror():
    """Parse the JSON5 mirror through the repo's own json5 package."""
    script = (
        "const J=require('json5'),fs=require('fs');"
        f"const d=J.parse(fs.readFileSync({str(JSON5)!r},'utf8'));"
        "const out={};"
        "for (const k of " + repr(list(CORE_KINDS)) + ") {"
        "  const t=d.catalogs.find(x=>x.kind===k);"
        "  if (t) out[k]=t.entries;"
        "}"
        "process.stdout.write(JSON.stringify(out));"
    )
    proc = subprocess.run(['node', '-e', script], cwd=ROOT,
                          capture_output=True, text=True)
    if proc.returncode != 0:
        raise SystemExit(f'could not read the JSON5 mirror:\n{proc.stderr}')
    return json.loads(proc.stdout)


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
    raise SystemExit(f'unbalanced {opener}')


def lit(v):
    return "'" + v.replace('\\', '\\\\').replace("'", "\\'") + "'"


def render_entry(row):
    o = ['  {', f"    name: {lit(row['name'])},"]
    o.append('    one_liner:')
    o.append(f"      {lit(row['one_liner'])},")
    o.append(f"    subject: {lit(row['subject'])},")
    o.append('    detail:')
    o.append(f"      {lit(row['detail'])},")
    for k in QUALIFIERS:
        if row.get(k):
            o.append(f'    {k}:')
            o.append(f"      {lit(row[k])},")
    o.append(f"    tags: [{', '.join(lit(t) for t in row['tags'])}],")
    tpls = row.get('templates')
    if tpls:
        o.append('    templates: [')
        for t in tpls:
            o.append('      {')
            for k in TEMPLATE_FIELDS:
                if t.get(k):
                    o.append(f'        {k}:')
                    o.append(f"          {lit(t[k])},")
            o.append('        detail:')
            o.append(f"          {lit(t['detail'])},")
            if t.get('tags'):
                o.append('        tags: ['
                         + ', '.join(lit(x) for x in t['tags']) + '],')
            o.append('      },')
        o.append('    ],')
    o.append('  },')
    return '\n'.join(o)


def main():
    require_clean_for_this_script()
    core = read_mirror()
    # Split figure rows back out: CATALOG re-merges them from the figure module.
    for kind in ('person', 'place'):
        core[kind] = [r for r in core[kind]
                      if not any(t.startswith('figure:') for t in r['tags'])]

    # Read the committed version of this file for its SKELETON only -- the
    # header comment, the figure import, and the CATALOG map at the bottom.
    # A previous version of this script spliced the arrays in place instead,
    # which meant that anything a prior incident had already broken OUTSIDE an
    # array span was carried straight through into the "repaired" file. Building
    # the file from committed structure + mirror content has no such gap.
    skel = subprocess.run(
        ['git', 'show', f'HEAD:{TS.relative_to(ROOT)}'],
        cwd=ROOT, capture_output=True, text=True).stdout
    if not skel:
        raise SystemExit('could not read the committed skeleton (git show failed)')

    header = skel[:skel.index('export interface CatalogEntry')]
    header = header.replace(
        "import { FIGURE_PEOPLE, FIGURE_PLACES } from './manifest-catalog-figures';",
        "import { FIGURE_PEOPLE, FIGURE_PLACES } from './manifest-catalog-figures';\n"
        "import type { CatalogEntry, CatalogMap } from './table-catalog';\n"
        "\n"
        "// The single definition of a catalog row lives in ./table-catalog, which also\n"
        "// carries CardTemplate. A second, narrower interface here is how `templates`\n"
        "// ends up type-checking in one place and failing in another.\n"
        "export type { CatalogEntry, CatalogMap } from './table-catalog';")

    parts = [header.rstrip('\n'), '']
    for kind, const in KIND_TO_CONST.items():
        body = '\n'.join(render_entry(r) for r in core[kind])
        parts.append(f'const {const}: readonly CatalogEntry[] = [\n{body}\n];\n')
    parts.append(CATALOG_MAP)
    TS.write_text('\n'.join(parts))
    print('wrote', len('\n'.join(parts).splitlines()), 'lines;',
          {k: len(v) for k, v in core.items()})


if __name__ == '__main__':
    main()
