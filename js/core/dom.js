/* Construction du DOM : éléments HTML et SVG, texte riche filtré, points de rupture. */

const SVG_NS = 'http://www.w3.org/2000/svg';

/* Points de rupture de docs/design-checklist.md (section 5) ; les @media de css/ reprennent
ces largeurs, qu'un fichier CSS ne peut pas lire ici. */
export const BREAKPOINTS = Object.freeze({
  narrow: '(max-width: 880px)',
  phoneDisc: '(max-width: 820px)',
  mobile: '(max-width: 700px)',
});

/* Balises admises par setRich, à la position courante (drapeau y) : ouvrantes <strong>, <em>,
<a href="https:..." | "mailto:...">, et fermantes </strong>, </em>, </a>. */
const OPEN_TAG = /<(strong|em)>|<a href="((?:https:\/\/|mailto:)[^"\s<>]+)">/y;
const CLOSE_TAG = /<\/(strong|em|a)>/y;
const TAG_START = /[A-Za-z/!?]/;
const MAX_REPORTED = 5; // fautes citées par console.error, les suivantes sont tues
const EXCERPT_LENGTH = 40;

/**
 * @brief Remplit `node` : attributs (null ou false omis, true vide) puis enfants.
 *
 * @param {Element} node élément à remplir
 * @param {Record<string, unknown>} attrs valeur de chaque attribut
 * @param {(Node | string | null | undefined)[]} children nœuds ou textes (vides omis)
 *
 * @returns {Element} `node`
 */
function fill(node, attrs, children) {
  for (const [name, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    node.setAttribute(name, value === true ? '' : String(value));
  }
  node.append(...children.filter((item) => item !== null && item !== undefined));
  return node;
}

/**
 * @brief Crée un élément HTML.
 *
 * el('button', { type: 'button', 'data-go': 'home' }, 'Accueil')
 *
 * @param {string} tag nom de balise
 * @param {Record<string, unknown>} [attrs] attributs
 * @param {...(Node | string | null | undefined)} children enfants, texte inséré tel quel
 *
 * @returns {HTMLElement} élément créé
 */
export function el(tag, attrs = {}, ...children) {
  return fill(document.createElement(tag), attrs, children);
}

/**
 * @brief Crée un élément SVG.
 *
 * @param {string} tag nom de balise SVG
 * @param {Record<string, unknown>} [attrs] attributs
 * @param {...(Node | string | null | undefined)} children enfants
 *
 * @returns {SVGElement} élément créé
 */
export function svg(tag, attrs = {}, ...children) {
  return fill(document.createElementNS(SVG_NS, tag), attrs, children);
}

/**
 * @brief Remplace le contenu de `target` par un texte riche limité à une liste blanche.
 *
 * Seules <strong>, <em> et <a href> en https: ou mailto: (sans autre attribut) deviennent des
 * éléments ; toute autre balise reste du texte visible et une seule console.error nomme
 * `field`. Une balise ouverte et jamais fermée englobe la fin du texte.
 *
 * @param {Element} target élément à remplir
 * @param {string} html texte de data/*.json
 * @param {string} field chemin du champ dans les données (pour le diagnostic)
 */
export function setRich(target, html, field) {
  const source = String(html);
  const fragment = document.createDocumentFragment();
  const open = [];
  const problems = [];
  const report = (problem) => {
    if (problems.length < MAX_REPORTED) problems.push(problem);
  };
  let parent = fragment;
  let text = '';
  const flush = () => {
    if (text) parent.append(text);
    text = '';
  };
  let at = 0;
  for (let lt = source.indexOf('<'); lt !== -1; lt = source.indexOf('<', at)) {
    text += source.slice(at, lt);
    at = lt + 1;
    if (!TAG_START.test(source[lt + 1] ?? '')) {
      text += '<';
      continue;
    }
    OPEN_TAG.lastIndex = lt;
    CLOSE_TAG.lastIndex = lt;
    const opening = OPEN_TAG.exec(source);
    const closing = opening ? null : CLOSE_TAG.exec(source);
    if (opening) {
      flush();
      const node = opening[1] ? el(opening[1]) : el('a', { href: opening[2] });
      parent.append(node);
      open.push(node);
      parent = node;
      at = OPEN_TAG.lastIndex;
    } else if (closing && open.at(-1)?.localName === closing[1]) {
      flush();
      open.pop();
      parent = open.at(-1) ?? fragment;
      at = CLOSE_TAG.lastIndex;
    } else {
      const excerpt = source.slice(lt, lt + EXCERPT_LENGTH);
      const end = excerpt.indexOf('>');
      report(`« ${end === -1 ? excerpt : excerpt.slice(0, end + 1)} » affiché en texte`);
      text += '<';
    }
  }
  text += source.slice(at);
  flush();
  open.forEach((node) => report(`<${node.localName}> jamais fermée`));
  target.replaceChildren(fragment);
  if (problems.length)
    console.error(`setRich : HTML hors liste blanche dans ${field} : ${problems.join(' ; ')}`);
}
