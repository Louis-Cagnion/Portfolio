/* Compétences (S8.B4), PROJETS LIÉS et lien Devpedia. Cas écrits avant le code (S8.C7).
Contrat DOM (README.md, groupe competences, à la livraison de C7) :
- `#skill .related button` : une puce par projet lié de l'étoile, texte = titre sans balise ;
- clic : saut vers `#projects` ; sous mouvement réel la caméra de `svg#systems` (viewBox) reste
  sur la vue d'ensemble tant que `html[data-warp]` est présent, part dès qu'il a disparu, va
  d'un seul mouvement jusqu'à la planète du projet, puis `#sheet` s'ouvre dès son arrivée
  (jamais pendant `html[data-warp]`, aucun délai fixe) ; sous mouvement réduit, ouverture
  immédiate, caméra déjà sur la planète ;
- fermeture (bouton, fond, un Échap) : focus sur la `.planet` du projet, caméra de retour sur
  le système, `#sysLayout.zfocus` gardé ; la fiche suit la bascule de langue ;
- lien Devpedia : `p` sous le plan, sur toute la largeur, `intro` + espace + `a[href]`
  (`target="_blank"`, `rel="noopener"`), tutoyée, lien en ligne exempté (checks.js:106-112).
Mesures : skills-focus-probe.js (étoiles) et projects-probe.js (Projets). Cas par site
(largeur, langue) : 5 au repos, puis 6 par parcours (7 sous mouvement réel, dont la fin du
saut), aux deux largeurs 390 et 1280 px. */
import { isInlineTextLink, overflowProblems, targetProblems } from './checks.js';
import { activeViews, click, describe, waitFor } from './harness.js';
import { switchTo } from './language.js';
import {
  categoryOf,
  IMMEDIATE_MS,
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
  cameraProblems,
  idsOf,
  jump,
  leave,
  need,
  ready,
  uncaught,
} from './skills-focus-probe.js';
import { openSkillsSite, parts, rest, skillsData, sleep, textOf } from './skills-probe.js';

const GROUP = 'Compétences';
const LANGS = ['fr', 'en'];
const WIDTHS = [390, 1280];
const REAL_SYSTEMS = [0, 3]; // systèmes joués en mouvement réel (les autres : réduit)
const CLOSERS = ['Échap', 'bouton', 'fond', 'Échap']; // fermeture jouée par système
const MOVE = 1e-4; // mouvement de caméra perceptible : part de la largeur
const STALL = 1e-3; // pas d'image sous lequel la caméra est à l'arrêt : part de la largeur
const STALL_MS = 100; // arrêt toléré hors du saut de rubrique
const EDGE = 0.15; // bords du mouvement (ease) exclus de la recherche d'arrêt
const WIDTH_SLACK = 0.002; // la largeur ne remonte pas de plus de cette part
const NEAR_SLACK = 0.03; // la distance au projet ne remonte pas de plus de cette part
const TIGHT_SHARE = 0.7; // largeur finale / largeur du système : au plus
const CENTRE_SHARE = 0.12; // planète à moins de cette part de la largeur du centre du plan
const BACK_SHARE = 0.005; // caméra de retour égale à celle du système à 0,5 % près
const SHEET_WAIT = { real: 8000, still: 1500 };
const WARP_STILL = 0.001; // caméra encore sur la vue d'ensemble pendant le saut : part de w
const START_MS = 400; // la caméra part au plus 400 ms après la fin de html[data-warp]
const OPEN_MS = 400; // la fiche s'ouvre au plus 400 ms après l'arrivée de la caméra

// ---------- Choix des projets et caméra de référence ----------

/** Rang (système) → { k, itemId, projectId, chip } : première étoile qui cite un projet. */
function pickFor(skills, projects, s) {
  const mine = new Set(projects.systems[s].projects.map((project) => project.id));
  for (const [k, group] of skills.groups.entries())
    for (const item of group.items) {
      const chip = item.projects.findIndex((id) => mine.has(id));
      if (chip >= 0) return { k, itemId: item.id, projectId: item.projects[chip], chip, s };
    }
  return null;
}

