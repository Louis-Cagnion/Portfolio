/*
Libellés des escales du parcours : un titre ou une date plus long que la place qui lui reste
dans la scène est tronqué par une ellipse « … ». Le texte complet reste dans l'aria-label de
l'escale et dans la fiche (journey.js) ; seul le <text> du dessin est raccourci.
*/

const ELLIPSIS = '…';
const FIELDS = ['title', 'when']; // les deux <text> d'une escale (buildStop)

let sizer = null;

/**
 * @brief Largeur d'un texte SVG, dans l'unité du dessin, par mesure sur canvas.
 *
 * La police est celle du style calculé du `<text>` (taille comprise, en unités du dessin) :
 * la mesure ne dépend ni de l'affichage de la rubrique ni de la mise en page.
 *
 * @param {SVGTextElement} text libellé dont on prend la police
 * @param {string} content texte à mesurer
 *
 * @returns {number} largeur du texte
 */
function widthOf(text, content) {
  sizer ??= document.createElement('canvas').getContext('2d');
  const style = getComputedStyle(text);
  sizer.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  return sizer.measureText(content).width;
}

/**
 * @brief Plus long début de `full` qui, suivi de « … », tient dans `room`.
 *
 * @param {SVGTextElement} text libellé mesuré
 * @param {string} full texte complet
 * @param {number} room largeur disponible
 *
 * @returns {string} le début gardé, espaces de fin retirés, puis « … » (« … » seul au pire)
 */
function truncated(text, full, room) {
  const cut = (count) => full.slice(0, count).trimEnd() + ELLIPSIS;
  let low = 0; // longueur qui tient toujours (« … » seul)
  let high = full.length; // longueur qui ne tient pas : le texte complet
  while (high - low > 1) {
    const mid = (low + high) >> 1;
    if (widthOf(text, cut(mid)) <= room) low = mid;
    else high = mid;
  }
  return cut(low);
}

/**
 * @brief Place disponible d'un libellé, de son point d'ancrage jusqu'au bord de la scène.
 *
 * @param {SVGTextElement} text libellé déjà posé (attributs x et text-anchor)
 * @param {{ left: number, right: number }} bounds bords de la scène, en unités du dessin
 *
 * @returns {number} largeur disponible (centrée sur x si le libellé est centré)
 */
function roomFor(text, { left, right }) {
  const x = Number(text.getAttribute('x'));
  return text.getAttribute('text-anchor') === 'middle'
    ? 2 * Math.min(x - left, right - x)
    : right - x;
}

/**
 * @brief Tronque les libellés qui sortent de la scène, rend leur texte complet aux autres.
 *
 * Idempotente : à rappeler quand la place, la police ou la langue change (largeur de la
 * scène, chargement des polices, bascule de langue). Un libellé qui tient garde exactement
 * son texte, sans écriture dans le DOM.
 *
 * @param {object[]} items éléments des escales posées (title et when : des <text>)
 * @param {{ title: string, when: string }[]} stops textes complets des escales, même ordre
 * @param {{ left: number, right: number }} bounds bords de la scène, en unités du dessin
 */
export function fitLabels(items, stops, bounds) {
  items.forEach((item, index) => FIELDS.forEach((field) => {
    const text = item[field];
    const full = stops[index][field];
    const room = roomFor(text, bounds);
    const shown = widthOf(text, full) <= room ? full : truncated(text, full, room);
    if (text.textContent !== shown) text.textContent = shown;
  }));
}
