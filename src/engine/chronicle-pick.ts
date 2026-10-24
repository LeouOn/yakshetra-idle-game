// Chronicle pick memory — the chronicle's guard against saying the same
// thing twice (the "repeats sentences" defect, measured 2026-10-24: a
// returning figure reprinted its two authored scene sentences up to 4x in
// one 36-entry chronicle, and section frames collided 4x with only 8
// variants and a blind hash pick).
//
// All picks stay deterministic: the rotation is a hash of the card id; the
// memory only SKIPS candidates that were printed recently, walking the hash
// offset forward. Same archive => same chronicle, on every device.
//
// Pure: no Date, no RNG, no I/O. A leaf module (imports nothing but types).

/** FNV-1a over a card id — the deterministic "rotation" seed. */
export function hashOf(key: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    hash = Math.imul(hash ^ key.charCodeAt(i), 0x01000193) >>> 0;
  }
  return hash;
}

/** Blind pick (no memory): hash of `key` chooses the row. */
export function pick<T>(rows: readonly T[], key: string): T {
  return rows[hashOf(key) % rows.length] ?? rows[0]!;
}

/** Pick with a short memory: walk the hash offsets forward until a row that
 * `recent` does not hold; fall back to the blind pick when everything is
 * spent. The caller owns the recency list. */
export function pickWithMemory<T>(rows: readonly T[], key: string, recent: readonly T[]): T {
  const h = hashOf(key);
  for (let offset = 0; offset < rows.length; offset += 1) {
    const candidate = rows[(h + offset) % rows.length]!;
    if (!recent.includes(candidate)) {
      return candidate;
    }
  }
  return rows[h % rows.length]!;
}

/** How many recent frames the shared section memory keeps. Section entries
 * (first-of-kind, tier firsts, kept, world drafts) each fire a handful of
 * times per chronicle; remembering the last SECTION_MEMORY_FRAMES printed
 * makes back-to-back collisions impossible without starving any section. */
const SECTION_MEMORY_FRAMES = 6;

/** How many of a figure's own recent return frames are remembered, so the
 * SAME figure does not hear "returned." twice in a row. */
const FIGURE_MEMORY_FRAMES = 4;

interface FigureTrail {
  /** Sentences already printed for this figure (scenes and one-liners). */
  readonly said: Set<string>;
  /** The figure's recent return frames, most recent last. */
  readonly frames: string[];
}

/** Everything the chronicle remembers while compiling one archive. One
 * instance per buildChronicle call; never persisted. */
export class ChronicleMemory {
  private readonly sectionFrames: string[] = [];
  private readonly figures = new Map<string, FigureTrail>();
  private readonly figureNames = new Set<string>();
  /** `name :: one-liner` facts already printed by a section entry. Two
   * cards of the same catalog row (the same object harvested at another
   * scale) must not each earn an entry quoting the identical sentence. */
  private readonly quotedFacts = new Set<string>();

  /** Pick a section frame (firstKind / tierFirst / kept / worldDraft /
   * figureFirst), skipping the frames printed most recently across ALL
   * sections — the collision the blind hash pick could not see. */
  sectionFrame(templates: readonly string[], key: string): string {
    const frame = pickWithMemory(templates, key, this.sectionFrames);
    this.sectionFrames.push(frame);
    if (this.sectionFrames.length > SECTION_MEMORY_FRAMES) {
      this.sectionFrames.shift();
    }
    return frame;
  }

  /** Pick a figure's RETURN frame from that figure's own recent frames. */
  figureFrame(templates: readonly string[], figureKey: string, key: string): string {
    const trail = this.trail(figureKey);
    const frame = pickWithMemory(templates, key, trail.frames);
    trail.frames.push(frame);
    if (trail.frames.length > FIGURE_MEMORY_FRAMES) {
      trail.frames.shift();
    }
    return frame;
  }

  /** First sighting of a figure NAME (normalized), not of an id: two catalog
   * ids for one being (an alias row) must not earn two "first meetings". */
  firstSightingOf(figureKey: string): boolean {
    if (this.figureNames.has(figureKey)) {
      return false;
    }
    this.figureNames.add(figureKey);
    return true;
  }

  /** Has this figure already had this exact sentence printed? */
  figureAlreadySaid(figureKey: string, sentence: string): boolean {
    return this.trail(figureKey).said.has(sentence);
  }

  /** Record a sentence as printed for this figure. */
  figureSays(figureKey: string, sentence: string): void {
    this.trail(figureKey).said.add(sentence);
  }

  /** Has this object's one-liner already been printed by another section?
   * The key is the caller's (name-key :: one-liner); the memory is a dumb
   * store so this module stays a leaf. */
  factAlreadyQuoted(fact: string): boolean {
    return this.quotedFacts.has(fact);
  }

  /** Record an object's one-liner as printed. */
  quoteFact(fact: string): void {
    this.quotedFacts.add(fact);
  }

  private trail(figureKey: string): FigureTrail {
    let trail = this.figures.get(figureKey);
    if (trail === undefined) {
      trail = { said: new Set<string>(), frames: [] };
      this.figures.set(figureKey, trail);
    }
    return trail;
  }
}
