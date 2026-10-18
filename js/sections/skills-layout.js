/*
Placement et caméras de la section Compétences : module pur, sans accès au DOM, sans hasard.
Formules de la maquette validée (historique git, a49d2a5).
Critères : plan.md, Principes : « Le placement organique des constellations est calculé
à partir de `id`, jamais du nom traduit. » ; vérifié par tests/unit/skills-layout.test.mjs.
Le placement ne lit donc que `group.id` et le nombre d'étoiles.
*/

const DESK_GRID = { cols: 4, cellWidth: 275, cellHeight: 220 };
const PHONE_GRID = { cols: 2, cellWidth: 170, cellHeight: 200 };
const GOLDEN_ANGLE = 2.39996;
const SEED_MODULO = 628;
const SEED_DIVISOR = 100;
const CENTER_SHIFT_Y = 14;
const RADIUS_BASE = 20;
const RADIUS_STEP = 21;
const RADIUS_OFFSET = 0.6;
const STRETCH_X = 1.25;
const STRETCH_Y = 0.9;
const MARGIN_SIDE = 18;
const MARGIN_BOTTOM = 54;
const MARGIN_MAX_SHARE = 0.25;
const MIN_GAP_SHARE = 0.001;
const NUDGE_ATTEMPTS = 100000;
const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const SPREAD = { desk: 2.1, phone: 1.8 };
const BODY_RADII = { unknown: 14, beginner: 12, intermediate: 22, advanced: 30 };
const BODY_SCALES = {
  desk: { rest: 0.6, focused: 1.4 },
  phone: { rest: 0.5, focused: 1.15 },
};
const DIVE_DIVISOR = { desk: 9, phone: 7 };
const DIVE_VISIBLE_DESK = 0.54;
const DIVE_FILL = 0.34;
const FOCUS = {
  desk: { pad: 190, widthShare: 0.75, heightPad: 140, floor: 340, shiftX: 0.22, shiftY: 0 },
  phone: { pad: 70, widthShare: 1, heightPad: 90, floor: 200, shiftX: 0, shiftY: 0.2 },
};

/**
 * Lève une erreur qui nomme le paramètre et la valeur reçue.
 *
 * @param {string} fn Fonction appelante.
 * @param {string} name Paramètre fautif.
 * @param {*} value Valeur reçue.
 * @param {string} cause Condition attendue.
 *
 * @throws {Error} Toujours.
 */
function fail(fn, name, value, cause) {
  throw new Error(`${fn} : ${name} doit être ${cause}, reçu ${String(value)}`);
}

/**
 * Vérifie qu'une valeur est un nombre fini (strictement positif si demandé).
 *
 * @param {string} fn Fonction appelante.
 * @param {string} name Paramètre vérifié.
 * @param {*} value Valeur à vérifier.
 * @param {boolean} [positive] Exige une valeur strictement positive.
 *
 * @throws {Error} Si la valeur n'est pas un nombre fini (ou pas positive).
 */
function requireNumber(fn, name, value, positive = false) {
  if (typeof value !== 'number' || !Number.isFinite(value))
    fail(fn, name, value, 'un nombre fini');
  if (positive && value <= 0) fail(fn, name, value, 'un nombre strictement positif');
}

/**
 * Vérifie une liste de points `{ x, y }` finis.
 *
 * @param {string} fn Fonction appelante.
 * @param {*} positions Liste à vérifier.
 *
 * @throws {Error} Si ce n'est pas un tableau de points finis.
 */
function requirePositions(fn, positions) {
  if (!Array.isArray(positions)) fail(fn, 'positions', positions, 'un tableau');
  for (const point of positions) {
    requireNumber(fn, 'positions', point?.x);
    requireNumber(fn, 'positions', point?.y);
  }
}

/**
 * Vérifie un centre `{ x, y }` fini.
 *
 * @param {string} fn Fonction appelante.
 * @param {*} center Centre à vérifier.
 *
 * @throws {Error} Si `x` ou `y` n'est pas fini.
 */
function requireCenter(fn, center) {
  requireNumber(fn, 'center', center?.x);
  requireNumber(fn, 'center', center?.y);
}

/**
 * Hachage FNV-1a 32 bits d'une chaîne, déterministe et sans état.
 *
 * @param {string} text Texte à hacher.
 *
 * @returns {number} Entier non signé de 0 à 2^32 - 1.
 */
function hashId(text) {
  let hash = FNV_OFFSET;
  for (let k = 0; k < text.length; k++) {
    hash = Math.imul(hash ^ text.charCodeAt(k), FNV_PRIME);
  }
  return hash >>> 0;
}

