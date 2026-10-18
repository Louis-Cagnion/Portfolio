/*
Zoom sur un système de la rubrique Projets : la caméra approche, les orbites
s'inclinent, les autres systèmes s'effacent, l'en-tête et l'introduction apparaissent.
Mécanique de la maquette validée (docs/design/s6/mockup.js:330-431) ; la caméra est
makeCamera (js/core/motion.js), la même que celle de Parcours.

Une seule boucle requestAnimationFrame par rubrique : celle de projects-loop.js. Le zoom ne
demande aucune image, il avance dans `step(dt)` (progression cumulée des pas de la boucle).
Mouvement réduit : l'état final est posé sur-le-champ, sans image ni transition.

Couture avec projects.js : `createZoom({ parts, state, renderAll, showSystem })` rend
`{ enter, exit, step, toPlanet, release }` ; `state.view = { u, camera: { cx, w },
zoomedIndex }` est tenu à jour (unité d'écran, caméra, système zoomé), `renderAll` replace
les planètes. `exit({ quiet })` (Échap) rend le focus au soleil sans anneau, dès le début.
*/
import {
  ease,
  lerp,
  makeCamera,
  reduced,
  scrollBehavior,
  watchReduced,
} from '../core/motion.js';
import { initSheet } from '../ui/sheet.js';
import { PHONE_CAMERA, phoneUnit, setPlanetActive, tiltOrbit } from './projects-art.js';
import { TAU } from './projects-layout.js';

const ENTER_MS = 1000;
const EXIT_MS = 900;
const TRACK_MS = 800; // caméra d'un projet lié : du système à la planète, et retour
const SPIN = 0.00005; // rad/ms : vitesse commune des planètes du système zoomé
const DESK_HEIGHT = 520; // hauteur du plan zoomé au bureau, en pixels
const PHONE_RATIO = 1.25; // téléphone : hauteur du plan zoomé, en largeurs
const PIS_HEIGHT = 320; // téléphone : hauteur du plan zoomé de la Piscine, en pixels
const PIS_ROW = 152; // téléphone : position du centre de la Piscine depuis le haut du plan
const PIS_LABEL = 8.4; // téléphone : hauteur d'étiquette qui fait descendre la Piscine
const PIS_LABEL_BASE = 9.8;
const TILT_DESK = 0.62;
const TILT_PHONE = 0.9;
const TILT_PISCINE = 1; // orbites en cercles
const FOCUS_PAD = 46; // marge au-dessus et au-dessous de la plus grande orbite
const ORBIT_PAD = 80; // marge latérale de la plus grande orbite
// débord du plan de la Piscine, 12 px de chaque côté, égal au débord de css/projects.css
const BLEED = 24;
const SCROLL_MARGIN = 8;
const PLANET_SHARE = 0.45; // largeur de la caméra sur une planète, en part de celle du système

/**
 * @brief Angle ramené dans l'intervalle ]-π, π].
 *
 * @param {number} angle angle en radians
 *
 * @returns {number} angle équivalent, le plus court chemin pour rejoindre zéro
 */
function wrapAngle(angle) {
  const turn = ((angle % TAU) + TAU) % TAU;
  return turn > Math.PI ? turn - TAU : turn;
}

/**
 * @brief Inclinaison des orbites d'un système zoomé.
 *
 * @param {object} system système construit (`phonePis`)
 * @param {boolean} phone mode téléphone
 *
 * @returns {number} 1 pour la Piscine sur téléphone, 0,9 sur téléphone, sinon 0,62
 */
function focusTilt(system, phone) {
  if (system.phonePis) return TILT_PISCINE;
  return phone ? TILT_PHONE : TILT_DESK;
}

/**
 * @brief Pose l'inclinaison d'un système et redessine ses orbites.
 *
 * @param {object} system système construit (`tilt`, `orbits`)
 * @param {number} tilt rapport de l'axe vertical sur l'axe horizontal
 */
function setTilt(system, tilt) {
  system.tilt = tilt;
  for (const orbit of system.orbits)
    tiltOrbit(orbit, tilt);
}

/**
 * @brief Fixe la hauteur du plan, avec la transition de hauteur de css/projects.css.
 *
 * Part de la hauteur affichée (le rapport `aspect-ratio` est retiré), force un calcul de
 * mise en page, puis pose la hauteur voulue.
 *
 * @param {SVGSVGElement} plan svg#systems
 * @param {number} pixels hauteur visée
 */
