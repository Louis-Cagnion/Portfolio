/* Parcours (S7) : scénarios d'interaction (flèches, clavier, toucher, clics rapides). */
import { click, describe, settle } from './harness.js';
import { overflowProblems } from './checks.js';
import { noForeignText, switchTo } from './language.js';
import { expectEqual, test } from './runner.js';
import {
  BAR_GAP,
  TOL,
  all,
  arrowPairs,
  center,
  context,
  dist,
  eventually,
  journeyData,
  layoutProblems,
  near,
  nowIndex,
  one,
  openJourney,
  positionProblems,
  resize,
  scrollMax,
  selected,
  sleep,
  textProblems,
  uncaught,
  view,
  withJourney,
  wps,
} from './journey-probe.js';

const NO_PAIR = 'aucune paire de flèches affichée';

/** Clique sur la flèche précédente (`dir` < 0) ou suivante de la paire affichée. */
function pressArrow(site, dir) {
  const pair = arrowPairs(site).visible;
  if (pair) click(site, pair[dir > 0 ? 1 : 0]);
  return Boolean(pair);
}

/** Marche aller et retour par les flèches affichées, avec contrôle de chaque pas. */
export async function walkProblems(site, journey, width) {
  const problems = [];
  const last = journey.stops.length - 1;
  let index = nowIndex(journey);
  const press = async (dir) => {
    const pair = arrowPairs(site).visible;
    if (!pair) {
      problems.push(NO_PAIR);
      return false;
    }
    const button = pair[dir > 0 ? 1 : 0];
    button.focus();
    click(site, button);
    index += dir;
    const found = await eventually(() => positionProblems(site, journey, index, width));
    const step = dir > 0 ? 'suivant' : 'précédent';
    problems.push(...found.map((p) => `pas ${step} vers ${index + 1} : ${p}`));
    const focused = site.doc.activeElement;
    if ((dir > 0 ? index === last : index === 0) && focused !== pair[dir > 0 ? 0 : 1])
      problems.push(
        `bord atteint : le focus est sur ${focused && describe(focused)} ` +
          'au lieu de l\'autre flèche (checklist:314)',
      );
    return found.length === 0;
  };
  while (index > 0) if (!await press(-1)) return problems;
  while (index < last) if (!await press(1)) return problems;
  while (index > nowIndex(journey)) if (!await press(-1)) return problems;
  return problems;
}

/** Bascule de langue au milieu du parcours : l'escale choisie reste la même. */
export async function runLanguageMidway(width) {
  const name = 'bascule de langue sur une autre escale que l\'actuelle : ' +
    'même escale, aucun texte étranger';
  await withJourney(context(width), [name], {}, async (site) => {
    await test(context(width), name, async () => {
      const fr = await journeyData('fr');
      const en = await journeyData('en');
      const target = nowIndex(fr) - 2;
      for (let k = 0; k < 2; k += 1) if (!pressArrow(site, -1)) return [NO_PAIR];
      const problems = await eventually(() => positionProblems(site, fr, target, width));
      await switchTo(site, 'en');
      await settle(site, 'journey');
      return [
        ...problems,
        ...await eventually(() => positionProblems(site, en, target, width)),
        ...await noForeignText(site, 'en'),
      ];
    });
  });
}

/** Envoie un `keydown` annulable sur `el` et rend l'évènement. */
function keyEvent(site, el, key) {
  const init = { key, bubbles: true, cancelable: true };
  const event = new site.win.KeyboardEvent('keydown', init);
  el.dispatchEvent(event);
  return event;
}

/** Entrée et Espace choisissent une escale ; aucune autre touche ne change d'escale. */
export async function runKeyboard(width) {
  const ctx = context(width);
  const names = [
    'clavier : Entrée et Espace sur une escale la choisissent',
    'clavier : aucune autre touche (flèches comprises) ne change d\'escale',
  ];
  await withJourney(ctx, names, {}, async (site) => {
    const fr = await journeyData('fr');
    const now = nowIndex(fr);
    await test(ctx, names[0], async () => {
      const problems = [];
      for (const [key, target] of [['Enter', now - 1], [' ', now + 1]]) {
        const g = wps(site)[target];
        if (!g) return [`escale ${target + 1} absente`];
        g.focus();
        const label = JSON.stringify(key);
        if (!keyEvent(site, g, key).defaultPrevented)
          problems.push(`touche ${label} sur l'escale : preventDefault non appelé`);
        const found = await eventually(() => positionProblems(site, fr, target, width));
        problems.push(...found.map((p) => `touche ${label} : ${p}`));
      }
      return problems;
    });
    await test(ctx, names[1], async () => {
      const index = selected(site);
      const g = wps(site)[index];
      if (!g) return ['aucune escale rendue'];
      g.focus();
      for (const key of ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'a', 'Tab'])
        for (const target of [g, site.doc, site.doc.body])
          target.dispatchEvent(new site.win.KeyboardEvent('keydown', { key, bubbles: true }));
      await sleep(300);
      if (selected(site) === index) return [];
      return [`escale choisie passée de ${index + 1} à ${selected(site) + 1}`];
    });
  });
}

