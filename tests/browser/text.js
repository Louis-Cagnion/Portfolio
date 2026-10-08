// Fonctions pures de la suite navigateur (aucun DOM) : chaînes propres à une langue.
// Chargeables dans Node pour vérification : import('./text.js').

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** Espaces normalisés (espaces insécables compris), bords retirés. */
export function normalize(text) {
  return String(text).replace(/[\s  ]+/g, ' ').trim();
}

/** Toutes les chaînes d'une valeur JSON, dans l'ordre du parcours. */
export function stringLeaves(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((item) => stringLeaves(item, out));
  else if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => stringLeaves(item, out));
  }
  return out;
}

/** Texte affichable d'une chaîne de données : balises retirées, entités courantes décodées. */
export function plainText(str) {
  return String(str)
    .replace(/<[^>]*>/g, '\n')
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, name) => ENTITIES[name]);
}

/**
 * Morceaux affichés tels quels d'une chaîne : texte hors balises, découpé aux gabarits
 * `{clé}` (remplacés à l'affichage), normalisé, de plus de `minLength` caractères.
 */
export function textSegments(str, minLength = 3) {
  return plainText(str)
    .split(/\{\w+\}|\n/)
    .map(normalize)
    .filter((segment) => segment.length > minLength);
}

/**
 * Morceaux propres à `own` (objet JSON d'une langue) : présents dans `own`, absents de
 * toutes les chaînes de `other` (comparaison sans casse, sous-chaînes comprises), sans
 * doublon. Rend des chaînes en minuscules, prêtes à chercher dans un texte en minuscules.
 */
export function exclusiveSegments(own, other, minLength = 3) {
  const haystack = stringLeaves(other)
    .map((str) => normalize(plainText(str)).toLowerCase())
    .join('\u0000');
  const result = new Set();
  for (const str of stringLeaves(own)) {
    for (const segment of textSegments(str, minLength)) {
      const lower = segment.toLowerCase();
      if (!haystack.includes(lower)) result.add(lower);
    }
  }
  return [...result];
}

/** Paires de valeurs identiques dans une table { cause: message } (messages non distincts). */
export function duplicateMessages(messages) {
  const seen = new Map();
  const duplicates = [];
  for (const [cause, message] of Object.entries(messages)) {
    const key = normalize(message);
    if (seen.has(key)) duplicates.push([seen.get(key), cause]);
    else seen.set(key, cause);
  }
  return duplicates;
}
