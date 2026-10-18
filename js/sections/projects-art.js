/*
Dessin des systèmes de la section Projets : teintes, soleils, orbites, planètes, étiquettes.
Valeurs de la maquette validée (docs/design/s6/mockup.js:17-23, 112-130, 136-290). Aucun
écouteur, aucune boucle d'animation, aucun HTML brut : les textes entrent par des nœuds texte.
Le placement vient de projects-layout.js ; le zoom, la boucle et la liste sont ailleurs.

API :
  TINTS, tintOf(id)                     teintes des quatre systèmes ; id inconnu : erreur
  geometry(count, phone)                plan : largeur, hauteur et cellules des systèmes
  phoneUnit(width)                      unités du plan par pixel d'écran, Piscine téléphone
  buildSystems(systems, text, options)  nœuds au repos et références (voir sa docstring)
  placePlanet(planet, system, view)     position, opacité et étiquette d'une planète (pur)
  placeLabel(planet, point, view)       décalage et échelle de l'étiquette (pur)
  renderPlanet(planet, system, view)    applique placePlanet aux nœuds de la planète
  rescalePhone(system, planets, width)  rayons de la Piscine téléphone selon la largeur
  setPlanetActive(node, active)         planète active (tabindex 0) ou inerte (-1, aria-hidden)
  textWidth(text), remeasureLabels(planets)   mesure par canvas, à refaire aux polices

`view` : { u, camera: { cx, w }, zoomedIndex } ; u = unités du plan par pixel d'écran,
camera = centre et largeur du plan visible, zoomedIndex = système zoomé (-1 au repos).
*/
import { svg } from '../core/dom.js';
import { planetSlots, splitTitle, systemRadii } from './projects-layout.js';

const TAU = 2 * Math.PI;
export const TINTS = Object.freeze({
  pro: { sun: ['#fff6da', '#e8b45a'], planet: ['#ffd88f', '#b9822f'] },
  perso: { sun: ['#f3e1ff', '#a46bd8'], planet: ['#e3c3ff', '#7a45b0'] },
  school: { sun: ['#dcfff8', '#4fd1c5'], planet: ['#b8f5ec', '#25857c'] },
  piscine: { sun: ['#e2f0ff', '#4f8cff'], planet: ['#bcd8ff', '#2f62c9'] },
});
const PISCINE_ID = 'piscine';
const TILT = 0.42;
const SYSTEM_ROW = 270;
const DESK_WIDTH = 1100;
const PHONE_WIDTH = 360;
const PISCINE_MAX_RADIUS = 215; // bureau : rayon de l'orbite extérieure de la Piscine
const PHONE_CAMERA = 370; // largeur du plan zoomé sur téléphone, en unités du plan
const SUN_OFFSET_Y = -26; // le soleil est remonté pour laisser la place à son nom
const SUN_GLOW_RADIUS = 44;
const SUN_RADIUS = 16;
const SUN_NAME_Y = 112;
const SUN_COUNT_Y = 132;
const HIT_RADIUS = 22; // toucher de 44 px de la Piscine sur téléphone (valeur de C2)
const HIT_MARGIN = 10; // zone de survol : rayon de la planète plus cette marge
const LABEL_FONT = '500 12.5px "IBM Plex Sans", sans-serif';
const LABEL_PAD = 16;
const LABEL_LINE = 14;
const LABEL_BASE = 8;
const LABEL_TEXT_X = 8;
const LABEL_TEXT_Y = 15;
const LABEL_RADIUS = 4;
const SPLIT_OVER = 20; // téléphone : un titre de plus de 20 caractères se coupe en deux
const GAP = 6; // écart entre planète et étiquette, en pixels d'écran
const EDGE = 4; // marge de l'étiquette zoomée au bord de la vue, en pixels d'écran
const FALLBACK_EM = 0.6; // largeur d'un caractère sans contexte 2D, en fraction de 12,5 px
const SPEED_UNIT = 0.00012 * 180;

let measurer = null; // contexte canvas de mesure, créé une seule fois