/** Fiche amenée sous la barre (à 8 px près), ou page au bout de sa course. */
function descentProblems(site) {
  const detail = one(site, '.detail')?.getBoundingClientRect();
  const bar = site.doc.querySelector('.bar');
  if (!detail || !bar) return ['.detail ou .bar absent'];
  const y = site.win.scrollY;
  if (y <= 0) return ['la page n\'a pas défilé vers la fiche (scrollY 0)'];
  const wanted = bar.offsetHeight + BAR_GAP;
  if (near(detail.top, wanted, TOL) || y >= scrollMax(site) - 1) return [];
  return [
    `fiche à ${detail.top.toFixed(0)} px du haut au lieu de ${wanted} px ` +
      `(scrollY ${y.toFixed(0)})`,
  ];
}

/** Toucher de l'escale actuelle (`selector` : zone ou dessin) : descente sans rejouer. */
async function tapNowProblems(site, fr, width, selector, smooth) {
  const now = nowIndex(fr);
  const target = wps(site)[now]?.querySelector(selector);
  if (!target) return [`escale actuelle : ${selector} absent`];
  const before = positionProblems(site, fr, now, width);
  if (before.length) return before;
  const ship = center(one(site, '.ship-g').getBoundingClientRect());
  const top = site.win.scrollY;
  click(site, target);
  const problems = [];
  if (one(site, '.ship-g')?.classList.contains('thrust'))
    problems.push('le vaisseau repart (.thrust) alors qu\'il est déjà à l\'escale actuelle');
  if (one(site, '.jtitle')?.classList.contains('out'))
    problems.push('.jtitle.out : le titre de scène s\'efface, trajet rejoué');
  problems.push(...await eventually(() => descentProblems(site), smooth ? 4000 : 1500));
  if (site.win.scrollY <= top) problems.push('scrollY n\'a pas augmenté');
  expectEqual(problems, 'escale choisie', selected(site), now);
  const after = center(one(site, '.ship-g').getBoundingClientRect());
  if (dist(ship, after) > 400)
    problems.push('le vaisseau a bougé de plus de 400 px dans la scène');
  return problems;
}

/** Toucher d'une autre escale, puis flèche depuis le bas de la page (téléphone). */
async function otherStopProblems(site, fr, width) {
  const now = nowIndex(fr);
  const g = wps(site)[now - 1];
  if (!g) return ['escale précédente absente'];
  click(site, g.querySelector('.hit'));
  const problems = await eventually(() => positionProblems(site, fr, now - 1, width));
  if (site.win.scrollY > 4) problems.push(`la page a défilé (scrollY ${site.win.scrollY})`);
  return problems;
}

async function arrowFromBottomProblems(site, fr, width) {
  for (let k = 0; k < nowIndex(fr); k += 1) if (!pressArrow(site, -1)) return [NO_PAIR];
  const problems = await eventually(() => positionProblems(site, fr, 0, width));
  const top = view(site).getBoundingClientRect().top + site.win.scrollY;
  site.win.scrollTo(0, top + 150);
  await sleep(100);
  if (site.win.scrollY <= top + 1)
    return [...problems, 'page trop courte pour descendre sous le haut de la rubrique'];
  pressArrow(site, 1);
  problems.push(...await eventually(() => positionProblems(site, fr, 1, width)));
  const back = await eventually(() => (near(site.win.scrollY, top, TOL)
    ? []
    : [
      `scrollY ${site.win.scrollY.toFixed(0)} au lieu du haut de la rubrique ` +
        `(${top.toFixed(0)})`,
    ]));
  return [...problems, ...back];
}

/** Téléphone : toucher de l'escale actuelle (fiche), d'une autre escale, flèche en bas. */
export async function runPhoneTouch(width) {
  const ctx = context(width);
  const names = [
    'téléphone : toucher de l\'escale actuelle = descente à sa fiche, ' +
      'sans rejouer le trajet',
    'téléphone : toucher du dessin de l\'escale actuelle (g.stop) : même descente',
    'téléphone : toucher de l\'escale actuelle, défilement doux (mouvement non réduit)',
    'téléphone : toucher d\'une autre escale = voyage vers elle, sans descendre',
    'téléphone : flèche depuis le bas de la page = retour en haut de la rubrique, ' +
      'escale suivante',
  ];
  const fr = await journeyData('fr');
  const cases = [
    [names[0], true, (site) => tapNowProblems(site, fr, width, '.hit', false)],
    [names[1], true, (site) => tapNowProblems(site, fr, width, '.stop', false)],
    [names[2], false, (site) => tapNowProblems(site, fr, width, '.hit', true)],
    [names[3], true, (site) => otherStopProblems(site, fr, width)],
    [names[4], true, (site) => arrowFromBottomProblems(site, fr, width)],
  ];
  for (const [name, reduce, probe] of cases)
    await withJourney(ctx, [name], { reduce }, (site) => test(ctx, name, () => probe(site)));
}

