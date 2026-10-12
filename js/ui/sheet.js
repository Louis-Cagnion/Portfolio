/*
Fiche projet : volet à droite (feuille du bas à 880 px et moins) qui détaille un projet.
Contrat : initSheet(doc) rend { open(view, origin), update(view), close(), isOpen() } ;
view = { category, title, tags, blocks: [{ type: 'text', html } | { type: 'list', items }],
links: [{ intro, label, href }] }. Les `html` ne passent que par setRich. S8 réutilise ce
module pour ouvrir un projet lié. Balisage et styles : index.html, css/projects.css.
*/
import { setRich } from '../core/dom.js';

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
const REDUCED = '(prefers-reduced-motion: reduce)';
const HIDE_DELAY_MS = 700; // repli si transitionend n'arrive pas (plus que --dur-sheet)
const controllers = new WeakMap();

/**
 * @brief Crée un élément dans le document de la fiche (et non celui du module).
 *
 * @param {Document} doc document porteur
 * @param {string} tag nom de balise
 * @param {Node[]} children enfants
 *
 * @returns {HTMLElement} élément créé
 */
function make(doc, tag, children = []) {
  const node = doc.createElement(tag);
  node.append(...children);
  return node;
}

/**
 * @brief Écrit un texte riche, et protège ses liens https (rel="noopener").
 *
 * @param {HTMLElement} target élément à remplir
 * @param {string} html texte de data/*.json
 * @param {string} field chemin du champ (diagnostic de setRich)
 */
function writeRich(target, html, field) {
  setRich(target, html, field);
  for (const anchor of target.querySelectorAll('a[href^="https:"]'))
    anchor.rel = 'noopener';
}

/**
 * @brief Règle un lien de la fiche.
 *
 * @param {HTMLAnchorElement} anchor lien
 * @param {{ label: string, href: string }} link texte et adresse
 */
function writeLink(anchor, link) {
  anchor.textContent = link.label;
  anchor.href = link.href;
  if (link.href.startsWith('https:')) anchor.rel = 'noopener';
  else anchor.removeAttribute('rel');
}

/**
 * @brief Textes à rendre dans #sBody, dans l'ordre : un par paragraphe, item ou lien.
 *
 * @param {object} view fiche
 *
 * @returns {string} empreinte de la structure (types et nombres), pour réécrire sur place
 */
function shapeOf(view) {
  const blocks = view.blocks.map((b) => (b.type === 'list' ? `l${b.items.length}` : 't'));
  return `${view.tags.length}|${blocks.join(',')}|${view.links.length}`;
}

/**
 * @brief Active la fiche d'un document ; un second appel rend le même contrôleur.
 *
 * const sheet = initSheet(document);
 * sheet.open(view, boutonProjet);
 *
 * @param {Document} doc document contenant #sheet, #sheetBg et #close
 *
 * @returns {{ open: Function, update: Function, close: Function, isOpen: Function }}
 *   open(view, origin) affiche la fiche (origin reçoit le focus à la fermeture), update(view)
 *   réécrit ses textes sur place, close() la ferme, isOpen() dit si elle est ouverte
 */
