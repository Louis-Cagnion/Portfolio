/* Rubrique Projets (S6). Contrat DOM (plan.md:123 et :159, docs/design/s6/mockup.*) :
- js/sections/projects.js monte la rubrique réelle dans section.view#projects (main.js) ; la
  fiche s'ouvre par le vrai module js/ui/sheet.js (#sheet, #sTitle, #sCat, #close) ;
- #sysLayout (classe zfocus pendant un zoom) contient .sys-head (.back, .ctitle, .count) et
  svg#systems ; .intro-c (frère suivant de #sysLayout) porte l'intro du système zoomé ;
- soleils : .sun-btn[role=button][tabindex=0][aria-label=projects.approach], un par système ;
- planètes : .planet[role=button][tabindex=0][aria-label=titre brut du projet], dans
  svg#systems ;
- liste : élément [aria-label=projects.listLabel] (classe plist) de boutons natifs, un par
  projet, nommés par le titre ; visible au repos, masquée pendant un zoom ;
- zoom : clic, Entrée ou Espace sur un soleil ; les autres systèmes (soleil et planètes) ne
  sont plus visibles ; .sys-head affiche retour (projects.back), nom du système et compte
  (projects.count) ; intro sous le plan sur toute la largeur de #sysLayout, seulement zoomé ;
  Échap (fiche fermée) ou .back sortent du zoom, focus rendu au soleil ; Échap avec fiche
  ouverte ne ferme que la fiche, focus rendu à l'origine (planète ou entrée de la liste) ;
- bureau (plus de 880 px) : quatre soleils deux par deux au repos ;
- langue : la bascule garde le système zoomé, la fiche ouverte (update(view), mêmes nœuds) et
  le focus ; mouvement réduit lu par matchMedia (stubMotion de warp.js) : zoom et sortie
  immédiats ; une seule boucle requestAnimationFrame, demandée depuis js/sections/projects*.js.
Cas par site (largeur, langue) ; le mouvement est réduit hors de la largeur principale pour
tenir le temps de la suite (zoom animé joué à la largeur principale). Entrée sur un bouton
natif de la liste ne se simule pas (activation native) : on exige un `button`, on clique. */
import { overflowProblems, targetProblems } from './checks.js';
import { describe, isVisible, waitFor } from './harness.js';
import { normalize } from './text.js';
import { recordExceptions, skip, test } from './runner.js';
import {
  approachOf,
  countOf,
  ficheCycle,
  gate,
  isZoomed,
  labelOf,
  listOf,
  openProjectsSite,
  parts,
  planetEls,
  planetOf,
  plain,
  pressEscape,
  projectsData,
  rest,
  suns,
  sunOf,
  visibleText,
  zoomIn,
} from './projects-probe.js';
import { runLoops, runReducedMotion } from './projects-motion.js';
import { runPhonePiscine } from './projects-phone.js';
import { runSwitch } from './projects-lang.js';

export const GROUP = 'Projets';
const DESKTOP_MIN = 881; // plus de 55em (880 px) : bureau, quatre systèmes deux par deux
const PHONE_MAX = 430;
const TOLERANCE = 2;
const GRID_TOLERANCE = 8; // px d'écart admis entre soleils alignés
const LANGS = ['fr', 'en'];

const uncaught = (site) => site.uncaught.map((e) => `exception non rattrapée : ${e}`);
const rect = (el) => el.getBoundingClientRect();

// ---------- Repos ----------

/** Un élément par entrée : mêmes éléments que les données, aucun absent, aucun en trop. */
function namesProblems(label, found, wanted) {
  const problems = [];
  for (const name of wanted)
    if (!found.includes(name)) problems.push(`${label} « ${name} » absent`);
  if (found.length !== wanted.length)
    problems.push(`${label} : ${found.length} trouvé(s) pour ${wanted.length} attendu(s)`);
  return problems.slice(0, 8);
}

function focusProblems(site, elements) {
  const problems = [];
  for (const el of elements) {
    el.focus();
    if (site.doc.activeElement !== el) problems.push(`${describe(el)} non focalisable`);
    if (el.getAttribute('role') !== 'button') problems.push(`${describe(el)} : role≠button`);
  }
  site.doc.activeElement?.blur();
  return problems.slice(0, 8);
}

function restStateProblems(site, text) {
  const { head, intro, root } = parts(site);
  const problems = [];
  if (isZoomed(site)) problems.push('zfocus présent au repos');
  if (isVisible(head)) problems.push('.sys-head visible au repos');
  if (isVisible(intro)) problems.push('.intro-c visible au repos');
  const list = listOf(site, text);
  if (!list || !isVisible(list)) problems.push('liste masquée ou absente au repos');
  const hidden = suns(site).filter((s) => !isVisible(s));
  if (hidden.length) problems.push(`soleils non visibles : ${hidden.map(describe)}`);
  const lost = planetEls(site).filter((p) => !isVisible(p));
  if (lost.length) problems.push(`${lost.length} planète(s) non visible(s) au repos`);
  const shown = visibleText(site, root).toLowerCase();
  for (const system of site.systems)
    if (shown.includes(plain(system.intro).toLowerCase().slice(0, 40)))
      problems.push(`intro de ${system.name} visible au repos`);
  return problems;
}

