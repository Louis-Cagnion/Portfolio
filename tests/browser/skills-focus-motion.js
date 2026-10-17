/* Compétences (S8.B3), MOUVEMENT RÉEL à 390 et 1280 px : durées du déploiement (1000 ms puis
plongée 950 ms), du saut d'étoile (1400 ms avec recul) et du retour (1200 ms), pas d'une image
à l'autre de la caméra et de la hauteur du plan, boucles requestAnimationFrame, recentrage
bloqué pendant une animation, onglet masqué, sortie de la rubrique. Mesures : voir
skills-focus-probe.js. */
import { goTo, waitFor } from './harness.js';
import { IMMEDIATE_MS, setHidden } from './projects-probe.js';
import { skip, test } from './runner.js';
import {
  DURATION_SHARE,
  DURATIONS,
  activate,
  biggest,
  cameraOf,
  cameraProblems,
  curStar,
  deploy,
  deployedProblems,
  diveProblems,
  idsOf,
  jump,
  jumpTo,
  leave,
  motionOf,
  need,
  ready,
  recordFrames,
  skillProblems,
  spyCalls,
  stepProblems,
  tagged,
  uncaught,
} from './skills-focus-probe.js';
import { groupEls, openSkillsSite, parts, rest, sleep, starsOf } from './skills-probe.js';

const GROUP = 'Compétences';
const SETTLE_MS = 300;
const SHRINK_PX = 40;

/** Les quatre parcours en mouvement réel, une image relevée par requestAnimationFrame. */
async function recordJourneys(kit, k) {
  const { site, text } = kit;
  const { loops } = site;
  await rest(site);
  const out = { journeys: {}, error: null, before: cameraOf(site), base: loops.pending.size };
  out.plan = parts(site).svg.getBoundingClientRect().height;
  const run = async (name, gesture) => {
    loops.peak = loops.pending.size;
    const frames = await recordFrames(site, gesture);
    await sleep(SETTLE_MS);
    out.journeys[name] = { frames, peak: loops.peak, left: loops.pending.size };
  };
  const last = text.groups[k].items.length - 1;
  try {
    await run('deploy', () => deploy(site, k, 'clic'));
    await run('far', () => jump(kit, k, last, 'puce'));
    await run('near', () => jump(kit, k, last - 1, 'flèche'));
    await run('leave', () => leave(site, text));
  } catch (error) {
    out.error = error.message;
  }
  return out;
}

const JOURNEYS = [
  ['deploy', 'déploiement puis plongée'],
  ['near', 'saut d\'étoile voisine'],
  ['far', 'saut lointain'],
  ['leave', 'retour'],
];

function journeyProblems(out, name) {
  const run = out.journeys[name];
  if (!run) return [out.error ?? `parcours « ${name} » non joué`];
  const { ms } = motionOf(run.frames);
  const wanted = DURATIONS[name];
  return need(stepProblems(name, run.frames), Math.abs(ms - wanted) <= DURATION_SHARE * wanted,
    `${name} : ${ms.toFixed(0)} ms au lieu de ${wanted} ms (±25 %)`);
}

function loopProblems(out) {
  const problems = out.journeys.leave ? [] : [out.error ?? 'parcours non joués'];
  for (const [name, run] of Object.entries(out.journeys)) {
    need(problems, run.peak <= 2, `${name} : ${run.peak} rappels en attente (au plus 2)`);
    need(problems, run.left <= out.base,
      `${name} : ${run.left - out.base} boucle(s) de la rubrique au repos après l'animation`);
  }
  return problems;
}

