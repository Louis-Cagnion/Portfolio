/*
Indice d'erreur de #status (#status-hint, groupe « États ») : en erreur, il montre le texte
ui.errors.langHint de la langue en échec, entre la barre en pointillés et la rangée de
boutons ; pendant le chargement, il reste masqué. Module à part : states.js dépasse déjà
750 lignes.
*/
import {
  bounded,
  isVisible,
  makeFetch,
  makeStorage,
  openSite,
  waitStatus,
} from './harness.js';
import { languageTexts } from './language.js';
import { normalize } from './text.js';
import { skip, test } from './runner.js';

export const HINT_LOADING = 'indice d\'erreur masqué pendant le chargement';

/** Indice masqué pendant le chargement : #status en loading, fetch qui ne répond pas. */
export async function hintLoading(site, ctx) {
  await test(ctx, HINT_LOADING, async () => {
    const hint = site.doc.getElementById('status-hint');
    if (!hint) return ['#status-hint absent'];
    return isVisible(hint) ? ['#status-hint visible pendant le chargement'] : [];
  });
}

/** Faux fetch qui rejette, comme la cause « network » de states.js. */
const failingFetch = () => makeFetch(({ site }) => {
  throw new (site.win?.TypeError || TypeError)('Failed to fetch');
});

/**
 * Indice d'erreur en `lang` : texte de ui.errors.langHint, entre la barre et les boutons.
 */
export async function hintError(width, lang) {
  const ctx = { group: 'États', width, lang, section: 'status' };
  const name = `indice d'erreur en ${lang} : texte visible entre la barre et les boutons`;
  let site;
  try {
    site = await openSite({ width, storage: makeStorage({ lang }), fetch: failingFetch() });
  } catch (error) {
    skip(ctx, [name], `ouverture du site impossible (${error.message})`);
    return;
  }
  try {
    await test(ctx, name, async () => {
      await waitStatus(site, 'error', 5000);
      await bounded(site.doc.fonts.ready, 5000, 'polices').catch(() => {});
      const { data } = await languageTexts();
      const expected = data[lang]?.ui?.errors?.langHint;
      if (typeof expected !== 'string')
        return [`data/${lang}.json : ui.errors.langHint absent`];
      const hint = site.doc.getElementById('status-hint');
      if (!hint) return ['#status-hint absent'];
      const problems = [];
      if (!isVisible(hint)) problems.push('#status-hint non visible en erreur');
      const shown = normalize(hint.textContent);
      if (shown !== normalize(expected))
        problems.push(`#status-hint : « ${shown} » au lieu de « ${normalize(expected)} »`);
      const bar = site.doc.querySelector('#status .status-bar').getBoundingClientRect();
      const actions = site.doc.querySelector('#status .status-actions')
        .getBoundingClientRect();
      const box = hint.getBoundingClientRect();
      if (box.top < bar.bottom || box.bottom > actions.top)
        problems.push(
          `#status-hint hors de l'intervalle barre-boutons : haut ${box.top}, bas ` +
            `${box.bottom} ; barre bas ${bar.bottom}, boutons haut ${actions.top}`,
        );
      return problems;
    });
  } finally {
    site.close();
  }
}
