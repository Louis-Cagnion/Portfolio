/* Contrat DOM et d'amorçage (fixé par le moniteur) :
- index.html : un seul script d'entrée <script type="module" src="js/main.js" defer> entre
  </head> et <body>. js/main.js exporte boot(env) (env optionnel { fetch, storage, timeoutMs },
  défauts window.fetch, localStorage, 10000) et s'amorce seul, sauf si <html data-noboot>.
- #status statique : data-state="loading" et texte visible avant tout JS ; puis "ready"
  (masqué) ou "error" (message propre à la cause, button[data-action="retry"] qui relance).
- header.bar : nav.nav [data-go] (5), .lang button[data-lang="fr"|"en"] avec aria-pressed ;
  mobile : nav.tabbar [data-go] (5). section.view#home|#journey|#skills|#projects|#contact,
  une seule .view.on après la transition, location.hash = #<id> ; #dossier dans #home ;
  fiche #sheet[role="dialog"], bouton #close.
- Langue : html[lang], <title> = meta.title, meta[name="description"] = meta.description ;
  choix mémorisé dans storage sous la clé lang.
- js/core/dom.js : setRich(el, html, field) n'accepte que <strong>, <em>, <a href> en https:
  ou mailto: ; tout le reste en texte, avec console.error qui nomme field.
Ouvrir : http://127.0.0.1:5501/tests/browser/ (ou port 5500), voir README.md. */
import {
  SECTIONS,
  activeViews,
  bounded,
  click,
  describe,
  errorText,
  goTo,
  isVisible,
  makeStorage,
  openSite,
  readText,
  settle,
  shownNavs,
  waitFor,
  waitStatus,
} from './harness.js';
import { overflowProblems, sectionScopes, targetProblems } from './checks.js';
import { createReport } from './report.js';
import { expectEqual, recordExceptions, skip, test, useReport } from './runner.js';
import { runStates } from './states.js';
import { langAttrProblems, noForeignText, runLanguage, runLanguageEdges } from './language.js';
import { runRich } from './rich.js';
import { runCue } from './cue.js';
import { runHome } from './home.js';
import { runReducedMotion, runWarp, runWithout2d } from './warp.js';

const WIDTHS = [320, 390, 430, 768, 1280];
// Maquette : @media (max-width: 880px) masque la pilule et affiche les onglets.
const TABBAR_MAX_WIDTH = 880;
const MAIN_WIDTH = 390; // largeur des cas qui ne dépendent pas de la mise en page
const SCENARIO_MAX_MS = 300000; // garde-fou d'un scénario entier
const GROUPS = [
  'contrat',
  'setrich',
  'etats',
  'navigation',
  'saut',
  'langue',
  'matrice',
  'accueil',
];
const PILL_WIDTH = 1280; // saut rejoué aussi par la pilule

const params = new URLSearchParams(globalThis.location?.search ?? '');
const listParam = (name, all, parse = (v) => v) => {
  const raw = params.get(name);
  if (!raw) return all;
  const wanted = raw.split(',').map((v) => parse(v.trim()));
  return all.filter((v) => wanted.includes(v));
};
const nonEmpty = (list, all) => (list.length ? list : all); // paramètre invalide : tout
const widths = nonEmpty(listParam('widths', WIDTHS, Number), WIDTHS);
const groups = nonEmpty(listParam('groups', GROUPS), GROUPS);
const mainWidth = widths.includes(MAIN_WIDTH) ? MAIN_WIDTH : widths[0];
const warpWidths = [...new Set([mainWidth, PILL_WIDTH])].filter((w) => widths.includes(w));
const navKind = (width) => (width > TABBAR_MAX_WIDTH ? 'pilule' : 'onglets');
const uncaught = (site) => site.uncaught.map((e) => `exception non rattrapée : ${e}`);

