// Phrasing templates for world drafts (wave 3, lane b3).
//
// Pure data + deterministic selection. Connects authored card sentences
// into settings that read like real places with people in them.
// Fences: no engine concepts (org/tier/scale/breadth), no moral grading,
// no id tokens.

import type { ManifestScale } from './manifest';

export interface WorldDraftPhrasings {
  readonly personWithPlace: readonly string[];
  readonly personOnly: readonly string[];
  readonly placeOnly: readonly string[];
  readonly household: readonly string[];
  readonly org: readonly string[];
  readonly town: readonly string[];
  readonly city: readonly string[];
  readonly region: readonly string[];
  readonly nation: readonly string[];
  readonly world: readonly string[];
}

export const WORLD_DRAFT_TEMPLATES: WorldDraftPhrasings = {
  personWithPlace: [
    '{person} is at {place}: {line}.',
    'At {place}, {person}: {line}.',
    '{person}, found at {place}: {line}.',
    'By {place}, {person}: {line}.',
    '{person} keeps to {place}: {line}.',
    'Down at {place}, {person}: {line}.',
    '{person} stays close to {place}: {line}.',
    'Near {place}, {person}: {line}.',
    'Out at {place}, {person}: {line}.',
    '{person} at {place}: {line}.',
  ],
  personOnly: [
    '{person}. They are still watching for somewhere to settle.',
    '{person}, before the street has found a name.',
    '{person}. Somewhere to land has not yet opened.',
    '{person}, waiting for a quiet threshold.',
    '{person}. The ground has yet to take shape around them.',
    '{person}, with nowhere yet to lay down their pack.',
    '{person}. The morning is quiet, waiting for a doorway.',
    '{person}, before the hearth is lit.',
    '{person}. The lanes are still unmapped around them.',
    '{person}, standing where a road might one day pass.',
  ],
  placeOnly: [
    '{place}. The place stands open, waiting for someone to arrive.',
    '{place}. The threshold is swept, but no one has stepped through.',
    '{place} — ready before the first footsteps sound.',
    '{place}. A quiet morning before anyone has made it home.',
    '{place}. The stones are laid; the folk have yet to gather.',
    '{place}. No one has stopped here yet.',
    '{place}. The gates stand unlatched for the first visitor.',
    '{place} — open to the weather, waiting for hands.',
    '{place}. The path leads in, though no one walks it yet.',
    '{place}. Quiet waits beneath the eaves.',
  ],
  household: [
    'Around {name}, a household holds together: {line1}. Beside it: {line2}.',
    '{line1}. Under this roof: {line2}.',
    'Held by the hearth: {line1}. Beside it: {line2}.',
    '{line1}. Within these walls: {line2}.',
    '{name} anchors the home: {line1}. Under this roof: {line2}.',
    'A household gathered by quiet habit: {line1}. {line2}.',
    'By the shared hearth: {line1}. Across the threshold: {line2}.',
    '{line1} — kept close where the household sleeps: {line2}.',
    'Under one roof at {name}: {line1}. Near the stove: {line2}.',
    '{name} sets the table: {line1}. Beside it: {line2}.',
  ],
  org: [
    'The workshop took form around {name}: {line1}. Across the benches: {line2}.',
    'Sworn before the hall: {line1}. Here: {line2}.',
    '{line1}. By common agreement: {line2}.',
    'A craft held in common: {line1}. Across the benches: {line2}.',
    'Through {name}, the guild found its footing: {line1}. In the yard: {line2}.',
    '{line1}. In the guild yard: {line2}.',
    'Set down in the rolls: {line1}. Bound to it: {line2}.',
    '{name} steadying the trade: {line1}. Beside the ledger: {line2}.',
    'Along the row of benches: {line1}. In the yard: {line2}.',
    '{name} brought the work together: {line1}. Across the hall: {line2}.',
  ],
  town: [
    'The town gathered around {name}: {line1}. Across the commons: {line2}.',
    '{line1}. Across the commons: {line2}.',
    'Where the parish lanes meet at {name}: {line1}. Down the high lane: {line2}.',
    '{line1}. In every quarter of town: {line2}.',
    'A town shaped by common days: {line1}. {line2}.',
    '{name} marks the town crossing: {line1}. In every quarter of town: {line2}.',
    'Out past the parish ditch: {line1}. Down the high lane: {line2}.',
    '{line1} — where the town bells reach: {line2}.',
    'At the market crossing: {line1}. Down by the bridge: {line2}.',
    '{name} anchors the parish: {line1}. Across the lanes: {line2}.',
  ],
  city: [
    'The city stands within these bounds: {line1}. {line2}.',
    'From {name} across the city wards: {line1}. Past the muster gates: {line2}.',
    '{line1}. Past the muster gates: {line2}.',
    'Anchored by {name}: {line1}. Through the avenues: {line2}.',
    '{line1}. Through the avenues: {line2}.',
    'A city rising above its walls: {line1}. {line2}.',
    '{name} marks the city gate: {line1}. Inside the moat: {line2}.',
    '{line1}. Throughout the crowded wards: {line2}.',
    'Across the great wards: {line1}. Near the drum tower: {line2}.',
    '{name} stands above the thoroughfare: {line1}. Through the markets: {line2}.',
  ],
  region: [
    'Across the valley: {line1}. Along the borders: {line2}.',
    'A region bound by old accounts: {line1}. {line2}.',
    'Out where {name} carries: {line1}. Across the whole reach: {line2}.',
    '{line1}. Across the whole reach: {line2}.',
    'From mountain pass to waterway: {line1}. {line2}.',
    'A countryside held together by memory: {line1}. {line2}.',
    '{name} reaches across the valley: {line1}. Along the borders: {line2}.',
    'Through every fold of the valley: {line1}. Across the ridgeline: {line2}.',
    '{name} bounds the district: {line1}. Down the river road: {line2}.',
    'From the high pastures: {line1}. Along the canal bed: {line2}.',
  ],
  nation: [
    'Across the realm: {line1}. Throughout the provinces: {line2}.',
    'A realm ordered by quiet labor: {line1}. {line2}.',
    'Under imperial measure: {line1}. {line2}.',
    'Through the hall of rolls: {line1}. {line2}.',
    'Bound by one calendar: {line1}. {line2}.',
    'From court to distant post: {line1}. {line2}.',
    '{name} recorded in the imperial survey: {line1}. Across the roads: {line2}.',
    '{line1}. Carried by riders from province to province: {line2}.',
    'By standard weight and measure: {line1}. At every border gate: {line2}.',
    'A realm bound by common tribute: {line1}. From river to frontier: {line2}.',
  ],
  world: [
    'A world held together: {line1}. {line2}.',
    'The workings stood side by side: {line1}. {line2}.',
    'A world of its own: {line1}. {line2}.',
    'Enough had gathered for a world: {line1}. {line2}.',
    'A world, named and standing: {line1}. {line2}.',
    'Across the whole world: {line1}. {line2}.',
    'All workings meeting under open sky: {line1}. {line2}.',
    '{name} at the center: {line1}. Around it: {line2}.',
    'From horizon to horizon: {line1}. Between heaven and earth: {line2}.',
    'The world settled into its frame: {line1}. {line2}.',
  ],
};

/** 32-bit FNV-1a hash with avalanche mixer for deterministic, uniform rotation without RNG. */
export function hashOf(key: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    hash = Math.imul(hash ^ key.charCodeAt(i), 0x01000193) >>> 0;
  }
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b) >>> 0;
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b) >>> 0;
  return (hash ^ (hash >>> 16)) >>> 0;
}

export function pickTemplate(templates: readonly string[], key: string): string {
  return templates[hashOf(key) % templates.length] ?? templates[0]!;
}

export function templatesForScale(scale: ManifestScale): readonly string[] {
  switch (scale) {
    case 'household':
      return WORLD_DRAFT_TEMPLATES.household;
    case 'org':
      return WORLD_DRAFT_TEMPLATES.org;
    case 'town':
      return WORLD_DRAFT_TEMPLATES.town;
    case 'city':
      return WORLD_DRAFT_TEMPLATES.city;
    case 'region':
      return WORLD_DRAFT_TEMPLATES.region;
    case 'nation':
      return WORLD_DRAFT_TEMPLATES.nation;
    case 'world':
      return WORLD_DRAFT_TEMPLATES.world;
    case 'person':
    default:
      return WORLD_DRAFT_TEMPLATES.household;
  }
}
