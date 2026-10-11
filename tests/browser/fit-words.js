/* Plafonnement général des textes (groupe « Plafonnement », décision de Louis du 11/10/2026) :
tout texte dont le plus long mot ne tiendrait pas sur une ligne voit sa police réduite juste
assez ; le mot n'est jamais coupé ni ne déborde. Deux familles de cas : le module sur des
éléments synthétiques (fit-words-module.js), puis le site entier ici (chaque rubrique et
panneau d'erreur à 100, 200 et 300 % de police, aux largeurs de la suite et à 200 et 240 px,
et le module du site face à une place qui réagit à sa police).
Limite du banc : un `font-size` sur <html> ne déplace pas les @media en em. À 200 et 300 %, la
pilule (au-dessus de 880 px) et la barre d'onglets débordent donc ici sans que le navigateur
réel le fasse (il bascule en onglets, puis en icônes) : leurs débordements sont écartés, avec
les mots d'une barre qui sort de la fenêtre et le débordement de html quand seules les barres
débordent (mesuré le 11/10/2026 à 1280 px, police du navigateur à 200 et 300 % : ni mot
coupé, ni débordement, marque à sa taille naturelle). */
import { FIT_TARGETS } from '../../js/core/fit-words.js';
import { capped, overflowProblems } from './checks.js';
import {
  ALTERNATION_REFITS,
  LONG_WORD,
  LOOP_FRAMES,
  NATURAL_PX,
  insideProblems,
  nextFrame,
  runModuleCases,
  sizeOf,
  widthOf,
} from './fit-words-module.js';
import {
  SECTIONS,
  describe,
  goTo,
  makeFetch,
  makeStorage,
  openSite,
  readJson,
  response,
  settle,
  waitStatus,
} from './harness.js';
import { skip, test } from './runner.js';
import { stubMotion } from './warp.js';

const GROUP = 'Plafonnement';
const TOL = 0.5; // px : arrondis
const FONTS = ['100%', '200%', '300%'];
const NARROW_WIDTHS = [200, 240]; // largeurs du groupe `etroit`, hors du filtre `widths`
const FRAMES = 4; // images attendues : passage du module, puis mesures qu'il provoque
const BAR_PARTS = ['header.bar', 'nav.tabbar'];
const FIXTURE = 'tests/fixtures/valid-locale.json';
const PIECE = /(?:[^ \t\n\r\f\u00AD-]|-(?=\d))+-?/g; // un morceau entre deux coupes possibles

/** Attend que le module du site ait plafonné les textes (passage en rAF, puis ses suites). */
export async function afterFit(site) {
  for (let i = 0; i < FRAMES; i++) await nextFrame(site.win);
}

/** Boîte de contenu horizontale de `el` : { left, right } dans la fenêtre. */
function contentSpan(win, el) {
  const rect = el.getBoundingClientRect();
  const style = win.getComputedStyle(el);
  return {
    left: rect.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft),
    right: rect.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight),
  };
}

/** Plus proche ancêtre (ou soi) dont la boîte compte : ni en ligne ni `contents`. */
function blockOf(win, el) {
  let box = el;
  const flowless = () => ['inline', 'contents'].includes(win.getComputedStyle(box).display);
  while (box.parentElement && flowless()) box = box.parentElement;
  return box;
}

/** Morceaux de texte de `target` coupés ou sortis de leur place. */
function brokenPieces(site, target) {
  const { doc, win } = site;
  const box = blockOf(win, target);
  const mine = contentSpan(win, box);
  const outer = box.parentElement ? contentSpan(win, box.parentElement) : mine;
  const left = Math.max(mine.left, outer.left);
  const right = Math.min(mine.right, outer.right);
  const problems = [];
  const walker = doc.createTreeWalker(target, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode())
    for (const match of node.data.matchAll(PIECE)) {
      const range = doc.createRange();
      range.setStart(node, match.index);
      range.setEnd(node, match.index + match[0].length);
      const rects = [...range.getClientRects()].filter((rect) => rect.width > 0);
      const lines = rects.length > 1 ? ` coupé sur ${rects.length} lignes` : '';
      const out = rects.some((rect) => rect.right > right + TOL || rect.left < left - TOL);
      if (lines || out)
        problems.push(
          `${describe(target)} : « ${match[0]} »${lines}${out ? ' hors de sa place' : ''}`,
        );
    }
  return problems;
}

/** Vrai si `el` est dans une barre dont un élément sort de la fenêtre (voir l'en-tête). */
function inOverflowingBar(site, el) {
  const bar = el.closest(BAR_PARTS.join(', '));
  return Boolean(bar) && [bar, ...bar.querySelectorAll('*')]
    .some((part) => part.getBoundingClientRect().right > site.win.innerWidth + TOL);
}