/**
 * Ramène une valeur dans un intervalle.
 *
 * @param {number} value Valeur à borner.
 * @param {number} low Borne basse.
 * @param {number} high Borne haute.
 *
 * @returns {number} La valeur dans `[low, high]`.
 */
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

/**
 * Position d'une étoile de la spirale, avant écart minimal.
 *
 * @param {number} index Rang de l'étoile.
 * @param {number} count Nombre d'étoiles du groupe.
 * @param {number} seed Graine issue de l'identifiant du groupe.
 * @param {{ width: number, height: number, xMargin: number, yMargin: number }} box Boîte.
 *
 * @returns {{ x: number, y: number }} Point dans la boîte, marges comprises.
 */
function spiralPoint(index, count, seed, box) {
  const angle = index * GOLDEN_ANGLE + (seed % SEED_MODULO) / SEED_DIVISOR;
  const radius = count === 1
    ? 0
    : RADIUS_BASE + RADIUS_STEP * Math.sqrt(index + RADIUS_OFFSET);
  const x = box.width / 2 + radius * Math.cos(angle) * STRETCH_X;
  const y = box.height / 2 - CENTER_SHIFT_Y + radius * Math.sin(angle) * STRETCH_Y;
  return {
    x: clamp(x, box.xMargin, box.width - box.xMargin),
    y: clamp(y, box.xMargin, box.height - box.yMargin),
  };
}

/**
 * Écarte un point de ceux déjà placés, sur une spirale d'essais déterministe.
 *
 * @param {{ x: number, y: number }} point Point voulu.
 * @param {{ x: number, y: number }[]} placed Points déjà placés.
 * @param {number} gap Distance minimale (strictement positive).
 * @param {{ width: number, height: number, xMargin: number, yMargin: number }} box Boîte.
 *
 * @returns {{ x: number, y: number }} Le point, ou le premier essai libre.
 */
function spreadApart(point, placed, gap, box) {
  const free = (p) => placed.every((q) => Math.hypot(p.x - q.x, p.y - q.y) >= gap);
  if (free(point)) return point;
  for (let k = 1; k <= NUDGE_ATTEMPTS; k++) {
    const angle = k * GOLDEN_ANGLE;
    const reach = gap * Math.sqrt(k);
    const candidate = {
      x: clamp(point.x + reach * Math.cos(angle), box.xMargin, box.width - box.xMargin),
      y: clamp(point.y + reach * Math.sin(angle), box.xMargin, box.height - box.yMargin),
    };
    if (free(candidate)) return candidate;
  }
  return point;
}

/**
 * Placement organique des étoiles d'une constellation dans une cellule.
 * Ne dépend que de `group.id`, du rang et du nombre d'étoiles, jamais des textes traduits.
 * Les marges de la maquette (18 et 54) sont plafonnées au quart de la boîte.
 *
 * @example layoutConstellation(group, { width: 275, height: 220 })
 *   -> [{ id: 'html', x: 137.5, y: 96 }]
 *
 * @param {{ id: string, items: { id: string }[] }} group Constellation à placer.
 * @param {{ width: number, height: number }} size Dimensions de la cellule.
 *
 * @returns {{ id: string, x: number, y: number }[]} Une position par étoile, dans l'ordre.
 * @throws {Error} Si `width` ou `height` n'est pas un nombre fini strictement positif.
 */
export function layoutConstellation(group, { width, height } = {}) {
  requireNumber('layoutConstellation', 'width', width, true);
  requireNumber('layoutConstellation', 'height', height, true);
  const box = {
    width,
    height,
    xMargin: Math.min(MARGIN_SIDE, width * MARGIN_MAX_SHARE, height * MARGIN_MAX_SHARE),
    yMargin: Math.min(MARGIN_BOTTOM, height * MARGIN_MAX_SHARE),
  };
  const gap = Math.min(width, height) * MIN_GAP_SHARE;
  const seed = hashId(group.id);
  const count = group.items.length;
  const placed = [];
  for (let j = 0; j < count; j++) {
    placed.push(spreadApart(spiralPoint(j, count, seed, box), placed, gap, box));
  }
  return group.items.map((item, j) => ({ id: item.id, x: placed[j].x, y: placed[j].y }));
}

