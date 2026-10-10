/* États de #status : chargement visible, une erreur par cause, Réessayer qui aboutit.
Contrat de la cause « unexpected » (fixé par le moniteur ; checklist de design, section 8) :
- toute exception autre que LocaleError levée pendant request(), au chargement ou à
  l'affichage, met #status en data-state="error" avec le texte ui.errors.unexpected de la
  langue demandée, role="alert", focus sur le titre du panneau, Réessayer visible ;
- #status ne montre ni texte d'exception ni trace de pile ; l'erreur d'origine (ou une erreur
  qui la porte en `cause`) part en console.error ;
- la promesse de boot() se résout, jamais rejetée ; aucune exception non rattrapée ;
- Réessayer remet data-state="loading", puis relance jusqu'à "ready" ;
- depuis cet état, la bascule de langue de la barre affiche l'autre langue (ou son erreur).
Déclencheurs posés par `prepare` avant boot() : AbortController retiré du cadre (API absente,
levée au chargement : loadLocale crée le signal de son fetch) et meta[name="description"]
retiré (élément manquant, levée à l'affichage). Un fetch qui lève ne convient pas : loadLocale
le classe en 'network' par contrat. */
import {
  activeViews,
  bounded,
  click,
  describe,
  errorText,
  hangingResponse,
  isVisible,
  makeFetch,
  makeStorage,
  openSite,
  readJson,
  readText,
  ROOT,
  response,
  statusState,
  waitFor,
  waitStatus,
} from './harness.js';
import { overflowProblems, targetProblems } from './checks.js';
import { languageTexts } from './language.js';
import { duplicateMessages, normalize } from './text.js';
import { recordExceptions, skip, test } from './runner.js';

const FIXTURE = 'tests/fixtures/valid-locale.json';
const SCHEMA_PATH = 'meta.title'; // champ retiré pour provoquer l'erreur de schéma
// Causes provoquées par le faux fetch ; unexpected l'est par un déclencheur posé avant boot().
const FETCH_CAUSES = ['network', 'timeout', 'http', 'json', 'schema'];
export const CAUSES = [...FETCH_CAUSES, 'unexpected'];
const CAUSE_NAMES = {
  network: 'fetch rejeté',
  timeout: 'délai dépassé (timeoutMs 50)',
  http: 'HTTP 500',
  json: 'JSON invalide',
  schema: `schéma invalide (${SCHEMA_PATH} absent)`,
  unexpected: 'exception inattendue',
};
const LANGS = ['fr', 'en'];
// Pages d'erreur mesurées à chaque largeur : chaque cause dans chaque langue, [cause, langue].
const LAYOUT_CASES = CAUSES.flatMap((cause) => LANGS.map((lang) => [cause, lang]));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function locale(lang, broken) {
  const data = structuredClone(await readJson(FIXTURE));
  data.meta.lang = lang;
  if (broken) delete data.meta.title;
  return JSON.stringify(data);
}

/**
 * Faux fetch piloté par `state.mode` : 'ok' (fixture valide), une cause d'erreur, ou 'gate'
 * (répond comme 'ok' une fois `state.gate` résolue).
 */
function scriptedFetch(state) {
  return makeFetch(async (args) => {
    const { lang, site } = args;
    switch (state.mode) {
      case 'network': throw new (site.win?.TypeError || TypeError)('Failed to fetch');
      case 'timeout': return hangingResponse(args);
      case 'http': return response(site, 'erreur serveur', 500);
      case 'json': return response(site, '{ "meta": { "lang": ');
      case 'schema': return response(site, await locale(lang || 'fr', true));
      case 'gate':
        await state.gate;
        return response(site, await locale(lang || 'fr'));
      default: return response(site, await locale(lang || 'fr'));
    }
  });
}

/** Message d'erreur affiché, sans le texte du bouton Réessayer. */
function statusMessage(site) {
  const copy = site.doc.getElementById('status').cloneNode(true);
  copy.querySelectorAll('button').forEach((button) => button.remove());
  return normalize(copy.textContent);
}

const retryButton = (site) => site.doc.querySelector('#status button[data-action="retry"]');

function readyProblems(site) {
  const problems = [];
  if (isVisible(site.doc.getElementById('status'))) problems.push('#status encore visible');
  const views = activeViews(site).length;
  if (views !== 1) problems.push(`${views} .view.on au lieu d'une`);
  return problems;
}

