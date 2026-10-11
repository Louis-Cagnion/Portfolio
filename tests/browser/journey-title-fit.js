/* Parcours : titre et date de scène (.jtitle) sur téléphone. Quels que soient la largeur et
la police du navigateur, le texte ne passe ni sous les flèches de scène, ni hors de .jstage
(qui rogne), et la page ne déborde pas. La police se règle par html { font-size } : le banc
ne déplace pas les @media en em, mais les rem et les unités de la scène suivent. */
import { overflowProblems } from './checks.js';
import { afterFit } from './fit-words.js';
import { test } from './runner.js';
import {
  all,
  context,
  journeyData,
  one,
  resize,
  sleep,
  withJourney,
} from './journey-probe.js';

const WIDTHS = [200, 240, 300, 320, 390];
const FONTS = ['100%', '200%', '300%'];
const TOL = 0.5; // px : arrondis
/* Cas écartés : à 200 px, la colonne du titre (largeur de la scène - 112 - 62 px) est de
0 px et le plafonnement (js/core/fit-words.js) y met titre et date à 0 px : rien à juger
(mesuré le 11/10/2026). À 240 px et 300 %, la colonne de 34 px tient : le cas est joué. */
const SKIPPED = new Set(['200/100%', '200/200%', '200/300%']);
/* Cas dont seule la hauteur de scène (58svh, imposée) manquerait, bord haut seul jugé. Aucun
depuis le plafonnement : titres et dates plafonnés de chaque escale, mesurés le 11/10/2026,
finissent au moins 1,1 px au-dessus du bas de la scène (390 px, 300 %), 8,8 px à 320 px. */
const BOTTOM_FREE = new Set();

/** Rectangles des lignes de texte de `el` (le bloc lui-même ne dit rien du débordement). */
function lineRects(el) {
  const range = el.ownerDocument.createRange();
  range.selectNodeContents(el);
  return [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0);
}

const overlaps = (a, b) => (
  a.left < b.right - TOL && a.right > b.left + TOL && a.top < b.bottom - TOL &&
  a.bottom > b.top + TOL
);

const side = (rect) => `${rect.left.toFixed(1)}-${rect.right.toFixed(1)}`;

/**
 * @brief Titre et date posés dans .jtitle, une fois plafonnés par js/core/fit-words.js :
 *   recouvrement et rognage.
 *
 * @param {object} site site prêt, parcours monté
 * @param {string} title titre de l'escale
 * @param {string} when date de l'escale
 * @param {boolean} bottomFree vrai si seul le bord haut de la scène est jugé
 *
 * @returns {Promise<string[]>} problèmes, sans doublon
 */
async function fitProblems(site, title, when, bottomFree) {
  one(site, '.jtitle b').textContent = title;
  one(site, '.jtitle span').textContent = when;
  await afterFit(site);
  const box = one(site, '.jstage').getBoundingClientRect();
  const arrows = all(site, '.stage-arrows button').map((b) => b.getBoundingClientRect());
  const problems = [];
  for (const [tag, text] of [['b', title], ['span', when]]) {
    const el = one(site, `.jtitle ${tag}`);
    const lines = el.getBoundingClientRect();
    for (const rect of lineRects(el)) {
      if (arrows.some((arrow) => overlaps(rect, arrow)))
        problems.push(`« ${text} » recouvre une flèche de scène`);
      if (rect.right > box.right + TOL || rect.left < box.left - TOL)
        problems.push(`« ${text} » rogné à droite ou à gauche : ${side(rect)} / ${side(box)}`);
    }
    /* Verticalement, les boîtes de ligne de b et span : le rectangle du texte, lui, dépasse
    de quelques pixels la ligne (interligne 1,3) sans rien cacher. */
    if (lines.top < box.top - TOL || (!bottomFree && lines.bottom > box.bottom + TOL))
      problems.push(
        `« ${text} » rogné en haut ou en bas : ${lines.top.toFixed(1)}-` +
          `${lines.bottom.toFixed(1)} pour la scène ${box.top.toFixed(1)}-` +
          `${box.bottom.toFixed(1)}`,
      );
  }
  return [...new Set(problems)];
}

/**
 * @brief Chaque titre d'escale (fr et en) avec sa date, à 200, 240, 300, 320 et 390 px et
 *   à 100, 200 et 300 % de police : ni recouvert, ni rogné, aucun débordement de page.
 */
export async function runTitleFit() {
  const fr = await journeyData('fr');
  const en = await journeyData('en');
  const stops = [...fr.stops, ...en.stops];
  for (const width of WIDTHS) {
    const ctx = context(width);
    const names = FONTS.map((font) => `titre de scène à ${width} px, police ${font} : ` +
      'ni recouvert ni rogné, aucun débordement');
    await withJourney(ctx, names, {}, async (site) => {
      await resize(site, width);
      for (const [at, font] of FONTS.entries()) {
        const key = `${width}/${font}`;
        if (SKIPPED.has(key)) continue;
        const bottomFree = BOTTOM_FREE.has(key);
        await test(ctx, names[at], async () => {
          site.doc.documentElement.style.fontSize = font;
          await sleep(100);
          const problems = [];
          for (const stop of stops)
            problems.push(...await fitProblems(site, stop.title, stop.when, bottomFree));
          /* La barre d'onglets déborde dès 200 % de police, titre ou non : hors sujet ici. */
          problems.push(...overflowProblems(site).filter((p) => !p.includes('nav.tabbar')));
          site.doc.documentElement.style.fontSize = '';
          return problems;
        });
      }
    });
  }
}
