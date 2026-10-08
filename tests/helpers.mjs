// Aides partagées des tests Node (pas un fichier de test : ignoré par `node --test`).
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

export const ROOT_URL = new URL('../', import.meta.url);
export const ROOT = fileURLToPath(ROOT_URL);

/** Lit et analyse un JSON de tests/fixtures. */
export function readFixture(name) {
  return JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
}

/** Copie profonde d'une valeur JSON. */
export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

/** Gèle récursivement une valeur : toute écriture dans un module testé lève. */
export function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

/**
 * Importe un module du projet (chemin relatif à la racine). Un module absent donne une
 * erreur claire « module ... introuvable » ; toute autre erreur de chargement est relancée.
 * `suffix` (ex. `?n=1`) force une instance neuve du module (cache d'import contourné).
 */
export async function importModule(relPath, suffix = '') {
  const url = new URL(relPath, ROOT_URL);
  try {
    return await import(url.href + suffix);
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND' &&
        String(error.message).includes(fileURLToPath(url))) {
      throw new Error(`module ${relPath} introuvable`, { cause: error });
    }
    throw error;
  }
}

/**
 * Garde-fou : rejette si `promise` ne se résout pas en `ms` (un test ne bloque jamais la
 * suite sur une implémentation qui ne répond pas). Le minuteur est toujours nettoyé.
 */
export function guard(promise, ms = 5000, label = 'la promesse') {
  let timer;
  const limit = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} ne se résout pas en ${ms} ms`)), ms);
  });
  return Promise.race([promise, limit]).finally(() => clearTimeout(timer));
}

/** Meilleur temps (ms) de `run(input)` sur `runs` essais, après un essai de chauffe. */
export function bestMs(run, input, runs = 5) {
  run(input);
  let best = Infinity;
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    run(input);
    best = Math.min(best, performance.now() - start);
  }
  return best;
}

/**
 * Vérifie qu'un traitement reste linéaire : on mesure aux tailles `sizes` (doublements
 * successifs) puis on exige t(plus grande) <= maxRatio * t(plus petite), sauf si le temps
 * absolu reste sous floorMs. Linéaire = rapport ~4 pour deux doublements, quadratique ~16.
 */
export function assertLinear(assert, label, makeInput, run, options = {}) {
  const { sizes = [10000, 20000, 40000], maxRatio = 8, floorMs = 25 } = options;
  const times = sizes.map((n) => bestMs(run, makeInput(n)));
  const first = times[0];
  const last = times[times.length - 1];
  const detail = sizes.map((n, i) => `${n}: ${times[i].toFixed(2)} ms`).join(', ');
  assert.ok(last <= Math.max(first * maxRatio, floorMs),
    `${label} n'est pas linéaire (${detail}, rapport ${(last / first).toFixed(1)})`);
}
