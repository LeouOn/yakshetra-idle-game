"""Shared write-safety guard for the catalog authoring scripts.

Every script in scripts/ that rewrites a checked-in file runs `require_clean`
against that file first. The rule exists because of a real incident: a
`git checkout -- src/engine/manifest-catalog.ts` in a shared tree destroyed a
full day of uncommitted catalog authoring, and it was recovered only because a
generated JSON5 mirror happened to be a faithful snapshot.

These scripts are exactly the kind of tool that turns a small mistake into a
lost day, so they refuse to write over uncommitted work unless forced.

To proceed deliberately, either commit the file or set FORCE=1:

    FORCE=1 python3 scripts/author-variants.py
"""
import os
import subprocess
import sys


def _run(args):
    return subprocess.run(args, capture_output=True, text=True)


def dirty_paths(paths):
    """Tracked paths with uncommitted changes, plus untracked new files."""
    dirty = set()
    diff = _run(['git', 'status', '--porcelain', '--', *paths])
    if diff.returncode != 0:
        return None  # not a git tree; refuse to guess
    for line in diff.stdout.splitlines():
        if len(line) < 4:
            continue
        code, name = line[:2], line[3:].strip()
        if ' -> ' in name:  # rename: report the destination
            name = name.split(' -> ', 1)[1]
        if code.strip() or '?' in code:
            dirty.add(name)
    return dirty


def require_clean(paths, what):
    """Exit unless every path in `paths` is committed and unmodified.

    FORCE=1 downgrades this to a loud warning, so an override is always a
    deliberate act and never a silent one.
    """
    if os.environ.get('FORCE') == '1':
        print(f'FORCE=1: overwriting {what} regardless of working-tree state:')
        for p in paths:
            print(f'  {p}')
        return

    dirty = dirty_paths(paths)
    if dirty is None:
        print('refusing to run: not inside a git work tree.', file=sys.stderr)
        print(f'would overwrite: {", ".join(paths)}', file=sys.stderr)
        sys.exit(2)

    if dirty:
        print('refusing to run: uncommitted changes in the files this writes.',
              file=sys.stderr)
        print(f'script    : {what}', file=sys.stderr)
        print('would write:', file=sys.stderr)
        for p in paths:
            ps = str(p)
            mark = '*' if ps in dirty or any(ps in str(d) for d in dirty) else ' '
            print(f'  {mark} {p}', file=sys.stderr)
        print('\n* uncommitted. Commit it, or re-run with FORCE=1 if you are',
              file=sys.stderr)
        print('  certain the script will not destroy work.', file=sys.stderr)
        print('\nTo read an old version without overwriting the file:',
              file=sys.stderr)
        print('  git show HEAD:<path>', file=sys.stderr)
        sys.exit(2)

    print(f'clean: {what}')
    for p in paths:
        print(f'  {p}')
