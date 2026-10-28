/*
Dessins de la rubrique Compétences : un astre par niveau (0 inconnu = magma, 1 débutant =
géante jaune, 2 intermédiaire = nébuleuse, 3 avancé = galaxie), centré sur 0,0 et dimensionné
en pixels d'écran, son icône et le groupe SVG d'une constellation. Formes, couleurs et
rayons de la maquette.
Le placement vient de skills-layout.js ; aucun écouteur, aucun texte, aucun état ici.
Le nom d'une étoile est un `text.name` : une ligne, ou deux `tspan` quand l'étoile porte
`lines` (`nameLines` des données) ; `setName` et `moveLabel` sont les seuls à le toucher.
Sur deux lignes, la seconde reste à la place d'une ligne unique et la première est au-dessus.
En vue d'ensemble, ce bloc est décalé de `NAME_SHIFT` px vers la gauche (choix de Louis du
18/10/2026), pour ne pas toucher le nom voisin ; il se résorbe avec le déploiement.
*/
import { svg } from '../core/dom.js';
import { LEVELS } from '../core/levels.js';
import { bodyRadius } from './skills-layout.js';

const HIT_RADIUS = 18;
const LABEL_GAP = 9;
const GALAXY_LABEL_SHARE = 0.6; // la galaxie, aplatie, remonte moins son nom
export const NAME_SHIFT = 24; // px d'écran : décalage à gauche d'un nom à deux lignes
const LINE_EM = 1.15; // interligne d'un nom sur deux lignes, en em
const ARMS = 2;
const ARM_STARS = 46;
const GALAXY_ARMS_DATA = galaxyArmsData();
const LAVA_VEINS =
  'M-11-2L-7-1L-4-4L0-3L3-6L5-11M-4-4L-5-8L-3-11M-7-1L-6 3L-10 6M-6 3L-2 4L1 1L0-3' +
  'M1 1L5 2L8-1L11-2M5 2L6 6L9 8M-2 4L-1 8L2 11M-1 8L-5 10M3-6L7-6L10-8M8-1L7-4M-10 6L-8 9';

/** Points des bras : deux spirales logarithmiques, calculées une seule fois. */
function galaxyArmsData() {
  const dots = [];
  for (let arm = 0; arm < ARMS; arm++)
    for (let i = 0; i < ARM_STARS; i++) {
      const radius = 3 + 26 * (i / ARM_STARS);
      const angle = i * 0.16 + arm * Math.PI;
      dots.push({
        cx: (radius * Math.cos(angle)).toFixed(2),
        cy: (radius * Math.sin(angle)).toFixed(2),
        r: (1.5 - i / ARM_STARS).toFixed(2),
        fill: i < 12 ? '#ffe9c2' : i < 30 ? '#cfd9ff' : '#8fa8ff',
        opacity: (0.95 - i / 60).toFixed(2),
      });
    }
  return dots;
}

/** Dégradé radial : `stops` = [décalage, couleur, opacité facultative]. */
function radial(id, attrs, stops) {
  return svg(
    'radialGradient',
    { id, ...attrs },
    ...stops.map(([offset, color, opacity]) => svg('stop', {
      offset,
      'stop-color': color,
      'stop-opacity': opacity,
    })),
  );
}

/**
 * Dégradés et découpe partagés par les dessins de la rubrique.
 *
 * @returns {SVGDefsElement} defs à placer en tête du svg des constellations
 */
export function skillsDefs() {
  const magma = { cx: '.38', cy: '.32', r: '.8' };
  const shade = { cx: '.35', cy: '.3', r: '.75' };
  return svg(
    'defs',
    {},
    radial('skGiant', {}, [
      [0, '#fffbe6'],
      ['.5', '#ffe17a'],
      ['.85', '#f2a93b'],
      [1, '#f2a93b', 0],
    ]),
    radial('skGiantGlow', {}, [[0, '#ffd75a', '.5'], [1, '#ffd75a', 0]]),
    radial('skNebA', {}, [[0, '#c86bd8', '.9'], [1, '#c86bd8', 0]]),
    radial('skNebB', {}, [[0, '#4fd1c5', '.78'], [1, '#4fd1c5', 0]]),
    radial('skNebC', {}, [[0, '#e8b45a', '.72'], [1, '#e8b45a', 0]]),
    radial('skCore', {}, [[0, '#fff7e0'], ['.35', '#ffe0a0', '.9'], [1, '#9fb4ff', 0]]),
    radial('skMagmaRock', magma, [[0, '#5c3426'], ['.55', '#2b1713'], [1, '#120909']]),
    radial('skMagmaGlow', {}, [['.45', '#ff5a1a', '.45'], [1, '#ff5a1a', 0]]),
    radial('skMagmaShade', shade, [
      [0, '#ffd0a0', '.16'],
      ['.6', '#000', 0],
      [1, '#000', '.5'],
    ]),
    svg('clipPath', { id: 'skMagmaClip' }, svg('circle', { r: 10.6 })),
  );
}

