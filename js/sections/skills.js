/*
Compétences : huit constellations dont chaque étoile est une compétence, légende des astres.
Dessin dans skills-art.js, placement dans skills-layout.js, construction de la vue
d'ensemble dans skills-scene.js, styles dans css/skills.css.
Ce fichier monte la structure, cadre la caméra, câble les constellations et traduit.
Le déploiement d'une constellation, la plongée sur un astre et le panneau de compétence ne
sont pas encore là (S8.C5 et S8.C6) : voir `idleFocus`.
Structure et mécanique de la maquette : docs/design/prototype/prototype.template.html:388-408
(HTML) et 810-847 (construction).
*/
import { BREAKPOINTS, el, svg } from '../core/dom.js';
import { format } from '../core/i18n.js';
import { makeCamera } from '../core/motion.js';
import { bodyIcon } from './skills-art.js';
import { overviewCamera } from './skills-layout.js';
import { buildOverview, LEVELS, placeLabels, retext } from './skills-scene.js';

const LEGEND_ORDER = ['advanced', 'intermediate', 'beginner', 'unknown']; // maquette:932

/**
 * Déploiement d'une constellation, en attente de S8.C6 (`createFocus` de skills-focus.js, sur
 * le modèle de `createZoom` de projects-zoom.js) : `enter(index)` déploie la constellation
 * de rang `index` dans `state.built.groups`, `exit()` revient à la vue d'ensemble. Sans effet
 * ici.
 */
const idleFocus = Object.freeze({ enter: () => {}, exit: () => {} });

/**
 * @brief Empreinte de la structure des données : identifiants des groupes et des étoiles.
 *
 * @param {object[]} groups `skills.groups`
 *
 * @returns {string} identique d'une langue à l'autre tant que la structure l'est
 */
const idsOf = (groups) => groups
  .map((group) => [group.id, ...group.items.map((item) => item.id)].join())
  .join('|');

/**
 * @brief Lie Entrée et Espace d'un nœud à une action (la touche n'y défile pas).
 *
 * @param {Element} node nœud focalisable
 * @param {() => void} action rappel
 */
function onActivate(node, action) {
  node.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    action();
  });
}

/**
 * @brief Légende : une phrase puis un astre par niveau, textes vides jusqu'au premier update.
 *
 * @returns {{ node: HTMLElement, intro: HTMLElement, items: object[] }} la légende, sa
 *   phrase et, par niveau, `{ level, text }` (le nœud texte de l'entrée)
 */
function buildLegend() {
  const intro = el('span');
  const items = LEGEND_ORDER.map((level) => ({ level, text: document.createTextNode('') }));
  const entries = items.map(({ level, text }) => (
    el('span', { class: 'mag' }, bodyIcon(LEVELS.indexOf(level)), text)
  ));
  return { node: el('div', { class: 'legend' }, intro, ...entries), intro, items };
}

/**
 * @brief Éléments fixes de la rubrique, construits une fois et insérés d'un bloc.
 *
 * @returns {object} nœuds : heading, lede, layout, plan (svg), hint, panel, legend
 */
function buildParts() {
  const plan = svg('svg', { class: 'viz const', id: 'constSvg', role: 'group' });
  const hint = el('p', { class: 'hint' });
  const panel = el('div', { class: 'focus-panel hud', inert: true });
  const layout = el(
    'div',
    { class: 'skills-layout', id: 'skillsLayout' },
    el('div', { class: 'viz-wrap' }, plan, hint),
    panel,
  );
  return {
    heading: el('h2', { tabindex: '-1' }),
    lede: el('p', { class: 'lede' }),
    layout,
    plan,
    hint,
    panel,
    legend: buildLegend(),
  };
}

/**
 * @brief Monte la rubrique Compétences : structure construite une fois, constellations au
 *   premier `update`.
 *
 * La bascule de langue réécrit les textes sur place (groupes et étoiles gardent leurs
 * nœuds, donc le focus) ; le passage de 880 px reconstruit la vue d'ensemble.
 *
 * @param {HTMLElement} root section.view#skills
 * @param {object} [hooks] commandes de déploiement à la place de `idleFocus` (essais)
 *
 * @returns {(content: object) => void} update(content) : textes d'une langue
 */
export function mount(root, { focus = idleFocus } = {}) {
  const narrow = matchMedia(BREAKPOINTS.narrow);
  const parts = buildParts();
  const camera = makeCamera(parts.plan);
  const state = {
    skills: null, // données `skills` de la langue affichée
    signature: '', // idsOf des données affichées
    built: null, // résultat de buildOverview
    phone: narrow.matches,
    width: 0, // largeur affichée du plan, 0 tant que la rubrique n'est pas affichée
    selection: { group: null, star: null }, // identifiants, gardés d'une langue à l'autre
    camera,
  };

  /** Cadre la vue d'ensemble sur la largeur affichée et replace les noms (jamais masquée). */
  const fit = () => {
    const { built, width, selection } = state;
    if (!built || !width || selection.group) return;
    camera.set(overviewCamera(built, camera.ratio()));
    placeLabels(built, camera.w / width);
  };

  /** Constellations : clic, Entrée et Espace appellent `focus.enter` de leur rang. */
  const wire = ({ groups }) => {
    groups.forEach((entry, index) => {
      entry.node.addEventListener('click', () => focus.enter(index));
      onActivate(entry.node, () => focus.enter(index));
    });
  };

  /** Construit la vue d'ensemble (nœuds neufs, aucun déploiement) depuis les données. */
  const build = () => {
    const { skills } = state;
    state.phone = narrow.matches;
    const built = buildOverview({ groups: skills.groups, text: skills, phone: state.phone });
    state.built = built;
    state.selection = { group: null, star: null };
    parts.plan.replaceChildren(...built.children);
    parts.plan.setAttribute('viewBox', `0 0 ${built.width} ${built.height}`);
    parts.plan.style.aspectRatio = `${built.width} / ${built.height}`;
    parts.plan.style.setProperty('--bs', built.scale);
    wire(built);
    fit();
  };

  /** Légende, aide et chapeau dans la langue affichée. */
  const translateTexts = () => {
    const { skills } = state;
    const { legend } = parts;
    parts.heading.textContent = skills.title;
    parts.lede.textContent = skills.lede;
    parts.hint.textContent = skills.hint;
    parts.plan.setAttribute('aria-label', skills.title);
    legend.intro.textContent = skills.legend;
    for (const { level, text } of legend.items)
      text.data = format(skills.legendItem, {
        body: skills.bodies[level],
        level: skills.levels[level],
      });
  };

  new ResizeObserver((entries) => {
    state.width = entries[0].contentRect.width;
    fit();
  }).observe(parts.plan);
  narrow.addEventListener('change', () => {
    if (state.skills) build();
  });

  root.append(parts.heading, parts.lede, parts.layout, parts.legend.node);

  return ({ skills }) => {
    const same = state.built && idsOf(skills.groups) === state.signature;
    Object.assign(state, { skills });
    translateTexts();
    if (same) retext(state.built, skills.groups, skills);
    else {
      state.signature = idsOf(skills.groups);
      build();
    }
  };
}
