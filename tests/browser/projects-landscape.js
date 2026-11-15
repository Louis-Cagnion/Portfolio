/* Projets en PAYSAGE sur téléphone (844 x 390 et 667 x 375, mise en page téléphone sous
880 px) : le système zoomé « Tressol-Chabrier » tient dans la place visible, entre la barre du
haut et la barre d'onglets : soleil entièrement visible et au moins la moitié des planètes
(centre) dans cette zone. Cas 3 : garde-fou en portrait (390 x 844), hauteur du plan zoomé =
largeur x 1,25 (système hors Piscine). Mouvement réduit : état final stable ; clic réel au
centre du soleil (piège 9 et 12), mesures en coordonnées de la fenêtre sans défilement ajouté.
Gestes et sondes : projects-probe.js. */
import {
  describe,
  goTo,
  makeStorage,
  openSite,
  settle,
  waitFor,
  waitStatus,
} from './harness.js';
import {
  centre,
  clickAtCentre,
  isZoomed,
  parts,
  planetOf,
  plain,
  projectsData,
  rest,
  sunOf,
} from './projects-probe.js';
import { test } from './runner.js';
import { stubMotion } from './warp.js';

const GROUP = 'Projets';
const SIZES = [
  { width: 844, height: 390 },
  { width: 667, height: 375 },
];
const PORTRAIT = { width: 390, height: 844 };
const PHONE_RATIO = 1.25; // hauteur du système zoomé en largeurs (hors Piscine)
const TOLERANCE = 1; // px

const px = (n) => n.toFixed(0);

/** Site de `size` ouvert sur Projets, mouvement réduit (le banc ne règle que la hauteur). */
async function openAt({ width, height }) {
  const site = await openSite({
    width,
    height,
    storage: makeStorage(),
    prepare: (opened) => stubMotion(opened, { reduce: true }),
  });
  try {
    await waitStatus(site, 'ready');
    await settle(site, 'home');
    await goTo(site, 'projects');
  } catch (error) {
    site.close();
    throw error;
  }
  return site;
}

/** Site de `size` sur Projets, système `index` touché au centre de son soleil et zoomé. */
async function openZoomed(size, index) {
  const site = await openAt(size);
  try {
    const text = (await projectsData()).fr;
    const system = text.systems[index];
    const sun = sunOf(site, text, system);
    if (!sun) throw new Error(`soleil de ${system.name} introuvable`);
    const disc = sun.querySelector(':scope > circle:not(.sun-glow)');
    const target = await clickAtCentre(site, disc ?? sun);
    if (!target || !sun.contains(target)) {
      const got = target ? describe(target) : 'rien';
      throw new Error(`toucher au centre du soleil reçu par ${got}`);
    }
    await waitFor(() => isZoomed(site), 3000, 'classe zfocus sur #sysLayout');
    await rest(site);
    return { site, text, system };
  } catch (error) {
    site.close();
    throw error;
  }
}

/** Cas 2 : soleil entièrement visible, au moins la moitié des planètes dans la zone. */
async function runLandscape(size) {
  const ctx = { group: GROUP, section: 'projects', width: size.width, lang: 'fr' };
  const name = `paysage ${size.width} x ${size.height} : soleil et au moins la moitié des ` +
    'planètes dans la place visible, au-dessus de .tabbar';
  await test(ctx, name, async () => {
    const { site, system } = await openZoomed(size, 0);
    try {
      const { win, doc } = site;
      const bar = doc.querySelector('nav.tabbar')?.getBoundingClientRect();
      const disc = doc.querySelector('#projects .sys.on .sun-btn > circle:not(.sun-glow)');
      if (!bar || !disc) return ['nav.tabbar ou disque du soleil du système zoomé absent'];
      const sun = disc.getBoundingClientRect();
      const plan = parts(site).svg.getBoundingClientRect();
      const ceiling = Math.min(win.innerHeight, bar.top);
      const seen = system.projects.filter((project) => {
        const body = planetOf(site, project)?.querySelector('.pl-body');
        if (!body) return false;
        const { x, y } = centre(body.getBoundingClientRect());
        return x >= 0 && x <= win.innerWidth && y >= 0 && y < ceiling;
      });
      const where = `fenêtre ${win.innerWidth} x ${win.innerHeight}, plan ` +
        `${px(plan.top)} à ${px(plan.bottom)} (${px(plan.height)} px), soleil ` +
        `${px(sun.top)} à ${px(sun.bottom)}, .tabbar haut ${px(bar.top)}, scrollY ` +
        `${px(win.scrollY)}`;
      const problems = [];
      if (sun.top < 0 || sun.bottom > ceiling)
        problems.push(
          `soleil (${px(sun.top)} à ${px(sun.bottom)}) hors de 0 à ${px(ceiling)}`,
        );
      const total = system.projects.length;
      if (seen.length * 2 < total)
        problems.push(`${seen.length} planète(s) sur ${total} au centre visible, ` +
          `au moins ${Math.ceil(total / 2)} attendue(s)`);
      return problems.length ? [...problems, where] : [];
    } finally {
      site.close();
    }
  });
}

/** Cas 3 : portrait, plan zoomé de hauteur largeur x 1,25 (système 0, hors Piscine). */
async function runPortrait() {
  const ctx = { group: GROUP, section: 'projects', width: PORTRAIT.width, lang: 'fr' };
  await test(ctx, 'portrait 390 x 844 : plan zoomé de hauteur largeur x 1,25', async () => {
    const { site, system } = await openZoomed(PORTRAIT, 0);
    try {
      const plan = parts(site).svg.getBoundingClientRect();
      const wanted = plan.width * PHONE_RATIO;
      if (Math.abs(plan.height - wanted) <= TOLERANCE) return [];
      return [`plan de « ${plain(system.name)} » : ${plan.height.toFixed(1)} px au lieu de ` +
        `${wanted.toFixed(1)} px (largeur ${plan.width.toFixed(1)} px)`];
    } finally {
      site.close();
    }
  });
}

/** Joue les trois cas du paysage de Projets (hors du filtre `widths`). */
export async function runProjectsLandscape() {
  for (const size of SIZES) await runLandscape(size);
  await runPortrait();
}
