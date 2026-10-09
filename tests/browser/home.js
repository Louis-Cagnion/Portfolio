/* Accueil et dossier du pilote (S5). Contrat fixé par le moniteur (docs/design/plan.md:121 :
« Conforme à la maquette, repère qui s'efface, aucun débordement à 320 px ») :
- structure (maquette docs/design/prototype/prototype.template.html:344-368) : #home > .hero
  [div (p.mission, h1, p.pitch, div.ctas > button.btn.primary[data-go=projects] et
  button.btn[data-go=contact]), aside.hud.telemetry (h3, dl.rows > div > dt + dd)], puis
  a.cue#cue[href="#dossier"] avec un span[aria-hidden=true], puis section.dossier#dossier
  (p.kicker, h2, dl.hud.dossier-body > div > dt + dd) ; css/home.css chargé ;
- textes (data/fr.json:31-62, data/en.json) : home.mission, name, pitch, ctas, telemetry.title,
  telemetry.rows[] ({label, value, live}), dossier.kicker, title, entries[] ({label, html}) ;
  une seule dd.live, celle de la ligne live: true ; le repère affiche home.dossier.kicker
  (aucune clé propre, maquette:359 lui donne le texte du kicker, maquette:361) ;
- mise en page : deux colonnes 1.1fr 0.9fr, écart 48px, hauteur mini 100vh - 180px au-dessus
  de 880 px (maquette:64) ; une colonne, écart 32px, jusqu'à 880 px (maquette:300-302,
  checklist:284) ; dossier en 200px + 1fr, écart 24px, sur une colonne, écart 4px, jusqu'à
  700 px (maquette:91 et 95, checklist:286) ;
- repère (maquette:1208-1212) : le clic amène #dossier à l'écran (défilement fluide, immédiat
  sous mouvement réduit), sans saut en hyperespace ; .gone (opacity 0, visibility hidden,
  maquette:84) posée quand #dossier entre dans la zone limitée par rootMargin
  '0px 0px -15% 0px', retirée en remontant ; la flèche tourne en boucle (animation cue 2s
  infinite, maquette:85) sauf sous mouvement réduit (animation: none, checklist:298) ;
- aucun débordement horizontal à 320, 390, 430, 768 et 1280 px, en français et en anglais
  (checklist:272-276), mot long du dossier compris (overflow-wrap, checklist:107).
Limites du banc : Entrée est jouée par un keydown synthétique, puis par le clic que le
navigateur déclenche sur un lien natif si keydown n'est pas annulé ; mouvement réduit : le
bouchon matchMedia n'atteint pas le CSS, la règle est lue dans le CSSOM. */
import {
  describe,
  makeFetch,
  makeStorage,
  openSite,
  readText,
  response,
  settle,
  waitStatus,
} from './harness.js';
import { overflowProblems } from './checks.js';
import { languageTexts, noForeignText, switchTo } from './language.js';
import { expectEqual, skip, test } from './runner.js';
import { normalize } from './text.js';
import { stubMotion } from './warp.js';

const WIDE_MIN = 881; // deux colonnes au-dessus de 880 px (maquette:300)
const HERO_GAP_WIDE = 48; // maquette:64
const HERO_GAP_NARROW = 32; // maquette:302
const HERO_RATIO = 1.1 / 0.9; // grid-template-columns: 1.1fr 0.9fr (maquette:64)
const RATIO_TOLERANCE = 0.05;
const HERO_MIN_OFFSET = 180; // min-height: calc(100vh - 180px) (maquette:64)
const DOSSIER_WIDE_MIN = 701; // une colonne jusqu'à 700 px (maquette:95)
const DT_WIDTH = 200; // grid-template-columns: 200px 1fr (maquette:91)
const DOSSIER_GAP_WIDE = 24;
const DOSSIER_GAP_NARROW = 4;
export const TOLERANCE = 1; // px : arrondis de sous-pixel
const EDGE_WIDTHS = [700, 701, 880, 881]; // de part et d'autre des deux ruptures
const LONG_WORD = 'a'.repeat(70);
const ARROW = '↓'; // &#8595; (maquette:360)
export const GROUP = 'Accueil';

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const homeOf = (site) => site.doc.getElementById('home');
export const find = (site, selector) => homeOf(site)?.querySelector(selector) ?? null;
export const cueOf = (site) => find(site, '#cue');
export const uncaught = (site) => site.uncaught.map((e) => `exception non rattrapée : ${e}`);
const shape = (el) => `${el.localName}${[...el.classList].map((name) => `.${name}`).join('')}`;
const textOf = (el) => normalize(el.textContent);
const htmlText = (html) => normalize(new DOMParser().parseFromString(html, 'text/html')
  .body.textContent);
