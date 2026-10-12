/* Sonde du groupe « Projets » : données réelles, site ouvert sur la rubrique, éléments du
contrat DOM (tests/browser/projects.js), gestes (clic, touches), attentes d'état, comptage des
boucles requestAnimationFrame de la rubrique. Aucun libellé en dur : tout vient de data/. */
import {
  click,
  describe,
  goTo,
  isVisible,
  makeStorage,
  openSite,
  readJson,
  settle,
  waitFor,
  waitStatus,
} from './harness.js';
import { normalize } from './text.js';
import { stubMotion } from './warp.js';

export const IMMEDIATE_MS = 120; // « sans transition longue » : état final dès ce délai
const OWN_LOOP = /\/js\/sections\/projects[^/\s)]*\.js/; // fichier qui demande la boucle
const STACK_DEPTH = 40;
const STABLE_POLLS = 4;
const POLL_MS = 50;

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let dataCache = null;
/** Données `projects` des deux langues. */
export function projectsData() {
  dataCache ||= (async () => {
    const out = {};
    for (const lang of ['fr', 'en']) {
      const { projects } = await readJson(`data/${lang}.json`);
      out[lang] = projects;
    }
    return out;
  })();
  return dataCache;
}

/** Texte brut d'un champ de données (balises retirées, espaces normalisés). */
export const plain = (html) => normalize(
  new DOMParser().parseFromString(html, 'text/html').body.textContent,
);
export const approachOf = (text, system) => text.approach.replace('{name}', system.name);
export const countOf = (text, n) => text.count.replace('{n}', n);
export const categoryOf = (text, system) => text.systemOf.replace('{name}', system.name);
export const centre = (rect) => ({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });

// ---------- Comptage des boucles requestAnimationFrame ----------

/**
 * Enveloppe requestAnimationFrame du cadre : `pending` garde les rappels en attente avec
 * l'indication « demandé depuis js/sections/projects*.js » (lue dans la pile d'appels),
 * `peakOwn` le plus grand nombre de boucles de la rubrique en attente ensemble.
 */
export function countLoops(site) {
  const { win } = site;
  win.Error.stackTraceLimit = STACK_DEPTH;
  const request = win.requestAnimationFrame.bind(win);
  const cancel = win.cancelAnimationFrame.bind(win);
  const loops = { pending: new Map(), peakOwn: 0 };
  loops.own = () => [...loops.pending.values()].filter(Boolean).length;
  win.requestAnimationFrame = (callback) => {
    if (typeof callback !== 'function') return request(callback);
    const own = OWN_LOOP.test(new win.Error().stack || '');
    const id = request((time) => {
      loops.pending.delete(id);
      callback(time);
    });
    loops.pending.set(id, own);
    loops.peakOwn = Math.max(loops.peakOwn, loops.own());
    return id;
  };
  win.cancelAnimationFrame = (id) => {
    loops.pending.delete(id);
    cancel(id);
  };
  return loops;
}

/** Simule un onglet masqué (ou revenu) : `document.hidden` et `visibilitychange`. */
export function setHidden(site, hidden) {
  const { doc } = site;
  Object.defineProperty(doc, 'hidden', { configurable: true, get: () => hidden });
  Object.defineProperty(doc, 'visibilityState', {
    configurable: true,
    get: () => (hidden ? 'hidden' : 'visible'),
  });
  doc.dispatchEvent(new site.win.Event('visibilitychange'));
}

// ---------- Site et éléments ----------

/**
 * Site ouvert sur Projets (`visit` faux : resté sur l'accueil). `reduce` fixe le mouvement
 * réduit dès l'amorçage ; `loops` compte les requestAnimationFrame (`site.loops`).
 */
export async function openProjectsSite(width, options = {}) {
  const { lang = 'fr', reduce = false, loops = false, visit = true } = options;
  const motion = { reduce };
  const site = await openSite({
    width,
    storage: makeStorage(lang === 'en' ? { lang } : {}),
    prepare: (opened) => {
      stubMotion(opened, motion);
      if (loops) opened.loops = countLoops(opened);
    },
  });
  site.motion = motion;
  try {
    await waitStatus(site, 'ready');
    await settle(site, 'home');
    if (visit) await goTo(site, 'projects');
  } catch (error) {
    site.close();
    throw error;
  }
  return site;
}

/** Éléments du contrat DOM (null si absents). */
export function parts(site) {
  const { doc } = site;
  const root = doc.getElementById('projects');
  const one = (selector) => root?.querySelector(selector) ?? null;
  return {
    root,
    layout: doc.getElementById('sysLayout'),
    svg: one('svg#systems'),
    head: one('.sys-head'),
    back: one('.sys-head .back'),
    title: one('.sys-head .ctitle'),
    count: one('.sys-head .count'),
    intro: one('.intro-c'),
  };
}

/** Liste des projets : l'élément nommé `projects.listLabel` de la rubrique. */
export function listOf(site, text) {
  const root = site.doc.getElementById('projects');
  return [...(root?.querySelectorAll('[aria-label]') ?? [])]
    .find((el) => el.getAttribute('aria-label') === text.listLabel) ?? null;
}

/** Problèmes de structure si la rubrique n'est pas encore celle de S6. */
export function gate(site) {
  const found = parts(site);
  return [['#sysLayout', found.layout], ['#projects svg#systems', found.svg]]
    .filter(([, el]) => !el)
    .map(([selector]) => `${selector} introuvable (rubrique encore montée par mountSimple ?)`);
}

