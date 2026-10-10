/* Parcours (S7) : ouverture du site et mesures du DOM (positions, textes, flèches). */
import {
  describe,
  goTo,
  isVisible,
  makeFetch,
  makeStorage,
  openSite,
  readText,
  response,
  settle,
  waitStatus,
} from './harness.js';
import { MIN_TARGET } from './checks.js';
import { languageTexts } from './language.js';
import { expectEqual, skip } from './runner.js';
import { normalize } from './text.js';
import { stubMotion } from './warp.js';

export const GROUP = 'Parcours';
const PHONE_MAX = 700; // parcours vertical jusqu'à 700 px (maquette:317)
const FOCUS_Y = 0.36; // maquette:586
const STAGE_RATIO = 0.58; // height: 58svh (maquette:318)
const DETAIL_LIFT = 0.2; // margin-top: -20svh (maquette:330)
const TITLE_LEFT = 112; // maquette:325
const TITLE_RIGHT = 62;
const ARROW_GAP = 8; // maquette:329
export const BAR_GAP = 8; // maquette:691
const HIT_PHONE = 30; // checklist:269
const HIT_DESKTOP = 22;
export const TOL = 3; // px : arrondis et fin de défilement
export const EDGE_WIDTHS = [700, 701, 880, 881];
export const LONG_WORD = 'a'.repeat(70);
const UP_DOWN = ['↑', '↓'];
const LEFT_RIGHT = ['←', '→'];
const STAGE_ARROWS = '.stage-arrows button';
const DETAIL_ARROWS = '.detail .arrows button';

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export const phone = (width) => width <= PHONE_MAX;
export const view = (site) => site.doc.getElementById('journey');
export const one = (site, selector) => view(site)?.querySelector(selector) ?? null;
export const all = (site, selector) => [...(view(site)?.querySelectorAll(selector) ?? [])];
const textOf = (el) => normalize(el?.textContent ?? '');
const htmlText = (html) => normalize(
  new DOMParser().parseFromString(html, 'text/html').body.textContent,
);
export const uncaught = (site) => site.uncaught.map((e) => `exception non rattrapée : ${e}`);
export const center = (rect) => ({
  x: (rect.left + rect.right) / 2,
  y: (rect.top + rect.bottom) / 2,
});
export const wps = (site) => all(site, '.traj .wp');
export const selected = (site) => wps(site).findIndex((g) => g.classList.contains('sel'));
const stage = (site) => one(site, '.jstage');
export const near = (a, b, tolerance = TOL) => Math.abs(a - b) <= tolerance;
export const scrollMax = (site) => (
  site.doc.documentElement.scrollHeight - site.win.innerHeight
);

/** Données de la langue `lang` : `journey` réel. */
export async function journeyData(lang) {
  return (await languageTexts()).data[lang].journey;
}

/** Réponse paresseuse : `edit(journey, lang)` modifie la copie des données servies. */
export function editedFetch(edit) {
  return makeFetch(async ({ lang, site }) => {
    if (!lang) return response(site, 'introuvable', 404);
    const data = JSON.parse(await readText(`data/${lang}.json`));
    edit(data.journey, lang);
    return response(site, JSON.stringify(data));
  });
}

/** Rejoue `probe()` (liste de problèmes) jusqu'à ce qu'elle soit vide ou que `ms` passent. */
export async function eventually(probe, ms = 3000) {
  const end = performance.now() + ms;
  let problems = [];
  for (;;) {
    try {
      problems = probe();
    } catch (error) {
      problems = [`${error.name} : ${error.message}`];
    }
    if (!problems.length || performance.now() >= end) return problems;
    await sleep(40);
  }
}

/** Ouvre le site sur la rubrique Parcours (langue `lang`, mouvement réduit selon `reduce`). */
export async function openJourney(width, { lang = 'fr', reduce = true, fetch } = {}) {
  const motion = { reduce };
  const options = {
    width,
    storage: makeStorage(lang === 'en' ? { lang } : {}),
    prepare: (site) => stubMotion(site, motion),
  };
  if (fetch) options.fetch = fetch;
  const site = await openSite(options);
  try {
    await waitStatus(site, 'ready');
    await settle(site, 'home');
    await goTo(site, 'journey');
  } catch (error) {
    site.close();
    throw error;
  }
  return site;
}

