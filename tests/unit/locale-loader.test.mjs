/*
Contrat testé : js/core/data.js (chargement d'une langue, avec un fetch simulé).
  loadLocale(lang, { fetch, timeoutMs = 10000 }) -> Promise du JSON validé (schema.js).
  Rejette avec une `LocaleError` (exportée) dont `code` vaut :
    'network' (fetch rejette), 'timeout' (pas de réponse avant timeoutMs ; le fetch reçoit
    un `signal` AbortController), 'http' (réponse non ok, `status` exposé), 'json' (corps
    invalide), 'schema' (`path` = premier chemin de validateLocale).
    Message distinct par cause.
  Cache par langue : deux appels réussis -> un seul fetch ; un échec n'est jamais mis en
    cache.
  Langue non supportée : rejet immédiat, sans appeler fetch.
Lancer : node --test (depuis la racine du dépôt).
*/
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { clone, guard, importModule, readFixture } from '../helpers.mjs';

const MODULE = 'js/core/data.js';
const valid = readFixture('valid-locale.json');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let instance = 0;
// Instance neuve du module à chaque test : le cache de langues ne fuit pas entre tests.
const fresh = async () => {
  const mod = await importModule(MODULE, `?test=${++instance}`);
  assert.equal(typeof mod.loadLocale, 'function', `${MODULE} doit exporter loadLocale`);
  assert.equal(typeof mod.LocaleError, 'function', `${MODULE} doit exporter LocaleError`);
  // Garde-fou : un loadLocale qui ne répond jamais fait échouer le test au lieu de le bloquer.
  const loadLocale = (...args) => guard(mod.loadLocale(...args), 5000, 'loadLocale');
  return { ...mod, loadLocale };
};
const localeFor = (lang) => ({ ...clone(valid), meta: { ...valid.meta, lang } });
const ok = (lang = 'fr') => new Response(JSON.stringify(localeFor(lang)), { status: 200 });

/** fetch simulé : `plan` donne la réponse (ou le rejet) de chaque appel, dans l'ordre. */
function makeFetch(...plan) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url: String(url), signal: init?.signal });
    const step = plan[Math.min(calls.length - 1, plan.length - 1)];
    return typeof step === 'function' ? step(url, init) : step;
  };
  fn.calls = calls;
  return fn;
}
/** fetch qui ne répond jamais mais respecte `signal` (comme le vrai). */
const hanging = (url, { signal } = {}) => new Promise((resolve, reject) => {
  signal?.addEventListener(
    'abort',
    () => reject(new DOMException('The operation was aborted.', 'AbortError')),
  );
});

async function failure(promise) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  assert.fail('loadLocale aurait dû rejeter');
}
const timers = () => process.getActiveResourcesInfo().filter((r) => r === 'Timeout').length;

describe('loadLocale : succès et cache', () => {
  test('résout avec le JSON validé de la langue demandée', async () => {
    const { loadLocale } = await fresh();
    const fetch = makeFetch(() => ok('fr'));
    const data = await loadLocale('fr', { fetch });
    assert.deepEqual(data, localeFor('fr'));
    assert.equal(fetch.calls.length, 1);
    assert.match(fetch.calls[0].url, /fr\.json/, 'le fetch doit cibler fr.json');
  });

  test('la langue "en" cible en.json', async () => {
    const { loadLocale } = await fresh();
    const fetch = makeFetch(() => ok('en'));
    const data = await loadLocale('en', { fetch });
    assert.equal(data.meta.lang, 'en');
    assert.match(fetch.calls[0].url, /en\.json/, 'le fetch doit cibler en.json');
  });

  test('deux appels réussis pour la même langue : un seul fetch', async () => {
    const { loadLocale } = await fresh();
    const fetch = makeFetch(() => ok('fr'));
    const first = await loadLocale('fr', { fetch });
    const second = await loadLocale('fr', { fetch });
    assert.equal(fetch.calls.length, 1, `fetch appelé ${fetch.calls.length} fois`);
    assert.deepEqual(second, first);
  });

  test('deux langues : un fetch chacune', async () => {
    const { loadLocale } = await fresh();
    const fetch = makeFetch((url) => ok(String(url).includes('en.json') ? 'en' : 'fr'));
    await loadLocale('fr', { fetch });
    await loadLocale('en', { fetch });
    await loadLocale('fr', { fetch });
    await loadLocale('en', { fetch });
    assert.equal(fetch.calls.length, 2, `fetch appelé ${fetch.calls.length} fois`);
  });

  test('un succès ne laisse aucun minuteur de délai en suspens', async () => {
    const { loadLocale } = await fresh();
    const before = timers();
    await loadLocale('fr', { fetch: makeFetch(() => ok('fr')) });
    await sleep(0);
    assert.ok(timers() <= before, `minuteurs actifs ${before} -> ${timers()}`);
  });

  test('délai par défaut supérieur à 200 ms : une réponse lente aboutit', async () => {
    const { loadLocale } = await fresh();
    const slow = async (url, { signal }) => {
      await sleep(200);
      signal?.throwIfAborted(); // respecte le signal comme le vrai fetch
      return ok('fr');
    };
    const data = await loadLocale('fr', { fetch: makeFetch(slow) });
    assert.equal(data.meta.lang, 'fr');
  });

  test('timeoutMs court mais réponse immédiate : pas de faux délai', async () => {
    const { loadLocale } = await fresh();
    const data = await loadLocale('fr', { fetch: makeFetch(() => ok('fr')), timeoutMs: 50 });
    assert.equal(data.meta.lang, 'fr');
  });
});