/**
 * @brief Teinte d'un système.
 *
 * @param {string} systemId identifiant (`pro`, `perso`, `school` ou `piscine`)
 *
 * @returns {{ sun: string[], planet: string[] }} deux couleurs, du centre vers le bord
 * @throws {Error} Si l'identifiant n'a pas de teinte (il est cité dans le message).
 */
export function tintOf(systemId) {
  if (!Object.hasOwn(TINTS, systemId))
    throw new Error(`projects-art : le système « ${systemId} » n'a pas de teinte`);
  return TINTS[systemId];
}

/**
 * @brief Plan des systèmes : deux par deux au bureau, en colonne sur téléphone.
 *
 * @param {number} count nombre de systèmes
 * @param {boolean} phone mode téléphone
 *
 * @returns {{ width: number, height: number, cells: object[] }} dimensions du plan et une
 *   cellule { x, y, w, h } par système
 */
export function geometry(count, phone) {
  if (phone) {
    const cells = Array.from({ length: count }, (_, k) => ({
      x: 0,
      y: SYSTEM_ROW * k,
      w: PHONE_WIDTH,
      h: SYSTEM_ROW,
    }));
    return { width: PHONE_WIDTH, height: SYSTEM_ROW * count, cells };
  }
  const half = DESK_WIDTH / 2;
  const cells = Array.from({ length: count }, (_, k) => ({
    x: half * (k % 2),
    y: SYSTEM_ROW * Math.floor(k / 2),
    w: half,
    h: SYSTEM_ROW,
  }));
  return { width: DESK_WIDTH, height: SYSTEM_ROW * Math.ceil(count / 2), cells };
}

/**
 * @brief Unités du plan par pixel d'écran quand la caméra est à la largeur du zoom téléphone.
 *
 * @param {number} width largeur affichée du SVG en pixels (0 : largeur du plan téléphone)
 *
 * @returns {number} facteur appliqué aux rayons en pixels de la Piscine sur téléphone
 */
export function phoneUnit(width) {
  return PHONE_CAMERA / (width || PHONE_WIDTH);
}

/**
 * @brief Contexte 2D de mesure, créé au premier appel seulement.
 *
 * @returns {CanvasRenderingContext2D | null} null si le navigateur refuse le contexte
 */
function measuringContext() {
  measurer ??= document.createElement('canvas').getContext('2d');
  return measurer;
}

/**
 * @brief Largeur d'un texte d'étiquette, par canvas : valable section masquée.
 *
 * @param {string} text texte d'une ligne
 *
 * @returns {number} largeur en pixels d'écran, dans la police des étiquettes
 */
export function textWidth(text) {
  const context = measuringContext();
  if (!context) return text.length * FALLBACK_EM * 12.5;
  context.font = LABEL_FONT;
  return context.measureText(text).width;
}

/**
 * @brief Dimensions de la pastille d'une étiquette.
 *
 * @param {string[]} lines lignes du titre
 *
 * @returns {{ width: number, height: number }} en pixels d'écran
 */
function labelSize(lines) {
  return {
    width: Math.max(...lines.map(textWidth)) + LABEL_PAD,
    height: LABEL_BASE + LABEL_LINE * lines.length,
  };
}

/**
 * @brief Remesure les étiquettes, à rappeler quand les polices sont prêtes.
 *
 * Met à jour `labelWidth` de chaque planète et la largeur de son `.pl-bg` ; l'appelant
 * replace ensuite les planètes avec `renderPlanet`.
 *
 * @param {object[]} planets planètes renvoyées par `buildSystems`
 */
export function remeasureLabels(planets) {
  for (const planet of planets) {
    planet.labelWidth = labelSize(planet.lines).width;
    planet.nodes.bg.setAttribute('width', planet.labelWidth);
  }
}

/**
 * @brief Titre sans balise, tel que lu par les lecteurs d'écran et affiché dans le dessin.
 *
 * @param {string} title titre de data/*.json
 *
 * @returns {string} titre brut
 */
const plainTitle = (title) => title.replace(/<[^>]+>/g, '');

/**
 * @brief Vérifie les systèmes avant toute construction.
 *
 * @param {object[]} systems systèmes de `projects.systems`
 *
 * @throws {Error} Liste vide, système sans projets, `blocks` absent ou non tableau, ou
 *   système sans teinte ; le message nomme l'élément fautif.
 */
