/* Projets : planètes actives ou inertes (S6.F2a). Décisions de Louis du 12/10/2026
(docs/design/plan.md, bloc « trois décisions ») : « (2) tout le système est sélectionnable en
vue générale : un clic sur son soleil, sur une planète ou sur le reste de sa cellule le zoome ;
(3) aucune planète ne s'ouvre ni ne se focalise tant qu'aucun système n'est zoomé (soleils et
liste restent le chemin au clavier), elles ne le deviennent que dans le système zoomé ».
Règle observable : une planète est ACTIVE si et seulement si son système porte `.sys.on`
(posée à l'entrée du zoom, retirée au début de la sortie), sinon INERTE.
- inerte : tabindex="-1" et aria-hidden="true" (hors ordre de tabulation) ; un clic zoome son
  système sans ouvrir de fiche ; Entrée ou Espace (focus donné par programme) n'ouvre rien ;
- active : tabindex="0", pas d'aria-hidden, aria-label = titre du projet (l'ouverture par clic,
  Entrée et Espace est jouée par projects.js, planetFiches).
Aucune durée supposée : le mouvement est réduit hors de la largeur principale. */
import { click, describe, waitFor } from './harness.js';
import { normalize } from './text.js';
import { test } from './runner.js';
import {
  isZoomed,
  labelOf,
  listOf,
  parts,
  planetOf,
  plain,
  press,
  pressEscape,
  rest,
  sheetOpen,
  sunOf,
  zoomIn,
} from './projects-probe.js';

const SETTLE_MS = 4000;

/** Remet le site au repos : fiche fermée, zoom quitté, mouvement terminé. */
async function toRest(site) {
  await rest(site);
  if (sheetOpen(site)) {
    pressEscape(site);
    await waitFor(() => !sheetOpen(site), SETTLE_MS, 'fiche fermée');
    await rest(site);
  }
  if (isZoomed(site)) {
    parts(site).back?.click();
    await waitFor(() => !isZoomed(site), SETTLE_MS, 'sortie du zoom');
    await rest(site);
  }
}

const tab = (el) => el.getAttribute('tabindex');

/** Vrai si le système de rang `index` porte `.on` (zoomé). */
const isOn = (site, index) => !!site.doc
  .querySelectorAll('#projects .sys')[index]?.classList.contains('on');

/** Problèmes d'une planète qui doit être inerte. */
function inertProblems(site, el, name) {
  const problems = [];
  if (!el) return [`planète « ${name} » absente`];
  if (el.getAttribute('tabindex') !== '-1')
    problems.push(`« ${name} » inerte : tabindex « ${tab(el)} » au lieu de -1`);
  if (el.getAttribute('aria-hidden') !== 'true')
    problems.push(`« ${name} » inerte : aria-hidden « ${el.getAttribute('aria-hidden')} »`);
  if (el.tabIndex >= 0) problems.push(`« ${name} » inerte mais dans l'ordre de tabulation`);
  if (labelOf(el) !== name) problems.push(`« ${name} » : aria-label « ${labelOf(el)} »`);
  return problems;
}

/** Problèmes d'une planète qui doit être active. */
function activeProblems(site, el, name) {
  const problems = [];
  if (!el) return [`planète « ${name} » absente`];
  if (el.getAttribute('tabindex') !== '0')
    problems.push(`« ${name} » active : tabindex « ${tab(el)} » au lieu de 0`);
  if (el.hasAttribute('aria-hidden'))
    problems.push(`« ${name} » active : aria-hidden « ${el.getAttribute('aria-hidden')} »`);
  if (labelOf(el) !== name) problems.push(`« ${name} » : aria-label « ${labelOf(el)} »`);
  return problems;
}

/**
 * Règle `.sys.on` : `zoomed` est le rang du système zoomé (-1 au repos). Contrôle d'abord que
 * `.sys.on` désigne bien ce système, puis l'état de chaque planète.
 */
