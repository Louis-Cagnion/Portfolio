/* Saut en hyperespace, ciel et mouvement réduit (S4). Contrat fixé par le moniteur :
- ciel : <canvas id="sky" aria-hidden="true"> dans body, hors de main, dès l'amorçage ;
- saut animé : html[data-warp] vaut "forward" si la rubrique d'arrivée suit celle de départ
  dans l'ordre de main > section.view, "backward" sinon, retiré en 1020 ms au plus (plus une
  marge) ; jamais au premier affichage, sous mouvement réduit, ni pour une ancre interne ;
- courbure : feDisplacementMap#fovDisp, scale dans [0, 0.3], > 0 au milieu d'un saut, 0 sinon ;
- arrivée : cinq sections enfants directs de main dans leur ordre, une seule .view.on, hash
  #<id>, focus sur le titre h1/h2 d'arrivée (malgré le saut), aucun style en ligne ;
- history.back() ramène la rubrique précédente ; une seconde demande pendant un saut termine le
  premier et aboutit à la seconde ;
- mouvement réduit : changement immédiat, ni data-warp ni scale non nul, ciel figé (aucune
  boucle requestAnimationFrame active au repos, une image au plus au redimensionnement) ;
- accueil immobile, mouvement non réduit : une seule boucle requestAnimationFrame (le ciel).
Bouchons posés par `prepare` avant l'amorçage : matchMedia de prefers-reduced-motion,
requestAnimationFrame et cancelAnimationFrame comptés, journal des attributs. */
import {
  activeViews,
  click,
  describe,
  openSite,
  settle,
  shownNavs,
  statusState,
  waitFor,
  waitStatus,
} from './harness.js';
import { expectEqual, skip, test } from './runner.js';
import { captureConsoleErrors } from './states.js';

const BEND_MS = 1000; // courbure, --dur-warp-out + --dur-warp-in (checklist, section 1)
const LAST_FRAME_MS = 20; // saut complet en 1020 ms (checklist, section 1)
const CSS_TIME = /^(\d*\.?\d+)(m?s)$/;
const WARP_MARGIN_MS = 500; // marge du banc : sondage toutes les 25 ms, minuteurs du cadre
const FOV_MAX = 0.3;
const EPSILON = 1e-6;
const MID_SHARE = 0.45; // lecture au milieu de la courbure
const SECOND_CLICK_MS = 300; // seconde demande, saut encore en cours
const IMMEDIATE_MS = 250; // changement « immédiat » : tâche hashchange et sondage compris
const ARRIVAL_MS = 6000; // attente d'une arrivée, la durée mesurée est jugée à part
const SAMPLES = 6;
const SAMPLE_GAP_MS = 100;
const RESIZE_FRAMES_MAX = 2; // une image redessinée, un événement resize double toléré
const SHIFT_MAX_PX = 1; // écart toléré entre la position au repos et celle au départ du saut
const IDENTITY = new Set(['none', 'matrix(1, 0, 0, 1, 0, 0)']);
const LOAD_MS = 10000; // fin du chargement : #status quitte data-state="loading"

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const root = (site) => site.doc.documentElement;
const fovDisp = (site) => site.doc.getElementById('fovDisp');
const currentId = (site) => activeViews(site)[0]?.id ?? null;
const uncaught = (site) => site.uncaught.map((e) => `exception non rattrapée : ${e}`);
const direction = (order, from, to) => (
  order.indexOf(to) > order.indexOf(from) ? 'forward' : 'backward'
);

// ---------- Bouchons et journal posés avant l'amorçage ----------

/**
 * Bouchonne prefers-reduced-motion dans le cadre : réponse lue dans `motion.reduce` à chaque
 * appel ; `motion.set(reduce)` change le réglage et prévient les listes déjà rendues.
 */
