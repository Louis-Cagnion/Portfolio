/* Corps de la fiche d'un projet (V1.F5, 18/10/2026). Le corps suit les blocs du projet et rien
d'autre : son premier paragraphe est le premier bloc de texte (le résumé n'est pas affiché),
ses paragraphes et puces (p et li de #sBody) sont les blocs dans l'ordre, suivis d'un
paragraphe par lien, et aucun élément ne répète le précédent. Un cas par projet de
data/fr.json, ouvert par un clic sur son entrée de la liste, à 390 et 1280 px. */
import { click, waitFor } from './harness.js';
import {
  listOf,
  openProjectsSite,
  plain,
  pressEscape,
  projectsData,
  rest,
  sheetOpen,
} from './projects-probe.js';
import { test } from './runner.js';
import { normalize } from './text.js';

const GROUP = 'Fiche';
const WIDTHS = [390, 1280];
const WAIT_MS = 3000;
const SHOWN = 60; // caractères d'un texte dans un message

/** Textes bruts attendus dans le corps : chaque bloc, puis chaque item de liste. */
function blockTexts(project) {
  return project.blocks.flatMap((block) => (block.type === 'text'
    ? [plain(block.html)]
    : block.items.map(plain)));
}

/** Problèmes du corps de la fiche ouverte pour `project` (texte, ordre, nombre, doublons). */
function bodyProblems(site, project) {
  const body = site.doc.getElementById('sBody');
  const texts = [...body.querySelectorAll('p, li')]
    .map((node) => normalize(node.textContent));
  const wanted = blockTexts(project);
  const problems = [];
  const [head] = project.blocks;
  const lead = normalize(body.querySelector('p')?.textContent);
  if (head.type === 'text' && lead !== plain(head.html))
    problems.push(`premier paragraphe « ${lead.slice(0, SHOWN)} » au lieu du bloc`);
  const expected = wanted.length + project.links.length;
  if (texts.length !== expected)
    problems.push(`${texts.length} éléments au lieu de ${expected} (blocs et liens)`);
  const at = wanted.findIndex((text, i) => texts[i] !== text);
  if (at !== -1) {
    const got = String(texts[at] ?? '').slice(0, SHOWN);
    const want = wanted[at].slice(0, SHOWN);
    problems.push(`élément ${at + 1} : « ${got} » au lieu de « ${want} »`);
  }
  texts.forEach((text, i) => {
    if (text && text === texts[i + 1])
      problems.push(`éléments ${i + 1} et ${i + 2} identiques : « ${text.slice(0, SHOWN)} »`);
  });
  return problems;
}

/** Ouvre la fiche de `project` par son entrée de la liste, rend les problèmes du corps. */
async function bodyCase(site, fr, project) {
  const name = plain(project.title);
  const list = listOf(site, fr);
  const entry = [...(list?.querySelectorAll('button') ?? [])]
    .find((button) => normalize(button.textContent) === name);
  if (!entry) return [`entrée « ${name} » absente de la liste`];
  try {
    click(site, entry);
    await waitFor(() => sheetOpen(site), WAIT_MS, `fiche de « ${name} » ouverte`);
    await rest(site);
    return bodyProblems(site, project);
  } finally {
    if (sheetOpen(site)) pressEscape(site);
    await waitFor(() => !sheetOpen(site), WAIT_MS, `fiche de « ${name} » fermée`)
      .catch(() => {});
    await rest(site);
  }
}

/** Groupe « Fiche » : le corps de chaque projet de data/fr.json, à 390 et 1280 px. */
export async function runSheetBody(widths) {
  const { fr } = await projectsData();
  for (const width of WIDTHS.filter((each) => widths.includes(each))) {
    const ctx = { group: GROUP, section: 'projects', width, lang: 'fr' };
    const site = await openProjectsSite(width, { lang: 'fr', reduce: true });
    try {
      for (const system of fr.systems)
        for (const project of system.projects) {
          const name = `${plain(project.title)} : corps = blocs puis liens, sans doublon`;
          await test(ctx, name, () => bodyCase(site, fr, project));
        }
    } finally {
      site.close();
    }
  }
}