/**
 * Grille des constellations.
 *
 * @example gridOf(5, { phone: true }) -> { cols: 2, cellWidth: 170, cellHeight: 200, ... }
 *
 * @param {number} count Nombre de constellations (entier d'au moins 1).
 * @param {{ phone?: boolean }} options Mode téléphone.
 *
 * @returns {{ cols: number, cellWidth: number, cellHeight: number,
 *   width: number, height: number }} Grille et dimensions totales.
 * @throws {Error} Si `count` n'est pas un entier d'au moins 1.
 */
export function gridOf(count, { phone } = {}) {
  if (!Number.isInteger(count) || count < 1) fail('gridOf', 'count', count, 'un entier >= 1');
  const { cols, cellWidth, cellHeight } = phone ? PHONE_GRID : DESK_GRID;
  return {
    cols,
    cellWidth,
    cellHeight,
    width: cols * cellWidth,
    height: Math.ceil(count / cols) * cellHeight,
  };
}

/**
 * Ordre de parcours des étoiles : tri par angle autour du centre, puis rotation.
 *
 * @example walkOrder([{ id: 'a', x: 1, y: 0 }], { x: 0, y: 0 }) -> ['a']
 *
 * @param {{ id: string, x: number, y: number }[]} positions Étoiles placées.
 * @param {{ x: number, y: number }} center Centre de la constellation.
 *
 * @returns {string[]} Les ids, `positions[0]` en tête, égalités dans l'ordre des données.
 * @throws {Error} Si `positions` ou `center` contient une valeur non finie.
 */
export function walkOrder(positions, center) {
  requirePositions('walkOrder', positions);
  requireCenter('walkOrder', center);
  const entries = positions.map((point, index) => ({
    id: point.id,
    index,
    angle: Math.atan2(point.y - center.y, point.x - center.x),
  }));
  const sorted = [...entries].sort((a, b) => a.angle - b.angle || a.index - b.index);
  const start = sorted.findIndex((entry) => entry.index === 0);
  return [...sorted.slice(start), ...sorted.slice(0, start)].map((entry) => entry.id);
}

/**
 * Écarte les étoiles du centre pour la vue de détail.
 *
 * @example spreadOf([{ id: 'a', x: 110, y: 50 }], { x: 100, y: 50 }, {}) -> x = 121
 *
 * @param {{ id: string, x: number, y: number }[]} positions Étoiles placées.
 * @param {{ x: number, y: number }} center Centre fixe.
 * @param {{ phone?: boolean }} options Mode téléphone.
 *
 * @returns {{ id: string, x: number, y: number }[]} Positions neuves, même ordre.
 * @throws {Error} Si `positions` ou `center` contient une valeur non finie.
 */
export function spreadOf(positions, center, { phone } = {}) {
  requirePositions('spreadOf', positions);
  requireCenter('spreadOf', center);
  const factor = phone ? SPREAD.phone : SPREAD.desk;
  return positions.map((point) => ({
    id: point.id,
    x: center.x + (point.x - center.x) * factor,
    y: center.y + (point.y - center.y) * factor,
  }));
}

/**
 * Étendue d'un nuage de points.
 *
 * @example extentOf([{ x: 0, y: 1 }, { x: 4, y: 3 }]) -> { width: 4, height: 2 }
 *
 * @param {{ x: number, y: number }[]} positions Points (au moins un).
 *
 * @returns {{ width: number, height: number }} Écarts max moins min de x puis de y.
 * @throws {Error} Si `positions` est vide ou contient une valeur non finie.
 */
