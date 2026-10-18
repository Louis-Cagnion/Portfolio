/*
Compétences, déploiement d'une constellation : étoiles écartées et caméra (1000 ms), plongée
sur la première étoile (950 ms), saut d'étoile avec recul (1400 ms), retour à la vue
d'ensemble (1200 ms). Même couture que `createZoom` de projects-zoom.js : skills.js appelle
`enter(index)`, `go(rank)` et `exit(options)` ; `options.quiet` (sortie par Échap) rend le
focus sans anneau de focus clavier. Le panneau (skills-panel.js) naît au premier déploiement
et se vide au retour.
Mécanique de la maquette P2 (choix de Louis du 17/10/2026) : docs/design/s8/mockup-skills.js.
Calculs d'image : skills-pose.js ; règles : css/skills.css.
Une seule boucle `requestAnimationFrame`, qui lit `performance.now()` à chaque image : la
progression ne dépend jamais de l'argument du rappel (origine différente dans une iframe).
*/
import { ease, lerp, reduced, scrollBehavior, watchReduced } from '../core/motion.js';
import { initSheet } from '../ui/sheet.js';
import { createPanel } from './skills-panel.js';
import { relatedOf } from './skills-related.js';
import {
  bodyScale,
  diveTarget,
  extentOf,
  focusCamera,
  overviewCamera,
  spreadOf,
} from './skills-layout.js';
import { LEVELS, placeLabels } from './skills-scene.js';
import {
  PHONE_RATIO,
  blend,
  hopOf,
  nameBoxes,
  phoneCamera,
  phoneFrame,
  placeStars,
} from './skills-pose.js';

const ENTER_MS = 1000;
const DIVE_MS = 950;
const JUMP_MS = 1400;
const EXIT_MS = 1200;
const SCROLL_MARGIN = 8; // px entre la barre du haut et le plan (maquette)

/**
 * @brief Lie Entrée et Espace d'un nœud à une action (la touche n'y défile pas).
 *
 * @param {Element} node nœud focalisable
 * @param {() => void} action rappel
 */
export function onActivate(node, action) {
  node.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    action();
  });
}

/**
 * @brief Fixe la hauteur du plan en pixels, animée par la transition de css/skills.css.
 *
 * Part de la hauteur affichée (`aspect-ratio` n'est pas animable), force un calcul de mise
 * en page, puis pose la hauteur visée.
 *
 * @param {SVGSVGElement} plan svg#constSvg
 * @param {number} pixels hauteur visée
 */
function setHeight(plan, pixels) {
  plan.style.height = `${plan.clientHeight}px`;
  plan.style.aspectRatio = '';
  plan.getBoundingClientRect();
  plan.style.height = `${pixels}px`;
}

/**
 * @brief Défile jusqu'au plan, sous la barre du haut (téléphone : le plan y reste collé).
 *
 * La position se prend sur la rubrique, jamais sur le plan : déployé, le plan est collant et
 * sa position affichée dépend déjà du défilement.
 *
 * @param {HTMLElement} layout #skillsLayout, dont le plan est le premier bloc
 */
function scrollToPlan(layout) {
  const page = getComputedStyle(document.documentElement);
  const bar = parseFloat(page.getPropertyValue('--bar-h')) || 0;
  const top = layout.getBoundingClientRect().top + scrollY - bar - SCROLL_MARGIN;
  scrollTo({ top, behavior: scrollBehavior() });
}

/**
 * @brief Déploiement des constellations de la rubrique Compétences.
 *
 * @param {object} context fermetures de `mount` (skills.js)
 * @param {HTMLElement} context.root section.view#skills
 * @param {object} context.parts nœuds fixes : plan, layout, panel
 * @param {object} context.state `skills`, `projects`, `built`, `phone`, `selection`
 * @param {object} context.camera caméra du plan (`makeCamera`)
 * @param {(id: string, button: HTMLButtonElement) => void} context.onRelated projet lié
 *
 * @returns {object} commandes : `enter(index)`, `go(rank)`, `exit(options)`,
 *   `attach(built)` (câble les étoiles d'une vue d'ensemble neuve), `reset()` (repos sans
 *   animation), `relabel()` (bascule de langue), `recentre()` (redimensionnement), `moving()`
 *   (vrai de l'entrée à la fin de la dernière animation)
 */