function validate(systems) {
  if (!Array.isArray(systems) || systems.length === 0)
    throw new Error('buildSystems : la liste des systèmes est vide');
  for (const system of systems) {
    tintOf(system.id);
    if (!Array.isArray(system.projects) || system.projects.length === 0)
      throw new Error(`buildSystems : le système « ${system.id} » n'a aucun projet`);
    for (const project of system.projects) {
      if (Array.isArray(project.blocks)) continue;
      throw new Error(
        `buildSystems : le projet « ${project.id} » du système « ${system.id} » `
        + 'n\'a pas de tableau blocks',
      );
    }
  }
}

/**
 * @brief Dégradés d'un système : lueur du soleil et reflet des planètes.
 *
 * @param {string} id identifiant du système
 *
 * @returns {SVGElement[]} deux `radialGradient` (`sun-<id>` et `planet-<id>`)
 */
function gradients(id) {
  const { sun, planet } = tintOf(id);
  const stops = (colors) => colors.map(([offset, color, opacity]) => svg('stop', {
    offset,
    'stop-color': color,
    'stop-opacity': opacity,
  }));
  return [
    svg('radialGradient', { id: `sun-${id}` }, ...stops([
      [0, sun[0]], [0.55, sun[1]], [1, sun[1], 0],
    ])),
    svg('radialGradient', { id: `planet-${id}`, cx: 0.35, cy: 0.3, r: 0.8 }, ...stops([
      [0, planet[0]], [1, planet[1]],
    ])),
  ];
}

/**
 * @brief Soleil d'un système : lueur, disque, nom et compte (texte seul, aucun écouteur).
 *
 * @param {object} system système (`id`, `name`, `projects`)
 * @param {{ x: number, y: number }} center centre du système
 * @param {{ approach: string, count: string }} text modèles `projects.approach` et
 *   `projects.count`, avec « {name} » et « {n} »
 *
 * @returns {SVGElement} `g.sun-btn[role=button][tabindex=0][aria-label]`
 */
function buildSun(system, center, text) {
  const { x, y } = center;
  const count = text.count.replace('{n}', system.projects.length);
  return svg(
    'g',
    {
      class: 'sun-btn',
      tabindex: 0,
      role: 'button',
      'aria-label': text.approach.replace('{name}', system.name),
    },
    svg('circle', {
      class: 'sun-glow', cx: x, cy: y, r: SUN_GLOW_RADIUS, fill: `url(#sun-${system.id})`,
    }),
    svg('circle', { cx: x, cy: y, r: SUN_RADIUS, fill: tintOf(system.id).sun[0] }),
    svg('text', { class: 'sun-label', x, y: y + SUN_NAME_Y }, system.name),
    svg('text', { class: 'sun-sub', x, y: y + SUN_COUNT_Y }, count),
  );
}

/**
 * @brief Rend une planète active (focalisable, annoncée) ou inerte (hors tabulation, masquée).
 *
 * Seuls `tabindex` et `aria-hidden` changent : `role` et `aria-label` restent.
 *
 * @param {Element} node `g.planet`
 * @param {boolean} active vrai si le système de la planète est zoomé
 */
export function setPlanetActive(node, active) {
  node.setAttribute('tabindex', active ? '0' : '-1');
  if (active) node.removeAttribute('aria-hidden');
  else node.setAttribute('aria-hidden', 'true');
}

/**
 * @brief Nœuds d'une planète et de son étiquette (titre en texte, jamais en HTML).
 *
 * @param {string} systemId identifiant du système (teinte)
 * @param {string} title titre brut
 * @param {{ size: number, lines: string[], phonePis: boolean }} shape rayon, lignes de
 *   l'étiquette et Piscine sur téléphone (classe `nearest`)
 * @param {{ width: number, height: number }} box dimensions de l'étiquette
 *
 * @returns {object} nœuds : `g`, `hit`, `body`, `label`, `bg`, `name`
 */
