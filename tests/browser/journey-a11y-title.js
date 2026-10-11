/* Parcours (S7) : titre de scène lu deux fois. Le div.jtitle répète le titre et la date de la
fiche article.detail : il doit être masqué aux lecteurs d'écran, et lui seul dans la scène. */
import { all, context, one, withJourney } from './journey-probe.js';
import { test } from './runner.js';

/** Problèmes du titre de scène : aria-hidden sur .jtitle seul, rien d'autre masqué. */
function titleProblems(site) {
  const title = one(site, '.jtitle');
  if (!title) return ['div.jtitle absent'];
  const problems = [];
  if (title.getAttribute('aria-hidden') !== 'true')
    problems.push('.jtitle sans aria-hidden="true"');
  const hidden = all(site, '.jstage [aria-hidden]').filter((el) => el !== title);
  for (const el of hidden)
    problems.push(`${el.localName}.${[...el.classList].join('.')} : aria-hidden inattendu`);
  for (const selector of ['article.detail', 'article.detail h3', 'article.detail .when'])
    for (const el of all(site, selector))
      if (el.hasAttribute('aria-hidden')) problems.push(`${selector} : aria-hidden inattendu`);
  return problems;
}

/** Titre de scène masqué aux lecteurs d'écran, à la largeur `width`. */
export async function runTitleAria(width) {
  const ctx = context(width);
  const name = 'titre de scène (.jtitle) masqué aux lecteurs d\'écran (aria-hidden)';
  await withJourney(ctx, [name], {}, async (site) => {
    await test(ctx, name, async () => titleProblems(site));
  });
}