/** Galaxie : cœur lumineux, bras en rotation et noyau, vus de biais. */
function galaxy() {
  return [svg(
    'g',
    { transform: 'rotate(-24) scale(1 .55)' },
    svg('circle', { r: 30, fill: 'url(#skCore)', opacity: '.8' }),
    svg('g', { class: 'b-spin' }, ...GALAXY_ARMS_DATA.map((dot) => svg('circle', dot))),
    svg('circle', { r: 6, fill: 'url(#skCore)' }),
  )];
}

/** Nébuleuse : trois nappes à la dérive et quatre étoiles. */
function nebula() {
  const star = (cx, cy, r, opacity) => svg('circle', { cx, cy, r, fill: '#fff', opacity });
  return [
    svg(
      'g',
      { class: 'b-drift' },
      svg('ellipse', { cx: -5, cy: -3, rx: 20, ry: 13, fill: 'url(#skNebA)' }),
      svg('ellipse', {
        cx: 7,
        cy: 4,
        rx: 17,
        ry: 12,
        fill: 'url(#skNebB)',
        transform: 'rotate(25 7 4)',
      }),
      svg('ellipse', { cx: 1, cy: -1, rx: 11, ry: 9, fill: 'url(#skNebC)' }),
    ),
    star(-6, -4, 1.3),
    star(6, 3, 1, '.85'),
    star(1, 8, 0.8, '.7'),
    star(10, -6, 0.7, '.6'),
  ];
}

/** Géante jaune : halo qui respire, disque et deux taches. */
function giant() {
  return [
    svg('circle', { class: 'b-glow', r: 22, fill: 'url(#skGiantGlow)' }),
    svg('circle', { r: 11, fill: 'url(#skGiant)' }),
    svg('circle', { cx: -3, cy: 2, r: 2, fill: 'rgba(200,120,30,.22)' }),
    svg('circle', { cx: 3.5, cy: -2.5, r: 1.4, fill: 'rgba(200,120,30,.18)' }),
  ];
}

/** Étoile en fusion : roche, veines de lave découpées au disque, cratères, ombre. */
function magma() {
  const vein = { d: LAVA_VEINS, stroke: '#ff5a1a', 'stroke-width': 2, opacity: '.55' };
  return [
    svg('circle', { r: 20, fill: 'url(#skMagmaGlow)' }),
    svg('circle', { r: 11, fill: 'url(#skMagmaRock)' }),
    svg(
      'g',
      {
        class: 'b-lava',
        'clip-path': 'url(#skMagmaClip)',
        fill: 'none',
        'stroke-linejoin': 'round',
        'stroke-linecap': 'round',
      },
      svg('path', vein),
      svg('path', { d: LAVA_VEINS, stroke: '#ffd36a', 'stroke-width': '.75' }),
    ),
    svg('circle', { cx: 5, cy: -3, r: 1.4, fill: 'rgba(0,0,0,.35)' }),
    svg('circle', { cx: -5, cy: 5, r: 1.1, fill: 'rgba(0,0,0,.3)' }),
    svg('circle', { r: 11, fill: 'url(#skMagmaShade)' }),
  ];
}

const DRAWINGS = [magma, giant, nebula, galaxy];

/**
 * Dessin d'un niveau, centré sur 0,0 (magma pour un indice inconnu).
 *
 * @param {number} level 0 inconnu, 1 débutant, 2 intermédiaire, 3 avancé
 *
 * @returns {SVGElement[]} éléments à placer dans un g.body-in ou un svg.ico
 */
export function bodyArt(level) {
  return (DRAWINGS[level] ?? magma)();
}

/**
 * Icône d'un niveau pour `.lvl` et la légende.
 *
 * @param {number} level 0 à 3
 *
 * @returns {SVGSVGElement} svg.ico décoratif (aria-hidden)
 */
export function bodyIcon(level) {
  return svg(
    'svg',
    { class: 'ico', viewBox: '-36 -36 72 72', 'aria-hidden': 'true' },
    ...bodyArt(level),
  );
}

/**
 * Décalage vertical du nom d'une étoile au-dessus de son centre.
 *
 * @param {number} level 0 à 3
 * @param {number} scale échelle du corps (`bodyScale` de skills-layout.js)
 * @param {number} [unit] unité d'écran de la scène (`--u`)
 *
 * @returns {number} distance en unités de la scène, à retrancher de `cy`
 */
