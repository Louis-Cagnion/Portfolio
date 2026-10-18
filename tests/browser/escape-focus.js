/* Retour de focus après Échap (V1.F1, 18/10/2026). Une sortie par Échap rend le focus à
l'élément d'origine (constellation, soleil, planète) avec `focus({ focusVisible: false })` :
pas d'anneau de focus clavier après une touche. Une sortie par clic (bouton retour, fermeture
de la fiche) garde `focus()` nu. Un Échap du banc est synthétique : il ne change pas la
modalité du navigateur, donc les cas espionnent les options de `focus()` (spyCalls) au lieu de
`:focus-visible`. Un cas par sortie, à 390 et 1280 px, en français, mouvement réduit.
Le focus pendant le retour (V1.F6, 18/10/2026) se relève 300 ms après Échap, en mouvement réel
(`reduce: false`) : il doit déjà être sur la constellation ou le soleil, ni sur l'étoile, la
planète ni le panneau. */
import { click, describe, waitFor } from './harness.js';
import { closeBy } from './sheet.js';
import {
  isZoomed,
  openProjectsSite,
  parts as projectParts,
  planetOf,
  press,
  pressEscape,
  projectsData,
  rest as projectRest,
  sheetOpen,
  sleep,
  sunOf,
  zoomIn,
} from './projects-probe.js';
import { test } from './runner.js';
import {
  curStar,
  deploy,
  isDeployed,
  panelParts,
  spyCalls,
} from './skills-focus-probe.js';
import {
  groupEls,
  openSkillsSite,
  parts as skillParts,
  rest as skillRest,
  skillsData,
} from './skills-probe.js';

const SKILLS = 'Compétences';
const PROJECTS = 'Projets';
const SHEET = 'Fiche';
const WIDTHS = [390, 1280];
const WAIT_MS = 3000;
const MID_RETURN_MS = 300; // pendant le retour (1200 ms à la constellation, 900 ms au soleil)

/** Largeurs de WIDTHS que la suite joue (filtre `?widths=`). */
const pick = (widths) => WIDTHS.filter((width) => widths.includes(width));

/**
 * Cas sur un site neuf, en mouvement réduit : `fn(site, calls)` rend les problèmes. Les
 * appels de focus() sont espionnés avant le geste ; le site est fermé ensuite.
 */
function caseWith(ctx, name, open, fn) {
  return test(ctx, name, async () => {
    const site = await open();
    try {
      return await fn(site, spyCalls(site));
    } finally {
      site.close();
    }
  });
}

/**
 * Problèmes du retour de focus sur `node` : le dernier focus() doit porter
 * `focusVisible: false` après Échap (`quiet`), et ne pas le porter après un clic.
 */
function returnProblems(site, calls, node, { quiet, name }) {
  const call = [...calls.focus].reverse().find((each) => each.el === node);
  if (!call) return [`${name} : aucun focus() rendu`];
  const problems = [];
  const hidden = call.args[0]?.focusVisible === false;
  if (quiet && !hidden)
    problems.push(`${name} : focus() sans focusVisible: false après Échap`);
  if (!quiet && hidden)
    problems.push(`${name} : focus() avec focusVisible: false après un clic`);
  if (site.doc.activeElement !== node)
    problems.push(`focus sur ${describe(site.doc.activeElement)}`);
  return problems;
}

/**
 * Sort par Échap, puis relève le focus 300 ms plus tard, pendant le retour animé : la vue doit
 * encore bouger, et le focus être déjà sur `node` (constellation ou soleil).
 */
async function escapeMidReturn(site, node, { view, name }) {
  const before = view(site);
  pressEscape(site);
  await sleep(MID_RETURN_MS);
  const problems = [];
  if (view(site) === before) problems.push(`${name} : retour achevé avant 300 ms`);
  if (site.doc.activeElement !== node) {
    const active = describe(site.doc.activeElement);
    problems.push(`focus sur ${active} 300 ms après Échap, au lieu de ${name}`);
  }
  return problems;
}

/** Zoome sur le premier système par Entrée ; rend son soleil (le nœud ne change pas). */
async function zoomFirst(site, text) {
  const sun = sunOf(site, text, text.systems[0]);
  if (!sun) throw new Error('soleil du premier système introuvable');
  await zoomIn(site, sun, 'Entrée');
  return sun;
}

/** Ouvre la fiche du premier projet depuis sa planète (Entrée) ; rend la planète. */
async function openFromPlanet(site, text) {
  await zoomFirst(site, text);
  const planet = planetOf(site, text.systems[0].projects[0]);
  if (!planet) throw new Error('planète du premier projet introuvable');
  planet.focus();
  press(site, planet, 'Enter');
  await waitFor(() => sheetOpen(site), WAIT_MS, 'fiche ouverte');
  await projectRest(site);
  return planet;
}

