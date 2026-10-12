/*
Zoom sur un système de la rubrique Projets (S6.C5) : la caméra approche, les orbites
s'inclinent, les autres systèmes s'effacent, l'en-tête et l'introduction apparaissent.
Mécanique de la maquette validée (docs/design/s6/mockup.js:330-431) ; la caméra est
makeCamera (js/core/motion.js), la même que celle de Parcours.

Une seule boucle requestAnimationFrame par rubrique : celle de projects-loop.js. Le zoom ne
demande aucune image, il avance dans `step(dt)` (progression cumulée des pas de la boucle).
Mouvement réduit : l'état final est posé sur-le-champ, sans image ni transition.

Couture avec projects.js : `createZoom({ parts, state, renderAll, showSystem })` rend
`{ enter, exit, step }` ; `state.view = { u, camera: { cx, w }, zoomedIndex }` est tenu à jour
(unité d'écran, caméra, système zoomé), `renderAll` replace les planètes.
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
import { phoneUnit } from './projects-art.js';

const TAU = 2 * Math.PI;
const ENTER_MS = 1000;
const EXIT_MS = 900;
const SPIN = 0.00005; // rad/ms : vitesse commune des planètes du système zoomé
const DESK_HEIGHT = 520; // hauteur du plan zoomé au bureau, en pixels
const PHONE_RATIO = 1.25; // téléphone : hauteur du plan zoomé, en largeurs
const PHONE_CAMERA = 370; // téléphone : largeur de la caméra, en unités du plan
const PIS_HEIGHT = 320; // téléphone : hauteur du plan zoomé de la Piscine, en pixels
const PIS_ROW = 152; // téléphone : position du centre de la Piscine depuis le haut du plan
const PIS_LABEL = 8.4; // téléphone : hauteur d'étiquette qui fait descendre la Piscine
const PIS_LABEL_BASE = 9.8;
const TILT_DESK = 0.62;
const TILT_PHONE = 0.9;
const TILT_PISCINE = 1; // orbites en cercles
const FOCUS_PAD = 46; // marge au-dessus et au-dessous de la plus grande orbite
const ORBIT_PAD = 80; // marge latérale de la plus grande orbite
const BLEED = 24; // débord du plan de la Piscine, 12 px de chaque côté
const SCROLL_MARGIN = 8;
const OVERVIEW_RATIO = 0.4; // hauteur sur largeur d'un plan pas encore mesuré

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
    orbit.setAttribute('ry', (Number(orbit.getAttribute('rx')) * tilt).toFixed(2));
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
 * @brief Couture du zoom : entrée, sortie et pas d'animation d'un système.
 *
 * `enter(index)` est appelée à chaque clic ou touche sur un soleil (ignorée si un zoom est
 * posé), `exit()` par le bouton retour et Échap, `step(dt)` par la boucle de la rubrique.
 *
 * @param {object} context fermetures de `mount` : `parts` (nœuds fixes), `state` (`built`,
 *   `view`, `phone`), `renderAll` (replace les planètes), `showSystem` (en-tête et intro)
 *
 * @returns {{ enter: (index: number) => void, exit: () => void, step: (dt: number) => void }}
 *   commandes du zoom
 */
export function createZoom({ parts, state, renderAll, showSystem }) {
  const { plan, layout } = parts;
  const camera = makeCamera(plan);
  let run = null; // animation en cours : { kind, built, system, planets, shift, ... }
  let hovered = false;

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
    const wide = height / (camera.ratio() || OVERVIEW_RATIO);
    const width = Math.max(wide, 2 * system.maxRadius + ORBIT_PAD);
    return { cx: system.cx, cy: system.cy, w: width };
  };

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

  /** Fin de l'animation : l'entrée n'a rien d'autre à faire, la sortie remet le repos. */
  const conclude = (finished) => {
    if (finished.kind === 'in') return;
    const { view, built } = state;
    view.zoomedIndex = -1;
    plan.classList.remove('zoomed', 'bleed');
    plan.style.removeProperty('height');
    plan.style.aspectRatio = `${built.width} / ${built.height}`;
    place(overview());
    finished.system.sun.focus({ preventScroll: true });
  };

  /** Termine l'animation sur-le-champ : état final, rendu, focus. */
  const complete = () => {
    const finished = run;
    advance(1);
    run = null;
    conclude(finished);
    renderAll();
  };

  /** Lance l'animation `kind` ; sous mouvement réduit, elle se termine aussitôt. */
  const start = (kind, system, planets) => {
    const { built } = state;
    const entering = kind === 'in';
    const anchor = planets[0].angle;
    run = {
      kind,
      built,
      system,
      planets,
      shift: planets.map((planet) => (
        entering ? wrapAngle(anchor + planet.rel - planet.angle) : 0
      )),
      from: { cx: camera.cx, cy: camera.cy, w: camera.w },
      target: entering ? () => focus(system) : overview,
      tilt: system.tilt,
      tiltTo: entering ? focusTilt(system, state.phone) : system.restTilt,
      restTilt: system.restTilt,
      duration: entering ? ENTER_MS : EXIT_MS,
      elapsed: 0,
      done: 0,
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
   */
  const enter = (index) => {
    const { built, view } = state;
    if (!built || view.zoomedIndex >= 0) return;
    const system = built.systems[index];
    system.restTilt ??= system.tilt;
    view.zoomedIndex = index;
    built.systems.forEach((each, k) => {
      each.g.classList.toggle('on', k === index);
      each.g.classList.toggle('dim', k !== index);
    });
    plan.classList.add('zoomed');
    plan.classList.toggle('bleed', system.phonePis);
    layout.classList.add('zfocus');
    showSystem(index);
    setHeight(plan, zoomedHeight(system));
    if (state.phone) scrollToPlan();
    camera.set({ ...overview() });
    start('in', system, planetsOf(index));
  };

  /** Sort du zoom (sans effet au repos ou pendant une animation) ; focus rendu au soleil. */
  const exit = () => {
    const { built, view } = state;
    if (view.zoomedIndex < 0 || run) return;
    const system = built.systems[view.zoomedIndex];
    layout.classList.remove('zfocus');
    for (const each of built.systems) each.g.classList.remove('on', 'dim');
    setHeight(plan, (columnWidth(plan) * built.height) / built.width);
    start('out', system, planetsOf(system.index));
  };

  /** Un pointeur sur le plan ou une planète focalisée au clavier arrête la rotation. */
  const held = () => hovered || plan.querySelector('.sys.on .planet:focus-visible') !== null;

  /**
   * @brief Avance l'animation en cours, ou la rotation du système zoomé.
   *
   * @param {number} dt pas de la boucle en ms (50 au plus)
   */
  const step = (dt) => {
    const { built, view } = state;
    if (run && run.built !== built) run = null; // plan reconstruit : animation abandonnée
    if (run) {
      run.elapsed += dt;
      if (run.elapsed >= run.duration) complete();
      else advance(ease(run.elapsed / run.duration));
      return;
    }
    if (!built || view.zoomedIndex < 0 || held()) return;
    for (const planet of built.planets)
      if (planet.systemIndex === view.zoomedIndex) planet.angle += SPIN * dt;
  };

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || state.view.zoomedIndex < 0) return;
    if (!layout.parentElement?.classList.contains('on')) return;
    if (!initSheet(document).isOpen()) exit();
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
    place(focus(system));
    renderAll();
  }).observe(plan);

  return { enter, exit, step };
}