function stubMotion(site, motion) {
  const { win } = site;
  const original = win.matchMedia.bind(win);
  const lists = [];
  win.matchMedia = (query) => {
    if (!/prefers-reduced-motion/i.test(String(query))) return original(query);
    const wantsReduce = !/no-preference/i.test(String(query));
    const list = new win.EventTarget();
    Object.defineProperties(list, {
      matches: { get: () => motion.reduce === wantsReduce },
      media: { value: String(query) },
    });
    list.onchange = null;
    list.addListener = (listener) => list.addEventListener('change', listener);
    list.removeListener = (listener) => list.removeEventListener('change', listener);
    lists.push(list);
    return list;
  };
  motion.set = (reduce) => {
    motion.reduce = reduce;
    for (const list of lists) {
      const init = { matches: list.matches, media: list.media };
      const event = new win.MediaQueryListEvent('change', init);
      list.dispatchEvent(event);
      list.onchange?.call(list, event);
    }
  };
}

/**
 * Compte les boucles requestAnimationFrame du cadre : `site.frames.pending` garde les rappels
 * demandés ni joués ni annulés, `site.frames.requested` le nombre total de demandes.
 */
function countFrames(site) {
  const { win } = site;
  const request = win.requestAnimationFrame.bind(win);
  const cancel = win.cancelAnimationFrame.bind(win);
  const frames = { pending: new Set(), requested: 0 };
  win.requestAnimationFrame = (callback) => {
    if (typeof callback !== 'function') return request(callback); // erreur native
    frames.requested++;
    const id = request((time) => {
      frames.pending.delete(id);
      callback(time);
    });
    frames.pending.add(id);
    return id;
  };
  win.cancelAnimationFrame = (id) => {
    frames.pending.delete(id);
    cancel(id);
  };
  site.frames = frames;
}

/**
 * Journal des changements de html[data-warp] et de #fovDisp[scale] : entrées
 * { at, name, value, old }, `at` en ms sur l'horloge de la suite.
 */
function watchWarp(site) {
  const log = [];
  const observer = new site.win.MutationObserver((records) => {
    const at = performance.now();
    for (const record of records) {
      const { target, attributeName: name } = record;
      if (name === 'scale' && target.id !== 'fovDisp') continue;
      if (name === 'data-warp' && target !== site.doc.documentElement) continue;
      log.push({ at, name, value: target.getAttribute(name), old: record.oldValue });
    }
  });
  observer.observe(site.doc.documentElement, {
    subtree: true,
    attributes: true,
    attributeFilter: ['data-warp', 'scale'],
    attributeOldValue: true,
  });
  return log;
}

// ---------- Lecture du journal ----------

/** Valeurs non nulles prises par l'attribut `name` dans `entries`, anciennes comprises. */
function valuesOf(entries, name) {
  const values = entries
    .filter((entry) => entry.name === name)
    .flatMap((entry) => [entry.old, entry.value])
    .filter((value) => value !== null);
  return [...new Set(values)];
}

/** Dernier retrait de html[data-warp] dans `entries`, ou null. */
function lastWarpEnd(entries) {
  const ends = entries.filter(
    (entry) => entry.name === 'data-warp' && entry.value === null && entry.old !== null,
  );
  return ends.at(-1) ?? null;
}

/** Valeurs de scale hors de [0, FOV_MAX] (non numériques comprises). */
function scaleRangeProblems(entries) {
  const outside = valuesOf(entries, 'scale').filter((value) => {
    const scale = Number(value);
    return !(scale >= -EPSILON && scale <= FOV_MAX + EPSILON);
  });
  return outside.length
    ? [`#fovDisp[scale] hors de [0, ${FOV_MAX}] : ${outside.join(', ')}`]
    : [];
}

/** Problèmes si `entries` montre un saut (data-warp posé) ou une courbure non nulle. */
function stillProblems(entries, label) {
  const problems = [];
  const warps = valuesOf(entries, 'data-warp');
  if (warps.length) problems.push(`${label} : html[data-warp] posé (${warps.join(', ')})`);
  const bent = valuesOf(entries, 'scale').filter((value) => !(Number(value) <= EPSILON));
  if (bent.length) problems.push(`${label} : #fovDisp[scale] non nul (${bent.join(', ')})`);
  return problems;
}

// ---------- État de la page ----------

/**
 * Durées du saut lues dans les jetons de html, comme js/core/router.js : { bend, total } en
 * ms et `problems` ; jeton illisible : signalé, remplacé par les durées de la checklist.
 */
