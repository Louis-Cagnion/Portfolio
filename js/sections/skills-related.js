/*
Compétences, projets liés (S8.C7, parcours R2b choisi par Louis le 17/10/2026) : une puce
« Projets liés » saute vers #projects, puis, quand html[data-warp] a disparu, la caméra de
Projets va d'un seul mouvement jusqu'à la planète du projet et la fiche s'ouvre (projects.js,
openProject). Sous mouvement réduit le saut est immédiat, donc la fiche aussi.
*/
import { openProject } from './projects.js';

const TARGET = '#projects';

/**
 * @brief Projets liés d'une étoile, tels que le panneau les affiche.
 *
 * @param {object} projects données `projects` de la langue affichée
 * @param {string[]} ids identifiants de `skills.groups[].items[].projects`
 *
 * @returns {{ id: string, title: string }[]} un projet par identifiant connu, titre sans
 *   balise ; un identifiant absent des données est signalé en console.error puis ignoré
 */
export function relatedOf(projects, ids) {
  const known = new Map(projects.systems.flatMap((system) => (
    system.projects.map((project) => [project.id, project])
  )));
  return ids.flatMap((id) => {
    const project = known.get(id);
    if (!project) {
      console.error(`skills : projet lié « ${id} » absent de projects.systems`);
      return [];
    }
    return [{ id, title: project.title.replace(/<[^>]+>/g, '') }];
  });
}

/** Saute vers #projects : résolue quand le routeur a traité le changement de hash. */
const arrive = () => new Promise((resolve) => {
  if (location.hash === TARGET) {
    resolve();
    return;
  }
  // Écouteur posé après celui du routeur : html[data-warp] est déjà posé quand il s'exécute
  addEventListener('hashchange', resolve, { once: true });
  location.hash = TARGET;
});

/** Résolue quand html[data-warp] a disparu (aussitôt s'il n'y a pas de saut en cours). */
const warpGone = () => new Promise((resolve) => {
  const root = document.documentElement;
  if (!root.hasAttribute('data-warp')) {
    resolve();
    return;
  }
  const watch = new MutationObserver(() => {
    if (root.hasAttribute('data-warp')) return;
    watch.disconnect();
    resolve();
  });
  watch.observe(root, { attributes: true, attributeFilter: ['data-warp'] });
});

/**
 * @brief Parcours d'une puce « Projets liés » : saut vers Projets, fin du saut, fiche.
 *
 * @param {string} id identifiant du projet lié
 * @param {HTMLButtonElement} button puce cliquée, qui reprendrait le focus à la fermeture si
 *   elle était encore affichée (sinon la planète le reçoit)
 */
export async function openRelated(id, button) {
  try {
    await arrive();
    await warpGone();
    await openProject(id, button);
  } catch (error) {
    console.error(`skills : projet lié « ${id} » non ouvert`, error);
  }
}