// ---------- Contrat statique de index.html ----------
async function runContract() {
  const ctx = { group: 'Contrat', section: null };
  const html = await readText('index.html').catch((error) => error);
  const failed = html instanceof Error;
  await test(ctx, 'index.html : un seul script d\'entrée, module, js/main.js, defer', () => {
    if (failed) return [errorText(html)];
    const tags = html.match(/<script\b[^>]*>/gi) || [];
    if (tags.length !== 1) return [`${tags.length} balise(s) <script> au lieu d'une`];
    const [tag] = tags;
    const problems = [];
    if (!/\btype\s*=\s*["']module["']/i.test(tag))
      problems.push(`${tag} : type="module" absent`);
    if (!/\bsrc\s*=\s*["'](\.\/)?js\/main\.js["']/i.test(tag))
      problems.push(`${tag} : src="js/main.js" absent`);
    if (!/\sdefer[\s>=]/i.test(tag)) problems.push(`${tag} : defer absent`);
    const at = html.indexOf(tag);
    const headEnd = html.search(/<\/head>/i);
    const bodyStart = html.search(/<body[\s>]/i);
    if (headEnd < 0 || bodyStart < 0 || at < headEnd || at > bodyStart)
      problems.push(`${tag} : pas entre </head> et <body>`);
    if (/data-noboot/i.test(html)) problems.push('data-noboot présent dans index.html');
    return problems;
  });
  await test(ctx, 'index.html : #status statique en chargement, avec texte', () => {
    if (failed) return [errorText(html)];
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const status = doc.getElementById('status');
    if (!status) return ['#status absent du HTML statique'];
    const problems = expectEqual([], '#status[data-state]', status.dataset.state, 'loading');
    if (!status.textContent.trim()) problems.push('#status : texte de chargement vide');
    return problems;
  });
  await test({ ...ctx, width: 1280 }, 'structure après amorçage', async () => {
    const site = await openSite({ width: 1280 });
    try {
      await waitStatus(site, 'ready');
      const { doc } = site;
      const problems = [];
      for (const [selector, count] of [
        ['header.bar nav.nav [data-go]', 5],
        ['nav.tabbar [data-go]', 5],
        ['header.bar .lang button[data-lang]', 2],
        ['section.view', 5],
        ['#home #dossier', 1],
        ['#sheet[role="dialog"]', 1],
        ['#close', 1],
      ]) {
        const found = doc.querySelectorAll(selector).length;
        if (found !== count) problems.push(`${selector} : ${found} au lieu de ${count}`);
      }
      for (const id of SECTIONS)
        if (!doc.querySelector(`section.view#${id}`))
          problems.push(`section.view#${id} absente`);
      for (const selector of ['header.bar nav.nav', 'nav.tabbar']) {
        const targets = [...doc.querySelectorAll(`${selector} [data-go]`)]
          .map((b) => b.dataset.go);
        if (targets.sort().join() !== [...SECTIONS].sort().join())
          problems.push(`${selector} : [data-go] = [${targets.join(', ')}]`);
      }
      return [...problems, ...uncaught(site)];
    } finally {
      site.close();
    }
  });
}

// ---------- Navigation ----------
/** Le dossier est à l'écran : haut dans la moitié haute, ou dossier qui couvre l'écran. */
function dossierOnScreen(site) {
  const dossier = site.doc.querySelector('#home #dossier');
  if (!dossier || !isVisible(dossier)) return false;
  const rect = dossier.getBoundingClientRect();
  const height = site.win.innerHeight;
  const topInView = rect.top >= -2 && rect.top <= height * 0.6;
  return topInView || (rect.top < 0 && rect.bottom >= height);
}
const dossierState = (site) => {
  const rect = site.doc.querySelector('#dossier')?.getBoundingClientRect();
  return `${rect ? `#dossier haut ${rect.top.toFixed(0)} px` : '#dossier absent'}, ` +
    `scrollY ${site.win.scrollY}, vues [${activeViews(site).map((v) => v.id)}]`;
};

async function runNavigation(width) {
  const ctx = { group: 'Navigation', width, lang: 'fr' };
  const kind = navKind(width);
  const names = [`barre affichée : ${kind}`, 'clics [data-go]', 'retour arrière', '#dossier'];
  let site;
  try {
    site = await openSite({ width });
    await waitStatus(site, 'ready');
    await settle(site, 'home');
  } catch (error) {
    site?.close();
    skip(
      { ...ctx, section: 'home' },
      names,
      `ouverture du site impossible (${error.message})`,
    );
    await runHashOnLoad(width);
    return;
  }
  try {
    const navOk = await test({ ...ctx, section: 'home' }, names[0], () => {
      const shown = shownNavs(site);
      if (shown.length !== 1)
        return [`${shown.length} barre(s) affichée(s) : [${shown.map((n) => n.selector)}]`];
      const problems = [];
      if (shown[0].kind !== kind)
        problems.push(
          `${shown[0].selector} affichée au lieu de la ${kind} attendue sous ` +
            `${TABBAR_MAX_WIDTH} px`,
        );
      const goes = [...shown[0].el.querySelectorAll('[data-go]')];
      const hidden = goes.filter((b) => !isVisible(b)).map(describe);
      if (goes.length !== 5) problems.push(`${shown[0].selector} : ${goes.length} [data-go]`);
      if (hidden.length) problems.push(`[data-go] masqués : ${hidden.join(', ')}`);
      return problems;
    });
    const navName = shownNavs(site)[0]?.selector || 'barre';
    const viaNav = (id) => async () => {
      if (!navOk && shownNavs(site).length !== 1) return ['non joué : barre invalide'];
      await goTo(site, id);
      return [];
    };
    for (const id of ['journey', 'skills', 'projects', 'contact', 'home'])
      await test({ ...ctx, section: id }, `clic sur ${navName} [data-go="${id}"]`, viaNav(id));
    const homeGoes = [...site.doc.querySelectorAll('#home [data-go]')].filter(isVisible);
    await test(
      { ...ctx, section: 'home' },
      'boutons [data-go] présents dans #home',
      () => (homeGoes.length ? [] : ['aucun [data-go] visible dans #home']),
    );
    const viaHome = (button) => async () => {
      await goTo(site, 'home');
      site.win.scrollTo(0, 0);
      click(site, button);
      await settle(site, button.dataset.go);
      return [];
    };
    for (const button of homeGoes)
      await test(
        { ...ctx, section: button.dataset.go },
        `bouton de l'accueil ${describe(button)}`,
        viaHome(button),
      );
    await test(
      { ...ctx, section: 'projects' },
      'changement de hash après chargement (#projects)',
      async () => {
        await goTo(site, 'home');
        site.win.location.hash = '#projects';
        await settle(site, 'projects');
        return [];
      },
    );
    await test(
      { ...ctx, section: 'home' },
      'retour arrière (history.back) : #journey vers #home',
      async () => {
        await goTo(site, 'home');
        await goTo(site, 'journey');
        // history.back() d'une iframe sans entrée propre ramènerait la page de la suite.
        const nav = site.win.navigation; // API désactivée : entries() vide, on joue quand même
        if (nav && nav.entries().length > 0 && !nav.canGoBack)
          return ['aucune entrée d\'historique créée par la navigation vers #journey'];
        site.win.history.back();
        await settle(site, 'home');
        return [];
      },
    );
    const toDossier = (from) => async () => {
      if (from === 'home') {
        site.win.location.hash = '#home';
        await settle(site, 'home');
        site.win.scrollTo(0, 0);
      } else await goTo(site, from);
      site.win.location.hash = '#dossier';
      await settle(site, 'home', { checkHash: false });
      await waitFor(
        () => dossierOnScreen(site),
        4000,
        '#dossier à l\'écran',
        () => dossierState(site),
      );
      return [];
    };
    for (const from of ['contact', 'home'])
      await test(
        { ...ctx, section: 'home' },
        `#dossier depuis #${from} : accueil et dossier à l'écran`,
        toDossier(from),
      );
    await test(
      { ...ctx, section: null },
      'aucune exception non rattrapée',
      () => uncaught(site),
    );
  } finally {
    site.close();
  }
  await runHashOnLoad(width);
}

async function runHashOnLoad(width) {
  const ctx = { group: 'Navigation', width, lang: 'fr' };
  const direct = async () => {
    const site = await openSite({ width, hash: 'skills' });
    try {
      await waitStatus(site, 'ready');
      await settle(site, 'skills');
      return uncaught(site);
    } finally {
      site.close();
    }
  };
  await test({ ...ctx, section: 'skills' }, 'hash direct au chargement (#skills)', direct);
  await test(
    { ...ctx, section: null },
    'hash inconnu au chargement : une rubrique et son hash',
    async () => {
      const site = await openSite({ width, hash: 'inconnu' });
      try {
        await waitStatus(site, 'ready');
        await waitFor(
          () => {
            const views = activeViews(site);
            return views.length === 1 && site.win.location.hash === `#${views[0].id}`;
          },
          6000,
          'une seule .view.on et location.hash = #<id>',
          () => `vues [${activeViews(site).map((v) => v.id)}], ` +
            `hash "${site.win.location.hash}"`,
        );
        return uncaught(site);
      } finally {
        site.close();
      }
    },
  );
}

// ---------- Matrice largeur × langue × rubrique ----------
const MATRIX_CASES = [
  'aucun débordement horizontal',
  'zones cliquables d\'au moins 44 px',
  'aucun texte de l\'autre langue visible',
];

async function runMatrix(width, lang) {
  const ctx = { group: 'Matrice', width, lang };
  let site;
  try {
    site = await openSite({ width, storage: makeStorage(lang === 'en' ? { lang } : {}) });
    await waitStatus(site, 'ready');
    await settle(site, 'home');
  } catch (error) {
    site?.close();
    for (const section of SECTIONS)
      skip(
        { ...ctx, section },
        MATRIX_CASES,
        `ouverture du site impossible (${error.message})`,
      );
    return;
  }
  try {
    await test(
      { ...ctx, section: 'home' },
      `amorçage en ${lang} (lang, titre, description)`,
      () => langAttrProblems(site, lang),
    );
    for (const section of SECTIONS) {
      const at = { ...ctx, section };
      let reached = null;
      try {
        await goTo(site, section);
      } catch (error) {
        reached = errorText(error);
      }
      if (reached) {
        skip(at, MATRIX_CASES, `rubrique non atteinte (${reached})`);
        continue;
      }
      await test(at, MATRIX_CASES[0], () => overflowProblems(site));
      await test(at, MATRIX_CASES[1], () => {
        const scopes = sectionScopes(site, section, section === 'home');
        const { problems, exceptions } = targetProblems(site, scopes);
        recordExceptions(at, exceptions);
        return problems;
      });
      await test(at, MATRIX_CASES[2], () => noForeignText(site, lang));
    }
    await test(
      { ...ctx, section: null },
      'aucune exception non rattrapée',
      () => uncaught(site),
    );
  } finally {
    site.close();
  }
}

// ---------- Lancement ----------
async function scenario(label, run) {
  try {
    await bounded(run(), SCENARIO_MAX_MS, label);
  } catch (error) {
    skip(
      { group: 'Suite', section: null },
      [label],
      `scénario interrompu : ${errorText(error)}`,
    );
  }
}

async function main() {
  const report = createReport();
  useReport(report);
  document.getElementById('filters').textContent = `Largeurs : ${widths.join(', ')} px ; ` +
    `groupes : ${groups.join(', ')} (paramètres ?widths=320,1280&groups=${GROUPS.join(',')})`;
  try {
    if (groups.includes('contrat')) await scenario('contrat', runContract);
    if (groups.includes('setrich')) await scenario('setRich', runRich);
    if (groups.includes('etats')) await scenario('états', () => runStates(widths, mainWidth));
    if (groups.includes('navigation'))
      for (const width of widths)
        await scenario(`navigation ${width}`, () => runNavigation(width));
    if (groups.includes('saut')) {
      for (const width of warpWidths) await scenario(`saut ${width}`, () => runWarp(width));
      await scenario('mouvement réduit', () => runReducedMotion(mainWidth));
      await scenario('saut sans contexte 2D', () => runWithout2d(mainWidth));
    }
    if (groups.includes('langue')) {
      for (const width of widths) await scenario(`langue ${width}`, () => runLanguage(width));
      await scenario('langue (limites)', () => runLanguageEdges(mainWidth));
    }
    if (groups.includes('matrice'))
      for (const width of widths)
        for (const lang of ['fr', 'en'])
          await scenario(`matrice ${width} ${lang}`, () => runMatrix(width, lang));
    if (groups.includes('accueil')) {
      await scenario('accueil', () => runHome(widths, mainWidth));
      await scenario('repère', () => runCue(mainWidth, false));
      await scenario('repère (mouvement réduit)', () => runCue(mainWidth, true));
    }
  } catch (error) {
    skip({ group: 'Suite', section: null }, ['suite'], `erreur interne : ${errorText(error)}`);
  } finally {
    report.finish();
  }
}

if (typeof document !== 'undefined') main();