function warpTiming(site) {
  const style = site.win.getComputedStyle(root(site));
  const problems = [];
  const tokenMs = (name) => {
    const value = style.getPropertyValue(name).trim();
    const match = CSS_TIME.exec(value);
    const ms = match ? Number(match[1]) * (match[2] === 's' ? 1000 : 1) : NaN;
    if (!(ms > 0)) problems.push(`jeton ${name} vaut "${value}", durée > 0 attendue`);
    return ms;
  };
  const bend = tokenMs('--dur-warp-out') + tokenMs('--dur-warp-in');
  if (problems.length) return { bend: BEND_MS, total: BEND_MS + LAST_FRAME_MS, problems };
  if (Math.abs(bend - BEND_MS) > EPSILON)
    problems.push(`--dur-warp-out + --dur-warp-in : ${bend} ms au lieu de ${BEND_MS} ms`);
  return { bend, total: bend + LAST_FRAME_MS, problems };
}

/** Problèmes du ciel : canvas#sky aria-hidden dans body, hors de main. */
function skyProblems(site) {
  const sky = site.doc.getElementById('sky');
  if (!sky) return ['canvas#sky absent'];
  const problems = [];
  if (sky.localName !== 'canvas')
    problems.push(`#sky est un <${sky.localName}>, pas un <canvas>`);
  if (sky.getAttribute('aria-hidden') !== 'true')
    problems.push('#sky : aria-hidden="true" absent');
  if (!site.doc.body.contains(sky)) problems.push('#sky hors de body');
  if (sky.closest('main')) problems.push('#sky est dans main');
  return problems;
}

/** Hors saut : #fovDisp présent avec scale à 0, pas de html[data-warp]. */
function restProblems(site) {
  const problems = [];
  const warp = root(site).getAttribute('data-warp');
  if (warp !== null) problems.push(`html[data-warp="${warp}"] hors saut`);
  const disp = fovDisp(site);
  if (!disp) return [...problems, 'feDisplacementMap#fovDisp absent'];
  if (disp.localName !== 'feDisplacementMap')
    problems.push(`#fovDisp est un <${disp.localName}>, pas un <feDisplacementMap>`);
  const scale = disp.getAttribute('scale');
  if (scale === null || Number(scale) !== 0)
    problems.push(`#fovDisp[scale] vaut ${JSON.stringify(scale)} hors saut au lieu de 0`);
  return problems;
}

/**
 * Problèmes de l'arrivée sur `id` : sections remises dans main dans `order`, une seule
 * .view.on, hash (`hash`), focus sur le titre (`focus`), aucun style en ligne, repos.
 */
function arrivalProblems(site, id, order, { hash = `#${id}`, focus = true } = {}) {
  const { doc, win } = site;
  const problems = [];
  const main = doc.querySelector('main');
  const inMain = [...main.children].filter((child) => child.matches('section.view'));
  expectEqual(
    problems,
    'ordre de main > section.view',
    inMain.map((view) => view.id).join(', '),
    order.join(', '),
  );
  const total = doc.querySelectorAll('section.view').length;
  if (total !== order.length)
    problems.push(`${total} section.view dans la page au lieu de ${order.length}`);
  const views = activeViews(site).map((view) => `#${view.id}`);
  if (views.join() !== `#${id}`) problems.push(`.view.on : [${views}] au lieu de [#${id}]`);
  expectEqual(problems, 'location.hash', win.location.hash, hash);
  const title = doc.getElementById(id)?.querySelector('h1, h2');
  const active = doc.activeElement;
  const where = active ? describe(active) : 'rien';
  if (focus && !title) problems.push(`#${id} : aucun titre h1 ou h2`);
  else if (focus && active !== title)
    problems.push(`focus sur ${where} au lieu de ${describe(title)}`);
  for (const view of doc.querySelectorAll('section.view')) {
    const style = (view.getAttribute('style') || '').trim();
    if (style) problems.push(`#${view.id} : style en ligne laissé « ${style} »`);
  }
  return [...problems, ...restProblems(site)];
}