const viewBoxOf = (svg) => {
  const [x, y, w, h] = (svg?.getAttribute('viewBox') ?? '0 0 0 0').split(/\s+/).map(Number);
  return { cx: x + w / 2, cy: y + h / 2, w, h };
};

const camerasCache = new Map();
/** Caméra d'ensemble et caméra de chaque système zoomé au soleil, à `width` px. */
async function referenceCameras(width, projects) {
  if (camerasCache.has(width)) return camerasCache.get(width);
  const site = await openProjectsSite(width, { reduce: true });
  try {
    const found = projectParts(site);
    const out = { overview: viewBoxOf(found.svg), systems: [] };
    for (const system of projects.fr.systems) {
      await zoomIn(site, sunOf(site, projects.fr, system), 'clic');
      out.systems.push(viewBoxOf(found.svg));
      click(site, found.back);
      await waitFor(() => !found.layout.classList.contains('zfocus'), 3000, 'retour');
      await projectsRest(site);
    }
    camerasCache.set(width, out);
    return out;
  } finally {
    site.close();
  }
}

// ---------- Puces et fiche ----------

const relatedChips = (site) => [...site.doc.querySelectorAll('#skill .related button')];
const sheetText = (site, id) => textOf(site.doc.getElementById(id));

/** Un clic sur chaque puce de chaque étoile : une puce par projet existant, sans balise. */
async function chipProblems(kit, pd) {
  const { site, text, lang } = kit;
  const problems = [];
  for (const [k, group] of text.groups.entries()) {
    await ready(kit, k, 'clic', true);
    const ids = idsOf(site, text, k);
    for (const [at, id] of ids.entries()) {
      if (at > 0) await jump(kit, k, at, 'puce');
      const item = group.items.find((each) => each.id === id);
      const wanted = item.projects.map((pid) => plain(findProject(pd[lang], pid).title));
      const chips = relatedChips(site);
      const label = `${group.id}/${id}`;
      const names = chips.map((chip) => textOf(chip));
      if (JSON.stringify(names) !== JSON.stringify(wanted))
        problems.push(`${label} : puces [${names}] au lieu de [${wanted}]`);
      if (chips.some((chip) => chip.querySelector('*') || /[<>]/.test(chip.textContent)))
        problems.push(`${label} : balise dans une puce`);
      if (problems.length > 4) break;
    }
    await leave(site, text);
    if (problems.length > 4) break;
  }
  return problems.slice(0, 6);
}

function findProject(projects, id) {
  for (const system of projects.systems) {
    const found = system.projects.find((project) => project.id === id);
    if (found) return found;
  }
  throw new Error(`projet « ${id} » absent des données`);
}

// ---------- Parcours : images relevées pendant le clic sur une puce ----------

/** Position du centre de la planète dans le repère du plan (null : plan non affiché). */
function planetPoint(site, planet) {
  const svg = projectParts(site).svg;
  const box = planet?.querySelector('.pl-body')?.getBoundingClientRect();
  const matrix = svg?.getScreenCTM();
  if (!box || !box.width || !matrix) return null;
  const point = new site.win.DOMPoint(box.x + box.width / 2, box.y + box.height / 2);
  return point.matrixTransform(matrix.inverse());
}

/** Clique la puce et relève une image par requestAnimationFrame jusqu'à la fiche. */
async function trip(kit, pick, real) {
  const { site } = kit;
  const project = findProject(kit.pd[kit.lang], pick.projectId);
  const planet = planetOf(site, project);
  const root = site.doc.documentElement;
  const frames = [];
  let on = true;
  const { svg } = projectParts(site);
  const read = () => {
    const point = planetPoint(site, planet);
    const cam = viewBoxOf(svg);
    frames.push({
      at: site.win.performance.now(),
      ...cam,
      point,
      warp: root.hasAttribute('data-warp'),
      view: activeViews(site)[0]?.id,
      sheet: sheetOpen(site),
    });
  };
  const tick = () => {
    if (!on) return;
    read();
    site.rawFrame(tick);
  };
  read();
  site.rawFrame(tick);
  const start = site.win.performance.now();
  const chip = relatedChips(site)[pick.chip];
  if (!chip) {
    on = false;
    throw new Error(`puce « Projets liés » de rang ${pick.chip} absente`);
  }
  click(site, chip);
  await waitFor(() => sheetOpen(site), SHEET_WAIT[real ? 'real' : 'still'], 'fiche ouverte')
    .catch(() => null);
  await sleep(150);
  on = false;
  return { frames, start, project };
}

