/* Parcours (S8) : l'escale choisie porte aria-current="step", seule, à chaque choix. */
import { click } from './harness.js';
import { expectEqual, test } from './runner.js';
import {
  NO_PAIR,
  context,
  eventually,
  journeyData,
  nowIndex,
  positionProblems,
  pressArrow,
  withJourney,
  wps,
} from './journey-probe.js';

/**
 * Une seule escale porte aria-current : celle de `index`, avec la valeur « step ».
 * Les autres escales n'ont pas l'attribut (une valeur « false » compterait comme présente).
 */
function currentProblems(site, index) {
  const list = wps(site);
  if (!list[index]) return [`escale ${index + 1} absente`];
  const marked = list.flatMap((g, at) => (g.hasAttribute('aria-current') ? [at] : []));
  if (marked.length !== 1)
    return [`${marked.length} escale(s) avec aria-current au lieu d'une`];
  const problems = [];
  expectEqual(problems, 'escale avec aria-current', marked[0] + 1, index + 1);
  expectEqual(
    problems,
    'valeur de aria-current',
    list[index].getAttribute('aria-current'),
    'step',
  );
  return problems;
}

/** Escale choisie : `aria-current="step"` sur elle seule, à l'ouverture et après un choix. */
export async function runCurrentAria(width) {
  const ctx = context(width);
  const names = [
    'aria-current : à l\'ouverture, seule l\'escale actuelle porte aria-current="step"',
    'aria-current : après une flèche, seule l\'escale choisie le porte (ancienne retirée)',
    'aria-current : après un clic sur une autre escale, seule celle-ci le porte',
  ];
  await withJourney(ctx, names, {}, async (site) => {
    const fr = await journeyData('fr');
    const now = nowIndex(fr);
    const dir = now > 0 ? -1 : 1;
    const first = now + dir;
    const second = first + 1 < fr.stops.length ? first + 1 : first - 1;
    await test(ctx, names[0], () => eventually(() => currentProblems(site, now)));
    await test(ctx, names[1], async () => {
      if (!pressArrow(site, dir)) return [NO_PAIR];
      return eventually(() => [
        ...positionProblems(site, fr, first, width),
        ...currentProblems(site, first),
      ]);
    });
    await test(ctx, names[2], async () => {
      const g = wps(site)[second];
      if (!g) return [`escale ${second + 1} absente`];
      click(site, g.querySelector('.hit'));
      return eventually(() => [
        ...positionProblems(site, fr, second, width),
        ...currentProblems(site, second),
      ]);
    });
  });
}