// ---------- Actions ----------

/** Clic sur le [data-go] de `id` dans la barre affichée ; lève si elle est introuvable. */
function clickGo(site, id) {
  const navs = shownNavs(site);
  if (navs.length !== 1)
    throw new Error(`barre de rubriques : ${navs.length} affichée(s) au lieu d'une`);
  const button = navs[0].el.querySelector(`[data-go="${id}"]`);
  if (!button) throw new Error(`${navs[0].selector} [data-go="${id}"] absent`);
  click(site, button);
}

/** history.back() du cadre ; lève si l'API Navigation montre qu'aucune entrée ne précède. */
function goBack(site) {
  const nav = site.win.navigation; // API désactivée : entries() vide, on joue quand même
  if (nav && nav.entries().length > 0 && !nav.canGoBack)
    throw new Error('aucune entrée d\'historique à reprendre');
  site.win.history.back();
}

/** Attend l'arrivée sur `id` en `ms` au plus : saut fini, une seule .view.on, hash. */
function arrival(site, id, ms = ARRIVAL_MS) {
  return waitFor(
    () => !root(site).hasAttribute('data-warp') &&
      currentId(site) === id &&
      activeViews(site).length === 1 &&
      site.win.location.hash === `#${id}`,
    ms,
    `arrivée sur #${id}`,
    () => `vues [${activeViews(site).map((v) => v.id)}], hash "${site.win.location.hash}", ` +
      `data-warp ${JSON.stringify(root(site).getAttribute('data-warp'))}`,
  );
}

/** Amène le site sur `id` par la barre, sans juger le saut. */
async function reach(run, id) {
  if (currentId(run.site) === id && !root(run.site).hasAttribute('data-warp')) return;
  clickGo(run.site, id);
  await arrival(run.site, id);
  await settle(run.site, id);
}

/**
 * Joue un saut animé vers `id` déclenché par `trigger`, depuis la rubrique affichée : sens
 * de html[data-warp] au milieu et tout du long, courbure, durée, état d'arrivée.
 */
async function jumpProblems(run, id, trigger) {
  const { site, log, order, warp } = run;
  const from = currentId(site);
  const expected = direction(order, from, id);
  const mark = log.length;
  const start = performance.now();
  trigger();
  await sleep(warp.bend * MID_SHARE);
  const midWarp = root(site).getAttribute('data-warp');
  const midScale = fovDisp(site)?.getAttribute('scale') ?? null;
  await arrival(site, id);
  const entries = log.slice(mark);
  const problems = [];
  if (midWarp !== expected)
    problems.push(
      `au milieu du saut #${from} vers #${id}, html[data-warp] vaut ` +
        `${JSON.stringify(midWarp)} au lieu de "${expected}"`,
    );
  const wrong = valuesOf(entries, 'data-warp').filter((value) => value !== expected);
  if (wrong.length)
    problems.push(`html[data-warp] a pris ${wrong.join(', ')} (saut ${expected})`);
  const end = lastWarpEnd(entries);
  if (end && end.at - start > warp.total + WARP_MARGIN_MS)
    problems.push(
      `saut fini en ${Math.round(end.at - start)} ms ` +
        `(${warp.total} ms, marge ${WARP_MARGIN_MS} ms)`,
    );
  if (!(Number(midScale) > EPSILON))
    problems.push(`#fovDisp[scale] vaut ${JSON.stringify(midScale)} au milieu du saut (> 0)`);
  await settle(site, id);
  return [...problems, ...scaleRangeProblems(entries), ...arrivalProblems(site, id, order)];
}

/** Changement immédiat vers `id` par `trigger` (mouvement réduit), sans saut ni courbure. */
async function immediateProblems(run, id, trigger) {
  const { site, log, order } = run;
  const mark = log.length;
  trigger();
  await waitFor(
    () => currentId(site) === id &&
      activeViews(site).length === 1 &&
      site.win.location.hash === `#${id}`,
    IMMEDIATE_MS,
    `changement immédiat vers #${id}`,
    () => `vues [${activeViews(site).map((v) => v.id)}], hash "${site.win.location.hash}"`,
  );
  await settle(site, id);
  await sleep(run.warp.total + WARP_MARGIN_MS - IMMEDIATE_MS); // un saut tardif serait vu
  return [
    ...stillProblems(log.slice(mark), `vers #${id}`),
    ...arrivalProblems(site, id, order),
  ];
}