describe('loadLocale : une erreur par cause', () => {
  test('network : fetch rejette', async () => {
    const { loadLocale, LocaleError } = await fresh();
    const before = timers();
    const error = await failure(loadLocale('fr', {
      fetch: makeFetch(() => { throw new TypeError('Failed to fetch'); }),
    }));
    assert.ok(error instanceof LocaleError, `erreur reçue : ${error}`);
    assert.ok(error instanceof Error, 'LocaleError doit hériter de Error');
    assert.equal(error.code, 'network');
    await sleep(0);
    assert.ok(timers() <= before, `minuteur de délai laissé actif après un échec réseau`);
  });

  test('network : fetch qui lève de façon synchrone', async () => {
    const { loadLocale, LocaleError } = await fresh();
    const throwing = () => { throw new TypeError('boom'); };
    const error = await failure(loadLocale('fr', { fetch: throwing }));
    assert.ok(error instanceof LocaleError);
    assert.equal(error.code, 'network');
  });

  test('timeout : aucune réponse avant timeoutMs (50 ms)', async () => {
    const { loadLocale, LocaleError } = await fresh();
    const fetch = makeFetch(hanging);
    const start = performance.now();
    const error = await failure(loadLocale('fr', { fetch, timeoutMs: 50 }));
    const elapsed = performance.now() - start;
    assert.ok(error instanceof LocaleError, `erreur reçue : ${error}`);
    assert.equal(error.code, 'timeout');
    assert.ok(elapsed >= 40, `rejet après ${elapsed.toFixed(0)} ms, trop tôt pour 50 ms`);
    assert.ok(elapsed < 2000, `rejet après ${elapsed.toFixed(0)} ms, bien après 50 ms`);
    assert.ok(fetch.calls[0].signal instanceof AbortSignal, 'fetch doit recevoir un signal');
    assert.ok(fetch.calls[0].signal.aborted, 'le signal doit être annulé après le délai');
  });

  test('http : réponse non ok, status exposé (404, 500, 503)', async () => {
    const { loadLocale, LocaleError } = await fresh();
    for (const status of [404, 500, 503]) {
      const error = await failure(loadLocale('fr', {
        fetch: makeFetch(() => new Response('Not found', { status })),
      }));
      assert.ok(error instanceof LocaleError, `erreur reçue : ${error}`);
      assert.equal(error.code, 'http', `statut ${status}`);
      assert.equal(error.status, status);
    }
  });

  test('http : prime sur le JSON invalide du corps', async () => {
    const { loadLocale } = await fresh();
    const error = await failure(loadLocale('fr', {
      fetch: makeFetch(() => new Response('<html>Erreur</html>', { status: 502 })),
    }));
    assert.equal(error.code, 'http');
    assert.equal(error.status, 502);
  });

  test('json : corps invalide, vide ou HTML', async () => {
    const { loadLocale, LocaleError } = await fresh();
    for (const body of ['{ pas du json', '', '<!doctype html><title>x</title>', '{"a":']) {
      const error = await failure(loadLocale('fr', {
        fetch: makeFetch(() => new Response(body, { status: 200 })),
      }));
      assert.ok(error instanceof LocaleError, `corps ${JSON.stringify(body)} : ${error}`);
      assert.equal(error.code, 'json', `corps ${JSON.stringify(body)}`);
    }
  });

  test('schema : champ manquant, path = premier chemin de validateLocale', async () => {
    const { loadLocale, LocaleError } = await fresh();
    const { validateLocale } = await importModule('js/core/schema.js');
    const broken = localeFor('fr');
    delete broken.home.telemetry.rows[1].label;
    const error = await failure(loadLocale('fr', {
      fetch: makeFetch(() => new Response(JSON.stringify(broken), { status: 200 })),
    }));
    assert.ok(error instanceof LocaleError, `erreur reçue : ${error}`);
    assert.equal(error.code, 'schema');
    assert.equal(error.path, validateLocale(broken)[0]);
    assert.equal(error.path, 'home.telemetry.rows[1].label');
  });

  test('schema : JSON valide mais pas un objet (null, [], 42, "x")', async () => {
    const { loadLocale } = await fresh();
    for (const body of ['null', '[]', '42', '"x"', '{}']) {
      const error = await failure(loadLocale('fr', {
        fetch: makeFetch(() => new Response(body, { status: 200 })),
      }));
      assert.equal(error.code, 'schema', `corps ${body}`);
      assert.equal(typeof error.path, 'string', `path absent pour ${body}`);
      assert.ok(error.path.length > 0, `path vide pour ${body}`);
    }
  });

  test('messages distincts et non vides pour chacune des cinq causes', async () => {
    const { loadLocale } = await fresh();
    const broken = localeFor('fr');
    broken.journey.title = '';
    const causes = {
      network: () => { throw new TypeError('Failed to fetch'); },
      http: () => new Response('', { status: 500 }),
      json: () => new Response('{', { status: 200 }),
      schema: () => new Response(JSON.stringify(broken), { status: 200 }),
    };
    const messages = {};
    for (const [code, step] of Object.entries(causes)) {
      const error = await failure(loadLocale('fr', { fetch: makeFetch(step) }));
      assert.equal(error.code, code);
      messages[code] = error.message;
    }
    const timeoutError = await failure(
      loadLocale('fr', { fetch: makeFetch(hanging), timeoutMs: 30 }),
    );
    assert.equal(timeoutError.code, 'timeout');
    messages.timeout = timeoutError.message;
    for (const [code, message] of Object.entries(messages))
      assert.ok(
        typeof message === 'string' && message.trim() !== '',
        `message vide pour ${code}`,
      );
    assert.equal(
      new Set(Object.values(messages)).size,
      5,
      `messages non distincts : ${JSON.stringify(messages)}`,
    );
  });
});