function buildPlanetNodes(systemId, title, shape, box) {
  const { size, lines, phonePis } = shape;
  const hit = svg('circle', {
    class: 'pl-hit',
    r: size + HIT_MARGIN,
  });
  const body = svg('circle', { class: 'pl-body', r: size, fill: `url(#planet-${systemId})` });
  const bg = svg('rect', {
    class: 'pl-bg', x: 0, y: 0, width: box.width, height: box.height, rx: LABEL_RADIUS,
  });
  const name = svg('text', { class: 'pl-name', x: LABEL_TEXT_X, y: LABEL_TEXT_Y });
  lines.forEach((line, k) => name.append(
    svg('tspan', { x: LABEL_TEXT_X, dy: k ? LABEL_LINE : 0 }, line),
  ));
  const label = svg('g', { class: 'pl-label' }, bg, name);
  const g = svg(
    'g',
    {
      class: phonePis ? 'planet nearest' : 'planet',
      role: 'button',
      'aria-label': title,
    },
    hit,
    body,
    label,
  );
  setPlanetActive(g, false);
  return { g, hit, body, label, bg, name };
}

/**
 * @brief Planète d'un projet : nœuds, taille, orbite, angle, vitesse et mesure d'étiquette.
 *
 * @param {object} system système construit (`index`, `phonePis`)
 * @param {object} project projet (`id`, `title`)
 * @param {object} slot emplacement de `planetSlots` (rayon déjà converti en unités du plan)
 * @param {boolean} phone mode téléphone
 *
 * @returns {object} planète : `id`, `nodes`, `size`, `radius`, `angle`, `speed`, `ring`,
 *   `systemIndex`, `lines`, `labelWidth`, `labelHeight`, `below`
 */
function buildPlanet(system, project, slot, phone) {
  const title = plainTitle(project.title);
  const lines = phone && title.length > SPLIT_OVER ? splitTitle(title) : [title];
  const box = labelSize(lines);
  const shape = { size: slot.size, lines, phonePis: system.phonePis };
  const nodes = buildPlanetNodes(system.id, title, shape, box);
  return {
    id: project.id,
    nodes,
    size: slot.size,
    radius: slot.radius,
    angle: slot.angle,
    speed: SPEED_UNIT / slot.radius,
    ring: slot.ring,
    systemIndex: system.index,
    lines,
    labelWidth: box.width,
    labelHeight: box.height,
    below: system.phonePis,
  };
}

/**
 * @brief Écart d'angle de chaque planète à la première, pour l'espacement régulier du zoom.
 *
 * @param {object[]} slots emplacements du système, dans l'ordre des projets
 * @param {boolean} isPiscine la Piscine garde l'écart de ses cases, les autres un pas égal
 *
 * @returns {number[]} `rel` de chaque planète
 */
function relativeAngles(slots, isPiscine) {
  return slots.map((slot, j) => (isPiscine
    ? slot.angle - slots[0].angle
    : (j * TAU) / slots.length));
}

/**
 * @brief Système au repos : cellule, orbites, soleil et planètes.
 *
 * @param {object} data système de `projects.systems`
 * @param {number} index indice du système (ajouté aux angles, comme la maquette)
 * @param {object} cell cellule { x, y, w, h } du plan
 * @param {{ text: object, phone: boolean, width: number }} context textes, mode, largeur
 *
 * @returns {{ system: object, planets: object[] }} références du système et de ses planètes
 */
function buildSystem(data, index, cell, context) {
  const { text, phone, width } = context;
  const isPiscine = data.id === PISCINE_ID;
  const phonePis = isPiscine && phone;
  const scale = phonePis ? phoneUnit(width) : 1;
  const center = { x: cell.x + cell.w / 2, y: cell.y + SYSTEM_ROW / 2 + SUN_OFFSET_Y };
  const radii = systemRadii(data.id, { phone, maxRadius: PISCINE_MAX_RADIUS })
    .map((radius) => radius * scale);
  const slots = planetSlots(data, {
    phone,
    systemIndex: index,
    maxRadius: PISCINE_MAX_RADIUS,
  }).map((slot) => ({ ...slot, radius: slot.radius * scale }));
  const orbits = radii.map((radius) => svg('ellipse', {
    class: 'orbit', cx: center.x, cy: center.y, rx: radius, ry: radius * TILT,
  }));
  const hit = svg('rect', {
    class: 'sys-hit', x: cell.x, y: cell.y, width: cell.w, height: cell.h,
  });
  const system = {
    id: data.id,
    index,
    cx: center.x,
    cy: center.y,
    tilt: TILT,
    orbits,
    maxRadius: Math.max(...radii),
    phonePis,
    hit,
    sun: buildSun(data, center, text),
  };
  const rel = relativeAngles(slots, isPiscine);
  const planets = data.projects.map((project, j) => ({
    ...buildPlanet(system, project, slots[j], phone),
    rel: rel[j],
  }));
  system.g = svg('g', { class: 'sys' }, hit, ...orbits, system.sun,
    ...planets.map((planet) => planet.nodes.g));
  return { system, planets };
}

