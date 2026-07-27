// Statically-bundled era pack registry.
//
// Imports every pack.json5 / events.json5 / endings.json5 from the two shipped
// eras (tang-china, fantasy-mahayana). The bundler (Metro for web/native via
// scripts/json5-transformer.js, Vite for vitest via the plugin in
// vitest.config.ts) inlines the parsed content at build time so NO `node:fs`
// read happens at runtime — the game works on web, iOS, and Android without a
// disk fallback.
//
// The loader (./loader) composes a full EraPack from { pack + events } and
// validates it against EraPackSchema; endings are attached as a sibling field
// because EraPackSchema is strict and intentionally has no `endings` key
// (plan todo 4 design: endings ship as a standalone artifact, validated
// separately the same way events.json5 is).
//
// Plan reference: T12 (life start) + T13 (turn screen) integration — makes
// the game actually playable by wiring real content into the turn screen.

import tangPack from './packs/tang-china/pack.json5';
import tangEvents from './packs/tang-china/events.json5';
import tangEndings from './packs/tang-china/endings.json5';
import tangPractices from './packs/tang-china/practices.json5';
import tangSchedules from './packs/tang-china/schedules.json5';
import fantasyPack from './packs/fantasy-mahayana/pack.json5';
import fantasyEvents from './packs/fantasy-mahayana/events.json5';
import fantasyEndings from './packs/fantasy-mahayana/endings.json5';
import fantasyPractices from './packs/fantasy-mahayana/practices.json5';
import fantasySchedules from './packs/fantasy-mahayana/schedules.json5';

/**
 * A bundled era: the raw (unvalidated) pack scaffold, events file, endings
 * file, practices file, and schedules file. The loader is responsible for
 * validating and composing these into a {@link LoadedEraPack}; the registry
 * only carries the bytes.
 */
export interface EraBundle {
  /** Parsed pack.json5 contents. */
  readonly pack: unknown;
  /** Parsed events.json5 contents (shape: `{ events: unknown[] }`). */
  readonly events: unknown;
  /** Parsed endings.json5 contents (shape: `{ endings: unknown[] }`). */
  readonly endings: unknown;
  /** Parsed practices.json5 contents (shape: `{ practices: unknown[] }`). */
  readonly practices: unknown;
  /** Parsed schedules.json5 contents (shape: `{ schedules: unknown[] }`). */
  readonly schedules: unknown;
}

const REGISTRY: Readonly<Record<string, EraBundle>> = {
  'tang-china': {
    pack: tangPack,
    events: tangEvents,
    endings: tangEndings,
    practices: tangPractices,
    schedules: tangSchedules,
  },
  'fantasy-mahayana': {
    pack: fantasyPack,
    events: fantasyEvents,
    endings: fantasyEndings,
    practices: fantasyPractices,
    schedules: fantasySchedules,
  },
};

/**
 * The era ids the registry knows about, in stable insertion order.
 *
 * Used by the loader's error path to list the known set when an unknown id is
 * requested, and by the life-start screen to render the era picker.
 */
export function listEraIds(): readonly string[] {
  return Object.keys(REGISTRY);
}

/** True when the registry carries a bundle for `eraId`. */
export function hasEraBundle(eraId: string): boolean {
  return Object.prototype.hasOwnProperty.call(REGISTRY, eraId);
}

/**
 * Look up a bundled era by id.
 *
 * @param eraId The era directory name (e.g. `'tang-china'`).
 * @returns The raw bundle — unvalidated; the loader validates before use.
 * @throws {Error} when `eraId` is absent from the registry.
 */
export function getEraBundle(eraId: string): EraBundle {
  const bundle = REGISTRY[eraId];
  if (bundle === undefined) {
    throw new Error(
      `registry: unknown era "${eraId}" (known: ${listEraIds().join(', ') || 'none'})`,
    );
  }
  return bundle;
}
