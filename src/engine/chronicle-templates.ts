// Chronicle entry templates — DATA, not code (replaceable by b2's composer).
//
// Each entry is built AROUND THE CARD'S OWN AUTHORED SENTENCE ({one_liner})
// or its subject, with a short frame of time and verb. Frames never name
// engine concepts (org/tier/scale/breadth — the banlist test enforces it).
// Slots: {title} {one_liner} {subject} {figure} {scene} {kind} {scale-word} {line}.

export interface ChroniclePhrasings {
  readonly firstKind: readonly string[];
  readonly figureFirst: readonly string[];
  readonly figureReturn: readonly string[];
  // Returns quote the card's own scene: the first sentence of its detail.
  readonly kept: readonly string[];
  readonly tierFirst: readonly string[];
  readonly worldDraft: readonly string[];
}

export const CHRONICLE_TEMPLATES: ChroniclePhrasings = {
  firstKind: [
    'The bench gave shape to {title}: {one_liner}',
    'First of its kind that season — {title}: {one_liner}',
    '{title} came off the bench first of all: {one_liner}',
    'It began with {title}: {one_liner}',
    'The earliest of these was {title}: {one_liner}',
    'Before anything else, {title}: {one_liner}',
    'The season opened with {title}: {one_liner}',
    'The first to arrive was {title}: {one_liner}',
  ],
  figureFirst: [
    '{figure} came near the work: {one_liner}',
    '{figure} passed close by the bench: {one_liner}',
    'A first meeting — {figure}: {one_liner}',
    'The name of {figure} entered these pages: {one_liner}',
    '{figure} was there that day: {one_liner}',
    'Word arrived of {figure}: {one_liner}',
    'The day turned on {figure}: {one_liner}',
    '{figure} stood at the edge of the work: {one_liner}',
  ],
  figureReturn: [
    '{figure} returned. {scene}',
    '{figure} passed this way again: {scene}',
    'Another crossing with {figure} — {scene}',
    'The work met {figure} once more: {scene}',
    '{figure} was seen from the bench again. {scene}',
    '{figure} came back through: {scene}',
    'Once more, {figure}: {scene}',
    'The road crossed {figure} a further time — {scene}',
  ],
  kept: [
    '{title} was kept close: {one_liner}',
    'The shelf took in {title} — {one_liner}',
    'A tie was kept: {title}, {subject}.',
    'The hand reached first for {title}: {one_liner}',
    '{title} stayed where the work could find it: {one_liner}',
    'What was kept: {title}, {subject}.',
    'The bench held onto {title}: {one_liner}',
    '{title} never left reach: {one_liner}',
  ],
  tierFirst: [
    'The {scale-word} took shape around {title}: {one_liner}',
    '{title} was the first stone of the {scale-word}: {one_liner}',
    'Around {title}, a {scale-word} gathered: {one_liner}',
    'The {scale-word} began with {title}: {one_liner}',
    'Out of {title} grew a {scale-word}: {one_liner}',
    '{title} anchored the {scale-word}: {one_liner}',
    'A {scale-word} formed about {title}: {one_liner}',
    'The {scale-word} started where {title} stood: {one_liner}',
  ],
  worldDraft: [
    'A world held together: {line}',
    'Enough had gathered for a world: {line}',
    'A world took form: {line}',
    'The workings stood side by side and made a world: {line}',
    'There was a world now: {line}',
    'A world of its own: {line}',
    'The {scale-word} carried a whole world: {line}',
    'A world, named and standing: {line}',
  ],
};
