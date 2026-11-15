/*
Compétences, déploiement : pose des étoiles et de leurs noms, cadrage du téléphone et recul
du saut d'étoile. Fonctions sans état ni écouteur : skills-focus.js les appelle à chaque
image de l'animation. Un nom sur deux lignes (deux `tspan`) garde sa seconde ligne à la place
d'un nom d'une ligne et monte d'une interligne (`nameRise`) : sous l'astre il descend d'autant,
et la caméra du téléphone compte cette hauteur de plus au-dessus de l'astre. Au repos il est
décalé de `NAME_SHIFT` px à gauche de l'astre ; ce décalage se résorbe avec `t` (nul déployé).
Formules de la maquette P2 (`layoutStars`, `dive`) ;
cadrage du nuage entier sur téléphone : critère de Louis du 13/10/2026 (31 noms entiers).
*/
import { ease, lerp } from '../core/motion.js';
import { fitHeight, screenBounds } from '../core/viewport.js';
import { labelOffset, moveLabel, NAME_SHIFT, nameRise } from './skills-art.js';
import { bodyRadius, bodyScale, extentOf } from './skills-layout.js';
import { LEVELS } from './skills-scene.js';

export const PHONE_RATIO = 1.15; // hauteur déployée en largeurs (design-checklist.md, §5)
export const SCROLL_MARGIN = 8; // px entre la barre du haut et le plan déployé (maquette)
const SHORT_WINDOW = 500; // px : un téléphone en paysage reste sous cette hauteur (~430 px)
const PANEL_SHOWN = 12; // px du haut du panneau visibles sous la place de l'étoile
const NAME_DROP = 12; // nom sous l'astre, 12 px sous son bord
const NAME_HEIGHT = 18; // px : hauteur d'une ligne de nom (14 px de police)
const NAME_LINE = 16; // px : interligne d'un nom sur deux lignes (1,15 em de 14 px)
const NAME_GAP = 9; // px : écart entre l'astre et un nom placé au-dessus
const EDGE = 6; // px : marge entre un nom ou un astre et le bord du cadre
const MIN_BODY = 8; // px : rayon minimal d'un astre plongé dans une place réduite
const FIT_WIDTH = { min: 200, max: 4000 }; // largeur visible du cadrage du nuage
const HOP_FACTOR = 2.4; // recul à 2,4 fois la distance entre les deux étoiles
const HOP_MIN = 160; // largeur minimale du recul

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
    const below = y + offset + (NAME_DROP + nameRise(star.label) * NAME_LINE) * unit;
    const shift = nameRise(star.label) ? NAME_SHIFT * unit * (1 - t) : 0;
    moveLabel(star.label, x - shift, phone ? lerp(above, below, drop) : above);
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
 * est la hauteur du plan moins ce que le panneau en recouvre, bornée par la place visible
 * (`fitHeight`). Téléphone en paysage : le titre de la compétence reste aussi à l'écran.
 * L'appelant pose la hauteur renvoyée, jamais une autre.
 *
 * @param {SVGSVGElement} plan svg#constSvg
 * @param {HTMLElement} panel .focus-panel, déjà en flux (rubrique déployée)
 *
 * @returns {{ width: number, height: number, free: number, bounded: boolean }} largeur,
 *   hauteur finale du plan et hauteur libre au-dessus du panneau, en pixels ; `bounded` :
 *   la place visible a réduit la hauteur libre
 */
export function phoneFrame(plan, panel) {
  const width = plan.clientWidth;
  const hint = plan.parentElement.getBoundingClientRect().height
    - plan.getBoundingClientRect().height;
  const cover = Math.max(0, -parseFloat(getComputedStyle(panel).marginTop) - hint);
  const bounds = screenBounds();
  const title = panel.querySelector('h3')?.getBoundingClientRect();
  const peek = title ? title.top - panel.getBoundingClientRect().top : 0; // haut du titre
  const short = bounds.landscape && bounds.windowHeight <= SHORT_WINDOW;
  const wanted = width * PHONE_RATIO - cover;
  const free = fitHeight({
    wanted,
    windowHeight: bounds.windowHeight,
    tabbarTop: bounds.tabbarTop,
    planTop: bounds.barHeight + SCROLL_MARGIN,
    margin: PANEL_SHOWN + (short ? peek : 0),
  });
  return { width, height: free + cover, free, bounded: free < wanted };
}

/**
 * @brief Réduit la plongée sur une étoile quand la zone libre du plan est trop basse.
 *
 * Place réduite (téléphone en paysage) : l'astre est rapetissé et remonté pour tenir avec
 * son nom, placé dessous, dans la zone libre. Plan non borné : cible inchangée.
 *
 * @param {{ cam: { cx: number, cy: number, w: number }, scale: number }} target résultat
 *   de `diveTarget`
 * @param {{ width: number, height: number, free: number, bounded: boolean }} frame résultat
 *   de phoneFrame
 * @param {object} star
 * @param {number} star.y ordonnée de l'étoile (unités)
 * @param {string} star.level niveau de l'étoile
 * @param {number} star.rise interlignes du nom au-dessus de sa base (`nameBoxes`)
 *
 * @returns {{ cam: { cx: number, cy: number, w: number }, scale: number }} cible adaptée
 */
export function fitDive(target, frame, { y, level, rise }) {
  if (!frame.bounded) return target;
  const radius = bodyRadius(level);
  const unit = target.cam.w / frame.width; // unités du dessin par pixel
  const centre = frame.height / 2 - (target.cam.cy - y) / unit; // px sous le haut du plan
  const below = NAME_DROP + NAME_HEIGHT + rise * NAME_LINE + EDGE;
  if (centre + target.scale * radius + below <= frame.free) return target;
  const body = Math.max((frame.free - below - EDGE) / 2, MIN_BODY);
  const cy = y + (frame.height / 2 - (EDGE + body)) * unit;
  return { cam: { ...target.cam, cy }, scale: Math.min(target.scale, body / radius) };
}

/**
 * @brief Demi-largeur du nom et rayon de l'astre de chaque étoile, en pixels affichés.
 *
 * À mesurer rubrique affichée : la largeur d'un nom vient du rendu.
 *
 * @param {{ level: number, label: SVGTextElement }[]} stars étoiles de la constellation
 *
 * @returns {{ half: number, reach: number, rise: number }[]} une entrée par étoile
 *   (`rise` : interlignes du nom au-dessus de sa base)
 */
export function nameBoxes(stars) {
  const scale = bodyScale({ phone: true, focused: true });
  return stars.map((star) => ({
    half: star.label.getBoundingClientRect().width / 2,
    reach: bodyRadius(LEVELS[star.level]) * scale,
    rise: nameRise(star.label),
  }));
}

/**
 * @brief Plus petite largeur visible qui garde une étoile, son astre et son nom dans la
 *   zone libre du cadre.
 *
 * @param {{ x: number, y: number }} offset écart de l'étoile au centre du nuage (unités)
 * @param {{ half: number, reach: number, rise: number }} box mesures de l'étoile
 * @param {{ width: number, free: number }} frame cadre visible
 *
 * @returns {number} largeur du viewBox ; `Infinity` si la zone libre ne la contient jamais
 */
function widthFor({ x, y }, { half, reach, rise }, { width, free }) {
  const side = width / 2 - EDGE - half;
  const top = free / 2 - reach - NAME_GAP - NAME_HEIGHT - rise * NAME_LINE - EDGE;
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
 * @param {{ half: number, reach: number, rise: number }[]} boxes résultat de nameBoxes
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
