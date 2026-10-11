/* Parcours : boucles d'animation CSS au repos (aucun trajet). Chrome refait une mise en page
SVG à chaque image d'une animation de `transform` sur un élément SVG (mesuré : 60 par seconde,
environ 4 ms de calcul par seconde, quelle que soit la boucle) ; ce coût est borné en ne
laissant au repos que des boucles qui animent `transform` et `opacity`, jamais une propriété
de géométrie (r, cx, d, stroke-width...) ni la flamme du vaisseau. Mouvement non réduit. */
import { test } from './runner.js';
import { context, sleep, view, withJourney } from './journey-probe.js';

const CALM = new Set(['transform', 'opacity']);
const KEYFRAME_FIELDS = new Set(['offset', 'computedOffset', 'easing', 'composite']);
const SETTLE_MS = 300; // montage de la scène et premières images

/** Animations CSS infinies en cours dans le parcours : { name, target, props }. */
function idleLoops(site) {
  const root = view(site);
  return site.doc.getAnimations()
    .filter((animation) => (
      animation.playState === 'running' &&
      animation.effect.getComputedTiming().iterations === Infinity &&
      root.contains(animation.effect.target)
    ))
    .map((animation) => ({
      name: animation.animationName,
      target: animation.effect.target,
      props: new Set(animation.effect.getKeyframes()
        .flatMap((frame) => Object.keys(frame))
        .filter((key) => !KEYFRAME_FIELDS.has(key))),
    }));
}

/**
 * @brief Au repos, les boucles du parcours n'animent que transform et opacity, la flamme est
 *   éteinte.
 *
 * @param {number} width largeur jouée
 */
export async function runIdleLayout(width) {
  const ctx = context(width);
  const names = [
    'repos : les boucles infinies du parcours n\'animent que transform et opacity',
    'repos : la flamme du vaisseau n\'est pas animée',
  ];
  await withJourney(ctx, names, { reduce: false }, async (site) => {
    await sleep(SETTLE_MS);
    const loops = idleLoops(site);
    await test(ctx, names[0], () => [
      ...(loops.length ? [] : ['aucune boucle infinie au repos : le coeur du test est vide']),
      ...loops.flatMap(({ name, props }) => [...props]
        .filter((prop) => !CALM.has(prop))
        .map((prop) => `boucle ${name} : anime ${prop} (mise en page à chaque image)`)),
    ]);
    await test(ctx, names[1], () => (
      loops.some(({ name }) => name === 'ship-flame')
        ? ['boucle ship-flame en cours sans trajet']
        : []
    ));
  });
}
