/* Compétences (S8.D2), trois défauts de la revue D1. Cas écrits avant le correctif : rouges.
Contrat :
- I1, police à 200 % à 320 et 390 px : pour chacune des 31 étoiles, tous les enfants de
  `#skill header` et les deux flèches tiennent dans la boîte de contenu de `.focus-panel` et
  dans la fenêtre (getBoundingClientRect : le corps est en overflow-x: clip) ;
- I2, projet lié d'un autre système que celui déjà zoomé dans Projets (après une première puce,
  ou après un zoom à la main) : la caméra rejoint la planète (largeur du viewBox sous 70 % de
  celle du système, planète à moins de 12 % de la largeur du centre), la fiche s'ouvre à
  l'arrivée, à la fermeture le focus est sur cette planète (cas à 390 et 1280 px) ;
- I3, plongée à 390 px puis redimensionnement à 700 et 844 px : le nom de l'étoile courante est
  entier dans le cadre du plan et hors du panneau, la hauteur du plan vaut 1,15 largeur à 5 %.
Cas par site (largeur, langue) : 1 pour I1, 6 pour I2 (3 par parcours), 2 pour I3 (390 px,
français). Mesures de skills-focus-probe.js et skills-related.js (dupliquées). Limite du banc
(fit-words.js) : un font-size sur <html> ne déplace pas les @media en em. */
import { click, describe, goTo, waitFor } from './harness.js';
import {
  openProjectsSite,
  parts as projectParts,
  planetOf,
  plain,
  pressEscape,
  projectsData,
  rest as projectsRest,
  sheetOpen,
  sunOf,
  zoomIn,
} from './projects-probe.js';
import { skip, test } from './runner.js';
import {
  biggest,
  curStar,
  idsOf,
  jump,
  leave,
  maskedShare,
  need,
  ready,
  scrollToPlan,
} from './skills-focus-probe.js';
import {
  labelOf,
  openSkillsSite,
  parts,
  rest,
  skillsData,
  sleep,
  textOf,
} from './skills-probe.js';

const GROUP = 'Compétences';
const LANGS = ['fr', 'en'];
const FIT_WIDTHS = [320, 390];
const TRIP_WIDTHS = [390, 1280];
const FONT = '200%';
const SLACK = 1; // px de tolérance sur un bord
const SHEET_WAIT = { real: 8000, still: 1500 };
const TIGHT_SHARE = 0.7; // largeur finale / largeur du système : au plus
const CENTRE_SHARE = 0.12; // planète à moins de cette part de la largeur du centre du plan
const MASKED_MAX = 1; // % du nom masqué au-delà duquel l'étoile est fautive
const PHONE_RATIO = 1.15; // téléphone déployé : hauteur du plan en largeurs (checklist :285)
const RATIO_SLACK = 0.05; // écart relatif toléré au rapport attendu
const RESIZES = [700, 844]; // largeurs de redimensionnement depuis 390 px

const viewBoxOf = (svg) => {
  const [x, y, w, h] = (svg?.getAttribute('viewBox') ?? '0 0 0 0').split(/\s+/).map(Number);
  return { cx: x + w / 2, cy: y + h / 2, w, h };
};

async function openKit(width, lang, datas, options = {}) {
  const ctx = { group: GROUP, section: 'skills', width, lang };
  try {
    const site = await openSkillsSite(width, { lang, ...options });
    const real = !options.reduce;
    return { site, ctx, text: datas.skills[lang], width, lang, real, pd: datas.projects };
  } catch (error) {
    skip(ctx, ['ouverture du site sur Compétences'], `ouverture : ${error.message}`);
    return null;
  }
}

// ---------- I1 : en-tête de la fiche à 200 % ----------

/** Bords gauche et droit de la boîte de contenu de `el`, dans la fenêtre. */
function contentSpan(site, el) {
  const rect = el.getBoundingClientRect();
  const style = site.win.getComputedStyle(el);
  return {
    left: rect.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft),
    right: rect.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight),
  };
}

