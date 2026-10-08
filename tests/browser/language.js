// Bascule de langue : attributs, mémorisation, état conservé, aucun texte de l'autre langue,
// relecture au rechargement, cas limites (stockage, bascules rapides).
import {
  activeViews, click, goTo, makeStorage, openSite, readJson, realDataFetch, settle,
  throwingStorage, waitFor, waitStatus,
} from './harness.js';
import { foreignTextProblems } from './checks.js';
import { exclusiveSegments } from './text.js';
import { expectEqual, skip, test } from './runner.js';

const LANG_NAMES = { fr: 'français', en: 'anglais' };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Données réelles et morceaux propres à chaque langue (lus une fois). */
let texts = null;
export async function languageTexts() {
  if (!texts) {
    texts = (async () => {
      const fr = await readJson('data/fr.json');
      const en = await readJson('data/en.json');
      return { data: { fr, en }, only: { fr: exclusiveSegments(fr, en),
        en: exclusiveSegments(en, fr) } };
    })();
  }
  return texts;
}

/** Problèmes d'attributs pour la langue `lang` : lang, titre, description, aria-pressed. */
export async function langAttrProblems(site, lang) {
  const { data } = await languageTexts();
  const meta = data[lang]?.meta || {};
  const problems = [];
  const doc = site.doc;
  expectEqual(problems, 'html[lang]', doc.documentElement.lang, lang);
  if (typeof meta.title !== 'string') problems.push(`data/${lang}.json : meta.title absent`);
  else expectEqual(problems, '<title>', doc.title, meta.title);
  if (typeof meta.description !== 'string') {
    problems.push(`data/${lang}.json : meta.description absent`);
  } else {
    const description = doc.querySelector('meta[name="description"]');
    if (!description) problems.push('meta[name="description"] absent');
    else {
      expectEqual(problems, 'meta[name="description"]', description.content,
        meta.description);
    }
  }
  for (const code of ['fr', 'en']) {
    const button = doc.querySelector(`header.bar .lang button[data-lang="${code}"]`);
    if (!button) problems.push(`header.bar .lang button[data-lang="${code}"] absent`);
    else {
      expectEqual(problems, `button[data-lang="${code}"][aria-pressed]`,
        button.getAttribute('aria-pressed'), String(code === lang));
    }
  }
  return problems;
}

/** Clique sur le bouton de langue `lang`, attend html[lang] et le titre de cette langue. */
async function switchTo(site, lang) {
  const button = site.doc.querySelector(`header.bar .lang button[data-lang="${lang}"]`);
  if (!button) throw new Error(`header.bar .lang button[data-lang="${lang}"] absent`);
  const { data } = await languageTexts();
  click(site, button);
  await waitFor(() => site.doc.documentElement.lang === lang &&
    site.doc.title === data[lang]?.meta?.title, 5000, `bascule en ${LANG_NAMES[lang]}`,
  () => `html[lang]="${site.doc.documentElement.lang}", titre « ${site.doc.title} »`);
}

/** Aucun texte propre à l'autre langue dans tout le texte visible (rubrique, barre...). */
export async function noForeignText(site, lang) {
  const other = lang === 'fr' ? 'en' : 'fr';
  const { only } = await languageTexts();
  return foreignTextProblems(site, only[other], LANG_NAMES[other]);
}

/** Vérifie chaque rubrique dans `order` : aucun texte de l'autre langue. */
async function sweep(site, ctx, lang, order) {
  for (const section of order) {
    await test({ ...ctx, lang, section }, `après bascule : aucun texte ${LANG_NAMES[
      lang === 'fr' ? 'en' : 'fr']} visible`, async () => {
      await goTo(site, section);
      return noForeignText(site, lang);
    });
  }
}

const stateProblems = (site, id) => {
  const problems = [];
  const views = activeViews(site).map((v) => v.id);
  if (views.length !== 1 || views[0] !== id) {
    problems.push(`vues actives [${views.join(', ')}] au lieu de [${id}]`);
  }
  return expectEqual(problems, 'location.hash', site.win.location.hash, `#${id}`);
};

