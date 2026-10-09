/* Repère de l'accueil qui s'efface (S5). Contrat fixé par le moniteur (docs/design/plan.md:121
« repère qui s'efface », maquette docs/design/prototype/prototype.template.html:83-87 et
1208-1212, docs/design-checklist.md:297-298 et 310) :
- a.cue#cue[href="#dossier"] : opacité 1, visible, sans .gone en haut de l'accueil ; la flèche
  tourne en boucle (animation cue 2s infinite, maquette:85) ;
- clic ou Entrée : #dossier à l'écran (défilement fluide, immédiat sous mouvement réduit),
  accueil toujours affiché, aucun html[data-warp] ;
- .gone (opacity 0, visibility hidden, maquette:84) posée quand #dossier entre dans la zone
  de rootMargin '0px 0px -15% 0px' (maquette:1210), retirée en remontant ;
- mouvement réduit : aucune animation du repère ne tourne (animation: none, checklist:298).
Limites du banc : Entrée est jouée par un keydown synthétique, puis par le clic que le
navigateur déclenche sur un lien natif si keydown n'est pas annulé ; la marge de 15 % n'est pas
mesurable dans une iframe (la racine implicite de l'observateur est la fenêtre de la suite) ;
le bouchon matchMedia n'atteint pas le CSS, la règle de mouvement réduit est lue dans le
CSSOM. */
import { activeViews, click, describe, isVisible, waitFor } from './harness.js';
import {
  GROUP,
  TOLERANCE,
  cueOf,
  find,
  openHome,
  sleep,
  uncaught,
} from './home.js';
import { expectEqual, skip, test } from './runner.js';

const SHARES = { below: 1.05, inside: 0.4 }; // haut du dossier / hauteur
const SETTLE_MS = 600; // marge laissée à l'observateur et à la transition de 0.4 s
const SCROLL_MS = 4000; // défilement fluide jusqu'au dossier
const IMMEDIATE_MS = 250; // défilement « immédiat » sous mouvement réduit
const FADE_MS = 2000; // fondu du repère
const OBSERVER_MARGIN = 0.15; // rootMargin '0px 0px -15% 0px' (maquette:1210)

// ---------- Repère ----------

/** Le haut du dossier est dans la zone que l'observateur du repère surveille. */
function dossierShown(site) {
  const dossier = find(site, '#dossier');
  if (!dossier || !isVisible(dossier)) return false;
  const top = dossier.getBoundingClientRect().top;
  return top >= -TOLERANCE && top < site.win.innerHeight * (1 - OBSERVER_MARGIN);
}

const cueState = (site) => {
  const cue = cueOf(site);
  if (!cue) return 'a#cue absent';
  const style = site.win.getComputedStyle(cue);
  const top = find(site, '#dossier')?.getBoundingClientRect().top;
  return `a#cue${cue.classList.contains('gone') ? '.gone' : ''} opacité ${style.opacity}, ` +
    `visibility ${style.visibility}, haut du dossier ${top?.toFixed(0)} px, ` +
    `scrollY ${site.win.scrollY.toFixed(0)}`;
};

/** Défile à la position instantanée où le haut du dossier est à `share` de la hauteur. */
async function placeDossier(site, share) {
  const dossier = find(site, '#dossier');
  const top = dossier.getBoundingClientRect().top + site.win.scrollY;
  site.win.scrollTo({ top: top - site.win.innerHeight * share, behavior: 'instant' });
  await sleep(SETTLE_MS);
}

const scrollTop = async (site) => {
  site.win.scrollTo({ top: 0, behavior: 'instant' });
  await sleep(SETTLE_MS);
};

/** Repère en place, au repos, en haut de l'accueil : opacité 1, visible, sans .gone. */
function cueRestProblems(site) {
  const cue = cueOf(site);
  if (!cue) return ['a#cue absent'];
  const style = site.win.getComputedStyle(cue);
  const problems = [];
  if (cue.classList.contains('gone')) problems.push('a#cue porte .gone en haut de l\'accueil');
  expectEqual(problems, 'a#cue opacity', style.opacity, '1');
  expectEqual(problems, 'a#cue visibility', style.visibility, 'visible');
  if (!isVisible(cue)) problems.push(`${describe(cue)} non visible en haut de l'accueil`);
  return problems;
}