function setHeight(plan, pixels) {
  plan.style.height = `${plan.clientHeight}px`;
  plan.style.aspectRatio = '';
  plan.getBoundingClientRect();
  plan.style.height = `${pixels}px`;
}

/**
 * @brief Largeur du plan sans le débord de la Piscine zoomée sur téléphone.
 *
 * @param {SVGSVGElement} plan svg#systems
 *
 * @returns {number} largeur de la colonne en pixels
 */
function columnWidth(plan) {
  return plan.clientWidth - (plan.classList.contains('bleed') ? BLEED : 0);
}

/**
 * @brief Rend le focus au soleil, sans anneau de focus clavier après Échap (`quiet`).
 *
 * Un soleil déjà focalisé (zoom par Entrée, puis Échap) ignore `focus()` : il perd d'abord
 * le focus, pour que `focusVisible: false` s'applique.
 *
 * @param {SVGGElement} sun soleil du système sorti
 * @param {boolean} quiet vrai pour une sortie par Échap, faux pour le bouton retour
 */
function focusSun(sun, quiet) {
  if (quiet && document.activeElement === sun) sun.blur();
  sun.focus(quiet ? { preventScroll: true, focusVisible: false } : { preventScroll: true });
}

/**
 * @brief Couture du zoom : entrée, sortie et pas d'animation d'un système.
 *
 * `enter(index)` est appelée à chaque clic ou touche sur un soleil (ignorée si un zoom est
 * posé), `exit(options)` par le bouton retour et Échap (`quiet`), `step(dt)` par la boucle.
 * `toPlanet(planet)` (projet lié de Compétences) emmène la caméra jusqu'à une planète, puis
 * fige la rotation du système (d'un seul mouvement, sauf si un autre système est zoomé :
 * sortie puis entrée) ; `release()` rend la caméra au système et relance la rotation.
 *
 * @param {object} context fermetures de `mount` : `parts` (nœuds fixes), `state` (`built`,
 *   `view`, `phone`), `renderAll` (replace les planètes), `showSystem` (en-tête et intro)
 *
 * @returns {object} commandes du zoom : `enter(index)`, `exit(options)`, `step(dt)`,
 *   `toPlanet(planet)` (Promise résolue à l'arrivée de la caméra) et `release()`
 */
