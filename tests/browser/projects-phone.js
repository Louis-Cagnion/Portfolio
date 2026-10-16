/* Projets : Piscine zoomée sur téléphone (320, 390 et 430 px ; plan.md:123 et :159,
arbre-s6.md:11, :15 et :41). Hypothèses de contrat, tirées de docs/design/s6/mockup.js : chaque
`.planet` contient `.pl-body` (le disque, dont le centre est celui de la planète), `.pl-hit`
(la zone de toucher) et `.pl-label` (l'étiquette, avec un `text`) ; plan dans `svg#systems`.
Invariants testés, jamais des rayons : 20 planètes et 20 étiquettes visibles et lisibles dans
le cadre, aucune étiquette sur une autre, centres à 44 px au moins, zones de 44 px, toucher aux
coordonnées (clic au point, scrollIntoView avant) : la planète au centre le plus proche gagne.
Le site est joué en mouvement réduit : planètes figées, coordonnées stables.
Zones de toucher (`.pl-hit`) : visibles (remplissage et filet de teinte `--live`) dans la
Piscine zoomée sur téléphone et à 768 px, transparentes au bureau et au repos
(plan.md, 13/10/2026). */
import { describe, isVisible } from './harness.js';
import { capped } from './checks.js';
import {
  centre,
  ficheCheck,
  isZoomed,
  labelOf,
  parts,
  planetOf,
  plain,
  sleep,
} from './projects-probe.js';
import { test } from './runner.js';

const MIN_ZONE = 44;
const TOLERANCE = 0.5;
const OVERLAP_PX = 1; // recouvrement toléré (arrondis)
const MIN_TEXT_PX = 10; // hauteur minimale du texte d'une étiquette à l'écran
const NEAR_OFFSET = 15; // décalage du point touché vers la planète voisine
const CLOSEST_PAIRS = 3;
const FILL_ALPHA = [0.03, 0.12]; // alpha du remplissage visible (maquette : 0,06)
const STROKE_ALPHA = [0.2, 0.5]; // alpha du filet visible (maquette : 0,35)
const TINT = [143, 227, 191]; // teinte --live (#8fe3bf)
const TINT_TOLERANCE = 3;
const STROKE_PX = 1;

const rect = (el) => el.getBoundingClientRect();
const bare = (text) => text.replace(/\s+/g, '');

/** Mesures de chaque planète du système (centre, zone, étiquette), dans l'ordre. */
function measure(site, system) {
  const svg = rect(parts(site).svg);
  const planets = system.projects.map((project) => {
    const el = planetOf(site, project);
    const body = el?.querySelector('.pl-body');
    const hit = el?.querySelector('.pl-hit');
    const label = el?.querySelector('.pl-label');
    return {
      project,
      el,
      body,
      hit,
      label,
      centre: body ? centre(rect(body)) : null,
      zone: hit ? rect(hit) : null,
      box: label ? rect(label) : null,
    };
  });
  return { svg, planets };
}

const absent = (planets) => planets
  .filter((p) => !p.el || !p.body || !p.hit || !p.label)
  .map((p) => `${plain(p.project.title)} : .planet, .pl-body, .pl-hit ou .pl-label absent`);

/** Paires de planètes triées par distance centre à centre croissante. */
function pairsByDistance(planets) {
  const pairs = [];
  planets.forEach((a, i) => {
    for (const b of planets.slice(i + 1))
      pairs.push({ a, b, dist: Math.hypot(a.centre.x - b.centre.x, a.centre.y - b.centre.y) });
  });
  return pairs.sort((p, q) => p.dist - q.dist);
}

const overlaps = (p, q) =>
  Math.min(p.right, q.right) - Math.max(p.left, q.left) > OVERLAP_PX &&
  Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top) > OVERLAP_PX;

/** Amène le plan dans la fenêtre avant de lire des coordonnées (piège 9 du contexte). */
async function bringIntoView(site) {
  parts(site).svg.scrollIntoView({ block: 'center' });
  await new Promise((resolve) => site.win.requestAnimationFrame(resolve));
  await sleep(50);
}

/** Clic aux coordonnées (x, y) de la fenêtre du cadre, sur l'élément qui s'y trouve. */
function clickAt(site, x, y) {
  const { win, doc } = site;
  const where = `(${x.toFixed(0)}, ${y.toFixed(0)})`;
  if (x < 0 || y < 0 || x >= win.innerWidth || y >= win.innerHeight)
    return `point ${where} hors de la fenêtre`;
  const target = doc.elementFromPoint(x, y);
  if (!target) return `aucun élément au point ${where}`;
  const init = { bubbles: true, cancelable: true, clientX: x, clientY: y };
  target.dispatchEvent(new win.MouseEvent('click', init));
  return null;
}

