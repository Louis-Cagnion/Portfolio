/*
Contact : dessin du disque d'or (SVG), sans comportement. Structure de la maquette ;
styles dans
css/contact.css. contact.js câble les événements et traduit.
*/
import { svg } from '../core/dom.js';

export const FULL_BOX = [-250, -250, 500, 500]; // disque entier
export const HALF_BOX = [-125, -250, 250, 250]; // moitié haute

const TRACK_RADII = [118, 150, 182, 214]; // sillons allumables
const RING_EDGES = [100, 134, 166, 198, 240]; // bords des anneaux de toucher
const GROOVE_FIRST = 100; // premier sillon décoratif
const GROOVE_LAST = 236;
const GROOVE_STEP = 2.2;
const GROOVE_BASE = 0.16; // opacité de la maquette, relative à --groove
const GROOVE_SWING = 0.12;
const GROOVE_WAVE = 0.7;
const GROOVE_ALPHA = 0.35; // opacité propre de --groove, que stroke-opacity vient moduler
const NAME_ARC_GAP = 16; // l'arc du nom passe 16 unités au-delà du sillon
const CORE_ARC = 104; // rayon de l'arc de l'invite du cœur, entre l'étiquette et le sillon 1
const LABEL_ARC = 62; // rayon de l'arc de l'adresse gravée sur l'étiquette
const SEPARATOR = '  ✶  ';

/**
 * @brief Chemin d'un cercle complet de rayon `r` qui démarre à gauche et tourne par le haut.
 *
 * @param {number} r rayon
 *
 * @returns {string} attribut d de path
 */
const circlePath = (r) => `M${-r} 0A${r} ${r} 0 1 1 ${r} 0A${r} ${r} 0 1 1 ${-r} 0`;

/**
 * @brief Dégradé radial doré, dégradé de reflet et arc de l'adresse gravée.
 *
 * @returns {SVGDefsElement} defs du disque
 */
function buildDefs() {
  const stop = (offset, tone) => svg('stop', { offset, class: `gold-${tone}` });
  const gold = svg(
    'radialGradient',
    { id: 'recGold', cx: '.42', cy: '.38', r: '.75' },
    stop('0', 0),
    stop('.45', 1),
    stop('.8', 2),
    stop('1', 3),
  );
  const sheen = svg(
    'linearGradient',
    { id: 'recSheen', x1: '0', y1: '0', x2: '1', y2: '1' },
    svg('stop', { offset: '.3', class: 'sheen-edge' }),
    svg('stop', { offset: '.5', class: 'sheen-core' }),
    svg('stop', { offset: '.7', class: 'sheen-edge' }),
  );
  const labelRing = svg('path', { id: 'recLabelRing', d: circlePath(LABEL_ARC) });
  return svg('defs', {}, gold, sheen, labelRing);
}

/**
 * @brief Sillons décoratifs qui tournent, d'opacité ondulée comme dans la maquette.
 *
 * @returns {SVGGElement} g.grooves
 */
function buildGrooves() {
  const group = svg('g', { class: 'grooves' });
  for (let r = GROOVE_FIRST; r < GROOVE_LAST; r += GROOVE_STEP) {
    const alpha = GROOVE_BASE + GROOVE_SWING * Math.sin(r * GROOVE_WAVE);
    group.append(svg('circle', {
      r: r.toFixed(1),
      'stroke-opacity': (alpha / GROOVE_ALPHA).toFixed(2),
    }));
  }
  return group;
}

/**
 * @brief Gravures décoratives de l'étiquette : adresse en couronne, deux pictogrammes.
 *
 * @param {string} mail adresse e-mail (texte gravé en majuscules)
 *
 * @returns {SVGElement[]} texte de la couronne puis les deux pictogrammes
 */
function buildEngravings(mail) {
  const ringText = svg('textPath', { href: '#recLabelRing' });
  ringText.textContent = `${mail.toUpperCase()}${SEPARATOR}`;
  const people = svg(
    'g',
    { class: 'engrave', transform: 'translate(-30 -30)' },
    svg('circle', { r: 6 }),
    svg('circle', { cx: 16, r: 6 }),
    svg('path', { d: 'M6 0h4' }),
  );
  const sun = svg(
    'g',
    { class: 'engrave', transform: 'translate(16 18)' },
    svg('path', {
      d: 'M0 0L-24-12M0 0L-28 4M0 0L-20 16M0 0L-6 24M0 0L14 22M0 0L26 8M0 0L24-10M0 0L10-24',
    }),
    svg('circle', { r: 2.5, class: 'engrave-dot' }),
  );
  return [svg('text', { class: 'engrave-text' }, ringText), people, sun];
}

