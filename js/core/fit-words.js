/*
Plafonnement général des textes : un mot ne se coupe jamais en son milieu et ne déborde jamais.
Si le plus long mot d'une cible de FIT_TARGETS (coupes permises : espaces, tirets, césures
douces) est plus large que la place de son texte, sa police est réduite juste assez ; sinon
aucun style en ligne. startFitWords() pose un seul observateur pour tout le site, fitWords()
ajuste des éléments donnés.
Hors liste : <text> SVG des escales (js/sections/journey-labels.js les tronque), pilule et
barre d'onglets (@media en em, mode icônes de js/ui/nav.js), boutons FR/EN et flèches
(un mot de deux lettres ou un glyphe, largeur imposée), fiche #sheet (vide jusqu'à S6).
*/

const SPACES = /[ \t\n\r\f]+/; // l'espace insécable ne coupe pas
const AFTER_HYPHEN = /(?<=-)(?=[^-\d])/; // coupe après un tiret, sauf avant un chiffre
const SOFT_HYPHEN = '\u00AD';
const BOX_EXTRAS = ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth'];
const MARGINS = ['marginLeft', 'marginRight'];
const FLOWLESS = ['inline', 'contents']; // sans boîte propre : la place est celle d'un ancêtre
/* Px laissés libres par un plafond : la largeur d'un mot ne suit pas exactement sa taille
(arrondis du rendu, 0,2 px mesurés sur « piscine, » en IBM Plex Mono). */
export const FIT_MARGIN_PX = 0.5;
const SAVED = ['overflow-wrap', 'white-space']; // styles en ligne posés le temps des mesures
/* Tours de mesure d'un appel : plafonner un texte peut changer la place d'un voisin. */
export const MAX_ROUNDS = 3;
/* Retours d'un élément à une mise en page déjà vue tant que son texte, la fenêtre et les
polices ne changent pas : au-delà, sa place alterne avec sa police (boucle) et il garde la
plus petite taille vue. Des ajustements qui convergent ne comptent pas. */
export const MAX_REFITS = 6;
const MAX_SEEN = 64; // mises en page retenues par élément (une place animée les renouvelle)

/* Sélecteurs CSS des textes plafonnés : ajouter une rubrique = ajouter une ligne. */
export const FIT_TARGETS = [
  'h1, h2, h3, h4', // titres
  'p', // chapeaux, accroches, paragraphes de fiche, textes des panneaux d'état
  'dt, .rows dd', // télémétrie et dossier du pilote
  '.brand, .btn, .cue', // marque, boutons, repère
  '.when, .count, .jtitle b, .jtitle span', // dates, compteur et titre de scène du parcours
];

let canvas2d; // contexte de mesure, créé au premier usage
let warned = false;
let started = false;
let fontsLoaded = 0; // chargements de polices vus : chacun périme toutes les mesures
/* élément -> { input, state, seen, refits, smallest } : entrées et mise en page du dernier
ajustement, mises en page déjà vues et retours à l'une d'elles pour ces entrées, plus petite
taille posée (px) */
const fitted = new WeakMap();

/**
 * @brief Contexte 2D de mesure, créé au premier appel.
 *
 * @returns {CanvasRenderingContext2D | null} null, avec un seul avertissement, s'il est refusé
 */
function measuringContext() {
  canvas2d ??= document.createElement('canvas').getContext('2d');
  if (!canvas2d && !warned) {
    warned = true;
    console.warn('fit-words : contexte 2D refusé, textes non plafonnés');
  }
  return canvas2d;
}

/**
 * @brief Morceaux d'un texte entre deux coupes possibles.
 *
 * "Une Anti\u00ADconstitution-RNCP6" -> textes ["Une", "Anti-", "constitution-", "RNCP6"]
 *
 * @param {string} text texte brut
 *
 * @returns {{ text: string, raw: string }[]} morceaux non vides : `text` montre le tiret
 *   d'une césure douce coupée, `raw` est le morceau tel qu'il figure dans `text`
 */
function pieces(text) {
  return text.split(SPACES).flatMap((word) => word.split(SOFT_HYPHEN).flatMap(
    (part, at, parts) => part.split(AFTER_HYPHEN).map((raw, index, all) => ({
      raw,
      text: at < parts.length - 1 && index === all.length - 1 ? `${raw}-` : raw,
    })),
  )).filter(({ raw }) => raw);
}