/** Nombre de rappels requestAnimationFrame en attente, mesuré `SAMPLES` fois. */
async function pendingSamples(site) {
  const counts = [];
  for (let i = 0; i < SAMPLES; i++) {
    counts.push(site.frames.pending.size);
    await sleep(SAMPLE_GAP_MS);
  }
  return counts;
}

/**
 * Saut par la barre vers `id` : le premier enfant de la rubrique quittée garde sa position à
 * l'écran (SHIFT_MAX_PX près) entre juste avant le clic et le départ, lu dans le rappel de
 * l'observateur de html[data-warp] (avant toute image peinte, animation à t = 0) ; attend
 * ensuite l'arrivée.
 */
async function departureProblems(run, id) {
  const { site } = run;
  const view = site.doc.getElementById(currentId(site));
  const child = view?.firstElementChild;
  if (!child) return [`#${currentId(site)} : aucun premier enfant à suivre`];
  const before = child.getBoundingClientRect();
  let start = null;
  const observer = new site.win.MutationObserver(() => {
    if (start || !root(site).hasAttribute('data-warp')) return;
    const moved = [view, child]
      .map((el) => [el, site.win.getComputedStyle(el).transform])
      .filter(([, transform]) => !IDENTITY.has(transform));
    start = { rect: child.getBoundingClientRect(), moved };
  });
  observer.observe(root(site), { attributes: true, attributeFilter: ['data-warp'] });
  try {
    clickGo(site, id);
    await waitFor(() => start, run.warp.total, `départ du saut #${view.id} vers #${id}`);
  } finally {
    observer.disconnect();
  }
  const problems = start.moved.map(
    ([el, transform]) => `mesure faussée : ${describe(el)} déjà transformé (${transform})`,
  );
  for (const side of ['top', 'left']) {
    const shift = start.rect[side] - before[side];
    if (Math.abs(shift) > SHIFT_MAX_PX)
      problems.push(
        `${describe(child)} : ${side} ${start.rect[side].toFixed(1)} px au départ du saut ` +
          `vers #${id} au lieu de ${before[side].toFixed(1)} px (écart ${shift.toFixed(1)} ` +
          `px, ${SHIFT_MAX_PX} px tolérés)`,
      );
  }
  await arrival(site, id);
  await settle(site, id);
  return problems;
}

// ---------- Scénarios ----------

/**
 * Ouvre le site sur `hash` (accueil par défaut), mouvement réduit selon `reduce`, bouchons
 * posés ; rend { site, log, motion, order, warp } une fois la première rubrique posée.
 */
async function openRun(width, { reduce = false, hash } = {}) {
  const run = { motion: { reduce } };
  run.site = await openSite({
    width,
    hash,
    prepare: (site) => {
      stubMotion(site, run.motion);
      countFrames(site);
      run.log = watchWarp(site);
    },
  });
  try {
    await waitStatus(run.site, 'ready');
    await settle(run.site, hash || 'home');
  } catch (error) {
    run.site.close();
    throw error;
  }
  run.order = [...run.site.doc.querySelectorAll('main > section.view')].map((v) => v.id);
  run.warp = warpTiming(run.site);
  return run;
}

/** Premier affichage : ciel et courbure en place, aucun saut depuis l'amorçage. */
function firstDisplayProblems(run, id) {
  return [
    ...skyProblems(run.site),
    ...stillProblems(run.log, 'premier affichage'),
    ...arrivalProblems(run.site, id, run.order, { focus: false }),
  ];
}

