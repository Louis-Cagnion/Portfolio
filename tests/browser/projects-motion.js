/* Projets : animation (plan.md, Critères S6 ; checklist §6, ciel figé ;
§6, une boucle par rubrique). Une seule boucle requestAnimationFrame
pour la rubrique visible, demandée depuis js/sections/projects*.js (la pile d'appels le dit,
voir countLoops) : aucune avant la première visite, aucune sur les autres rubriques, aucune
dans un onglet masqué (document.hidden et visibilitychange), relancée au retour. Mouvement
réduit (stubMotion de warp.js, lu par matchMedia) : zoom et sortie immédiats, c'est-à-dire
état final et aucune animation de plus de IMMEDIATE_MS dès ce délai, planètes figées ; en
mouvement normal, les planètes tournent au repos. */
import { describe, goTo, isVisible } from './harness.js';
import { test } from './runner.js';
import {
  IMMEDIATE_MS,
  isZoomed,
  openProjectsSite,
  parts,
  planetEls,
  pressEscape,
  projectsData,
  rest,
  setHidden,
  sleep,
  suns,
  sunOf,
  zoomIn,
} from './projects-probe.js';

const MAX_TOTAL = 2; // le ciel et la boucle de la rubrique
const SETTLE_MS = 300;
const FREEZE_MS = 600;
const MOVED_PX = 0.3;
const RUBRICS = ['home', 'journey', 'skills', 'contact'];

const pendingText = (site) => `${site.loops.own()} boucle(s) de Projets, ` +
  `${site.loops.pending.size} en tout`;

/** Boucles de la rubrique et du site en attente après SETTLE_MS de calme. */
async function loopsAfterRest(site) {
  await sleep(SETTLE_MS);
  return { own: site.loops.own(), total: site.loops.pending.size };
}

async function loopsFlow(ctx, site) {
  const text = (await projectsData()).fr;
  await test(ctx, 'avant la première visite : aucune boucle de Projets', async () => {
    const { own } = await loopsAfterRest(site);
    return own ? [`${own} boucle(s) demandée(s) par la rubrique cachée`] : [];
  });
  await goTo(site, 'projects');
  await test(ctx, 'rubrique visible : une seule boucle de Projets', async () => {
    const { own, total } = await loopsAfterRest(site);
    const problems = [];
    if (own !== 1) problems.push(`${own} boucle(s) de Projets au lieu de 1`);
    if (total > MAX_TOTAL) problems.push(`${total} rappels en attente (au plus ${MAX_TOTAL})`);
    return problems;
  });
  await test(ctx, 'zoom puis sortie : jamais plus d\'une boucle de Projets', async () => {
    const sun = sunOf(site, text, text.systems[0]);
    if (!sun) return ['soleil introuvable'];
    site.loops.peakOwn = site.loops.own();
    await zoomIn(site, sun, 'clic');
    pressEscape(site);
    await sleep(1200);
    await rest(site);
    const { own } = await loopsAfterRest(site);
    const problems = [];
    if (site.loops.peakOwn > 1) problems.push(`${site.loops.peakOwn} boucles en même temps`);
    if (own !== 1) problems.push(`${own} boucle(s) au repos après la sortie`);
    return problems;
  });
  await test(ctx, 'onglet masqué : boucle arrêtée, relancée au retour', async () => {
    const problems = [];
    setHidden(site, true);
    const hidden = await loopsAfterRest(site);
    if (hidden.own) problems.push(`onglet masqué : ${pendingText(site)}`);
    setHidden(site, false);
    const back = await loopsAfterRest(site);
    if (back.own !== 1) problems.push(`onglet revenu : ${back.own} boucle(s) au lieu de 1`);
    return problems;
  });
  await test(ctx, 'autres rubriques : aucune boucle de Projets', async () => {
    const problems = [];
    for (const id of RUBRICS) {
      await goTo(site, id);
      const { own } = await loopsAfterRest(site);
      if (own) problems.push(`#${id} visible : ${own} boucle(s) de Projets`);
    }
    return problems;
  });
  await test(ctx, 'retour sur Projets : une boucle de nouveau', async () => {
    await goTo(site, 'projects');
    const { own } = await loopsAfterRest(site);
    return own === 1 ? [] : [`${own} boucle(s) au lieu de 1`];
  });
}

/** Boucles : site de la largeur principale, comptage dès l'amorçage. */
export async function runLoops(mainWidth) {
  const ctx = { group: 'Projets', section: 'projects', width: mainWidth, lang: 'fr' };
  let site;
  try {
    site = await openProjectsSite(mainWidth, { loops: true, visit: false });
  } catch (error) {
    await test(ctx, 'boucles : ouverture du site', () => [error.message]);
    return;
  }
  try {
    await loopsFlow(ctx, site);
  } finally {
    site.close();
  }
}