/** Repère effacé (maquette:84) : .gone, opacité 0 et visibility hidden, en FADE_MS au plus. */
async function goneProblems(site) {
  const cue = cueOf(site);
  if (!cue) return ['a#cue absent'];
  try {
    await waitFor(
      () => cue.classList.contains('gone'),
      FADE_MS,
      'a#cue.gone après l\'arrivée du dossier',
      () => cueState(site),
    );
    await waitFor(
      () => {
        const style = site.win.getComputedStyle(cue);
        return style.opacity === '0' && style.visibility === 'hidden';
      },
      FADE_MS,
      'a#cue opacity 0 et visibility hidden',
      () => cueState(site),
    );
  } catch (error) {
    return [error.message];
  }
  return [];
}

/** Activation du repère : #dossier à l'écran, repère effacé, aucun saut, accueil affiché. */
async function activationProblems(site, trigger, { immediate }) {
  if (!cueOf(site)) return ['a#cue absent : activation impossible'];
  await scrollTop(site);
  const mark = site.warps.length;
  trigger();
  const problems = [];
  if (immediate) {
    await sleep(IMMEDIATE_MS);
    if (!dossierShown(site))
      problems.push(
        `${IMMEDIATE_MS} ms après l'activation sous mouvement réduit, #dossier n'est pas ` +
          `à l'écran (${cueState(site)})`,
      );
  } else {
    try {
      await waitFor(
        () => dossierShown(site),
        SCROLL_MS,
        '#dossier à l\'écran après l\'activation du repère',
        () => cueState(site),
      );
    } catch (error) {
      problems.push(error.message);
    }
  }
  const warps = site.warps.slice(mark);
  if (warps.length) problems.push(`html[data-warp] posé (${warps.join(', ')}) par le repère`);
  const views = activeViews(site).map((view) => `#${view.id}`);
  if (views.join() !== '#home') problems.push(`.view.on : [${views}] au lieu de [#home]`);
  return [...problems, ...await goneProblems(site)];
}

/** Entrée sur le repère focalisé : keydown synthétique, puis le clic du navigateur. */
function pressEnter(site) {
  const cue = cueOf(site);
  cue.focus();
  const event = new site.win.KeyboardEvent('keydown', {
    key: 'Enter',
    code: 'Enter',
    bubbles: true,
    cancelable: true,
  });
  if (cue.dispatchEvent(event)) click(site, cue); // lien natif : Entrée vaut un clic
}

/** Repère focalisable au clavier : lien natif, dans l'ordre de tabulation, focus reçu. */
function focusProblems(site) {
  const cue = cueOf(site);
  if (!cue) return ['a#cue absent'];
  const problems = [];
  if (cue.localName !== 'a' || !cue.hasAttribute('href'))
    problems.push(`${describe(cue)} n'est pas un lien natif a[href]`);
  if (cue.tabIndex < 0)
    problems.push(`a#cue tabIndex ${cue.tabIndex} : hors de la tabulation`);
  cue.focus();
  if (site.doc.activeElement !== cue)
    problems.push(`focus sur ${describe(site.doc.activeElement)} au lieu de a#cue`);
  return problems;
}

/** Règle @media (prefers-reduced-motion: reduce) qui met animation à none sur `el`. */
function stopsUnderReducedMotion(site, el) {
  const walk = (rules, reduced) => [...rules].some((rule) => {
    if (rule.cssRules && !rule.selectorText) {
      const query = rule.conditionText ?? rule.media?.mediaText ?? '';
      return walk(rule.cssRules, reduced || /prefers-reduced-motion:\s*reduce/.test(query));
    }
    return reduced && rule.selectorText && el.matches(rule.selectorText) &&
      rule.style.animationName === 'none';
  });
  return [...site.doc.styleSheets].some((sheet) => {
    try {
      return walk(sheet.cssRules, false);
    } catch {
      return false; // feuille d'une autre origine (polices) : illisible, sans règle du site
    }
  });
}