describe('loadLocale : un échec n\'est pas mis en cache', () => {
  const retries = {
    network: () => { throw new TypeError('Failed to fetch'); },
    http: () => new Response('', { status: 500 }),
    json: () => new Response('{', { status: 200 }),
    schema: () => new Response('{}', { status: 200 }),
  };
  for (const [code, failing] of Object.entries(retries))
    test(`après un échec ${code}, un nouvel essai refait fetch et peut réussir`, async () => {
      const { loadLocale } = await fresh();
      const fetch = makeFetch(failing, () => ok('fr'));
      const error = await failure(loadLocale('fr', { fetch }));
      assert.equal(error.code, code);
      const data = await loadLocale('fr', { fetch });
      assert.equal(fetch.calls.length, 2, `fetch appelé ${fetch.calls.length} fois`);
      assert.equal(data.meta.lang, 'fr');
    });

  test('après un timeout, un nouvel essai refait fetch et peut réussir', async () => {
    const { loadLocale } = await fresh();
    const fetch = makeFetch(hanging, () => ok('fr'));
    const error = await failure(loadLocale('fr', { fetch, timeoutMs: 30 }));
    assert.equal(error.code, 'timeout');
    const data = await loadLocale('fr', { fetch, timeoutMs: 1000 });
    assert.equal(fetch.calls.length, 2);
    assert.equal(data.meta.lang, 'fr');
  });

  test('deux échecs de suite : fetch appelé deux fois', async () => {
    const { loadLocale } = await fresh();
    const fetch = makeFetch(retries.http);
    await failure(loadLocale('fr', { fetch }));
    await failure(loadLocale('fr', { fetch }));
    assert.equal(fetch.calls.length, 2);
  });

  test("l'échec d'une langue n'empêche pas l'autre", async () => {
    const { loadLocale } = await fresh();
    const fetch = makeFetch((url) => (
      String(url).includes('fr.json') ? new Response('', { status: 500 }) : ok('en')
    ));
    await failure(loadLocale('fr', { fetch }));
    assert.equal((await loadLocale('en', { fetch })).meta.lang, 'en');
  });
});

describe('loadLocale : langue non supportée', () => {
  for (const lang of [
    'de',
    '',
    'FR',
    'fr ',
    '../data/fr',
    'fr.json',
    '__proto__',
    null,
    undefined,
    7,
    {},
    ['fr'],
  ]) {
    const name = JSON.stringify(lang) ?? String(lang);
    test(`${name} : rejet immédiat, fetch non appelé`, async () => {
      const { loadLocale } = await fresh();
      const fetch = makeFetch(() => ok('fr'));
      const start = performance.now();
      const error = await failure(loadLocale(lang, { fetch }));
      assert.ok(error instanceof Error, `erreur reçue : ${error}`);
      assert.equal(fetch.calls.length, 0, 'fetch ne doit pas être appelé');
      assert.ok(performance.now() - start < 500, 'le rejet doit être immédiat');
    });
  }
});