/** Bureau : le clic sur l'escale actuelle ne descend pas, celui d'une autre voyage. */
export async function runDesktopTouch(width) {
  const ctx = context(width);
  const names = [
    'bureau : clic sur l\'escale actuelle = aucune descente',
    'bureau : clic sur une autre escale = voyage vers elle',
  ];
  await withJourney(ctx, names, {}, async (site) => {
    const fr = await journeyData('fr');
    const now = nowIndex(fr);
    await test(ctx, names[0], async () => {
      const g = wps(site)[now];
      if (!g) return ['escale actuelle absente'];
      click(site, g.querySelector('.hit'));
      await sleep(400);
      const problems = await eventually(() => positionProblems(site, fr, now, width));
      if (site.win.scrollY > 2)
        problems.push(`la page a défilé (scrollY ${site.win.scrollY})`);
      return problems;
    });
    await test(ctx, names[1], async () => {
      const g = wps(site)[now + 1];
      if (!g) return ['escale suivante absente'];
      click(site, g.querySelector('.hit'));
      return eventually(() => positionProblems(site, fr, now + 1, width));
    });
  });
}

/** Clics rapides sur les flèches, mouvement non réduit : escale finale cohérente. */
export async function runRapid(width) {
  const ctx = context(width);
  const names = [
    'clics rapides sur suivant : trois pas, escale finale cohérente',
    'clics rapides alternés : précédent, précédent, suivant',
    'clics rapides au-delà des bornes : bornée à la dernière puis à la première escale',
  ];
  await withJourney(ctx, names, { reduce: false }, async (site) => {
    const fr = await journeyData('fr');
    const now = nowIndex(fr);
    const last = fr.stops.length - 1;
    const burst = (dirs) => dirs.forEach((dir) => pressArrow(site, dir));
    const settled = (index) => eventually(() => [
      ...positionProblems(site, fr, index, width),
      ...(all(site, '.ship-g').length === 1 ? [] : ['plusieurs .ship-g']),
    ], 8000);
    await test(ctx, names[0], async () => {
      burst([1, 1, 1].slice(0, Math.min(3, last - now)));
      return settled(Math.min(last, now + 3));
    });
    await test(ctx, names[1], async () => {
      const from = selected(site);
      burst([-1, -1, 1]);
      return settled(Math.max(0, from - 1));
    });
    await test(ctx, names[2], async () => {
      burst(Array(fr.stops.length + 4).fill(1));
      const problems = await settled(last);
      burst(Array(fr.stops.length + 4).fill(-1));
      return [...problems, ...await settled(0), ...uncaught(site)];
    });
  });
}

const RESIZE_WIDTHS = [881, 880, 768, 701, 700, 430, 320, 701, 1280, 700, 1280];

/** Redimensionnement de 1280 px à travers 880 et 700 px : escale gardée, sans doublon. */
export async function runResize() {
  const ctx = context(1280);
  const name = 'redimensionnement à travers 700 et 880 px : escale gardée, ' +
    'parcours reconstruit sans doublon';
  await withJourney(ctx, [name], {}, async (site) => {
    await test(ctx, name, async () => {
      const fr = await journeyData('fr');
      const count = fr.stops.length;
      const target = nowIndex(fr) - 2;
      for (let k = 0; k < 2; k += 1) pressArrow(site, -1);
      const problems = await eventually(() => positionProblems(site, fr, target, 1280));
      for (const width of RESIZE_WIDTHS) {
        await resize(site, width);
        const found = await eventually(() => [
          ...positionProblems(site, fr, target, width),
          ...layoutProblems(site, width),
          ...textProblems(site, fr, width),
          ...(wps(site).length === count ? [] : [`${wps(site).length} escales rebâties`]),
          ...(all(site, '.ship-g').length === 1 ? [] : ['plusieurs .ship-g']),
          ...(all(site, '.traj .pulse').length === 1 ? [] : ['plusieurs .pulse']),
          ...overflowProblems(site),
        ]);
        problems.push(...found.map((p) => `à ${width} px : ${p}`));
      }
      return [...problems, ...uncaught(site)];
    });
  });
}