/** Contexte de rapport d'un cas du groupe, en français, à la largeur `width`. */
export const context = (width) => ({
  group: GROUP,
  width,
  lang: 'fr',
  section: 'journey',
});

/**
 * Ouvre le site (`options` : voir openJourney) puis joue `run(site)`, site fermé ensuite.
 * Si l'ouverture échoue, chaque cas de `names` est noté « non joué ».
 */
export async function withJourney(ctx, names, options, run) {
  let site;
  try {
    site = await openJourney(ctx.width, options);
  } catch (error) {
    skip(ctx, names, `ouverture du site impossible (${error.message})`);
    return;
  }
  try {
    await run(site);
  } finally {
    site.close();
  }
}

/** Change la largeur de l'iframe et laisse les media queries et le module réagir. */
export async function resize(site, width) {
  site.frame.style.width = `${width}px`;
  site.width = width;
  await sleep(150);
  await new Promise((resolve) => site.win.requestAnimationFrame(resolve));
}

/** Paire de flèches affichée (fiche au bureau, scène sur téléphone) et l'autre paire. */
export function arrowPairs(site) {
  const stagePair = all(site, STAGE_ARROWS);
  const detailPair = all(site, DETAIL_ARROWS);
  const shown = (pair) => pair.length === 2 && pair.every(isVisible);
  return {
    stagePair,
    detailPair,
    visible: shown(stagePair) ? stagePair : shown(detailPair) ? detailPair : null,
  };
}

/** Distance de `a` à `b` (centres). */
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/** Le vaisseau est posé près de l'escale `index`, plus près d'elle que de toute autre. */
function shipProblems(site, index) {
  const ship = one(site, '.ship-g');
  const hits = wps(site).map((g) => g.querySelector('.hit'));
  if (!ship) return ['#journey .ship-g absent'];
  if (hits.some((h) => !h)) return ['#journey .wp sans circle.hit'];
  const at = center(ship.getBoundingClientRect());
  const distances = hits.map((h) => dist(at, center(h.getBoundingClientRect())));
  const best = distances.indexOf(Math.min(...distances));
  const problems = [];
  if (best !== index)
    problems.push(
      `vaisseau plus près de l'escale ${best + 1} que de l'escale ${index + 1} ` +
        `(${distances.map((d) => d.toFixed(0))} px)`,
    );
  if (ship.classList.contains('thrust'))
    problems.push('.ship-g.thrust : vaisseau encore en route');
  return problems;
}

/** L'escale `index` est au point de visée : 36 % de la scène (téléphone) ou dans la scène. */
function framingProblems(site, index, width) {
  const hit = wps(site)[index]?.querySelector('.hit');
  const box = stage(site)?.getBoundingClientRect();
  if (!hit || !box) return ['escale ou .jstage absent : cadrage non jugé'];
  const rect = hit.getBoundingClientRect();
  const at = center(rect);
  const problems = [];
  if (phone(width)) {
    const wanted = box.top + FOCUS_Y * box.height;
    if (!near(at.y, wanted, 0.05 * box.height))
      problems.push(
        `escale ${index + 1} centrée à ${at.y.toFixed(0)} px au lieu de ` +
          `${wanted.toFixed(0)} px (${FOCUS_Y * 100} % de la scène)`,
      );
  }
  if (at.x < box.left - TOL || at.x > box.right + TOL || at.y < box.top - TOL ||
    at.y > box.bottom + TOL)
    problems.push(
      `escale ${index + 1} hors de la scène : ` +
        `centre (${at.x.toFixed(0)}, ${at.y.toFixed(0)}) pour la scène ` +
        `${box.left.toFixed(0)}-${box.right.toFixed(0)} × ` +
        `${box.top.toFixed(0)}-${box.bottom.toFixed(0)}`,
    );
  return problems;
}

