/* Parcours (S7) : le focus d'une flèche suit au passage de 700 px (checklist §7, flèche
   désactivée ; checklist §7, origine absente). */
import { test } from './runner.js';
import { click } from './harness.js';
import {
  context,
  eventually,
  resize,
  uncaught,
  withJourney,
  wps,
} from './journey-probe.js';

const DETAIL = '.detail .arrows button';
const STAGE = '.stage-arrows button';

/** Bouton `index` (0 : précédente, 1 : suivante) de la paire `selector`. */
const arrow = (site, selector, index) => (
  [...site.doc.querySelectorAll(`#journey ${selector}`)][index]
);

/**
 * @brief Focus sur une flèche à `from` px, passage à `to` px : le focus est sur la flèche
 *   équivalente de l'autre paire (ou sur une flèche activable de cette paire à la borne).
 *
 * @param {object} site site ouvert
 * @param {object} cas `from`, `to`, `pair` (paire focalisée), `index` (0 ou 1), `want`
 *   (paire attendue), `edge` (vrai : première escale choisie)
 *
 * @returns {Promise<string[]>} problèmes relevés
 */
async function crossing(site, { from, to, pair, index, want, edge }) {
  await resize(site, from);
  if (edge) {
    click(site, wps(site)[0]);
    await eventually(() => (arrow(site, DETAIL, 0).disabled ? [] : ['pas à la borne']));
  }
  const origin = arrow(site, pair, index);
  site.win.focus();
  origin.focus({ preventScroll: true });
  // Le banc headless n'a pas le focus de la fenêtre : Chrome n'émet alors aucun focusin
  if (!site.doc.hasFocus())
    origin.dispatchEvent(new site.win.FocusEvent('focusin', { bubbles: true }));
  if (site.doc.activeElement !== origin) return ['focus de départ non pris'];
  await resize(site, to);
  const buttons = [arrow(site, want, 0), arrow(site, want, 1)];
  const expected = edge ? buttons.filter((button) => !button.disabled) : [buttons[index]];
  return eventually(() => {
    const active = site.doc.activeElement;
    if (!expected.includes(active))
      return [`focus sur ${active?.tagName ?? 'rien'} au lieu de la flèche attendue`];
    return [];
  });
}

/** Cinq cas : ← vers ↑, → vers ↓, ↓ vers →, borne, et aucun focus volé. */
export async function runBreakpointFocus() {
  const ctx = context(701);
  const name = 'flèche focalisée au passage de 700 px : focus sur l\'équivalente';
  await withJourney(ctx, [name], {}, (site) => test(ctx, name, async () => {
    const problems = [];
    const cases = [
      ['← vers ↑', { from: 701, to: 700, pair: DETAIL, index: 0, want: STAGE }],
      ['→ vers ↓', { from: 701, to: 700, pair: DETAIL, index: 1, want: STAGE }],
      ['↓ vers →', { from: 700, to: 701, pair: STAGE, index: 1, want: DETAIL }],
      ['borne', { from: 701, to: 700, pair: DETAIL, index: 1, want: STAGE, edge: true }],
    ];
    for (const [label, spec] of cases)
      problems.push(...(await crossing(site, spec)).map((p) => `${label} : ${p}`));
    await resize(site, 701);
    site.doc.activeElement?.blur();
    const before = site.doc.activeElement;
    await resize(site, 700);
    if (site.doc.activeElement !== before) problems.push('sans focus : focus déplacé');
    return [...problems, ...uncaught(site)];
  }));
}
