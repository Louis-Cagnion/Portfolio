/* Contenu indisponible des rubriques à venir (S5b). Contrat
(docs/design/plan.md:122 et :151) : sous le titre (h2) et le chapeau (p.lede) de chaque
rubrique encore montée par mountSimple (journey, skills, projects, contact), un panneau
`.status.hud[data-state="error"]` :
- titre, message (ui.unavailable.title, message), barre en pointillés (élément dont la
  classe contient « bar », fond repeating-linear-gradient ou bordure dashed), bouton
  `.btn.primary[data-go="home"]` (ui.unavailable.home) ;
- bas du chapeau à 32 px du haut du panneau ; un seul panneau par rubrique, texte mis à
  jour à la bascule de langue ; bouton d'au moins 44 px de haut ; clic = retour à
  l'accueil, où il n'y a aucun panneau ; aucun débordement horizontal (page et panneau)
  aux cinq largeurs.
Non testé ici : « chaque module S6 à S9 retire le panneau de sa rubrique » (modules
absents). */
import {
  activeViews,
  click,
  goTo,
  isVisible,
  makeStorage,
  openSite,
  settle,
  waitFor,
  waitStatus,
} from './harness.js';
import { MIN_TARGET, overflowProblems } from './checks.js';
import { languageTexts, switchTo } from './language.js';
import { expectEqual, skip, test } from './runner.js';
import { normalize } from './text.js';

export const GROUP = 'Indisponible';
export const MOUNTED = ['journey', 'skills', 'projects', 'contact'];
const PANEL = '.status.hud[data-state="error"]';
const GAP = 32; // px, bas du chapeau à haut du panneau
const TOLERANCE = 1; // px : arrondis de sous-pixel
const textOf = (el) => normalize(el?.textContent ?? '');
const view = (site, id) => site.doc.getElementById(id);
const panels = (site, id) => [...(view(site, id)?.querySelectorAll('.status') ?? [])];
const uncaught = (site) => site.uncaught.map((e) => `exception non rattrapée : ${e}`);

async function unavailableTexts(lang) {
  const { data } = await languageTexts();
  return data[lang].ui.unavailable;
}

/** Ouvre le site (langue `lang`), rend le site posé sur l'accueil. */
async function open(width, lang = 'fr') {
  const site = await openSite({
    width,
    storage: makeStorage(lang === 'en' ? { lang } : {}),
  });
  try {
    await waitStatus(site, 'ready');
    await settle(site, 'home');
    return site;
  } catch (error) {
    site.close();
    throw error;
  }
}

/** Le panneau unique de la rubrique `id`, ou une liste de problèmes. */
function onePanel(site, id) {
  const all = view(site, id)?.querySelectorAll(PANEL) ?? [];
  const every = panels(site, id);
  if (all.length !== 1 || every.length !== 1)
    return { problems: [`#${id} : ${all.length} ${PANEL}, ${every.length} .status au total`] };
  return { panel: all[0], problems: [] };
}

const parts = (panel) => ({
  heading: panel.querySelector('h2, h3'),
  message: panel.querySelector('p'),
  bar: panel.querySelector('[class*="bar"]'),
  button: panel.querySelector('.btn.primary[data-go="home"]'),
});