const CUE_CASES = {
  rest: 'repère : opacité 1, visible, sans .gone en haut de l\'accueil',
  focus: 'repère : lien natif focalisable au clavier',
  loop: 'repère : la flèche tourne en boucle (animation cue 2s infinite)',
  margin: 'repère : .gone absente dossier hors écran, posée dossier à l\'écran',
  click: 'repère : clic amène #dossier à l\'écran, sans saut, puis .gone',
  enter: 'repère : Entrée amène #dossier à l\'écran, sans saut, puis .gone',
  back: 'repère : retiré de .gone en remontant, opacité 1',
  reduceClick: 'mouvement réduit : clic sur le repère, défilement immédiat, sans saut',
  reduceEnter: 'mouvement réduit : Entrée sur le repère, défilement immédiat, sans saut',
  reduceLoop: 'mouvement réduit : aucune animation du repère ne tourne (animation: none)',
  exceptions: 'aucune exception non rattrapée (repère)',
};

/** Scénarios du repère à la largeur `width`, mouvement réduit ou non. */
export async function runCue(width, reduce) {
  const ctx = { group: GROUP, width, lang: 'fr', section: 'home' };
  const { reduceClick, reduceEnter, reduceLoop, exceptions } = CUE_CASES;
  const names = reduce
    ? [reduceClick, reduceEnter, reduceLoop, exceptions]
    : Object.values(CUE_CASES).filter((name) => !name.startsWith('mouvement réduit'));
  let site;
  try {
    site = await openHome(width, { reduce });
  } catch (error) {
    skip(ctx, names, `ouverture du site impossible (${error.message})`);
    return;
  }
  try {
    if (reduce) {
      await test(ctx, CUE_CASES.reduceClick, () => activationProblems(
        site,
        () => click(site, cueOf(site)),
        { immediate: true },
      ));
      await test(ctx, CUE_CASES.reduceEnter, () => activationProblems(
        site,
        () => pressEnter(site),
        { immediate: true },
      ));
      await test(ctx, CUE_CASES.reduceLoop, () => {
        const span = find(site, '#cue span');
        if (!span) return ['#cue span absent'];
        if (stopsUnderReducedMotion(site, span)) return [];
        return [
          '#cue span : aucune règle de prefers-reduced-motion: reduce ne met animation: none',
        ];
      });
    } else await runAnimatedCue(site, ctx);
    await test(ctx, CUE_CASES.exceptions, () => uncaught(site));
  } finally {
    site.close();
  }
}

/** Cas du repère sous mouvement non réduit. */
async function runAnimatedCue(site, ctx) {
  await test(ctx, CUE_CASES.rest, () => cueRestProblems(site));
  await test(ctx, CUE_CASES.focus, () => focusProblems(site));
  await test(ctx, CUE_CASES.loop, () => {
    const span = find(site, '#cue span');
    if (!span) return ['#cue span absent'];
    const style = site.win.getComputedStyle(span);
    const problems = [];
    expectEqual(problems, '#cue span animation-name', style.animationName, 'cue');
    expectEqual(problems, '#cue span animation-duration', style.animationDuration, '2s');
    const count = style.animationIterationCount;
    expectEqual(problems, '#cue span animation-iteration-count', count, 'infinite');
    return problems;
  });
  await test(ctx, CUE_CASES.margin, async () => {
    const cue = cueOf(site);
    if (!cue || !find(site, '#dossier')) return ['a#cue ou #dossier absent'];
    const problems = [];
    await placeDossier(site, SHARES.below);
    if (cue.classList.contains('gone'))
      problems.push(`a#cue.gone alors que #dossier est sous l'écran (${cueState(site)})`);
    await placeDossier(site, SHARES.inside);
    return [...problems, ...await goneProblems(site)];
  });
  await test(ctx, CUE_CASES.click, () => activationProblems(
    site,
    () => click(site, cueOf(site)),
    { immediate: false },
  ));
  await test(ctx, CUE_CASES.enter, () => activationProblems(
    site,
    () => pressEnter(site),
    { immediate: false },
  ));
  await test(ctx, CUE_CASES.back, async () => {
    const cue = cueOf(site);
    if (!cue || !find(site, '#dossier')) return ['a#cue ou #dossier absent'];
    await placeDossier(site, SHARES.inside);
    if (!cue.classList.contains('gone'))
      return [`non joué : repère non effacé (${cueState(site)})`];
    await scrollTop(site);
    return cueRestProblems(site);
  });
}