/** Chaque cible affichée hors barre qui déborde : aucun morceau coupé ni hors de sa place. */
function wordFitProblems(site) {
  const problems = [];
  const selector = FIT_TARGETS.join(', ');
  for (const target of site.doc.querySelectorAll(selector))
    if (target.getClientRects().length && !inOverflowingBar(site, target))
      problems.push(...brokenPieces(site, target));
  return capped(problems);
}

/**
 * Débordement horizontal de la page, hors barres du haut et du bas, et hors débordement de
 * html quand elles seules débordent (voir l'en-tête).
 */
function pageOverflow(site) {
  const problems = overflowProblems(site);
  const ofBars = (problem) => BAR_PARTS.some((part) => problem.includes(part));
  const rest = problems.filter((problem) => !ofBars(problem));
  const rootOnly = rest.every((problem) => problem.startsWith('html :'));
  const barsOnly = problems.some(ofBars) && rootOnly;
  return barsOnly ? [] : rest;
}

/** Rejoue `check(site)` à chaque taille de police du navigateur, `html` remis ensuite. */
async function acrossFonts(site, check) {
  const problems = [];
  const root = site.doc.documentElement;
  try {
    for (const font of FONTS) {
      root.style.fontSize = font;
      await afterFit(site);
      problems.push(...check(site).map((problem) => `police ${font} : ${problem}`));
    }
  } finally {
    root.style.fontSize = '';
    await afterFit(site);
  }
  return problems;
}

const fontsLabel = `police ${FONTS.join(', ')}`;
const CASES = [
  `chaque mot tient sur une ligne, dans sa place (${fontsLabel})`,
  `aucun débordement horizontal de la page (${fontsLabel})`,
];

/** Une langue, une largeur : chaque rubrique montée. */
async function runSections(width, lang) {
  const ctx = { group: GROUP, width, lang };
  let site;
  try {
    site = await openSite({
      width,
      storage: makeStorage(lang === 'en' ? { lang } : {}),
      prepare: (frame) => stubMotion(frame, { reduce: true }),
    });
    await waitStatus(site, 'ready');
    await settle(site, 'home');
  } catch (error) {
    site?.close();
    for (const section of SECTIONS)
      skip({ ...ctx, section }, CASES, `ouverture du site impossible (${error.message})`);
    return;
  }
  try {
    for (const section of SECTIONS) {
      const at = { ...ctx, section };
      await test(at, CASES[0], async () => {
        await goTo(site, section);
        return acrossFonts(site, wordFitProblems);
      });
      await test(at, CASES[1], () => acrossFonts(site, pageOverflow));
    }
  } finally {
    site.close();
  }
}

/** Faux fetch d'une panne : `http` (500) ou `schema` (champ requis retiré de la fixture). */
function brokenFetch(cause) {
  return makeFetch(async ({ site, lang }) => {
    if (cause === 'http') return response(site, 'erreur serveur', 500);
    const data = structuredClone(await readJson(FIXTURE));
    data.meta.lang = lang || 'fr';
    delete data.meta.title;
    return response(site, JSON.stringify(data));
  });
}

/** Une langue, une largeur : le panneau d'erreur de chaque cause. */
async function runStatusPanels(width, lang) {
  const ctx = { group: GROUP, width, lang, section: null };
  for (const cause of ['http', 'schema']) {
    const names = CASES.map((name) => `panneau d'erreur (${cause}) : ${name}`);
    let site;
    try {
      site = await openSite({
        width,
        fetch: brokenFetch(cause),
        storage: makeStorage(lang === 'en' ? { lang } : {}),
      });
      await waitStatus(site, 'error');
    } catch (error) {
      site?.close();
      skip(ctx, names, `ouverture du site impossible (${error.message})`);
      continue;
    }
    try {
      await test(ctx, names[0], () => acrossFonts(site, wordFitProblems));
      await test(ctx, names[1], () => acrossFonts(site, pageOverflow));
    } finally {
      site.close();
    }
  }
}

/**
 * @brief Le module du site face à une place qui réagit à sa police : un paragraphe ajouté à la
 *   page, dont la boîte s'élargit dès qu'il est plafonné et se rétrécit sinon (par un
 *   ResizeObserver du site). Le module s'arrête après ALTERNATION_REFITS ajustements, la
 *   page continue d'afficher ses images et le mot tient.
 *
 * @param {object} site site prêt
 *
 * @returns {Promise<string[]>} problèmes
 */
