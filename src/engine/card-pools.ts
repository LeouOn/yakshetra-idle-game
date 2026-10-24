// Shared qualifier pools for long-fire and rare cards.
//
// Extracted from card-composer.ts (which is kept under the ~250-line engine
// budget). Data only; no imports.

export const LONG_FIRE_POOL: readonly string[] = [
  ' It was not hurried, and it shows.',
  ' Whatever else you did that day, this was the part you let run long.',
  ' It has the settled look of something given twice the attention it asked for.',
  ' You stopped early the second time round, which was the point of stopping.',
  ' It carries the extra hour like a change in the weather.',
  ' Nothing about it was rushed, and you can tell.',
];

export const RARE_POOL: readonly string[] = [
  ' It does not come like this often.',
  ' There is no second one of these on the shelf.',
  ' You would remember the day you found it.',
  ' It is the kind of thing that gets lent out once.',
  ' You keep it where you can see it, which is not your habit.',
  ' Whoever made it did not expect it to be kept.',
];