export function extentOf(positions) {
  requirePositions('extentOf', positions);
  if (positions.length === 0) fail('extentOf', 'positions', '[]', 'un tableau non vide');
  const xs = positions.map((point) => point.x);
  const ys = positions.map((point) => point.y);
  return {
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}

/**
 * Caméra de la vue d'ensemble.
 *
 * @example overviewCamera({ width: 1100, height: 440 }, 0.5) -> { cx: 550, cy: 220, w: 1100 }
 *
 * @param {{ width: number, height: number }} size Dimensions de la grille.
 * @param {number} ratio Rapport hauteur sur largeur de l'écran.
 *
 * @returns {{ cx: number, cy: number, w: number }} Centre et largeur visible.
 * @throws {Error} Si `ratio`, `width` ou `height` n'est pas un nombre fini positif.
 */
export function overviewCamera(size, ratio) {
  requireNumber('overviewCamera', 'width', size?.width, true);
  requireNumber('overviewCamera', 'height', size?.height, true);
  requireNumber('overviewCamera', 'ratio', ratio, true);
  return {
    cx: size.width / 2,
    cy: size.height / 2,
    w: Math.max(size.width, size.height / ratio),
  };
}

/**
 * Caméra cadrée sur une étoile pour une largeur visible donnée.
 *
 * @param {{ x: number, y: number }} star Étoile visée.
 * @param {number} w Largeur visible.
 * @param {number} ratio Rapport hauteur sur largeur.
 * @param {boolean} phone Mode téléphone.
 *
 * @returns {{ cx: number, cy: number, w: number }} Centre décalé selon le mode.
 */
function frameStar(star, w, ratio, phone) {
  const mode = phone ? FOCUS.phone : FOCUS.desk;
  return { cx: star.x + mode.shiftX * w, cy: star.y + mode.shiftY * w * ratio, w };
}

/**
 * Caméra de la vue de détail sur une étoile.
 *
 * @example focusCamera({ x: 300, y: 200 }, { width: 0, height: 0 }, 1, {}) -> { w: 340, ... }
 *
 * @param {{ x: number, y: number }} star Étoile visée.
 * @param {{ width: number, height: number }} extent Étendue de la constellation.
 * @param {number} ratio Rapport hauteur sur largeur de l'écran.
 * @param {{ phone?: boolean }} options Mode téléphone.
 *
 * @returns {{ cx: number, cy: number, w: number }} Centre et largeur visible.
 * @throws {Error} Si une valeur de `star`, `extent` ou `ratio` n'est pas valide.
 */
export function focusCamera(star, extent, ratio, { phone } = {}) {
  requireNumber('focusCamera', 'star', star?.x);
  requireNumber('focusCamera', 'star', star?.y);
  requireNumber('focusCamera', 'extent', extent?.width);
  requireNumber('focusCamera', 'extent', extent?.height);
  requireNumber('focusCamera', 'ratio', ratio, true);
  const mode = phone ? FOCUS.phone : FOCUS.desk;
  const w = Math.max(
    extent.width * mode.widthShare + mode.pad,
    (extent.height + mode.heightPad) / ratio,
    mode.floor,
  );
  return frameStar(star, w, ratio, Boolean(phone));
}

/**
 * Rayon du corps d'une étoile selon son niveau.
 *
 * @example bodyRadius('advanced') -> 30
 *
 * @param {string} level `unknown`, `beginner`, `intermediate` ou `advanced`.
 *
 * @returns {number} Rayon en unités de la scène.
 * @throws {Error} Si `level` n'est pas l'un des quatre niveaux.
 */
export function bodyRadius(level) {
  if (typeof level !== 'string' || !Object.hasOwn(BODY_RADII, level))
    fail('bodyRadius', 'level', level, 'unknown, beginner, intermediate ou advanced');
  return BODY_RADII[level];
}

/**
 * Cible de la plongée vers une étoile : caméra serrée et échelle du corps.
 *
 * @example diveTarget({ x: 0, y: 0, level: 'advanced' }, view, {}) -> { cam, scale }
 *
 * @param {{ x: number, y: number, level: string }} star Étoile visée.
 * @param {{ width: number, height: number, ratio: number }} view Écran visible.
 * @param {{ phone?: boolean }} options Mode téléphone.
 *
 * @returns {{ cam: { cx: number, cy: number, w: number }, scale: number }} Cible.
 * @throws {Error} Si `level`, `star`, `view` ou `ratio` n'est pas valide.
 */
export function diveTarget(star, view, { phone } = {}) {
  const radius = bodyRadius(star?.level);
  requireNumber('diveTarget', 'star', star.x);
  requireNumber('diveTarget', 'star', star.y);
  requireNumber('diveTarget', 'width', view?.width, true);
  requireNumber('diveTarget', 'height', view?.height, true);
  requireNumber('diveTarget', 'ratio', view.ratio, true);
  const w = view.width / (phone ? DIVE_DIVISOR.phone : DIVE_DIVISOR.desk);
  const visibleWidth = phone ? view.width : view.width * DIVE_VISIBLE_DESK;
  return {
    cam: frameStar(star, w, view.ratio, Boolean(phone)),
    scale: Math.min(visibleWidth * DIVE_FILL, view.height * DIVE_FILL) / radius,
  };
}

/**
 * Échelle du corps d'une étoile.
 *
 * @example bodyScale({ phone: true, focused: false }) -> 0.5
 *
 * @param {{ phone?: boolean, focused?: boolean }} options Mode et étoile cadrée.
 *
 * @returns {number} 0,6 ou 1,4 au bureau ; 0,5 ou 1,15 sur téléphone.
 */
export function bodyScale({ phone, focused } = {}) {
  const scales = phone ? BODY_SCALES.phone : BODY_SCALES.desk;
  return focused ? scales.focused : scales.rest;
}
