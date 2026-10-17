/* Compétences (S8.B3), noms des astres sur téléphone (critère de Louis du 13/10/2026 et choix
P2 du 17/10/2026) : pour chacune des 31 étoiles, FR et EN, à 320, 390 et 430 px, le nom est
entièrement dans le cadre visible du plan, hors de la barre collante et du panneau ; en
plongée il est sous l'astre. Mesures : maskedShare et belowProblems (skills-focus-probe.js). */
import { test } from './runner.js';
import { IMMEDIATE_MS } from './projects-probe.js';
import {
  DURATION_SHARE,
  DURATIONS,
  activate,
  belowProblems,
  curStar,
  idsOf,
  isDeployed,
  jumpTo,
  leave,
  maskedShare,
  motionOf,
  ready,
  recordFrames,
  scrollToPlan,
} from './skills-focus-probe.js';
import { groupEls, sleep, starsOf } from './skills-probe.js';

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
