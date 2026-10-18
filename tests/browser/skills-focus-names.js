/* Compétences (S8.B3), noms des astres sur téléphone (critère de Louis du 13/10/2026 et choix
P2 du 17/10/2026) : pour chacune des 31 étoiles, FR et EN, à 320, 390 et 430 px, le nom est
entièrement dans le cadre visible du plan, hors de la barre collante et du panneau ; en
plongée il est sous l'astre. Mesures : maskedShare et belowProblems (skills-focus-probe.js).
Étoiles à `nameLines` (nom sur deux lignes), à toutes les largeurs : lineCases. */
import { test } from './runner.js';
import { IMMEDIATE_MS, plain } from './projects-probe.js';
import {
  DURATION_SHARE,
  DURATIONS,
  activate,
  belowProblems,
  curStar,
  idsOf,
  isDeployed,
  jump,
  jumpTo,
  leave,
  maskedShare,
  motionOf,
  ready,
  recordFrames,
  scrollToPlan,
} from './skills-focus-probe.js';
import { groupEls, sleep, starCentre, starsOf } from './skills-probe.js';

const MASKED_MAX = 1; // % du nom masqué au-delà duquel l'étoile est fautive
const FRAME_WAIT_MS = 60; // marge après la fin de la fenêtre de mesure

const nameShare = (site, star) => {
  const label = star?.querySelector('text.name');
  return label ? maskedShare(site, label) : 100;
};

/** Les étoiles de toutes les constellations tour à tour (flèche suivante) : nom mesuré. */
async function plungeRows(kit) {
  const { site, text } = kit;
  const rows = [];
  for (let k = 0; k < text.groups.length; k++) {
    await ready(kit, k, 'clic', true);
    const ids = idsOf(site, text, k);
    for (let j = 0; j < ids.length; j++) {
      if (j) {
        jumpTo(kit, k, j, 'flèche');
        await sleep(IMMEDIATE_MS);
      }
      scrollToPlan(site);
      const star = curStar(site);
      const below = star ? belowProblems(star) : ['plongée absente'];
      rows.push({ id: ids[j], share: nameShare(site, star), below });
    }
  }
  await leave(site, text);
  return rows;
}

/** Noms de la constellation `k` à l'image où le déploiement cède la place à la plongée. */
async function deployRows(kit, k) {
  const { site, text } = kit;
  await leave(site, text);
  const stars = starsOf(groupEls(site)[k]);
  site.motion.set(false);
  const half = DURATIONS.deploy / 2;
  const frames = await recordFrames(
    site,
    async () => {
      await activate(site, groupEls(site)[k], 'clic');
      await sleep((1 + DURATION_SHARE) * half + FRAME_WAIT_MS);
    },
    () => ({ shares: stars.map((star) => nameShare(site, star)) }),
  ).finally(() => site.motion.set(true)); // l'animation finit sur-le-champ
  if (!isDeployed(site))
    throw new Error('déploiement absent : sans la classe focus après clic');
  const { start } = motionOf(frames);
  const speed = (f, i) => Math.abs(f.cx - frames[i - 1].cx) / f.w;
  let best = null;
  frames.forEach((f, i) => {
    const late = f.at - start;
    const near = late >= (1 - DURATION_SHARE) * half && late <= (1 + DURATION_SHARE) * half;
    if (i && near && (!best || speed(f, i) < best.speed))
      best = { speed: speed(f, i), shares: f.shares };
  });
  const ids = idsOf(site, text, k);
  return (best?.shares ?? stars.map(() => 100)).map((share, j) => ({ id: ids[j], share }));
}

const faultyList = (state, rows) => {
  const bad = rows.filter((row) => row.share > MASKED_MAX);
  const shown = bad.slice(0, 8).map((row) => `${row.id} (${Math.round(row.share)} % masqué)`);
  return bad.length ? [`${state} : ${bad.length}/${rows.length} étoile(s) : ${shown}`] : [];
};

/** Les deux cas de noms d'astres d'un site de téléphone (`kit`). */
export async function nameCases(kit) {
  const { ctx, text } = kit;
  await test(ctx, 'noms des astres en plongée : 31 étoiles sous l\'astre, dans le cadre',
    async () => {
      const rows = await plungeRows(kit);
      const above = rows.filter((row) => row.below.length);
      const shown = above.slice(0, 4).map((row) => `${row.id} : ${row.below[0]}`);
      return [
        ...faultyList('plongée', rows),
        ...(above.length ? [`${above.length} nom(s) pas sous l'astre : ${shown}`] : []),
      ];
    });
  await test(ctx, 'noms des astres en déploiement : 31 étoiles dans le cadre (mouvement réel)',
    async () => {
      const rows = [];
      for (let k = 0; k < text.groups.length; k++) rows.push(...await deployRows(kit, k));
      await leave(kit.site, text);
      return faultyList('déploiement', rows);
    });
}