// ---------- Mouvement réduit ----------

/** Positions (arrondies au dixième) des planètes visibles du site. */
const positions = (site) => planetEls(site)
  .filter(isVisible)
  .map((el) => {
    const body = el.querySelector('.pl-body') ?? el;
    const box = body.getBoundingClientRect();
    return [box.x + box.width / 2, box.y + box.height / 2];
  });

function movedCount(before, after) {
  return before.filter(
    (p, i) => Math.hypot(p[0] - after[i][0], p[1] - after[i][1]) > MOVED_PX,
  ).length;
}

/** Animations de plus de IMMEDIATE_MS encore en cours dans la rubrique. */
function slowAnimations(site) {
  return parts(site).root.getAnimations({ subtree: true }).filter((a) => {
    const timing = a.effect?.getComputedTiming();
    return a.playState === 'running' && timing.endTime !== Infinity &&
      timing.duration > IMMEDIATE_MS;
  });
}

const viewBoxOf = (site) => (parts(site).svg?.getAttribute('viewBox') ?? '')
  .split(/\s+/).map(Number);

function sameBox(early, final) {
  return early.length === final.length && early.every((v, i) => Math.abs(v - final[i]) < 1);
}

async function zoomOutProblems(site, text) {
  const problems = [];
  pressEscape(site);
  await sleep(IMMEDIATE_MS);
  const early = viewBoxOf(site);
  if (isZoomed(site)) problems.push(`sortie : zfocus encore posée à ${IMMEDIATE_MS} ms`);
  if (suns(site).some((s) => !isVisible(s))) problems.push('sortie : soleil masqué à 120 ms');
  const slow = slowAnimations(site);
  if (slow.length) problems.push(`sortie : ${slow.length} animation(s) de plus de 120 ms`);
  const focus = site.doc.activeElement;
  if (focus !== sunOf(site, text, text.systems[0]))
    problems.push(`sortie : focus sur ${describe(focus)} à ${IMMEDIATE_MS} ms`);
  await rest(site);
  if (!sameBox(early, viewBoxOf(site)))
    problems.push('sortie : plan encore en mouvement à 120 ms');
  return problems;
}

async function reducedFlow(ctx, site) {
  const text = (await projectsData()).fr;
  await test(ctx, 'mouvement réduit : zoom immédiat, planètes figées', async () => {
    const sun = sunOf(site, text, text.systems[0]);
    if (!sun) return ['soleil introuvable'];
    sun.dispatchEvent(new site.win.MouseEvent('click', { bubbles: true }));
    await sleep(IMMEDIATE_MS);
    const problems = [];
    const early = viewBoxOf(site);
    if (!isZoomed(site)) problems.push(`zoom : zfocus absente à ${IMMEDIATE_MS} ms`);
    if (!isVisible(parts(site).head)) problems.push('zoom : .sys-head non visible à 120 ms');
    const slow = slowAnimations(site);
    if (slow.length) problems.push(`zoom : ${slow.length} animation(s) de plus de 120 ms`);
    await rest(site);
    if (!sameBox(early, viewBoxOf(site)))
      problems.push('zoom : plan encore en mouvement à 120 ms');
    const before = positions(site);
    await sleep(FREEZE_MS);
    const moved = movedCount(before, positions(site));
    if (moved) problems.push(`${moved} planète(s) bougent en mouvement réduit (zoomé)`);
    return problems;
  });
  await test(ctx, 'mouvement réduit : sortie immédiate, planètes figées', async () => {
    const problems = isZoomed(site) ? await zoomOutProblems(site, text) : ['non zoomé'];
    const before = positions(site);
    await sleep(FREEZE_MS);
    const moved = movedCount(before, positions(site));
    if (moved) problems.push(`${moved} planète(s) bougent en mouvement réduit (repos)`);
    return problems;
  });
}

/** Mouvement réduit dès l'amorçage, puis mouvement normal : les planètes tournent. */
export async function runReducedMotion(mainWidth) {
  const ctx = { group: 'Projets', section: 'projects', width: mainWidth, lang: 'fr' };
  for (const reduce of [true, false]) {
    let site;
    try {
      site = await openProjectsSite(mainWidth, { reduce });
    } catch (error) {
      await test(ctx, 'mouvement : ouverture du site', () => [error.message]);
      continue;
    }
    try {
      if (reduce) await reducedFlow(ctx, site);
      else
        await test(ctx, 'mouvement normal : les planètes tournent au repos', async () => {
          await rest(site);
          const before = positions(site);
          if (!before.length) return ['aucune planète visible'];
          await sleep(FREEZE_MS);
          return movedCount(before, positions(site)) ? [] : ['aucune planète ne bouge'];
        });
    } finally {
      site.close();
    }
  }
}