/** Clic en (x, y) puis contrôle de la fiche de `wanted` (focus rendu à sa planète). */
async function touch(site, context, wanted, point) {
  const failed = clickAt(site, point.x, point.y);
  if (failed) return [failed];
  const shown = { ...context, project: wanted.project };
  return ficheCheck(site, shown, wanted.el, true);
}

/** Cas qui exige le système zoomé et le contrat ; `fn(mesures)` rend les échecs. */
function zoomedCase(ctx, name, site, system, fn) {
  return test(ctx, name, async () => {
    if (!isZoomed(site)) return ['non joué : système non zoomé'];
    await bringIntoView(site);
    const found = measure(site, system);
    const missing = absent(found.planets);
    return missing.length ? capped(missing) : fn(found);
  });
}

function framedProblems({ svg, planets }) {
  const problems = [];
  for (const p of planets) {
    const name = plain(p.project.title);
    if (!isVisible(p.el) || !isVisible(p.label)) {
      problems.push(`${name} : planète ou étiquette non visible`);
      continue;
    }
    if (bare(p.label.textContent) !== bare(name))
      problems.push(`${name} : étiquette « ${p.label.textContent.trim()} »`);
    const glyph = rect(p.label.querySelector('text') ?? p.label);
    if (glyph.height < MIN_TEXT_PX)
      problems.push(`${name} : texte de ${glyph.height.toFixed(1)} px de haut`);
    const { box } = p;
    if (box.left < svg.left - 1 || box.right > svg.right + 1 ||
      box.top < svg.top - 1 || box.bottom > svg.bottom + 1)
      problems.push(`${name} : étiquette hors du cadre (${describe(p.label)})`);
  }
  return capped(problems);
}

function distanceProblems({ planets }) {
  const problems = [];
  for (const { a, b, dist } of pairsByDistance(planets))
    if (dist + TOLERANCE < MIN_ZONE)
      problems.push(
        `${plain(a.project.title)} et ${plain(b.project.title)} : ${dist.toFixed(1)} px`,
      );
  for (const p of planets)
    if (p.zone.width + TOLERANCE < MIN_ZONE || p.zone.height + TOLERANCE < MIN_ZONE)
      problems.push(`${plain(p.project.title)} : zone de ${p.zone.width.toFixed(1)} px`);
  return capped(problems);
}

/** Point à NEAR_OFFSET px du centre de `near`, en direction de `far`. */
function pointNear(near, far) {
  const from = centre(rect(near.body));
  const to = centre(rect(far.body));
  const step = NEAR_OFFSET / Math.hypot(to.x - from.x, to.y - from.y);
  return { x: from.x + (to.x - from.x) * step, y: from.y + (to.y - from.y) * step };
}

const styleOf = (site, el) => site.win.getComputedStyle(el);

/**
 * Canaux et alpha d'une couleur calculée : `rgb()`, `rgba()`, ou `color(srgb r g b / a)` que
 * Chrome rend pour `color-mix()` (canaux en fraction de 1). Null si illisible.
 */