const uncaughtProblems = (site) => site.uncaught.map((e) => `exception non rattrapée : ${e}`);

async function staticLoading(width) {
  const ctx = { group: 'États', width, section: 'status' };
  await test(ctx, 'chargement visible avant tout JS (amorçage bloqué)', async () => {
    const site = await openSite({ width, boot: false });
    try {
      const status = site.doc.getElementById('status');
      if (!status) return ['#status absent du HTML statique'];
      const problems = [];
      if (status.dataset.state !== 'loading') problems.push(`#status : ${statusState(site)}`);
      if (!normalize(status.textContent)) problems.push('#status : texte de chargement vide');
      if (!isVisible(status)) problems.push('#status : non visible');
      return problems;
    } finally {
      site.close();
    }
  });
}

async function pendingLoading(width) {
  const ctx = { group: 'États', width, section: 'status' };
  let release;
  const state = { mode: 'gate', gate: new Promise((resolve) => { release = resolve; }) };
  let site;
  try {
    site = await openSite({ width, fetch: scriptedFetch(state) });
  } catch (error) {
    release();
    skip(
      ctx,
      ['loading visible tant que fetch ne répond pas', 'loading puis ready'],
      `ouverture du site impossible (${error.message})`,
    );
    return;
  }
  try {
    await test(ctx, 'loading visible tant que fetch ne répond pas', async () => {
      await sleep(300);
      const status = site.doc.getElementById('status');
      if (!status) return ['#status absent'];
      const problems = [];
      if (status.dataset.state !== 'loading') problems.push(`#status : ${statusState(site)}`);
      if (!isVisible(status)) problems.push('#status : non visible pendant le chargement');
      if (!normalize(status.textContent)) problems.push('#status : texte de chargement vide');
      if (site.fetch.calls.length === 0) problems.push('aucun appel au fetch injecté');
      return problems;
    });
    await test(ctx, 'loading puis ready quand fetch répond', async () => {
      release();
      await waitStatus(site, 'ready', 5000);
      return [...readyProblems(site), ...uncaughtProblems(site)];
    });
  } finally {
    release();
    site.close();
  }
}

/** Une cause : état error, message et bouton visibles, puis Réessayer jusqu'à ready. */
async function errorCause(width, cause, messages) {
  const ctx = { group: 'États', width, section: 'status' };
  const label = `erreur ${CAUSE_NAMES[cause]}`;
  const state = { mode: cause };
  let site;
  try {
    site = await openSite({
      width,
      fetch: scriptedFetch(state),
      timeoutMs: cause === 'timeout' ? 50 : undefined,
    });
  } catch (error) {
    skip(
      ctx,
      [`${label} : état error et message`, `${label} : Réessayer aboutit à ready`],
      `ouverture du site impossible (${error.message})`,
    );
    return;
  }
  try {
    const shown = await test(ctx, `${label} : état error et message`, async () => {
      await waitStatus(site, 'error', cause === 'timeout' ? 3000 : 5000);
      const problems = [];
      if (!isVisible(site.doc.getElementById('status'))) problems.push('#status non visible');
      const message = statusMessage(site);
      messages[cause] = message;
      if (!message) problems.push('#status : message d\'erreur vide');
      if (cause === 'http' && !message.includes('500'))
        problems.push(`#status : le message « ${message} » ne cite pas le statut 500`);
      if (cause === 'schema' && !message.includes(SCHEMA_PATH))
        problems.push(`#status : le message « ${message} » ne cite pas ${SCHEMA_PATH}`);
      const retry = retryButton(site);
      if (!retry) problems.push('#status button[data-action="retry"] absent');
      else if (!isVisible(retry)) problems.push('bouton Réessayer non visible');
      return [...problems, ...uncaughtProblems(site)];
    });
    await test(ctx, `${label} : Réessayer aboutit à ready`, async () => {
      if (!shown && site.doc.getElementById('status')?.dataset.state !== 'error')
        return ['non joué : l\'état error n\'a pas été atteint'];
      const retry = retryButton(site);
      if (!retry) return ['#status button[data-action="retry"] absent'];
      state.mode = 'ok';
      click(site, retry);
      await waitStatus(site, 'ready', 5000);
      return [...readyProblems(site), ...uncaughtProblems(site)];
    });
  } finally {
    site.close();
  }
}

