/* Parcours : au bureau (701 px et plus), aucun libellé d'escale (titre `text`, date `text.y`)
ne recouvre le vaisseau à quai sur l'escale actuelle ni un autre libellé. Rectangles de
contenu (getBoundingClientRect), tolérance de 0 px, en français et en anglais. */
import { test } from './runner.js';
import { all, context, journeyData, nowIndex, one, withJourney } from './journey-probe.js';

// Largeurs du bureau contrôlées (701 à 1400 px), quel que soit le filtre `?widths=`
export const OVERLAP_WIDTHS = [701, 768, 880, 1000, 1280, 1400];
const LANGS = ['en', 'fr'];
const LABELS = '.traj .wp text';

/** Rectangle de contenu de `node` : { left, top, right, bottom }. */
const rectOf = (node) => node.getBoundingClientRect();

/** Largeur et hauteur de la partie commune de deux rectangles (négatives si disjoints). */
function overlap(a, b) {
  return {
    width: Math.min(a.right, b.right) - Math.max(a.left, b.left),
    height: Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top),
  };
}

/** Nom lisible d'un libellé : rang de l'escale, ligne et texte. */
function nameOf(label, stops) {
  const index = stops.indexOf(label.closest('.wp'));
  const line = label.classList.contains('y') ? 'date' : 'titre';
  return `escale ${index} (${line} « ${label.textContent} »)`;
}

/** Recouvrements du vaisseau avec un libellé, et des libellés entre eux. */
function overlapProblems(site) {
  const ship = one(site, '.ship-g');
  const labels = all(site, LABELS);
  const stops = all(site, '.traj .wp');
  if (!ship || labels.length < 2) return ['vaisseau ou libellés absents'];
  const problems = [];
  const crossing = (a, b) => {
    const { width, height } = overlap(rectOf(a), rectOf(b));
    return width > 0 && height > 0 ? `${width.toFixed(1)} × ${height.toFixed(1)} px` : null;
  };
  labels.forEach((label, at) => {
    const onShip = crossing(label, ship);
    if (onShip) problems.push(`${nameOf(label, stops)} recouvre le vaisseau de ${onShip}`);
    labels.slice(at + 1).forEach((other) => {
      const onOther = crossing(label, other);
      if (!onOther) return;
      const names = `${nameOf(label, stops)} recouvre ${nameOf(other, stops)}`;
      problems.push(`${names} de ${onOther}`);
    });
  });
  return problems;
}

/**
 * @brief Vaisseau à quai sur l'escale actuelle : aucun libellé ne le recouvre ni ne recouvre
 *   un autre libellé, en français et en anglais, mouvement réduit (état stable).
 *
 * @param {number} width largeur jouée, au-dessus de 700 px
 */
export async function runLabelOverlap(width) {
  for (const lang of LANGS) {
    const ctx = { ...context(width), lang };
    const name = `libellés des escales : aucun recouvrement du vaisseau à quai ni entre eux ` +
      `(${lang}, ${width} px)`;
    await withJourney(ctx, [name], { lang }, (site) => test(ctx, name, async () => {
      const data = await journeyData(lang);
      await site.doc.fonts.ready;
      await new Promise((resolve) => site.win.requestAnimationFrame(resolve));
      const docked = one(site, '.wp.sel');
      if (!docked) return ['escale actuelle absente'];
      const index = all(site, '.traj .wp').indexOf(docked);
      return [
        ...(index === nowIndex(data) ? [] : [`escale choisie ${index}, actuelle attendue`]),
        ...overlapProblems(site),
      ];
    }));
  }
}
