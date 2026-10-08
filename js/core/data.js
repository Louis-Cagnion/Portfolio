/* Chargement des textes d'une langue (data/<lang>.json) : délai borné, une erreur par cause,
cache des seuls succès. */
import { SUPPORTED } from './i18n.js';
import { validateLocale } from './schema.js';

const DEFAULT_TIMEOUT_MS = 10000;
const loaded = new Map(); // langue -> JSON validé
const pending = new Map(); // langue -> Promise en cours

/**
 * @brief Échec de chargement d'une langue, avec sa cause.
 *
 * `code` : 'network', 'timeout', 'http' (avec `status`), 'json' ou 'schema' (avec `path`,
 * premier chemin fautif de validateLocale).
 */
export class LocaleError extends Error {
  /**
   * @brief Crée l'erreur d'une cause.
   *
   * @param {'network' | 'timeout' | 'http' | 'json' | 'schema'} code cause
   * @param {string} message phrase qui nomme le fichier et la cause
   * @param {{ status?: number, path?: string, cause?: unknown }} [details] statut HTTP,
   *   chemin fautif, erreur d'origine
   */
  constructor(code, message, { status, path, cause } = {}) {
    super(message, { cause });
    this.name = 'LocaleError';
    this.code = code;
    if (status !== undefined) this.status = status;
    if (path !== undefined) this.path = path;
  }
}

/**
 * @brief JSON validé d'une langue déjà chargée, sans requête.
 *
 * @param {unknown} lang code de langue
 *
 * @returns {object | null} données de la langue, ou null si elle n'est pas encore chargée
 */
export function cachedLocale(lang) {
  return loaded.get(lang) ?? null;
}

/**
 * @brief Charge et valide data/<lang>.json ; un succès est gardé en cache, jamais un échec.
 *
 * Deux appels simultanés pour la même langue partagent la même requête.
 *
 * @param {unknown} lang code de langue ('fr' ou 'en' ; tout autre code rejette sans requête)
 * @param {{ fetch?: Function, timeoutMs?: number }} [options] fetch à utiliser (celui de la
 *   page par défaut), délai maximal en ms pour la réponse et son corps (10 000 par défaut)
 *
 * @returns {Promise<object>} JSON validé ; rejette avec une LocaleError par cause, ou une
 *   RangeError pour une langue non supportée
 */
export function loadLocale(lang, { fetch = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (!SUPPORTED.includes(lang)) {
    const shown = typeof lang === 'string' ? `"${lang}"` : String(lang);
    return Promise.reject(new RangeError(`loadLocale : langue non supportée ${shown}`));
  }
  if (loaded.has(lang)) return Promise.resolve(loaded.get(lang));
  if (!pending.has(lang)) {
    const request = fetchLocale(lang, fetch, timeoutMs)
      .then((data) => {
        loaded.set(lang, data);
        return data;
      })
      .finally(() => pending.delete(lang));
    pending.set(lang, request);
  }
  return pending.get(lang);
}

/**
 * @brief Requête, lecture, analyse et validation d'un fichier de langue, sous délai.
 *
 * Le délai annule le `signal` passé au fetch et coupe l'attente même si le fetch l'ignore.
 *
 * @param {'fr' | 'en'} lang code de langue supporté
 * @param {Function} fetchFn fonction de l'API fetch
 * @param {number} timeoutMs délai maximal en ms
 *
 * @returns {Promise<object>} JSON validé ; rejette avec une LocaleError
 */
async function fetchLocale(lang, fetchFn, timeoutMs) {
  const file = `data/${lang}.json`;
  const url = new URL(`../../${file}`, import.meta.url).href;
  const controller = new AbortController();
  const timeout = new LocaleError('timeout', `${file} : aucune réponse complète en ` +
    `${timeoutMs} ms`);
  const expired = new Promise((_, reject) => {
    controller.signal.addEventListener('abort', () => reject(timeout), { once: true });
  });
  expired.catch(() => {}); // rejet lu par Promise.race ; évite un rejet orphelin
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const withinDelay = (promise) => Promise.race([promise, expired]);
  try {
    let response;
    let body;
    try {
      response = await withinDelay(Promise.resolve().then(() =>
        fetchFn(url, { signal: controller.signal })));
      if (!response.ok) {
        throw new LocaleError('http', `${file} : réponse HTTP ${response.status}`,
          { status: response.status });
      }
      body = await withinDelay(response.text());
    } catch (error) {
      if (error instanceof LocaleError) throw error;
      if (controller.signal.aborted) throw timeout;
      throw new LocaleError('network', `${file} : réseau injoignable (${error?.message})`,
        { cause: error });
    }
    let data;
    try {
      data = JSON.parse(body);
    } catch (error) {
      throw new LocaleError('json', `${file} : JSON invalide (${error.message})`,
        { cause: error });
    }
    const faults = validateLocale(data);
    if (faults.length === 0 && data.meta.lang !== lang) faults.push('meta.lang');
    if (faults.length) {
      throw new LocaleError('schema', `${file} : champ ${faults[0]} manquant ou invalide ` +
        `(${faults.length} champ(s) fautif(s))`, { path: faults[0] });
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}
