/* Mesures sur le site chargé : débordement horizontal, zones cliquables, textes d'une langue.
Chaque fonction rend une liste de problèmes (chaînes qui nomment l'élément) ; vide = réussi. */
import { describe, isVisible } from './harness.js';
import { normalize } from './text.js';

const MAX_PROBLEMS = 8;
const TOLERANCE = 0.5; // px : arrondis de sous-pixel
export const MIN_TARGET = 44;
const NON_RENDERED = [
  'defs', 'clipPath', 'mask', 'symbol', 'pattern', 'marker', 'filter', 'linearGradient',
  'radialGradient', 'title', 'desc', 'metadata', 'script', 'style', 'template', 'noscript',
].join(', ');
const INTERACTIVE = [
  'a[href]', 'button', 'input:not([type="hidden"])', 'select', 'textarea', 'summary',
  '[role="button"]', '[role="link"]', '[role="tab"]', '[tabindex]:not([tabindex="-1"])',
  '[data-go]',
].join(', ');

/** Limite une liste de problèmes à MAX_PROBLEMS, avec le compte du reste. */
export function capped(problems) {
  if (problems.length <= MAX_PROBLEMS) return problems;
  return [...problems.slice(0, MAX_PROBLEMS), `… et ${problems.length - MAX_PROBLEMS} autres`];
}

const intersect = (a, b) => ({
  left: Math.max(a.left, b.left),
  right: Math.min(a.right, b.right),
});
const clips = (style) => style.overflowX !== 'visible';

/**
 * Débordement horizontal : `documentElement.scrollWidth <= clientWidth`, puis aucun élément
 * visible dont la boîte (rognée par ses ancêtres qui coupent leur contenu, sauf html et body)
 * sort du viewport à gauche ou à droite, puis aucun défilement horizontal interne.
 * Les éléments fixes sont comparés à la fenêtre entière, les autres à la zone sans barre.
 */
export function overflowProblems(site) {
  const { doc, win } = site;
  const root = doc.documentElement;
  const problems = [];
  if (root.scrollWidth > root.clientWidth) {
    problems.push(`html : scrollWidth ${root.scrollWidth} > clientWidth ${root.clientWidth}`);
  }
  const info = new Map(); // élément -> { clip de ses descendants, fixe ? }
  const open = { left: -Infinity, right: Infinity };
  const offenders = [];
  const inner = [];
  for (const el of doc.body.querySelectorAll('*')) {
    const parent = info.get(el.parentElement) || { clip: open, fixed: false };
    const style = win.getComputedStyle(el);
    const fixed = parent.fixed || style.position === 'fixed';
    const inherited = style.position === 'fixed' ? open : parent.clip;
    const rect = el.getBoundingClientRect();
    const box = { left: rect.left, right: rect.right };
    info.set(el, { clip: clips(style) ? intersect(inherited, box) : inherited, fixed });
    if (el.closest(NON_RENDERED) || rect.width <= 0 || rect.height <= 0) continue;
    if (!isVisible(el)) continue;
    const seen = intersect(inherited, box);
    if (seen.right - seen.left <= 0) continue;
    const limit = fixed ? win.innerWidth : root.clientWidth;
    const shift = fixed ? 0 : win.scrollX;
    const left = seen.left + shift;
    const right = seen.right + shift;
    if (right > limit + TOLERANCE || left < -TOLERANCE) {
      if (!offenders.some((o) => o.contains(el))) {
        offenders.push(el);
        problems.push(`${describe(el)} : boîte de ${left.toFixed(1)} à ` +
          `${right.toFixed(1)} px pour un viewport de ${limit} px`);
      }
    }
    if (/auto|scroll/.test(style.overflowX) && el.scrollWidth > el.clientWidth + 1) {
      inner.push(`${describe(el)} : défilement horizontal interne (scrollWidth ` +
        `${el.scrollWidth} > clientWidth ${el.clientWidth})`);
    }
  }
  return capped([...problems, ...inner]);
}

/**
 * Lien en ligne dans un texte courant (WCAG 2.5.8) : <a> affiché en ligne, dans un `p` ou un
 * `li`, entouré d'autre texte que le sien.
 */