/** Étoiles à `nameLines` de la langue : `{ k, j, item }` (rang du parcours, données). */
function lineStars(site, text) {
  return text.groups.flatMap((group, k) => idsOf(site, text, k)
    .map((id, j) => ({ k, j, item: group.items.find((entry) => entry.id === id) }))
    .filter(({ item }) => item?.nameLines));
}

/** Nom accessible complet (avec l'espace) et lignes de l'étoile `j` de `k`. */
function lineProblems(site, k, j, item) {
  const star = starsOf(groupEls(site)[k])[j];
  const problems = [];
  const label = star.getAttribute('aria-label');
  if (label !== plain(item.name))
    problems.push(`${item.id} : aria-label « ${label} » au lieu de « ${item.name} »`);
  const lines = [...star.querySelectorAll('text.name tspan')].map((el) => el.textContent);
  if (lines.join('|') !== item.nameLines.join('|'))
    problems.push(`${item.id} : lignes « ${lines.join(' | ')} » au lieu de ${item.nameLines}`);
  return problems;
}

const SHIFT_PX = 24; // px : décalage à gauche du bloc à deux lignes en vue d'ensemble
const SHIFT_TOLERANCE = 1; // px
let startOffset = null; // écart du bloc de `js-tests` au centre de l'astre, au départ

/** Écart horizontal (px) entre le centre du bloc du nom et le centre de l'astre `j` de `k`. */
function blockOffset(site, k, j) {
  const star = starsOf(groupEls(site)[k])[j];
  const block = star.querySelector('text.name').getBoundingClientRect();
  return block.x + block.width / 2 - starCentre(star).x;
}

/** Rang de `js-tests` : `{ k, j }`, ou null si l'étoile manque. */
function shiftStar(site, text) {
  return lineStars(site, text).find(({ item }) => item.id === 'js-tests') ?? null;
}

/** Bloc de `js-tests` : décalé de 24 px à gauche au repos, centré déployé, puis de retour. */
export async function shiftCases(kit) {
  const { ctx, site, text } = kit;
  await test(ctx, 'bloc de js-tests : 24 px à gauche en vue d\'ensemble, centré déployé',
    async () => {
      const found = shiftStar(site, text);
      if (!found) return ['js-tests à nameLines absente des données'];
      await leave(site, text);
      startOffset = blockOffset(site, found.k, found.j);
      await ready(kit, found.k);
      const open = blockOffset(site, found.k, found.j);
      const problems = [];
      if (Math.abs(startOffset + SHIFT_PX) > SHIFT_TOLERANCE)
        problems.push(`vue d'ensemble : écart ${startOffset.toFixed(1)} px au lieu de -24`);
      if (Math.abs(open) > SHIFT_TOLERANCE)
        problems.push(`déployé : écart ${open.toFixed(1)} px au lieu de 0`);
      return problems;
    });
  await test(ctx, 'bloc de js-tests : aller-retour, position identique à celle du départ',
    async () => {
      const found = shiftStar(site, text);
      if (!found || startOffset === null) return ['mesure de départ absente'];
      await leave(site, text);
      const back = blockOffset(site, found.k, found.j);
      const wrong = [startOffset, -SHIFT_PX]
        .filter((want) => Math.abs(back - want) > SHIFT_TOLERANCE);
      return wrong.map((want) => `retour : écart ${back.toFixed(1)} px au lieu de ${want}`);
    });
}

/** Étoiles à `nameLines` en plongée : nom accessible complet, nom entier dans le cadre. */
export async function lineCases(kit) {
  const { ctx, site, text } = kit;
  await test(ctx, 'étoile à nameLines en plongée : aria-label complet, nom dans le cadre',
    async () => {
      const wanted = lineStars(site, text);
      if (!wanted.length) return ['aucune étoile à nameLines dans les données'];
      const problems = [];
      for (const { k, j, item } of wanted) {
        await ready(kit, k);
        await jump(kit, k, j, 'puce');
        scrollToPlan(site);
        const share = nameShare(site, curStar(site));
        if (share > MASKED_MAX)
          problems.push(`${item.id} : nom masqué à ${Math.round(share)} %`);
        problems.push(...lineProblems(site, k, j, item));
      }
      return problems;
    });
}
