// Chronicle figure reading — how a figure card's own prose is quoted, and
// how a figure's name is normalized for first-sighting memory. Extracted
// from chronicle.ts (engine files stay under ~250 lines).
// Pure: no Date, no RNG, no I/O.

import type { Manifest } from './manifest';

export function firstSentence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^.*?[.!?](?:\s|$)/);
  let sentence = match ? match[0].trim() : trimmed;
  if (!/[.!?]$/.test(sentence) && sentence.length > 0) {
    sentence += '.';
  }
  return sentence;
}

function figureAliases(name: string): readonly string[] {
  const rawParts = name
    .split(/[,/()]/)
    .map((p) => p.trim())
    .filter((p) => p.length > 2);
  const aliases = new Set<string>();
  for (const part of rawParts) {
    const clean = part.replace(/^the\s+/i, '').trim();
    if (clean.length > 2) {
      aliases.add(clean.toLowerCase());
      const normalized = clean
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
      aliases.add(normalized);
    }
  }
  return [...aliases];
}

/** The identity a figure is remembered under: case- and diacritic-folded
 * name, so two catalog ids for one being ("figure:avalokiteshvara" and an
 * alias row) cannot earn two first meetings. */
export function figureKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^the\s+/, '')
    .trim();
}

export function namesFigureOrClearSubject(sentence: string, figureName: string): boolean {
  const s = sentence.replace(/^{{\w+}}\s*/, '').trim();

  for (const alias of figureAliases(figureName)) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, 'i');
    if (re.test(s)) {
      return true;
    }
  }

  if (/^(?:he|she|they|his|her|their)\b/i.test(s)) {
    return true;
  }

  const commaParts = s.split(',');
  if (commaParts.length > 1) {
    for (let i = 1; i < commaParts.length; i += 1) {
      const after = commaParts.slice(i).join(',').trim();
      if (/^(?:he|she|they|his|her|their)\b/i.test(after)) {
        return true;
      }
    }
  }

  if (
    /^(?:through|at|in|on|before|after|with)\s+[a-z\s]+?\s+(?:he|she|they|his|her|their)\b/i.test(s)
  ) {
    return true;
  }

  return false;
}

/** The card's scene: its detail's first sentence when that sentence is
 * clearly about the figure, else its one-liner's first sentence. Returns ''
 * when the card has no prose at all. */
export function figureScene(card: Manifest): string {
  const oneLiner = card.one_liner ? firstSentence(card.one_liner) : '';
  const detail = card.detail ? firstSentence(card.detail) : '';
  const figureName = card.about_name ?? card.name;
  if (
    detail.length > 0 &&
    detail !== card.one_liner &&
    (namesFigureOrClearSubject(detail, figureName) || namesFigureOrClearSubject(detail, card.name))
  ) {
    return detail;
  }
  return oneLiner;
}
