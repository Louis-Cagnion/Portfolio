/* Rubrique Compétences (S8), AU REPOS : structure, constellations, étoiles, légende,
disposition, placement, bascule de langue, débordement et cibles. Le déploiement, la
plongée, le clavier et le mouvement sont dans skills-focus.js (S8.B3), les projets liés et
le lien Devpedia dans S8.B4. Contrat DOM et critères (mot pour mot) : README.md, groupe
competences. Cas par site (largeur, langue) ; le mouvement est réduit hors de la largeur
principale pour tenir le temps de la suite. Un cas supplémentaire à 2560 px (français). */
import { overflowProblems, targetProblems } from './checks.js';
import { describe, waitFor } from './harness.js';
import { noForeignText, switchTo } from './language.js';
import { recordExceptions, skip, test } from './runner.js';
import {
  LEVEL_ORDER,
  accessibleName,
  exactTexts,
  exploreOf,
  gate,
  gridFor,
  groupEls,
  labelOf,
  legendOf,
  openSkillsSite,
  parts,
  rest,
  skillsData,
  starCentre,
  starEls,
  starName,
  starsOf,
  surveyOf,
  textOf,
} from './skills-probe.js';
import { runSkillsFocus } from './skills-focus.js';
import { runSkillsRelated } from './skills-related.js';
import { runSkillsReview } from './skills-review.js';
import { normalize } from './text.js';

export const GROUP = 'Compétences';
const LANGS = ['fr', 'en'];
const OPENING = 'ouverture du site sur Compétences';
const WIDE_WIDTH = 2560;
const MIN_STAR_GAP = 24; // unités du dessin : deux astres plus proches se recouvriraient
const POSITION_TOLERANCE = 0.5; // unités du dessin entre deux langues
const EDGE_TOLERANCE = 1; // px entre cellules voisines ou d'une étoile au bord de sa cellule

const uncaught = (site) => site.uncaught.map((e) => `exception non rattrapée : ${e}`);
const plain = (html) => normalize(
  new DOMParser().parseFromString(html, 'text/html').body.textContent,
);

/** Un élément par entrée : mêmes éléments que les données, aucun absent, aucun en trop. */
function namesProblems(label, found, wanted) {
  const problems = [];
  for (const name of wanted)
    if (!found.includes(name)) problems.push(`${label} « ${name} » absent`);
  if (found.length !== wanted.length)
    problems.push(`${label} : ${found.length} trouvé(s) pour ${wanted.length} attendu(s)`);
  return problems.slice(0, 8);
}

// ---------- Structure et noms ----------

function structureProblems(site, text) {
  const found = parts(site);
  const problems = [];
  const required = [
    ['h2', found.title],
    ['p.lede', found.lede],
    ['#skillsLayout', found.layout],
    ['#skillsLayout > .viz-wrap', found.wrap],
    ['svg#constSvg', found.svg],
    ['p.hint', found.hint],
    ['.focus-panel', found.panel],
    ['.legend', found.legend],
  ];
  for (const [selector, el] of required)
    if (!el) problems.push(`#skills ${selector} introuvable`);
  if (problems.length) return problems;
  if (!found.layout.classList.contains('skills-layout'))
    problems.push('#skillsLayout sans la classe skills-layout');
  for (const name of ['viz', 'const'])
    if (!found.svg.classList.contains(name)) problems.push(`svg#constSvg sans .${name}`);
  if (found.svg.getAttribute('role') !== 'group')
    problems.push(`svg#constSvg : role « ${found.svg.getAttribute('role')} » ≠ group`);
  const name = accessibleName(site, found.svg);
  if (name !== plain(text.title))
    problems.push(`svg#constSvg : nom accessible « ${name} » au lieu de « ${text.title} »`);
  if (!found.panel.classList.contains('hud')) problems.push('.focus-panel sans la classe hud');
  return problems;
}

