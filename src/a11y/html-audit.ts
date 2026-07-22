/**
 * Static-HTML accessibility audit helpers for the Yakshetra web build.
 *
 * These functions operate on the server-rendered HTML shell produced by
 * `npx expo export --platform web` (React Native Web output). They supplement
 * axe-core (which runs against the same DOM) with structural checks that are
 * either not covered by axe or that need a layout heuristic because jsdom
 * performs no layout:
 *
 *   - Touch-target sizing (WCAG 2.5.5 / 2.5.8): estimated from cascaded
 *     `padding`/`font-size`/`height`/`min-height` values resolved by jsdom.
 *   - Heading structure (`<h1>` presence + ordered `<h2>`..`<h6>`).
 *   - `lang` attribute and `<title>` presence.
 *   - Landmark regions (`main`/`nav`/`header`/`footer`/`[role]`).
 *   - `img` alt text and interactive-element labels.
 *
 * No source code in `app/` or `src/` is read or modified here — the audit is
 * strictly read-only against `dist/`.
 */

/** axe-core impact levels, ordered from most to least severe. */
export type Impact = 'critical' | 'serious' | 'moderate' | 'minor';

/** Subset of the axe-core result shape we consume. */
export interface AxeViolation {
  id: string;
  impact: Impact | null;
  help: string;
  description: string;
  helpUrl: string;
  tags: string[];
  nodes: { html: string; target: readonly string[] }[];
}

export interface AxeSummary {
  violations: AxeViolation[];
  ruleIds: readonly string[];
}

/** A touch-target element whose estimated box falls below the WCAG minimum. */
export interface TouchTargetIssue {
  selector: string;
  estimatedHeightPx: number;
  estimatedWidthPx: number;
  text: string;
  ariaLabel: string | null;
}

export interface ManualCheckResult {
  htmlLang: string | null;
  hasTitle: boolean;
  titleText: string | null;
  h1Count: number;
  /** Headings that skip a level (e.g. h1 → h3). Each entry is "hN→hM". */
  headingOrderIssues: readonly string[];
  imagesWithoutAlt: readonly { selector: string; src: string }[];
  /** Interactive elements (button/a/input) with no accessible name. */
  unnamedInteractive: readonly string[];
  touchTargetIssues: readonly TouchTargetIssue[];
  landmarkCount: number;
  landmarkRoles: readonly string[];
}

/** WCAG 2.5.5 (AAA) / 2.5.8 (AA) target-size minimum, in CSS pixels. */
export const TOUCH_TARGET_MIN_PX = 44;

/** Average line-height multiplier when `line-height: normal`. */
const LINE_HEIGHT_NORMAL = 1.2;

function px(value: string): number {
  // jsdom reports e.g. "16px"; unknown/non-px values (auto, medium) → 0.
  const m = /^([0-9.]+)px$/.exec(value.trim());
  return m ? Number.parseFloat(m[1] ?? '0') : 0;
}

/** Build a short, stable CSS-like selector for a DOM node (tag#id.class). */
function describeSelector(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const idSuffix = el.id ? `#${el.id}` : '';
  const cls = el.getAttribute('class');
  const firstClass =
    cls && cls.trim().length > 0 ? `.${(cls.trim().split(/\s+/) ?? [])[0] ?? ''}` : '';
  return `${tag}${idSuffix}${firstClass}`;
}

/** Approximate on-screen height of an element from cascaded CSS values. */
function estimatedBoxHeight(
  window: Pick<globalThis.Window, 'getComputedStyle'>,
  el: Element,
  contentFontSizePx: number,
): number {
  const cs = window.getComputedStyle(el);
  let contentHeight = contentFontSizePx * LINE_HEIGHT_NORMAL;
  const explicitHeight = px(cs.height);
  if (explicitHeight > 0) contentHeight = explicitHeight;
  const minHeight = px(cs.minHeight);
  if (minHeight > contentHeight) contentHeight = minHeight;
  return px(cs.paddingTop) + px(cs.paddingBottom) + contentHeight;
}

/** Approximate on-screen width of an element from cascaded CSS + text length. */
function estimatedBoxWidth(
  window: Pick<globalThis.Window, 'getComputedStyle'>,
  el: Element,
  contentFontSizePx: number,
): number {
  const cs = window.getComputedStyle(el);
  const text = textContent(el);
  // Rough average glyph advance ≈ 0.55 em for proportional system fonts.
  const textWidth = text.length * contentFontSizePx * 0.55;
  const explicitWidth = px(cs.width);
  const contentWidth = explicitWidth > 0 ? explicitWidth : textWidth;
  const minWidth = px(cs.minWidth);
  const widest = minWidth > contentWidth ? minWidth : contentWidth;
  return px(cs.paddingLeft) + px(cs.paddingRight) + widest;
}