/** Structure : ordre DOM, titre, message, barre en pointillés, bouton. */
function structureProblems(site, id) {
  const { panel, problems } = onePanel(site, id);
  if (!panel) return problems;
  const root = view(site, id);
  const title = root.querySelector('h2');
  const lede = root.querySelector('p.lede');
  if (!title) problems.push(`#${id} : h2 absent`);
  if (!lede) problems.push(`#${id} : p.lede absent`);
  const win = site.win;
  const follows = (a, b) => a && b && (a.compareDocumentPosition(b) &
    win.Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
  if (title && !follows(title, panel)) problems.push(`#${id} : panneau avant le titre`);
  if (lede && !follows(lede, panel)) problems.push(`#${id} : panneau avant le chapeau`);
  if (title && lede && !follows(title, lede)) problems.push(`#${id} : chapeau avant le titre`);
  if (panel.contains(title) || panel.contains(lede))
    problems.push(`#${id} : titre ou chapeau dans le panneau`);
  const { heading, message, bar, button } = parts(panel);
  if (!heading) problems.push(`#${id} : titre (h2 ou h3) du panneau absent`);
  if (!message) problems.push(`#${id} : message (p) du panneau absent`);
  if (!bar) problems.push(`#${id} : barre du panneau absente`);
  else {
    const style = site.win.getComputedStyle(bar);
    const inner = [bar, ...bar.querySelectorAll('*')].map(
      (el) => site.win.getComputedStyle(el),
    );
    const dashed = inner.some((s) => /repeating-linear-gradient/.test(s.backgroundImage) ||
      s.borderTopStyle === 'dashed');
    if (!dashed) problems.push(`#${id} : barre ${style.display} sans pointillés`);
  }
  if (!button) problems.push(`#${id} : .btn.primary[data-go="home"] absent`);
  if (heading && message && !follows(heading, message))
    problems.push(`#${id} : message avant le titre`);
  if (message && bar && !follows(message, bar))
    problems.push(`#${id} : barre avant le message`);
  if (bar && button && !follows(bar, button)) problems.push(`#${id} : bouton avant la barre`);
  return problems;
}

/** Textes du panneau dans la langue `lang`. */
async function textProblems(site, id, lang) {
  const { panel, problems } = onePanel(site, id);
  if (!panel) return problems;
  const want = await unavailableTexts(lang);
  const { heading, message, button } = parts(panel);
  expectEqual(problems, `#${id} titre (${lang})`, textOf(heading), normalize(want.title));
  expectEqual(problems, `#${id} message (${lang})`, textOf(message), normalize(want.message));
  expectEqual(problems, `#${id} bouton (${lang})`, textOf(button), normalize(want.home));
  return problems;
}

function gapProblems(site, id) {
  const { panel, problems } = onePanel(site, id);
  if (!panel) return problems;
  const lede = view(site, id).querySelector('p.lede');
  if (!lede) return [`#${id} : p.lede absent`];
  const gap = panel.getBoundingClientRect().top - lede.getBoundingClientRect().bottom;
  if (Math.abs(gap - GAP) > TOLERANCE)
    problems.push(`#${id} : ${gap.toFixed(2)} px entre le chapeau et le panneau ` +
      `au lieu de ${GAP}`);
  return problems;
}

function buttonProblems(site, id) {
  const { panel, problems } = onePanel(site, id);
  if (!panel) return problems;
  const { button } = parts(panel);
  if (!button) return [`#${id} : bouton absent`];
  if (!isVisible(button)) return [`#${id} : bouton invisible`];
  const rect = button.getBoundingClientRect();
  if (rect.height < MIN_TARGET - 0.5)
    problems.push(`#${id} : bouton haut de ${rect.height.toFixed(1)} px (< ${MIN_TARGET})`);
  if (rect.width < MIN_TARGET - 0.5)
    problems.push(`#${id} : bouton large de ${rect.width.toFixed(1)} px (< ${MIN_TARGET})`);
  return problems;
}

function widthProblems(site, id) {
  const { panel, problems } = onePanel(site, id);
  if (!panel) return problems;
  const root = site.doc.documentElement;
  if (root.scrollWidth > root.clientWidth)
    problems.push(`html : scrollWidth ${root.scrollWidth} > clientWidth ${root.clientWidth}`);
  if (panel.scrollWidth > panel.clientWidth)
    problems.push(`panneau : scrollWidth ${panel.scrollWidth} > ` +
      `clientWidth ${panel.clientWidth}`);
  const rect = panel.getBoundingClientRect();
  if (rect.left < -0.5 || rect.right > site.win.innerWidth + 0.5)
    problems.push(`panneau hors de la fenêtre : ${rect.left.toFixed(1)} ` +
      `à ${rect.right.toFixed(1)}`);
  return [...problems, ...overflowProblems(site)];
}

// ---------- Une rubrique, une largeur, une langue ----------
async function runSection(site, width, lang, id) {
  const ctx = { group: GROUP, width, lang, section: id };
  try {
    await goTo(site, id);
  } catch (error) {
    skip(
      ctx,
      ['structure', 'écart de 32 px', 'bouton 44 px', 'aucun débordement'],
      `rubrique non atteinte (${error.message})`,
    );
    return;
  }
  await test(
    ctx,
    'panneau .status.hud[data-state="error"] sous le titre et le chapeau',
    () => structureProblems(site, id),
  );
  await test(ctx, `textes du panneau en ${lang}`, () => textProblems(site, id, lang));
  await test(
    ctx,
    'écart de 32 px entre le chapeau et le panneau',
    () => gapProblems(site, id),
  );
  await test(ctx, 'bouton d\'au moins 44 px', () => buttonProblems(site, id));
  await test(
    ctx,
    'aucun débordement horizontal (page et panneau)',
    () => widthProblems(site, id),
  );
}

async function runWidth(width) {
  const ctx = { group: GROUP, width };
  for (const lang of ['fr', 'en']) {
    let site;
    try {
      site = await open(width, lang);
    } catch (error) {
      skip({ ...ctx, lang }, ['rubriques'], `ouverture impossible (${error.message})`);
      continue;
    }
    try {
      for (const id of MOUNTED) await runSection(site, width, lang, id);
      const homeCtx = { ...ctx, lang, section: 'home' };
      await test(homeCtx, 'l\'accueil n\'a pas de panneau', async () => {
        await goTo(site, 'home');
        const found = site.doc.querySelectorAll('#home .status').length;
        return found ? [`#home : ${found} .status`] : [];
      });
      await test(
        { ...ctx, lang, section: null },
        'aucune exception non rattrapée',
        () => uncaught(site),
      );
    } finally {
      site.close();
    }
  }
}

// ---------- Comportements : langue, bouton, allers-retours ----------
async function runBehaviour(width) {
  const ctx = { group: GROUP, width, lang: 'fr' };
  let site;
  try {
    site = await open(width, 'fr');
  } catch (error) {
    skip(
      ctx,
      ['bascule de langue', 'clic sur le bouton', 'allers-retours', 'bascules rapides'],
      `ouverture impossible (${error.message})`,
    );
    return;
  }
  try {
    for (const id of MOUNTED) {
      const switchName = 'bascule FR puis EN puis FR : ' +
        'textes mis à jour, un seul panneau';
      const arrivalName = 'bascule faite sur une autre rubrique : ' +
        'panneau à jour en arrivant';
      const clickName = 'clic sur le bouton : retour à l\'accueil';
      await test({ ...ctx, section: id }, switchName, async () => {
        await goTo(site, id);
        const problems = await textProblems(site, id, 'fr');
        await switchTo(site, 'en');
        problems.push(...await textProblems(site, id, 'en'));
        await switchTo(site, 'fr');
        problems.push(...await textProblems(site, id, 'fr'));
        return problems;
      });
      await test({ ...ctx, section: id }, arrivalName, async () => {
        await goTo(site, 'home');
        await switchTo(site, 'en');
        await goTo(site, id);
        const problems = await textProblems(site, id, 'en');
        await switchTo(site, 'fr');
        return problems;
      });
      await test({ ...ctx, section: id }, clickName, async () => {
        await goTo(site, id);
        const { panel, problems } = onePanel(site, id);
        const button = panel && parts(panel).button;
        if (!button) return problems.length ? problems : [`#${id} : bouton absent`];
        click(site, button);
        await settle(site, 'home');
        const views = activeViews(site).map((v) => v.id);
        return views.length === 1 && views[0] === 'home'
          ? []
          : [`vues actives [${views}] au lieu de [home]`];
      });
    }
    const roundName = 'allers-retours entre rubriques : jamais deux panneaux';
    await test({ ...ctx, section: 'contact' }, roundName, async () => {
      const problems = [];
      for (let round = 0; round < 3; round++)
        for (const id of [...MOUNTED, 'home'])
          await goTo(site, id);
      for (const id of MOUNTED) {
        const found = panels(site, id).length;
        if (found !== 1)
          problems.push(`#${id} : ${found} panneau(x) après les allers-retours`);
      }
      const total = site.doc.querySelectorAll('.status.hud').length;
      const hud = site.doc.querySelectorAll('#status .status.hud').length;
      if (total - hud !== MOUNTED.length)
        problems.push(`${total - hud} panneaux hors #status au lieu de ${MOUNTED.length}`);
      return problems;
    });
    const exitName = 'sortie par le bouton puis retour sur la rubrique : ' +
      'un seul panneau';
    await test({ ...ctx, section: 'skills' }, exitName, async () => {
      await goTo(site, 'skills');
      const { panel } = onePanel(site, 'skills');
      if (panel) {
        click(site, parts(panel).button);
        await settle(site, 'home');
      }
      await goTo(site, 'skills');
      return onePanel(site, 'skills').problems;
    });
    const fastName = 'bascules rapides de langue : dernière langue, un seul panneau';
    await test({ ...ctx, section: 'projects' }, fastName, async () => {
      await goTo(site, 'projects');
      const buttons = ['en', 'fr', 'en', 'fr', 'en'].map((code) =>
        site.doc.querySelector(`header.bar .lang button[data-lang="${code}"]`));
      for (const button of buttons) click(site, button);
      await waitFor(
        () => site.doc.documentElement.lang === 'en',
        5000,
        'langue finale en anglais',
      );
      const want = await unavailableTexts('en');
      await waitFor(
        () => textOf(view(site, 'projects')?.querySelector(`${PANEL} h2, ${PANEL} h3`)) ===
          normalize(want.title),
        5000,
        'titre du panneau en anglais',
        () => textOf(view(site, 'projects')?.querySelector(PANEL)),
      );
      const problems = await textProblems(site, 'projects', 'en');
      await switchTo(site, 'fr');
      return [...problems, ...await textProblems(site, 'projects', 'fr')];
    });
    await test(
      { ...ctx, section: null },
      'aucune exception non rattrapée',
      () => uncaught(site),
    );
  } finally {
    site.close();
  }
}

export async function runUnavailable(widths, mainWidth) {
  for (const width of widths) await runWidth(width);
  await runBehaviour(mainWidth);
}