/** Scénario complet à une largeur : FR vers EN, rechargement, EN vers FR. */
export async function runLanguage(width) {
  const ctx = { group: 'Langue', width };
  let site;
  try {
    site = await openSite({ width, storage: makeStorage() });
    await waitStatus(site, 'ready');
    await settle(site, 'home');
  } catch (error) {
    site?.close();
    skip({ ...ctx, lang: 'fr' },
      ['langue initiale', 'bascule FR vers EN', 'bascule EN vers FR'],
      `ouverture du site impossible (${error.message})`);
    return;
  }
  try {
    await test({ ...ctx, lang: 'fr', section: 'home' }, 'langue initiale : français',
      () => langAttrProblems(site, 'fr'));
    const switched = await test({ ...ctx, lang: 'en', section: 'skills' },
      'FR vers EN : lang, <title>, description, aria-pressed', async () => {
        await goTo(site, 'skills');
        await switchTo(site, 'en');
        return langAttrProblems(site, 'en');
      });
    if (!switched && site.doc.documentElement.lang !== 'en') {
      skip({ ...ctx, lang: 'en' }, ['FR vers EN : suite du scénario'], 'bascule impossible');
      return;
    }
    await test({ ...ctx, lang: 'en', section: 'skills' }, 'FR vers EN : choix mémorisé (lang)',
      () => expectEqual([], 'storage.getItem("lang")', site.storage.getItem('lang'), 'en'));
    await test({ ...ctx, lang: 'en', section: 'skills' },
      'FR vers EN : rubrique et hash conservés',
      () => stateProblems(site, 'skills'));
    await sweep(site, ctx, 'en', ['skills', 'home', 'journey', 'projects', 'contact']);
    await test({ ...ctx, lang: 'en', section: 'home' },
      'rechargement : anglais relu du stockage',
      async () => {
        const again = await openSite({ width, storage: site.storage });
        try {
          await waitStatus(again, 'ready');
          return langAttrProblems(again, 'en');
        } finally {
          again.close();
        }
      });
    await test({ ...ctx, lang: 'fr', section: 'contact' },
      'EN vers FR : lang, <title>, description, aria-pressed, mémorisation, hash',
      async () => {
        await switchTo(site, 'fr');
        const problems = await langAttrProblems(site, 'fr');
        expectEqual(problems, 'storage.getItem("lang")', site.storage.getItem('lang'), 'fr');
        return [...problems, ...stateProblems(site, 'contact')];
      });
    await sweep(site, ctx, 'fr', ['contact', 'home', 'journey', 'skills', 'projects']);
    await test({ ...ctx, section: null }, 'aucune exception non rattrapée',
      () => site.uncaught.map((e) => `exception non rattrapée : ${e}`));
  } finally {
    site.close();
  }
}

/** Ouvre, attend ready, joue `body(site)`, ferme toujours. */
async function withSite(options, body) {
  const site = await openSite(options);
  try {
    await waitStatus(site, 'ready');
    const problems = (await body(site)) || [];
    return [...problems, ...site.uncaught.map((e) => `exception non rattrapée : ${e}`)];
  } finally {
    site.close();
  }
}

/** Cas limites de langue et de stockage, à une largeur. */
export async function runLanguageEdges(width) {
  const ctx = { group: 'Langue (limites)', width, section: 'home' };
  await test({ ...ctx, lang: 'fr' }, 'valeur mémorisée non supportée ("de") : français',
    () => withSite({ width, storage: makeStorage({ lang: 'de' }) },
      (site) => langAttrProblems(site, 'fr')));
  await test({ ...ctx, lang: 'fr' }, 'stockage qui lève : amorçage en français',
    () => withSite({ width, storage: throwingStorage() },
      (site) => langAttrProblems(site, 'fr')));
  await test({ ...ctx, lang: 'en' }, 'stockage qui lève : la bascule en anglais fonctionne',
    () => withSite({ width, storage: throwingStorage() }, async (site) => {
      await switchTo(site, 'en');
      return langAttrProblems(site, 'en');
    }));
  await test({ ...ctx, lang: 'fr' }, 'clic sur la langue déjà active : rien ne change',
    () => withSite({ width, storage: makeStorage() }, async (site) => {
      const active = site.doc.querySelector('header.bar .lang button[data-lang="fr"]');
      if (!active) return ['header.bar .lang button[data-lang="fr"] absent'];
      click(site, active);
      await sleep(500);
      const problems = await langAttrProblems(site, 'fr');
      expectEqual(problems, '#status[data-state]',
        site.doc.getElementById('status')?.dataset.state, 'ready');
      return problems;
    }));
  const slowEnglish = realDataFetch({ delays: { en: 400 } });
  await test({ ...ctx, lang: 'fr' },
    'bascules rapides EN puis FR (anglais lent) : état français',
    () => withSite({ width, storage: makeStorage(), fetch: slowEnglish },
      async (site) => {
        const button = (code) => site.doc.querySelector(
          `header.bar .lang button[data-lang="${code}"]`);
        if (!button('en') || !button('fr')) return ['boutons de langue absents'];
        click(site, button('en'));
        await sleep(50);
        click(site, button('fr'));
        await sleep(1200); // l'anglais arrive après 400 ms : il ne doit pas l'emporter
        const problems = await langAttrProblems(site, 'fr');
        if (site.storage.getItem('lang') === 'en') {
          problems.push('storage "lang" vaut "en" alors que le dernier choix est le français');
        }
        return [...problems, ...stateProblems(site, 'home')];
      }));
}