async function tailCases(kit, k) {
  const { site, ctx, text } = kit;
  const { loops } = site;
  const last = text.groups[k].items.length - 1;
  const far = () => (starsOf(groupEls(site)[k]).indexOf(curStar(site)) === 0 ? last : 0);
  await test(ctx, 'saut demandé pendant une animation : ignoré, aucun état intermédiaire',
    async () => {
      await ready(kit, k, 'clic', true);
      const ids = idsOf(site, text, k);
      jumpTo(kit, k, 3, 'puce');
      await sleep(SETTLE_MS);
      jumpTo(kit, k, 1, 'puce');
      await rest(site);
      return skillProblems(kit, k, ids, 3);
    });
  await test(ctx, 'onglet masqué pendant une animation : plus de boucle, animation terminée',
    async () => {
      await ready(kit, k);
      setHidden(site, true);
      await sleep(SETTLE_MS);
      const idle = loops.pending.size;
      setHidden(site, false);
      await sleep(SETTLE_MS);
      const to = far();
      jumpTo(kit, k, to, 'puce');
      await sleep(SETTLE_MS);
      setHidden(site, true);
      await sleep(SETTLE_MS);
      const hidden = loops.pending.size;
      setHidden(site, false);
      await rest(site);
      return [
        ...need([], hidden <= idle, `masqué : ${hidden} rappel(s) (${idle} au repos)`),
        ...skillProblems(kit, k, idsOf(site, text, k), to),
      ];
    });
  await test(ctx, 'recentrage bloqué pendant un saut : redimensionnement sans à-coup',
    async () => {
      await ready(kit, k);
      const to = far();
      const frames = await recordFrames(site, async () => {
        jumpTo(kit, k, to, 'puce');
        await sleep(SETTLE_MS + 100);
        site.frame.style.width = `${kit.width - SHRINK_PX}px`;
        await rest(site);
      });
      const problems = stepProblems('redimensionnement', frames, false);
      problems.push(...tagged('après le repos', diveProblems(kit, { w: Infinity })));
      site.frame.style.width = `${kit.width}px`;
      await sleep(SETTLE_MS);
      await rest(site);
      return problems;
    });
  await test(ctx, 'mouvement réduit demandé pendant une animation : terminée sur-le-champ',
    async () => {
      await leave(site, text);
      const base = loops.pending.size;
      await activate(site, groupEls(site)[k], 'Entrée');
      await sleep(SETTLE_MS + 100);
      site.motion.set(true);
      await sleep(IMMEDIATE_MS + 80);
      const early = cameraOf(site);
      const problems = deployedProblems(kit, k);
      need(problems, loops.pending.size <= base, 'rappel(s) en attente après la bascule');
      site.motion.set(false);
      await rest(site);
      return [...problems, ...cameraProblems('caméra', early, cameraOf(site))];
    });
  await test(ctx, 'sortie de la rubrique pendant un saut : animation terminée sur-le-champ',
    async () => {
      await ready(kit, k);
      const [view, idle] = [site.doc.getElementById('skills'), loops.pending.size];
      const [to, ids] = [far(), idsOf(site, text, k)];
      jumpTo(kit, k, to, 'puce');
      const trip = goTo(site, 'home');
      await waitFor(() => !view.classList.contains('on'), 3000, 'sortie de #skills');
      await sleep(IMMEDIATE_MS);
      const early = cameraOf(site); // masquée : le rapport du plan n'est plus mesurable
      await trip;
      await goTo(site, 'skills');
      await rest(site);
      return [
        ...tagged('à la sortie', skillProblems(kit, k, ids, to)),
        ...cameraProblems('caméra', early, cameraOf(site), 0.005, ['cx', 'w']),
        ...need([], loops.pending.size <= idle, 'boucle(s) de la rubrique restée(s)'),
      ];
    });
  await leave(site, text);
}

/** Site en mouvement réel de `width` px : durées, à-coups, boucles, recentrage, sortie. */
export async function runMotion(width, datas) {
  const ctx = { group: GROUP, section: 'skills', width, lang: 'fr' };
  let site;
  try {
    site = await openSkillsSite(width, { lang: 'fr', loops: true });
  } catch (error) {
    skip(ctx, ['ouverture en mouvement réel'], `ouverture impossible (${error.message})`);
    return;
  }
  const kit = { site, ctx, text: datas.fr, datas, lang: 'fr', width, calls: spyCalls(site) };
  const k = biggest(kit.text);
  try {
    const out = await recordJourneys(kit, k);
    for (const [name, label] of JOURNEYS)
      await test(ctx, `sans à-coup : ${label} (images, durée, mouvement réel)`,
        () => journeyProblems(out, name));
    await test(ctx, 'retour : caméra et hauteur du plan égales à la vue d\'ensemble', () => {
      const frame = out.journeys.leave?.frames.at(-1);
      if (!frame) return [out.error ?? 'retour non joué'];
      return need(cameraProblems('caméra finale', frame, out.before),
        Math.abs(frame.plan - out.plan) <= 1, `plan ${frame.plan} px pour ${out.plan}`);
    });
    await test(ctx, 'boucles : au plus 2 rAF, aucune de la rubrique au repos',
      () => loopProblems(out));
    await tailCases(kit, k);
    await test(ctx, 'aucune exception non rattrapée (mouvement réel)', () => uncaught(site));
  } finally {
    site.close();
  }
}