const wide = (width) => width >= WIDE_MIN;
const dossierWide = (width) => width >= DOSSIER_WIDE_MIN;

// ---------- Ouverture ----------

/**
 * Ouvre le site sur l'accueil : langue `lang`, mouvement réduit selon `reduce`. `site.warps`
 * garde chaque valeur prise par html[data-warp]. Rend le site une fois l'accueil posé.
 */
export async function openHome(width, { lang = 'fr', reduce = false, fetch } = {}) {
  const motion = { reduce };
  const warps = [];
  const options = {
    width,
    storage: makeStorage(lang === 'en' ? { lang } : {}),
    prepare: (site) => {
      stubMotion(site, motion);
      const root = site.doc.documentElement;
      const observer = new site.win.MutationObserver(() => {
        const value = root.getAttribute('data-warp');
        if (value !== null) warps.push(value);
      });
      observer.observe(root, { attributes: true, attributeFilter: ['data-warp'] });
    },
  };
  if (fetch) options.fetch = fetch;
  const site = await openSite(options);
  site.warps = warps;
  try {
    await waitStatus(site, 'ready');
    await settle(site, 'home');
  } catch (error) {
    site.close();
    throw error;
  }
  return site;
}

/** Faux fetch qui sert les vrais fichiers de données, `home` modifié par `edit(home)`. */
function editedFetch(edit) {
  return makeFetch(async ({ lang, site }) => {
    if (!lang) return response(site, 'introuvable', 404);
    const data = JSON.parse(await readText(`data/${lang}.json`));
    edit(data.home, lang);
    return response(site, JSON.stringify(data));
  });
}

// ---------- Structure ----------

/** Problème si les enfants de `el` ne correspondent pas, dans l'ordre, aux sélecteurs. */
function childrenProblems(label, el, expected) {
  if (!el) return [`${label} absent`];
  const actual = [...el.children];
  const same = actual.length === expected.length &&
    actual.every((child, index) => child.matches(expected[index]));
  if (same) return [];
  return [`${label} : enfants [${actual.map(shape)}] au lieu de [${expected}]`];
}

/** Lignes d'un panneau de paires dt + dd : chaque div porte exactement un dt puis un dd. */
function pairsProblems(label, list) {
  if (!list) return [];
  const rows = [...list.children];
  const problems = rows.flatMap((row, index) => childrenProblems(
    `${label} > div:nth-child(${index + 1})`,
    row,
    ['dt', 'dd'],
  ));
  const bad = rows.filter((row) => row.localName !== 'div').map(shape);
  if (bad.length) problems.push(`${label} : enfants [${bad}] au lieu de div`);
  return problems;
}