/** Premier enfant de l'en-tête (ou flèche) hors du panneau ou de la fenêtre, sinon null. */
function headerOverflow(site) {
  const header = site.doc.querySelector('#skill header');
  if (!header) return 'en-tête #skill header introuvable';
  const inner = contentSpan(site, parts(site).panel);
  const edge = { left: inner.left, right: Math.min(inner.right, site.win.innerWidth) };
  const items = [...header.children, ...header.querySelectorAll('.arrows button')];
  for (const el of items) {
    const rect = el.getBoundingClientRect();
    const name = labelOf(el) || (el.className ? `.${el.className}` : 'bloc nom et niveau');
    if (rect.right > edge.right + SLACK)
      return `${name} finit à ${rect.right.toFixed(0)} px, panneau jusqu'à ` +
        `${inner.right.toFixed(0)} px (fenêtre ${site.win.innerWidth} px)`;
    if (rect.left < edge.left - SLACK)
      return `${name} commence à ${rect.left.toFixed(0)} px, panneau dès ` +
        `${inner.left.toFixed(0)} px`;
  }
  return null;
}

/** Les 31 étoiles tour à tour par les puces : { label, fault } (fault : texte ou null). */
async function headerRows(kit) {
  const { site, text } = kit;
  const rows = [];
  for (const [k, group] of text.groups.entries()) {
    await ready(kit, k, 'clic', true);
    const ids = idsOf(site, text, k);
    for (const [at, id] of ids.entries()) {
      if (at > 0) await jump(kit, k, at, 'puce');
      const item = group.items.find((each) => each.id === id);
      rows.push({
        label: `${group.id}/${id} (${text.levels[item.level]})`,
        level: item.level,
        fault: headerOverflow(site),
      });
    }
    await leave(site, text);
  }
  return rows;
}

async function fitCases(width, lang, datas) {
  const kit = await openKit(width, lang, datas, { reduce: true });
  if (!kit) return;
  const { ctx, site } = kit;
  const root = site.doc.documentElement;
  try {
    root.style.fontSize = FONT;
    await rest(site);
    const name = `police ${FONT} : l'en-tête de chaque fiche tient dans le panneau`;
    await test(ctx, name, async () => {
      const rows = await headerRows(kit);
      const bad = rows.filter((row) => row.fault);
      const levels = [...new Set(bad.map((row) => row.level))];
      const shown = levels.map((level) => bad.find((row) => row.level === level))
        .map((row) => `${row.label} : ${row.fault}`);
      return bad.length
        ? [`${bad.length}/${rows.length} étoile(s) à ${width} px, dont ${shown.join(' ; ')}`]
        : [];
    });
  } finally {
    site.close();
  }
}

// ---------- I2 : second projet lié dans un autre système ----------

/** Rang du système de chaque projet : Map id → rang. */
function systemsOf(projects) {
  const out = new Map();
  projects.systems.forEach((system, s) => system.projects.forEach((p) => out.set(p.id, s)));
  return out;
}

/** Première étoile qui cite deux projets de deux systèmes : { k, itemId, first, second }. */
function pickCross(skills, projects) {
  const of = systemsOf(projects);
  for (const [k, group] of skills.groups.entries())
    for (const item of group.items) {
      const known = item.projects.filter((id) => of.has(id));
      const first = known[0];
      const second = known.find((id) => of.get(id) !== of.get(first));
      if (second === undefined) continue;
      const chip = (id) => ({ id, chip: item.projects.indexOf(id), s: of.get(id) });
      return { k, itemId: item.id, first: chip(first), second: chip(second) };
    }
  throw new Error('aucune étoile ne cite deux projets de systèmes différents');
}

function findProject(projects, id) {
  for (const system of projects.systems) {
    const found = system.projects.find((project) => project.id === id);
    if (found) return found;
  }
  throw new Error(`projet « ${id} » absent des données`);
}

const widthCache = new Map();
/** Largeur du viewBox de Projets zoomé sur le système `s`, à `width` px. */
async function systemWidth(width, projects, s) {
  const key = `${width}/${s}`;
  if (widthCache.has(key)) return widthCache.get(key);
  const site = await openProjectsSite(width, { reduce: true });
  try {
    const found = projectParts(site);
    await zoomIn(site, sunOf(site, projects.fr, projects.fr.systems[s]), 'clic');
    widthCache.set(key, viewBoxOf(found.svg).w);
    return widthCache.get(key);
  } finally {
    site.close();
  }
}

/** Centre de la planète dans le repère du plan (null : plan non affiché). */
function planetPoint(site, planet) {
  const svg = projectParts(site).svg;
  const box = planet?.querySelector('.pl-body')?.getBoundingClientRect();
  const matrix = svg?.getScreenCTM();
  if (!box || !box.width || !matrix) return null;
  const point = new site.win.DOMPoint(box.x + box.width / 2, box.y + box.height / 2);
  return point.matrixTransform(matrix.inverse());
}

