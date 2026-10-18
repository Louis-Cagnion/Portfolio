/*
Dessins du parcours : dégradés partagés, un astre par escale (centré sur 0,0, indexé par
`body`) et vaisseau. Formes, couleurs et rayons de la maquette ;
aucun texte.
*/
import { svg } from '../core/dom.js';

const GALAXY = 'galaxy';
const GALAXY_SCALE = { vertical: 1.25, horizontal: 1.6 };
const RADIUS = Object.freeze({
  earth: 9,
  moon: 7,
  mars: 9,
  asteroids: 12,
  station: 13,
  saturn: 15,
  nebula: 22,
  galaxy: 30,
});
const ARMS = 3;
const ARM_STARS = 60;
const ARM_REACH = 28; // rayon atteint par le bout d'un bras, en unités du dessin
const SHINE = { cx: '.35', cy: '.3', r: '.8' }; // reflet des planètes, en haut à gauche

/**
 * @brief Rayon dessiné d'un astre : celui de la maquette, la galaxie mise à l'échelle.
 *
 * Un `body` inconnu prend le dessin et le rayon de la galaxie, comme la maquette.
 *
 * @param {string} body identifiant du dessin (`earth`, `moon`... `galaxy`)
 * @param {boolean} vertical parcours vertical (téléphone)
 *
 * @returns {number} rayon en unités du dessin
 */
export function stopRadius(body, vertical) {
  return isGalaxy(body) ? RADIUS.galaxy * galaxyScale(vertical) : RADIUS[body];
}

/**
 * @brief Échelle de la galaxie : plus petite sur le parcours vertical.
 *
 * @param {boolean} vertical parcours vertical (téléphone)
 *
 * @returns {number} facteur appliqué au dessin et au rayon de la galaxie
 */
export function galaxyScale(vertical) {
  return vertical ? GALAXY_SCALE.vertical : GALAXY_SCALE.horizontal;
}

/**
 * @brief Dit si un astre se dessine comme la galaxie (mise à l'échelle selon le parcours).
 *
 * @param {string} body identifiant du dessin
 *
 * @returns {boolean} vrai pour `galaxy` et pour tout identifiant inconnu
 */
export function isGalaxy(body) {
  return body === GALAXY || !hasArt(body);
}

/**
 * @brief Dit si un astre a son propre dessin.
 *
 * @param {string} body identifiant du dessin
 *
 * @returns {boolean} faux pour un identifiant inconnu (dessiné en galaxie)
 */
