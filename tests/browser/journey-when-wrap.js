/* Parcours : date de l'escale actuelle sans espace (40 caractères) dans la fiche. Elle doit
passer à la ligne comme le titre voisin, sans débordement horizontal de la page. */
import { overflowProblems } from './checks.js';
import { test } from './runner.js';
import {
  context,
  detailProblems,
  editedFetch,
  eventually,
  nowIndex,
  withJourney,
} from './journey-probe.js';

/** Date de 40 caractères sans espace : donnée `when` extrême d'une escale. */
const LONG_WHEN = '0123456789'.repeat(4);

/**
 * @brief Date extrême de l'escale actuelle : fiche conforme et aucun débordement à `width` px.
 *
 * @param {number} width largeur jouée
 */
export async function runWhenWrap(width) {
  const ctx = context(width);
  const name = `date de 40 caractères sans espace dans la fiche à ${width} px : ` +
    'aucun débordement';
  let journey = null;
  const fetch = editedFetch((data, lang) => {
    const stop = data.stops.find((item) => item.now);
    stop.when = LONG_WHEN;
    if (lang === 'fr') journey = data;
  });
  await withJourney(ctx, [name], { fetch }, (site) => test(ctx, name, async () => [
    ...await eventually(() => detailProblems(site, journey, nowIndex(journey), width)),
    ...overflowProblems(site),
  ]));
}
