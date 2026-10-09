/*
Navigation entre rubriques : hash de l'adresse (clics [data-go], retour arrière, ancre comme
#dossier) et saut en hyperespace en deux temps : la rubrique de départ part, puis celle
d'arrivée vient du centre, courbée par le filtre #fov. Les rubriques ne quittent jamais main,
qui sert de scène le temps du saut (html[data-warp], css/layout.css). Le DOM n'est lu qu'à
l'appel de createRouter ou de listViews : jumpDirection se teste sous Node.
*/
import { reduced, watchReduced } from './motion.js';

const VIEWS = 'main > section.view';
const TITLES = 'h1, h2';
const LAST_FRAME_MS = 20; // marge après l'animation d'arrivée : 1020 ms (checklist, section 1)
const CSS_TIME = /^(\d*\.?\d+)(ms|s)$/;
const CALM_MS = 650; // fin du flash, ciel rendu à sa vitesse de croisière
const FOV_MAX = 0.3;
const LENS_SIZE = 128; // côté en pixels de la carte de déplacement #fovMap
const LENS_FALLOFF = 1.8; // déplacement nul au centre, croissant jusqu'aux coins
const WARP_VARS = ['left', 'width', 'top', 'cx', 'cy']; // propriétés --warp-* de main
const MODIFIER_KEYS = ['ctrlKey', 'metaKey', 'shiftKey', 'altKey'];

/**
 * @brief Sens du saut d'une rubrique à une autre, selon leur ordre.
 *
 * jumpDirection('home', 'contact', ['home', 'journey', 'contact']) -> 'forward'
 *
 * @param {string | null | undefined} fromId rubrique de départ (null au premier affichage)
 * @param {string | null | undefined} toId rubrique d'arrivée
 * @param {readonly string[]} ids identifiants des rubriques dans leur ordre, jamais modifiés
 *
 * @returns {'forward' | 'backward' | null} null si les rubriques sont identiques ou si l'une
 *   d'elles est absente de ids
 */
export function jumpDirection(fromId, toId, ids) {
  if (fromId === toId) return null;
  const from = ids.indexOf(fromId);
  const to = ids.indexOf(toId);
  if (from < 0 || to < 0) return null;
  return to > from ? 'forward' : 'backward';
}

/**
 * @brief Rubriques de la page, dans l'ordre du document (index.html).
 *
 * @returns {HTMLElement[]} éléments main > section.view, liste neuve à chaque appel
 */
export function listViews() {
  return [...document.querySelectorAll(VIEWS)];
}

/**
 * @brief Carte de déplacement de la courbure en barillet (canaux rouge et vert).
 *
 * @returns {string} image PNG de LENS_SIZE pixels de côté, en URL data:
 */
function lensMap() {
  const canvas = document.createElement('canvas');
  canvas.width = LENS_SIZE;
  canvas.height = LENS_SIZE;
  const context = canvas.getContext('2d');
  const image = context.createImageData(LENS_SIZE, LENS_SIZE);
  const last = LENS_SIZE - 1;
  for (let row = 0; row < LENS_SIZE; row++)
    for (let column = 0; column < LENS_SIZE; column++) {
      const x = (column / last) * 2 - 1;
      const y = (row / last) * 2 - 1;
      const pull = Math.min(1, Math.hypot(x, y) / Math.SQRT2) ** LENS_FALLOFF;
      const at = (row * LENS_SIZE + column) * 4;
      image.data.set([128 - 127 * x * pull, 128 - 127 * y * pull, 128, 255], at);
    }
  context.putImageData(image, 0, 0);
  return canvas.toDataURL();
}

/**
 * @brief Élément du décor du saut ; son absence part une fois en console.error.
 *
 * @param {string} selector sélecteur CSS de l'élément ('.flash', '#fovMap', '#fovDisp')
 * @param {string} effect effet du saut perdu sans lui ('flash' ou 'courbure')
 *
 * @returns {Element | null} élément, null s'il est absent
 */
function decor(selector, effect) {
  const found = document.querySelector(selector);
  if (!found) console.error(`router : ${selector} absent de la page, saut sans ${effect}`);
  return found;
}

/**
 * @brief Durée d'un jeton CSS de html, en ms.
 *
 * @param {CSSStyleDeclaration} style styles calculés de html
 * @param {string} name nom du jeton ('--dur-warp-out' ou '--dur-warp-in')
 *
 * @returns {number} durée strictement positive ; lève une Error qui nomme le jeton et sa
 *   valeur s'il est absent ou n'est pas une telle durée en s ou ms
 */
function tokenMs(style, name) {
  const value = style.getPropertyValue(name).trim();
  if (!value) throw new Error(`router : jeton ${name} non défini sur html (css/tokens.css)`);
  const match = CSS_TIME.exec(value);
  const ms = match ? Number(match[1]) * (match[2] === 's' ? 1000 : 1) : NaN;
  if (!(ms > 0))
    throw new Error(`router : jeton ${name} vaut "${value}", durée > 0 attendue (0.45s)`);
  return ms;
}