const WARP_CASES = {
  first: 'premier affichage : ciel et courbure en place, sans saut',
  tokens: 'durées du saut : --dur-warp-out + --dur-warp-in = 1000 ms (checklist)',
  forward: 'saut avant par clic : #home vers #contact',
  back: 'retour arrière (history.back) : #contact vers #home, saut arrière',
  backward: 'saut arrière par clic : #skills vers #journey',
  backForward: 'retour arrière (history.back) : #journey vers #skills, saut avant',
  dossier: 'ancre #dossier depuis l\'accueil : aucun saut',
  same: 'rubrique affichée recliquée : aucun saut',
  second: 'seconde demande pendant un saut : arrivée propre sur la seconde rubrique',
  again: 'même rubrique redemandée pendant son saut : arrivée propre',
  loops: 'accueil immobile : une seule boucle requestAnimationFrame (le ciel)',
  toggle: 'mouvement réduit activé en cours de session, puis désactivé',
  exceptions: 'aucune exception non rattrapée',
};

// Départs depuis l'accueil et depuis une autre rubrique, sauts avant et arrière.
const DEPARTURE_CASES = [
  ['home', 'journey'],
  ['journey', 'skills'],
  ['skills', 'home'],
  ['contact', 'journey'],
].map(([from, to]) => ({
  from,
  to,
  name: `départ du saut #${from} vers #${to} : premier enfant de #${from} immobile`,
}));

/** Une demande pendant le saut vers `first`, la seconde vers `second` au bout de 300 ms. */
async function interruptedProblems(run, first, second) {
  const { site, log, order } = run;
  await reach(run, 'home');
  const expected = direction(order, 'home', first);
  const mark = log.length;
  clickGo(site, first);
  await sleep(SECOND_CLICK_MS);
  const firstWarp = root(site).getAttribute('data-warp');
  const start = performance.now();
  clickGo(site, second);
  await arrival(site, second);
  const entries = log.slice(mark);
  const problems = [];
  if (firstWarp !== expected)
    problems.push(
      `au second clic (${SECOND_CLICK_MS} ms), html[data-warp] vaut ` +
        `${JSON.stringify(firstWarp)} au lieu de "${expected}" : saut vers #${first} absent`,
    );
  const end = lastWarpEnd(entries);
  if (end && end.at - start > run.warp.total + WARP_MARGIN_MS)
    problems.push(`saut fini ${Math.round(end.at - start)} ms après la seconde demande`);
  await settle(site, second);
  return [
    ...problems,
    ...scaleRangeProblems(entries),
    ...arrivalProblems(site, second, order),
  ];
}

