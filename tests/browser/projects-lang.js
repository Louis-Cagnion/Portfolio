/* Projets : bascule de langue (plan.md:123, critère 7). Après la bascule, la rubrique garde le
système zoomé et la fiche ouverte (mêmes nœuds, update(view)), traduit tous les textes et ne
déplace pas le focus. Trois cas par site : pendant un zoom, pendant une fiche ouverte (retour
à la langue de départ), puis au repos. Le projet suivi est celui qui a des liens et le plus de
contenu : son lien dans la fiche porte le focus. */
import { describe, isVisible, waitFor } from './harness.js';
import { noForeignText, switchTo } from './language.js';
import { normalize } from './text.js';
import { test } from './runner.js';
import {
  approachOf,
  categoryOf,
  countOf,
  isZoomed,
  labelOf,
  listOf,
  parts,
  planetEls,
  planetOf,
  plain,
  pressEscape,
  rest,
  sheetOpen,
  sunOf,
  zoomIn,
} from './projects-probe.js';

/** Projet à liens au contenu le plus long : { index du système, index du projet }. */
function featured(systems) {
  let best = null;
  systems.forEach((system, i) => system.projects.forEach((project, j) => {
    const size = JSON.stringify(project).length;
    if (project.links.length && (!best || size > best.size)) best = { size, i, j };
  }));
  return best;
}

/** Textes du système zoomé, du soleil et des planètes dans la langue `text`. */
function zoomTextProblems(site, text, index) {
  const system = text.systems[index];
  const { title, count, intro } = parts(site);
  const problems = [];
  if (!isZoomed(site)) return ['zoom perdu à la bascule'];
  if (!normalize(title?.textContent ?? '').includes(system.name))
    problems.push(`.ctitle sans « ${system.name} »`);
  if (normalize(count?.textContent ?? '') !== countOf(text, system.projects.length))
    problems.push(`.count « ${count?.textContent.trim()} » non traduit`);
  if (normalize(intro?.textContent ?? '') !== plain(system.intro))
    problems.push('intro non traduite');
  if (!sunOf(site, text, system))
    problems.push(`soleil « ${approachOf(text, system)} » absent`);
  for (const project of system.projects)
    if (!planetOf(site, project)) problems.push(`planète « ${plain(project.title)} » absente`);
  return problems.slice(0, 8);
}

async function duringZoom(site, ctx, datas, lang, pick) {
  const other = lang === 'fr' ? 'en' : 'fr';
  const name = `bascule en ${other} pendant un zoom : même système, focus gardé`;
  await test(ctx, name, async () => {
    const sun = sunOf(site, datas[lang], datas[lang].systems[pick.i]);
    if (!sun) return ['soleil introuvable'];
    await zoomIn(site, sun, 'clic');
    const planet = planetOf(site, datas[lang].systems[pick.i].projects[pick.j]);
    planet?.focus();
    await switchTo(site, other);
    await rest(site);
    const problems = zoomTextProblems(site, datas[other], pick.i);
    if (site.doc.activeElement !== planet)
      problems.push(`focus sur ${describe(site.doc.activeElement)} au lieu de la planète`);
    else if (labelOf(planet) !== plain(datas[other].systems[pick.i].projects[pick.j].title))
      problems.push('planète gardée mais son nom n\'est pas traduit');
    return [...problems, ...await noForeignText(site, other)];
  });
}

const bodyNodes = (site) => [...site.doc.getElementById('sBody').children];

async function duringSheet(site, ctx, datas, lang, pick) {
  const other = lang === 'fr' ? 'en' : 'fr';
  const name = `bascule en ${lang} pendant une fiche : même fiche, mêmes nœuds`;
  await test(ctx, name, async () => {
    const from = datas[other].systems[pick.i];
    const into = datas[lang].systems[pick.i];
    const origin = planetOf(site, from.projects[pick.j]);
    if (!origin) return ['planète du projet introuvable'];
    origin.dispatchEvent(new site.win.MouseEvent('click', { bubbles: true }));
    await waitFor(() => sheetOpen(site), 2500, 'fiche ouverte');
    await rest(site);
    const link = site.doc.querySelector('#sBody a[href]');
    link?.focus();
    const before = bodyNodes(site);
    const title = site.doc.getElementById('sTitle');
    await switchTo(site, lang);
    await rest(site);
    const problems = [];
    const shown = normalize(title.textContent);
    const project = into.projects[pick.j];
    if (shown !== plain(project.title)) problems.push(`#sTitle « ${shown} » non traduit`);
    const cat = normalize(site.doc.getElementById('sCat').textContent);
    if (cat !== categoryOf(datas[lang], into)) problems.push(`#sCat « ${cat} » non traduit`);
    if (!sheetOpen(site)) problems.push('fiche fermée par la bascule');
    if (title !== site.doc.getElementById('sTitle')) problems.push('#sTitle remplacé');
    const after = bodyNodes(site);
    if (before.length !== after.length || before.some((n, i) => n !== after[i]))
      problems.push('nœuds de #sBody remplacés (update(view) doit les réutiliser)');
    if (!link) problems.push('aucun lien dans la fiche pour porter le focus');
    else if (site.doc.activeElement !== link)
      problems.push(`focus sur ${describe(site.doc.activeElement)} au lieu du lien`);
    pressEscape(site);
    await waitFor(() => !sheetOpen(site), 3000, 'fiche fermée par Échap');
    if (!isZoomed(site)) problems.push('zoom quitté par la fermeture de la fiche');
    return [...problems, ...await noForeignText(site, lang)];
  });
}

async function atRest(site, ctx, datas, lang) {
  const other = lang === 'fr' ? 'en' : 'fr';
  const name = `bascule en ${other} au repos : soleils, planètes et liste traduits`;
  await test(ctx, name, async () => {
    parts(site).back?.click();
    await waitFor(() => !isZoomed(site), 3000, 'sortie du zoom');
    await rest(site);
    await switchTo(site, other);
    await rest(site);
    const text = datas[other];
    const problems = [];
    const found = text.systems.map((s) => sunOf(site, text, s));
    if (found.some((s) => !s)) problems.push('soleil non traduit');
    const titles = text.systems.flatMap((s) => s.projects.map((p) => plain(p.title)));
    const lost = titles.filter((t) => !planetEls(site).some((p) => labelOf(p) === t));
    if (lost.length) problems.push(`${lost.length} planète(s) non traduite(s) : ${lost[0]}`);
    const list = listOf(site, text);
    const buttons = [...(list?.querySelectorAll('button') ?? [])];
    const entries = buttons.map((b) => normalize(b.textContent));
    if (!list || !isVisible(list)) problems.push(`liste « ${text.listLabel} » absente`);
    else if (titles.some((t) => !entries.includes(t)))
      problems.push('entrées de liste non traduites');
    return [...problems, ...await noForeignText(site, other)];
  });
}

/** Cas de bascule de langue d'un site ouvert dans `lang`, à jouer après les autres cas. */
export async function runSwitch(site, ctx, lang, datas) {
  const pick = featured(datas[lang].systems);
  await duringZoom(site, ctx, datas, lang, pick);
  await duringSheet(site, ctx, datas, lang, pick);
  await atRest(site, ctx, datas, lang);
}
