/* Langues du site : langue initiale et gabarits `{clé}` des textes de data/*.json. */

export const SUPPORTED = Object.freeze(['fr', 'en']);
const DEFAULT_LANG = SUPPORTED[0];
const PLACEHOLDER = /\{(\w+)\}/;

/**
 * @brief Langue à afficher au chargement, d'après la valeur mémorisée.
 *
 * @param {unknown} stored valeur lue dans le stockage (texte, null, ou n'importe quoi)
 *
 * @returns {'fr' | 'en'} la valeur si elle est dans SUPPORTED, sinon 'fr'
 */
export function initialLang(stored) {
  return SUPPORTED.includes(stored) ? stored : DEFAULT_LANG;
}

/**
 * @brief Autre langue du site.
 *
 * @param {'fr' | 'en'} lang langue de SUPPORTED
 *
 * @returns {'fr' | 'en'} l'autre langue de SUPPORTED
 */
export function otherLang(lang) {
  return SUPPORTED.find((code) => code !== lang);
}

/**
 * @brief Découpe un gabarit en morceaux de texte fixe et de valeurs insérées.
 *
 * formatParts('HTTP {status}', { status: 503 })
 *   -> [{ text: 'HTTP ' }, { text: '503', key: 'status' }]
 * Seul `{mot}` est une clé ; toute autre accolade reste du texte. Une valeur insérée
 * n'est jamais réinterprétée.
 *
 * @param {string} template texte avec des clés `{mot}`
 * @param {Record<string, unknown> | null | undefined} vars valeurs, par clé propre
 *
 * @returns {{ text: string, key?: string }[]} morceaux dans l'ordre, sans morceau vide
 */
export function formatParts(template, vars) {
  const pieces = String(template).split(PLACEHOLDER);
  const parts = [];
  pieces.forEach((piece, index) => {
    if (index % 2 === 0) {
      if (piece) parts.push({ text: piece });
      return;
    }
    if (vars == null || !Object.hasOwn(vars, piece)) {
      throw new Error(`format : la clé « ${piece} » est absente des valeurs fournies`);
    }
    parts.push({ text: String(vars[piece]), key: piece });
  });
  return parts;
}

/**
 * @brief Remplace chaque `{clé}` d'un gabarit par sa valeur.
 *
 * format('escale {n} sur {total}', { n: 2, total: 8 }) -> 'escale 2 sur 8'
 *
 * @param {string} template texte avec des clés `{mot}`
 * @param {Record<string, unknown> | null | undefined} vars valeurs, par clé propre
 *
 * @returns {string} texte rempli ; lève une Error qui nomme toute clé absente de vars
 */
export function format(template, vars) {
  return formatParts(template, vars).map((part) => part.text).join('');
}