/** Bureau : soleils sur deux colonnes et deux lignes, dans l'ordre des systèmes. */
function gridProblems(site) {
  const points = suns(site).map((sun) => {
    const box = rect(sun);
    return [box.x + box.width / 2, box.y + box.height / 2];
  });
  const near = (a, b) => Math.abs(a - b) <= GRID_TOLERANCE;
  if (points.length !== 4) return [`${points.length} soleils au lieu de 4`];
  const [a, b, c, d] = points;
  const problems = [];
  if (!near(a[1], b[1]) || !near(c[1], d[1])) problems.push('pas deux lignes de soleils');
  if (!near(a[0], c[0]) || !near(b[0], d[0])) problems.push('pas deux colonnes de soleils');
  if (!(a[0] < b[0] && a[1] < c[1])) problems.push('ordre des systèmes : deux par deux');
  return problems;
}

async function restTests(site, ctx, text, systems) {
  const names = systems.flatMap((s) => s.projects.map((p) => plain(p.title)));
  const counts = systems.map((s) => s.projects.length).join(', ');
  await test(ctx, 'quatre soleils : boutons focalisables nommés par projects.approach', () => {
    const missing = gate(site);
    if (missing.length) return missing;
    const found = suns(site);
    const wanted = systems.map((s) => approachOf(text, s));
    return [
      ...namesProblems('soleil', found.map(labelOf), wanted),
      ...focusProblems(site, found),
    ];
  });
  await test(ctx, `planètes : une par projet (${counts}), focalisables, nommées par le titre`,
    () => {
      const missing = gate(site);
      if (missing.length) return missing;
      const found = planetEls(site);
      return [
        ...namesProblems('planète', found.map(labelOf), names),
        ...focusProblems(site, found),
      ];
    });
  const listName = `liste : une entrée cliquable par projet (${names.length}), nommée`;
  await test(ctx, `${listName} par le titre`,
    () => {
      const list = listOf(site, text);
      if (!list) return [`liste [aria-label="${text.listLabel}"] introuvable`];
      const entries = [...list.querySelectorAll('button')];
      const shown = entries.map((b) => normalize(b.textContent));
      const problems = namesProblems('entrée', shown, names);
      for (const entry of entries)
        if (entry.disabled || !isVisible(entry))
          problems.push(`${describe(entry)} inutilisable`);
      return problems.slice(0, 8);
    });
  await test(ctx, 'repos : en-tête, intro absentes, liste et systèmes visibles', () => {
    const missing = gate(site);
    return missing.length ? missing : restStateProblems(site, text);
  });
  if (ctx.width >= DESKTOP_MIN)
    await test(ctx, 'bureau : quatre systèmes deux par deux au repos', () => {
      const missing = gate(site);
      return missing.length ? missing : gridProblems(site);
    });
}

// ---------- Mesures communes ----------

async function layoutTests(site, ctx, state) {
  await test(ctx, `${state} : aucun débordement horizontal`, () => {
    const missing = gate(site);
    return missing.length ? missing : overflowProblems(site);
  });
  await test(ctx, `${state} : cibles de 44 px (exceptions de la maquette)`, () => {
    const missing = gate(site);
    if (missing.length) return missing;
    const scopes = [parts(site).root, site.doc.getElementById('sheet')];
    const { problems, exceptions } = targetProblems(site, scopes);
    recordExceptions(ctx, exceptions);
    return problems;
  });
}

// ---------- Fiche depuis la liste ----------