async function retryFailsAgain(width) {
  const ctx = { group: 'États', width, section: 'status' };
  await test(ctx, 'Réessayer qui échoue encore : retour à error, puis ready', async () => {
    const state = { mode: 'network' };
    const site = await openSite({ width, fetch: scriptedFetch(state) });
    try {
      await waitStatus(site, 'error', 5000);
      const before = site.fetch.calls.length;
      if (!retryButton(site)) return ['#status button[data-action="retry"] absent'];
      click(site, retryButton(site));
      await waitFor(
        () => site.fetch.calls.length > before &&
          site.doc.getElementById('status')?.dataset.state === 'error',
        5000,
        'nouvel appel au fetch puis état error',
        () => statusState(site),
      );
      state.mode = 'ok';
      const retry = retryButton(site);
      if (!retry || !isVisible(retry))
        return ['bouton Réessayer absent après un second échec'];
      click(site, retry);
      await waitStatus(site, 'ready', 5000);
      return [...readyProblems(site), ...uncaughtProblems(site)];
    } finally {
      site.close();
    }
  });
}

// ---------- Cause unexpected (contrat en tête du fichier) ----------
const LABEL = CAUSE_NAMES.unexpected;
// Détail technique interdit à l'écran : nom d'exception, ligne de pile, fichier de script.
const TECHNICAL = [/\w+Error\b/, /\bat \S.*:\d+:\d+/, /\.m?js\b/];

/** Déclencheur au chargement : AbortController retiré du cadre, remis par `restore`. */
function withoutAbortController() {
  let saved;
  return {
    label: 'AbortController absent (chargement)',
    apply(site) {
      saved = site.win.AbortController;
      if (typeof saved !== 'function') throw new Error('AbortController absent du navigateur');
      delete site.win.AbortController;
      if (site.win.AbortController) throw new Error('AbortController non retiré du cadre');
    },
    restore(site) {
      site.win.AbortController = saved;
    },
  };
}

/** Déclencheur à l'affichage : meta[name="description"] retiré, remis par `restore`. */
function withoutDescription() {
  let meta = null;
  return {
    label: 'meta[name="description"] retiré (affichage)',
    apply(site) {
      meta = site.doc.querySelector('meta[name="description"]');
      if (!meta) throw new Error('index.html : meta[name="description"] absent');
      meta.remove();
    },
    restore(site) {
      site.doc.head.append(meta);
    },
  };
}

/** Garde les arguments de chaque appel à console.error du cadre dans `site.consoleErrors`. */
export function captureConsoleErrors(site) {
  const original = site.win.console.error;
  site.consoleErrors = [];
  site.win.console.error = (...args) => {
    site.consoleErrors.push(args);
    original.apply(site.win.console, args);
  };
}

/** Ouvre le site en `lang` sur la fixture, console.error suivi et `trigger` posé. */
function openBroken(width, lang, trigger) {
  return openSite({
    width,
    storage: makeStorage({ lang }),
    fetch: scriptedFetch({ mode: 'ok' }),
    prepare: (site) => {
      captureConsoleErrors(site);
      trigger.apply(site);
    },
  });
}

const isError = (value) => typeof value?.message === 'string' &&
  typeof value.stack === 'string';
/** Objets d'erreur (message et pile) parmi les arguments d'un appel, causes comprises. */
const errorsIn = (args) => args.flatMap((arg) => {
  const found = [];
  for (let error = arg, depth = 0; error && depth < 5; error = error.cause, depth++)
    if (isError(error)) found.push(error);
  return found;
});

/** Détail technique affiché dans #status (hors <noscript> et modèles). */
function leakProblems(site, logged) {
  const copy = site.doc.getElementById('status').cloneNode(true);
  copy.querySelectorAll('noscript, template').forEach((node) => node.remove());
  const text = normalize(copy.textContent);
  const problems = TECHNICAL.filter((pattern) => pattern.test(text))
    .map((pattern) => `#status : détail technique (${pattern}) dans « ${text} »`);
  for (const error of logged)
    if (normalize(error.message) && text.includes(normalize(error.message)))
      problems.push(`#status : message d'exception affiché « ${error.message} »`);
  return problems;
}