export function labelOffset(level, scale, unit = 1) {
  const share = level === 3 ? GALAXY_LABEL_SHARE : 1;
  return (bodyRadius(LEVELS[level] ?? LEVELS[0]) * scale * share + LABEL_GAP) * unit;
}

/**
 * Écrit le nom d'une étoile : une ligne, ou deux `tspan` si `lines` est donné.
 *
 * La seconde ligne est sur la base du `text`, la première une interligne au-dessus ; chaque
 * `tspan` porte le `x` du `text` (centré par `text-anchor`).
 *
 * @param {SVGTextElement} label nom de l'étoile (`text.name`)
 * @param {string} name nom complet
 * @param {string[]} [lines] deux lignes dont la jointure par une espace donne `name`
 */
export function setName(label, name, lines) {
  if (!lines) {
    label.textContent = name;
    return;
  }
  const x = label.getAttribute('x');
  label.replaceChildren(...lines.map((line, row) => svg(
    'tspan',
    { x, dy: `${row ? LINE_EM : -LINE_EM}em` },
    line,
  )));
}

/**
 * Interlignes que le nom occupe au-dessus de sa base : 0 sur une ligne, 1 sur deux.
 *
 * @param {SVGTextElement} label nom de l'étoile (`text.name`)
 *
 * @returns {number} interlignes entre la base du `text` et le haut de la première ligne
 */
export function nameRise(label) {
  return Math.max(0, label.childElementCount - 1);
}

/**
 * Déplace le nom d'une étoile : `y` est la base du `text` (celle d'une ligne unique).
 *
 * @param {SVGTextElement} label nom de l'étoile (`text.name`)
 * @param {number | undefined} x abscisse du centre ; absente, `x` reste inchangé
 * @param {number} y ordonnée de la base du `text`
 */
export function moveLabel(label, x, y) {
  label.setAttribute('y', y);
  if (x === undefined) return;
  label.setAttribute('x', x);
  for (const line of label.children) line.setAttribute('x', x);
}

/** Une étoile : corps, zone cliquable et nom, placés au point donné. */
function starNode(star, scale) {
  const level = LEVELS[star.level] ? star.level : 0;
  const body = svg(
    'g',
    { class: 'body', transform: `translate(${star.x} ${star.y})` },
    svg('g', { class: 'body-in' }, ...bodyArt(level)),
  );
  const hit = svg('circle', { cx: star.x, cy: star.y, r: HIT_RADIUS, fill: 'transparent' });
  const label = svg('text', {
    class: 'name',
    'text-anchor': 'middle',
    x: star.x,
    y: star.y - labelOffset(level, scale),
  });
  setName(label, star.name, star.lines);
  if (star.lines) moveLabel(label, star.x - NAME_SHIFT, label.getAttribute('y'));
  const element = svg('g', { class: `st-g lv${level}` }, body, hit, label);
  return { element, body, hit, label };
}

/**
 * Groupe SVG d'une constellation : cellule, liens, étoiles puis nom court.
 *
 * @param {object} spec
 * @param {string} spec.label nom accessible du groupe (aria-label)
 * @param {string} spec.title nom court affiché sous la constellation
 * @param {{ x: number, y: number, width: number, height: number }} spec.cell cellule
 * @param {{ x: number, y: number }} spec.titleAt position du nom court
 * @param {{ x: number, y: number, level: number, name: string, lines?: string[] }[]}
 *   spec.stars étoiles placées par skills-layout.js, dans l'ordre du parcours
 * @param {number} [spec.scale] échelle de repos du corps, pour la place du nom
 *
 * @returns {{ group: SVGGElement, links: SVGLineElement[], stars: object[] }} le groupe,
 *   ses n-1 liens et, par étoile, `{ element, body, hit, label }` pour C4
 */
export function constellationGroup({ label, title, cell, titleAt, stars, scale = 1 }) {
  const nodes = stars.map((star) => starNode(star, scale));
  const links = stars.slice(1).map((end, k) => svg('line', {
    class: 'link',
    x1: stars[k].x,
    y1: stars[k].y,
    x2: end.x,
    y2: end.y,
  }));
  const group = svg(
    'g',
    { class: 'group', tabindex: 0, role: 'button', 'aria-label': label },
    svg('rect', { class: 'cell', ...cell }),
    ...links,
    ...nodes.map((node) => node.element),
    svg('text', { class: 'cname', x: titleAt.x, y: titleAt.y }, title),
  );
  return { group, links, stars: nodes };
}
