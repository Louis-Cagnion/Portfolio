/* Compétences en PAYSAGE sur téléphone (844 x 390 et 667 x 375, mise en page téléphone sous
880 px) : la constellation déployée tient dans la place visible, entre la barre du haut et la
barre d'onglets (moins le chevauchement du panneau), avec l'étoile, son nom et le haut du
panneau à l'écran. Cas 3 : garde-fou en portrait (390 x 844), hauteur du plan déployé = largeur
x 1,15. Mouvement réel ; mesures en coordonnées de la fenêtre, après tout défilement
automatique et sans en provoquer. Gestes et sondes : skills-focus-probe.js, skills-probe.js. */
import { goTo, makeStorage, openSite, settle, waitStatus } from './harness.js';
import { test } from './runner.js';
import { curStar, deploy, uncaught } from './skills-focus-probe.js';
import { groupEls, parts, rest, skillsData, sleep } from './skills-probe.js';
import { stubMotion } from './warp.js';

const GROUP = 'Compétences';
const SIZES = [
  { width: 844, height: 390 },
  { width: 667, height: 375 },
];
const PORTRAIT = { width: 390, height: 844 };
const PHONE_RATIO = 1.15; // hauteur du plan déployé en largeurs (checklist §5, 880 px)
const DIVE_MS = 1000 + 950; // déploiement puis plongée (README.md, groupe competences)
const MARGIN_MS = 300;
const TOLERANCE = 1; // px

const px = (n) => n.toFixed(0);
const box = (r) => `${px(r.top)} à ${px(r.bottom)}`;

/** Site ouvert sur Compétences dans une fenêtre de `width` x `height`, mouvement réel. */
async function openAt({ width, height }) {
  const motion = { reduce: false };
  const site = await openSite({
    width,
    height,
    storage: makeStorage(),
    prepare: (opened) => {
      stubMotion(opened, motion);
      opened.rawFrame = opened.win.requestAnimationFrame.bind(opened.win);
    },
  });
  site.motion = motion;
  try {
    await waitStatus(site, 'ready');
    await settle(site, 'home');
    await goTo(site, 'skills');
  } catch (error) {
    site.close();
    throw error;
  }
  return site;
}

/** Touche la constellation « Langages » puis attend la fin du déploiement et de la plongée. */
async function touchLanguages(site) {
  const text = (await skillsData()).fr;
  const k = text.groups.findIndex((group) => group.short === 'Langages');
  if (k < 0) throw new Error('constellation « Langages » absente des données');
  if (!groupEls(site)[k]) throw new Error(`constellation ${k} absente du plan`);
  await deploy(site, k, 'clic');
  await sleep(DIVE_MS + MARGIN_MS);
  await rest(site);
}

/** Étoile, son nom et titre du panneau dans la fenêtre, au-dessus de la barre d'onglets. */
function landscapeProblems(site) {
  const { win, doc } = site;
  const name = curStar(site)?.querySelector('text.name')?.getBoundingClientRect();
  const title = doc.querySelector('#skill h3')?.getBoundingClientRect();
  const bar = doc.querySelector('nav.tabbar')?.getBoundingClientRect();
  if (!name || !title || !bar) return ['étoile courante, #skill h3 ou nav.tabbar absent'];
  const plan = parts(site).svg.getBoundingClientRect();
  const where = `fenêtre ${win.innerWidth} x ${win.innerHeight}, plan ${box(plan)} ` +
    `(${px(plan.height)} px), nom ${box(name)}, h3 haut ${px(title.top)}, ` +
    `.tabbar haut ${px(bar.top)}, scrollY ${px(win.scrollY)}`;
  const problems = [];
  const ceiling = Math.min(win.innerHeight, bar.top);
  const free = `la place visible (0 à ${px(ceiling)})`;
  if (name.top < 0 || name.bottom > ceiling)
    problems.push(`bas du nom (${px(name.bottom)}) hors de ${free}`);
  if (title.top < 0 || title.top >= ceiling)
    problems.push(`haut du titre (${px(title.top)}) hors de ${free}`);
  return problems.length ? [...problems, where] : [];
}

/** Cas 1 : paysage, nom de l'étoile et titre du panneau visibles. */
async function runLandscape(size) {
  const ctx = { group: GROUP, section: 'skills', width: size.width, lang: 'fr' };
  const name = `paysage ${size.width} x ${size.height} : nom de l'étoile et titre ` +
    'du panneau dans la place visible, au-dessus de .tabbar';
  await test(ctx, name, async () => {
    const site = await openAt(size);
    try {
      await touchLanguages(site);
      return [...landscapeProblems(site), ...uncaught(site)];
    } finally {
      site.close();
    }
  });
}

/** Cas 3 : portrait, la hauteur du plan déployé vaut encore largeur x 1,15. */
async function runPortrait() {
  const ctx = { group: GROUP, section: 'skills', width: PORTRAIT.width, lang: 'fr' };
  await test(ctx, 'portrait 390 x 844 : plan déployé de hauteur largeur x 1,15', async () => {
    const site = await openAt(PORTRAIT);
    try {
      await touchLanguages(site);
      const plan = parts(site).svg.getBoundingClientRect();
      const wanted = plan.width * PHONE_RATIO;
      if (Math.abs(plan.height - wanted) <= TOLERANCE) return uncaught(site);
      return [`plan de ${plan.height.toFixed(1)} px au lieu de ${wanted.toFixed(1)} px ` +
        `(largeur ${plan.width.toFixed(1)} px)`];
    } finally {
      site.close();
    }
  });
}

/** Joue les trois cas du paysage des Compétences (hors du filtre `widths`). */
export async function runSkillsLandscape() {
  for (const size of SIZES) await runLandscape(size);
  await runPortrait();
}
