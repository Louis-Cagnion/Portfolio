/* Fiche projet : replis du focus à la fermeture (docs/design-checklist.md:175-181, section 7).
Focus rendu à l'origine ; origine détachée ou masquée : la planète du même projet
(`.planet[aria-label]` égal au titre, dans #projects) ; sans planète : le h2 de #projects
(tabindex="-1"). La vraie rubrique Projets est montée : ses planètes de même titre passeraient
avant la planète fixture, donc chaque cas neutralise leur `aria-label` le temps du cas. */
import { isVisible } from './harness.js';
import {
  GROUP,
  addFixtures,
  check,
  closeBy,
  focusText,
  openSheetSite,
  rest,
  sheetViews,
} from './sheet.js';

/** Retire l'aria-label des vraies planètes de `title` ; rend la fonction qui le remet. */
function muteRealPlanets(site, title) {
  const muted = [...site.doc.querySelectorAll('#projects .planet[aria-label]')]
    .filter((node) => !node.closest('[data-fixture]'))
    .filter((node) => node.getAttribute('aria-label') === title);
  const labels = muted.map((node) => node.getAttribute('aria-label'));
  muted.forEach((node) => node.removeAttribute('aria-label'));
  return () => muted.forEach((node, i) => node.setAttribute('aria-label', labels[i]));
}

const FALLBACKS = [
  ['origine détachée', (o) => o.remove(), true],
  ['origine masquée', (o) => { o.style.display = 'none'; }, true],
  ['origine détachée et aucune planète', (o) => o.remove(), false],
];

async function fallbackTests(ctx, site, view) {
  for (const [name, spoil, planet] of FALLBACKS)
    await check(ctx, `${name} : focus sur ${planet ? 'la planète' : 'le h2'}`, site,
      async (ctl) => {
        const unmute = muteRealPlanets(site, view.title);
        try {
          const fx = addFixtures(site, view, { planet });
          ctl.open(view, fx.origin);
          await rest(site);
          spoil(fx.origin);
          await closeBy(site, 'bouton');
          const wanted = planet ? fx.planet : site.doc.querySelector('#projects h2');
          const active = site.doc.activeElement;
          const problems = [];
          if (!wanted) return ['cible de repli introuvable (h2 de #projects)'];
          if (active !== wanted) problems.push(`focus sur ${focusText(site)}`);
          if (!active.isConnected || !isVisible(active))
            problems.push('focus sur un élément détruit ou masqué');
          if (!planet && wanted.getAttribute('tabindex') !== '-1')
            problems.push('h2 de #projects sans tabindex="-1"');
          return problems;
        } finally {
          unmute();
        }
      });
}

/** Groupe « Fiche », replis du focus, à chaque largeur. */
export async function runSheetFocus(widths) {
  const views = await sheetViews();
  for (const width of widths) {
    const site = await openSheetSite(width);
    try {
      const ctx = { group: GROUP, section: 'projects', width, lang: 'fr' };
      await fallbackTests(ctx, site, views.fr);
    } finally {
      site.close();
    }
  }
}
