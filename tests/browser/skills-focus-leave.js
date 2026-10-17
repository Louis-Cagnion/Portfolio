/* Compétences (S8.C6b), RETOUR sur téléphone (320 et 390 px) en mouvement réel : la hauteur de
la page ne chute jamais de plus de 25 % de sa valeur de départ entre deux images pendant les
1200 ms du retour (le panneau ne sort du flux qu'une fois le plan regrandi). Retour par le
bouton « Toutes les compétences » puis par Échap, après un déploiement et sa plongée. */
import { click, waitFor } from './harness.js';
import { pressEscape } from './projects-probe.js';
import { skip, test } from './runner.js';
import {
  biggest,
  deploy,
  isDeployed,
  need,
  panelParts,
  recordFrames,
  spyCalls,
  uncaught,
} from './skills-focus-probe.js';
import { openSkillsSite, rest } from './skills-probe.js';

const GROUP = 'Compétences';
const DROP_MAX = 0.25; // part de la hauteur de départ perdue au plus d'une image à l'autre
const MIN_FRAMES = 10; // en deçà, le retour n'a pas été animé : la mesure ne prouve rien
const LEAVE_WAIT_MS = 3000;

/** Retour par `how` ; les images relevées couvrent le retour puis le repos. */
function leaveBy(kit, how) {
  const { site, text } = kit;
  return recordFrames(site, async () => {
    const { back } = panelParts(site, text);
    if (how === 'bouton' && back) {
      back.focus();
      click(site, back);
    } else pressEscape(site);
    await waitFor(() => !isDeployed(site), LEAVE_WAIT_MS, 'retour').catch(() => {});
    await rest(site);
  });
}

/** Plus forte chute de hauteur de page d'une image à l'autre : { drop, at, from, to }. */
function worstDrop(frames) {
  let worst = { drop: 0, at: 0, from: 0, to: 0 };
  for (let i = 1; i < frames.length; i++) {
    const drop = frames[i - 1].doc - frames[i].doc;
    if (drop > worst.drop) worst = { drop, at: i, from: frames[i - 1].doc, to: frames[i].doc };
  }
  return worst;
}

async function heightCases(kit) {
  const { site, ctx, text, width } = kit;
  const k = biggest(text);
  for (const how of ['bouton', 'Échap'])
    await test(ctx, `retour par ${how} : la hauteur de page ne chute pas d'un bloc`,
      async () => {
        await deploy(site, k, 'clic');
        const frames = await leaveBy(kit, how);
        const start = frames[0].doc;
        const worst = worstDrop(frames);
        const problems = need([], frames.length >= MIN_FRAMES,
          `${frames.length} image(s) relevée(s) pendant le retour`);
        return need(problems, worst.drop <= DROP_MAX * start,
          `à ${width} px, la page passe de ${worst.from} à ${worst.to} px à l'image ` +
          `${worst.at} (chute de ${worst.drop} px, ` +
          `${(100 * worst.drop / start).toFixed(0)} % des ${start} px de départ, ` +
          `au plus ${DROP_MAX * 100} %)`);
      });
}

/** Retour en mouvement réel à `width` px (téléphone) : hauteur de page sans chute brutale. */
export async function runLeaveHeight(width, datas) {
  const ctx = { group: GROUP, section: 'skills', width, lang: 'fr' };
  let site;
  try {
    site = await openSkillsSite(width, { lang: 'fr', loops: true });
  } catch (error) {
    skip(ctx, ['ouverture en mouvement réel'], `ouverture impossible (${error.message})`);
    return;
  }
  const kit = { site, ctx, text: datas.fr, datas, lang: 'fr', width, calls: spyCalls(site) };
  try {
    await heightCases(kit);
    await test(ctx, 'aucune exception non rattrapée (retour, hauteur)', () => uncaught(site));
  } finally {
    site.close();
  }
}