/**
 * @brief Nœuds et références des systèmes au repos, au bureau ou sur téléphone.
 *
 * Le contenu vient des données ; `text` porte `projects.approach` (nom accessible du soleil,
 * « {name} ») et `projects.count` (« {n} »). L'appelant pose `children` dans le SVG, règle
 * son `viewBox` sur `0 0 width height` et appelle `remeasureLabels` quand les polices sont
 * prêtes. La Piscine hors de 20 projets lève l'erreur de `planetSlots`.
 *
 * @param {object[]} systems `projects.systems`, dans l'ordre d'affichage
 * @param {{ approach: string, count: string }} text modèles de textes
 * @param {{ phone?: boolean, width?: number }} [options] mode téléphone et largeur affichée
 *   du SVG en pixels (0 si inconnue)
 *
 * @returns {{ children: SVGElement[], width: number, height: number, unit: number,
 *   systems: object[], planets: object[] }} nœuds à poser, dimensions du plan, unité d'écran
 *   au repos, systèmes (`id`, `index`, `g`, `cx`, `cy`, `tilt`, `orbits`, `maxRadius`,
 *   `phonePis`) et planètes à plat (`id`, `nodes`, `size`, `radius`, `angle`, `speed`, `rel`,
 *   `ring`, `systemIndex`, `lines`, `labelWidth`, `labelHeight`, `below`)
 * @throws {Error} Entrée invalide : le message nomme le système ou le projet fautif.
 */
export function buildSystems(systems, text, { phone = false, width = 0 } = {}) {
  validate(systems);
  const plan = geometry(systems.length, phone);
  const unit = plan.width / (width || plan.width);
  const context = { text, phone, width };
  const built = systems.map((data, i) => buildSystem(data, i, plan.cells[i], context));
  const result = {
    children: [
      svg('defs', {}, ...systems.flatMap((data) => gradients(data.id))),
      ...built.map(({ system }) => system.g),
    ],
    width: plan.width,
    height: plan.height,
    unit,
    systems: built.map(({ system }) => system),
    planets: built.flatMap(({ planets }) => planets),
  };
  const view = { u: unit, camera: { cx: plan.width / 2, w: plan.width }, zoomedIndex: -1 };
  for (const planet of result.planets)
    renderPlanet(planet, result.systems[planet.systemIndex], view);
  return result;
}

/**
 * @brief Décalage et échelle de l'étiquette d'une planète.
 *
 * Au repos, à droite de la planète. Système zoomé : sous la planète si `below` (Piscine
 * téléphone), sinon écartée du soleil selon l'angle ; toujours dans la vue de la caméra.
 *
 * @param {object} planet planète (`size`, `angle`, `below`, `systemIndex`, mesures)
 * @param {{ x: number, y: number }} point position de la planète dans le plan
 * @param {{ u: number, camera: { cx: number, w: number }, zoomedIndex: number }} view vue
 *
 * @returns {{ dx: number, dy: number, scale: number }} translation depuis la planète, puis
 *   échelle `u` pour garder la taille d'écran
 */