function textProblems(site, text) {
  const { title, lede, hint } = parts(site);
  const problems = [];
  const wanted = [
    ['h2', title, text.title],
    ['p.lede', lede, text.lede],
    ['p.hint', hint, text.hint],
  ];
  for (const [label, el, expected] of wanted)
    if (!el) problems.push(`${label} introuvable`);
    else if (textOf(el) !== plain(expected))
      problems.push(`${label} : « ${textOf(el).slice(0, 50)} » au lieu de « ${expected} »`);
  return problems;
}

function legendProblems(site, text) {
  const { legend } = parts(site);
  if (!legend) return ['.legend introuvable'];
  const problems = [];
  const found = [];
  for (const level of LEVEL_ORDER) {
    const wanted = legendOf(text, level);
    const hits = exactTexts(legend, wanted);
    if (hits.length !== 1) problems.push(`légende « ${wanted} » : ${hits.length} élément(s)`);
    found.push(hits[0]);
  }
  const placed = found.filter(Boolean);
  const before = (a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING;
  placed.slice(1).forEach((el, k) => {
    if (!before(placed[k], el)) problems.push('légende : entrées dans le désordre');
  });
  return problems;
}

async function structureTests(site, ctx, text) {
  await test(ctx, 'structure : h2, chapeau, plan nommé, aide, panneau, légende', () => {
    const missing = gate(site);
    return missing.length ? missing : structureProblems(site, text);
  });
  await test(ctx, 'h2[tabindex="-1"] : focus déplacé sur le titre à l\'arrivée', async () => {
    const { title } = parts(site);
    if (!title) return ['h2 introuvable'];
    const problems = [];
    if (title.getAttribute('tabindex') !== '-1')
      problems.push(`h2 : tabindex « ${title.getAttribute('tabindex')} » au lieu de -1`);
    try {
      await waitFor(() => site.doc.activeElement === title, 1500, 'focus sur le h2');
    } catch (error) {
      problems.push(`${error.message} (focus sur ${describe(site.doc.activeElement)})`);
    }
    return problems;
  });
  await test(ctx, 'aide et chapeau : textes de la langue', () => textProblems(site, text));
  await test(ctx, 'aucun .status dans #skills (panneau « indisponible » retiré)', () => {
    const { root } = parts(site);
    const hits = [...(root?.querySelectorAll('.status, [data-state="error"]') ?? [])];
    return hits.map((el) => `${describe(el)} encore dans #skills`);
  });
  await test(ctx, 'panneau .focus-panel.hud : vide et inert au repos', () => {
    const { panel } = parts(site);
    if (!panel) return ['.focus-panel introuvable'];
    const problems = [];
    if (!panel.inert) problems.push('.focus-panel sans inert au repos');
    if (textOf(panel))
      problems.push(`.focus-panel non vide : « ${textOf(panel).slice(0, 40)} »`);
    return problems;
  });
  await test(ctx,
    'légende : un astre par niveau, « {body} : {level} », niveau tel que skills.levels',
    () => legendProblems(site, text));
}

// ---------- Constellations et étoiles ----------

function focusProblems(site, groups) {
  const problems = [];
  for (const el of groups) {
    el.focus();
    if (site.doc.activeElement !== el) problems.push(`${describe(el)} non focalisable`);
    if (el.getAttribute('role') !== 'button') problems.push(`${describe(el)} : role≠button`);
    if (el.getAttribute('tabindex') !== '0')
      problems.push(`${describe(el)} : tabindex « ${el.getAttribute('tabindex')} »`);
  }
  site.doc.activeElement?.blur();
  return problems.slice(0, 8);
}

async function groupTests(site, ctx, text) {
  const groups = text.groups;
  await test(ctx, 'huit constellations : focalisables, nommées par skills.explore', () => {
    const missing = gate(site);
    if (missing.length) return missing;
    const found = groupEls(site);
    const wanted = groups.map((g) => exploreOf(text, g));
    return [
      ...namesProblems('constellation', found.map(labelOf), wanted),
      ...focusProblems(site, found),
    ];
  });
  await test(ctx, 'constellations : dans l\'ordre des données, .cname = short', () => {
    const missing = gate(site);
    if (missing.length) return missing;
    const found = groupEls(site);
    const problems = [];
    groups.forEach((group, k) => {
      const el = found[k];
      if (!el) return;
      if (labelOf(el) !== exploreOf(text, group))
        problems.push(`rang ${k} : « ${labelOf(el)} » ≠ « ${exploreOf(text, group)} »`);
      const short = textOf(el.querySelector('.cname'));
      if (short !== plain(group.short))
        problems.push(`${group.id} : .cname « ${short} » au lieu de « ${group.short} »`);
    });
    return problems.slice(0, 8);
  });
  const total = groups.reduce((sum, g) => sum + g.items.length, 0);
  await test(ctx, `étoiles : ${total}, chacune dans la constellation de son groupe`, () => {
    const missing = gate(site);
    if (missing.length) return missing;
    const found = groupEls(site);
    const problems = [];
    if (starEls(site).length !== total)
      problems.push(`${starEls(site).length} étoile(s) pour ${total} attendue(s)`);
    groups.forEach((group, k) => {
      const names = found[k] ? starsOf(found[k]).map(starName) : [];
      const wanted = group.items.map((item) => plain(item.name));
      problems.push(...namesProblems(`étoile de ${group.id}`, names, wanted));
    });
    return problems.slice(0, 8);
  });
  await test(ctx, 'étoiles au repos : tabindex="-1", hors de l\'ordre de tabulation', () => {
    const missing = gate(site);
    if (missing.length) return missing;
    const problems = [];
    for (const star of starEls(site)) {
      if (star.getAttribute('tabindex') !== '-1')
        problems.push(`${describe(star)} : tabindex « ${star.getAttribute('tabindex')} »`);
      if (star.tabIndex >= 0) problems.push(`${describe(star)} dans l'ordre de tabulation`);
      const tabbable = star.querySelectorAll('[tabindex]:not([tabindex="-1"])');
      if (tabbable.length) problems.push(`${describe(star)} contient un élément tabulable`);
    }
    return problems.slice(0, 8);
  });
  await test(ctx, 'ordre de tabulation de #skills : les huit constellations seulement', () => {
    const missing = gate(site);
    if (missing.length) return missing;
    const svg = parts(site).svg;
    const tabbable = [...svg.querySelectorAll('[tabindex]')].filter((el) => el.tabIndex >= 0);
    const found = tabbable.map(labelOf);
    return namesProblems('élément tabulable', found, groups.map((g) => exploreOf(text, g)));
  });
}

// ---------- Noms d'étoile sur deux lignes (nameLines) ----------

const LINES_CENTER_TOLERANCE = 1.5; // px : bloc du nom centré sur son astre
const LINES_X_TOLERANCE = 1; // px : deux lignes d'un même nom centrées l'une sur l'autre
const NAME_SHIFT = 24; // px : décalage à gauche du bloc à deux lignes en vue d'ensemble
const OVERLAP_TOLERANCE = 2; // px : marge d'approche des boîtes de deux noms (chasse)

const intersect = (a, b) => {
  const [dx, dy] = [Math.min(a.right, b.right) - Math.max(a.left, b.left),
    Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)];
  return dx > OVERLAP_TOLERANCE && dy > OVERLAP_TOLERANCE;
};