const gap = (a, b) => b.at - a.at;
const stepOf = (a, b) => Math.max(
  Math.abs(b.cx - a.cx),
  Math.abs(b.cy - a.cy),
  Math.abs(b.w - a.w),
);

/** Saut vers Projets : arrivée sur #projects, hash. */
function jumpProblems(kit, run) {
  const { site } = kit;
  const arrived = run.frames.find((f) => f.view === 'projects' && !f.warp);
  return need(
    need([], !!arrived, 'aucune image sur #projects une fois html[data-warp] retiré'),
    site.win.location.hash === '#projects',
    `location.hash ${site.win.location.hash} au lieu de #projects`,
  );
}

/** Caméra : d'un seul mouvement, de la vue d'ensemble à la planète, sans arrêt. */
function cameraProblemsOf(kit, run, cams, s) {
  const { frames } = run;
  const [first, last] = [frames[0], frames.at(-1)];
  const problems = cameraProblems('départ', first, cams.overview, BACK_SHARE, ['w']);
  const unit = cams.overview.w;
  need(
    problems,
    last.w <= TIGHT_SHARE * cams.systems[s].w,
    `caméra non serrée : largeur ${last.w.toFixed(0)} pour ` +
      `${cams.systems[s].w.toFixed(0)} au système`,
  );
  const frame = projectParts(kit.site).svg.getBoundingClientRect();
  const off = last.point
    ? Math.hypot(last.point.x - last.cx, last.point.y - last.cy) / last.w
    : Infinity;
  const pct = (off * 100).toFixed(0);
  need(
    problems,
    off <= CENTRE_SHARE,
    `planète à ${pct} % du centre du plan (cadre ${frame.width.toFixed(0)} px)`,
  );
  if (!kit.real) return problems;
  const moving = frames.map((f, i) => i > 0 && stepOf(frames[i - 1], f) > MOVE * f.w);
  const [from, to] = [moving.indexOf(true), moving.lastIndexOf(true)];
  if (from < 0) return [...problems, 'caméra immobile pendant le parcours'];
  let near = null;
  for (let i = from; i <= to; i++) {
    const [a, b] = [frames[i - 1], frames[i]];
    if (b.w > a.w + WIDTH_SLACK * unit)
      problems.push(
        `largeur qui remonte à l'image ${i} : ${a.w.toFixed(0)} puis ${b.w.toFixed(0)}`,
      );
    const dist = b.point ? Math.hypot(b.point.x - b.cx, b.point.y - b.cy) : null;
    if (near !== null && dist !== null && dist > near + NEAR_SLACK * unit)
      problems.push(`centre qui s'éloigne de la planète à l'image ${i}`);
    if (dist !== null) near = dist;
  }
  return [...problems.slice(0, 4), ...stallProblems(frames, from, to)];
}

/** Arrêt de plus de STALL_MS hors du saut de rubrique, bords du mouvement exclus. */
function stallProblems(frames, from, to) {
  const t0 = frames[from].at;
  const span = frames[to].at - t0;
  let run = null;
  for (let i = from + 1; i <= to; i++) {
    const [a, b] = [frames[i - 1], frames[i]];
    const inside = a.at >= t0 + EDGE * span && b.at <= t0 + (1 - EDGE) * span;
    const still = inside && !a.warp && !b.warp && stepOf(a, b) <= STALL * b.w;
    run = still ? { from: run?.from ?? a.at, to: b.at } : null;
    if (run && run.to - run.from > STALL_MS)
      return [`caméra à l'arrêt ${(run.to - run.from).toFixed(0)} ms (image ${i}) : palier`];
  }
  return [];
}

/**
 * Fin du saut (mouvement réel) : ni fiche ni mouvement de caméra tant que `html[data-warp]`
 * est présent, la caméra part dès qu'il a disparu, la fiche s'ouvre dès son arrivée.
 */
