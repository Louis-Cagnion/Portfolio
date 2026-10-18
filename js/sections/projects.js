/*
Projets : quatre systèmes stellaires (une planète par projet), liste des projets et fiche.
Dessin dans projects-art.js, placement dans projects-layout.js, boucle d'animation dans
projects-loop.js, zoom sur un système dans projects-zoom.js, fiche dans ui/sheet.js, styles
dans css/projects.css.
Structure et mécanique de la maquette : docs/design/s6/mockup.js.
*/
import { BREAKPOINTS, el, setRich, svg } from '../core/dom.js';
import { format } from '../core/i18n.js';
import { reduced, watchReduced } from '../core/motion.js';
import { initSheet } from '../ui/sheet.js';
import {
  buildSystems,
  plainTitle,
  remeasureLabels,
  renderPlanet,
  rescalePhone,
  restView,
  tintOf,
} from './projects-art.js';
import { HIT_RADIUS, nearestPlanet } from './projects-layout.js';
import { createLoop } from './projects-loop.js';
import { createZoom } from './projects-zoom.js';

const ARROW = '←';
const HELD = ':hover, :focus-visible'; // une planète survolée ou focalisée cesse de tourner
let revealById = null; // ouverture d'un projet lié par la rubrique montée (openProject)

/**
 * @brief Projets de tous les systèmes, dans l'ordre d'affichage.
 *
 * @param {object[]} systems `projects.systems`
 *
 * @returns {object[]} projets à plat
 */
const projectsOf = (systems) => systems.flatMap((system) => system.projects);

/**
 * @brief Empreinte de la structure des données : identifiants des systèmes et des projets.
 *
 * @param {object[]} systems `projects.systems`
 *
 * @returns {string} identique d'une langue à l'autre tant que la structure l'est
 */
const idsOf = (systems) => systems
  .map((system) => [system.id, ...system.projects.map((project) => project.id)].join())
  .join('|');

/**
 * @brief Lie Entrée et Espace d'un nœud à une action (la touche n'y défile pas).
 *
 * @param {Element} node nœud focalisable
 * @param {() => void} action fonction sans argument ni retour
 */
function onActivate(node, action) {
  node.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    action();
  });
}

/**
 * @brief Éléments fixes de la rubrique, construits une fois et insérés d'un bloc.
 *
 * @returns {object} nœuds : heading, lede, layout, plan (svg), head, back, backText, title,
 *   count, introBox, intro, list
 */
function buildParts() {
  const backText = document.createTextNode('');
  const back = el(
    'button',
    { type: 'button', class: 'back' },
    el('span', { 'aria-hidden': 'true' }, ARROW),
    backText,
  );
  const title = el('p', { class: 'ctitle' });
  const count = el('span', { class: 'count' });
  const head = el('div', { class: 'sys-head' }, back, title, count);
  const plan = svg('svg', { class: 'systems', id: 'systems', role: 'group' });
  const layout = el(
    'div',
    { class: 'sys-layout', id: 'sysLayout' },
    el('div', { class: 'sys-plan' }, head, plan),
  );
  const intro = el('p', { class: 'sys-intro' });
  return {
    heading: el('h2', { tabindex: '-1' }),
    lede: el('p', { class: 'lede' }),
    layout,
    plan,
    head,
    back,
    backText,
    title,
    count,
    introBox: el('div', { class: 'intro-c body' }, intro),
    intro,
    list: el('ul', { class: 'plist' }),
  };
}

/**
 * @brief Projet et système d'un identifiant.
 *
 * @param {object} projects données `projects` de la langue
 * @param {string} id identifiant du projet
 *
 * @returns {{ system: object, project: object } | null} null si l'identifiant est absent
 */
function findProject(projects, id) {
  for (const system of projects.systems) {
    const project = system.projects.find((each) => each.id === id);
    if (project) return { system, project };
  }
  return null;
}

/**
 * @brief Fiche (contrat de ui/sheet.js) d'un projet : titre, étiquettes et blocs, sans résumé.
 *
 * @param {object} projects données `projects` de la langue
 * @param {{ system: object, project: object }} found projet et son système
 *
 * @returns {object} view { category, title, tags, blocks, links }
 */
function sheetView(projects, { system, project }) {
  return {
    category: format(projects.systemOf, { name: system.name }),
    title: plainTitle(project.title),
    tags: project.tags ?? [],
    blocks: project.blocks,
    links: project.links ?? [],
  };
}