export function initSheet(doc) {
  if (controllers.has(doc)) return controllers.get(doc);
  const sheet = doc.getElementById('sheet');
  const bg = doc.getElementById('sheetBg');
  const parts = {
    close: doc.getElementById('close'),
    cat: doc.getElementById('sCat'),
    title: doc.getElementById('sTitle'),
    tags: doc.getElementById('sTags'),
    body: doc.getElementById('sBody'),
  };
  const state = { open: false, origin: null, title: '', shape: '', held: [], timer: 0 };
  const still = () => Boolean(doc.defaultView.matchMedia?.(REDUCED).matches);

  const setStill = () => {
    for (const node of [sheet, bg]) node.toggleAttribute('data-still', still());
  };

  const writeTexts = (view) => {
    parts.cat.textContent = view.category;
    parts.title.textContent = view.title;
    [...parts.tags.children].forEach((li, i) => {
      li.textContent = view.tags[i];
    });
    const texts = [...parts.body.querySelectorAll('[data-rich]')];
    const rich = view.blocks.flatMap((b) => (b.type === 'list' ? b.items : [b.html]));
    texts.forEach((node, i) => writeRich(node, rich[i], `fiche ${view.title}`));
    const anchors = [...parts.body.querySelectorAll('[data-link]')];
    view.links.forEach((link, i) => {
      anchors[i].previousSibling.textContent = `${link.intro} `;
      writeLink(anchors[i], link);
    });
    state.title = view.title;
  };

  const build = (view) => {
    parts.tags.replaceChildren(...view.tags.map(() => make(doc, 'li')));
    const nodes = view.blocks.map((block) => (block.type === 'text'
      ? make(doc, 'p')
      : make(doc, 'ul', block.items.map(() => make(doc, 'li')))));
    for (const node of nodes)
      for (const item of node.localName === 'ul' ? node.children : [node])
        item.dataset.rich = '';
    const links = view.links.map(() => {
      const anchor = make(doc, 'a');
      anchor.dataset.link = '';
      return make(doc, 'p', [doc.createTextNode(''), anchor]);
    });
    parts.body.replaceChildren(...nodes, ...links);
    state.shape = shapeOf(view);
  };

  const hide = () => {
    clearTimeout(state.timer);
    if (state.open) return;
    sheet.hidden = true;
    bg.hidden = true;
  };

  const trap = (event) => {
    if (event.key !== 'Tab') return;
    const list = [...sheet.querySelectorAll(FOCUSABLE)];
    const edge = list[event.shiftKey ? 0 : list.length - 1];
    if (event.target !== edge && sheet.contains(event.target)) return;
    event.preventDefault();
    list[event.shiftKey ? list.length - 1 : 0]?.focus();
  };

  const restoreFocus = () => {
    const planet = [...doc.querySelectorAll('#projects .planet[tabindex="0"][aria-label]')]
      .find((node) => node.getAttribute('aria-label') === state.title);
    const targets = [state.origin, planet, doc.querySelector('#projects h2')];
    for (const target of targets) {
      target?.focus?.();
      if (target && doc.activeElement === target) return;
    }
  };

  const open = (view, origin) => {
    const wasOpen = state.open;
    state.origin = origin;
    if (!wasOpen || shapeOf(view) !== state.shape) build(view);
    writeTexts(view);
    if (wasOpen) return;
    state.open = true;
    clearTimeout(state.timer);
    state.held = [...doc.body.children].filter(
      (node) => node !== sheet && node !== bg && !node.inert,
    );
    state.held.forEach((node) => {
      node.inert = true;
    });
    setStill();
    sheet.hidden = false;
    bg.hidden = false;
    sheet.inert = false;
    sheet.scrollTop = 0;
    sheet.getBoundingClientRect(); // départ de transition au repos avant .open
    sheet.classList.add('open');
    bg.classList.add('open');
    parts.close.focus();
  };

  const close = () => {
    if (!state.open) return;
    state.open = false;
    setStill();
    sheet.classList.remove('open');
    bg.classList.remove('open');
    sheet.inert = true;
    state.held.forEach((node) => {
      node.inert = false;
    });
    state.held = [];
    restoreFocus();
    if (still()) hide();
    else state.timer = setTimeout(hide, HIDE_DELAY_MS);
  };

  sheet.addEventListener('keydown', trap);
  bg.addEventListener('click', close);
  parts.close.addEventListener('click', close);
  sheet.addEventListener('transitionend', (event) => {
    if (event.target === sheet && event.propertyName === 'transform') hide();
  });
  doc.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !state.open) return;
    event.preventDefault();
    close();
  });

  const controller = {
    open,
    update: (view) => {
      if (!state.open) return;
      if (shapeOf(view) !== state.shape) build(view);
      writeTexts(view);
    },
    close,
    isOpen: () => state.open,
  };
  controllers.set(doc, controller);
  return controller;
}