export function createZoom({ parts, state, renderAll, showSystem }) {
  const { plan, layout, head } = parts;
  const camera = makeCamera(plan);
  let run = null; // animation en cours : { kind, built, system, planets, shift, ... }
  let hovered = false;
  let lock = null; // planète visée par toPlanet : caméra posée sur elle, rotation figée

  /** Planètes du système `index`, dans l'ordre des projets. */
  const planetsOf = (index) => state.built.planets
    .filter((planet) => planet.systemIndex === index);

  /** Vue d'ensemble : tout le plan. */
  const overview = () => ({
    cx: state.built.width / 2,
    cy: state.built.height / 2,
    w: state.built.width,
  });

  /** Hauteur du plan zoomé sur `system`, en pixels. */
  const zoomedHeight = (system) => {
    const width = plan.clientWidth;
    if (!state.phone) return DESK_HEIGHT;
    if (!system.phonePis) return width * PHONE_RATIO;
    return PIS_HEIGHT + Math.max(0, PIS_LABEL / phoneUnit(width) - PIS_LABEL_BASE);
  };

  /** Caméra centrée sur `system` (hauteur de la Piscine sur téléphone, orbite au bureau). */
  const focus = (system) => {
    if (system.phonePis) {
      const shift = (zoomedHeight(system) / 2 - PIS_ROW) * phoneUnit(plan.clientWidth);
      return { cx: system.cx, cy: system.cy + shift, w: PHONE_CAMERA };
    }
    if (state.phone) return { cx: system.cx, cy: system.cy, w: PHONE_CAMERA };
    const height = 2 * (system.maxRadius * TILT_DESK + FOCUS_PAD);
    const wide = height / camera.ratio();
    const width = Math.max(wide, 2 * system.maxRadius + ORBIT_PAD);
    return { cx: system.cx, cy: system.cy, w: width };
  };

  /** Caméra serrée sur `planet` : sa position du moment, une part de la largeur du système. */
  const planetCamera = (planet, system) => ({
    cx: system.cx + planet.radius * Math.cos(planet.angle),
    cy: system.cy + planet.radius * system.tilt * Math.sin(planet.angle),
    w: PLANET_SHARE * focus(system).w,
  });

  /** Caméra du zoom posé : sur la planète suivie, sinon sur le système. */
  const settled = (system) => (lock ? planetCamera(lock, system) : focus(system));

  /** Pose la caméra et recopie son centre, sa largeur et l'unité d'écran dans la vue. */
  const place = (target) => {
    camera.set(target);
    const { view } = state;
    view.camera.cx = camera.cx;
    view.camera.w = camera.w;
    view.u = camera.w / (plan.clientWidth || 1);
  };

  /** Avance l'animation à la progression `k` (0 à 1, déjà adoucie). */
  const advance = (k) => {
    const { planets, shift, from, system } = run;
    planets.forEach((planet, n) => {
      planet.angle += shift[n] * (k - run.done);
    });
    run.done = k;
    setTilt(system, lerp(run.tilt, run.tiltTo, k));
    const to = run.target();
    place({
      cx: lerp(from.cx, to.cx, k),
      cy: lerp(from.cy, to.cy, k),
      w: lerp(from.w, to.w, k),
    });
  };

  /** Fin de l'animation : la sortie remet le repos, puis `resolve` prévient l'appelant. */
  const conclude = (finished) => {
    if (finished.kind === 'out') {
      const { view, built } = state;
      view.zoomedIndex = -1;
      plan.classList.remove('zoomed', 'bleed');
      plan.style.removeProperty('height');
      plan.style.aspectRatio = `${built.width} / ${built.height}`;
      place(overview());
      focusSun(finished.system.sun, finished.quiet);
    }
    finished.resolve?.();
  };

  /** Termine l'animation sur-le-champ : état final, rendu, focus. */
  const complete = () => {
    const finished = run;
    advance(1);
    run = null;
    conclude(finished);
    renderAll();
  };

  /** Inclinaison visée en fin d'animation : zoomée, au repos ou inchangée. */
  const tiltAt = (kind, system) => {
    if (kind === 'in') return focusTilt(system, state.phone);
    return kind === 'out' ? system.restTilt : system.tilt;
  };

  /**
   * @brief Lance l'animation d'un système ; sous mouvement réduit, elle se termine aussitôt.
   *
   * @param {'in' | 'out' | 'track' | 'release'} kind entrée, sortie, suivi de planète, retour
   * @param {object} system système de `state.built.systems`
   * @param {object[]} planets planètes de ce système, dans l'ordre des projets
   * @param {{ planet?: object, resolve?: () => void, quiet?: boolean }} [options]
   *   planète rejointe par la caméra, rappel de fin, sortie par Échap
   */
  const start = (kind, system, planets, options = {}) => {
    const { built } = state;
    const entering = kind === 'in';
    const anchor = planets[0].angle;
    const chase = options.planet ? () => planetCamera(options.planet, system) : null;
    const toSystem = entering || kind === 'release' ? () => focus(system) : overview;
    run = {
      kind,
      built,
      system,
      planets,
      shift: planets.map((planet) => (
        entering ? wrapAngle(anchor + planet.rel - planet.angle) : 0
      )),
      from: { cx: camera.cx, cy: camera.cy, w: camera.w },
      target: chase ?? toSystem,
      tilt: system.tilt,
      tiltTo: tiltAt(kind, system),
      duration: { in: ENTER_MS, out: EXIT_MS }[kind] ?? TRACK_MS,
      elapsed: 0,
      done: 0,
      resolve: options.resolve,
      quiet: options.quiet === true,
    };
    if (reduced()) complete();
  };

  /** Colonne de la rubrique ramenée en haut de la fenêtre (téléphone). */
  const scrollToPlan = () => {
    const top = layout.getBoundingClientRect().top + scrollY - SCROLL_MARGIN;
    scrollTo({ top, behavior: scrollBehavior() });
  };

  /**
   * @brief Zoome sur le système `index` ; sans effet si un zoom est déjà posé.
   *
   * @param {number} index rang du système dans `state.built.systems`
   * @param {object} [options] `planet` (la caméra rejoint cette planète) et `resolve`
   */
  const enter = (index, options = {}) => {
    const { built, view } = state;
    if (!built || view.zoomedIndex >= 0) return;
    const system = built.systems[index];
    view.zoomedIndex = index;
    built.systems.forEach((each, k) => {
      each.g.classList.toggle('on', k === index);
      each.g.classList.toggle('dim', k !== index);
    });
    for (const planet of planetsOf(index)) setPlanetActive(planet.nodes.g, true);
    plan.classList.add('zoomed');
    plan.classList.toggle('bleed', system.phonePis);
    layout.classList.add('zfocus');
    showSystem(index);
    setHeight(plan, zoomedHeight(system));
    if (state.phone) scrollToPlan();
    camera.set(overview());
    start('in', system, planetsOf(index), options);
  };

  /**
   * Sort du zoom (sans effet au repos ou pendant une animation) ; focus rendu au soleil.
   *
   * @param {object} [options] `quiet` : sortie par Échap, focus sans anneau dès le début du
   *   retour ; `resolve` : rappel une fois le plan revenu au repos
   */
  const exit = (options = {}) => {
    const { built, view } = state;
    if (view.zoomedIndex < 0 || run) return;
    const system = built.systems[view.zoomedIndex];
    const quiet = options.quiet === true;
    lock = null;
    layout.classList.remove('zfocus');
    if (quiet || head.contains(document.activeElement)) focusSun(system.sun, quiet);
    for (const each of built.systems) each.g.classList.remove('on', 'dim');
    for (const planet of planetsOf(system.index)) setPlanetActive(planet.nodes.g, false);
    setHeight(plan, (columnWidth(plan) * built.height) / built.width);
    start('out', system, planetsOf(system.index), options);
  };

  /**
   * @brief Emmène la caméra jusqu'à une planète, en deux temps si un autre système est zoomé.
   *
   * Un seul mouvement depuis la vue d'ensemble (zoom du système) ou depuis le système déjà
   * zoomé (du système à la planète) ; deux temps si un autre est zoomé (sortie, puis entrée).
   * Sans effet (résolue aussitôt) si une animation tourne ou si le plan a été reconstruit.
   *
   * @param {object} planet planète de `state.built.planets`
   *
   * @returns {Promise<void>} résolue à l'arrivée de la caméra (aussitôt sous mouvement réduit)
   */
  const toPlanet = (planet) => new Promise((resolve) => {
    const { built, view } = state;
    const index = planet.systemIndex;
    if (!built || run) {
      resolve();
      return;
    }
    const approach = () => {
      if (state.built !== built || view.zoomedIndex >= 0) {
        resolve(); // plan reconstruit ou zoom repris pendant la sortie
        return;
      }
      lock = planet;
      enter(index, { planet, resolve });
    };
    if (view.zoomedIndex < 0) approach();
    else if (view.zoomedIndex !== index) exit({ resolve: approach });
    else {
      lock = planet;
      start('track', built.systems[index], planetsOf(index), { planet, resolve });
    }
  });

  /** Rend la caméra au système (fiche d'un projet lié fermée) ; sans effet sinon. */
  const release = () => {
    const { built, view } = state;
    if (!lock) return;
    const system = built.systems[lock.systemIndex];
    lock = null;
    if (!run && view.zoomedIndex === system.index)
      start('release', system, planetsOf(system.index));
  };

  /** Un pointeur sur le plan ou une planète focalisée au clavier arrête la rotation. */
  const held = () => hovered || plan.querySelector('.sys.on .planet:focus-visible') !== null;

  /**
   * @brief Avance l'animation en cours, ou la rotation du système zoomé.
   *
   * @param {number} dt pas de la boucle en ms
   */
  const step = (dt) => {
    const { built, view } = state;
    if (run && run.built !== built) {
      run.resolve?.();
      run = null; // plan reconstruit : animation abandonnée
    }
    if (lock && !built?.planets.includes(lock)) lock = null;
    if (run) {
      run.elapsed += dt;
      if (run.elapsed >= run.duration) complete();
      else advance(ease(run.elapsed / run.duration));
      return;
    }
    if (!built || view.zoomedIndex < 0) return;
    if (held() || lock) return; // planète visée par un projet lié : le système reste figé
    for (const planet of built.planets)
      if (planet.systemIndex === view.zoomedIndex) planet.angle += SPIN * dt;
  };

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.key !== 'Escape' || state.view.zoomedIndex < 0) return;
    if (!layout.parentElement?.classList.contains('on')) return;
    if (!initSheet(document).isOpen()) exit({ quiet: true });
  });
  plan.addEventListener('pointerenter', () => {
    hovered = true;
  });
  plan.addEventListener('pointerleave', () => {
    hovered = false;
  });
  watchReduced((still) => {
    if (still && run && run.built === state.built) complete();
  });
  new ResizeObserver(() => {
    const { built, view } = state;
    if (run || !built || view.zoomedIndex < 0) return;
    const system = built.systems[view.zoomedIndex];
    if (state.phone) plan.style.height = `${zoomedHeight(system)}px`;
    place(settled(system));
    renderAll();
  }).observe(plan);

  return { enter, exit, step, toPlanet, release };
}
