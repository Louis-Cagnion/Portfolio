/*
Compétences, déploiement : pose des étoiles et de leurs noms, cadrage du téléphone et recul
du saut d'étoile. Fonctions sans état ni écouteur : skills-focus.js les appelle à chaque
image de l'animation.
Formules de la maquette P2 : docs/design/s8/mockup-skills.js (`layoutStars`, `dive`) ;
cadrage du nuage entier sur téléphone : critère de Louis du 13/10/2026 (31 noms entiers).
*/
import { ease, lerp } from '../core/motion.js';
import { labelOffset } from './skills-art.js';
import { bodyRadius, bodyScale, extentOf } from './skills-layout.js';
import { LEVELS } from './skills-scene.js';

export const PHONE_RATIO = 1.15; // hauteur du plan déployé en largeurs (plan.md : 1 / 1.15)
const NAME_DROP = 12; // maquette:layoutStars : nom sous l'astre, 12 px sous son bord
const NAME_HEIGHT = 18; // px : hauteur d'une ligne de nom (14 px de police)
const NAME_GAP = 9; // px : écart entre l'astre et un nom placé au-dessus
const EDGE = 6; // px : marge entre un nom ou un astre et le bord du cadre
const FIT_WIDTH = { min: 200, max: 4000 }; // largeur visible du cadrage du nuage
const HOP_FACTOR = 2.4; // maquette:dive : recul à 2,4 fois la distance entre les deux étoiles
const HOP_MIN = 160; // maquette:dive : largeur minimale du recul

/**
 * @brief Place les étoiles d'une constellation entre le repos et l'écartement, avec leurs
 *   noms et leurs liens.
 *
 * Mémorise la position courante de chaque étoile (`cx`, `cy`).
 *
 * @param {{ stars: object[], links: SVGElement[] }} entry constellation de buildOverview
 * @param {{ x: number, y: number }[]} spots positions écartées, dans l'ordre des étoiles
 * @param {object} pose
 * @param {number} pose.t 0 au repos, 1 écartées
 * @param {number} pose.drop 0 : noms au-dessus des astres, 1 : dessous (téléphone seulement)
 * @param {number} pose.scale échelle courante des astres (`--bs`)
 * @param {number} pose.unit unités du dessin par pixel affiché (`--u`)
 * @param {boolean} pose.phone mode téléphone
 */
export function placeStars(entry, spots, { t, drop, scale, unit, phone }) {
  entry.stars.forEach((star, j) => {
    const x = lerp(star.x, spots[j].x, t);
    const y = lerp(star.y, spots[j].y, t);
    const offset = labelOffset(star.level, scale, unit);
    const above = y - offset;
    star.cx = x;
    star.cy = y;
    star.body.setAttribute('transform', `translate(${x} ${y})`);
    star.hit.setAttribute('cx', x);
    star.hit.setAttribute('cy', y);
    star.label.setAttribute('x', x);
    const below = y + offset + NAME_DROP * unit;
    star.label.setAttribute('y', phone ? lerp(above, below, drop) : above);
  });
  entry.links.forEach((link, j) => {
    const [a, b] = [entry.stars[j], entry.stars[j + 1]];
    link.setAttribute('x1', a.cx);
    link.setAttribute('y1', a.cy);
    link.setAttribute('x2', b.cx);
    link.setAttribute('y2', b.cy);
  });
}

/**
 * @brief Cadre visible du plan de téléphone déployé, à mesurer plan affiché.
 *
 * Le panneau remonte de `margin-top` sur le bloc collant (plan puis aide) : la partie libre
 * est la hauteur finale du plan moins ce que le panneau en recouvre.
 *
 * @param {SVGSVGElement} plan svg#constSvg
 * @param {HTMLElement} panel .focus-panel, déjà en flux (rubrique déployée)
 *
 * @returns {{ width: number, height: number, free: number }} largeur, hauteur finale du
 *   plan et hauteur libre au-dessus du panneau, en pixels
 */
export function phoneFrame(plan, panel) {
  const width = plan.clientWidth;
  const height = width * PHONE_RATIO;
  const hint = plan.parentElement.getBoundingClientRect().height
    - plan.getBoundingClientRect().height;
  const cover = -parseFloat(getComputedStyle(panel).marginTop) - hint;
  return { width, height, free: height - Math.max(0, cover) };
}