/** Problème si la promesse de boot() n'est pas résolue (rejetée, ou pendante après 3 s). */
async function bootProblems(site) {
  try {
    await waitFor(() => site.booted || site.bootError, 3000, 'promesse de boot() réglée');
  } catch (error) {
    return [errorText(error)];
  }
  return site.bootError ? [`boot() a rejeté : ${errorText(site.bootError)}`] : [];
}

/**
 * Problèmes de l'état error de la cause unexpected affiché en `lang` ; `since` : nombre
 * d'appels à console.error antérieurs, ignorés.
 */
async function errorStateProblems(site, lang, since = 0) {
  const { data } = await languageTexts();
  const problems = [];
  const shown = statusMessage(site);
  const expected = data[lang]?.ui?.errors?.unexpected;
  const other = data[lang === 'fr' ? 'en' : 'fr']?.ui?.errors?.unexpected;
  if (typeof expected !== 'string')
    problems.push(`data/${lang}.json : ui.errors.unexpected absent`);
  else if (!shown.includes(normalize(expected)))
    problems.push(`#status : « ${shown} » ne contient pas ui.errors.unexpected (${lang})`);
  if (typeof other === 'string' && shown.includes(normalize(other)))
    problems.push('#status : message unexpected de l\'autre langue');
  if (!site.doc.querySelector('#status[role="alert"], #status [role="alert"]'))
    problems.push('#status : role="alert" absent');
  const active = site.doc.activeElement;
  if (!active?.matches('#status :is(h1, h2, h3, h4, h5, h6)')) {
    const where = active ? describe(active) : 'rien';
    problems.push(`focus sur ${where}, pas sur le titre de #status`);
  }
  const retry = retryButton(site);
  if (!retry || !isVisible(retry))
    problems.push('#status : bouton Réessayer absent ou masqué');
  const logged = site.consoleErrors.slice(since).flatMap(errorsIn);
  if (!logged.length)
    problems.push('console.error n\'a reçu aucune erreur (objet Error avec sa pile)');
  return [
    ...problems,
    ...leakProblems(site, logged),
    ...(await bootProblems(site)),
    ...uncaughtProblems(site),
  ];
}

/** Suit data-state de #status ; la fonction rendue arrête le suivi, rend les valeurs vues. */
function recordStates(site) {
  const status = site.doc.getElementById('status');
  const records = [];
  const observer = new site.win.MutationObserver((list) => records.push(...list));
  observer.observe(status, {
    attributes: true,
    attributeFilter: ['data-state'],
    attributeOldValue: true,
  });
  return () => {
    records.push(...observer.takeRecords());
    observer.disconnect();
    return [...records.map((record) => record.oldValue), status.dataset.state];
  };
}

const langProblems = (site, lang) => (site.doc.documentElement.lang === lang
  ? []
  : [`html[lang] vaut "${site.doc.documentElement.lang}" au lieu de "${lang}"`]);

/** Réessayer, cause levée : "loading" puis "ready" ; `refetch` : le fetch est rappelé. */
async function retryProblems(site, trigger, lang, { refetch }) {
  if (site.doc.getElementById('status')?.dataset.state !== 'error')
    return ['non joué : l\'état error n\'a pas été atteint'];
  const retry = retryButton(site);
  if (!retry) return ['#status button[data-action="retry"] absent'];
  trigger.restore(site);
  const calls = site.fetch.calls.length;
  const states = recordStates(site);
  click(site, retry);
  await waitStatus(site, 'ready', 5000);
  const seen = states();
  const problems = [];
  const loading = seen.indexOf('loading');
  if (loading < 0 || seen.lastIndexOf('ready') < loading)
    problems.push(`data-state après Réessayer : ${seen.join(' -> ')} (loading puis ready)`);
  if (refetch && site.fetch.calls.length === calls)
    problems.push('Réessayer n\'a pas rappelé le fetch');
  return [
    ...problems,
    ...langProblems(site, lang),
    ...readyProblems(site),
    ...uncaughtProblems(site),
  ];
}

/**
 * Exception levée en français par `trigger` : état error, puis Réessayer cause levée. Le
 * message affiché est rangé dans `messages.unexpected`.
 */