/** Les deux lignes d'une étoile à `nameLines` : textes, centrage, ordre, astre au-dessous. */
function twoLineProblems(star, lines, tspans) {
  const label = star.querySelector('text.name');
  const [first, second] = tspans.map((line) => line.getBoundingClientRect());
  const shown = tspans.map((line) => normalize(line.textContent));
  const problems = [];
  if (shown.join('|') !== lines.join('|'))
    problems.push(`lignes « ${shown.join(' | ')} » au lieu de « ${lines.join(' | ')} »`);
  if (tspans.length !== 2 || !first || !second) return [...problems, 'deux tspan attendus'];
  const gap = (first.x + first.width / 2) - (second.x + second.width / 2);
  if (Math.abs(gap) > LINES_X_TOLERANCE)
    problems.push(`lignes décentrées l'une de l'autre de ${gap.toFixed(1)} px`);
  if (second.top <= first.top) problems.push('la seconde ligne n\'est pas sous la première');
  const block = label.getBoundingClientRect();
  const centre = starCentre(star);
  const off = block.x + block.width / 2 - centre.x + NAME_SHIFT;
  if (Math.abs(off) > LINES_CENTER_TOLERANCE)
    problems.push(`bloc écarté de ${off.toFixed(1)} px de -${NAME_SHIFT} px de l'astre`);
  if (block.bottom > centre.y) problems.push('bloc au-dessous du centre de l\'astre');
  return problems;
}