/** Max `font-size` (px) among the element and its descendants; default 14. */
function maxFontSize(window: Pick<globalThis.Window, 'getComputedStyle'>, root: Element): number {
  let max = 0;
  const stack: Element[] = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;
    const fs = px(window.getComputedStyle(node).fontSize);
    if (fs > max) max = fs;
    let child = node.firstElementChild;
    while (child) {
      stack.push(child);
      child = child.nextElementSibling;
    }
  }
  return max > 0 ? max : 14;
}

function textContent(el: Element): string {
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** Whether an interactive element exposes an accessible name. */
function hasAccessibleName(el: Element): boolean {
  const labelAttrs = ['aria-label', 'aria-labelledby', 'title'];
  for (const attr of labelAttrs) {
    if ((el.getAttribute(attr) ?? '').length > 0) return true;
  }
  // `<label for=id>` association for form fields.
  const id = el.getAttribute('id');
  if (id) {
    const owner = el.ownerDocument.querySelector(`label[for="${id}"]`);
    if (owner && textContent(owner).length > 0) return true;
  }
  const tag = el.tagName.toLowerCase();
  if (tag === 'button' || tag === 'a') {
    return textContent(el).length > 0;
  }
  // `input`/`select`/`textarea`: value/placeholder count as a weak name only
  // for placeholder, which axe treats as insufficient — keep strict.
  return false;
}

/**
 * Run the manual structural checks against a jsdom document.
 * Pure: reads only `document`, returns a `ManualCheckResult`.
 */
export function runManualChecks(
  window: Pick<globalThis.Window, 'getComputedStyle'>,
  document: Document,
): ManualCheckResult {
  const htmlEl = document.documentElement;
  const htmlLang = htmlEl?.getAttribute('lang') ?? null;

  // Use the *effective* document title (what `document.title` resolves to),
  // not the first `<title>` element: the exported HTML contains a duplicate
  // empty `<title data-rh="true">` before the real one, and the IDL getter
  // honours only the first `<title>` — so `document.title` is empty even
  // though a populated `<title>` exists later in `<head>`. This matches what
  // axe-core's `document-title` rule measures.
  const titleText = document.title ?? '';
  const hasTitle = titleText.length > 0;

  const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6'));
  const h1Count = headings.filter((h) => h.tagName.toLowerCase() === 'h1').length;
  const headingOrderIssues: string[] = [];
  let prev = 0; // h1=1 .. h6=6; 0 means "no heading yet"
  for (const h of headings) {
    const level = Number.parseInt(h.tagName.toLowerCase().slice(1), 10);
    if (prev !== 0 && level > prev + 1) {
      headingOrderIssues.push(`h${prev}→h${level}`);
    }
    prev = level;
  }

  const imagesWithoutAlt = Array.from(document.querySelectorAll('img'))
    .filter((img) => !img.hasAttribute('alt'))
    .map((img) => ({ selector: describeSelector(img), src: img.getAttribute('src') ?? '' }));

  const interactiveSelector =
    'button, a[href], input, select, textarea, [role="button"], [role="link"]';
  const unnamedInteractive = Array.from(document.querySelectorAll(interactiveSelector))
    .filter((el) => !hasAccessibleName(el))
    .map((el) => describeSelector(el));

  const touchTargetIssues: TouchTargetIssue[] = [];
  const touchSelector =
    'button, a[href], [role="button"], [role="link"], input[type="button"], input[type="submit"], input[type="reset"]';
  for (const el of Array.from(document.querySelectorAll(touchSelector))) {
    const fs = maxFontSize(window, el);
    const h = estimatedBoxHeight(window, el, fs);
    const w = estimatedBoxWidth(window, el, fs);
    if (h < TOUCH_TARGET_MIN_PX || w < TOUCH_TARGET_MIN_PX) {
      touchTargetIssues.push({
        selector: describeSelector(el),
        estimatedHeightPx: Math.round(h * 10) / 10,
        estimatedWidthPx: Math.round(w * 10) / 10,
        text: textContent(el).slice(0, 40),
        ariaLabel: el.getAttribute('aria-label'),
      });
    }
  }

  const landmarkSelector =
    'main, nav, header, footer, aside, section[aria-label], [role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], [role="region"][aria-label], form[aria-label]';
  const landmarks = Array.from(document.querySelectorAll(landmarkSelector));
  const landmarkRoles = landmarks.map(
    (l) =>
      l.tagName.toLowerCase() + (l.getAttribute('role') ? `[role=${l.getAttribute('role')}]` : ''),
  );

  return {
    htmlLang,
    hasTitle,
    titleText,
    h1Count,
    headingOrderIssues,
    imagesWithoutAlt,
    unnamedInteractive,
    touchTargetIssues,
    landmarkCount: landmarks.length,
    landmarkRoles,
  };
}
