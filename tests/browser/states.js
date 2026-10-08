// États de #status : chargement visible, une erreur par cause, Réessayer qui aboutit.
import {
  activeViews, bounded, click, hangingResponse, isVisible, makeFetch, openSite, readJson,
  response, statusState, waitFor, waitStatus,
} from './harness.js';
import { overflowProblems, targetProblems } from './checks.js';
import { duplicateMessages, normalize } from './text.js';
import { recordExceptions, skip, test } from './runner.js';

const FIXTURE = 'tests/fixtures/valid-locale.json';
const SCHEMA_PATH = 'meta.title'; // champ retiré pour provoquer l'erreur de schéma
export const CAUSES = ['network', 'timeout', 'http', 'json', 'schema'];
const CAUSE_NAMES = { network: 'fetch rejeté', timeout: 'délai dépassé (timeoutMs 50)',
  http: 'HTTP 500', json: 'JSON invalide', schema: `schéma invalide (${SCHEMA_PATH} absent)` };
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
      case 'gate': await state.gate; return response(site, await locale(lang || 'fr'));
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
    skip(ctx, ['loading visible tant que fetch ne répond pas', 'loading puis ready'],
      `ouverture du site impossible (${error.message})`);
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
    site = await openSite({ width, fetch: scriptedFetch(state),
      timeoutMs: cause === 'timeout' ? 50 : undefined });
  } catch (error) {
    skip(ctx, [`${label} : état error et message`, `${label} : Réessayer aboutit à ready`],
      `ouverture du site impossible (${error.message})`);
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
      if (cause === 'http' && !message.includes('500')) {
        problems.push(`#status : le message « ${message} » ne cite pas le statut 500`);
      }
      if (cause === 'schema' && !message.includes(SCHEMA_PATH)) {
        problems.push(`#status : le message « ${message} » ne cite pas ${SCHEMA_PATH}`);
      }
      const retry = retryButton(site);
      if (!retry) problems.push('#status button[data-action="retry"] absent');
      else if (!isVisible(retry)) problems.push('bouton Réessayer non visible');
      return [...problems, ...uncaughtProblems(site)];
    });
    await test(ctx, `${label} : Réessayer aboutit à ready`, async () => {
      if (!shown && site.doc.getElementById('status')?.dataset.state !== 'error') {
        return ['non joué : l\'état error n\'a pas été atteint'];
      }
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
      await waitFor(() => site.fetch.calls.length > before &&
        site.doc.getElementById('status')?.dataset.state === 'error', 5000,
      'nouvel appel au fetch puis état error', () => statusState(site));
      state.mode = 'ok';
      const retry = retryButton(site);
      if (!retry || !isVisible(retry)) {
        return ['bouton Réessayer absent après un second échec'];
      }
      click(site, retry);
      await waitStatus(site, 'ready', 5000);
      return [...readyProblems(site), ...uncaughtProblems(site)];
    } finally {
      site.close();
    }
  });
}

async function errorLayout(width) {
  const ctx = { group: 'États', width, section: 'status' };
  const names = ['page d\'erreur sans débordement horizontal',
    'page d\'erreur : zones cliquables d\'au moins 44 px'];
  let site;
  try {
    site = await openSite({ width, fetch: scriptedFetch({ mode: 'network' }) });
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

/** Groupe « États » : `widths` pour la mise en page, `mainWidth` pour les causes. */
export async function runStates(widths, mainWidth) {
  for (const width of widths) await staticLoading(width);
  await pendingLoading(mainWidth);
  const messages = {};
  for (const cause of CAUSES) await errorCause(mainWidth, cause, messages);
  await test({ group: 'États', width: mainWidth, section: 'status' },
    'messages d\'erreur tous distincts et non vides', () => {
      const missing = CAUSES.filter((cause) => !messages[cause]);
      const problems = missing.map((cause) =>
        `message absent ou vide : ${CAUSE_NAMES[cause]}`);
      const filled = Object.fromEntries(Object.entries(messages).filter(([, m]) => m));
      for (const [a, b] of duplicateMessages(filled)) {
        problems.push(`même message pour ${CAUSE_NAMES[a]} et ${CAUSE_NAMES[b]} : ` +
          `« ${messages[a]} »`);
      }
      return problems;
    });
  await retryFailsAgain(mainWidth);
  for (const width of widths) await errorLayout(width);
}
