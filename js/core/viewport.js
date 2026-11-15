/*
Place visible d'un plan déployé sur téléphone : borne sa hauteur par la fenêtre et la barre
d'onglets. Sans cette borne, un plan haut de `largeur x ratio` déborde de l'écran en paysage
(844 x 390 : 894 px pour 252 px de place). Partagé par Compétences (skills-pose.js) et
Projets (projects-zoom.js).
*/

/*
Plancher de la hauteur bornée, en px : un astre de 8 px de rayon, son nom (18 px) dessous
et leurs marges demandent 58 px, arrondis à 60 ; en dessous, mieux vaut déborder.
*/
const FLOOR = 60;

/**
 * @brief Hauteur d'un plan déployé, bornée par la place visible de l'écran.
 *
 * La place visible va du haut du plan au plus bas de la fenêtre et de la barre d'onglets,
 * diminuée de `margin`. La hauteur n'excède jamais `wanted` (portrait inchangé) et ne
 * descend jamais sous un plancher de 60 px, sauf si `wanted` est plus petit.
 *
 * @param {object} input
 * @param {number} input.wanted hauteur voulue par la largeur seule, en px
 * @param {number} input.windowHeight hauteur de la fenêtre, en px (non finie : ignorée)
 * @param {number} input.tabbarTop haut de la barre d'onglets, en px (non fini : ignoré)
 * @param {number} input.planTop haut du plan dans la fenêtre, en px (non fini : 0)
 * @param {number} input.margin hauteur à retrancher de la place, en px, pour laisser voir
 *   ce qui suit le plan (non finie : 0)
 *
 * @returns {number} hauteur en px, finie, positive et au plus égale à `wanted`
 */
export function fitHeight({ wanted, windowHeight, tabbarTop, planTop, margin }) {
  if (!Number.isFinite(wanted)) return FLOOR;
  const limits = [windowHeight, tabbarTop].filter(Number.isFinite);
  if (!limits.length) return Math.max(0, wanted);
  const room = Math.min(...limits) - (Number.isFinite(planTop) ? planTop : 0)
    - (Number.isFinite(margin) ? margin : 0);
  return Math.max(0, Math.min(wanted, Math.max(FLOOR, room)));
}

/**
 * @brief Mesures de l'écran pour `fitHeight`, lues dans la page.
 *
 * @returns {{ windowHeight: number, tabbarTop: number, barHeight: number,
 *   landscape: boolean }} hauteur de la fenêtre, haut de la barre d'onglets (`NaN` si elle
 *   est masquée) et hauteur de la barre du haut (`--bar-h`), en px ; fenêtre plus large
 *   que haute
 */
export function screenBounds() {
  const tabbar = document.querySelector('nav.tabbar');
  const shown = tabbar && tabbar.getClientRects().length > 0;
  const page = getComputedStyle(document.documentElement);
  return {
    windowHeight: window.innerHeight,
    tabbarTop: shown ? tabbar.getBoundingClientRect().top : NaN,
    barHeight: parseFloat(page.getPropertyValue('--bar-h')) || 0,
    landscape: window.innerWidth > window.innerHeight,
  };
}