/** Distance de la caméra à la planète, en parts de la largeur (Infinity : non rendue). */
const offOf = (frame) => (frame.point
  ? Math.hypot(frame.point.x - frame.cx, frame.point.y - frame.cy) / frame.w
  : Infinity);

/** Clique la puce de `target` et relève une image par rAF jusqu'à l'ouverture de la fiche. */
async function trip(kit, target) {
  const { site } = kit;
  const planet = planetOf(site, findProject(kit.pd[kit.lang], target.id));
  const { svg } = projectParts(site);
  const frames = [];
  let on = true;
  const read = () => frames.push({
    ...viewBoxOf(svg),
    point: planetPoint(site, planet),
    sheet: sheetOpen(site),
  });
  const tick = () => {
    if (!on) return;
    read();
    site.rawFrame(tick);
  };
  read();
  site.rawFrame(tick);
  const chip = [...site.doc.querySelectorAll('#skill .related button')][target.chip];
  if (!chip) {
    on = false;
    throw new Error(`puce « Projets liés » de rang ${target.chip} absente`);
  }
  click(site, chip);
  await waitFor(() => sheetOpen(site), SHEET_WAIT[kit.real ? 'real' : 'still'], 'fiche')
    .catch(() => null);
  await sleep(150);
  on = false;
  return { frames, planet, project: findProject(kit.pd[kit.lang], target.id) };
}

const closeSheet = async (site) => {
  click(site, site.doc.getElementById('close'));
  await waitFor(() => !sheetOpen(site), 3000, 'fiche fermée');
  await projectsRest(site);
};

/** Étoile de la puce dans Compétences : déploiement neuf, saut sur l'étoile du parcours. */
async function reachStar(kit, pick) {
  await ready(kit, pick.k, 'clic', true);
  const at = idsOf(kit.site, kit.text, pick.k).indexOf(pick.itemId);
  if (at > 0) await jump(kit, pick.k, at, 'puce');
}

/** État de départ de Projets : premier projet ouvert puis fermé, ou zoom à la main. */
async function prepare(kit, pick, scenario) {
  const { site, lang } = kit;
  if (scenario === 'main') {
    await goTo(site, 'projects');
    const system = kit.pd[lang].systems[pick.first.s];
    await zoomIn(site, sunOf(site, kit.pd[lang], system), 'clic');
  } else {
    await reachStar(kit, pick);
    const first = await trip(kit, pick.first);
    if (!first.frames.some((f) => f.sheet)) throw new Error('première fiche non ouverte');
    pressEscape(site);
    await waitFor(() => !sheetOpen(site), 3000, 'première fiche fermée');
    await projectsRest(site);
  }
  await goTo(site, 'skills');
  await reachStar(kit, pick);
}

function cameraProblems(kit, run, want) {
  const last = run.frames.at(-1);
  const problems = [];
  const pct = offOf(last) * 100;
  const where = Number.isFinite(pct) ? `${pct.toFixed(0)} %` : 'hors du plan (non rendue)';
  need(
    problems,
    last.w <= TIGHT_SHARE * want,
    `caméra non serrée : largeur ${last.w.toFixed(0)} pour ${want.toFixed(0)} au système`,
  );
  return need(
    problems,
    offOf(last) <= CENTRE_SHARE,
    `planète du second projet à ${where} du centre du plan (largeur ${last.w.toFixed(0)})`,
  );
}

function sheetProblems(kit, run) {
  const opened = run.frames.find((f) => f.sheet);
  const wait = SHEET_WAIT[kit.real ? 'real' : 'still'];
  if (!opened) return [`fiche non ouverte ${wait} ms après la puce`];
  const problems = [];
  const title = textOf(kit.site.doc.getElementById('sTitle'));
  const wanted = plain(run.project.title);
  need(problems, title === wanted, `#sTitle « ${title} » au lieu de « ${wanted} »`);
  const off = offOf(opened) * 100;
  const where = Number.isFinite(off) ? `${off.toFixed(0)} %` : 'hors du plan';
  return need(
    problems,
    off <= CENTRE_SHARE * 100,
    `fiche ouverte alors que la planète est à ${where} du centre du plan ` +
      `(caméra de largeur ${opened.w.toFixed(0)})`,
  );
}

function closeProblems(kit, run) {
  const active = kit.site.doc.activeElement;
  return need(
    [],
    !!run.planet && active === run.planet,
    `focus sur ${describe(active)}, pas sur la planète du second projet`,
  );
}

