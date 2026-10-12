/* Sonde du groupe « Compétences » : données réelles, site ouvert sur la rubrique, éléments du
contrat DOM (en-tête de tests/browser/skills.js), mesures de géométrie en pixels rendus (le
plan est un svg à viewBox : tout est comparé en rapports, jamais en unités du dessin).
Aucun libellé en dur : tout vient de data/. */
import {
  goTo,
  isVisible,
  makeStorage,
  openSite,
  readJson,
  settle,
  waitStatus,
} from './harness.js';
import { normalize } from './text.js';
import { stubMotion } from './warp.js';

export const GRID = {
  desk: { cols: 4, cellWidth: 275, cellHeight: 220 },
  phone: { cols: 2, cellWidth: 170, cellHeight: 200 },
};
export const DESKTOP_MIN = 881; // plus de 55em (880 px) : bureau, quatre colonnes
export const LEVEL_ORDER = ['advanced', 'intermediate', 'beginner', 'unknown'];
const POLL_MS = 50;
const STABLE_POLLS = 4;

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let dataCache = null;
/** Données `skills` des deux langues. */
export function skillsData() {
  dataCache ||= (async () => {
    const out = {};
    for (const lang of ['fr', 'en']) out[lang] = (await readJson(`data/${lang}.json`)).skills;
    return out;
  })();
  return dataCache;
}

/** Remplace `{clé}` par sa valeur, comme le fait le site (`format`). */
export function format(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`));
}
export const exploreOf = (text, group) => format(text.explore, { name: group.title });
export const legendOf = (text, lang, level) => format(text.legendItem, {
  body: text.bodies[level],
  level: text.levels[level].toLocaleLowerCase(lang),
});

/** Grille attendue pour `width` : colonnes, rangées et cellule en unités du dessin. */
export function gridFor(width, count) {
  const kind = width >= DESKTOP_MIN ? 'desk' : 'phone';
  const grid = GRID[kind];
  return { ...grid, kind, rows: Math.ceil(count / grid.cols) };
}

// ---------- Site ----------

/**
 * Site ouvert sur Compétences (`visit` faux : resté sur l'accueil). `reduce` fixe le mouvement
 * réduit dès l'amorçage.
 */
export async function openSkillsSite(width, options = {}) {
  const { lang = 'fr', reduce = false, visit = true } = options;
  const motion = { reduce };
  const site = await openSite({
    width,
    storage: makeStorage(lang === 'en' ? { lang } : {}),
    prepare: (opened) => stubMotion(opened, motion),
  });
  site.motion = motion;
  try {
    await waitStatus(site, 'ready');
    await settle(site, 'home');
    if (visit) await goTo(site, 'skills');
  } catch (error) {
    site.close();
    throw error;
  }
  return site;
}

// ---------- Éléments du contrat DOM ----------

/** Éléments de la rubrique (null si absents). */
export function parts(site) {
  const { doc } = site;
  const root = doc.getElementById('skills');
  const one = (selector) => root?.querySelector(selector) ?? null;
  return {
    root,
    title: one('h2'),
    lede: one('p.lede'),
    layout: doc.getElementById('skillsLayout'),
    wrap: one('#skillsLayout > .viz-wrap'),
    svg: one('#skillsLayout > .viz-wrap > svg#constSvg'),
    hint: one('p.hint'),
    panel: one('.focus-panel'),
    legend: one('.legend'),
  };
}

/** Problèmes de structure si la rubrique n'est pas encore celle de S8. */
export function gate(site) {
  const found = parts(site);
  const needed = [['#skillsLayout', found.layout], ['svg#constSvg', found.svg]];
  return needed.filter(([, el]) => !el)
    .map(([selector]) => `${selector} introuvable (rubrique encore montée par mountSimple ?)`);
}

const inSkills = (site, selector) => [...site.doc.querySelectorAll(`#skills ${selector}`)];
export const groupEls = (site) => inSkills(site, '#constSvg .group');
export const starEls = (site) => inSkills(site, '#constSvg .st-g');
export const labelOf = (el) => el?.getAttribute('aria-label') ?? '';
export const textOf = (el) => normalize(el?.textContent ?? '');

/** Nom accessible d'un élément : aria-labelledby (textes liés) sinon aria-label. */
export function accessibleName(site, el) {
  const ids = (el?.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean);
  const linked = ids.map((id) => textOf(site.doc.getElementById(id))).join(' ').trim();
  return linked || labelOf(el);
}

/** Étoiles `.st-g` d'une constellation. */
export const starsOf = (group) => [...group.querySelectorAll('.st-g')];
/** Nom affiché d'une étoile (`text.name`). */
export const starName = (star) => textOf(star.querySelector('text.name'));

/** Texte des nœuds visibles de `root`, nœuds joints par une espace. */
export function visibleText(site, root) {
  const walker = site.doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const texts = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = normalize(node.data);
    if (text && node.parentElement && isVisible(node.parentElement)) texts.push(text);
  }
  return texts.join(' ');
}

/** Éléments de `root` dont le texte normalisé vaut exactement `wanted`, du plus profond. */
export function exactTexts(root, wanted) {
  const found = [...root.querySelectorAll('*')].filter((el) => textOf(el) === wanted);
  return found.filter((el) => !found.some((other) => other !== el && el.contains(other)));
}

// ---------- Géométrie (pixels rendus) ----------

const box = (el) => el.getBoundingClientRect();
const centreOf = (rect) => ({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });

/** Rectangle de la cellule `rect.cell` d'une constellation (null si absent). */
export const cellRect = (group) => {
  const cell = group.querySelector('rect.cell');
  return cell ? box(cell) : null;
};

/** Centre rendu d'une étoile : son astre `.body`, à défaut le groupe `.st-g`. */
export function starCentre(star) {
  return centreOf(box(star.querySelector('.body') ?? star));
}

/**
 * Relevé de la vue d'ensemble : pour chaque constellation, sa cellule et ses étoiles en
 * coordonnées relatives à la cellule, en unités du dessin (échelle déduite de la largeur de
 * la cellule rendue pour `cellWidth` unités).
 */
export function surveyOf(site, width, count) {
  const grid = gridFor(width, count);
  return groupEls(site).map((group) => {
    const rect = cellRect(group);
    if (!rect) return { group, rect: null, stars: [] };
    const scale = rect.width / grid.cellWidth;
    const stars = starsOf(group).map((star) => {
      const centre = starCentre(star);
      return {
        star,
        x: (centre.x - rect.x) / scale,
        y: (centre.y - rect.y) / scale,
      };
    });
    return { group, rect, scale, stars };
  });
}

// ---------- Attente de repos ----------

/** Signature qui change tant que la rubrique ou son plan bougent. */
function signature(site) {
  const { svg, layout } = parts(site);
  const rect = svg?.getBoundingClientRect();
  return [svg?.getAttribute('viewBox'), rect?.height.toFixed(1), layout?.className].join('|');
}

/** Attend que le plan ne bouge plus (quatre relevés identiques de suite, 4 s au plus). */
export async function rest(site) {
  const end = performance.now() + 4000;
  let last = null;
  let same = 0;
  while (performance.now() < end && same < STABLE_POLLS) {
    const now = signature(site);
    same = now === last ? same + 1 : 0;
    last = now;
    await sleep(POLL_MS);
  }
}