async function failThenRetry(width, trigger, refetch, messages) {
  const ctx = { group: 'États', width, lang: 'fr', section: 'status' };
  const names = [
    `${LABEL}, ${trigger.label} : état error et message`,
    `${LABEL}, ${trigger.label} : Réessayer remet le chargement puis aboutit à ready`,
  ];
  let site;
  try {
    site = await openBroken(width, 'fr', trigger);
  } catch (error) {
    skip(ctx, names, `ouverture du site impossible (${error.message})`);
    return;
  }
  try {
    await test(ctx, names[0], async () => {
      await waitStatus(site, 'error', 5000);
      messages.unexpected = statusMessage(site);
      return errorStateProblems(site, 'fr');
    });
    await test(ctx, names[1], () => retryProblems(site, trigger, 'fr', { refetch }));
  } finally {
    site.close();
  }
}

/** Clique sur le bouton de langue `lang` de la barre ; lève s'il est absent. */
function clickLanguage(site, lang) {
  const button = site.doc.querySelector(`header.bar .lang button[data-lang="${lang}"]`);
  if (!button) throw new Error(`header.bar .lang button[data-lang="${lang}"] absent`);
  click(site, button);
}

/** Exception à l'affichage en anglais, puis bascules de langue depuis l'état error. */
async function switchFromError(width) {
  const ctx = { group: 'États', width, section: 'status' };
  const trigger = withoutDescription();
  const cases = [
    { lang: 'en', name: `${LABEL} en anglais : état error et message anglais` },
    { lang: 'fr', name: `${LABEL} : bascule en français, cause présente : erreur française` },
    { lang: 'en', name: `${LABEL} : bascule en anglais, cause levée : ready en anglais` },
  ];
  let site;
  try {
    site = await openBroken(width, 'en', trigger);
  } catch (error) {
    skip(ctx, cases, `ouverture du site impossible (${error.message})`);
    return;
  }
  try {
    await test({ ...ctx, lang: cases[0].lang }, cases[0].name, async () => {
      await waitStatus(site, 'error', 5000);
      return errorStateProblems(site, 'en');
    });
    await test({ ...ctx, lang: cases[1].lang }, cases[1].name, async () => {
      const { data } = await languageTexts();
      const expected = data.fr?.ui?.errors?.unexpected;
      if (typeof expected !== 'string') return ['data/fr.json : ui.errors.unexpected absent'];
      const since = site.consoleErrors.length;
      clickLanguage(site, 'fr');
      await waitFor(
        () => site.doc.getElementById('status')?.dataset.state === 'error' &&
          statusMessage(site).includes(normalize(expected)),
        5000,
        'erreur unexpected en français après la bascule',
        () => statusState(site),
      );
      return errorStateProblems(site, 'fr', since);
    });
    await test({ ...ctx, lang: cases[2].lang }, cases[2].name, async () => {
      trigger.restore(site);
      clickLanguage(site, 'en');
      await waitStatus(site, 'ready', 5000);
      return [...langProblems(site, 'en'), ...readyProblems(site), ...uncaughtProblems(site)];
    });
  } finally {
    site.close();
  }
}

/** Ouvre le site en `lang` sur la cause `cause` (unexpected : déclencheur à l'affichage). */
function openWithCause(width, cause, lang) {
  if (cause === 'unexpected') return openBroken(width, lang, withoutDescription());
  return openSite({
    width,
    storage: makeStorage({ lang }),
    fetch: scriptedFetch({ mode: cause }),
    timeoutMs: cause === 'timeout' ? 50 : undefined,
  });
}

/** Mise en page de la page d'erreur de `cause` en `lang` : débordement et zones de 44 px. */
async function errorLayout(width, cause, lang) {
  const ctx = { group: 'États', width, lang, section: 'status' };
  const names = [
    `page d'erreur (${CAUSE_NAMES[cause]}) sans débordement horizontal`,
    `page d'erreur (${CAUSE_NAMES[cause]}) : zones cliquables d'au moins 44 px`,
  ];
  let site;
  try {
    site = await openWithCause(width, cause, lang);
    await waitStatus(site, 'error', 5000);
    await bounded(site.doc.fonts.ready, 5000, 'polices').catch(() => {});
  } catch (error) {
    site?.close();
    skip(ctx, names, `état error non atteint (${error.message})`);
    return;
  }
  try {
    await test(ctx, names[0], () => overflowProblems(site));
    await test(ctx, names[1], () => {
      const scopes = [site.doc.getElementById('status')];
      const { problems, exceptions } = targetProblems(site, scopes);
      recordExceptions(ctx, exceptions);
      return problems;
    });
  } finally {
    site.close();
  }
}