/**
 * @brief Nom gravé le long d'un arc, invisible tant qu'il n'est pas « on ».
 *
 * @param {string} arcId identifiant de l'arc
 * @param {number} radius rayon de l'arc
 * @param {SVGElement} holder conteneur de l'arc
 *
 * @returns {{ name: SVGTextElement, text: SVGTextPathElement }} texte et son textPath
 */
function buildArcName(arcId, radius, holder) {
  holder.append(svg('path', { id: arcId, d: circlePath(radius), fill: 'none' }));
  const text = svg('textPath', {
    href: `#${arcId}`,
    startOffset: '25%',
    'text-anchor': 'middle',
  });
  return { name: svg('text', { class: 'arc-name' }, text), text };
}

/**
 * @brief Un sillon : piste allumable, nom gravé et lien à anneau large.
 *
 * @param {{ href: string }} channel sillon des données (le lien ne dépend pas de la langue)
 * @param {number} k rang du sillon (0 à 3)
 * @param {{ labels: SVGElement, hits: SVGElement }} layers calques du disque
 *
 * @returns {{ track: SVGCircleElement, name: SVGTextElement, text: SVGTextPathElement,
 *   link: SVGAElement }} éléments du sillon
 */
function buildGroove(channel, k, layers) {
  const track = svg('circle', { r: TRACK_RADII[k], class: 'groove-track' });
  const arc = buildArcName(`recArc${k}`, TRACK_RADII[k] + NAME_ARC_GAP, layers.labels);
  layers.labels.append(arc.name);
  const link = svg('a', { href: channel.href, class: 'rec-hit' });
  if (k > 0) {
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener');
  }
  link.append(svg('circle', {
    class: 'ring',
    r: (RING_EDGES[k] + RING_EDGES[k + 1]) / 2,
    'stroke-width': RING_EDGES[k + 1] - RING_EDGES[k],
  }));
  layers.hits.append(link);
  return { track, name: arc.name, text: arc.text, link };
}

/**
 * @brief Cœur du disque : bouton qui copie l'adresse, son invite gravée entre l'étiquette et
 *   le premier sillon.
 *
 * @param {{ labels: SVGElement, hits: SVGElement }} layers calques du disque
 *
 * @returns {{ core: SVGGElement, name: SVGTextElement, text: SVGTextPathElement }} bouton,
 *   gravure et son textPath
 */
function buildCore(layers) {
  const core = svg(
    'g',
    { class: 'rec-hit', tabindex: 0, role: 'button' },
    svg('circle', { class: 'core', r: RING_EDGES[0] }),
  );
  const arc = buildArcName('recArcCore', CORE_ARC, layers.labels);
  layers.labels.append(arc.name);
  layers.hits.append(core);
  return { core, name: arc.name, text: arc.text };
}

/**
 * @brief Construit le disque d'or entier : visuel, sillons, noms gravés, liens et cœur.
 *
 * @param {{ href: string }[]} channels sillons des données (quatre, le premier est le mailto:)
 *
 * @returns {object} { disc, grooves: [{ track, name, text, link }], core, coreName,
 *   coreText, label } ; les textes traduits restent à remplir
 */
export function buildDisc(channels) {
  const mail = channels[0].href.replace('mailto:', '');
  const defs = buildDefs();
  const labels = svg('g', { class: 'labels' });
  const hits = svg('g', { class: 'hits' });
  const layers = { labels, hits };
  const grooves = channels.map((channel, k) => buildGroove(channel, k, { labels, hits }));
  const core = buildCore(layers);
  const engraved = buildEngravings(mail);
  const label = svg('circle', { class: 'rec-label', r: 92 });
  const disc = svg(
    'svg',
    { class: 'disc', viewBox: FULL_BOX.join(' '), role: 'group' },
    defs,
    svg('circle', { class: 'face', r: 240 }),
    buildGrooves(),
    svg('g', { class: 'tracks' }, ...grooves.map((groove) => groove.track)),
    svg('circle', { class: 'sheen', r: 240 }),
    label,
    svg('circle', { class: 'spindle', r: 8 }),
    ...engraved,
    labels,
    hits,
  );
  return {
    disc,
    grooves,
    core: core.core,
    coreName: core.name,
    coreText: core.text,
    label,
  };
}
