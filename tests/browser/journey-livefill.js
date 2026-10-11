/* Parcours : la fiche (aria-live) n'écrit que ce qui change. Réactiver l'escale déjà choisie
(clic ou Entrée au bureau) ne touche à rien dans la fiche et ne relance pas le fondu ; choisir
une autre escale ou changer de langue réécrit bien la fiche. Sur téléphone, toucher l'escale
actuelle descend à la fiche sans `select` : aucun geste n'y réécrit la fiche, cas non joué. */
import { click, settle } from './harness.js';
import { switchTo } from './language.js';
import { test } from './runner.js';
import {
  context,
  detailProblems,
  eventually,
  journeyData,
  nowIndex,
  one,
  sleep,
  withJourney,
  wps,
} from './journey-probe.js';

const QUIET_MS = 400; // ms : de quoi laisser passer une écriture ou un fondu éventuels

/** Espionne `animate` de la fenêtre du banc : renvoie la liste des éléments animés. */
function spyAnimate(site) {
  const animated = [];
  const proto = site.win.Element.prototype;
  const original = proto.animate;
  proto.animate = function spy(...args) {
    animated.push(this);
    return original.apply(this, args);
  };
  return animated;
}

/** Observe tout changement de texte ou de nœuds dans la fiche (`records` les accumule). */
function watchDetail(site, records) {
  const observer = new site.win.MutationObserver((list) => records.push(...list));
  observer.observe(one(site, 'article.detail'), {
    childList: true,
    characterData: true,
    subtree: true,
  });
  return observer;
}

/** Entrée appuyée puis relâchée sur l'escale `g`. */
function pressEnter(site, g) {
  const init = { key: 'Enter', bubbles: true, cancelable: true };
  g.dispatchEvent(new site.win.KeyboardEvent('keydown', init));
  g.dispatchEvent(new site.win.KeyboardEvent('keyup', init));
}

/** Réactive l'escale `index` par `gesture`, puis liste les écritures dans la fiche. */
async function reactivate(site, index, gesture) {
  const animated = spyAnimate(site);
  const records = [];
  const observer = watchDetail(site, records);
  gesture(wps(site)[index]);
  await sleep(QUIET_MS);
  records.push(...observer.takeRecords());
  observer.disconnect();
  const problems = [];
  if (records.length) problems.push(`${records.length} mutation(s) dans la fiche`);
  if (animated.length) problems.push(`${animated.length} fondu(s) relancé(s)`);
  return problems;
}

/**
 * @brief Fiche du parcours : réactiver l'escale choisie n'écrit rien, un autre choix et la
 *   bascule de langue réécrivent la fiche (bureau seulement).
 *
 * @param {number} width largeur jouée (bureau)
 */
export async function runLiveFill(width) {
  const ctx = context(width);
  const names = [
    `fiche à ${width} px : clic sur l'escale déjà choisie, aucune écriture ni fondu`,
    `fiche à ${width} px : Entrée sur l'escale déjà choisie, aucune écriture ni fondu`,
    `fiche à ${width} px : autre escale choisie, textes et corps mis à jour`,
    `fiche à ${width} px : bascule en anglais, fiche réécrite en anglais`,
  ];
  await withJourney(ctx, names, { reduce: false }, async (site) => {
    const fr = await journeyData('fr');
    const english = await journeyData('en');
    const now = nowIndex(fr);
    const other = now > 0 ? now - 1 : now + 1;
    await test(ctx, names[0], () => reactivate(site, now, (g) => {
      click(site, g.querySelector('.hit'));
    }));
    await test(ctx, names[1], () => reactivate(site, now, (g) => pressEnter(site, g)));
    await test(ctx, names[2], async () => {
      click(site, wps(site)[other].querySelector('.hit'));
      return eventually(() => detailProblems(site, fr, other, width));
    });
    await test(ctx, names[3], async () => {
      await switchTo(site, 'en');
      await settle(site, 'journey');
      return eventually(() => detailProblems(site, english, other, width));
    });
  });
}