/** Fiche (titre, date, compteur, paragraphes) et titre de scène de l'escale `index`. */
export function detailProblems(site, journey, index, width) {
  const stop = journey.stops[index];
  const problems = [];
  const same = (label, selector, expected) => {
    const el = one(site, selector);
    if (!el) problems.push(`${label} : ${selector} absent`);
    else expectEqual(problems, `${label} (${selector})`, textOf(el), normalize(expected));
  };
  same('titre de la fiche', '.detail h3', stop.title);
  same('date de la fiche', '.detail .when', stop.when);
  same(
    'compteur',
    '.detail .count',
    journey.counter.replace('{n}', index + 1).replace('{total}', journey.stops.length),
  );
  const paragraphs = all(site, '.detail .body p');
  if (paragraphs.length !== stop.paragraphs.length)
    problems.push(
      `.detail .body : ${paragraphs.length} paragraphe(s) au lieu de ` +
        `${stop.paragraphs.length}`,
    );
  stop.paragraphs.forEach((html, at) => {
    if (paragraphs[at] && textOf(paragraphs[at]) !== htmlText(html))
      problems.push(
        `.detail .body p:nth-child(${at + 1}) ne rend pas journey.stops[${index}]`,
      );
  });
  if (phone(width)) {
    same('titre de scène', '.jtitle b', stop.title);
    same('date de scène', '.jtitle span', stop.when);
    if (one(site, '.jtitle')?.classList.contains('out'))
      problems.push('.jtitle.out : titre de scène encore effacé');
  }
  return problems;
}

/**
 * Flèches : paire affichée selon la largeur, glyphes, libellés traduits, 44 × 44,
 * désactivation aux bornes ; l'autre paire masquée.
 */
function arrowProblems(site, journey, index, width) {
  const pairs = arrowPairs(site);
  const problems = [];
  const { stagePair, detailPair, visible } = pairs;
  if (stagePair.length !== 2) problems.push(`${STAGE_ARROWS} : ${stagePair.length} bouton(s)`);
  if (detailPair.length !== 2)
    problems.push(`${DETAIL_ARROWS} : ${detailPair.length} bouton(s)`);
  const check = (pair, glyphs, label) => {
    pair.forEach((button, at) => {
      expectEqual(problems, `glyphe ${label}[${at}]`, textOf(button), glyphs[at]);
      expectEqual(
        problems,
        `aria-label ${label}[${at}]`,
        button.getAttribute('aria-label'),
        [journey.prev, journey.next][at],
      );
    });
  };
  check(stagePair, UP_DOWN, STAGE_ARROWS);
  check(detailPair, LEFT_RIGHT, DETAIL_ARROWS);
  const wantedPair = phone(width) ? stagePair : detailPair;
  const other = phone(width) ? detailPair : stagePair;
  if (!visible || visible !== wantedPair) {
    const actual = visible ? (visible === stagePair ? 'scène' : 'fiche') : 'aucune';
    problems.push(
      `paire de flèches affichée : ${actual} ` +
        `au lieu de ${phone(width) ? 'la scène (↑ ↓)' : 'la fiche (← →)'}`,
    );
  }
  for (const button of other)
    if (isVisible(button))
      problems.push(`${describe(button)} affiché alors qu'il devrait être masqué`);
  const last = journey.stops.length - 1;
  for (const pair of [stagePair, detailPair]) {
    if (pair.length !== 2) continue;
    expectEqual(problems, 'flèche précédente désactivée', pair[0].disabled, index === 0);
    expectEqual(problems, 'flèche suivante désactivée', pair[1].disabled, index === last);
  }
  for (const button of visible ?? []) {
    const rect = button.getBoundingClientRect();
    if (rect.width + 0.5 < MIN_TARGET || rect.height + 0.5 < MIN_TARGET)
      problems.push(
        `${describe(button)} : ${rect.width.toFixed(1)} × ${rect.height.toFixed(1)} px`,
      );
  }
  return problems;
}

/** Position complète : escale `index` choisie, vaisseau, cadrage, fiche, flèches. */
export function positionProblems(site, journey, index, width) {
  const list = wps(site);
  if (list.length !== journey.stops.length)
    return [
      `#journey .traj .wp : ${list.length} escale(s) au lieu de ${journey.stops.length}` +
        ' (module du parcours absent ou incomplet)',
    ];
  const marked = list.filter((g) => g.classList.contains('sel'));
  const problems = [];
  if (marked.length !== 1) problems.push(`${marked.length} .wp.sel au lieu d'une`);
  else expectEqual(problems, 'escale .sel', list.indexOf(marked[0]), index);
  return [
    ...problems,
    ...shipProblems(site, index),
    ...framingProblems(site, index, width),
    ...detailProblems(site, journey, index, width),
    ...arrowProblems(site, journey, index, width),
  ];
}

export const nowIndex = (journey) => journey.stops.findIndex((s) => s.now);