function warpProblems(run) {
  const { frames } = run;
  const warps = frames.filter((f) => f.warp);
  if (!warps.length) return ['aucune image avec html[data-warp] : pas de saut vers Projets'];
  const [first, final, end] = [frames[0], frames.at(-1), warps.at(-1).at];
  const problems = [];
  const early = warps.find((f) => stepOf(first, f) > WARP_STILL * f.w);
  if (early)
    problems.push(
      `caméra partie ${(end - early.at).toFixed(0)} ms avant la fin de html[data-warp]`,
    );
  const sheet = frames.find((f) => f.sheet);
  need(problems, !sheet || sheet.at > end, 'fiche ouverte avant la fin de html[data-warp]');
  const start = frames.find((f) => !f.warp && stepOf(first, f) > WARP_STILL * f.w);
  if (start)
    need(
      problems,
      start.at - end <= START_MS,
      `caméra partie ${(start.at - end).toFixed(0)} ms après la fin de html[data-warp]`,
    );
  const arrival = frames.find((f) => stepOf(f, final) <= BACK_SHARE * final.w);
  if (sheet && arrival)
    need(
      problems,
      sheet.at - arrival.at <= OPEN_MS,
      `fiche ouverte ${(sheet.at - arrival.at).toFixed(0)} ms après l'arrivée de la caméra`,
    );
  return problems;
}

/** Fiche : bon projet, ouverte à l'arrivée du saut (fin de data-warp), caméra arrivée. */
function sheetProblems(kit, run, pick) {
  const { site, text } = kit;
  const { frames, project } = run;
  const opened = frames.find((f) => f.sheet);
  const wait = SHEET_WAIT[kit.real ? 'real' : 'still'];
  if (!opened) return [`fiche non ouverte ${wait} ms après le clic`];
  const system = text.projects.systems[pick.s];
  const problems = [];
  const title = sheetText(site, 'sTitle');
  const wanted = plain(project.title);
  need(problems, title === wanted, `#sTitle « ${title} » au lieu de « ${wanted} »`);
  const cat = sheetText(site, 'sCat');
  need(
    problems,
    cat === categoryOf(text.projects, system),
    `#sCat « ${cat} » au lieu de « ${categoryOf(text.projects, system)} »`,
  );
  need(problems, !opened.warp, 'fiche ouverte avant la fin de html[data-warp]');
  need(problems, opened.view === 'projects', `fiche ouverte sur #${opened.view}`);
  const final = frames.at(-1);
  const moved = Math.max(
    Math.abs(final.cx - opened.cx),
    Math.abs(final.cy - opened.cy),
    Math.abs(final.w - opened.w),
  );
  if (kit.real)
    need(problems, moved <= BACK_SHARE * final.w, 'fiche ouverte avant la fin du mouvement');
  else
    need(
      problems,
      opened.at - run.start <= 2 * IMMEDIATE_MS,
      `fiche ouverte ${(opened.at - run.start).toFixed(0)} ms après le clic sous mouvement ` +
        'réduit',
    );
  return problems;
}

// ---------- Fermeture et langue ----------

/** Ferme la fiche par `how` (bouton, fond, Échap : une seule fois) puis attend le repos. */
async function closeBy(site, how) {
  const doc = site.doc;
  if (how === 'bouton') click(site, doc.getElementById('close'));
  else if (how === 'fond') click(site, doc.getElementById('sheetBg'));
  else pressEscape(site);
  await waitFor(() => !sheetOpen(site), 3000, `fiche fermée par ${how}`);
  await projectsRest(site);
}

function closeProblems(kit, run, cams, s) {
  const { site } = kit;
  const found = projectParts(site);
  const planet = planetOf(site, run.project);
  const problems = [];
  const active = site.doc.activeElement;
  need(
    problems,
    !!planet && active === planet,
    `focus sur ${describe(active)}, pas sur la planète`,
  );
  need(problems, found.layout.classList.contains('zfocus'), 'zoom du système quitté');
  need(problems, !!found.svg.querySelector('.sys.on'), 'aucun système zoomé');
  return [
    ...problems,
    ...cameraProblems(
      'retour sur le système',
      viewBoxOf(found.svg),
      cams.systems[s],
      BACK_SHARE,
      ['cx', 'cy', 'w'],
    ),
  ];
}

