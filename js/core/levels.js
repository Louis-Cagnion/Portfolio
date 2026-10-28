/*
Niveaux de compétence : source unique, du moins au plus avancé.
Le rang d'un niveau est son indice ; ajouter un niveau se fait ici, puis dans les tables
indexées par niveau (`BODY_RADII` de skills-layout.js, textes `levels`, `levelNotes` et
`bodies` des données), que le schéma et les tests refusent incomplètes.
*/

export const LEVELS = Object.freeze(['unknown', 'beginner', 'intermediate', 'advanced']);

/** Niveaux du plus avancé au moins avancé (ordre de la légende). */
export const LEVELS_DESCENDING = Object.freeze([...LEVELS].reverse());

/**
 * @brief Rang d'un niveau : 0 pour le moins avancé, `LEVELS.length - 1` pour le plus avancé.
 *
 * @example levelRank('advanced') -> 3
 *
 * @param {string} level nom d'un niveau de `LEVELS`
 *
 * @returns {number} rang, ou -1 si le niveau est inconnu
 */
export const levelRank = (level) => LEVELS.indexOf(level);