/** Structure DOM de la maquette (370-387, 653-666), sans les textes. */
export function structureProblems(site, journey) {
  const root = view(site);
  if (!root) return ['section.view#journey absente'];
  const problems = [];
  const need = (selector, count = 1) => {
    const found = root.querySelectorAll(selector).length;
    if (found !== count) problems.push(`#journey ${selector} : ${found} au lieu de ${count}`);
  };
  const n = journey.stops.length;
  const last = n - 1;
  [
    ':scope > h2',
    ':scope > p.lede',
    ':scope > div.jstage',
    ':scope > article.hud.detail[aria-live="polite"]',
    '.jstage > svg.traj[role="group"]',
    '.traj > path.track',
    '.traj > path.done',
    '.jstage > div.jtitle > b',
    '.jstage > div.jtitle > span',
    '.jstage > div.stage-arrows',
    '.detail h3',
    '.detail .when',
    '.detail .count',
    '.detail div.arrows',
    '.detail div.body',
    '.traj .ship-g',
  ].forEach((selector) => need(selector));
  need('.traj .wp', n);
  need('.traj .wp[tabindex="0"][role="button"]', n);
  need('.traj .wp > circle.hit', n);
  need('.traj .wp > g.stop', n);
  need('.traj .wp > text:not(.y)', n);
  need('.traj .wp > text.y', n);
  need('.traj .pulse', 1);
  need('.traj .wp.future', n - 1 - nowIndex(journey));
  need('.traj .wp.dest', 1);
  need(STAGE_ARROWS, 2);
  need(DETAIL_ARROWS, 2);
  const list = wps(site);
  journey.stops.forEach((stop, at) => {
    const g = list[at];
    if (!g) return;
    if (!g.querySelector(`:scope > g.stop.${stop.body}`))
      problems.push(`escale ${at + 1} : g.stop.${stop.body} absent`);
    if ((g.querySelector('.pulse') !== null) !== Boolean(stop.now))
      problems.push(`escale ${at + 1} : circle.pulse ${stop.now ? 'absent' : 'présent'}`);
    if (g.classList.contains('dest') !== (at === last))
      problems.push(`escale ${at + 1} : classe .dest incorrecte`);
  });
  const track = one(site, 'path.track')?.getAttribute('d');
  if (!track || one(site, 'path.done')?.getAttribute('d') !== track)
    problems.push('path.done : tracé différent de path.track (maquette:647)');
  return problems;
}

/** css/journey.css est dans document.styleSheets et porte des règles. */
export function stylesheetProblems(site) {
  const sheets = [...site.doc.styleSheets];
  const sheet = sheets.find((item) => /\/css\/journey\.css(\?|$)/.test(item.href || ''));
  if (!sheet)
    return [
      'css/journey.css absente de document.styleSheets : ' +
        `[${sheets.map((item) => item.href || '(en ligne)')}]`,
    ];
  try {
    return sheet.cssRules.length ? [] : ['css/journey.css chargée mais sans aucune règle'];
  } catch (error) {
    return [`css/journey.css illisible : ${error.message}`];
  }
}

/** Textes fixes de la rubrique : titre, chapeau, libellé du tracé, escales. */
export function textProblems(site, journey, width) {
  const problems = [];
  const same = (label, el, expected) => {
    if (!el) problems.push(`${label} : élément absent`);
    else expectEqual(problems, label, textOf(el), normalize(expected));
  };
  same('journey.title (h2)', one(site, ':scope > h2'), journey.title);
  same(
    phone(width) ? 'journey.lede.arrows' : 'journey.lede.pointer',
    one(site, ':scope > p.lede'),
    phone(width) ? journey.lede.arrows : journey.lede.pointer,
  );
  expectEqual(
    problems,
    'aria-label du tracé (journey.stopsLabel)',
    one(site, 'svg.traj')?.getAttribute('aria-label'),
    journey.stopsLabel,
  );
  const list = wps(site);
  journey.stops.forEach((stop, at) => {
    const g = list[at];
    if (!g) return;
    expectEqual(problems, `aria-label escale ${at + 1}`, g.getAttribute('aria-label'),
      `${stop.title}, ${stop.when}`);
    same(`titre de l'escale ${at + 1}`, g.querySelector('text:not(.y)'), stop.title);
    same(`date de l'escale ${at + 1}`, g.querySelector('text.y'), stop.when);
  });
  return problems;
}

