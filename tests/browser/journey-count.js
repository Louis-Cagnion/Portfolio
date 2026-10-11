/* Parcours : en-tête de la fiche. Une espace sépare la date du compteur (texte copié ou lu,
césure possible), l'écart visible reste celui de la maquette (10 px, css/journey.css:40-45) et
l'en-tête de fiche reste dans la fenêtre à 300 % de police sous 280 px. */
import { test } from './runner.js';
import { context, eventually, one, resize, withJourney } from './journey-probe.js';

const MOCKUP_GAP = 10; // px : écart de la maquette entre la date et le compteur
const GAP_TOLERANCE = 1; // px
const NARROW_WIDTHS = [240, 200];

/** Texte de l'en-tête : une espace entre la date et le compteur, sinon la jonction colle. */
function textProblems(site) {
  const when = one(site, '.detail .when');
  const count = one(site, '.detail .count');
  const head = one(site, 'article.detail header > div');
  if (!when || !count || !head) return ['date, compteur ou en-tête de fiche absent'];
  const joined = `${when.textContent}${count.textContent}`;
  if (head.textContent.includes(joined))
    return [`date et compteur collés dans le texte : « ${joined} »`];
  return [];
}

/** Écart entre la fin de la date et le début du compteur (mesuré s'ils sont sur une ligne). */
function gapProblems(site) {
  const when = one(site, '.detail .when');
  const count = one(site, '.detail .count');
  if (!when || !count) return ['date ou compteur absent'];
  const before = [...when.getClientRects()].pop();
  const after = count.getClientRects()[0];
  // Date à la ligne : le compteur démarre sur une autre ligne, l'écart ne se voit pas.
  if (!before || !after || Math.abs(before.top - after.top) > before.height / 2) return [];
  const gap = after.left - before.right;
  if (Math.abs(gap - MOCKUP_GAP) <= GAP_TOLERANCE) return [];
  return [`écart date / compteur de ${gap.toFixed(2)} px au lieu de ${MOCKUP_GAP} px`];
}

/**
 * Éléments de l'en-tête de fiche qui sortent de la fenêtre de `width` px.
 * Le titre de scène du téléphone (`.jtitle`) déborde seul à 300 % : hors de ce cas.
 */
function headerProblems(site, width) {
  const head = one(site, 'article.detail header');
  if (!head) return ['en-tête de fiche absent'];
  const tolerance = 0.5; // px : arrondis de sous-pixel
  return [head, ...head.querySelectorAll('*')]
    .filter((el) => el.getBoundingClientRect().right > width + tolerance)
    .map((el) => `${width} px : ${el.tagName.toLowerCase()} déborde de la fenêtre`);
}

/**
 * @brief Compteur de la fiche : espace dans le texte, écart de la maquette, en-tête dans
 *   la fenêtre à 300 % de police sous 280 px.
 *
 * @param {number} width largeur jouée
 */
export async function runCountGap(width) {
  const ctx = context(width);
  const names = [
    `compteur de la fiche à ${width} px : espace entre la date et le compteur`,
    `compteur de la fiche à ${width} px : écart de la maquette (10 px à 1 px près)`,
    `compteur de la fiche à ${width} px : en-tête dans la fenêtre à 300 % (240 et 200 px)`,
  ];
  await withJourney(ctx, names, {}, async (site) => {
    await test(ctx, names[0], () => eventually(() => textProblems(site)));
    await test(ctx, names[1], () => eventually(() => gapProblems(site)));
    await test(ctx, names[2], async () => {
      site.doc.documentElement.style.fontSize = '300%';
      const problems = [];
      for (const narrow of NARROW_WIDTHS) {
        await resize(site, narrow);
        problems.push(...headerProblems(site, narrow));
      }
      return problems;
    });
  });
}