/** Groupe « Saut », mouvement non réduit, à la largeur `width`. */
export async function runWarp(width) {
  const ctx = { group: 'Saut', width, lang: 'fr', section: null };
  let run;
  try {
    run = await openRun(width);
  } catch (error) {
    skip(
      ctx,
      [...Object.values(WARP_CASES), ...DEPARTURE_CASES.map((departure) => departure.name)],
      `ouverture du site impossible (${error.message})`,
    );
    return;
  }
  const { site, log } = run;
  const at = (section) => ({ ...ctx, section });
  const {
    first,
    tokens,
    forward,
    back,
    backward,
    backForward,
    dossier,
    same,
    second,
    again,
    loops,
    toggle,
    exceptions,
  } = WARP_CASES;
  try {
    await test(at('home'), first, () => firstDisplayProblems(run, 'home'));
    await test(ctx, tokens, () => run.warp.problems);
    await test(at('contact'), forward, async () => {
      await reach(run, 'home');
      return jumpProblems(run, 'contact', () => clickGo(site, 'contact'));
    });
    await test(at('home'), back, async () => {
      await reach(run, 'contact');
      return jumpProblems(run, 'home', () => goBack(site));
    });
    await test(at('journey'), backward, async () => {
      await reach(run, 'skills');
      return jumpProblems(run, 'journey', () => clickGo(site, 'journey'));
    });
    await test(at('skills'), backForward, async () => {
      if (currentId(site) !== 'journey') return ['non joué : #journey non atteint'];
      return jumpProblems(run, 'skills', () => goBack(site));
    });
    await test(at('home'), dossier, async () => {
      await reach(run, 'home');
      const mark = log.length;
      site.win.location.hash = '#dossier';
      await sleep(run.warp.total + WARP_MARGIN_MS);
      return [
        ...stillProblems(log.slice(mark), '#dossier'),
        ...arrivalProblems(site, 'home', run.order, { hash: '#dossier', focus: false }),
      ];
    });
    await test(at('journey'), same, async () => {
      await reach(run, 'journey');
      const mark = log.length;
      clickGo(site, 'journey');
      await sleep(run.warp.total + WARP_MARGIN_MS);
      return [
        ...stillProblems(log.slice(mark), '#journey recliqué'),
        ...arrivalProblems(site, 'journey', run.order, { focus: false }),
      ];
    });
    await test(at('journey'), second, () => interruptedProblems(run, 'projects', 'journey'));
    await test(at('projects'), again, () => interruptedProblems(run, 'projects', 'projects'));
    await test(at('home'), loops, async () => {
      await reach(run, 'home');
      await sleep(300);
      const counts = await pendingSamples(site);
      const least = Math.min(...counts);
      const problems = skyProblems(site);
      if (least > 1)
        problems.push(`boucles requestAnimationFrame actives : [${counts}] (au plus 1)`);
      if (least < 1)
        problems.push(`aucune boucle requestAnimationFrame continue : [${counts}] (le ciel)`);
      return problems;
    });
    await test(at('home'), toggle, async () => {
      await reach(run, 'home');
      run.motion.set(true);
      const reduced = await immediateProblems(run, 'skills', () => clickGo(site, 'skills'));
      run.motion.set(false);
      const animated = await jumpProblems(run, 'home', () => clickGo(site, 'home'));
      return [
        ...reduced.map((problem) => `mouvement réduit : ${problem}`),
        ...animated.map((problem) => `mouvement rétabli : ${problem}`),
      ];
    });
    for (const { from, to, name } of DEPARTURE_CASES)
      await test(at(from), name, async () => {
        await reach(run, from);
        return departureProblems(run, to);
      });
    await test(ctx, exceptions, () => uncaught(site));
  } finally {
    run.motion.reduce = false;
    site.close();
  }
}

const REDUCED_CASES = [
  'premier affichage sur #skills (hash direct) : aucun saut',
  'mouvement réduit : changements immédiats (clics avant, arrière, history.back)',
  'mouvement réduit : ciel figé, aucune boucle requestAnimationFrame au repos',
  'mouvement réduit : redimensionnement sans relancer de boucle (une image au plus)',
  'aucune exception non rattrapée (mouvement réduit)',
];

/** Premier affichage sur un hash direct, puis groupe « Saut » sous mouvement réduit. */
export async function runReducedMotion(width) {
  const ctx = { group: 'Saut', width, lang: 'fr', section: null };
  const [direct, immediate, frozen, resized, exceptions] = REDUCED_CASES;
  await test({ ...ctx, section: 'skills' }, direct, async () => {
    const run = await openRun(width, { hash: 'skills' });
    try {
      return [...firstDisplayProblems(run, 'skills'), ...uncaught(run.site)];
    } finally {
      run.site.close();
    }
  });
  let run;
  try {
    run = await openRun(width, { reduce: true });
  } catch (error) {
    skip(ctx, REDUCED_CASES.slice(1), `ouverture du site impossible (${error.message})`);
    return;
  }
  const { site } = run;
  try {
    await test({ ...ctx, section: 'contact' }, immediate, async () => {
      const steps = [
        ['contact', () => clickGo(site, 'contact')],
        ['journey', () => clickGo(site, 'journey')],
        ['contact', () => goBack(site)],
      ];
      const problems = [];
      for (const [id, trigger] of steps)
        problems.push(...await immediateProblems(run, id, trigger));
      return problems;
    });
    await test({ ...ctx, section: 'home' }, frozen, async () => {
      await reach(run, 'home');
      await sleep(300);
      const before = site.frames.requested;
      const counts = await pendingSamples(site);
      const requested = site.frames.requested - before;
      const problems = skyProblems(site);
      if (requested > 0)
        problems.push(
          `${requested} demande(s) requestAnimationFrame au repos en ` +
            `${SAMPLES * SAMPLE_GAP_MS} ms`,
        );
      if (Math.max(...counts) > 0)
        problems.push(`rappels requestAnimationFrame en attente au repos : [${counts}]`);
      return problems;
    });
    await test({ ...ctx, section: 'home' }, resized, async () => {
      const problems = skyProblems(site);
      const before = site.frames.requested;
      site.frame.style.width = `${width + 40}px`;
      try {
        await sleep(600);
        const counts = await pendingSamples(site);
        const requested = site.frames.requested - before;
        if (requested > RESIZE_FRAMES_MAX)
          problems.push(
            `${requested} demandes requestAnimationFrame après redimensionnement ` +
              `(${RESIZE_FRAMES_MAX} au plus)`,
          );
        if (Math.max(...counts) > 0)
          problems.push(`boucle relancée par le redimensionnement : en attente [${counts}]`);
      } finally {
        site.frame.style.width = `${width}px`;
      }
      return problems;
    });
    await test(ctx, exceptions, () => uncaught(site));
  } finally {
    site.close();
  }
}