function ruleProblems(site, systems, zoomed) {
  const on = [...site.doc.querySelectorAll('#projects .sys.on')];
  const problems = [];
  const wanted = zoomed < 0 ? 0 : 1;
  if (on.length !== wanted)
    problems.push(`${on.length} système(s) avec .on au lieu de ${wanted}`);
  systems.forEach((system, k) => {
    for (const project of system.projects) {
      const name = plain(project.title);
      const el = planetOf(site, project);
      if (k === zoomed) problems.push(...activeProblems(site, el, name));
      else problems.push(...inertProblems(site, el, name));
      if (el && (k === zoomed) !== !!el.closest('.sys.on'))
        problems.push(`« ${name} » : .sys.on ne correspond pas au système zoomé`);
    }
  });
  return problems.slice(0, 8);
}

/** Zoome sur un système par le soleil, vérifie la règle, puis revient au repos. */
async function ruleTests(site, ctx, text, systems) {
  const rested = 'planètes inertes au repos : tabindex -1, aria-hidden, nommées';
  await test(ctx, rested, async () => {
    await toRest(site);
    return ruleProblems(site, systems, -1);
  });
  await test(ctx, 'zoom du système 0 : ses planètes actives, celles des autres inertes',
    async () => {
      await toRest(site);
      const sun = sunOf(site, text, systems[0]);
      if (!sun) return ['soleil introuvable'];
      await zoomIn(site, sun, 'clic');
      return ruleProblems(site, systems, 0);
    });
  await test(ctx, 'retour au repos (début de la sortie) : toutes les planètes inertes',
    async () => {
      if (!isZoomed(site)) return ['non joué : système non zoomé'];
      parts(site).back.click();
      const problems = ruleProblems(site, systems, -1)
        .map((problem) => `dès le retour : ${problem}`);
      await toRest(site);
      return [...problems, ...ruleProblems(site, systems, -1)];
    });
  await test(ctx, 'zoom du dernier système : seules ses planètes sont actives', async () => {
    await toRest(site);
    const last = systems.length - 1;
    const sun = sunOf(site, text, systems[last]);
    if (!sun) return ['soleil introuvable'];
    await zoomIn(site, sun, 'clic');
    const problems = ruleProblems(site, systems, last);
    await toRest(site);
    return problems;
  });
}

// ---------- Gestes sur une planète inerte ----------

/** Rang du système et projet cibles : le dernier projet du système `index`. */
const targetOf = (systems, index) => ({
  system: systems[index],
  project: systems[index].projects.at(-1),
});

async function clickTests(site, ctx, text, systems) {
  const first = 0;
  const other = systems.length - 1;
  for (const [index, how] of [[first, 'clic'], [other, 'événement click']]) {
    const name = `${how} sur une planète au repos (système ${index}) : zoome, aucune fiche`;
    await test(ctx, name, async () => {
      await toRest(site);
      const { project } = targetOf(systems, index);
      const planet = planetOf(site, project);
      if (!planet) return [`planète « ${plain(project.title)} » absente`];
      if (how === 'clic') click(site, planet);
      else planet.dispatchEvent(new site.win.MouseEvent('click', { bubbles: true }));
      const problems = [];
      try {
        await waitFor(() => isZoomed(site) || sheetOpen(site), 3000, 'zoom ou fiche');
      } catch (error) {
        return [`ni zoom ni fiche : ${error.message}`];
      }
      await rest(site);
      if (sheetOpen(site)) problems.push('fiche ouverte par un clic sur une planète inerte');
      if (!isZoomed(site)) problems.push('système non zoomé par le clic sur sa planète');
      else problems.push(...ruleProblems(site, systems, index));
      await toRest(site);
      return problems;
    });
  }
}