/** Structure DOM de la maquette (344-368), sans les textes. */
function structureProblems(site) {
  const root = homeOf(site);
  if (!root) return ['section.view#home absente'];
  const hero = root.querySelector(':scope > .hero');
  const cue = root.querySelector(':scope > a.cue#cue');
  const dossier = root.querySelector(':scope > section.dossier#dossier');
  const problems = [];
  const parts = [['.hero', hero], ['a.cue#cue', cue], ['section.dossier', dossier]];
  for (const [label, el] of parts) if (!el) problems.push(`#home > ${label} absent`);
  const order = [hero, cue, dossier].filter(Boolean);
  const inOrder = order.every((el, index) => index === 0 ||
    order[index - 1].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
  if (!inOrder) problems.push('#home : ordre .hero, a#cue, section#dossier non respecté');
  const text = hero?.children[0];
  const telemetry = hero?.children[1];
  const rows = telemetry?.querySelector(':scope > dl.rows');
  const body = dossier?.querySelector(':scope > dl.hud.dossier-body');
  const ctas = text?.querySelector(':scope > div.ctas');
  return [
    ...problems,
    ...childrenProblems('.hero', hero, ['div', 'aside.hud.telemetry']),
    ...childrenProblems('.hero > div', text, ['p.mission', 'h1', 'p.pitch', 'div.ctas']),
    ...childrenProblems(
      '.ctas',
      ctas,
      [
        'button.btn.primary[data-go="projects"]',
        'button.btn:not(.primary)[data-go="contact"]',
      ],
    ),
    ...childrenProblems('aside.telemetry', telemetry, ['h3', 'dl.rows']),
    ...pairsProblems('dl.rows', rows),
    ...childrenProblems('a#cue', cue, ['span[aria-hidden="true"]']),
    ...(cue && cue.getAttribute('href') !== '#dossier'
      ? [`a#cue[href] vaut ${JSON.stringify(cue.getAttribute('href'))} au lieu de "#dossier"`]
      : []),
    ...(cue?.firstElementChild && cue.firstElementChild.textContent !== ARROW
      ? [`#cue span : ${JSON.stringify(cue.firstElementChild.textContent)} pour ${ARROW}`]
      : []),
    ...childrenProblems('section.dossier', dossier, ['p.kicker', 'h2', 'dl.hud.dossier-body']),
    ...pairsProblems('dl.dossier-body', body),
  ];
}

/** css/home.css est dans document.styleSheets et porte des règles. */
function stylesheetProblems(site) {
  const sheets = [...site.doc.styleSheets];
  const sheet = sheets.find((item) => /\/css\/home\.css(\?|$)/.test(item.href || ''));
  if (!sheet) {
    const hrefs = sheets.map((item) => item.href || '(en ligne)').join(', ');
    return [`css/home.css absente de document.styleSheets : [${hrefs}]`];
  }
  try {
    return sheet.cssRules.length ? [] : ['css/home.css chargée mais sans aucune règle'];
  } catch (error) {
    return [`css/home.css illisible : ${error.message}`];
  }
}

/** Les trois blocs dont le débordement se juge : télémétrie, dossier, repère. */
function piecesProblems(site) {
  const needed = ['.hero aside.telemetry .rows > div', '#cue', '#dossier .dossier-body > div'];
  return needed
    .filter((selector) => !find(site, selector))
    .map((selector) => `#home ${selector} absent : rien à juger pour cette partie`);
}

// ---------- Textes ----------

/** Textes de #home pour la langue `lang`, tirés de home.* des données de cette langue. */
async function textProblems(site, lang) {
  const { home } = (await languageTexts()).data[lang];
  const problems = [];
  const same = (label, selector, expected) => {
    const el = find(site, selector);
    if (!el) problems.push(`${label} : ${selector} absent`);
    else expectEqual(problems, `${label} (${selector})`, textOf(el), normalize(expected));
  };
  same('home.mission', '.hero .mission', home.mission);
  same('home.name', '.hero h1', home.name);
  same('home.pitch', '.hero .pitch', home.pitch);
  same('home.ctas.projects', '.ctas [data-go="projects"]', home.ctas.projects);
  same('home.ctas.contact', '.ctas [data-go="contact"]', home.ctas.contact);
  same('home.telemetry.title', '.telemetry h3', home.telemetry.title);
  const rows = find(site, '.telemetry .rows')?.children.length ?? 0;
  const rowCount = home.telemetry.rows.length;
  if (rows !== rowCount)
    problems.push(`.telemetry .rows : ${rows} ligne(s) au lieu de ${rowCount}`);
  home.telemetry.rows.forEach((row, index) => {
    const at = `.telemetry .rows > div:nth-child(${index + 1})`;
    same(`home.telemetry.rows[${index}].label`, `${at} > dt`, row.label);
    same(`home.telemetry.rows[${index}].value`, `${at} > dd`, row.value);
  });
  const cue = cueOf(site);
  if (!cue) problems.push('a#cue absent');
  else {
    const own = [...cue.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE);
    const label = normalize(own.map((node) => node.data).join(''));
    expectEqual(problems, 'texte de a#cue (home.dossier.kicker)', label, home.dossier.kicker);
  }
  same('home.dossier.kicker', '#dossier .kicker', home.dossier.kicker);
  same('home.dossier.title', '#dossier h2', home.dossier.title);
  const entries = find(site, '.dossier-body')?.children.length ?? 0;
  const entryCount = home.dossier.entries.length;
  if (entries !== entryCount)
    problems.push(`.dossier-body : ${entries} entrée(s) au lieu de ${entryCount}`);
  home.dossier.entries.forEach((entry, index) => {
    const at = `.dossier-body > div:nth-child(${index + 1})`;
    same(`home.dossier.entries[${index}].label`, `${at} > dt`, entry.label);
    same(`home.dossier.entries[${index}].html`, `${at} > dd`, htmlText(entry.html));
  });
  return problems;
}

/** Une seule dd.live dans #home par ligne `live: true` : celle de cette ligne. */
function liveProblems(site, rows) {
  const lives = [...homeOf(site).querySelectorAll('.live')];
  const wanted = rows.filter((row) => row.live).length;
  const problems = [];
  if (lives.length !== wanted)
    problems.push(`${lives.length} élément(s) .live dans #home au lieu de ${wanted}`);
  rows.forEach((row, index) => {
    const dd = find(site, `.telemetry .rows > div:nth-child(${index + 1}) > dd`);
    if (!dd) problems.push(`ligne ${index + 1} de la télémétrie absente`);
    else if (dd.classList.contains('live') !== Boolean(row.live))
      problems.push(
        `ligne ${index + 1} « ${row.label} » : dd.live ${dd.classList.contains('live')} ` +
          `au lieu de ${Boolean(row.live)} (live: ${row.live})`,
      );
  });
  for (const el of lives)
    if (el.localName !== 'dd') problems.push(`.live porté par ${describe(el)}, pas un dd`);
  return problems;
}

// ---------- Mise en page ----------

/** Accueil sur deux colonnes (au-dessus de 880 px) ou une seule, d'après la maquette. */
function heroLayoutProblems(site, width) {
  const hero = find(site, '.hero');
  const [text, aside] = hero ? [...hero.children] : [];
  if (!text || !aside) return ['#home .hero : colonne de texte ou télémétrie absente'];
  const problems = [];
  const style = site.win.getComputedStyle(hero);
  expectEqual(problems, '.hero display', style.display, 'grid');
  const a = text.getBoundingClientRect();
  const b = aside.getBoundingClientRect();
  if (wide(width)) {
    expectEqual(problems, '.hero column-gap', style.columnGap, `${HERO_GAP_WIDE}px`);
    if (b.left < a.right + HERO_GAP_WIDE - TOLERANCE)
      problems.push(
        `aside.telemetry commence à ${b.left.toFixed(1)} px, la colonne de texte finit à ` +
          `${a.right.toFixed(1)} px : deux colonnes séparées de ${HERO_GAP_WIDE} px attendues`,
      );
    if (!(b.top < a.bottom && a.top < b.bottom))
      problems.push(
        `colonnes non côte à côte : texte ${a.top.toFixed(0)}-${a.bottom.toFixed(0)} px, ` +
          `télémétrie ${b.top.toFixed(0)}-${b.bottom.toFixed(0)} px`,
      );
    const ratio = a.width / b.width;
    if (Math.abs(ratio - HERO_RATIO) > RATIO_TOLERANCE)
      problems.push(
        `rapport texte / télémétrie ${ratio.toFixed(3)} au lieu de ${HERO_RATIO.toFixed(3)} ` +
          '(1.1fr 0.9fr)',
      );
    const least = site.win.innerHeight - HERO_MIN_OFFSET;
    if (hero.getBoundingClientRect().height < least - TOLERANCE)
      problems.push(
        `.hero haut de ${hero.getBoundingClientRect().height.toFixed(0)} px au lieu de ` +
          `${least} px au moins (100vh - ${HERO_MIN_OFFSET}px)`,
      );
    return problems;
  }
  expectEqual(problems, '.hero row-gap', style.rowGap, `${HERO_GAP_NARROW}px`);
  if (b.top < a.bottom + HERO_GAP_NARROW - TOLERANCE)
    problems.push(
      `aside.telemetry commence à ${b.top.toFixed(1)} px, la colonne de texte finit à ` +
        `${a.bottom.toFixed(1)} px : une colonne séparée de ${HERO_GAP_NARROW} px attendue`,
    );
  if (Math.abs(b.left - a.left) > TOLERANCE || Math.abs(b.width - a.width) > TOLERANCE)
    problems.push(
      `colonnes non alignées : texte ${a.left.toFixed(1)} px sur ${a.width.toFixed(1)} px, ` +
        `télémétrie ${b.left.toFixed(1)} px sur ${b.width.toFixed(1)} px`,
    );
  return problems;
}

/** Dossier : intitulé à côté du texte (701 px et plus) ou au-dessus (700 px et moins). */
function dossierLayoutProblems(site, width) {
  const rows = [...(find(site, '.dossier-body')?.children ?? [])];
  if (!rows.length) return ['#dossier .dossier-body : aucune entrée'];
  const problems = [];
  rows.forEach((row, index) => {
    const [dt, dd] = row.children;
    if (!dt || !dd) return;
    const a = dt.getBoundingClientRect();
    const b = dd.getBoundingClientRect();
    const at = `entrée ${index + 1} du dossier`;
    if (dossierWide(width)) {
      if (Math.abs(a.width - DT_WIDTH) > TOLERANCE)
        problems.push(`${at} : dt large de ${a.width.toFixed(1)} px, ${DT_WIDTH} px attendus`);
      if (b.left < a.right + DOSSIER_GAP_WIDE - TOLERANCE || b.top >= a.bottom)
        problems.push(
          `${at} : dd à ${b.left.toFixed(1)} px, ${b.top.toFixed(0)} px de haut, dt finit à ` +
            `${a.right.toFixed(1)} px, ${a.bottom.toFixed(0)} px : deux colonnes attendues`,
        );
    } else if (b.top < a.bottom + DOSSIER_GAP_NARROW - TOLERANCE ||
      Math.abs(b.left - a.left) > TOLERANCE)
      problems.push(
        `${at} : dd à ${b.left.toFixed(1)} px, ${b.top.toFixed(1)} px de haut, dt à ` +
          `${a.left.toFixed(1)} px, finit à ${a.bottom.toFixed(1)} px : une colonne attendue`,
      );
  });
  return problems;
}

/** Débordement horizontal de la page, après avoir vérifié que les blocs jugés existent. */
function overflowOfHome(site) {
  const missing = piecesProblems(site);
  return [...missing, ...overflowProblems(site)];
}

const columns = (count) => (count === 1 ? 'une colonne' : 'deux colonnes');

/** Cas de mise en page et de débordement à la largeur `width`, en français puis en anglais. */
async function runWidth(width) {
  const ctx = { group: GROUP, width, lang: 'fr', section: 'home' };
  const heroName = `accueil sur ${columns(wide(width) ? 2 : 1)} (${width} px)`;
  const dossierName = `dossier du pilote sur ${columns(dossierWide(width) ? 2 : 1)}`;
  const cases = [heroName, dossierName, 'aucun débordement horizontal (fr)'];
  const english = 'aucun débordement horizontal (en)';
  let site;
  try {
    site = await openHome(width);
  } catch (error) {
    skip(ctx, [...cases, english], `ouverture du site impossible (${error.message})`);
    return;
  }
  try {
    await test(ctx, heroName, () => heroLayoutProblems(site, width));
    await test(ctx, dossierName, () => dossierLayoutProblems(site, width));
    await test(ctx, cases[2], () => overflowOfHome(site));
    await test({ ...ctx, lang: 'en' }, english, async () => {
      await switchTo(site, 'en');
      await settle(site, 'home');
      return overflowOfHome(site);
    });
  } finally {
    site.close();
  }
}

/** Mise en page seule aux largeurs de part et d'autre de 700 et de 880 px. */
async function runEdge(width) {
  const ctx = { group: GROUP, width, lang: 'fr', section: 'home' };
  const heroName = `rupture : accueil sur ${columns(wide(width) ? 2 : 1)} à ${width} px`;
  const dossierCols = columns(dossierWide(width) ? 2 : 1);
  const dossierName = `rupture : dossier sur ${dossierCols} à ${width} px`;
  let site;
  try {
    site = await openHome(width);
  } catch (error) {
    skip(ctx, [heroName, dossierName], `ouverture du site impossible (${error.message})`);
    return;
  }
  try {
    await test(ctx, heroName, () => heroLayoutProblems(site, width));
    await test(ctx, dossierName, () => dossierLayoutProblems(site, width));
  } finally {
    site.close();
  }
}

// ---------- Contenu et langue ----------

const CONTENT_CASES = [
  'structure DOM de la maquette (hero, télémétrie, repère, dossier)',
  'css/home.css chargé',
  'textes français issus des données',
  'une seule dd.live, celle de la ligne live: true',
  'bascule en anglais : textes anglais (télémétrie, repère, dossier)',
  'bascule en anglais : aucun texte français visible, télémétrie et repère compris',
  'retour en français : textes français',
  'aucune exception non rattrapée (accueil)',
];

/** Structure, textes des deux langues, `.live` et feuille de style, à la largeur `width`. */
async function runContent(width) {
  const ctx = { group: GROUP, width, lang: 'fr', section: 'home' };
  const [structure, sheet, french, live, english, foreign, back, exceptions] = CONTENT_CASES;
  let site;
  try {
    site = await openHome(width);
  } catch (error) {
    skip(ctx, CONTENT_CASES, `ouverture du site impossible (${error.message})`);
    return;
  }
  const rowsOf = async (lang) => (await languageTexts()).data[lang].home.telemetry.rows;
  try {
    await test(ctx, structure, () => structureProblems(site));
    await test(ctx, sheet, () => stylesheetProblems(site));
    await test(ctx, french, () => textProblems(site, 'fr'));
    await test(ctx, live, async () => liveProblems(site, await rowsOf('fr')));
    await test({ ...ctx, lang: 'en' }, english, async () => {
      await switchTo(site, 'en');
      await settle(site, 'home');
      return [...await textProblems(site, 'en'), ...liveProblems(site, await rowsOf('en'))];
    });
    await test({ ...ctx, lang: 'en' }, foreign, async () => [
      ...piecesProblems(site),
      ...await noForeignText(site, 'en'),
    ]);
    await test(ctx, back, async () => {
      await switchTo(site, 'fr');
      await settle(site, 'home');
      return textProblems(site, 'fr');
    });
    await test(ctx, exceptions, () => uncaught(site));
  } finally {
    site.close();
  }
}

const EDITED_CASES = [
  'données modifiées : la dd.live suit la ligne live: true (première ligne)',
  'données modifiées : aucune ligne live, aucune .live',
  'mot de 70 lettres dans le dossier à 320 px : aucun débordement',
];

/** Cas limites des données : drapeau `live` déplacé ou absent, mot long sans espace. */
async function runEdited() {
  const ctx = { group: GROUP, width: 320, lang: 'fr', section: 'home' };
  const [moved, none, longWord] = EDITED_CASES;
  const setLive = (home, index) => {
    home.telemetry.rows.forEach((row, at) => {
      row.live = at === index;
    });
  };
  const edits = [
    [moved, (home) => {
      setLive(home, 0);
      home.dossier.entries[0].html = `${LONG_WORD} ${home.dossier.entries[0].html}`;
    }],
    [none, (home) => setLive(home, -1)],
  ];
  for (const [name, edit] of edits) {
    let home = null;
    let site;
    try {
      site = await openHome(320, { fetch: editedFetch((data) => {
        edit(data);
        home = data;
      }) });
    } catch (error) {
      const lost = name === moved ? [moved, longWord] : [name];
      skip(ctx, lost, `ouverture impossible (${error.message})`);
      continue;
    }
    try {
      await test(ctx, name, () => liveProblems(site, home.telemetry.rows));
      if (name === moved) await test(ctx, longWord, () => overflowOfHome(site));
    } finally {
      site.close();
    }
  }
}

// ---------- Lancement ----------

/** Groupe « Accueil » : contenu, mise en page par largeur, ruptures, cas limites. */
export async function runHome(widths, mainWidth) {
  await runContent(mainWidth);
  for (const width of widths) await runWidth(width);
  for (const width of EDGE_WIDTHS) await runEdge(width);
  await runEdited();
}
