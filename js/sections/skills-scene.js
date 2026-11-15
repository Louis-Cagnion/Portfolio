/*
Compétences, vue d'ensemble : construit les huit constellations (dessin de skills-art.js,
placement de skills-layout.js) et tient leurs textes et leurs noms d'étoile à jour. Aucun
écouteur, aucun état : skills.js câble et mesure. Au repos, le nom sur deux lignes d'une étoile
(`lines`) est décalé de `NAME_SHIFT` px d'écran vers la gauche de l'astre ; un nom qui en
gênerait un autre ou sortirait de sa cellule change de place (`placeLabels`, skills-names.js).
Le nom complet de chaque étoile (`name`) est gardé sur l'objet étoile ; `nameLines` des
données ne sert qu'au tracé du nom (deux lignes).
Structure et mécanique de la maquette.
*/
import { format } from '../core/i18n.js';
import { levelRank } from '../core/levels.js';
import {
  constellationGroup,
  LABEL_GAP,
  labelOffset,
  moveLabel,
  NAME_SHIFT,
  nameRise,
  setName,
  skillsDefs,
} from './skills-art.js';
import { bodyScale, gridOf, layoutConstellation, walkOrder } from './skills-layout.js';
import { ASCENT, DESCENT, placeNames, usualSpot } from './skills-names.js';

const CENTER_SHIFT_Y = 14; // centre des étoiles remonté dans la cellule
const TITLE_RISE = 22; // nom court à 22 unités du bas de la cellule
const NAME_FONT = 12.5; // px : police d'un nom d'étoile (`.const .name` de skills.css)
const TITLE_FONT = 14; // px : police du nom d'une constellation (`.const .cname`)

/**
 * @brief Étoiles d'une constellation, placées dans la grille et rangées dans l'ordre du
 *   parcours (angle autour du centre, en partant de la première étoile des données).
 *
 * @param {object} group constellation de `skills.groups`
 * @param {{ x: number, y: number }} origin coin haut gauche de sa cellule
 * @param {{ x: number, y: number }} center centre des étoiles
 * @param {{ width: number, height: number }} size taille de la cellule
 *
 * @returns {{ id: string, name: string, lines?: string[], level: number, x: number,
 *   y: number }[]} étoiles
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
    lines: items.get(id).nameLines,
    level: levelRank(items.get(id).level),
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
 *   échelle de repos et, par constellation, `{ id, node, title, center, cell, stars }` :
 *   `cell` est sa cellule `{ x, y, width, height }`, `stars` suit l'ordre du parcours, `{ id,
 *   name, level, x, y, element, body, hit, label }` (`name` complet, jamais lu dans `label`)
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
      cell: { ...origin, ...size },
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
    for (const star of entry.stars) {
      const item = items.get(star.id);
      star.name = item.name;
      star.lines = item.nameLines;
      setName(star.label, item.name, item.nameLines);
    }
  });
}

/** Demi-largeur du texte le plus large d'un nœud SVG (ses lignes, ou lui-même). */
function halfWidth(node) {
  const lines = node.childElementCount ? [...node.children] : [node];
  return Math.max(...lines.map((line) => line.getComputedTextLength())) / 2;
}

/** Boîte du nom court d'une constellation, que les noms d'étoiles évitent. */
function titleBox(title, unit) {
  const [x, y] = [Number(title.getAttribute('x')), Number(title.getAttribute('y'))];
  const half = halfWidth(title);
  const font = TITLE_FONT * unit;
  return { l: x - half, r: x + half, t: y - ASCENT * font, b: y + DESCENT * font };
}

/** Boîtes à éviter par les noms d'une constellation : son titre, la rangée du dessus. */
function obstaclesOf(entry, unit) {
  const { x, y, width, height } = entry.cell;
  const title = titleBox(entry.title, unit);
  return y > 0 ? [title, { l: x, r: x + width, t: y - height, b: y }] : [title];
}

/**
 * @brief Replace le nom de chaque étoile à l'unité d'écran courante : au-dessus de son
 *   astre, ou à la première place libre s'il gênerait un autre nom (`placeNames`).
 *
 * @param {{ groups: object[], scale: number }} built résultat de buildOverview
 * @param {number} unit unités du dessin par pixel affiché (`--u` de la caméra)
 * @param {boolean} [avoid] vrai : un nom gênant change de place, dans la cellule de sa
 *   constellation ; faux (téléphone, noms masqués au repos) : place habituelle
 */
export function placeLabels(built, unit, avoid = false) {
  const lift = LABEL_GAP * unit;
  for (const entry of built.groups) {
    const names = entry.stars.map((star) => ({
      cx: star.x,
      y: star.y,
      radius: labelOffset(star.level, built.scale, unit) - lift,
      half: halfWidth(star.label),
      rise: nameRise(star.label),
      shift: star.lines ? NAME_SHIFT * unit : 0,
    }));
    const spots = avoid
      ? placeNames(names, {
        min: entry.cell.x,
        max: entry.cell.x + entry.cell.width,
        font: NAME_FONT * unit,
        lift,
        obstacles: obstaclesOf(entry, unit),
      })
      : names.map((name) => usualSpot(name, lift));
    entry.stars.forEach((star, k) => moveLabel(star.label, spots[k].x, spots[k].base));
  }
}
