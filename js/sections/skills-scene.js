/*
Compétences, vue d'ensemble : construit les huit constellations (dessin de skills-art.js,
placement de skills-layout.js) et tient leurs textes et leurs noms d'étoile à jour. Aucun
écouteur, aucun état : skills.js câble et mesure.
Structure et mécanique de la maquette : docs/design/prototype/prototype.template.html:810-847.
*/
import { format } from '../core/i18n.js';
import { constellationGroup, labelOffset, skillsDefs } from './skills-art.js';
import { bodyScale, gridOf, layoutConstellation, walkOrder } from './skills-layout.js';

export const LEVELS = ['unknown', 'beginner', 'intermediate', 'advanced'];
const CENTER_SHIFT_Y = 14; // maquette:816 : centre des étoiles remonté dans la cellule
const TITLE_RISE = 22; // maquette:838 : nom court à 22 unités du bas de la cellule

/**
 * @brief Étoiles d'une constellation, placées dans la grille et rangées dans l'ordre du
 *   parcours (angle autour du centre, en partant de la première étoile des données).
 *
 * @param {object} group constellation de `skills.groups`
 * @param {{ x: number, y: number }} origin coin haut gauche de sa cellule
 * @param {{ x: number, y: number }} center centre des étoiles
 * @param {{ width: number, height: number }} size taille de la cellule
 *
 * @returns {{ id: string, name: string, level: number, x: number, y: number }[]} étoiles
 */
function placeStars(group, origin, center, size) {
  const placed = layoutConstellation(group, size).map((point) => ({
    id: point.id,
    x: origin.x + point.x,
    y: origin.y + point.y,
  }));
  const byId = new Map(placed.map((point) => [point.id, point]));
  const items = new Map(group.items.map((item) => [item.id, item]));
  return walkOrder(placed, center).map((id) => ({
    ...byId.get(id),
    name: items.get(id).name,
    level: LEVELS.indexOf(items.get(id).level),
  }));
}

/**
 * @brief Construit la vue d'ensemble : un groupe SVG par constellation, dans la grille.
 *
 * Aucune dimension d'écran n'est lue : tout est en unités du dessin (la caméra de skills.js
 * cadre ensuite). Les étoiles sont `tabindex="-1"` au repos.
 *
 * @param {object} options
 * @param {object[]} options.groups `skills.groups` de la langue affichée
 * @param {object} options.text `skills` de la langue affichée (`explore`)
 * @param {boolean} options.phone grille de téléphone (2 colonnes) plutôt que de bureau
 *
 * @returns {{ children: SVGElement[], width: number, height: number, scale: number,
 *   groups: object[] }} nœuds à placer dans le svg (skillsDefs d'abord), taille de la grille,
 *   échelle de repos des astres et, par constellation, `{ id, node, title, center, stars }`
 *   où `stars` suit l'ordre du parcours : `{ id, level, x, y, element, body, hit, label }`
 */
export function buildOverview({ groups, text, phone }) {
  const grid = gridOf(groups.length, { phone });
  const size = { width: grid.cellWidth, height: grid.cellHeight };
  const scale = bodyScale({ phone, focused: false });
  const built = groups.map((group, k) => {
    const origin = {
      x: (k % grid.cols) * size.width,
      y: Math.floor(k / grid.cols) * size.height,
    };
    const middle = origin.x + size.width / 2;
    const center = { x: middle, y: origin.y + size.height / 2 - CENTER_SHIFT_Y };
    const stars = placeStars(group, origin, center, size);
    const drawn = constellationGroup({
      label: format(text.explore, { name: group.title }),
      title: group.short,
      cell: { ...origin, ...size },
      titleAt: { x: middle, y: origin.y + size.height - TITLE_RISE },
      stars,
      scale,
    });
    drawn.stars.forEach((node) => node.element.setAttribute('tabindex', '-1'));
    return {
      id: group.id,
      node: drawn.group,
      title: drawn.group.querySelector('.cname'),
      center,
      stars: stars.map((star, j) => ({ ...star, ...drawn.stars[j] })),
    };
  });
  return {
    children: [skillsDefs(), ...built.map((entry) => entry.node)],
    width: grid.width,
    height: grid.height,
    scale,
    groups: built,
  };
}

/**
 * @brief Recopie les textes d'une langue sur les nœuds déjà en place (bascule de langue).
 *
 * Les groupes et les étoiles restent les mêmes nœuds : le focus n'est pas perdu.
 *
 * @param {{ groups: object[] }} built résultat de buildOverview
 * @param {object[]} groups `skills.groups` de la nouvelle langue (mêmes identifiants)
 * @param {object} text `skills` de la nouvelle langue
 */
export function retext(built, groups, text) {
  built.groups.forEach((entry, k) => {
    const group = groups[k];
    const items = new Map(group.items.map((item) => [item.id, item]));
    entry.node.setAttribute('aria-label', format(text.explore, { name: group.title }));
    entry.title.textContent = group.short;
    for (const star of entry.stars) star.label.textContent = items.get(star.id).name;
  });
}

/**
 * @brief Replace le nom de chaque étoile au-dessus de son astre, à l'unité d'écran courante.
 *
 * @param {{ groups: object[], scale: number }} built résultat de buildOverview
 * @param {number} unit unités du dessin par pixel affiché (`--u` de la caméra)
 */
export function placeLabels(built, unit) {
  for (const entry of built.groups)
    for (const star of entry.stars)
      star.label.setAttribute('y', star.y - labelOffset(star.level, built.scale, unit));
}