export function createFocus({ root, parts, state, camera, onRelated }) {
  const { plan, layout, panel: host } = parts;
  let deck = null; // constellation déployée : { built, spots, rank, panel, frame, boxes }
  let busy = false; // une séquence tourne : entrée, saut ou retour (recentrage bloqué)
  let hurry = false; // la séquence en cours se termine sans animation
  let epoch = 0; // change à chaque reset : une séquence abandonnée ne touche plus à rien
  let step = null; // image en cours : { finish, abort }
  let scale = 0; // échelle courante des astres (`--bs`)
  let last = { width: 1, height: 1, ratio: 1 }; // dernière mesure du plan affiché

  const phone = () => state.phone;
  /** Unités du dessin par pixel affiché, posées par la caméra (`--u`). */
  const unit = () => parseFloat(plan.style.getPropertyValue('--u')) || 1;
  const setScale = (value) => {
    scale = value;
    plan.style.setProperty('--bs', value.toFixed(3));
  };
  const arrange = (t, drop) => placeStars(deck.built, deck.spots, {
    t,
    drop,
    scale,
    unit: unit(),
    phone: phone(),
  });

  /** Taille du plan ; masqué (largeur nulle), la dernière taille affichée sert encore. */
  const view = () => {
    if (plan.clientWidth) {
      last = { width: plan.clientWidth, height: plan.clientHeight, ratio: camera.ratio() };
    }
    return last;
  };

  /** Textes du panneau : constellation déployée de la langue affichée, ordre du parcours. */
  const textsOf = () => {
    const group = state.skills.groups.find((item) => item.id === deck.built.id);
    const items = new Map(group.items.map((item) => [item.id, item]));
    return {
      ui: state.skills,
      title: group.title,
      stars: deck.built.stars.map((star) => {
        const item = items.get(star.id);
        return { ...item, projects: relatedOf(state.projects, item.projects) };
      }),
    };
  };

  /**
   * Anime `frame(t)` de 0 à 1 sur `duration` ms. Sous mouvement réduit ou séquence pressée :
   * une seule image, sans `requestAnimationFrame`.
   */
  const play = (duration, frame) => new Promise((resolve) => {
    if (hurry || reduced() || !(duration > 0)) {
      frame(1);
      resolve();
      return;
    }
    const start = performance.now();
    let id = 0;
    const end = () => {
      step = null;
      resolve();
    };
    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / duration);
      frame(t);
      if (t < 1) id = requestAnimationFrame(tick);
      else end();
    };
    step = {
      finish: () => {
        cancelAnimationFrame(id);
        frame(1);
        end();
      },
      abort: () => {
        cancelAnimationFrame(id);
        end();
      },
    };
    tick();
  });

  /** Termine sur-le-champ la séquence en cours (sortie de rubrique, onglet masqué...). */
  const hurryUp = () => {
    if (!busy) return;
    hurry = true;
    step?.finish();
  };

  /** Fin de séquence : plus rien en cours, animations de nouveau permises. */
  const settle = () => {
    busy = false;
    hurry = false;
  };

  /** Déplace la caméra de `from` vers `to` à la progression adoucie `e`. */
  const travel = (from, to, e) => camera.set({
    cx: lerp(from.cx, to.cx, e),
    cy: lerp(from.cy, to.cy, e),
    w: lerp(from.w, to.w, e),
  });
  const cameraPose = () => ({ cx: camera.cx, cy: camera.cy, w: camera.w });

  /** Caméra du déploiement : tout le nuage sur téléphone, l'étoile 0 au bureau. */
  const gather = () => {
    if (phone()) return phoneCamera(deck.frame, deck.spots, deck.boxes);
    return focusCamera(deck.spots[0], extentOf(deck.spots), view().ratio, { phone: false });
  };

  /** Cible de la plongée sur l'étoile de rang `rank`, à la taille affichée du plan. */
  const aim = (rank) => {
    const spot = deck.spots[rank];
    const level = LEVELS[deck.built.stars[rank].level];
    return diveTarget({ x: spot.x, y: spot.y, level }, view(), { phone: phone() });
  };

  /** Plongée sur l'étoile `to` ; `from` (rang) ajoute le recul à mi-course d'un saut. */
  const dive = (to, from) => {
    const begin = cameraPose();
    const scale0 = scale;
    const hop = from === null ? null : hopOf(deck.spots, from, to, phone());
    return play(hop ? JUMP_MS : DIVE_MS, (k) => {
      const target = aim(to);
      const e = ease(k);
      camera.set({
        cx: lerp(begin.cx, target.cam.cx, e),
        cy: lerp(begin.cy, target.cam.cy, e),
        w: blend(begin.w, hop?.w, target.cam.w, k),
      });
      setScale(blend(scale0, hop?.scale, target.scale, k));
      arrange(1, from === null ? e : 1);
    });
  };

  /** Constellations au déploiement (`index` choisi) ou au retour (`index` < 0). */
  const mark = (index, on) => {
    state.built.groups.forEach(({ node }, k) => {
      const mine = k === index;
      node.classList.toggle('sel', on && mine);
      node.classList.toggle('dim', on && !mine);
      node.toggleAttribute('inert', on && !mine); // sans effet sur un g SVG : tabindex aussi
      node.setAttribute('tabindex', on ? '-1' : '0');
      if (on && mine) node.removeAttribute('role');
      else node.setAttribute('role', 'button');
    });
  };

  /** Étoiles de la constellation choisie : focalisables et annoncées, ou rendues au repos. */
  const arm = (built, on) => {
    for (const { element, label } of built.stars) {
      element.setAttribute('tabindex', on ? '0' : '-1');
      if (on) {
        element.setAttribute('role', 'button');
        element.setAttribute('aria-label', label.textContent);
      } else {
        element.removeAttribute('role');
        element.removeAttribute('aria-label');
      }
    }
  };

  /** Fiche de l'étoile courante : panneau, `.cur` (seule tabulable), sélection gardée. */
  const showCurrent = () => {
    const { built, rank, panel } = deck;
    panel.show(rank, textsOf());
    built.stars.forEach(({ element }, j) => {
      element.classList.toggle('cur', j === rank);
      element.setAttribute('tabindex', j === rank ? '0' : '-1'); // tabulation itinérante
    });
    state.selection = { group: built.id };
    host.querySelector('#skill').classList.remove('traveling');
  };

  /**
   * Rend le focus à `node` si la rubrique est encore affichée (jamais pendant un saut) ;
   * `quiet` (retour par Échap) le rend sans anneau de focus clavier.
   */
  const focusIfShown = (node, quiet = false) => {
    if (!root.classList.contains('on')) return;
    node.focus(quiet ? { preventScroll: true, focusVisible: false } : { preventScroll: true });
  };

  /** Garde le panneau dans le flux le temps du retour (téléphone), replié par `--fold`. */
  const startFold = () => {
    host.style.setProperty('--fold-h', `${host.offsetHeight}px`);
    host.style.setProperty('--fold', '1');
    layout.classList.add('leaving');
  };

  /** Fin du retour : le panneau quitte le flux. */
  const endFold = () => {
    layout.classList.remove('leaving');
    host.style.removeProperty('--fold');
    host.style.removeProperty('--fold-h');
  };

  /** Retour à la vue d'ensemble (bouton, Échap) ; `options.quiet` : focus sans anneau. */
  const exit = async (options) => {
    if (busy || !deck) return;
    busy = true;
    const token = epoch;
    const { built } = deck;
    state.selection = { group: null };
    if (phone()) startFold();
    layout.classList.remove('focus');
    plan.classList.remove('focused');
    built.links.forEach((link) => link.classList.remove('walk'));
    built.stars.forEach(({ element }) => element.classList.remove('cur'));
    mark(-1, false);
    arm(built, false);
    host.inert = true;
    const { built: overview } = state;
    if (phone()) setHeight(plan, (view().width * overview.height) / overview.width);
    const [begin, scale0] = [cameraPose(), scale];
    const rest = bodyScale({ phone: phone(), focused: false });
    await play(EXIT_MS, (k) => {
      const e = ease(k);
      host.style.setProperty('--fold', String(1 - e));
      travel(begin, overviewCamera(overview, view().ratio), e);
      setScale(lerp(scale0, rest, e));
      placeLabels(overview, unit());
      arrange(1 - e, 1 - e);
    });
    if (token !== epoch) return;
    endFold();
    plan.style.removeProperty('height');
    plan.style.aspectRatio = `${overview.width} / ${overview.height}`;
    camera.set(overviewCamera(overview, view().ratio));
    setScale(rest);
    arrange(0, 0);
    placeLabels(overview, unit());
    host.replaceChildren();
    deck = null;
    settle();
    focusIfShown(built.node, options?.quiet === true);
  };

  /** Saut à l'étoile de rang `to` : puce, flèche, clic ou touche sur une étoile. */
  const go = async (to) => {
    if (busy || !deck || to === deck.rank || to < 0 || to >= deck.built.stars.length) return;
    busy = true;
    const token = epoch;
    const from = deck.rank;
    deck.rank = to;
    const { links } = deck.built;
    links.forEach((link) => link.classList.remove('walk'));
    if (Math.abs(to - from) === 1) links[Math.min(to, from)].classList.add('walk');
    host.querySelector('#skill').classList.add('traveling');
    await dive(to, from);
    if (token !== epoch) return;
    showCurrent();
    settle();
  };

  /** Déploie la constellation de rang `index` puis plonge sur sa première étoile. */
  const enter = async (index) => {
    const built = state.built?.groups[index];
    if (busy || deck || !built) return;
    busy = true;
    const token = epoch;
    const spots = spreadOf(built.stars, built.center, { phone: phone() });
    state.selection = { group: built.id };
    mark(index, true);
    arm(built, true);
    plan.classList.add('focused');
    layout.classList.add('focus');
    host.inert = false;
    deck = { built, spots, rank: 0 };
    deck.panel = createPanel(host, { onBack: exit, onStar: go, onRelated });
    deck.panel.show(0, textsOf());
    host.querySelector('#skill').classList.add('traveling');
    if (phone()) {
      Object.assign(deck, { frame: phoneFrame(plan, host), boxes: nameBoxes(built.stars) });
      setHeight(plan, view().width * PHONE_RATIO);
      scrollToPlan(layout);
    }
    const [begin, scale0] = [cameraPose(), scale];
    const full = bodyScale({ phone: phone(), focused: true });
    await play(ENTER_MS, (k) => {
      const e = ease(k);
      travel(begin, gather(), e);
      setScale(lerp(scale0, full, e));
      arrange(e, 0);
    });
    if (token !== epoch) return;
    await dive(0, null);
    if (token !== epoch) return;
    showCurrent();
    settle();
    focusIfShown(built.stars[0].element);
  };

  /** Câble les étoiles d'une vue d'ensemble neuve : un clic ou Entrée saute à l'étoile. */
  const attach = (built) => {
    for (const group of built.groups) {
      group.links = [...group.node.querySelectorAll('.link')];
      group.stars.forEach(({ element }, j) => {
        element.addEventListener('click', (event) => {
          if (!deck) return; // au repos, le clic remonte jusqu'à la constellation
          event.stopPropagation();
          go(j);
        });
        onActivate(element, () => go(j));
      });
    }
    scale = built.scale;
  };

  /** Remet le repos sans animation (vue d'ensemble reconstruite). */
  const reset = () => {
    epoch += 1;
    step?.abort();
    settle();
    endFold();
    layout.classList.remove('focus');
    plan.classList.remove('focused');
    plan.style.removeProperty('height');
    host.inert = true;
    host.replaceChildren();
    deck = null;
  };

  /** Bascule de langue : noms accessibles des étoiles et textes du panneau. */
  const relabel = () => {
    if (!deck || deck.built.id !== state.selection.group) return;
    for (const { element, label } of deck.built.stars)
      element.setAttribute('aria-label', label.textContent);
    deck.panel.update(textsOf());
  };

  /** Recadre l'étoile courante après un redimensionnement (jamais pendant une séquence). */
  const recentre = () => {
    if (busy || !deck || !plan.clientWidth) return;
    if (phone()) {
      plan.style.transition = 'none'; // pose directe : la vue lit aussitôt la hauteur finale
      plan.style.aspectRatio = '';
      plan.style.height = `${view().width * PHONE_RATIO}px`;
      view();
      plan.style.removeProperty('transition');
    }
    const target = aim(deck.rank);
    camera.set(target.cam);
    setScale(target.scale);
    arrange(1, 1);
  };

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.key !== 'Escape' || !state.selection.group) return;
    if (!root.classList.contains('on')) return;
    if (!initSheet(document).isOpen()) exit({ quiet: true });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hurryUp();
  });
  new MutationObserver(() => {
    if (!root.classList.contains('on')) hurryUp();
  }).observe(root, { attributes: true, attributeFilter: ['class'] });
  watchReduced((still) => {
    if (still) hurryUp();
  });

  return { enter, go, exit, attach, reset, relabel, recentre, moving: () => busy };
}