async function tripCases(width, lang, datas, scenario, real) {
  const kit = await openKit(width, lang, datas, { reduce: !real });
  if (!kit) return;
  const { ctx, site } = kit;
  const tag = scenario === 'main' ? 'zoom à la main' : 'deux puces de suite';
  const names = {
    camera: `${tag} : la caméra rejoint la planète du second projet (autre système)`,
    sheet: `${tag} : la fiche du second projet s'ouvre à l'arrivée de la caméra`,
    close: `${tag} : fermeture, focus sur la planète du second projet`,
  };
  try {
    const pick = pickCross(datas.skills.fr, datas.projects.fr);
    const want = await systemWidth(width, datas.projects, pick.second.s);
    await prepare(kit, pick, scenario);
    const run = await trip(kit, pick.second);
    await test(ctx, names.camera, () => cameraProblems(kit, run, want));
    await test(ctx, names.sheet, () => sheetProblems(kit, run));
    if (!sheetOpen(site)) {
      skip(ctx, [names.close], 'la fiche ne s\'est pas ouverte');
      return;
    }
    await test(ctx, names.close, async () => {
      await closeSheet(site);
      return closeProblems(kit, run);
    });
  } catch (error) {
    skip(ctx, Object.values(names), error.message);
  } finally {
    site.close();
  }
}

// ---------- I3 : redimensionnement en plongée sur téléphone ----------

/** Plongée puis redimensionnements : nom masqué et rapport du plan à chaque largeur. */
async function resizeRows(kit) {
  const { site, text } = kit;
  await ready(kit, biggest(text), 'clic', true);
  const rows = [];
  for (const wide of RESIZES) {
    site.frame.style.width = `${wide}px`;
    await rest(site);
    scrollToPlan(site);
    const label = curStar(site)?.querySelector('text.name');
    const plan = parts(site).svg.getBoundingClientRect();
    const panel = parts(site).panel.getBoundingClientRect();
    rows.push({
      wide,
      share: label ? maskedShare(site, label) : 100,
      name: label ? textOf(label) : 'étoile courante absente',
      ratio: plan.height / plan.width,
      plan,
      panel,
    });
  }
  return rows;
}

function nameProblems(rows) {
  return rows.filter((row) => row.share > MASKED_MAX).map((row) =>
    `à ${row.wide} px, nom « ${row.name} » masqué à ${row.share.toFixed(0)} % (panneau dès ` +
    `${row.panel.top.toFixed(0)} px, plan jusqu'à ${row.plan.bottom.toFixed(0)} px)`);
}

function ratioProblems(rows) {
  return rows
    .filter((row) => Math.abs(row.ratio / PHONE_RATIO - 1) > RATIO_SLACK)
    .map((row) => `à ${row.wide} px, plan de ${row.plan.height.toFixed(0)} px de haut pour ` +
      `${row.plan.width.toFixed(0)} px de large (rapport ${row.ratio.toFixed(2)} au lieu de ` +
      `${PHONE_RATIO})`);
}

async function resizeCases(width, datas) {
  const kit = await openKit(width, 'fr', datas, { reduce: true });
  if (!kit) return;
  const { ctx, site } = kit;
  try {
    let rows = null;
    let failure = null;
    try {
      rows = await resizeRows(kit);
    } catch (error) {
      failure = [error.message];
    }
    const tag = `redimensionnement de ${width} à ${RESIZES.join(' puis ')} px`;
    await test(ctx, `${tag} : nom de l'étoile visible`, () => failure ?? nameProblems(rows));
    await test(ctx, `${tag} : hauteur du plan`, () => failure ?? ratioProblems(rows));
  } finally {
    site.close();
  }
}

// ---------- Lancement ----------

/**
 * Défauts de la revue D1 : en-tête de la fiche à 200 % (320 et 390 px), second projet lié dans
 * un autre système (390 et 1280 px), redimensionnement en plongée (390 px).
 */
export async function runSkillsReview(widths, mainWidth) {
  const datas = { skills: await skillsData(), projects: await projectsData() };
  for (const width of widths.filter((w) => FIT_WIDTHS.includes(w)))
    for (const lang of LANGS) await fitCases(width, lang, datas);
  for (const width of widths.filter((w) => TRIP_WIDTHS.includes(w)))
    for (const lang of LANGS)
      for (const scenario of ['puces', 'main'])
        await tripCases(width, lang, datas, scenario, width === mainWidth);
  if (widths.includes(390)) await resizeCases(390, datas);
}