/** Noms d'une langue : `nameLines` rendu en tspan, aucune autre étoile sur deux lignes. */
function nameLinesProblems(site, text) {
  const groups = groupEls(site);
  const problems = [];
  text.groups.forEach((group, k) => {
    const stars = groups[k] ? starsOf(groups[k]) : [];
    for (const star of stars) {
      const item = group.items.find((entry) => plain(entry.name) === starName(star));
      const tspans = [...star.querySelectorAll('text.name tspan')];
      const label = item?.id ?? starName(star);
      if (!item?.nameLines) {
        if (tspans.length) problems.push(`${label} : ${tspans.length} tspan sans nameLines`);
        continue;
      }
      problems.push(...twoLineProblems(star, item.nameLines, tspans)
        .map((fault) => `${label} : ${fault}`));
      const mine = star.querySelector('text.name').getBoundingClientRect();
      for (const other of stars) {
        const box = other.querySelector('text.name').getBoundingClientRect();
        if (other !== star && intersect(mine, box))
          problems.push(`${label} chevauche le nom « ${starName(other)} »`);
      }
    }
  });
  return problems.slice(0, 8);
}

async function nameLinesTests(site, ctx, text) {
  const wanted = text.groups.flatMap((group) => group.items).filter((item) => item.nameLines);
  await test(ctx, 'noms sur deux lignes : tspan de nameLines, centrés, sans chevauchement',
    () => {
      const missing = gate(site);
      if (missing.length) return missing;
      if (!wanted.length) return ['aucune étoile à nameLines dans les données'];
      return nameLinesProblems(site, text);
    });
}

// ---------- Disposition ----------

const near = (a, b, tolerance = EDGE_TOLERANCE) => Math.abs(a - b) <= tolerance;
const unique = (values) => [...new Set(values.map((v) => Math.round(v)))];

function cellProblems(survey, grid) {
  const problems = [];
  const missing = survey.filter((entry) => !entry.rect);
  if (missing.length) return ['rect.cell absent de la constellation'];
  const cells = survey.map((entry) => entry.rect);
  const columns = unique(cells.map((r) => r.left)).length;
  const rows = unique(cells.map((r) => r.top)).length;
  if (columns !== grid.cols) problems.push(`${columns} colonne(s) au lieu de ${grid.cols}`);
  if (rows !== grid.rows) problems.push(`${rows} rangée(s) au lieu de ${grid.rows}`);
  const [first] = cells;
  const ratio = grid.cellWidth / grid.cellHeight;
  cells.forEach((rect, k) => {
    if (!near(rect.width / rect.height, ratio, 0.01))
      problems.push(`cellule ${k} : ${rect.width.toFixed(0)} × ${rect.height.toFixed(0)} px`);
    if (!near(rect.width, first.width) || !near(rect.height, first.height))
      problems.push(`cellule ${k} : taille différente de la cellule 0`);
    const col = k % grid.cols;
    const row = Math.floor(k / grid.cols);
    const wantedLeft = first.left + col * first.width;
    const wantedTop = first.top + row * first.height;
    if (!near(rect.left, wantedLeft) || !near(rect.top, wantedTop))
      problems.push(`cellule ${k} : hors grille (colonne ${col}, rangée ${row})`);
  });
  cells.forEach((a, i) => cells.slice(i + 1).forEach((b, j) => {
    const across = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const down = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (across > EDGE_TOLERANCE && down > EDGE_TOLERANCE)
      problems.push(`cellules ${i} et ${i + j + 1} se chevauchent`);
  }));
  return problems.slice(0, 8);
}