/**
 * @brief Demi-largeur du nom et rayon de l'astre de chaque étoile, en pixels affichés.
 *
 * À mesurer rubrique affichée : la largeur d'un nom vient du rendu.
 *
 * @param {{ level: number, label: SVGTextElement }[]} stars étoiles de la constellation
 *
 * @returns {{ half: number, reach: number }[]} une entrée par étoile
 */
export function nameBoxes(stars) {
  const scale = bodyScale({ phone: true, focused: true });
  return stars.map((star) => ({
    half: star.label.getBoundingClientRect().width / 2,
    reach: bodyRadius(LEVELS[star.level]) * scale,
  }));
}

/**
 * @brief Plus petite largeur visible qui garde une étoile, son astre et son nom dans la
 *   zone libre du cadre.
 *
 * @param {{ x: number, y: number }} offset écart de l'étoile au centre du nuage (unités)
 * @param {{ half: number, reach: number }} box mesures de l'étoile
 * @param {{ width: number, free: number }} frame cadre visible
 *
 * @returns {number} largeur du viewBox ; `Infinity` si la zone libre ne la contient jamais
 */
function widthFor({ x, y }, { half, reach }, { width, free }) {
  const side = width / 2 - EDGE - half;
  const top = free / 2 - reach - NAME_GAP - NAME_HEIGHT - EDGE;
  const bottom = free / 2 - reach - EDGE;
  const need = (distance, room) => (room > 0 ? (distance * width) / room : Infinity);
  return Math.max(
    need(Math.abs(x), side),
    need(Math.max(y, 0), top),
    need(Math.max(-y, 0), bottom),
  );
}

/**
 * @brief Caméra du déploiement sur téléphone : tout le nuage, noms compris, au-dessus du
 *   panneau.
 *
 * Plonger sur la première étoile (`focusCamera`) couperait les noms des autres.
 *
 * @param {{ width: number, height: number, free: number }} frame résultat de phoneFrame
 * @param {{ x: number, y: number }[]} spots positions écartées des étoiles
 * @param {{ half: number, reach: number }[]} boxes résultat de nameBoxes
 *
 * @returns {{ cx: number, cy: number, w: number }} centre et largeur visible
 */
export function phoneCamera(frame, spots, boxes) {
  const extent = extentOf(spots);
  const mid = {
    x: Math.min(...spots.map((spot) => spot.x)) + extent.width / 2,
    y: Math.min(...spots.map((spot) => spot.y)) + extent.height / 2,
  };
  const wanted = Math.max(...spots.map((spot, j) => widthFor(
    { x: spot.x - mid.x, y: mid.y - spot.y },
    boxes[j],
    frame,
  )));
  const w = Math.min(Math.max(wanted, FIT_WIDTH.min), FIT_WIDTH.max);
  return { cx: mid.x, cy: mid.y + ((frame.height - frame.free) / 2 / frame.width) * w, w };
}

/**
 * @brief Recul à mi-course d'un saut entre deux étoiles.
 *
 * @param {{ x: number, y: number }[]} spots positions écartées des étoiles
 * @param {number} from rang de départ
 * @param {number} to rang d'arrivée
 * @param {boolean} phone mode téléphone
 *
 * @returns {{ w: number, scale: number }} largeur visible et échelle des astres au recul
 */
export function hopOf(spots, from, to, phone) {
  const distance = Math.hypot(spots[to].x - spots[from].x, spots[to].y - spots[from].y);
  return {
    w: Math.max(distance * HOP_FACTOR, HOP_MIN),
    scale: bodyScale({ phone, focused: true }),
  };
}

/**
 * @brief Valeur à la progression `k` d'un trajet qui passe par `mid` à mi-course.
 *
 * @param {number} from valeur de départ
 * @param {number | undefined} mid valeur du recul ; absente : trajet direct
 * @param {number} to valeur d'arrivée
 * @param {number} k progression de 0 à 1
 *
 * @returns {number} valeur adoucie par `ease` sur chaque moitié
 */
export function blend(from, mid, to, k) {
  if (mid === undefined) return lerp(from, to, ease(k));
  if (k < 0.5) return lerp(from, mid, ease(k * 2));
  return lerp(mid, to, ease(k * 2 - 1));
}
