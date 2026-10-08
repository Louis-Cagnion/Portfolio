// Enregistrement des cas : chaque cas rend une liste de problèmes (vide = réussi) ou lève.
import { errorText } from './harness.js';
import { INLINE_LINK_LABEL } from './checks.js';

let report = null;

/** Branche le rapport qui reçoit les résultats (voir report.js). */
export function useReport(target) {
  report = target;
}

/**
 * Joue un cas. `ctx` = { group, width, lang, section } ; `fn` rend un tableau de problèmes
 * (chaînes qui nomment l'élément fautif) ou lève : l'erreur devient l'échec du cas.
 * Rend true si le cas a réussi.
 */
export async function test(ctx, name, fn) {
  let problems;
  try {
    const value = await fn();
    problems = Array.isArray(value) ? value : [];
  } catch (error) {
    problems = [errorText(error)];
  }
  report.add({ ...ctx, name, problems });
  return problems.length === 0;
}

/** Enregistre en échec des cas qui n'ont pas pu être joués, avec la raison. */
export function skip(ctx, names, reason) {
  for (const name of names) {
    const entry = typeof name === 'string' ? { name } : name;
    report.add({ ...ctx, ...entry, problems: [`non joué : ${reason}`] });
  }
}

/**
 * Range à part, sans échec, les exceptions { label, text } d'une mesure : une ligne par
 * libellé. Lien en ligne : exempté ; tout autre libellé : à trancher par Louis.
 */
export function recordExceptions(ctx, exceptions) {
  const byLabel = new Map();
  for (const { label, text } of exceptions) {
    byLabel.set(label, [...(byLabel.get(label) || []), text]);
  }
  for (const [label, texts] of byLabel) {
    const note = label === INLINE_LINK_LABEL ? 'exempté' : 'à trancher par Louis';
    report.exception({ ...ctx, name: label, detail: texts.join(' ; '), note });
  }
}

/** Problème si `actual` diffère de `expected`, nommé par `label`. */
export function expectEqual(problems, label, actual, expected) {
  if (actual !== expected) {
    problems.push(`${label} vaut ${JSON.stringify(actual)} au lieu de ` +
      `${JSON.stringify(expected)}`);
  }
  return problems;
}