// ---------- Contexte 2D indisponible ----------
/* Contrat : getContext('2d') rend null dans le cadre dès avant l'amorçage ; le site s'affiche
et suit le hash, seul le décor est perdu, la courbure signalée par un seul console.error. */

const NO_2D_CASES = [
  'contexte 2D indisponible : site affiché (pas d\'écran d\'erreur, une .view.on)',
  'contexte 2D indisponible : navigation par hash (#skills)',
  'contexte 2D indisponible : un seul console.error nomme la courbure et le 2D',
];
const CURVE_CAUSE = [/#fovMap|courbure/i, /2D/i]; // texte exact libre, ces deux mentions

/** Refuse le contexte 2D à tout canvas du cadre : getContext('2d') rend null. */
function refuse2d(site) {
  const proto = site.win.HTMLCanvasElement.prototype;
  const original = proto.getContext;
  proto.getContext = function getContext(type, ...rest) {
    if (String(type).toLowerCase() === '2d') return null;
    return original.call(this, type, ...rest);
  };
}

/** Texte d'un appel à console.error : chaînes et messages des erreurs passées. */
const consoleText = (args) => args.map((arg) => String(arg?.message ?? arg)).join(' ');

/** Groupe « Saut », contexte 2D refusé avant l'amorçage, à la largeur `width`. */
export async function runWithout2d(width) {
  const ctx = { group: 'Saut', width, lang: 'fr', section: null };
  const [shown, hashNav, logged] = NO_2D_CASES;
  let site;
  try {
    site = await openSite({
      width,
      prepare: (frame) => {
        captureConsoleErrors(frame);
        refuse2d(frame);
      },
    });
  } catch (error) {
    skip(ctx, NO_2D_CASES, `ouverture du site impossible (${error.message})`);
    return;
  }
  const errors = () => site.consoleErrors.map(consoleText);
  try {
    await test({ ...ctx, section: 'home' }, shown, async () => {
      await waitFor(
        () => site.doc.getElementById('status')?.dataset.state !== 'loading',
        LOAD_MS,
        'fin du chargement',
        () => statusState(site),
      );
      const problems = [];
      const state = site.doc.getElementById('status')?.dataset.state;
      if (state !== 'ready')
        problems.push(
          `#status[data-state="${state}"] au lieu de "ready" ; ` +
            `console.error : [${errors().join(' | ')}]`,
        );
      const views = activeViews(site).map((view) => `#${view.id}`);
      if (views.length !== 1) problems.push(`.view.on : [${views}] au lieu d'une rubrique`);
      return [...problems, ...uncaught(site)];
    });
    await test({ ...ctx, section: 'skills' }, hashNav, async () => {
      site.win.location.hash = '#skills';
      await arrival(site, 'skills');
      await settle(site, 'skills');
      return uncaught(site);
    });
    await test(ctx, logged, () => {
      const named = errors().filter((text) => CURVE_CAUSE.every((cause) => cause.test(text)));
      if (named.length === 1) return [];
      return [
        `${named.length} console.error nomment la courbure et le 2D au lieu d'un : ` +
          `[${errors().join(' | ')}]`,
      ];
    });
  } finally {
    site.close();
  }
}