/**
 * @brief Durées du saut, tirées des animations CSS des rubriques (css/tokens.css).
 *
 * @returns {{ bend: number, total: number } | null} courbure (--dur-warp-out +
 *   --dur-warp-in) et saut complet, en ms ; null, signalé en console.error, si un des deux
 *   jetons est illisible
 */
function warpTiming() {
  const style = getComputedStyle(document.documentElement);
  try {
    const bend = tokenMs(style, '--dur-warp-out') + tokenMs(style, '--dur-warp-in');
    return { bend, total: bend + LAST_FRAME_MS };
  } catch (error) {
    console.error('router : saut en hyperespace désactivé, changements immédiats', error);
    return null;
  }
}

/**
 * @brief Rubrique et ancre désignées par un hash (`#skills`, `#dossier` dans #home...).
 *
 * @param {string} hash valeur de location.hash
 *
 * @returns {{ view: HTMLElement, anchor: HTMLElement | null } | null} rubrique qui contient
 *   la cible, ancre si la cible est intérieure ; null si le hash ne désigne aucune rubrique
 */
function resolve(hash) {
  let target = null;
  try {
    const id = hash.length > 1 ? decodeURIComponent(hash.slice(1)) : '';
    target = id ? document.getElementById(id) : null;
  } catch {
    return null; // séquence %xx invalide : hash inconnu
  }
  const view = target?.closest(VIEWS);
  return view ? { view, anchor: target === view ? null : target } : null;
}

/**
 * @brief Élément qui reçoit le focus à l'arrivée sur une cible.
 *
 * @param {{ view: HTMLElement, anchor: HTMLElement | null }} found cible du hash
 *
 * @returns {HTMLElement} l'ancre si c'est un h1 ou h2, sinon son premier h1 ou h2, sinon
 *   celui de la rubrique, sinon la rubrique
 */
function heading({ view, anchor }) {
  if (anchor?.matches(TITLES)) return anchor;
  return anchor?.querySelector(TITLES) ?? view.querySelector(TITLES) ?? view;
}

/**
 * @brief Donne le focus au titre d'une cible, rendu focalisable (tabindex="-1") au besoin.
 *
 * @param {{ view: HTMLElement, anchor: HTMLElement | null }} found cible du hash
 */
function focusTitle(found) {
  const title = heading(found);
  if (!title.hasAttribute('tabindex')) title.tabIndex = -1;
  title.focus({ preventScroll: true });
}

/**
 * @brief Pilote les rubriques de main d'après le hash, avec ou sans saut en hyperespace.
 *
 * Une seconde demande pendant un saut termine le premier puis part de son arrivée ; le
 * mouvement réduit, relu à chaque demande, donne un changement immédiat, de même que main
 * inerte (chargement, écran d'erreur). À l'arrivée, le focus va au titre de la rubrique ou
 * de l'ancre (sauf au premier affichage), dès que main est utilisable.
 *
 * @param {{ onView: (id: string) => void, sky?: { warp: Function, calm: Function } | null }}
 *   options rappel de la rubrique affichée (barre), ciel accéléré pendant le saut
 *
 * @returns {object} { start(), focusCurrent() }
 */