/**
 * @brief Entrées de la liste : un bouton natif par projet, avec la pastille du système.
 *
 * @param {object[]} systems `projects.systems`
 * @param {(id: string, origin: HTMLElement) => void} open ouverture de la fiche
 *
 * @returns {{ label: Text, item: HTMLElement }[]} texte et `li` de chaque projet
 */
function buildEntries(systems, open) {
  return systems.flatMap((system) => system.projects.map((project) => {
    const dot = el('i', { 'aria-hidden': 'true' });
    dot.style.background = tintOf(system.id).planet[1];
    const label = document.createTextNode(plainTitle(project.title));
    const button = el('button', { type: 'button' }, dot, label);
    button.addEventListener('click', () => open(project.id, button));
    return { label, item: el('li', {}, button) };
  }));
}

/**
 * @brief Recopie les textes d'un dessin neuf sur les nœuds déjà en place (bascule de langue).
 *
 * Les nœuds des soleils et des planètes restent les mêmes : le focus n'est pas perdu.
 *
 * @param {object} built systèmes affichés (résultat de buildSystems)
 * @param {object} fresh mêmes systèmes construits avec les textes de la nouvelle langue
 */
function retext(built, fresh) {
  built.systems.forEach((system, k) => {
    const next = fresh.systems[k].sun;
    system.sun.setAttribute('aria-label', next.getAttribute('aria-label'));
    for (const part of ['.sun-label', '.sun-sub'])
      system.sun.querySelector(part).textContent = next.querySelector(part).textContent;
  });
  built.planets.forEach((planet, k) => {
    const next = fresh.planets[k];
    planet.nodes.g.setAttribute('aria-label', next.nodes.g.getAttribute('aria-label'));
    planet.nodes.name.replaceChildren(...next.nodes.name.childNodes);
    planet.nodes.bg.setAttribute('height', next.labelHeight);
    Object.assign(planet, {
      lines: next.lines,
      labelWidth: next.labelWidth,
      labelHeight: next.labelHeight,
    });
  });
  remeasureLabels(built.planets);
}

/**
 * @brief Remonte une planète au-dessus des autres au survol, la remet à sa place au départ.
 *
 * Pas de remontée au focus : déplacer le nœud focalisé change l'ordre de Tab (la touche
 * sauterait les planètes suivantes).
 *
 * @param {SVGElement} node `g.planet`
 * @param {SVGElement | null} next planète qui le suit dans son système (null : la dernière)
 */
function bindRaise(node, next) {
  node.addEventListener('mouseenter', () => {
    if (document.activeElement === node) return;
    if (node.parentNode.lastElementChild !== node) node.parentNode.append(node);
  });
  node.addEventListener('mouseleave', () => {
    if (document.activeElement !== node) node.parentNode.insertBefore(node, next);
  });
}

/**
 * @brief Centre d'un nœud à l'écran.
 *
 * @param {Element} node nœud affiché
 *
 * @returns {{ x: number, y: number }} centre de sa boîte, en pixels de la fenêtre
 */