async function keyTests(site, ctx, text, systems) {
  for (const [key, name] of [['Enter', 'Entrée'], [' ', 'Espace']]) {
    const title = `${name} sur une planète inerte (focus donné) : aucune fiche`;
    await test(ctx, title, async () => {
      await toRest(site);
      const { project } = targetOf(systems, 1);
      const planet = planetOf(site, project);
      if (!planet) return [`planète « ${plain(project.title)} » absente`];
      planet.focus();
      press(site, planet, key);
      await rest(site);
      const problems = sheetOpen(site)
        ? [`fiche ouverte par ${name} sur ${describe(planet)} inerte`]
        : [];
      await toRest(site);
      return problems;
    });
  }
  const others = 'Entrée sur une planète d\'un autre système zoomé : aucune fiche';
  await test(ctx, others, async () => {
    await toRest(site);
    const sun = sunOf(site, text, systems[0]);
    if (!sun) return ['soleil introuvable'];
    await zoomIn(site, sun, 'clic');
    const { project } = targetOf(systems, 1);
    const planet = planetOf(site, project);
    if (!planet) return [`planète « ${plain(project.title)} » absente`];
    planet.focus();
    press(site, planet, 'Enter');
    await rest(site);
    const problems = sheetOpen(site)
      ? [`fiche ouverte par Entrée sur ${describe(planet)} d'un système non zoomé`]
      : [];
    await toRest(site);
    return problems;
  });
}

// ---------- Reste de la cellule, soleil et liste ----------

async function cellTests(site, ctx, text, systems) {
  const cell = 'clic sur le reste de la cellule (.sys-hit) : zoome le système';
  await test(ctx, cell, async () => {
    await toRest(site);
    const index = systems.length - 1;
    const hit = site.doc.querySelectorAll('#projects .sys-hit')[index];
    if (!hit) return ['.sys-hit introuvable'];
    click(site, hit);
    try {
      await waitFor(() => isZoomed(site), 3000, 'zoom après le clic sur la cellule');
    } catch (error) {
      return [error.message];
    }
    await rest(site);
    const problems = sheetOpen(site) ? ['fiche ouverte par un clic sur la cellule'] : [];
    if (!isOn(site, index))
      problems.push(`système ${index} sans .on après le clic sur sa cellule`);
    await toRest(site);
    return problems;
  });
  await test(ctx, 'clic sur le soleil au repos : zoome toujours, aucune fiche', async () => {
    await toRest(site);
    const sun = sunOf(site, text, systems[1]);
    if (!sun) return ['soleil introuvable'];
    await zoomIn(site, sun, 'clic');
    const problems = sheetOpen(site) ? ['fiche ouverte par un clic sur le soleil'] : [];
    if (!isOn(site, 1))
      problems.push('système 1 sans .on après le clic sur son soleil');
    await toRest(site);
    return problems;
  });
}

async function listTests(site, ctx, text, systems) {
  const name = 'liste au repos : une entrée ouvre la fiche, sans zoom';
  await test(ctx, name, async () => {
    await toRest(site);
    const project = systems[1].projects[0];
    const entry = [...(listOf(site, text)?.querySelectorAll('button') ?? [])]
      .find((b) => normalize(b.textContent) === plain(project.title));
    if (!entry) return [`entrée « ${plain(project.title)} » absente`];
    entry.focus();
    entry.click();
    try {
      await waitFor(() => sheetOpen(site), 2500, 'fiche ouverte depuis la liste');
    } catch (error) {
      return [error.message];
    }
    await rest(site);
    const shown = normalize(site.doc.getElementById('sTitle')?.textContent ?? '');
    const problems = [];
    if (shown !== plain(project.title)) problems.push(`#sTitle « ${shown} » inattendu`);
    if (isZoomed(site)) problems.push('zoom déclenché par l\'ouverture depuis la liste');
    await toRest(site);
    return problems;
  });
}

/** Cas des planètes actives ou inertes d'un site ouvert sur Projets, au repos au départ. */
export async function runInert(site, ctx, text, systems) {
  await ruleTests(site, ctx, text, systems);
  await clickTests(site, ctx, text, systems);
  await keyTests(site, ctx, text, systems);
  await cellTests(site, ctx, text, systems);
  await listTests(site, ctx, text, systems);
}