async function siteLoopProblems(site) {
  const { doc, win } = site;
  await doc.fonts.ready; // un chargement de police remet à zéro le compte des ajustements
  await afterFit(site);
  const box = doc.createElement('div');
  box.style.cssText = 'position:absolute;left:0;top:0;visibility:hidden;width:100px;' +
    `font:${NATURAL_PX}px/1.3 sans-serif`;
  const p = doc.createElement('p');
  p.textContent = LONG_WORD;
  box.append(p);
  doc.body.append(box);
  const wide = `${Math.ceil(widthOf(LONG_WORD, p)) + 10}px`;
  let refits = 0; // passages du module qui ont écrit : un rappel de l'observateur chacun
  const watcher = new win.MutationObserver(() => { refits += 1; });
  watcher.observe(p, { attributes: true, attributeFilter: ['style'] });
  const reaction = new win.ResizeObserver(() => {
    box.style.width = sizeOf(p) < NATURAL_PX ? wide : '100px';
  });
  reaction.observe(p);
  try {
    for (let frame = 0; frame < LOOP_FRAMES; frame++) await nextFrame(win);
    const problems = refits > ALTERNATION_REFITS
      ? [`${refits} passages du module ont écrit en ${LOOP_FRAMES} images`] : [];
    if (!p.style.fontSize) problems.push('la plus petite taille n\'est pas gardée');
    return [...problems, ...insideProblems(p, LONG_WORD, box)];
  } finally {
    reaction.disconnect();
    watcher.disconnect();
    box.remove();
  }
}

/**
 * @brief Cibles plafonnées (font-size en ligne) de la rubrique `id` à l'instant où sa classe
 *   `on` est posée, puis une fois le plafonnement achevé : les deux doivent être égaux.
 *
 * @param {object} site site prêt, rubrique `id` pas encore montrée
 * @param {string} id identifiant de la rubrique
 *
 * @returns {Promise<{ atShow: number, settled: number }>} cibles plafonnées, au changement
 *   de classe (avant toute image), puis au repos
 */
async function cappedOnArrival(site, id) {
  const view = site.doc.getElementById(id);
  const selector = FIT_TARGETS.join(', ');
  const cappedNow = () => (
    [...view.querySelectorAll(selector)].filter((el) => el.style.fontSize).length
  );
  let atShow = null;
  const watcher = new site.win.MutationObserver(() => { atShow ??= cappedNow(); });
  watcher.observe(view, { attributes: true, attributeFilter: ['class'] });
  try {
    await goTo(site, id);
    await afterFit(site);
  } finally {
    watcher.disconnect();
  }
  return { atShow, settled: cappedNow() };
}

/**
 * @brief Le premier affichage de chaque rubrique est déjà plafonné : aucune image sans
 *   plafond au changement de rubrique.
 *
 * @param {object} site site prêt, rubriques jamais montrées sauf l'accueil
 *
 * @returns {Promise<string[]>} problèmes
 */
async function arrivalProblems(site) {
  const problems = [];
  let total = 0;
  for (const section of SECTIONS.filter((id) => id !== 'home')) {
    const { atShow, settled } = await cappedOnArrival(site, section);
    total += settled;
    if (atShow !== settled)
      problems.push(
        `#${section} : ${atShow} cible(s) plafonnée(s) à l'arrivée, ${settled} au repos`,
      );
  }
  if (!total) problems.push('aucune cible plafonnée : le cas ne juge rien');
  return problems;
}

/** Le cas de la première image d'une rubrique, à une largeur. */
async function runArrival(width) {
  const ctx = { group: GROUP, width, lang: 'fr', section: null };
  const name = 'changement de rubrique : textes plafonnés avant la première image';
  let site;
  try {
    site = await openSite({ width, prepare: (frame) => stubMotion(frame, { reduce: true }) });
    await waitStatus(site, 'ready');
    await settle(site, 'home');
  } catch (error) {
    site?.close();
    skip(ctx, [name], `ouverture du site impossible (${error.message})`);
    return;
  }
  try {
    await test(ctx, name, () => arrivalProblems(site));
  } finally {
    site.close();
  }
}

/** Le cas de boucle du module du site, à une largeur. */
async function runSiteLoop(width) {
  const ctx = { group: GROUP, width, lang: 'fr', section: null };
  const name = 'module du site : une place qui réagit à la police ne le relance pas sans fin';
  let site;
  try {
    site = await openSite({ width, prepare: (frame) => stubMotion(frame, { reduce: true }) });
    await waitStatus(site, 'ready');
  } catch (error) {
    site?.close();
    skip(ctx, [name], `ouverture du site impossible (${error.message})`);
    return;
  }
  try {
    await test(ctx, name, () => siteLoopProblems(site));
  } finally {
    site.close();
  }
}

/**
 * @brief Cas du groupe `plafonnement` : le module, puis le site entier.
 *
 * @param {number[]} widths largeurs de la suite (filtre `widths`), plus 200 et 240 px
 */
export async function runFitWords(widths) {
  await runModuleCases();
  await runSiteLoop(widths[0]);
  for (const width of NARROW_WIDTHS) await runArrival(width);
  for (const width of [...widths, ...NARROW_WIDTHS])
    for (const lang of ['fr', 'en']) {
      await runSections(width, lang);
      await runStatusPanels(width, lang);
    }
}