export function hasArt(body) {
  return Object.hasOwn(RADIUS, body);
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
 * @brief Dégradés et découpe partagés par les dessins du parcours.
 *
 * @returns {SVGDefsElement} defs à placer en tête du svg.traj
 */
export function artDefs() {
  return svg(
    'defs',
    {},
    radial('jEarth', SHINE, [[0, '#b9e6ff'], ['.5', '#2f7fd8'], [1, '#0b2556']]),
    radial('jMoon', SHINE, [[0, '#eef0f5'], ['.55', '#9ba2b4'], [1, '#3f4558']]),
    radial('jMars', SHINE, [[0, '#ffbe95'], ['.55', '#c4502d'], [1, '#47160b']]),
    radial('jSaturn', SHINE, [[0, '#fbe7bd'], ['.55', '#c9964f'], [1, '#4f3515']]),
    radial('jNebA', {}, [[0, '#c86bd8', '.9'], [1, '#c86bd8', 0]]),
    radial('jNebB', {}, [[0, '#4fd1c5', '.78'], [1, '#4fd1c5', 0]]),
    radial('jNebC', {}, [[0, '#e8b45a', '.72'], [1, '#e8b45a', 0]]),
    radial('jCore', {}, [[0, '#fff7e0'], ['.3', '#ffe0a0', '.95'], [1, '#9fb4ff', 0]]),
    radial('jHalo', {}, [[0, '#b9c8ff', '.35'], [1, '#b9c8ff', 0]]),
    svg(
      'linearGradient',
      { id: 'jFlame', x1: 1, x2: 0 },
      svg('stop', { offset: 0, 'stop-color': '#fff3c4' }),
      svg('stop', { offset: '.4', 'stop-color': '#ffb347' }),
      svg('stop', { offset: 1, 'stop-color': '#ff5a1a', 'stop-opacity': 0 }),
    ),
    svg('clipPath', { id: 'jEarthClip' }, svg('circle', { r: RADIUS.earth })),
  );
}

/** Terre : océans, deux continents découpés au disque, fine atmosphère. */
function earth() {
  return [
    svg('circle', { r: RADIUS.earth, fill: 'url(#jEarth)' }),
    svg(
      'g',
      { 'clip-path': 'url(#jEarthClip)', fill: '#4fb07a', opacity: '.85' },
      svg('path', { d: 'M-6-4c2-2 5-1 6 1s-1 4-3 4-4-3-3-5z' }),
      svg('path', { d: 'M2 2c2-1 5 0 5 2s-2 4-4 3-2-4-1-5z' }),
    ),
    svg('circle', { r: 11, fill: 'none', stroke: '#9fd8ff', 'stroke-opacity': '.35' }),
  ];
}

/** Lune : disque gris et deux cratères. */
function moon() {
  return [
    svg('circle', { r: RADIUS.moon, fill: 'url(#jMoon)' }),
    svg('circle', { cx: -2, cy: -1.5, r: 1.5, fill: 'rgba(60,65,82,.55)' }),
    svg('circle', { cx: 2.5, cy: 2, r: 1.1, fill: 'rgba(60,65,82,.5)' }),
  ];
}

/** Mars : disque rouille et trois sillons sombres. */
function mars() {
  return [
    svg('circle', { r: RADIUS.mars, fill: 'url(#jMars)' }),
    svg('path', {
      d: 'M-7 1h5M1-4h5M-2 5h6',
      stroke: 'rgba(80,25,10,.45)',
      'stroke-width': 1.2,
      'stroke-linecap': 'round',
    }),
  ];
}

/** Astéroïdes : cinq blocs de roche anguleux, deux plus clairs, un plus sombre. */
function asteroids() {
  const light = '#a39a8c';
  return [svg(
    'g',
    { fill: '#8c8478' },
    svg('path', { d: 'M-9-3l3-2 3 1 0 3-3 2-3-1z' }),
    svg('path', { d: 'M2-8l2-1 2 1-1 2-2 0z', fill: light }),
    svg('path', { d: 'M4 2l3-1 3 2-1 3-3 0-2-2z' }),
    svg('path', { d: 'M-4 6l2-1 2 1-1 2h-2z', fill: light }),
    svg('path', { d: 'M-1-1l1.5-1 1.5 1-1 1.5h-1.5z', fill: '#6f6960' }),
  )];
}

/** Station : deux panneaux solaires, anneau, cœur et voyant vert (position actuelle). */
function station() {
  const panel = (x) => svg('rect', {
    x,
    y: -3,
    width: 9,
    height: 6,
    fill: '#3d63b8',
    stroke: '#9fc1ff',
    'stroke-width': '.6',
  });
  return [
    panel(-17),
    panel(8),
    svg('path', { d: 'M-8 0h16', stroke: '#c9d3ea', 'stroke-width': 1.4 }),
    svg('ellipse', { rx: 8, ry: 8, fill: 'none', stroke: '#dfe6f5', 'stroke-width': 2 }),
    svg('circle', { r: 3.6, fill: '#c9d3ea' }),
    svg('circle', { r: 1.4, fill: '#8fe3bf' }),
  ];
}

/** Saturne : anneau arrière, planète, puis moitié avant de l'anneau. */
function saturn() {
  const ring = { fill: 'none', stroke: '#e8d3a0', 'stroke-width': 3 };
  return [svg(
    'g',
    { transform: 'rotate(-16)' },
    svg('ellipse', { rx: 26, ry: 7, opacity: '.75', ...ring }),
    svg('circle', { r: RADIUS.saturn, fill: 'url(#jSaturn)' }),
    svg('path', { d: 'M-26 0A26 7 0 0 0 26 0', opacity: '.9', ...ring }),
  )];
}

/** Nébuleuse : trois nappes colorées à la dérive et trois étoiles. */
function nebula() {
  return [
    svg(
      'g',
      { class: 'b-drift' },
      svg('ellipse', { cx: -6, cy: -3, rx: 26, ry: 16, fill: 'url(#jNebA)' }),
      svg('ellipse', {
        cx: 9,
        cy: 5,
        rx: 22,
        ry: 15,
        fill: 'url(#jNebB)',
        transform: 'rotate(25 9 5)',
      }),
      svg('ellipse', { cx: 1, cy: -1, rx: 14, ry: 11, fill: 'url(#jNebC)' }),
    ),
    svg('circle', { cx: -8, cy: -5, r: 1.5, fill: '#fff' }),
    svg('circle', { cx: 8, cy: 4, r: 1.1, fill: '#fff', opacity: '.85' }),
    svg('circle', { cx: 2, cy: 10, r: 0.9, fill: '#fff', opacity: '.7' }),
  ];
}

/** Trois bras spiraux de 60 étoiles, du cœur chaud vers le bord bleu. */
function galaxyArms() {
  const stars = [];
  for (let arm = 0; arm < ARMS; arm++)
    for (let i = 0; i < ARM_STARS; i++) {
      const r = 2 + ARM_REACH * (i / ARM_STARS);
      const angle = i * 0.13 + arm * 2.094 + (i % 3) * 0.05;
      const color = i < 14 ? '#fff0cf' : i < 34 ? '#d6deff' : '#93aaff';
      stars.push(svg('circle', {
        cx: (r * Math.cos(angle)).toFixed(2),
        cy: (r * Math.sin(angle)).toFixed(2),
        r: (1.3 - i / 70).toFixed(2),
        fill: color,
        opacity: (0.95 - i / 75).toFixed(2),
      }));
    }
  return stars;
}

/** Galaxie : halo, cœur lumineux et bras spiraux en rotation, vus de biais. */
function galaxy() {
  return [
    svg('circle', { r: 44, fill: 'url(#jHalo)' }),
    svg(
      'g',
      { transform: 'rotate(-20) scale(1 .5)' },
      svg('circle', { r: 32, fill: 'url(#jCore)', opacity: '.75' }),
      svg('g', { class: 'b-spin' }, ...galaxyArms()),
      svg('circle', { r: 7, fill: 'url(#jCore)' }),
    ),
  ];
}

const DRAWINGS = { earth, moon, mars, asteroids, station, saturn, nebula, galaxy };

/**
 * @brief Dessin d'un astre centré sur 0,0 (galaxie pour un `body` inconnu).
 *
 * @param {string} body identifiant du dessin
 *
 * @returns {SVGElement[]} éléments à placer dans le g.stop de l'escale
 */
export function stopArt(body) {
  return (hasArt(body) ? DRAWINGS[body] : galaxy)();
}

/**
 * @brief Vaisseau : flamme (animée par .thrust) et coque qui flotte.
 *
 * @returns {SVGGElement} g.ship-g, placé par son attribut transform
 */
export function shipArt() {
  return svg(
    'g',
    { class: 'ship-g' },
    svg('path', { class: 'flame', d: 'M-9 0L-24-3.2L-30 0L-24 3.2Z', fill: 'url(#jFlame)' }),
    svg(
      'g',
      { class: 'hull' },
      svg('path', { d: 'M13 0L-5-6L-9-5.5L-7 0L-9 5.5L-5 6Z', fill: '#e6ecff' }),
      svg('path', {
        d: 'M-1-5L-8-11L-11-11L-8-4.2ZM-1 5L-8 11L-11 11L-8 4.2Z',
        fill: '#e8b45a',
      }),
      svg('path', { d: 'M2-2.2L8 0L2 2.2Z', fill: '#8fe3bf' }),
    ),
  );
}