/** Bascule de langue fiche ouverte : même projet, titre et catégorie de l'autre langue. */
async function languageProblems(kit, pick) {
  const { site, lang, pd } = kit;
  const other = lang === 'fr' ? 'en' : 'fr';
  await switchTo(site, other);
  await sleep(150);
  const project = findProject(pd[other], pick.projectId);
  const system = pd[other].systems[pick.s];
  const problems = [];
  need(problems, sheetOpen(site), 'fiche fermée par la bascule de langue');
  const title = sheetText(site, 'sTitle');
  need(
    problems,
    title === plain(project.title),
    `#sTitle « ${title} » au lieu de « ${plain(project.title)} »`,
  );
  const cat = sheetText(site, 'sCat');
  need(
    problems,
    cat === categoryOf(pd[other], system),
    `#sCat « ${cat} » au lieu de « ${categoryOf(pd[other], system)} »`,
  );
  await switchTo(site, lang);
  await sleep(150);
  return problems;
}

// ---------- Lien Devpedia ----------

/** Lien Devpedia : le `a` du href des données dans un `p` de la rubrique. */
function devpediaOf(site, link) {
  const { root } = parts(site);
  const anchor = [...(root?.querySelectorAll('a') ?? [])]
    .find((el) => el.getAttribute('href') === link.href) ?? null;
  return { anchor, para: anchor?.closest('p') ?? null };
}

function devpediaProblems(kit) {
  const { site, text, lang } = kit;
  const { anchor, para } = devpediaOf(site, text.link);
  if (!anchor) return [`lien Devpedia (href ${text.link.href}) introuvable dans #skills`];
  const problems = [];
  const plan = parts(site).svg.getBoundingClientRect();
  const box = para?.getBoundingClientRect();
  need(problems, !!para, 'lien Devpedia hors d\'un p');
  if (!para) return problems;
  const sentence = `${text.link.intro} ${text.link.label}`;
  need(
    problems,
    textOf(para).startsWith(sentence),
    `phrase « ${textOf(para).slice(0, 40)} » au lieu de « ${sentence.slice(0, 40)} »`,
  );
  need(problems, textOf(anchor) === text.link.label, `lien « ${textOf(anchor)} »`);
  need(problems, box.top >= plan.bottom - 1, 'phrase au-dessus du bas du plan');
  const layout = parts(site).layout.getBoundingClientRect();
  need(
    problems,
    box.width >= layout.width - 2 && Math.abs(box.left - layout.left) <= 2,
    `phrase large de ${box.width.toFixed(0)} px pour ${layout.width.toFixed(0)} px de page`,
  );
  if (lang === 'fr')
    need(
      problems,
      /\btu\b/i.test(text.link.intro) && !/\bvous\b/i.test(text.link.intro),
      `phrase non tutoyée : « ${text.link.intro} »`,
    );
  return problems;
}

function devpediaLinkProblems(kit) {
  const { anchor } = devpediaOf(kit.site, kit.text.link);
  if (!anchor) return ['lien Devpedia introuvable'];
  const problems = [];
  need(problems, anchor.getAttribute('target') === '_blank', 'target différent de "_blank"');
  const rel = (anchor.getAttribute('rel') ?? '').split(/\s+/);
  need(problems, rel.includes('noopener'), `rel="${anchor.getAttribute('rel') ?? ''}"`);
  return problems;
}

function devpediaFitProblems(kit) {
  const { site } = kit;
  const { anchor, para } = devpediaOf(site, kit.text.link);
  if (!anchor) return ['lien Devpedia introuvable'];
  const problems = [...overflowProblems(site)];
  const sized = targetProblems(site, [para]);
  problems.push(...sized.problems);
  need(problems, isInlineTextLink(site, anchor), 'lien non exempté : pas un lien en ligne');
  const box = para.getBoundingClientRect();
  need(
    problems,
    box.left >= 0 && box.right <= site.win.innerWidth,
    'phrase hors de la fenêtre',
  );
  return problems;
}

// ---------- Lancement ----------

