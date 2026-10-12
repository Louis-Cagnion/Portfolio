/*
Placement des planètes de la section Projets : module pur, sans accès au DOM.
Source des valeurs : docs/design/s6/mockup.js (maquette validée).
Le placement ne dépend que de l'identifiant du système et du nombre de blocs.
*/

const TAU = 2 * Math.PI;
const PISCINE_ID = 'piscine';
const PISCINE_SIZE = 20;
const SIZE_BASE = 7;
const SIZE_PER_BLOCK = 1.4;
const SIZE_BONUS_MAX = 6;
const DEFAULT_HIT_RADIUS = 22;
const DEFAULT_RADII = [72, 120, 168];
const RING_COUNT_OTHER = DEFAULT_RADII.length;
const ANGLE_STEP_OTHER = 2.4;
const DESK_RATIOS = [0.28, 0.46, 0.64, 0.82, 1];
const DESK_COUNTS = [2, 4, 4, 5, 5];
const DESK_OFFSETS = [1.1, 3.59, 4.46, 5.18, 0.71];
const PHONE_RINGS_PX = [43, 83, 123];
// Téléphone : un couple [anneau, angle] par module de la Piscine.
const PHONE_SLOTS = [
  [2, 4.42], [2, 4.995], [1, 6.059], [2, 1.875], [1, 3.043], [2, 5.448], [2, 1.296],
  [0, 1.113], [2, 0.444], [2, 0.902], [2, 0.007], [1, 1.565], [1, 3.903], [1, 0.659],
  [0, 3.428], [2, 5.82], [2, 3.49], [1, 2.253], [0, 5.268], [2, 2.661],
];

/**
 * Taille d'une planète selon le nombre de blocs du projet.
 *
 * @example planetSize({ blocks: [{}, {}] }) -> 9.8
 *
 * @param {{ blocks: Array }} project Projet dont on compte les blocs.
 *
 * @returns {number} 7 plus 1,4 par bloc, avec un bonus plafonné à 6.
 * @throws {TypeError} Si `blocks` n'est pas un tableau.
 */
export function planetSize(project) {
  const blocks = project?.blocks;
  if (!Array.isArray(blocks)) {
    throw new TypeError(`planetSize : blocks doit être un tableau, reçu ${String(blocks)}`);
  }
  return SIZE_BASE + Math.min(SIZE_BONUS_MAX, SIZE_PER_BLOCK * blocks.length);
}

/**
 * Rayons des orbites d'un système.
 *
 * @example systemRadii('pro', { phone: false }) -> [72, 120, 168]
 *
 * @param {string} systemId Identifiant du système.
 * @param {{ phone?: boolean, maxRadius?: number }} options Mode et rayon maximal.
 *
 * @returns {number[]} Rayons, du centre vers le bord (tableau neuf).
 * @throws {RangeError} Piscine au bureau sans `maxRadius` fini et positif.
 */
export function systemRadii(systemId, { phone, maxRadius } = {}) {
  if (systemId !== PISCINE_ID) return [...DEFAULT_RADII];
  if (phone) return [...PHONE_RINGS_PX];
  if (!Number.isFinite(maxRadius) || maxRadius <= 0) {
    throw new RangeError(`systemRadii : maxRadius invalide (${String(maxRadius)})`);
  }
  return DESK_RATIOS.map((ratio) => ratio * maxRadius);
}

/**
 * Cases de la Piscine au bureau, triées par angle de base.
 *
 * @param {number[]} radii Rayons des cinq orbites.
 *
 * @returns {{ ring: number, radius: number, angle: number }[]} Cases triées.
 */
function deskSlots(radii) {
  const slots = [];
  DESK_COUNTS.forEach((count, ring) => {
    for (let m = 0; m < count; m++) {
      const angle = (DESK_OFFSETS[ring] + (m * TAU) / count) % TAU;
      slots.push({ ring, radius: radii[ring], angle });
    }
  });
  return slots.sort((a, b) => a.angle - b.angle);
}

