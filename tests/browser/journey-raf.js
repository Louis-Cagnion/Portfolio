/* Parcours : boucles d'animation. Une boucle par rubrique (checklist §6, une boucle par
rubrique ; §6, compteur de rAF) : pendant un trajet du vaisseau et jusqu'à l'extinction de la
traînée, au plus 2 requestAnimationFrame sont en attente (le ciel et une boucle de la rubrique)
; la traînée s'éteint après l'arrivée ; au repos complet il ne reste que le ciel. Mouvement non
réduit, trajet lancé par une flèche. */
import { test } from './runner.js';
import {
  NO_PAIR,
  all,
  arrowPairs,
  context,
  journeyData,
  nowIndex,
  one,
  sleep,
  withJourney,
} from './journey-probe.js';
import { click } from './harness.js';

const MAX_LOOPS = 2;
const SKY_ONLY = 1;
const ARRIVAL_MS = 6000; // durée maximale laissée au trajet
const FADE_MS = 1500; // durée maximale de la traînée après l'arrivée
const POLL_MS = 16;

/**
 * Remplace requestAnimationFrame et cancelAnimationFrame du cadre par des enveloppes qui
 * tiennent la liste des rappels en attente ; `peak` garde le plus grand nombre observé
 * ensemble, mesuré à chaque nouvelle demande.
 */
function countLoops(site) {
  const { win } = site;
  const request = win.requestAnimationFrame.bind(win);
  const cancel = win.cancelAnimationFrame.bind(win);
  const loops = { pending: new Set(), peak: 0 };
  win.requestAnimationFrame = (callback) => {
    const id = request((time) => {
      loops.pending.delete(id);
      callback(time);
    });
    loops.pending.add(id);
    loops.peak = Math.max(loops.peak, loops.pending.size);
    return id;
  };
  win.cancelAnimationFrame = (id) => {
    loops.pending.delete(id);
    cancel(id);
  };
  return loops;
}

/** Attend que `done()` soit vrai (sondé à chaque image) ; rend le temps écoulé, ou null. */
async function waitFor(done, ms) {
  const start = performance.now();
  while (!done()) {
    if (performance.now() - start > ms) return null;
    await sleep(POLL_MS);
  }
  return performance.now() - start;
}

/** Joue un trajet d'une escale et rend les mesures des boucles. */
async function measure(site, data) {
  const loops = countLoops(site);
  await sleep(200); // le ciel se réinscrit par l'enveloppe
  const pair = arrowPairs(site).visible;
  if (!pair) return { problems: [NO_PAIR] };
  loops.peak = loops.pending.size;
  const forth = nowIndex(data) === 0 ? 1 : 0;
  click(site, pair[forth]);
  const flying = () => one(site, '.ship-g')?.classList.contains('thrust');
  const started = await waitFor(flying, ARRIVAL_MS);
  await waitFor(() => !flying(), ARRIVAL_MS);
  const first = loops.peak;
  loops.peak = loops.pending.size;
  click(site, pair[1 - forth]); // retour aussitôt, traînée du premier trajet encore visible
  await waitFor(flying, ARRIVAL_MS);
  const arrived = await waitFor(() => !flying(), ARRIVAL_MS);
  const faded = await waitFor(() => !all(site, '.trail circle').length, FADE_MS * 2);
  await sleep(100);
  return { loops, first, started, arrived, faded, idle: loops.pending.size };
}

/**
 * @brief Boucles d'animation d'un trajet : au plus 2 en attente, traînée éteinte après
 *   l'arrivée, ciel seul au repos.
 *
 * @param {number} width largeur jouée
 */
export async function runFrameLoops(width) {
  const ctx = context(width);
  const names = [
    'trajet : au plus 2 requestAnimationFrame en attente (ciel et rubrique)',
    'trajet relancé aussitôt après l\'arrivée : au plus 2 requestAnimationFrame en attente',
    `trajet : traînée éteinte moins de ${FADE_MS} ms après l'arrivée`,
    'repos complet : un seul requestAnimationFrame en attente (le ciel)',
  ];
  await withJourney(ctx, names, { reduce: false }, async (site) => {
    const data = await journeyData('fr');
    const run = await measure(site, data);
    if (run.problems) {
      for (const name of names) await test(ctx, name, () => run.problems);
      return;
    }
    await test(ctx, names[0], () => [
      ...(run.started === null ? ['le trajet ne démarre pas'] : []),
      ...(run.first > MAX_LOOPS
        ? [`${run.first} rappels en attente ensemble (au plus ${MAX_LOOPS})`]
        : []),
    ]);
    await test(ctx, names[1], () => (
      run.loops.peak > MAX_LOOPS
        ? [`${run.loops.peak} rappels en attente ensemble (au plus ${MAX_LOOPS})`]
        : []
    ));
    await test(ctx, names[2], () => [
      ...(run.arrived === null ? ["le trajet n'arrive pas"] : []),
      ...(run.faded === null || run.faded >= FADE_MS
        ? [`traînée encore visible ${FADE_MS} ms après l'arrivée`]
        : []),
    ]);
    await test(ctx, names[3], () => (
      run.idle === SKY_ONLY ? [] : [`${run.idle} rappels en attente au repos (ciel seul : 1)`]
    ));
  });
}