export function placeLabel(planet, point, view) {
  const { u, camera, zoomedIndex } = view;
  const { x, y } = point;
  const labelWidth = planet.labelWidth * u;
  const labelHeight = planet.labelHeight * u;
  const offset = planet.size + GAP * u;
  let boxX = x + offset;
  let boxY = y - labelHeight / 2;
  const left = camera.cx - camera.w / 2 + EDGE * u;
  const right = camera.cx + camera.w / 2 - EDGE * u;
  if (zoomedIndex === planet.systemIndex) {
    if (planet.below) {
      boxX = Math.max(left, Math.min(right - labelWidth, x - labelWidth / 2));
      boxY = y + planet.size + EDGE * u;
    } else {
      const cos = Math.cos(planet.angle);
      const sin = Math.sin(planet.angle);
      boxX = x + offset * cos - (labelWidth * (1 - cos)) / 2;
      boxY = y + offset * sin - (labelHeight * (1 - sin)) / 2;
      const clamped = Math.max(left, Math.min(right - labelWidth, boxX));
      if (Math.abs(clamped - boxX) > 1 && Math.abs(sin) < 0.6)
        boxY = sin >= 0 ? y + offset : y - offset - labelHeight;
      boxX = clamped;
    }
  }
  return { dx: boxX - x, dy: boxY - y, scale: u };
}

/**
 * @brief Position d'une planète sur son orbite inclinée, avec son étiquette.
 *
 * @param {object} planet planète (`radius`, `angle`, `below`, mesures)
 * @param {{ cx: number, cy: number, tilt: number }} system système de la planète
 * @param {{ u: number, camera: { cx: number, w: number }, zoomedIndex: number }} view vue
 *
 * @returns {{ x: number, y: number, opacity: number, hitRadius: number | null,
 *   label: object }} position, opacité (0,75 derrière le soleil), rayon de la zone de
 *   toucher (Piscine téléphone, sinon null) et résultat de `placeLabel`
 */
export function placePlanet(planet, system, view) {
  const x = system.cx + planet.radius * Math.cos(planet.angle);
  const y = system.cy + planet.radius * system.tilt * Math.sin(planet.angle);
  return {
    x,
    y,
    opacity: Math.sin(planet.angle) < 0 ? 0.75 : 1,
    hitRadius: planet.below ? HIT_RADIUS * view.u : null,
    label: placeLabel(planet, { x, y }, view),
  };
}

/**
 * @brief Pose une planète : translation, opacité, zone de toucher et étiquette.
 *
 * @param {object} planet planète renvoyée par `buildSystems`
 * @param {object} system système de la planète
 * @param {{ u: number, camera: { cx: number, w: number }, zoomedIndex: number }} view vue
 *
 * @returns {object} le résultat de `placePlanet`
 */
export function renderPlanet(planet, system, view) {
  const placed = placePlanet(planet, system, view);
  const { nodes } = planet;
  const { dx, dy, scale } = placed.label;
  const position = `translate(${placed.x.toFixed(1)} ${placed.y.toFixed(1)})`;
  nodes.g.setAttribute('transform', position);
  nodes.g.style.opacity = placed.opacity;
  if (placed.hitRadius !== null) nodes.hit.setAttribute('r', placed.hitRadius.toFixed(2));
  nodes.label.setAttribute(
    'transform',
    `translate(${dx.toFixed(1)} ${dy.toFixed(1)}) scale(${scale.toFixed(4)})`,
  );
  return placed;
}

/**
 * @brief Rayons de la Piscine sur téléphone : fixes en pixels, donc suivent la largeur.
 *
 * Sans effet sur les autres systèmes. L'appelant replace ensuite les planètes.
 *
 * @param {object} system système construit
 * @param {object[]} planets toutes les planètes de `buildSystems`
 * @param {number} width largeur affichée du SVG en pixels
 */
export function rescalePhone(system, planets, width) {
  if (!system.phonePis) return;
  const k = phoneUnit(width);
  const rings = systemRadii(system.id, { phone: true }).map((radius) => radius * k);
  system.orbits.forEach((orbit, n) => {
    orbit.setAttribute('rx', rings[n].toFixed(2));
    orbit.setAttribute('ry', (rings[n] * system.tilt).toFixed(2));
  });
  for (const planet of planets) {
    if (planet.systemIndex === system.index) planet.radius = rings[planet.ring];
  }
  system.maxRadius = Math.max(...rings);
}
