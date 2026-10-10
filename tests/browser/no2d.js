/* Contexte 2D indisponible (S4, groupe « Saut »). Contrat fixé par le moniteur :
getContext('2d') rend null dans le cadre dès avant l'amorçage ; le site s'affiche et suit le
hash, seul le décor est perdu, la courbure signalée par un seul console.error. */
import { activeViews, openSite, settle, statusState, waitFor } from './harness.js';
import { skip, test } from './runner.js';
import { captureConsoleErrors } from './states.js';
import { arrival, uncaught } from './warp.js';

const LOAD_MS = 10000; // fin du chargement : #status quitte data-state="loading"
const NO_2D_CASES = [
  'contexte 2D indisponible : site affiché (pas d\'écran d\'erreur, une .view.on)',
  'contexte 2D indisponible : navigation par hash (#skills)',
  'contexte 2D indisponible : un seul console.error nomme la courbure et le 2D',
];
const CURVE_CAUSE = [/#fovMap|courbure/i, /2D/i]; // texte exact libre, ces deux mentions

/** Refuse le contexte 2D à tout canvas du cadre : getContext('2d') rend null. */
function refuse2d(site) {
  const proto = site.win.HTMLCanvasElement.prototype;
  const original = proto.getContext;
  proto.getContext = function getContext(type, ...rest) {
    if (String(type).toLowerCase() === '2d') return null;
    return original.call(this, type, ...rest);
  };
}

/** Texte d'un appel à console.error : chaînes et messages des erreurs passées. */
const consoleText = (args) => args.map((arg) => String(arg?.message ?? arg)).join(' ');

/** Groupe « Saut », contexte 2D refusé avant l'amorçage, à la largeur `width`. */
export async function runWithout2d(width) {
  const ctx = { group: 'Saut', width, lang: 'fr', section: null };
  const [shown, hashNav, logged] = NO_2D_CASES;
  let site;
  try {
    site = await openSite({
      width,
      prepare: (frame) => {
        captureConsoleErrors(frame);
        refuse2d(frame);
      },
    });
  } catch (error) {
    skip(ctx, NO_2D_CASES, `ouverture du site impossible (${error.message})`);
    return;
  }
  const errors = () => site.consoleErrors.map(consoleText);
  try {
    await test({ ...ctx, section: 'home' }, shown, async () => {
      await waitFor(
        () => site.doc.getElementById('status')?.dataset.state !== 'loading',
        LOAD_MS,
        'fin du chargement',
        () => statusState(site),
      );
      const problems = [];
      const state = site.doc.getElementById('status')?.dataset.state;
      if (state !== 'ready')
        problems.push(
          `#status[data-state="${state}"] au lieu de "ready" ; ` +
            `console.error : [${errors().join(' | ')}]`,
        );
      const views = activeViews(site).map((view) => `#${view.id}`);
      if (views.length !== 1) problems.push(`.view.on : [${views}] au lieu d'une rubrique`);
      return [...problems, ...uncaught(site)];
    });
    await test({ ...ctx, section: 'skills' }, hashNav, async () => {
      site.win.location.hash = '#skills';
      await arrival(site, 'skills');
      await settle(site, 'skills');
      return uncaught(site);
    });
    await test(ctx, logged, () => {
      const named = errors().filter((text) => CURVE_CAUSE.every((cause) => cause.test(text)));
      if (named.length === 1) return [];
      return [
        `${named.length} console.error nomment la courbure et le 2D au lieu d'un : ` +
          `[${errors().join(' | ')}]`,
      ];
    });
  } finally {
    site.close();
  }
}