export function isInlineTextLink(site, el) {
  if (el.localName !== 'a' || site.win.getComputedStyle(el).display !== 'inline') return false;
  const block = el.closest('p, li');
  if (!block) return false;
  const own = normalize(el.textContent);
  return normalize(block.textContent).replace(own, '').trim().length > 0;
}
export const INLINE_LINK_LABEL = 'lien en ligne, exempté (WCAG 2.5.8)';

/* Composants que la maquette validée dessine sous 44 px (décision de Louis du 08/10/2026,
cf. docs/design-checklist.md, zones cliquables) ; les zones dessinées en SVG suivent le dessin. */
const MOCKUP_SIZED = [
  '.nav button', '.lang button', '.brand', '.cue', '.back', '.chips button', '.plist button',
].join(', ');
export const MOCKUP_SIZED_LABEL = 'taille fixée par la maquette validée';

/** Libellé d'exception de `el`, ou null s'il doit mesurer 44 × 44 px. */
function exceptionLabel(site, el) {
  if (isInlineTextLink(site, el)) return INLINE_LINK_LABEL;
  if (el.matches(MOCKUP_SIZED) || el.closest('svg')) return MOCKUP_SIZED_LABEL;
  return null;
}

/**
 * Zones cliquables : tout bouton ou lien visible de `scopes` mesure au moins 44 × 44 px.
 * Rangés à part (non bloquants) au lieu d'échouer, dans `exceptions` { label, text } : les
 * liens en ligne d'un texte courant et les composants dimensionnés par la maquette.
 */
export function targetProblems(site, scopes) {
  const problems = [];
  const exceptions = [];
  const seen = new Set();
  for (const scope of scopes) {
    if (!scope) continue;
    const candidates = scope.matches(INTERACTIVE) ? [scope] : [];
    candidates.push(...scope.querySelectorAll(INTERACTIVE));
    for (const el of candidates) {
      if (seen.has(el) || el.closest(NON_RENDERED) || !isVisible(el)) continue;
      seen.add(el);
      const rect = el.getBoundingClientRect();
      const big = (size) => size + TOLERANCE >= MIN_TARGET;
      if (big(rect.width) && big(rect.height)) continue;
      const text = `${describe(el)} : ${rect.width.toFixed(1)} × ${rect.height.toFixed(1)} px`;
      const label = exceptionLabel(site, el);
      if (label) exceptions.push({ label, text });
      else problems.push(text);
    }
  }
  return { problems: capped(problems), exceptions };
}

/** Textes visibles (nœuds texte) et libellés accessibles des éléments visibles. */
function visibleTexts(site) {
  const { doc } = site;
  const entries = [];
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const visibility = new Map();
  const shown = (el) => {
    if (!visibility.has(el)) visibility.set(el, !el.closest(NON_RENDERED) && isVisible(el));
    return visibility.get(el);
  };
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = normalize(node.data);
    if (text && node.parentElement && shown(node.parentElement)) {
      entries.push({ text: text.toLowerCase(), el: node.parentElement, where: 'texte' });
    }
  }
  const attrs = ['aria-label', 'title', 'alt', 'placeholder', 'aria-description'];
  for (const el of doc.body.querySelectorAll(attrs.map((a) => `[${a}]`).join(','))) {
    if (!shown(el)) continue;
    for (const attr of attrs) {
      const value = el.getAttribute(attr);
      if (value) entries.push({ text: normalize(value).toLowerCase(), el, where: attr });
    }
  }
  return entries;
}

/** Morceaux de `segments` (minuscules) encore visibles, avec l'élément qui les porte. */
export function foreignTextProblems(site, segments, otherLangName) {
  const entries = visibleTexts(site);
  const problems = [];
  for (const segment of segments) {
    const hit = entries.find((entry) => entry.text.includes(segment));
    if (hit) {
      problems.push(`texte ${otherLangName} « ${segment.slice(0, 60)} » visible ` +
        `(${hit.where} de ${describe(hit.el)})`);
    }
  }
  return capped(problems);
}

/** Éléments à contrôler pour une rubrique : la vue elle-même et, si demandé, la barre. */
export function sectionScopes(site, id, withChrome) {
  const { doc } = site;
  const scopes = [doc.getElementById(id)];
  if (withChrome) {
    scopes.push(doc.querySelector('header.bar'), doc.querySelector('nav.tabbar'));
  }
  return scopes;
}