/**
 * Cases de la Piscine au téléphone, dans l'ordre des modules.
 *
 * @returns {{ ring: number, radius: number, angle: number }[]} Cases figées.
 */
function phoneSlots() {
  return PHONE_SLOTS.map(([ring, angle]) => ({ ring, radius: PHONE_RINGS_PX[ring], angle }));
}

/**
 * Cases (orbite, rayon, angle de base) d'un système, avant décalage et taille.
 *
 * @param {object} system Système à placer.
 * @param {boolean} phone Mode téléphone.
 * @param {number} maxRadius Rayon maximal de la Piscine au bureau.
 *
 * @returns {{ ring: number, radius: number, angle: number }[]} Une case par projet.
 * @throws {Error} Piscine qui n'a pas 20 projets.
 */
function baseSlots(system, phone, maxRadius) {
  const count = system.projects.length;
  if (system.id === PISCINE_ID) {
    if (count !== PISCINE_SIZE) {
      throw new Error(
        `planetSlots : le système ${system.id} attend ${PISCINE_SIZE} projets, reçu ${count}`,
      );
    }
    return phone ? phoneSlots() : deskSlots(systemRadii(system.id, { phone, maxRadius }));
  }
  const radii = systemRadii(system.id, { phone, maxRadius });
  return system.projects.map((_, j) => {
    const ring = j % RING_COUNT_OTHER;
    return { ring, radius: radii[ring], angle: j * ANGLE_STEP_OTHER };
  });
}

/**
 * Emplacement de chaque planète d'un système, dans l'ordre des projets.
 *
 * @example planetSlots(system, { phone: false })[0] -> { id, ring: 0, radius: 72, ... }
 *
 * @param {object} system Système (`id` et `projects`).
 * @param {{ phone?: boolean, systemIndex?: number, maxRadius?: number }} options Mode,
 *   décalage d'angle (0 par défaut) et rayon maximal.
 *
 * @returns {{ id: string, ring: number, radius: number, angle: number, size: number }[]}
 *   Un élément par projet.
 * @throws {Error} Piscine hors de 20 projets, ou `maxRadius` invalide au bureau.
 */
export function planetSlots(system, { phone, systemIndex = 0, maxRadius } = {}) {
  const slots = baseSlots(system, phone, maxRadius);
  return system.projects.map((project, j) => ({
    id: project.id,
    ring: slots[j].ring,
    radius: slots[j].radius,
    angle: slots[j].angle + systemIndex,
    size: planetSize(project),
  }));
}

/**
 * Coupe un titre à l'espace le plus proche du milieu (le premier à égalité).
 *
 * @example splitTitle('Hello world') -> ['Hello', 'world']
 *
 * @param {string} title Titre à couper.
 *
 * @returns {string[]} `[title]` sans espace, sinon deux parties, espace supprimé.
 */
export function splitTitle(title) {
  const middle = title.length / 2;
  let best = -1;
  for (let k = 0; k < title.length; k++) {
    if (title[k] !== ' ') continue;
    if (best < 0 || Math.abs(k - middle) < Math.abs(best - middle)) best = k;
  }
  return best < 0 ? [title] : [title.slice(0, best), title.slice(best + 1)];
}

/**
 * Planète au centre le plus proche d'un point, sous un rayon de toucher.
 *
 * @example nearestPlanet({ x: 1, y: 0 }, [{ x: 0, y: 0 }]) -> la planète
 *
 * @param {{ x: number, y: number }} point Point visé.
 * @param {{ x: number, y: number }[]} planets Planètes (centres en x et y).
 * @param {number} [hitRadius] Distance à ne pas atteindre (22 par défaut).
 *
 * @returns {object|null} Planète à distance strictement inférieure, la première à égalité.
 */
export function nearestPlanet(point, planets, hitRadius = DEFAULT_HIT_RADIUS) {
  let best = null;
  let bestDistance = hitRadius;
  for (const planet of planets) {
    const distance = Math.hypot(planet.x - point.x, planet.y - point.y);
    if (distance < bestDistance) {
      best = planet;
      bestDistance = distance;
    }
  }
  return best;
}
