/*
Noms d'étoiles de la vue d'ensemble : place les noms d'une constellation sans chevauchement
ni débord de sa cellule. Module pur, en unités du dessin ; skills-scene.js mesure et applique.
Rendu choisi par Louis le 15/11/2026 : place habituelle au-dessus de l'astre, sinon dessous,
sur un côté, glissé à droite ou à gauche, puis plus haut ou plus bas.
*/

export const ASCENT = 1; // em de la boîte d'un nom au-dessus de sa base (mesurée)
export const DESCENT = 0.28; // em de la boîte d'un nom sous sa base
const LINE = 1.15; // interligne d'un nom sur deux lignes, en em (LINE_EM de skills-art.js)
const SPACE = 0.25; // em laissés entre deux noms
const PAD = 0.5; // em laissés entre un nom et le bord de la cellule
const SIDE = 0.4; // em laissés entre un astre et un nom placé sur son côté
const SEARCH_BUDGET = 20000; // places essayées au plus par constellation

const finite = (value) => (Number.isFinite(value) ? value : 0);

/** Boîte `{ l, r, t, b }` d'un nom dont le centre est `x` et la base `base`. */
function boxAt(name, x, base, font) {
  return {
    l: x - name.half,
    r: x + name.half,
    t: base - (name.rise * LINE + ASCENT) * font,
    b: base + DESCENT * font,
  };
}

/** Vrai si deux boîtes se touchent à moins de `gap`. */
function hits(a, b, gap) {
  return a.l < b.r + gap && a.r > b.l - gap && a.t < b.b + gap && a.b > b.t - gap;
}

/**
 * @brief Place habituelle d'un nom : au-dessus de son astre, décalé de `shift` à gauche.
 *
 * @param {{ cx: number, y: number, radius: number, shift: number }} name étoile
 * @param {number} lift écart entre un astre et son nom
 *
 * @returns {{ x: number, base: number }} centre et base du nom
 */
export function usualSpot(name, lift) {
  return { x: name.cx - name.shift, base: name.y - name.radius - lift };
}

/** Places possibles d'un nom, de la préférée à la dernière : `{ x, base }`. */
function spotsOf(name, font, lift) {
  const rise = (name.rise * LINE + ASCENT) * font;
  const step = rise + (DESCENT + SPACE) * font;
  const { base: above } = usualSpot(name, lift);
  const below = name.y + name.radius + lift + rise;
  const level = name.y + (rise - DESCENT * font) / 2;
  const reach = name.radius + SIDE * font + name.half;
  return [
    usualSpot(name, lift),
    { x: name.cx, base: below },
    { x: name.cx + reach, base: level },
    { x: name.cx - reach, base: level },
    { x: name.cx + name.half, base: above },
    { x: name.cx - name.half, base: above },
    { x: name.cx + name.half, base: below },
    { x: name.cx - name.half, base: below },
    { x: name.cx, base: above - step },
    { x: name.cx, base: below + step },
    { x: name.cx, base: above - 2 * step },
    { x: name.cx, base: below + 2 * step },
  ];
}

/**
 * @brief Place les noms des étoiles d'une constellation : place habituelle, sinon la
 *   première place libre (aucun autre nom, astre ou obstacle), toujours dans le plan.
 *
 * Étoiles les plus hautes d'abord, avec retour arrière ; sans solution dans le budget, un
 * nom sans place libre garde l'habituelle. Valeur non finie : comptée 0.
 *
 * @param {{ cx: number, y: number, radius: number, half: number, rise: number,
 *   shift: number }[]} names par étoile : centre de l'astre, rayon, demi-largeur du nom,
 *   interlignes au-dessus de la base (0 ou 1), décalage à gauche de la place habituelle
 * @param {object} options `min`, `max` : bords de la cellule (nom plus large : centré) ;
 *   `font` : taille de police ; `lift` : écart entre un astre et son nom ; `obstacles` :
 *   boîtes `{ l, r, t, b }` à éviter
 *
 * @returns {{ x: number, base: number }[]} centre et base de chaque nom, ordre de `names`
 */
export function placeNames(names, { min, max, font, lift, obstacles }) {
  const size = finite(font);
  const stars = names.map((name) => ({
    cx: finite(name.cx),
    y: finite(name.y),
    radius: finite(name.radius),
    half: finite(name.half),
    rise: finite(name.rise),
    shift: finite(name.shift),
  }));
  const bodies = stars.map((name) => ({
    l: name.cx - name.radius,
    r: name.cx + name.radius,
    t: name.y - name.radius,
    b: name.y + name.radius,
  }));
  const order = stars.map((_, k) => k).sort((a, b) => stars[a].y - stars[b].y || a - b);
  const choices = stars.map((name) => {
    const [left, right] = [min + name.half + PAD * size, max - name.half - PAD * size];
    const inside = (x) => (
      left > right ? (min + max) / 2 : Math.min(Math.max(x, left), right)
    );
    return spotsOf(name, size, finite(lift)).map((spot) => {
      const x = inside(spot.x);
      return { x, base: spot.base, box: boxAt(name, x, spot.base, size) };
    });
  });
  const free = (k, rank, placed) => {
    const { box } = choices[k][rank];
    return !obstacles.some((other) => hits(box, other, SPACE * size))
      && !placed.some((other) => hits(box, other, SPACE * size))
      && !bodies.some((body, j) => (j !== k || rank > 0) && hits(box, body, 0));
  };
  let budget = SEARCH_BUDGET;
  /** Retour arrière : rangs des places des étoiles `order[depth...]`, ou null. */
  const search = (depth, placed) => {
    if (depth === order.length) return [];
    const k = order[depth];
    for (let rank = 0; rank < choices[k].length && budget > 0; rank += 1) {
      budget -= 1;
      if (!free(k, rank, placed)) continue;
      const rest = search(depth + 1, [...placed, choices[k][rank].box]);
      if (rest) return [rank, ...rest];
    }
    return null;
  };
  /** Repli sans retour arrière : première place libre de chacun, sinon l'habituelle. */
  const greedy = () => {
    const placed = [];
    return order.map((k) => {
      const rank = Math.max(0, choices[k].findIndex((_, at) => free(k, at, placed)));
      placed.push(choices[k][rank].box);
      return rank;
    });
  };
  const ranks = search(0, []) ?? greedy();
  const spots = new Array(stars.length);
  order.forEach((k, depth) => {
    const { x, base } = choices[k][ranks[depth]];
    spots[k] = { x, base };
  });
  return spots;
}