// Espion de console.error posé en tête de l'iframe srcdoc, avant le garde-fou de démarrage.
const CONSOLE_SPY = `<script>
window.__errors = [];
const logError = console.error;
console.error = (...args) => {
  window.__errors.push(args.map((arg) => String(arg?.message ?? arg)).join(' '));
  logError.apply(console, args);
};
</script>`;

/**
 * Source srcdoc du vrai index.html : <base> vers la racine et l'espion de console.error. Avec
 * `breakMain`, js/main.js pointe vers un chemin inexistant ; avec `dropFrBoot`, la clé
 * errors.boot sort du modèle fr.
 */
async function realSource({ breakMain, dropFrBoot }) {
  let html = (await readText('index.html')).replace(
    /<head(\s[^>]*)?>/i,
    (tag) => `${tag}<base href="${ROOT}">${CONSOLE_SPY}`,
  );
  if (breakMain) html = html.replace('src="js/main.js"', 'src="js/introuvable-main.js"');
  if (dropFrBoot)
    html = html.replace(
      /<template data-lang="fr">[\s\S]*?<\/template>/,
      (template) => template.replace(/\s*<p data-key="errors\.boot">[\s\S]*?<\/p>/, ''),
    );
  return html;
}

/**
 * Ouvre le vrai index.html sans `data-noboot`. Avec `breakMain` ou `dropFrBoot`, la source de
 * realSource() est injectée en srcdoc. Sinon la page est chargée par son URL : sous <base>,
 * le pushState de l'iframe srcdoc lèverait. Le stockage est celui du banc (même origine que
 * l'iframe) : l'appelant le restaure.
 */
async function openRealPage(width, { breakMain = false, dropFrBoot = false }) {
  const frame = document.createElement('iframe');
  frame.title = `site réel à ${width} px`;
  frame.style.cssText = `width:${width}px;height:800px;border:1px solid #567;`;
  if (breakMain || dropFrBoot) frame.srcdoc = await realSource({ breakMain, dropFrBoot });
  else frame.src = new URL('index.html', ROOT).href;
  (document.getElementById('stage') || document.body).append(frame);
  const page = { frame, close: () => frame.remove() };
  try {
    await waitFor(
      () => frame.contentDocument?.readyState === 'complete' &&
        frame.contentWindow.location.href !== 'about:blank',
      15000,
      'chargement du vrai index.html',
      () => frame.contentDocument?.readyState,
    );
  } catch (error) {
    page.close();
    throw error;
  }
  page.doc = frame.contentDocument;
  return page;
}

/** Ouvre le vrai index.html avec `lang` stocké, joue `run(page)` puis restaure le stockage. */
async function withRealPage(width, { breakMain, dropFrBoot, lang }, run) {
  const saved = localStorage.getItem('lang');
  if (lang) localStorage.setItem('lang', lang);
  else localStorage.removeItem('lang');
  let page;
  try {
    page = await openRealPage(width, { breakMain, dropFrBoot });
    return await run(page);
  } finally {
    page?.close();
    if (saved === null) localStorage.removeItem('lang');
    else localStorage.setItem('lang', saved);
  }
}

/** Problèmes du panneau d'erreur de démarrage de `page`, dans la langue `lang`. */
async function bootErrorProblems(page, lang) {
  const { data } = await languageTexts();
  const errors = data[lang]?.ui?.errors;
  const doc = page.doc;
  const statusText = () => doc.getElementById('status')?.dataset.state;
  await waitFor(
    () => statusText() === 'error',
    5000,
    '#status[data-state="error"] sans js/main.js',
    () => `data-state="${statusText()}"`,
  );
  const status = doc.getElementById('status');
  const problems = [];
  const expect = (label, actual, expected) => {
    if (actual !== expected)
      problems.push(`${label} : « ${actual} » au lieu de « ${expected} »`);
  };
  expect('titre', normalize(doc.getElementById('status-title').textContent), errors?.title);
  expect('message', normalize(doc.getElementById('status-message').textContent), errors?.boot);
  expect('rôle', status.getAttribute('role'), 'alert');
  const retry = status.querySelector('button[data-action="retry"]');
  if (!isVisible(retry)) problems.push('Réessayer n\'est pas visible');
  else expect('texte de Réessayer', normalize(retry.textContent), errors?.retry);
  const switcher = status.querySelector('button[data-action="switch-lang"]');
  if (isVisible(switcher)) problems.push('switch-lang est visible');
  return problems;
}