function starProblems(survey, grid) {
  const problems = [];
  for (const { rect, stars, group } of survey) {
    if (!rect) continue;
    const id = describe(group).slice(-40);
    const slack = EDGE_TOLERANCE / (rect.width / grid.cellWidth);
    for (const { star, x, y } of stars) {
      const inside = x >= -slack && y >= -slack &&
        x <= grid.cellWidth + slack && y <= grid.cellHeight + slack;
      if (!inside) problems.push(`${starName(star)} hors de la cellule de ${id}`);
    }
    stars.forEach((a, i) => stars.slice(i + 1).forEach((b) => {
      if (Math.hypot(a.x - b.x, a.y - b.y) < MIN_STAR_GAP)
        problems.push(`${starName(a.star)} et ${starName(b.star)} se superposent`);
    }));
  }
  return problems.slice(0, 8);
}

async function layoutShapeTests(site, ctx, text, width) {
  const grid = gridFor(width, text.groups.length);
  const kind = grid.kind === 'desk' ? 'bureau' : 'téléphone';
  const label = `${grid.cols} colonnes de ${grid.cellWidth} × ${grid.cellHeight}`;
  await test(ctx, `${kind} : ${label}, cellules contiguës sans chevauchement`, () => {
    const missing = gate(site);
    if (missing.length) return missing;
    return cellProblems(surveyOf(site, width, text.groups.length), grid);
  });
  await test(ctx, `${kind} : étoiles dans leur cellule, sans superposition`, () => {
    const missing = gate(site);
    if (missing.length) return missing;
    const survey = surveyOf(site, width, text.groups.length);
    if (survey.some((entry) => !entry.rect)) return ['rect.cell absent de la constellation'];
    return starProblems(survey, grid);
  });
}

async function layoutTests(site, ctx, state) {
  await test(ctx, `${state} : aucun débordement horizontal`, () => {
    const missing = gate(site);
    return missing.length ? missing : overflowProblems(site);
  });
  await test(ctx, `${state} : cibles de 44 px (exceptions de la maquette)`, () => {
    const missing = gate(site);
    if (missing.length) return missing;
    const { problems, exceptions } = targetProblems(site, [parts(site).root]);
    recordExceptions(ctx, exceptions);
    return problems;
  });
}

// ---------- Bascule de langue au repos ----------

/** Nœuds qui doivent survivre à la bascule (update(content), mêmes nœuds). */
function keptNodes(site) {
  const found = parts(site);
  const legend = found.legend ? [...found.legend.querySelectorAll('*')] : [];
  return [
    found.title, found.lede, found.hint, found.svg, found.panel, found.legend,
    ...groupEls(site), ...starEls(site), ...legend,
  ];
}

function translatedProblems(site, other) {
  const problems = [...textProblems(site, other)];
  const groups = groupEls(site);
  other.groups.forEach((group, k) => {
    if (labelOf(groups[k]) !== exploreOf(other, group))
      problems.push(`constellation ${k} : « ${labelOf(groups[k])} » non traduite`);
    if (textOf(groups[k]?.querySelector('.cname')) !== plain(group.short))
      problems.push(`${group.id} : .cname non traduit`);
    const names = groups[k] ? starsOf(groups[k]).map(starName) : [];
    problems.push(...namesProblems(`étoile de ${group.id}`, names, group.items.map(
      (item) => plain(item.name),
    )));
  });
  problems.push(...nameLinesProblems(site, other));
  const name = accessibleName(site, parts(site).svg);
  if (name !== plain(other.title)) problems.push(`svg#constSvg : nom « ${name} » non traduit`);
  return [...problems, ...legendProblems(site, other)];
}

async function switchTests(site, ctx, lang, datas) {
  const other = lang === 'fr' ? 'en' : 'fr';
  const name = `bascule en ${other} au repos : textes traduits, mêmes nœuds, focus gardé`;
  await test(ctx, name, async () => {
    const missing = gate(site);
    if (missing.length) return missing;
    const groups = groupEls(site);
    const before = keptNodes(site);
    groups[2]?.focus();
    await switchTo(site, other);
    await rest(site);
    const after = keptNodes(site);
    const problems = [];
    if (before.length !== after.length)
      problems.push(`${after.length} nœud(s) suivis au lieu de ${before.length}`);
    else if (before.some((node, k) => node !== after[k]))
      problems.push('nœuds de la rubrique remplacés (update(content) doit les réutiliser)');
    if (site.doc.activeElement !== groups[2])
      problems.push(`focus sur ${describe(site.doc.activeElement)}, pas la constellation`);
    problems.push(...translatedProblems(site, datas[other]));
    return [...problems, ...await noForeignText(site, other)];
  });
}