export function createRouter({ onView, sky = null }) {
  const root = document.documentElement;
  const main = document.querySelector('main');
  const views = listViews();
  const ids = views.map((view) => view.id);
  const timing = warpTiming();
  const flash = decor('.flash', 'flash');
  const map = decor('#fovMap', 'courbure');
  const displacement = decor('#fovDisp', 'courbure');
  const bend = map && displacement; // carte absente : déplacement faussé, courbure laissée à 0
  let current = null;
  let jump = null; // saut en cours : { from, found, timers, frame }
  let waiting = null; // cible dont le titre attend que main ne soit plus inerte

  map?.setAttribute('href', lensMap());

  /**
   * @brief Montre une rubrique seule.
   *
   * @param {HTMLElement} view section.view de main
   */
  const show = (view) => {
    views.forEach((each) => each.classList.toggle('on', each === view));
  };

  /**
   * @brief Fait d'une rubrique la rubrique courante et la signale à la barre.
   *
   * @param {HTMLElement} view section.view de main
   */
  const select = (view) => {
    current = view;
    onView(view.id);
  };

  /**
   * @brief Arrivée : haut de la rubrique, ou ancre amenée à l'écran.
   *
   * @param {{ view: HTMLElement, anchor: HTMLElement | null }} found cible du hash
   * @param {boolean} focus vrai pour donner le focus au titre de la cible
   */
  const land = (found, focus) => {
    waiting = focus && main.inert ? found : null;
    if (focus && !waiting) focusTitle(found);
    if (found.anchor) found.anchor.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth' });
    else scrollTo(0, 0);
  };

  /**
   * @brief Rend main, les rubriques, le flash, la courbure et le ciel à leur repos.
   *
   * @param {HTMLElement} from rubrique de départ du saut, dont l'inertie est retirée
   */
  const unwarp = (from) => {
    root.removeAttribute('data-warp');
    WARP_VARS.forEach((name) => main.style.removeProperty(`--warp-${name}`));
    if (!main.getAttribute('style')) main.removeAttribute('style');
    views.forEach((view) => view.classList.remove('leave', 'enter'));
    from.inert = false;
    flash?.classList.remove('on');
    bend?.setAttribute('scale', '0');
    sky?.calm();
  };

  /** @brief Termine sur-le-champ le saut en cours, s'il y en a un, et pose son arrivée. */
  const finishJump = () => {
    const done = jump;
    if (!done) return;
    jump = null;
    done.timers.forEach((timer) => clearTimeout(timer));
    cancelAnimationFrame(done.frame);
    unwarp(done.from);
    show(done.found.view);
    land(done.found, true);
  };

  /**
   * @brief Lance le saut de la rubrique affichée vers `found.view`, signalée dès le départ.
   *
   * Les deux rubriques restent dans main, placées en absolu à leur position d'écran ; la
   * rubrique qui part est inerte.
   *
   * @param {{ view: HTMLElement, anchor: HTMLElement | null }} found cible du hash
   * @param {'forward' | 'backward'} direction sens du saut
   */
  const startJump = (found, direction) => {
    const from = current;
    const state = { from, found, timers: [], frame: 0 };
    jump = state;
    select(found.view);
    const box = from.getBoundingClientRect();
    const place = {
      left: box.left,
      width: box.width,
      top: box.top,
      cx: innerWidth / 2,
      cy: innerHeight / 2,
    };
    WARP_VARS.forEach((name) => main.style.setProperty(`--warp-${name}`, `${place[name]}px`));
    from.classList.add('leave');
    from.inert = true;
    found.view.classList.add('on', 'enter');
    root.dataset.warp = direction;
    scrollTo(0, 0);
    flash?.classList.add('on');
    sky?.warp(direction);
    const start = performance.now();
    const curve = (now) => {
      const k = Math.min(1, Math.max(0, (now - start) / timing.bend));
      bend?.setAttribute('scale', (Math.sin(Math.PI * k) * FOV_MAX).toFixed(4));
      if (k < 1 && jump === state) state.frame = requestAnimationFrame(curve);
    };
    curve(start);
    const calm = () => {
      flash?.classList.remove('on');
      sky?.calm();
    };
    state.timers.push(setTimeout(calm, CALM_MS), setTimeout(finishJump, timing.total));
  };

  /**
   * @brief Affiche la rubrique du hash courant : saut animé, ou changement immédiat au
   *   premier affichage, sous mouvement réduit, main inerte, pour la même rubrique ou une
   *   ancre.
   *
   * Un hash inconnu est remplacé, sans nouvelle entrée d'historique, par la première rubrique.
   *
   * @param {{ initial?: boolean }} [options] initial : premier affichage, sans focus
   */
  const route = ({ initial = false } = {}) => {
    const found = resolve(location.hash);
    if (!found) {
      history.replaceState(null, '', `#${ids[0]}`);
      route({ initial });
      return;
    }
    if (jump?.found.view === found.view && jump.found.anchor === found.anchor) return;
    finishJump();
    const animated = timing && !initial && !reduced() && !main.inert;
    const direction = animated ? jumpDirection(current?.id, found.view.id, ids) : null;
    if (!direction) {
      select(found.view);
      show(found.view);
      land(found, !initial);
      return;
    }
    try {
      startJump(found, direction);
    } catch (error) {
      console.error(`router : saut vers #${found.view.id} interrompu, arrivée directe`, error);
      finishJump();
    }
  };

  /**
   * @brief Clic sur un [data-go] : hash de sa rubrique, ou rubrique réaffichée.
   *
   * @param {MouseEvent} event clic reçu par document
   */
  const onClick = (event) => {
    const trigger = event.target.closest?.('[data-go]');
    if (!trigger || !ids.includes(trigger.dataset.go)) return;
    const modified = MODIFIER_KEYS.some((key) => event[key]);
    // lien ouvert à part (nouvel onglet, fenêtre...) : comportement natif du navigateur
    if (trigger.matches('a[href]') && (modified || event.button !== 0)) return;
    event.preventDefault();
    const hash = `#${trigger.dataset.go}`;
    if (location.hash === hash) route();
    else location.hash = hash;
  };

  /** @brief Donne le focus au titre en attente, ou à celui de la rubrique affichée. */
  const focusCurrent = () => {
    if (!current) return;
    focusTitle(waiting ?? { view: current, anchor: null });
    waiting = null;
  };

  return {
    /** @brief Affiche la rubrique du hash, puis suit clics, hash, réglage et main inerte. */
    start() {
      document.addEventListener('click', onClick);
      addEventListener('hashchange', () => route());
      watchReduced((still) => {
        if (still) finishJump();
      });
      new MutationObserver(() => {
        if (waiting && !main.inert) focusCurrent();
      }).observe(main, { attributeFilter: ['inert'] });
      route({ initial: true });
    },

    focusCurrent,
  };
}
