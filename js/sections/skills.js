/*
Compétences : huit constellations dont chaque étoile est une compétence, légende des astres.
Dessin dans skills-art.js, placement dans skills-layout.js, construction de la vue
d'ensemble dans skills-scene.js, styles dans css/skills.css.
Ce fichier monte la structure, cadre la caméra, câble les constellations et traduit.
Les projets liés (puces du panneau) sont dans skills-related.js ; la phrase Devpedia, sous le
plan et sur toute la largeur, est montée ici.
Le déploiement d'une constellation, la plongée sur un astre et le panneau de compétence sont
dans skills-focus.js (caméra, séquences) et skills-panel.js (panneau).
Structure et mécanique de la maquette : docs/design/prototype/prototype.template.html:388-408
(HTML) et 810-847 (construction).
*/
import { BREAKPOINTS, el, svg } from '../core/dom.js';
import { format } from '../core/i18n.js';
import { makeCamera } from '../core/motion.js';
import { bodyIcon } from './skills-art.js';
import { createFocus, onActivate } from './skills-focus.js';
import { overviewCamera } from './skills-layout.js';
import { openRelated } from './skills-related.js';
import { buildOverview, LEVELS, placeLabels, retext } from './skills-scene.js';

const LEGEND_ORDER = ['advanced', 'intermediate', 'beginner', 'unknown']; // maquette:932

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
 * @brief Phrase du lien Devpedia : l'introduction, une espace, le lien, un point final.
 *
 * @returns {{ node: HTMLElement, intro: Text, anchor: HTMLAnchorElement }} la phrase, son
 *   introduction et son lien, textes vides jusqu'au premier update
 */
function buildLink() {
  const intro = document.createTextNode('');
  const anchor = el('a', { target: '_blank', rel: 'noopener' });
  const dot = document.createTextNode('.'); // point final en dur : la donnée n'en porte pas
  return {
    node: el('p', { class: 'devpedia' }, intro, anchor, dot),
    intro,
    anchor,
  };
}

/**
 * @brief Éléments fixes de la rubrique, construits une fois et insérés d'un bloc.
 *
 * @returns {object} nœuds : heading, lede, layout, plan (svg), hint, panel, link, legend
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
    link: buildLink(),
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
 *
 * @returns {(content: object) => void} update(content) : textes d'une langue
 */
export function mount(root) {
  const narrow = matchMedia(BREAKPOINTS.narrow);
  const parts = buildParts();
  const camera = makeCamera(parts.plan);
  const state = {
    skills: null, // données `skills` de la langue affichée
    projects: null, // données `projects` de la langue affichée (titres des projets liés)
    signature: '', // idsOf des données affichées
    built: null, // résultat de buildOverview
    phone: narrow.matches,
    width: 0, // largeur affichée du plan, 0 tant que la rubrique n'est pas affichée
    selection: { group: null, star: null }, // identifiants, gardés d'une langue à l'autre
    camera,
  };
  const focus = createFocus({ root, parts, state, camera, onRelated: openRelated });

  /** Cadre la vue d'ensemble sur la largeur affichée et replace les noms (jamais masquée). */
  const fit = () => {
    const { built, width, selection } = state;
    if (!built || !width || selection.group || focus.moving()) return;
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
    focus.reset();
    state.phone = narrow.matches;
    const built = buildOverview({ groups: skills.groups, text: skills, phone: state.phone });
    state.built = built;
    state.selection = { group: null, star: null };
    parts.plan.replaceChildren(...built.children);
    parts.plan.setAttribute('viewBox', `0 0 ${built.width} ${built.height}`);
    parts.plan.style.aspectRatio = `${built.width} / ${built.height}`;
    parts.plan.style.setProperty('--bs', built.scale);
    wire(built);
    focus.attach(built);
    fit();
  };

  /** Phrase Devpedia : une chaîne absente est signalée, jamais inventée. */
  const translateLink = () => {
    const { link } = state.skills;
    for (const key of ['intro', 'label', 'href'])
      if (typeof link?.[key] !== 'string')
        console.error(`skills : chaîne absente skills.link.${key}`);
    parts.link.intro.data = `${link?.intro ?? ''} `;
    parts.link.anchor.textContent = link?.label ?? '';
    parts.link.anchor.setAttribute('href', link?.href ?? '');
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
    translateLink();
    for (const { level, text } of legend.items)
      text.data = format(skills.legendItem, {
        body: skills.bodies[level],
        level: skills.levels[level],
      });
  };

  new ResizeObserver((entries) => {
    state.width = entries[0].contentRect.width;
    fit();
    focus.recentre();
  }).observe(parts.plan);
  narrow.addEventListener('change', () => {
    if (state.skills) build();
  });

  root.append(parts.heading, parts.lede, parts.layout, parts.link.node, parts.legend.node);

  return ({ skills, projects }) => {
    const same = state.built && idsOf(skills.groups) === state.signature;
    Object.assign(state, { skills, projects });
    translateTexts();
    if (same) {
      retext(state.built, skills.groups, skills);
      focus.relabel();
    } else {
      state.signature = idsOf(skills.groups);
      build();
    }
  };
}
