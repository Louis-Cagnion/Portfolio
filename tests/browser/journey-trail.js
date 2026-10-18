/* Parcours : traînée du vaisseau. Elle suit le temps et non la cadence d'images (checklist §6,
pas plafonné) : sur 500 ms de voyage, le nombre de particules émises et leur durée de vie (476
ms, une particule par image à 60 Hz dans la maquette) sont les mêmes à 31, 60 et 390 images/s,
et la traînée ne dépasse jamais 41 particules. Test direct de makeShip, sur une horloge fictive
(requestAnimationFrame et performance.now remplacés le temps du cas). */
import { test } from './runner.js';
import { context } from './journey-probe.js';
import { makeShip } from '../../js/sections/journey-ship.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const RATES = [31, 60, 390]; // images par seconde
const TRAVEL_MS = 500; // durée simulée du voyage
const SETTLE_MS = 3000; // durée maximale laissée à la traînée pour s'éteindre
const REFERENCE_FPS = 60;
const REFERENCE_LIFE_MS = 476; // vie de la maquette : 1 / 0.035 image à 60 Hz
const LIFE_TOLERANCE = 0.2;
const COUNT_TOLERANCE = 2;
const MAX_CHILDREN = 41; // TRAIL.max (40) plus la particule en cours d'ajout
const START_MS = 1000;
const SPEED = 0.2; // px de tracé par ms de voyage

/** Joue le voyage à `fps` images/s sur l'horloge fictive ; rend les mesures de la traînée. */
function simulate(fps) {
  const realFrame = window.requestAnimationFrame;
  const realNow = performance.now;
  const host = document.createElementNS(SVG_NS, 'svg');
  const trail = document.createElementNS(SVG_NS, 'g');
  const art = document.createElementNS(SVG_NS, 'g');
  host.append(trail, art);
  document.body.append(host);
  let now = START_MS;
  let queue = [];
  window.requestAnimationFrame = (callback) => queue.push(callback);
  performance.now = () => now;
  try {
    const ship = makeShip(art, trail, (d) => ({ x: d, y: 0 }));
    const born = new Map(); // particule -> date d'émission
    const lives = [];
    let widest = 0;
    const observe = () => {
      for (const node of born.keys())
        if (!node.isConnected) {
          lives.push(now - born.get(node));
          born.delete(node);
        }
      for (const node of trail.children) if (!born.has(node)) born.set(node, now);
      widest = Math.max(widest, trail.children.length);
    };
    const frame = (travelling) => {
      now += 1000 / fps;
      const due = queue;
      queue = [];
      due.forEach((callback) => callback(now));
      if (travelling) ship.place((now - START_MS) * SPEED, 1, true);
      observe();
    };
    let emitted = 0;
    while (now - START_MS < TRAVEL_MS - 1e-6) {
      frame(true);
      emitted = lives.length + born.size;
    }
    while (now - START_MS < TRAVEL_MS + SETTLE_MS && (queue.length || born.size)) frame(false);
    return { emitted, lives, widest, left: born.size };
  } finally {
    window.requestAnimationFrame = realFrame;
    performance.now = realNow;
    host.remove();
  }
}

/** Écarts du nombre de particules émises à celui de la cadence de référence. */
function countProblems(runs) {
  const reference = runs[REFERENCE_FPS].emitted;
  return RATES.filter((fps) => Math.abs(runs[fps].emitted - reference) > COUNT_TOLERANCE)
    .map((fps) => `${fps} images/s : ${runs[fps].emitted} particules émises sur ` +
      `${TRAVEL_MS} ms au lieu de ${reference} (à ${COUNT_TOLERANCE} près)`);
}

/** Écarts de la durée de vie d'une particule à 476 ms (20 % près). */
function lifeProblems(runs) {
  const low = REFERENCE_LIFE_MS * (1 - LIFE_TOLERANCE);
  const high = REFERENCE_LIFE_MS * (1 + LIFE_TOLERANCE);
  return RATES.flatMap((fps) => {
    const { lives, left } = runs[fps];
    if (!lives.length) return [`${fps} images/s : aucune particule n'a disparu`];
    const shortest = Math.min(...lives);
    const longest = Math.max(...lives);
    const problems = [];
    if (shortest < low || longest > high)
      problems.push(`${fps} images/s : vie de ${shortest.toFixed(0)} à ` +
        `${longest.toFixed(0)} ms au lieu de ${REFERENCE_LIFE_MS} ms à 20 % près`);
    if (left) problems.push(`${fps} images/s : ${left} particules jamais éteintes`);
    return problems;
  });
}

/** Plafond du nombre de particules présentes dans la traînée. */
function capProblems(runs) {
  return RATES.filter((fps) => runs[fps].widest > MAX_CHILDREN)
    .map((fps) => `${fps} images/s : jusqu'à ${runs[fps].widest} particules ` +
      `affichées (plafond ${MAX_CHILDREN})`);
}

/**
 * Horodatage de la boucle propre antérieur à celui d'un fade() précédent : la vie des
 * particules ne doit jamais augmenter (opacité relevée avant et après).
 */
function backwardsProblems() {
  const realFrame = window.requestAnimationFrame;
  const host = document.createElementNS(SVG_NS, 'svg');
  const trail = document.createElementNS(SVG_NS, 'g');
  const art = document.createElementNS(SVG_NS, 'g');
  host.append(trail, art);
  document.body.append(host);
  const queue = [];
  window.requestAnimationFrame = (callback) => queue.push(callback);
  try {
    const ship = makeShip(art, trail, (d) => ({ x: d, y: 0 }));
    ship.place(0, 1, true);
    ship.fade(START_MS + 40);
    ship.fade(START_MS + 60);
    const opacities = () => [...trail.children].map((node) => +node.getAttribute('opacity'));
    const before = opacities();
    queue.forEach((callback) => callback(START_MS + 50)); // plus tôt que le fade précédent
    const after = opacities();
    const raised = after.filter((value, at) => value > before[at]);
    return before.length && raised.length
      ? [`${raised.length} particule(s) ont regagné de la vie avec un horodatage antérieur`]
      : [];
  } finally {
    window.requestAnimationFrame = realFrame;
    host.remove();
  }
}

/** @brief Traînée du vaisseau : même densité et même durée de vie à 31, 60 et 390 images/s. */
export async function runTrailRate() {
  const ctx = context(null);
  const names = [
    'traînée : particules émises sur 500 ms identiques à 31, 60 et 390 images/s (2 près)',
    'traînée : vie d\'une particule de 476 ms (20 % près) à 31, 60 et 390 images/s',
    'traînée : jamais plus de 41 particules affichées à 31, 60 et 390 images/s',
    'traînée : un horodatage antérieur au précédent ne rend aucune vie aux particules',
  ];
  const runs = {};
  for (const fps of RATES) runs[fps] = simulate(fps);
  await test(ctx, names[0], () => countProblems(runs));
  await test(ctx, names[1], () => lifeProblems(runs));
  await test(ctx, names[2], () => capProblems(runs));
  await test(ctx, names[3], () => backwardsProblems());
}
