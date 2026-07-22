// String-id resolution for player-facing text.
//
// Every piece of UI text is addressed by a SID (string id) and resolved
// through this module against the locale table (currently English only).
// Inline string literals are forbidden in components; they must go through
// {@link resolveSid}. Unknown or empty SIDs throw rather than rendering blank,
// so a content-reference bug fails loudly instead of shipping silent gaps.

import en from './en.json';

interface StringTable {
  readonly [key: string]: string | StringTable;
}

const table = en as unknown as StringTable;

function walk(path: readonly string[]): string {
  let node: string | StringTable = table;
  for (const segment of path) {
    if (typeof node === 'string') {
      throw new ReferenceError(
        `string id path overflow at '${path.join('.')}': '${segment}' is not a namespace`,
      );
    }
    const next: string | StringTable | undefined = node[segment];
    if (next === undefined) {
      throw new ReferenceError(`unknown string id: '${path.join('.')}'`);
    }
    node = next;
  }
  if (typeof node !== 'string') {
    throw new ReferenceError(`string id '${path.join('.')}' resolves to a namespace, not text`);
  }
  return node;
}

/**
 * Resolve a dotted string id (e.g. `life.reflect.continue_button_sid`) to its
 * localized text. Throws for empty, unknown, or non-leaf ids.
 */
export function resolveSid(sid: string): string {
  if (sid.length === 0) {
    throw new ReferenceError('empty string id');
  }
  return walk(sid.split('.'));
}

/**
 * Resolve a SID and substitute `{placeholder}` tokens. Missing tokens are left
 * untouched; this never throws for substitution reasons (only for unknown SIDs).
 */
export function formatSid(sid: string, values: Readonly<Record<string, string | number>>): string {
  const template = resolveSid(sid);
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const replacement = values[key];
    return replacement === undefined ? match : String(replacement);
  });
}