/**
 * @brief Largeur affichée d'un morceau de texte, sur une seule ligne.
 *
 * @param {{ node: Text, start: number, end: number }} piece nœud et bornes (indices dans sa
 *   chaîne) du morceau
 *
 * @returns {number} somme des largeurs de ses rectangles, en px
 */
function renderedWidth({ node, start, end }) {
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  return [...range.getClientRects()].reduce((total, rect) => total + rect.width, 0);
}

/**
 * @brief Plus long morceau de texte de `el` au canvas, chaque nœud dans sa propre police.
 *
 * @param {HTMLElement} el cible affichée
 *
 * @returns {{ width: number, node: Text, start: number, end: number } | null} largeur en
 *   px et position du morceau ; null sans texte ou sans contexte 2D
 */
function widestPiece(el) {
  const context = measuringContext();
  if (!context) return null;
  let widest = null;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const style = getComputedStyle(node.parentElement);
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ` +
      style.fontFamily;
    context.letterSpacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing;
    let cursor = 0;
    for (const { raw, text } of pieces(node.data)) {
      const start = node.data.indexOf(raw, cursor);
      cursor = start + raw.length;
      const width = context.measureText(text).width;
      if (width > (widest?.width ?? 0)) widest = { width, node, start, end: cursor };
    }
  }
  return widest;
}

/**
 * @brief Somme de propriétés en px d'un style calculé.
 *
 * @param {CSSStyleDeclaration} style style calculé
 * @param {string[]} names noms de propriétés en px (paddingLeft, marginRight...)
 *
 * @returns {number} somme en px
 */
const sum = (style, names) => (
  names.reduce((total, name) => total + parseFloat(style[name]), 0)
);

/**
 * @brief Soi ou le plus proche ancêtre qui a une boîte (ni en ligne, ni `contents`).
 *
 * @param {HTMLElement} el cible
 *
 * @returns {HTMLElement | null} null si aucun ancêtre n'a de boîte
 */
function boxOf(el) {
  let box = el;
  while (box && FLOWLESS.includes(getComputedStyle(box).display)) box = box.parentElement;
  return box;
}

/**
 * @brief Largeur de contenu de `box`.
 *
 * @param {HTMLElement} box élément à boîte
 *
 * @returns {number} px, NaN pour un élément sans boîte (largeur utilisée non numérique)
 */
function contentWidth(box) {
  const style = getComputedStyle(box);
  const extras = style.boxSizing === 'border-box' ? sum(style, BOX_EXTRAS) : 0;
  return parseFloat(style.width) - extras;
}

/**
 * @brief Place prise sur la ligne par les voisins d'un conteneur flex en ligne.
 *
 * @param {HTMLElement} box conteneur
 *
 * @returns {number} largeur des enfants-éléments et des écarts, 0 hors flex en ligne
 */
function reservedWidth(box) {
  const style = getComputedStyle(box);
  if (!style.display.includes('flex') || !style.flexDirection.startsWith('row')) return 0;
  const named = [...box.childNodes].filter((n) => n.nodeType === 1 || n.data.trim());
  const gaps = Math.max(0, named.length - 1) * (parseFloat(style.columnGap) || 0);
  return gaps + [...box.children].reduce((total, child) => total + child.offsetWidth, 0);
}

/**
 * @brief Largeur dont dispose le texte de `el`.
 *
 * C'est celle de son contenu, moins la place des voisins d'un flex en ligne, sans dépasser
 * celle du contenu du bloc parent (un bouton aussi large que son mot ne se plafonnerait pas) ;
 * un élément en ligne emprunte la boîte de son ancêtre, moins ses propres marges, retraits et
 * bordures (le premier et le dernier mot les portent sur leur ligne).
 *
 * @param {HTMLElement} el cible
 *
 * @returns {number} px, NaN sans boîte
 */
function roomOf(el) {
  const box = boxOf(el);
  if (!box) return NaN;
  const edges = (node) => sum(getComputedStyle(node), [...BOX_EXTRAS, ...MARGINS]);
  const inline = box === el ? 0 : edges(el);
  const own = contentWidth(box) - reservedWidth(box) - inline;
  const parent = box.parentElement && boxOf(box.parentElement);
  if (!parent) return own;
  return Math.min(own, contentWidth(parent) - edges(box) - inline);
}

/**
 * @brief Entrées de l'ajustement de `el` : texte, fenêtre, police de la page et du parent,
 *   classe, famille et graisse, polices chargées. Ni sa taille ni sa place : elles suivent
 *   la police posée.
 *
 * @param {HTMLElement} el cible affichée
 *
 * @returns {string} entrées jointes, égales tant que rien n'oblige à remesurer à zéro
 */
function inputOf(el) {
  const style = getComputedStyle(el);
  return [
    el.textContent,
    window.innerWidth,
    getComputedStyle(document.documentElement).fontSize,
    getComputedStyle(el.parentElement ?? el).fontSize,
    el.className,
    style.fontFamily,
    style.fontWeight,
    style.fontStyle,
    fontsLoaded,
  ].join('|');
}

/**
 * @brief Entrées et mise en page de `el` : un écart avec la dernière mesure le périme.
 *
 * @param {HTMLElement} el cible affichée
 *
 * @returns {string} entrées, place, taille et interlettrage joints
 */
function stateOf(el) {
  const style = getComputedStyle(el);
  return [inputOf(el), roomOf(el), style.fontSize, style.letterSpacing].join('|');
}

/**
 * @brief Taille de police qui fait tenir le plus long mot, mesuré à la taille naturelle.
 *
 * Le letter-spacing du site est en em : la largeur d'un mot suit la taille.
 *
 * @param {number} natural taille naturelle (px)
 * @param {number} room place du texte (px), NaN sans boîte
 * @param {number | null} widest largeur du plus long morceau (px), null sans mesure
 *
 * @returns {number} taille en px, Infinity si le mot tient (aucun plafond)
 */
function cappedSize(natural, room, widest) {
  if (widest === null || !(room >= 0) || widest <= room) return Infinity;
  return Math.floor((natural * Math.max(0, room - FIT_MARGIN_PX) * 100) / widest) / 100;
}

/**
 * @brief Retire l'attribut style vide de `el`. Après une écriture par `el.style`, Chrome
 *   recrée `style=""` à la lecture suivante si l'attribut est seulement retiré : il est
 *   d'abord réécrit, ce qui annule la sérialisation en attente.
 *
 * @param {HTMLElement} el cible dont `el.style` est vide
 */
function clearStyle(el) {
  el.setAttribute('style', '');
  el.removeAttribute('style');
}

/**
 * @brief Pose la taille `size` de `el` en ligne, ou la retire (taille naturelle).
 *
 * @param {HTMLElement} el cible
 * @param {number} size taille en px, Infinity pour aucun plafond
 */
function applySize(el, size) {
  if (size !== Infinity) {
    el.style.fontSize = `${size}px`;
    return;
  }
  el.style.removeProperty('font-size');
  if (!el.style.length) clearStyle(el);
}

/**
 * @brief Compte le retour de `el` à une mise en page déjà vue ; au MAX_REFITS-ième, il
 *   garde la plus petite taille vue.
 *
 * @param {HTMLElement} el cible, ajustée à l'instant
 * @param {{ state: string, seen: Set<string>, refits: number, smallest: number }} record
 *   mémoire de `el`, `state` à jour
 */
function trackReturns(el, record) {
  if (record.seen.has(record.state)) record.refits += 1;
  else {
    if (record.seen.size >= MAX_SEEN) record.seen.clear();
    record.seen.add(record.state);
  }
  if (record.refits < MAX_REFITS) return;
  applySize(el, record.smallest);
  record.state = stateOf(el);
}

/**
 * @brief Remesure `stale` à sa taille naturelle et pose les tailles plafonnées.
 *
 * Pendant la mesure, chaque texte est sans font-size en ligne et en `overflow-wrap:
 * anywhere` : son plus long mot n'élargit plus sa boîte (piste de grille, élément flex ou
 * ajusté au contenu), la place lue est celle que lui laisse la page. Le plus long morceau
 * (classé au canvas) est ensuite remesuré dans la page en `white-space: nowrap`, sur une
 * seule ligne : crénage et arrondis du rendu dépassent parfois le canvas de quelques
 * dixièmes de px. Les éléments qui ont épuisé MAX_REFITS retours gardent leur taille.
 *
 * @param {HTMLElement[]} stale éléments périmés, affichés
 */
function refit(stale) {
  const entries = stale.map((el) => {
    const input = inputOf(el);
    const last = fitted.get(el);
    const fresh = { input, state: '', seen: new Set(), refits: 0, smallest: Infinity };
    return { el, record: last?.input === input ? last : fresh };
  });
  const open = entries.filter(({ record }) => record.refits < MAX_REFITS);
  for (const entry of open) {
    entry.saved = SAVED.map((name) => entry.el.style.getPropertyValue(name));
    entry.el.style.removeProperty('font-size');
    entry.el.style.overflowWrap = 'anywhere';
  }
  for (const entry of open) {
    entry.natural = parseFloat(getComputedStyle(entry.el).fontSize);
    entry.room = roomOf(entry.el);
    entry.piece = widestPiece(entry.el);
  }
  for (const { el } of open) el.style.whiteSpace = 'nowrap';
  for (const entry of open) {
    const { natural, room, piece } = entry;
    const widest = piece && Math.max(piece.width, renderedWidth(piece));
    entry.size = cappedSize(natural, room, widest);
  }
  for (const { el, record, saved, size } of open) {
    SAVED.forEach((name, at) => {
      if (saved[at]) el.style.setProperty(name, saved[at]);
      else el.style.removeProperty(name);
    });
    record.smallest = Math.min(record.smallest, size);
    applySize(el, size);
  }
  for (const { el, record } of entries) {
    record.state = stateOf(el);
    fitted.set(el, record);
  }
  for (const { el, record } of open) trackReturns(el, record);
}

/**
 * @brief Ajuste la police de chaque élément dont le plus long mot ne tient pas.
 *
 * Idempotent : un élément dont le texte, la place et la police n'ont pas changé n'est ni
 * remesuré ni modifié. Un élément masqué est laissé tel quel. Au plus MAX_ROUNDS tours :
 * un tour remesure les éléments dont la place a changé au tour précédent.
 *
 * @param {Iterable<HTMLElement>} elements cibles
 *
 * @returns {number} nombre d'éléments remesurés
 */
export function fitWords(elements) {
  const shown = [...elements].filter((el) => el.getClientRects().length);
  let measured = 0;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const stale = shown.filter((el) => fitted.get(el)?.state !== stateOf(el));
    if (!stale.length) break;
    refit(stale);
    measured += stale.length;
  }
  return measured;
}

/**
 * @brief Dit si `el` a changé (texte, place, police) depuis son dernier ajustement.
 *
 * @param {HTMLElement} el cible
 *
 * @returns {boolean} true si `el` est connecté, affiché et que sa mise en page diffère de la
 *   dernière mesurée
 */
function isStale(el) {
  return el.isConnected && el.getClientRects().length > 0 &&
    fitted.get(el)?.state !== stateOf(el);
}

/**
 * @brief Plafonne les textes de FIT_TARGETS, au démarrage puis à chaque changement.
 *
 * Un texte réécrit, une cible ajoutée (langue, escale) ou une classe changée sur une cible ou
 * un conteneur de cibles (rubrique montrée) est plafonné aussitôt, dans le rappel du
 * MutationObserver : avant l'affichage, sans image de plus. Un ResizeObserver
 * suit les cibles (largeur, police du navigateur en rem, cible affichée) et ne demande une
 * image que si l'une d'elles est périmée ; un chargement de police périme les mesures. <html>
 * n'est pas observé : sa hauteur change dans le rappel d'autres observateurs (--bar-h de
 * js/ui/nav.js), ce qui laisserait des notifications non livrées (erreur « ResizeObserver
 * loop »). Sans effet au second appel.
 *
 * @param {string[]} [selectors] sélecteurs CSS des cibles
 */
export function startFitWords(selectors = FIT_TARGETS) {
  if (started) return;
  started = true;
  const selector = selectors.join(', ');
  const watched = new Set();
  let queued = false;
  const pass = () => {
    for (const el of watched)
      if (!el.isConnected) {
        resizes.unobserve(el);
        watched.delete(el);
      }
    const targets = document.querySelectorAll(selector);
    for (const el of targets)
      if (!watched.has(el)) {
        watched.add(el);
        resizes.observe(el);
      }
    fitWords(targets);
  };
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      pass();
    });
  };
  const fontsChanged = () => {
    fontsLoaded += 1;
    schedule();
  };
  const holdsTarget = (node) => (
    node.nodeType === 1 && (node.matches(selector) || node.querySelector(selector))
  );
  const touchesTarget = ({ type, target, addedNodes }) => {
    const el = target.nodeType === 1 ? target : target.parentElement;
    if (el?.closest(selector)) return true;
    return type === 'attributes' ? holdsTarget(target) : [...addedNodes].some(holdsTarget);
  };
  const resizes = new ResizeObserver((entries) => {
    if (entries.some(({ target }) => isStale(target))) schedule();
  });
  new MutationObserver((records) => {
    if (records.some(touchesTarget)) pass();
  }).observe(document.body, {
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class'],
    subtree: true,
  });
  document.fonts?.ready.then(fontsChanged);
  document.fonts?.addEventListener('loadingdone', fontsChanged);
  schedule();
}