/** Géométrie propre à la largeur : scène, fiche, titre et flèches de scène, cibles. */
export function layoutProblems(site, width) {
  const svg = one(site, 'svg.traj');
  const box = stage(site)?.getBoundingClientRect();
  if (!svg || !box) return ['svg.traj ou .jstage absent'];
  const problems = [];
  const vertical = svg.classList.contains('vertical');
  if (vertical !== phone(width))
    problems.push(`svg.traj.vertical ${vertical} à ${width} px (attendu ${phone(width)})`);
  const detail = one(site, '.detail')?.getBoundingClientRect();
  const style = site.win.getComputedStyle(stage(site));
  if (phone(width)) {
    const wanted = STAGE_RATIO * site.win.innerHeight;
    expectEqual(problems, '.jstage position', style.position, 'sticky');
    if (!near(box.height, wanted, 2))
      problems.push(
        `.jstage haute de ${box.height.toFixed(1)} px au lieu de ${wanted.toFixed(1)} px`,
      );
    if (detail && !near(detail.top, box.bottom - DETAIL_LIFT * site.win.innerHeight, 2))
      problems.push(
        `.detail commence à ${detail.top.toFixed(1)} px, la scène finit à ` +
          `${box.bottom.toFixed(1)} px : remontée de ${DETAIL_LIFT * 100}svh attendue`,
      );
    const title = one(site, '.jtitle')?.getBoundingClientRect();
    if (title && (!near(title.left, box.left + TITLE_LEFT, 1) ||
      !near(title.right, box.right - TITLE_RIGHT, 1)))
      problems.push(
        `.jtitle de ${title.left.toFixed(0)} à ${title.right.toFixed(0)} px pour la ` +
          `scène ${box.left.toFixed(0)}-${box.right.toFixed(0)} ` +
          `(gauche ${TITLE_LEFT}, droite ${TITLE_RIGHT})`,
      );
    const [up, down] = all(site, STAGE_ARROWS).map((b) => b.getBoundingClientRect());
    if (up && down) {
      if (!near(up.right, box.right, 1))
        problems.push('flèches de scène non collées à droite');
      if (!near((up.top + down.bottom) / 2, box.top + FOCUS_Y * box.height, 2))
        problems.push('flèches de scène non centrées à 36 % de la scène');
      if (!near(down.top - up.bottom, ARROW_GAP, 1))
        problems.push(
          `écart ${(down.top - up.bottom).toFixed(1)} px entre les flèches de scène`,
        );
    }
    const lifted = one(site, '.jtitle');
    if (!lifted || !isVisible(lifted)) problems.push('.jtitle masqué sur téléphone');
  } else {
    expectEqual(problems, 'viewBox du tracé', svg.getAttribute('viewBox'), '0 0 1100 300');
    expectEqual(problems, '.jstage position', style.position, 'relative');
    const ratio = svg.getBoundingClientRect().height / svg.getBoundingClientRect().width;
    if (!near(ratio, 300 / 1100, 0.01))
      problems.push(
        `svg.traj de rapport ${ratio.toFixed(3)} au lieu de ${(300 / 1100).toFixed(3)}`,
      );
    for (const selector of ['.jtitle', '.stage-arrows'])
      if (isVisible(one(site, selector)))
        problems.push(`${selector} affiché au-dessus de 700 px`);
  }
  return problems;
}

/** Rayon de la zone cliquable de l'escale actuelle : 22 (bureau) ou 30 (téléphone). */
export function hitProblems(site, journey, width) {
  const hit = wps(site)[nowIndex(journey)]?.querySelector('.hit');
  if (!hit) return ['escale actuelle sans circle.hit'];
  return expectEqual([], 'rayon de .hit (escale actuelle)', Number(hit.getAttribute('r')),
    phone(width) ? HIT_PHONE : HIT_DESKTOP);
}

/** Le module a monté la scène et ses escales (sans cela, les mesures seraient vides). */
export function mountedProblems(site) {
  return wps(site).length && stage(site)
    ? []
    : ['#journey .jstage ou .traj .wp absent : module du parcours non monté'];
}

/** Module monté et aucun panneau « Contenu indisponible » dans la rubrique. */
export function panelProblems(site) {
  const found = all(site, '.status, .status.hud[data-state="error"]');
  return [
    ...mountedProblems(site),
    ...found.map((el) => `${describe(el)} : panneau d'indisponibilité encore dans #journey`),
  ];
}