async function listTests(site, ctx, text, systems) {
  const longest = (system) => system.projects
    .reduce((a, b) => (JSON.stringify(b).length > JSON.stringify(a).length ? b : a));
  const name = 'liste : un clic ouvre la fiche (un projet par système), focus rendu';
  await test(ctx, name, async () => {
    const list = listOf(site, text);
    if (!list) return ['liste introuvable'];
    const problems = [];
    for (const system of systems) {
      const project = longest(system);
      const entry = [...list.querySelectorAll('button')]
        .find((b) => normalize(b.textContent) === plain(project.title));
      if (!entry) {
        problems.push(`entrée « ${plain(project.title)} » absente`);
        continue;
      }
      const context = { text, system, project };
      problems.push(...await ficheCycle(site, context, entry, 'clic', false));
    }
    return problems;
  });
  const opened = 'fiche ouverte depuis la liste : débordement et cibles de 44 px';
  await test(ctx, opened, async () => {
    const list = listOf(site, text);
    const system = systems.at(-1);
    const project = longest(system);
    const entry = [...(list?.querySelectorAll('button') ?? [])]
      .find((b) => normalize(b.textContent) === plain(project.title));
    if (!entry) return ['entrée de la liste introuvable'];
    entry.click();
    await waitFor(() => !site.doc.getElementById('sheet')?.inert, 2500, 'fiche ouverte');
    await rest(site);
    const problems = overflowProblems(site);
    const scopes = [parts(site).root, site.doc.getElementById('sheet')];
    const found = targetProblems(site, scopes);
    recordExceptions(ctx, found.exceptions);
    pressEscape(site);
    await waitFor(() => site.doc.getElementById('sheet')?.inert, 3000, 'fiche fermée');
    return [...problems, ...found.problems];
  });
}

// ---------- Zoom ----------

/** État zoomé sur `system` (rang `index`) : autres systèmes masqués, en-tête, intro, liste. */
function zoomProblems(site, text, systems, index) {
  const { layout, svg, head, back, title, count, intro } = parts(site);
  const system = systems[index];
  const problems = [];
  if (!isZoomed(site)) return ['#sysLayout sans zfocus'];
  if (!isVisible(head)) problems.push('.sys-head non visible');
  if (!back || !normalize(back.textContent).includes(text.back))
    problems.push(`.back : « ${back?.textContent.trim()} » sans « ${text.back} »`);
  if (!title || !normalize(title.textContent).includes(system.name))
    problems.push(`.ctitle : « ${title?.textContent.trim()} » sans « ${system.name} »`);
  const wanted = countOf(text, system.projects.length);
  if (normalize(count?.textContent ?? '') !== wanted)
    problems.push(`.count : « ${count?.textContent.trim()} » au lieu de « ${wanted} »`);
  systems.forEach((other, k) => {
    const sun = sunOf(site, text, other);
    const own = other.projects.map((p) => planetOf(site, p));
    const shown = [sun, ...own].filter((el) => isVisible(el)).length;
    if (k === index && shown !== own.length + 1)
      problems.push(`${other.name} : ${shown} éléments visibles sur ${own.length + 1}`);
    if (k !== index && shown)
      problems.push(`${other.name} : ${shown} élément(s) encore visible(s)`);
  });
  const list = listOf(site, text);
  if (list && isVisible(list)) problems.push('liste visible pendant le zoom');
  if (!intro || !isVisible(intro)) return [...problems, '.intro-c absente ou non visible'];
  if (normalize(intro.textContent) !== plain(system.intro))
    problems.push(`intro : « ${normalize(intro.textContent).slice(0, 40)} » inattendue`);
  if (rect(intro).top < rect(svg).bottom - 1) problems.push('intro au-dessus du bas du plan');
  const area = rect(layout);
  if (Math.abs(rect(intro).left - area.left) > TOLERANCE ||
    rect(intro).width < area.width - TOLERANCE)
    problems.push(`intro de ${rect(intro).width.toFixed(0)} px pour ${area.width.toFixed(0)}`);
  for (const other of systems.filter((s) => s !== system))
    if (visibleText(site, parts(site).root).includes(plain(other.intro).slice(0, 40)))
      problems.push(`intro de ${other.name} visible`);
  return problems;
}

/** Sortie du zoom par Échap ou par le bouton retour : repos, focus au soleil. */
async function exitProblems(site, text, systems, index, how) {
  const sun = sunOf(site, text, systems[index]);
  if (how === 'Échap') pressEscape(site);
  else parts(site).back?.click();
  const problems = [];
  try {
    await waitFor(() => !isZoomed(site), 3000, 'sortie du zoom (zfocus retirée)');
    await waitFor(() => site.doc.activeElement === sun, 4000, 'focus rendu au soleil');
  } catch (error) {
    problems.push(`${error.message} (focus sur ${describe(site.doc.activeElement)})`);
  }
  await rest(site);
  return [...problems, ...restStateProblems(site, text)];
}

async function planetFiches(site, text, systems, index) {
  const system = systems[index];
  const first = system.projects[0];
  const last = system.projects.at(-1);
  const problems = [];
  for (const [project, how] of [[first, 'clic'], [last, 'Entrée'], [last, 'Espace']]) {
    const origin = planetOf(site, project);
    if (!origin) problems.push(`planète « ${plain(project.title)} » absente`);
    else {
      const context = { text, system, project };
      problems.push(...await ficheCycle(site, context, origin, how, true));
    }
  }
  return problems;
}