/** Groupe « Compétences » : retour par Échap et par le bouton, à 390 et 1280 px. */
export async function runEscapeSkills(widths) {
  const datas = await skillsData();
  for (const width of pick(widths)) {
    const ctx = { group: SKILLS, section: 'skills', width, lang: 'fr' };
    const open = () => openSkillsSite(width, { lang: 'fr', reduce: true });
    await caseWith(
      ctx,
      'Échap : focus rendu à la constellation sans anneau',
      open,
      async (site, calls) => {
        const group = groupEls(site)[0];
        await deploy(site, 0, 'clic');
        calls.focus.length = 0;
        pressEscape(site);
        await waitFor(() => !isDeployed(site), WAIT_MS, 'retour').catch(() => {});
        await skillRest(site);
        return returnProblems(site, calls, group, { quiet: true, name: 'constellation' });
      },
    );
    await caseWith(
      ctx,
      'bouton « Toutes les compétences » (clic) : focus sans focusVisible: false',
      open,
      async (site, calls) => {
        const group = groupEls(site)[0];
        await deploy(site, 0, 'clic');
        const { back } = panelParts(site, datas.fr);
        if (!back) return ['bouton « Toutes les compétences » absent'];
        calls.focus.length = 0;
        click(site, back);
        await waitFor(() => !isDeployed(site), WAIT_MS, 'retour').catch(() => {});
        await skillRest(site);
        return returnProblems(site, calls, group, { quiet: false, name: 'constellation' });
      },
    );
    const live = () => openSkillsSite(width, { lang: 'fr', reduce: false });
    const skillView = (site) => skillParts(site).svg?.getAttribute('viewBox');
    await caseWith(
      ctx,
      'Échap pendant le retour : focus rendu à la constellation, pas à l’étoile',
      live,
      async (site) => {
        const group = groupEls(site)[0];
        await deploy(site, 0, 'clic');
        curStar(site).focus();
        return escapeMidReturn(site, group, { view: skillView, name: 'constellation' });
      },
    );
    await caseWith(
      ctx,
      'Échap pendant le retour : focus rendu à la constellation, pas au panneau',
      live,
      async (site) => {
        const group = groupEls(site)[0];
        await deploy(site, 0, 'clic');
        const { back } = panelParts(site, datas.fr);
        if (!back) return ['bouton « Toutes les compétences » absent'];
        back.focus();
        return escapeMidReturn(site, group, { view: skillView, name: 'constellation' });
      },
    );
  }
}

/** Groupe « Projets » : retour par Échap et par le bouton, à 390 et 1280 px. */
export async function runEscapeProjects(widths) {
  const { fr } = await projectsData();
  for (const width of pick(widths)) {
    const ctx = { group: PROJECTS, section: 'projects', width, lang: 'fr' };
    const open = () => openProjectsSite(width, { lang: 'fr', reduce: true });
    await caseWith(
      ctx,
      'Échap : focus rendu au soleil sans anneau',
      open,
      async (site, calls) => {
        const sun = await zoomFirst(site, fr);
        calls.focus.length = 0;
        pressEscape(site);
        await waitFor(() => !isZoomed(site), WAIT_MS, 'zoom quitté').catch(() => {});
        await projectRest(site);
        return returnProblems(site, calls, sun, { quiet: true, name: 'soleil' });
      },
    );
    await caseWith(
      ctx,
      'bouton « Tous les systèmes » (clic) : focus sans focusVisible: false',
      open,
      async (site, calls) => {
        const sun = await zoomFirst(site, fr);
        const { back } = projectParts(site);
        if (!back) return ['bouton « Tous les systèmes » absent'];
        calls.focus.length = 0;
        click(site, back);
        await waitFor(() => !isZoomed(site), WAIT_MS, 'zoom quitté').catch(() => {});
        await projectRest(site);
        return returnProblems(site, calls, sun, { quiet: false, name: 'soleil' });
      },
    );
    const live = () => openProjectsSite(width, { lang: 'fr', reduce: false });
    const projectView = (site) => projectParts(site).svg?.getAttribute('viewBox');
    await caseWith(
      ctx,
      'Échap pendant le retour : focus rendu au soleil, pas à la planète',
      live,
      async (site) => {
        const sun = await zoomFirst(site, fr);
        const planet = planetOf(site, fr.systems[0].projects[0]);
        if (!planet) return ['planète du premier projet introuvable'];
        planet.focus();
        return escapeMidReturn(site, sun, { view: projectView, name: 'soleil' });
      },
    );
  }
}

/** Groupe « Fiche » : fermeture par Échap et par le bouton, à 390 et 1280 px. */
export async function runEscapeSheet(widths) {
  const { fr } = await projectsData();
  for (const width of pick(widths)) {
    const ctx = { group: SHEET, section: 'projects', width, lang: 'fr' };
    const open = () => openProjectsSite(width, { lang: 'fr', reduce: true });
    await caseWith(
      ctx,
      'Échap : focus rendu à la planète sans anneau',
      open,
      async (site, calls) => {
        const planet = await openFromPlanet(site, fr);
        calls.focus.length = 0;
        pressEscape(site);
        await waitFor(() => !sheetOpen(site), WAIT_MS, 'fiche fermée').catch(() => {});
        await projectRest(site);
        return returnProblems(site, calls, planet, { quiet: true, name: 'planète' });
      },
    );
    await caseWith(
      ctx,
      'bouton de fermeture (clic) : focus sans focusVisible: false',
      open,
      async (site, calls) => {
        const planet = await openFromPlanet(site, fr);
        calls.focus.length = 0;
        await closeBy(site, 'bouton');
        return returnProblems(site, calls, planet, { quiet: false, name: 'planète' });
      },
    );
  }
}
