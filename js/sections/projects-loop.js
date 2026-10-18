/*
Boucle d'animation de la rubrique Projets : une seule requestAnimationFrame en attente,
demandée quand la rubrique est affichée, l'onglet visible et le mouvement non réduit
(docs/design-checklist.md, section 6). Le nom en projects-*.js compte : la suite navigateur
repère la boucle de la rubrique par la pile d'appels.
*/
import { reduced, watchReduced } from '../core/motion.js';

const MAX_STEP_MS = 50; // un onglet qui revient ne fait pas sauter les planètes

/**
 * @brief Boucle de la rubrique : démarre et s'arrête seule selon l'affichage de `root`, la
 *   visibilité de l'onglet et le mouvement réduit.
 *
 * @param {HTMLElement} root section.view#projects, affichée quand elle porte la classe `on`
 * @param {(dt: number) => void} step appelée à chaque image avec le pas en ms (50 au plus)
 *
 * @returns {{ sync: () => void }} sync() relit les trois conditions, démarre ou arrête la
 *   boucle ; appelée aussi seule à chaque changement de classe, de visibilité ou de réglage
 */
export function createLoop(root, step) {
  let handle = 0;
  let last = 0;
  const wanted = () => root.classList.contains('on') && !document.hidden && !reduced();

  const frame = (now) => {
    try {
      step(Math.min(now - last, MAX_STEP_MS));
    } catch (error) {
      handle = 0;
      console.error('projects : boucle d\'animation arrêtée', error);
      return;
    }
    last = now;
    handle = requestAnimationFrame(frame);
  };

  const sync = () => {
    const want = wanted();
    if (want && !handle) {
      last = performance.now();
      handle = requestAnimationFrame(frame);
    } else if (!want && handle) {
      cancelAnimationFrame(handle);
      handle = 0;
    }
  };

  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', sync);
  watchReduced(sync);
  return { sync };
}