async function systemFlow(site, ctx, text, systems, index) {
  const system = systems[index];
  const at = `zoom ${system.name}`;
  const sunOfSystem = () => sunOf(site, text, system);
  const zoomed = (name, fn) => test(ctx, `${at} : ${name}`, () => (
    isZoomed(site) ? fn() : ['non joué : système non zoomé']
  ));
  const state = `${at} (clic) : autres systèmes masqués, en-tête, intro, liste`;
  await test(ctx, state, async () => {
    const missing = gate(site);
    if (missing.length) return missing;
    if (!sunOfSystem()) return [`soleil de ${system.name} introuvable`];
    await zoomIn(site, sunOfSystem(), 'clic');
    return zoomProblems(site, text, systems, index);
  });
  if (system.id === 'piscine' && ctx.width <= PHONE_MAX)
    await runPhonePiscine(site, ctx, { text, system });
  await zoomed('aucun débordement horizontal', () => overflowProblems(site));
  await zoomed('cibles de 44 px (exceptions de la maquette)', () => {
    const found = targetProblems(site, [parts(site).root]);
    recordExceptions(ctx, found.exceptions);
    return found.problems;
  });
  await zoomed('planète : clic, Entrée et Espace ouvrent la bonne fiche, Échap garde le zoom',
    () => planetFiches(site, text, systems, index));
  await zoomed('fiche ouverte : aucun débordement horizontal', async () => {
    const origin = planetOf(site, system.projects[0]);
    origin?.dispatchEvent(new site.win.MouseEvent('click', { bubbles: true }));
    await waitFor(() => !site.doc.getElementById('sheet')?.inert, 2500, 'fiche ouverte');
    await rest(site);
    const problems = overflowProblems(site);
    pressEscape(site);
    await waitFor(() => site.doc.getElementById('sheet')?.inert, 3000, 'fiche fermée');
    return problems;
  });
  await zoomed('sortie par Échap : repos, focus rendu au soleil',
    () => exitProblems(site, text, systems, index, 'Échap'));
  const back = `${at} (Entrée) puis sortie par le bouton retour : focus au soleil`;
  await test(ctx, back, async () => {
    if (!sunOfSystem()) return [`soleil de ${system.name} introuvable`];
    await zoomIn(site, sunOfSystem(), 'Entrée');
    const problems = zoomProblems(site, text, systems, index);
    return [...problems, ...await exitProblems(site, text, systems, index, 'retour')];
  });
}

/** Entrée, Espace et clic zooment ; une autre touche ne zoome pas. */
async function triggerTests(site, ctx, text, systems) {
  const system = systems[0];
  for (const how of ['Entrée', 'Espace', 'clic'])
    await test(ctx, `${how} sur le soleil de ${system.name} : zoom`, async () => {
      const sun = sunOf(site, text, system);
      if (!sun) return ['soleil introuvable'];
      await zoomIn(site, sun, how);
      const problems = zoomProblems(site, text, systems, 0);
      return [...problems, ...await exitProblems(site, text, systems, 0, 'retour')];
    });
  await test(ctx, 'une autre touche (a) sur un soleil ne zoome pas', async () => {
    const sun = sunOf(site, text, system);
    if (!sun) return ['soleil introuvable'];
    sun.focus();
    sun.dispatchEvent(new site.win.KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    await rest(site);
    return isZoomed(site) ? ['zoom déclenché par la touche a'] : [];
  });
}

// ---------- Lancement ----------

async function runSite(width, lang, datas, mainWidth) {
  const ctx = { group: GROUP, section: 'projects', width, lang };
  const text = datas[lang];
  const systems = text.systems;
  let site;
  try {
    site = await openProjectsSite(width, { lang, reduce: width !== mainWidth });
  } catch (error) {
    skip(ctx, ['ouverture du site sur Projets'], `ouverture impossible (${error.message})`);
    return;
  }
  site.systems = systems;
  try {
    await restTests(site, ctx, text, systems);
    await layoutTests(site, ctx, 'repos');
    await listTests(site, ctx, text, systems);
    await triggerTests(site, ctx, text, systems);
    for (let index = 0; index < systems.length; index++)
      await systemFlow(site, ctx, text, systems, index);
    await runSwitch(site, ctx, lang, datas);
    await test(ctx, 'aucune exception non rattrapée', () => uncaught(site));
  } finally {
    site.close();
  }
}

/**
 * Groupe « Projets » : cas par largeur et langue ; boucles et mouvement réduit seulement si
 * `widths` contient la largeur principale (la suite joue une largeur par scénario).
 */
export async function runProjects(widths, mainWidth) {
  const datas = await projectsData();
  for (const width of widths)
    for (const lang of LANGS) await runSite(width, lang, datas, mainWidth);
  if (!widths.includes(mainWidth)) return;
  await runLoops(mainWidth);
  await runReducedMotion(mainWidth);
}