const inProjects = (site, selector) => [...site.doc.querySelectorAll(`#projects ${selector}`)];
export const suns = (site) => inProjects(site, '.sun-btn');
export const planetEls = (site) => inProjects(site, '.planet');
export const labelOf = (el) => el?.getAttribute('aria-label') ?? '';
export const sunOf = (site, text, system) => suns(site)
  .find((el) => labelOf(el) === approachOf(text, system)) ?? null;
export const planetOf = (site, project) => planetEls(site)
  .find((el) => labelOf(el) === plain(project.title)) ?? null;
export const isZoomed = (site) => !!parts(site).layout?.classList.contains('zfocus');

/** Texte des nœuds visibles de `root`, en minuscules normalisées. */
export function visibleText(site, root) {
  const walker = site.doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const texts = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = normalize(node.data);
    if (text && node.parentElement && isVisible(node.parentElement)) texts.push(text);
  }
  return texts.join(' ');
}

// ---------- Gestes et attentes ----------

/** Frappe `name` (keydown) sur `el`, comme le ferait le clavier. */
export function press(site, el, name) {
  const code = name === ' ' ? 'Space' : name;
  const event = new site.win.KeyboardEvent('keydown', {
    key: name,
    code,
    bubbles: true,
    cancelable: true,
  });
  el.dispatchEvent(event);
}
export const pressEscape = (site) => press(
  site,
  site.doc.activeElement ?? site.doc.body,
  'Escape',
);

/** Geste « activer `el` » : clic, Entrée ou Espace (focus d'abord pour les touches). */
function activate(site, el, how) {
  if (how === 'clic') return click(site, el);
  el.focus();
  return press(site, el, how === 'Espace' ? ' ' : 'Enter');
}

/** État qui change tant que le zoom, la caméra ou une transition de hauteur bougent. */
function signature(site) {
  const { svg, head, layout } = parts(site);
  const box = svg?.getBoundingClientRect();
  return [
    svg?.getAttribute('viewBox'),
    box?.height.toFixed(1),
    isVisible(head),
    layout?.className,
  ].join('|');
}

/** Vrai tant que la fiche (`#sheet`) joue une transition ou une animation. */
function sheetBusy(site) {
  const sheet = site.doc.getElementById('sheet');
  return !!sheet && sheet.getAnimations().length > 0;
}

/**
 * Attend que la rubrique et la fiche ne bougent plus (quatre relevés identiques de suite,
 * aucune animation de la fiche, 4 s au plus).
 */
export async function rest(site) {
  const end = performance.now() + 4000;
  let last = null;
  let same = 0;
  while (performance.now() < end && (same < STABLE_POLLS || sheetBusy(site))) {
    const now = signature(site);
    same = now === last ? same + 1 : 0;
    last = now;
    await sleep(POLL_MS);
  }
}

/** Zoome sur le soleil `sun` par `how` (clic, Entrée, Espace) et attend le repos. */
export async function zoomIn(site, sun, how) {
  activate(site, sun, how);
  await waitFor(() => isZoomed(site), 3000, 'classe zfocus sur #sysLayout après le zoom');
  await rest(site);
}

// ---------- Fiche ----------

const sheetEl = (site) => site.doc.getElementById('sheet');
export const sheetOpen = (site) => {
  const sheet = sheetEl(site);
  return !!sheet && !sheet.hidden && !sheet.inert;
};

/**
 * Fiche déjà demandée : attend son ouverture, contrôle titre et catégorie, la ferme par Échap,
 * contrôle le focus rendu à `origin` et l'état du zoom (`zoomed`). Rend les problèmes.
 */
export async function ficheCheck(site, context, origin, zoomed) {
  const { text, system, project } = context;
  const name = plain(project.title);
  const problems = [];
  try {
    await waitFor(() => sheetOpen(site), 2500, `fiche de « ${name} » ouverte`);
  } catch (error) {
    return [`${name} : fiche non ouverte (${error.message})`];
  }
  const shown = normalize(site.doc.getElementById('sTitle')?.textContent ?? '');
  if (shown !== name) problems.push(`#sTitle « ${shown} » au lieu de « ${name} »`);
  const cat = normalize(site.doc.getElementById('sCat')?.textContent ?? '');
  if (cat !== categoryOf(text, system))
    problems.push(`#sCat « ${cat} » au lieu de « ${categoryOf(text, system)} »`);
  pressEscape(site);
  try {
    await waitFor(() => !sheetOpen(site), 3000, `fiche de « ${name} » fermée par Échap`);
    await waitFor(() => site.doc.activeElement === origin, 1500, 'focus rendu à l\'origine');
  } catch (error) {
    const focus = describe(site.doc.activeElement);
    problems.push(`${name} : ${error.message} (focus sur ${focus})`);
  }
  if (isZoomed(site) !== zoomed)
    problems.push(`${name} : zoom ${isZoomed(site) ? 'gardé' : 'quitté'} après la fiche`);
  return problems;
}

/** Ouvre la fiche depuis `origin` par `how` (clic, Entrée, Espace) puis la contrôle. */
export function ficheCycle(site, context, origin, how, zoomed) {
  activate(site, origin, how);
  return ficheCheck(site, context, origin, zoomed);
}