/** Relevé des positions relatives à la cellule, par constellation, dans l'ordre du DOM. */
const placement = (site, width, count) => surveyOf(site, width, count)
  .map((entry) => entry.stars.map(({ x, y }) => [x, y]));

async function placementTest(site, ctx, lang, width, datas) {
  const other = lang === 'fr' ? 'en' : 'fr';
  const name = 'placement des étoiles identique en français et en anglais';
  await test(ctx, name, async () => {
    const missing = gate(site);
    if (missing.length) return missing;
    const count = datas[lang].groups.length;
    const here = placement(site, width, count);
    await switchTo(site, other);
    await rest(site);
    const there = placement(site, width, count);
    await switchTo(site, lang);
    await rest(site);
    const problems = [];
    if (here.length !== count) problems.push(`${here.length} constellation(s) relevée(s)`);
    here.forEach((stars, k) => stars.forEach(([x, y], i) => {
      const twin = there[k]?.[i];
      if (!twin) problems.push(`étoile ${k}/${i} absente après la bascule`);
      else if (Math.hypot(x - twin[0], y - twin[1]) > POSITION_TOLERANCE)
        problems.push(
          `étoile ${k}/${i} déplacée par la langue (${x.toFixed(1)}, ${y.toFixed(1)})`,
        );
    }));
    return problems.slice(0, 8);
  });
}

// ---------- Lancement ----------

async function runSite(width, lang, datas, mainWidth) {
  const ctx = { group: GROUP, section: 'skills', width, lang };
  const text = datas[lang];
  let site;
  try {
    site = await openSkillsSite(width, { lang, reduce: width !== mainWidth });
  } catch (error) {
    skip(ctx, [OPENING], `ouverture impossible (${error.message})`);
    return;
  }
  try {
    await structureTests(site, ctx, text);
    await groupTests(site, ctx, text);
    await nameLinesTests(site, ctx, text);
    await layoutShapeTests(site, ctx, text, width);
    await layoutTests(site, ctx, 'repos');
    await placementTest(site, ctx, lang, width, datas);
    await switchTests(site, ctx, lang, datas);
    await test(ctx, 'aucune exception non rattrapée', () => uncaught(site));
  } finally {
    site.close();
  }
}

/** Cas à 2560 px : disposition de bureau, étoiles, débordement et cibles. */
async function runWide(datas) {
  const ctx = { group: GROUP, section: 'skills', width: WIDE_WIDTH, lang: 'fr' };
  let site;
  try {
    site = await openSkillsSite(WIDE_WIDTH, { lang: 'fr', reduce: true });
  } catch (error) {
    skip(ctx, [OPENING], `ouverture impossible (${error.message})`);
    return;
  }
  try {
    await structureTests(site, ctx, datas.fr);
    await groupTests(site, ctx, datas.fr);
    await layoutShapeTests(site, ctx, datas.fr, WIDE_WIDTH);
    await layoutTests(site, ctx, 'repos');
    await test(ctx, 'aucune exception non rattrapée', () => uncaught(site));
  } finally {
    site.close();
  }
}

/**
 * Groupe « Compétences » : cas au repos par largeur et langue ; le cas à 2560 px avec la
 * largeur principale ; puis le déploiement (skills-focus.js).
 */
export async function runSkills(widths, mainWidth) {
  const datas = await skillsData();
  for (const width of widths)
    for (const lang of LANGS) await runSite(width, lang, datas, mainWidth);
  if (widths.includes(mainWidth)) await runWide(datas);
  await runSkillsFocus(widths, mainWidth);
  await runSkillsRelated(widths, mainWidth);
  await runSkillsReview(widths, mainWidth);
}