/** Problèmes d'un garde-fou sans errors.boot dans le modèle fr : console.error le nomme. */
async function bootLogProblems(page) {
  const doc = page.doc;
  const state = () => doc.getElementById('status')?.dataset.state;
  await waitFor(
    () => state() === 'error',
    5000,
    '#status[data-state="error"] sans js/main.js ni errors.boot',
    () => `data-state="${state()}"`,
  );
  const model = doc.querySelector('template[data-lang="fr"]').content;
  const problems = [];
  if (model.querySelector('[data-key="errors.boot"]'))
    problems.push('errors.boot encore présent dans le modèle fr (cas mal monté)');
  const logged = page.frame.contentWindow.__errors ?? [];
  if (!logged.some((text) => text.includes('errors.boot')))
    problems.push(`aucun console.error ne nomme errors.boot : [${logged.join(' | ')}]`);
  return problems;
}

/** Module JS introuvable : le garde-fou affiche l'erreur de démarrage ; sinon il se tait. */
async function bootGuard(width) {
  const ctx = { group: 'États', width, section: 'status' };
  for (const lang of LANGS) {
    const name = lang === 'fr' ? 'français' : 'anglais';
    await test(
      { ...ctx, lang },
      `js/main.js introuvable : erreur de démarrage en ${name}`,
      () => withRealPage(
        width,
        { breakMain: true, lang },
        (page) => bootErrorProblems(page, lang),
      ),
    );
  }
  await test(
    { ...ctx, lang: 'fr' },
    'js/main.js introuvable et errors.boot absent du modèle fr : console.error le nomme',
    () => withRealPage(
      width,
      { breakMain: true, dropFrBoot: true, lang: 'fr' },
      bootLogProblems,
    ),
  );
  await test(
    { ...ctx, lang: 'fr' },
    'js/main.js présent : le garde-fou reste muet et le site atteint ready',
    () => withRealPage(width, { lang: 'fr' }, async (page) => {
      const status = () => page.doc.getElementById('status')?.dataset.state;
      await waitFor(
        () => status() === 'ready',
        10000,
        '#status[data-state="ready"] avec le vrai js/main.js',
        () => `data-state="${status()}"`,
      );
      if (!page.doc.documentElement.hasAttribute('data-booted'))
        return ['<html> sans data-booted malgré le site prêt'];
      return [];
    }),
  );
}

/** Groupe « États » : `widths` pour la mise en page, `mainWidth` pour les causes. */
export async function runStates(widths, mainWidth) {
  for (const width of widths) await staticLoading(width);
  await pendingLoading(mainWidth);
  const messages = {};
  for (const cause of FETCH_CAUSES) await errorCause(mainWidth, cause, messages);
  await failThenRetry(mainWidth, withoutAbortController(), true, messages);
  await failThenRetry(mainWidth, withoutDescription(), false, messages);
  await switchFromError(mainWidth);
  await test(
    { group: 'États', width: mainWidth, section: 'status' },
    'messages d\'erreur tous distincts et non vides',
    () => {
      const missing = CAUSES.filter((cause) => !messages[cause]);
      const problems = missing.map(
        (cause) => `message absent ou vide : ${CAUSE_NAMES[cause]}`,
      );
      const filled = Object.fromEntries(Object.entries(messages).filter(([, m]) => m));
      for (const [a, b] of duplicateMessages(filled))
        problems.push(
          `même message pour ${CAUSE_NAMES[a]} et ${CAUSE_NAMES[b]} : « ${messages[a]} »`,
        );
      return problems;
    },
  );
  await retryFailsAgain(mainWidth);
  await bootGuard(mainWidth);
  for (const width of widths)
    for (const [cause, lang] of LAYOUT_CASES) await errorLayout(width, cause, lang);
}
