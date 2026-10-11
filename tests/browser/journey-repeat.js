/* Parcours (S7) : touche maintenue sur une flèche (répétitions de keydown). */
import { describe } from './harness.js';
import { test } from './runner.js';
import { arrowPairs, context, withJourney } from './journey-probe.js';

const NO_PAIR = 'aucune paire de flèches affichée';

/** Envoie un `keydown` annulable sur `el`, répété ou non, et rend l'évènement. */
function repeatEvent(site, el, key, repeat) {
  const init = { key, repeat, bubbles: true, cancelable: true };
  const event = new site.win.KeyboardEvent('keydown', init);
  el.dispatchEvent(event);
  return event;
}

/**
 * @brief Entrée et Espace répétées sur une flèche affichée sont annulées (pas de `click`
 *   synthétisé à la borne), un appui isolé ne l'est pas.
 *
 * @param {number} width largeur jouée
 */
export async function runArrowRepeat(width) {
  const ctx = context(width);
  const name = 'flèches : Entrée et Espace répétées annulées, appui isolé intact';
  await withJourney(ctx, [name], {}, (site) => test(ctx, name, async () => {
    const pair = arrowPairs(site).visible;
    if (!pair) return [NO_PAIR];
    const problems = [];
    for (const button of pair) {
      for (const key of ['Enter', ' ']) {
        const label = `touche ${JSON.stringify(key)} sur ${describe(button)}`;
        if (!repeatEvent(site, button, key, true).defaultPrevented)
          problems.push(`${label} répétée : preventDefault non appelé`);
        if (repeatEvent(site, button, key, false).defaultPrevented)
          problems.push(`${label} isolée : preventDefault appelé`);
      }
    }
    return problems;
  }));
}