function colorOf(value) {
  const srgb = /^color\(srgb (.*)\)$/.exec(value);
  if (srgb) {
    const parts = srgb[1].split(/[\s/]+/).filter(Boolean).map(Number);
    if (parts.length < 3 || parts.length > 4 || parts.some(Number.isNaN)) return null;
    return {
      rgb: parts.slice(0, 3).map((c) => Math.round(c * 255)),
      alpha: parts[3] ?? 1,
    };
  }
  const match = /^rgba?\((.*)\)$/.exec(value);
  if (!match) return null;
  const numbers = match[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  if (numbers.length < 3 || numbers.some(Number.isNaN)) return null;
  return { rgb: numbers.slice(0, 3), alpha: numbers[3] ?? 1 };
}

const inRange = (value, [min, max]) => value >= min && value <= max;
const isTint = (rgb) => rgb.every((c, k) => Math.abs(c - TINT[k]) <= TINT_TOLERANCE);

/** Problèmes d'une zone de toucher visible : remplissage, filet, épaisseur et teinte. */
function visibleHitProblems(name, style, width) {
  const where = `${name} à ${width} px`;
  const fill = colorOf(style.fill);
  const stroke = colorOf(style.stroke);
  if (!fill) return [`${where} : remplissage « ${style.fill} » illisible`];
  if (fill.alpha === 0) return [`${where} : zone transparente (remplissage ${style.fill})`];
  const problems = [];
  if (!inRange(fill.alpha, FILL_ALPHA) || !isTint(fill.rgb))
    problems.push(`${where} : remplissage ${style.fill}`);
  if (!stroke || !inRange(stroke.alpha, STROKE_ALPHA) || !isTint(stroke.rgb))
    problems.push(`${where} : filet ${style.stroke}`);
  if (parseFloat(style.strokeWidth) !== STROKE_PX)
    problems.push(`${where} : épaisseur de filet ${style.strokeWidth}`);
  return problems;
}

/** Problèmes d'une zone de toucher cachée : remplissage transparent, aucun filet. */
function hiddenHitProblems(name, style, width) {
  const where = `${name} à ${width} px`;
  const fill = colorOf(style.fill);
  const problems = [];
  if (!fill || fill.alpha !== 0)
    problems.push(`${where} : remplissage ${style.fill} au lieu de transparent`);
  if (style.stroke !== 'none')
    problems.push(`${where} : filet ${style.stroke} au lieu de none`);
  return problems;
}

/**
 * Zones de toucher visibles dans la Piscine zoomée (mode téléphone, jusqu'à 880 px) : seul
 * cas joué à 768 px, où `runPhonePiscine` ne joue pas. `site` est zoomé sur la Piscine.
 */
export function runHitVisible(site, ctx, system) {
  return zoomedCase(ctx, 'Piscine : zones de toucher visibles', site, system, ({ planets }) =>
    capped(planets.flatMap((p) => visibleHitProblems(
      plain(p.project.title),
      styleOf(site, p.hit),
      ctx.width,
    ))));
}

/**
 * Joue les cas de la Piscine zoomée sur téléphone. `context` = { text, system } (texte de la
 * langue, système de la Piscine) ; `site` est zoomé sur la Piscine.
 */
export async function runPhonePiscine(site, ctx, context) {
  const { system } = context;
  const count = system.projects.length;
  const run = (name, fn) => zoomedCase(ctx, name, site, system, fn);
  await run(`Piscine : ${count} planètes et étiquettes visibles, lisibles, cadrées`,
    framedProblems);
  await run('Piscine : aucune étiquette ne chevauche une autre', ({ planets }) => {
    const problems = [];
    planets.forEach((a, i) => {
      for (const b of planets.slice(i + 1))
        if (overlaps(a.box, b.box))
          problems.push(`${plain(a.project.title)} chevauche ${plain(b.project.title)}`);
    });
    return capped(problems);
  });
  await run('Piscine : centres à 44 px au moins, zones de toucher de 44 px', distanceProblems);
  await runHitVisible(site, ctx, system);
  await run('Piscine : toucher entre deux voisines, le centre le plus proche gagne',
    async ({ planets }) => {
      const problems = [];
      for (const { a, b } of pairsByDistance(planets).slice(0, CLOSEST_PAIRS))
        for (const [near, far] of [[a, b], [b, a]]) {
          await bringIntoView(site);
          const hit = await touch(site, context, near, pointNear(near, far));
          problems.push(...hit.map((p) => `${p} (voisine ${plain(far.project.title)})`));
        }
      return capped(problems);
    });
  await run('Piscine : toucher au centre de chaque planète, bon projet',
    async ({ planets }) => {
      const problems = [];
      for (const p of planets) {
        await bringIntoView(site);
        problems.push(...await touch(site, context, p, centre(rect(p.body))));
      }
      return capped(problems);
    });
}

/** Au repos sur téléphone (aucun système zoomé), aucune zone de toucher n'est visible. */
export async function runHitRest(site, ctx) {
  await test(ctx, 'repos : aucune zone de toucher visible', () => {
    if (isZoomed(site)) return ['non joué : système zoomé'];
    const hits = [...site.doc.querySelectorAll('#projects .pl-hit')];
    if (!hits.length) return ['aucune zone .pl-hit dans la rubrique'];
    return capped(hits.flatMap((hit) => hiddenHitProblems(
      labelOf(hit.closest('.planet')),
      styleOf(site, hit),
      ctx.width,
    )));
  });
}

/** Sur ordinateur, Piscine zoomée : les zones de toucher restent transparentes. */
export function runHitDesktop(site, ctx, system) {
  return zoomedCase(ctx, 'Piscine bureau : zones de toucher transparentes', site, system,
    ({ planets }) => capped(planets.flatMap((p) => hiddenHitProblems(
      plain(p.project.title),
      styleOf(site, p.hit),
      ctx.width,
    ))));
}