function centerOf(node) {
  const box = node.getBoundingClientRect();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * @brief Planète touchée sur la Piscine zoomée sur téléphone : centre le plus proche du
 *   toucher, sinon planète dont l'étiquette est touchée.
 *
 * @param {{ x: number, y: number }} point toucher, en pixels de la fenêtre
 * @param {object[]} planets planètes du système zoomé
 *
 * @returns {object | null} planète, null si rien n'est sous le doigt
 */
function planetUnder(point, planets) {
  const centers = planets.map((planet) => ({ planet, ...centerOf(planet.nodes.body) }));
  const near = nearestPlanet(point, centers, HIT_RADIUS);
  if (near) return near.planet;
  return planets.find((planet) => {
    const box = planet.nodes.bg.getBoundingClientRect();
    return point.x >= box.left && point.x <= box.right
      && point.y >= box.top && point.y <= box.bottom;
  }) ?? null;
}

/**
 * @brief Monte la rubrique Projets : structure construite une fois, systèmes au premier
 *   `update`.
 *
 * La bascule de langue réécrit les textes sur place (nœuds des planètes stables, fiche
 * ouverte par `update`, système zoomé gardé) ; le passage de 55 em reconstruit le plan.
 *
 * @param {HTMLElement} root section.view#projects
 *
 * @returns {(content: object) => void} update(content) : textes d'une langue
 */
export function mount(root) {
  const narrow = matchMedia(BREAKPOINTS.narrow);
  const parts = buildParts();
  const state = {
    projects: null, // données `projects` de la langue affichée
    signature: '', // idsOf des données affichées
    built: null, // résultat de buildSystems
    entries: [], // buildEntries : texte de chaque entrée de la liste
    phone: narrow.matches,
    openId: null, // projet de la fiche ouverte
    view: restView(1, 1),
  };

  /** Fiche du projet `id` ; `origin` reprend le focus à sa fermeture. */
  const open = (id, origin) => {
    if (!state.projects) throw new Error('projects : rubrique pas encore rendue');
    const found = findProject(state.projects, id);
    if (!found) throw new Error(`projects : projet « ${id} » absent des données`);
    state.openId = id;
    initSheet(document).open(sheetView(state.projects, found), origin);
  };

  /** Replace chaque planète selon l'angle et la vue courants. */
  const renderAll = () => {
    const { built, view } = state;
    for (const planet of built.planets)
      renderPlanet(planet, built.systems[planet.systemIndex], view);
  };

  /** Suit la largeur affichée : unité d'écran au repos, rayons de la Piscine sur téléphone. */
  const fit = () => {
    const { built, view } = state;
    const width = parts.plan.clientWidth;
    if (!built || !width) return;
    if (view.zoomedIndex < 0) view.u = built.width / width;
    for (const system of built.systems) rescalePhone(system, built.planets, width);
    renderAll();
  };

  /** Remesure les étiquettes (polices arrivées) puis replace les planètes. */
  const remeasure = () => {
    if (!state.built) return;
    remeasureLabels(state.built.planets);
    renderAll();
  };

  /** En-tête (nom et compte) et introduction du système `index`, dans la langue affichée. */
  const showSystem = (index) => {
    const { projects } = state;
    const system = projects.systems[index];
    parts.title.textContent = format(projects.systemOf, { name: system.name });
    parts.count.textContent = format(projects.count, { n: system.projects.length });
    setRich(parts.intro, system.intro, `projects.systems[${index}].intro`);
  };

  const zoom = createZoom({ parts, state, renderAll, showSystem });

  /** Rend la caméra au système dès que la fiche est fermée (Échap, bouton ou fond). */
  const releaseOnClose = () => {
    const sheet = document.getElementById('sheet');
    if (!sheet)
      throw new Error('projects : élément #sheet absent de la page');
    const watch = new MutationObserver(() => {
      if (initSheet(document).isOpen()) return;
      watch.disconnect();
      zoom.release();
    });
    watch.observe(sheet, {
      attributes: true,
      attributeFilter: ['class'],
    });
  };

  /**
   * @brief Projet lié : la caméra rejoint la planète, puis la fiche s'ouvre.
   *
   * À la fermeture, le focus va à la planète et la caméra revient sur le système zoomé.
   *
   * @param {string} id identifiant d'un projet de `projects.systems`
   * @param {Element} origin nœud qui reçoit le focus à la fermeture de la fiche
   */
  const reveal = async (id, origin) => {
    const planet = state.built?.planets.find((each) => each.id === id);
    if (!planet) {
      open(id, origin); // rubrique pas rendue ou projet inconnu : l'erreur est citée
      return;
    }
    await zoom.toPlanet(planet);
    open(id, origin);
    releaseOnClose();
  };

  /**
   * @brief Branche les systèmes (zoom) et les planètes (fiche, remontée au survol).
   *
   * @param {{ systems: object[], planets: object[] }} built résultat de `buildSystems`
   */
  const wire = ({ systems, planets }) => {
    for (const system of systems) {
      system.g.addEventListener('click', (event) => {
        // Le clic d'entrée est consommé : le plan ne le prend pas pour un toucher
        if (state.view.zoomedIndex < 0) event.preventDefault();
        zoom.enter(system.index);
      });
      onActivate(system.sun, () => zoom.enter(system.index));
    }
    planets.forEach((planet, k) => {
      const { g } = planet.nodes;
      const next = planets[k + 1]?.systemIndex === planet.systemIndex
        ? planets[k + 1].nodes.g
        : null;
      const openIfActive = () => {
        if (g.closest('.sys.on')) open(planet.id, g);
      };
      g.addEventListener('click', openIfActive);
      onActivate(g, openIfActive);
      bindRaise(g, next);
    });
  };

  /** Construit le plan (nœuds neufs, zoom remis au repos) depuis les données affichées. */
  const build = () => {
    const { projects, view } = state;
    state.phone = narrow.matches;
    const built = buildSystems(projects.systems, projects, {
      phone: state.phone,
      width: parts.plan.clientWidth,
    });
    state.built = built;
    parts.plan.replaceChildren(...built.children);
    parts.plan.setAttribute('viewBox', `0 0 ${built.width} ${built.height}`);
    parts.plan.style.aspectRatio = `${built.width} / ${built.height}`;
    parts.plan.style.removeProperty('height');
    parts.plan.classList.remove('zoomed', 'bleed');
    parts.layout.classList.remove('zfocus');
    Object.assign(view, restView(built.width, built.unit));
    wire(built);
    fit();
  };

  /** Refait les textes des systèmes, des planètes et de la liste sans toucher aux nœuds. */
  const translate = () => {
    const { projects, built } = state;
    retext(built, buildSystems(projects.systems, projects, { phone: state.phone }));
    projectsOf(projects.systems).forEach((project, k) => {
      state.entries[k].label.data = plainTitle(project.title);
    });
    renderAll();
  };

  /** Fiche ouverte : réécrite dans la nouvelle langue, fermée si son projet a disparu. */
  const refreshSheet = () => {
    if (!state.openId) return;
    const sheet = initSheet(document);
    if (!sheet.isOpen()) return;
    const found = findProject(state.projects, state.openId);
    if (found) sheet.update(sheetView(state.projects, found));
    else sheet.close();
  };

  /** Avance les planètes au repos (le système zoomé : `zoom.step`), puis les replace. */
  const step = (dt) => {
    const { built, view } = state;
    if (!built) return;
    for (const planet of built.planets) {
      if (planet.systemIndex === view.zoomedIndex) continue;
      if (!planet.nodes.g.matches(HELD)) planet.angle += planet.speed * dt;
    }
    zoom.step(dt);
    renderAll();
  };

  const loop = createLoop(root, step);
  const syncStill = () => root.toggleAttribute('data-still', reduced());

  parts.plan.addEventListener('click', (event) => {
    if (event.defaultPrevented) return;
    const { built, view } = state;
    const index = view.zoomedIndex;
    if (index < 0 || !built.systems[index].phonePis) return;
    if (event.target.closest('.planet')) return;
    const mine = built.planets.filter((planet) => planet.systemIndex === index);
    const hit = planetUnder({ x: event.clientX, y: event.clientY }, mine);
    if (hit) open(hit.id, hit.nodes.g);
  });
  parts.back.addEventListener('click', () => zoom.exit());
  narrow.addEventListener('change', () => {
    if (state.projects) build();
  });
  new ResizeObserver(fit).observe(parts.plan);
  document.fonts?.ready.then(remeasure);
  document.fonts?.addEventListener('loadingdone', remeasure);
  watchReduced(syncStill);
  syncStill();

  root.append(parts.heading, parts.lede, parts.layout, parts.introBox, parts.list);
  revealById = reveal;
  loop.sync();

  return ({ projects }) => {
    const same = state.built && idsOf(projects.systems) === state.signature;
    state.projects = projects;
    parts.heading.textContent = projects.title;
    setRich(parts.lede, projects.lede, 'projects.lede');
    parts.plan.setAttribute('aria-label', projects.title);
    parts.backText.data = projects.back;
    parts.list.setAttribute('aria-label', projects.listLabel);
    if (same) translate();
    else {
      state.signature = idsOf(projects.systems);
      state.entries = buildEntries(projects.systems, open);
      parts.list.replaceChildren(...state.entries.map((entry) => entry.item));
      build();
    }
    if (state.view.zoomedIndex >= 0) showSystem(state.view.zoomedIndex);
    refreshSheet();
  };
}

/**
 * @brief Ouvre la fiche d'un projet par son identifiant (projets liés de Compétences) : la
 *   caméra du plan va d'abord jusqu'à sa planète ; à la fermeture elle revient sur le système.
 *
 * @param {string} id identifiant d'un projet de `projects.systems[].projects[]`
 * @param {HTMLElement | null} origin élément qui reprend le focus à la fermeture de la fiche
 *   (à défaut de pouvoir le recevoir, la planète du projet)
 *
 * @returns {Promise<void>} résolue à l'ouverture de la fiche (aussitôt sous mouvement réduit)
 *
 * @throws {Error} Rubrique pas montée (levée aussitôt) ; pas rendue ou identifiant inconnu
 *   (citée, par la Promise rejetée).
 */
export function openProject(id, origin) {
  if (!revealById) throw new Error('openProject : rubrique Projets non montée');
  return revealById(id, origin);
}