async function openKit(width, lang, datas, real) {
  const ctx = { group: GROUP, section: 'skills', width, lang };
  try {
    const site = await openSkillsSite(width, { lang, reduce: !real });
    const kit = { site, ctx, text: datas.skills[lang], width, lang, real, pd: datas.projects };
    kit.text = { ...kit.text, projects: datas.projects[lang] };
    return kit;
  } catch (error) {
    skip(ctx, ['ouverture du site sur Compétences'], `ouverture : ${error.message}`);
    return null;
  }
}

/** Cas sans déploiement (lien Devpedia) puis cas des puces, sur un site au repos. */
async function restCases(width, lang, datas) {
  const kit = await openKit(width, lang, datas, false);
  if (!kit) return;
  const { ctx, site } = kit;
  try {
    await rest(site);
    await test(
      ctx,
      'lien Devpedia : phrase tutoyée sous le plan, sur toute la largeur',
      () => devpediaProblems(kit),
    );
    await test(
      ctx,
      'lien Devpedia : target="_blank" et rel="noopener"',
      () => devpediaLinkProblems(kit),
    );
    await test(
      ctx,
      'lien Devpedia : aucun débordement, lien en ligne exempté',
      () => devpediaFitProblems(kit),
    );
    await test(
      ctx,
      'projets liés : une puce par projet existant, titre sans balise',
      () => chipProblems(kit, datas.projects),
    );
    await test(ctx, 'aucune exception non rattrapée', () => uncaught(site));
  } finally {
    site.close();
  }
}

/** Parcours d'une puce vers la fiche du système `s`, fermeture, bascule de langue. */
async function tripCases(width, lang, datas, s, real) {
  const kit = await openKit(width, lang, datas, real);
  if (!kit) return;
  const { ctx, site } = kit;
  const pick = pickFor(datas.skills.fr, datas.projects.fr, s);
  const closer = CLOSERS[s];
  const tag = `système ${s}`;
  try {
    const cams = await referenceCameras(width, datas.projects);
    let run = null;
    await test(ctx, `${tag} : la puce saute vers Projets`, async () => {
      await ready(kit, pick.k, 'clic', true);
      const ids = idsOf(site, kit.text, pick.k);
      await jump(kit, pick.k, ids.indexOf(pick.itemId), 'puce');
      run = await trip(kit, pick, real);
      return jumpProblems(kit, run);
    });
    const names = {
      camera: `${tag} : caméra d'un seul mouvement jusqu'à la planète`,
      warp: `${tag} : caméra et fiche attendent la fin de html[data-warp]`,
      sheet: `${tag} : fiche du bon projet ouverte à l'arrivée`,
      lang: `${tag} : bascule de langue fiche ouverte, même projet`,
      close: `${tag} : fermeture par ${closer}, focus sur la planète, zoom gardé`,
    };
    if (!real) delete names.warp; // sous mouvement réduit, aucun saut animé
    if (!run) {
      skip(ctx, Object.values(names), 'la puce n\'a pas pu être cliquée');
      return;
    }
    await test(ctx, names.camera, () => cameraProblemsOf(kit, run, cams, s));
    if (real) await test(ctx, names.warp, () => warpProblems(run));
    await test(ctx, names.sheet, () => sheetProblems(kit, run, pick));
    if (!sheetOpen(site)) {
      skip(ctx, [names.lang, names.close], 'la fiche ne s\'est pas ouverte');
      return;
    }
    await test(ctx, names.lang, () => languageProblems(kit, pick));
    await test(ctx, names.close, async () => {
      await closeBy(site, closer);
      return closeProblems(kit, run, cams, s);
    });
    await test(ctx, 'aucune exception non rattrapée', () => uncaught(site));
  } finally {
    site.close();
  }
}

const real = (s, width, mainWidth) => REAL_SYSTEMS.includes(s) || width === mainWidth;

/**
 * Projets liés et lien Devpedia à 390 et 1280 px, français et anglais : cas au repos, puis un
 * parcours par système de Projets (mouvement réel pour deux d'entre eux).
 */
export async function runSkillsRelated(widths, mainWidth) {
  const datas = { skills: await skillsData(), projects: await projectsData() };
  for (const width of widths.filter((w) => WIDTHS.includes(w)))
    for (const lang of LANGS) {
      await restCases(width, lang, datas);
      for (const s of datas.projects.fr.systems.keys())
        await tripCases(width, lang, datas, s, real(s, width, mainWidth));
    }
}
