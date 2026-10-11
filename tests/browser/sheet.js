/* Fiche projet (S6). Contrat (décidé par le moniteur ; docs/design-checklist.md:175-181,
183-189, 318-321) :
- js/ui/sheet.js exporte initSheet(doc), idempotent par document (un second appel avec le
  même doc rend le même contrôleur, sans doubler les écouteurs) ; il rend
  { open(view, origin), update(view), close(), isOpen() }, view = { category, title,
  tags: string[], blocks: [{ type: 'text', html } | { type: 'list', items: [html] }],
  links: [{ intro, label, href }] } ; `html` ne passe que par setRich (js/core/dom.js) ;
  `origin` reçoit le focus à la fermeture ; update(view) réécrit seulement les textes d'une
  fiche ouverte (changement de langue), sans bouger le focus ni le défilement ;
- balisage d'index.html : #sheetBg, #sheet (hidden inert au départ, role="dialog",
  aria-modal="true", aria-labelledby vers #sTitle ; sa balise n'est pas testée), #close,
  #sCat, #sTitle (h3), #sTags, #sBody (.body) ; 880 px et moins (55em) : feuille du bas
  (88vh, 100 %), au-delà panneau à droite min(620px, 100%) ; voile --scrim, z-index 20 ;
- ouverte : focus au bouton fermer, Tab et Maj+Tab bouclent, `body > *` hors #sheet et
  #sheetBg inert ; fermée : inert et invisible ; bouton, voile et Échap ferment ; focus
  rendu à `origin`, sinon à la planète du projet (`.planet[aria-label]` égal au titre, dans
  #projects), sinon au h2 de #projects (tabindex="-1") ; mouvement réduit (matchMedia
  bouchonné, voir warp.js) : ouverture et fermeture immédiates.
Fixtures du banc dans #projects (pas encore de planètes) : un bouton d'origine et deux
`svg g.planet[role=button][tabindex=0][aria-label]` (un autre projet, puis le projet). */
import {
  ROOT,
  bounded,
  click,
  describe,
  goTo,
  isVisible,
  makeStorage,
  openSite,
  readJson,
  settle,
  waitFor,
  waitStatus,
} from './harness.js';
import { MIN_TARGET, targetProblems } from './checks.js';
import { noForeignText, switchTo } from './language.js';
import { normalize } from './text.js';
import { recordExceptions, test } from './runner.js';
import { stubMotion } from './warp.js';

export const GROUP = 'Fiche';
const PHONE_MAX = 880; // 55em : feuille du bas jusqu'ici, panneau à droite au-delà
const PANEL_MAX = 620;
const SHEET_RATIO = 0.88;
const TOLERANCE = 1.5;
const IMMEDIATE_MS = 120; // « sans transition longue » : le résultat final dès ce délai
const SVG = 'http://www.w3.org/2000/svg';
const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, ' +
  '[tabindex]:not([tabindex="-1"])';
const EXTRA_BLOCK = { type: 'text', html: 'Un <strong>mot</strong> en gras.' };
const HOSTILE_BLOCK = { type: 'text', html: '<img src="x" onerror="window.__pwned=1">texte' };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------- Données réelles et module ----------

let viewsCache = null;
/** Fiche du projet au plus long contenu de chaque langue (data/<lang>.json). */
function sheetViews() {
  viewsCache ||= (async () => {
    const views = {};
    for (const lang of ['fr', 'en']) {
      const data = await readJson(`data/${lang}.json`);
      let best = null;
      for (const system of data.projects.systems)
        for (const project of system.projects) {
          const size = JSON.stringify(project).length;
          if (!best || size > best.size) best = { size, system, project };
        }
      const { system, project } = best;
      views[lang] = {
        category: data.projects.systemOf.replace('{name}', system.name),
        title: project.title,
        tags: project.tags,
        blocks: project.blocks,
        links: project.links,
      };
    }
    return views;
  })();
  return viewsCache;
}

let moduleCache = null;
/** Module js/ui/sheet.js : { mod } ou { error } (introuvable, sans initSheet). */
function loadSheet() {
  moduleCache ||= import(new URL('js/ui/sheet.js', ROOT).href).then(
    (mod) => (typeof mod.initSheet === 'function'
      ? { mod }
      : { error: 'js/ui/sheet.js n\'exporte pas initSheet' }),
    (error) => ({ error: `import de js/ui/sheet.js impossible : ${error.message}` }),
  );
  return moduleCache;
}

// ---------- Site, fixtures, attentes ----------

/** Site ouvert sur Projets, mouvement réduit réglable par `site.motion.set(bool)`. */
async function openSheetSite(width) {
  const motion = { reduce: false };
  const site = await openSite({
    width,
    storage: makeStorage(),
    prepare: (opened) => stubMotion(opened, motion),
  });
  site.motion = motion;
  try {
    await waitStatus(site, 'ready');
    await settle(site, 'home');
    await goTo(site, 'projects');
  } catch (error) {
    site.close();
    throw error;
  }
  return site;
}

const parts = (site) => {
  const byId = (id) => site.doc.getElementById(id);
  return {
    sheet: byId('sheet'),
    bg: byId('sheetBg'),
    close: byId('close'),
    cat: byId('sCat'),
    title: byId('sTitle'),
    tags: byId('sTags'),
    body: byId('sBody'),
  };
};

const frame = (win) => bounded(
  new Promise((resolve) => win.requestAnimationFrame(resolve)),
  500,
  'requestAnimationFrame',
).catch(() => {});

/** Attend le démarrage puis la fin des animations CSS, puis une image peinte. */
async function rest(site) {
  for (let i = 0; i < 3; i++) await frame(site.win); // transition lancée à l'image suivante
  await waitFor(
    () => !site.doc.getAnimations().some(
      (a) => a.playState === 'running' && a.effect?.getComputedTiming().endTime !== Infinity,
    ),
    3000,
    'animations de la fiche',
  ).catch(() => {});
  await frame(site.win);
  await sleep(50); // fin de transition notée par un minuteur plutôt que par transitionend
}

/** Pose les fixtures de #projects : origine, planète d'un autre projet, planète du projet. */
function addFixtures(site, view, { planet = true } = {}) {
  const { doc } = site;
  const host = doc.getElementById('projects');
  const origin = doc.createElement('button');
  origin.type = 'button';
  origin.textContent = 'origine';
  origin.dataset.fixture = '';
  host.append(origin);
  const make = (label) => {
    const svg = doc.createElementNS(SVG, 'svg');
    svg.setAttribute('width', '40');
    svg.setAttribute('height', '40');
    svg.dataset.fixture = '';
    const g = doc.createElementNS(SVG, 'g');
    g.setAttribute('class', 'planet');
    g.setAttribute('tabindex', '0');
    g.setAttribute('role', 'button');
    g.setAttribute('aria-label', label);
    const circle = doc.createElementNS(SVG, 'circle');
    circle.setAttribute('cx', '20');
    circle.setAttribute('cy', '20');
    circle.setAttribute('r', '10');
    g.append(circle);
    svg.append(g);
    host.append(svg);
    return g;
  };
  if (!planet) return { origin };
  make('Autre projet');
  return { origin, planet: make(view.title) };
}

/** Pose les fixtures, ouvre la fiche `shown` depuis le bouton d'origine, attend le repos. */
async function show(ctl, site, view, shown = view) {
  const fixtures = addFixtures(site, view);
  ctl.open(shown, fixtures.origin);
  await rest(site);
  return fixtures;
}

/** Ferme la fiche, retire les fixtures, remet la page dans l'état de départ. */
async function reset(site, mod) {
  const ctl = mod.initSheet(site.doc);
  if (ctl.isOpen()) ctl.close();
  site.motion.set(false);
  for (const el of site.doc.querySelectorAll('[data-fixture]')) el.remove();
  site.doc.activeElement?.blur();
  await rest(site);
  return ctl;
}

/** Cas qui charge le module, remet à zéro puis joue `fn(ctl, parts, mod)`. */
function check(ctx, name, site, fn) {
  return test(ctx, name, async () => {
    const { mod, error } = await loadSheet();
    if (error) return [error];
    const ctl = await reset(site, mod);
    return fn(ctl, parts(site), mod);
  });
}

const tabbables = (site) => [...parts(site).sheet.querySelectorAll(FOCUSABLE)]
  .filter(isVisible);

const key = (site, name, init = {}) => new site.win.KeyboardEvent('keydown', {
  key: name,
  bubbles: true,
  cancelable: true,
  ...init,
});

/** Valeur calculée de `prop` pour `var(name)`, mesurée sur une sonde posée dans `host`. */
function cssVar(site, host, prop, name) {
  const probe = site.doc.createElement('span');
  probe.style.setProperty(prop, `var(${name})`);
  host.append(probe);
  const value = site.win.getComputedStyle(probe).getPropertyValue(prop);
  probe.remove();
  return value;
}

const textOfHtml = (html) => normalize(
  new DOMParser().parseFromString(html, 'text/html').body.textContent,
);

/** Taille de la fenêtre de pose des éléments fixes (barre de défilement exclue). */
function viewport(site) {
  const probe = site.doc.createElement('div');
  probe.style.cssText = 'position:fixed;inset:0;visibility:hidden;pointer-events:none';
  site.doc.body.append(probe);
  const { width, height } = probe.getBoundingClientRect();
  probe.remove();
  return { width, height };
}

const near = (a, b, tolerance = TOLERANCE) => Math.abs(a - b) <= tolerance;
const ko = (problems, bad, message) => {
  if (bad) problems.push(message);
};
const focusText = (site) => describe(site.doc.activeElement);

// ---------- Contenu rendu ----------

/** Problèmes de contenu : catégorie, titre, tags, un p par texte, un li par item, liens. */
function renderedProblems(site, view) {
  const { cat, title, tags, body } = parts(site);
  const problems = [];
  const same = (label, actual, expected) => {
    if (normalize(actual) !== normalize(expected))
      problems.push(
        `${label} : « ${normalize(actual).slice(0, 60)} » au lieu de ` +
          `« ${normalize(expected).slice(0, 60)} »`,
      );
  };
  same('#sCat', cat.textContent, view.category);
  same('#sTitle', title.textContent, view.title);
  same(
    '#sTags',
    [...tags.querySelectorAll('li')].map((li) => li.textContent).join(' | '),
    view.tags.join(' | '),
  );
  const paragraphs = [...body.querySelectorAll('p')];
  const items = [...body.querySelectorAll('li')];
  for (const block of view.blocks) {
    const wanted = block.type === 'text' ? [block.html] : block.items;
    const pool = block.type === 'text' ? paragraphs : items;
    for (const html of wanted) {
      const hit = pool.find((el) => normalize(el.textContent) === textOfHtml(html));
      const tag = block.type === 'text' ? 'p' : 'li';
      ko(problems, !hit, `${tag} manquant : « ${textOfHtml(html).slice(0, 50)} »`);
    }
  }
  for (const link of view.links) {
    const anchor = [...body.querySelectorAll('a')]
      .find((a) => a.getAttribute('href') === link.href);
    if (!anchor) {
      problems.push(`lien href="${link.href}" absent de #sBody`);
      continue;
    }
    const block = anchor.closest('p, li');
    if (!block) problems.push(`lien « ${link.label} » hors d'un p ou d'un li`);
    else if (!normalize(block.textContent).includes(normalize(link.intro)))
      problems.push(`lien « ${link.label} » : intro « ${link.intro.slice(0, 40)} » absente`);
    if (normalize(anchor.textContent) !== normalize(link.label))
      problems.push(`lien href="${link.href}" : texte « ${anchor.textContent} »`);
    if (/^https:/.test(link.href) && !/\bnoopener\b/.test(anchor.getAttribute('rel') ?? ''))
      problems.push(`lien « ${link.label} » : rel sans noopener`);
  }
  return problems;
}

/** Fiche fermée : invisible, inert, voile inerte, rien de focalisable dedans. */
function closedProblems(site) {
  const { sheet, bg } = parts(site);
  const { win, doc } = site;
  const problems = [];
  const style = win.getComputedStyle(sheet);
  if (!sheet.hidden && style.visibility !== 'hidden' && style.display !== 'none')
    problems.push('#sheet fermée : ni hidden, ni visibility: hidden');
  if (!sheet.inert) problems.push('#sheet fermée : non inert');
  const veil = win.getComputedStyle(bg);
  const dead = bg.hidden || veil.display === 'none' || veil.visibility === 'hidden' ||
    veil.pointerEvents === 'none';
  if (!dead) problems.push('#sheetBg fermé : cliquable (ni hidden, ni pointer-events: none)');
  const hit = doc.elementFromPoint(win.innerWidth / 2, win.innerHeight / 2);
  ko(problems, hit === bg || sheet.contains(hit), `élément au centre : ${describe(hit)}`);
  for (const el of sheet.querySelectorAll(FOCUSABLE)) {
    el.focus();
    if (doc.activeElement === el) problems.push(`${describe(el)} focalisable fiche fermée`);
  }
  doc.activeElement?.blur();
  return problems;
}

const pageInert = (site) => [...site.doc.body.children]
  .filter((el) => el.id !== 'sheet' && el.id !== 'sheetBg');

/** Compteur d'écouteurs vivants (hors `once`) sur tous les EventTarget du cadre. */
function trackListeners(site) {
  const proto = site.win.EventTarget.prototype;
  const add = proto.addEventListener;
  const remove = proto.removeEventListener;
  const live = new Set();
  const ids = new WeakMap();
  const id = (object) => {
    if (!ids.has(object)) ids.set(object, ids.size + 1);
    return ids.get(object);
  };
  const keyOf = (target, type, fn, options) => {
    const capture = typeof options === 'boolean' ? options : Boolean(options?.capture);
    return `${id(target)}:${type}:${id(fn)}:${capture}`;
  };
  proto.addEventListener = function track(type, fn, options) {
    if (fn && !options?.once) live.add(keyOf(this, type, fn, options));
    return add.call(this, type, fn, options);
  };
  proto.removeEventListener = function untrack(type, fn, options) {
    if (fn) live.delete(keyOf(this, type, fn, options));
    return remove.call(this, type, fn, options);
  };
  return {
    count: () => live.size,
    stop() {
      proto.addEventListener = add;
      proto.removeEventListener = remove;
    },
  };
}

// ---------- Groupes de cas ----------

async function idempotenceTest(ctx, site) {
  const name = 'initSheet idempotent : même contrôleur, aucun écouteur de plus';
  await test(ctx, name, async () => {
    const { mod, error } = await loadSheet();
    if (error) return [error];
    const tracker = trackListeners(site);
    try {
      const first = mod.initSheet(site.doc);
      const after = tracker.count();
      const second = mod.initSheet(site.doc);
      const problems = [];
      ko(problems, first !== second, 'deux appels sur le même document : deux contrôleurs');
      const added = tracker.count() - after;
      ko(problems, added, `le second appel ajoute ${added} écouteur(s)`);
      for (const method of ['open', 'update', 'close', 'isOpen'])
        ko(problems, typeof first[method] !== 'function', `contrôleur sans ${method}()`);
      ko(problems, first.isOpen?.(), 'isOpen() vrai avant toute ouverture');
      return problems;
    } finally {
      tracker.stop();
    }
  });
}

async function stateTests(ctx, site, view) {
  await check(ctx, 'fermée : invisible, inert, voile non cliquable, rien de focalisable', site,
    (ctl) => {
      const problems = closedProblems(site);
      ctl.open(view, site.doc.body);
      ctl.close();
      return rest(site).then(() => [
        ...problems,
        ...closedProblems(site).map((p) => `après ouverture puis fermeture : ${p}`),
      ]);
    });
  await check(ctx, 'ouverte : dialog, aria-modal, aria-labelledby, contenu de la fiche', site,
    async (ctl, p) => {
      await show(ctl, site, view);
      const problems = [];
      if (!ctl.isOpen()) problems.push('isOpen() faux après open()');
      if (!isVisible(p.sheet)) problems.push('#sheet non visible après open()');
      if (p.sheet.inert) problems.push('#sheet inert après open()');
      if (p.sheet.getAttribute('role') !== 'dialog') problems.push('role différent de dialog');
      const modal = p.sheet.getAttribute('aria-modal');
      ko(problems, modal !== 'true', `aria-modal vaut ${modal}`);
      const label = site.doc.getElementById(p.sheet.getAttribute('aria-labelledby') ?? '');
      if (!label) problems.push('aria-labelledby ne pointe aucun élément');
      else ko(problems, !normalize(label.textContent), 'titre de aria-labelledby vide');
      return [...problems, ...renderedProblems(site, view)];
    });
  await check(ctx, 'bloc au balisage non permis : rendu en texte (setRich)', site,
    async (ctl, p) => {
      await show(ctl, site, view, { ...view, blocks: [HOSTILE_BLOCK] });
      const problems = [];
      ko(problems, p.body.querySelector('img, script'), '<img> ou <script> rendu dans #sBody');
      ko(problems, site.win.__pwned, 'un gestionnaire du bloc s\'est exécuté');
      return problems;
    });
}

async function focusTests(ctx, site, view) {
  await check(ctx, 'focus au bouton fermer à l\'ouverture', site, async (ctl, p) => {
    const { origin } = addFixtures(site, view);
    origin.focus();
    ctl.open(view, origin);
    await rest(site);
    return site.doc.activeElement === p.close ? [] : [`focus sur ${focusText(site)}`];
  });
  await check(ctx, 'Tab et Maj+Tab bouclent entre premier et dernier focalisable', site,
    async (ctl) => {
      await show(ctl, site, view);
      const list = tabbables(site);
      if (list.length < 2) return [`${list.length} focalisable(s) dans la fiche, 2 attendus`];
      const [first, last] = [list[0], list.at(-1)];
      const problems = [];
      last.focus();
      last.dispatchEvent(key(site, 'Tab'));
      if (site.doc.activeElement !== first)
        problems.push(`Tab sur le dernier : focus sur ${focusText(site)}`);
      first.focus();
      first.dispatchEvent(key(site, 'Tab', { shiftKey: true }));
      if (site.doc.activeElement !== last)
        problems.push(`Maj+Tab sur le premier : focus sur ${focusText(site)}`);
      return problems;
    });
  await check(ctx, 'reste de la page inert pendant l\'ouverture, plus après', site,
    async (ctl) => {
      await show(ctl, site, view);
      const problems = pageInert(site).filter((el) => !el.inert)
        .map((el) => `${describe(el)} non inert fiche ouverte`);
      ctl.close();
      await rest(site);
      return [
        ...problems,
        ...pageInert(site).filter((el) => el.inert)
          .map((el) => `${describe(el)} encore inert fiche fermée`),
      ];
    });
}

/** Ferme par `how`, rend le focus attendu ou un problème. */
async function closeBy(site, how) {
  const p = parts(site);
  if (how === 'bouton') click(site, p.close);
  else if (how === 'voile') click(site, p.bg);
  else site.doc.dispatchEvent(key(site, 'Escape'));
  await rest(site);
}

async function closeTests(ctx, site, view) {
  for (const how of ['bouton', 'voile', 'Échap']) {
    await check(ctx, `fermeture par ${how} : fiche fermée, focus rendu à l'origine`, site,
      async (ctl) => {
        const { origin } = addFixtures(site, view);
        origin.focus();
        ctl.open(view, origin);
        await rest(site);
        await closeBy(site, how);
        const problems = [];
        ko(problems, ctl.isOpen(), 'isOpen() vrai après la fermeture');
        ko(problems, site.doc.activeElement !== origin, `focus sur ${focusText(site)}`);
        return [...problems, ...closedProblems(site)];
      });
  }
  const fallbacks = [
    ['origine détachée', (o) => o.remove(), true],
    ['origine masquée', (o) => { o.style.display = 'none'; }, true],
    ['origine détachée et aucune planète', (o) => o.remove(), false],
  ];
  for (const [name, spoil, planet] of fallbacks)
    await check(ctx, `${name} : focus sur ${planet ? 'la planète' : 'le h2'}`, site,
      async (ctl) => {
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
      });
}

async function updateTest(ctx, site, views) {
  await check(ctx, 'update(view) en anglais : textes remplacés, focus et défilement gardés',
    site, async (ctl, p) => {
      await switchTo(site, 'en');
      try {
        const { origin } = addFixtures(site, views.fr);
        ctl.open(views.fr, origin);
        await rest(site);
        const link = tabbables(site).find((el) => el.localName === 'a');
        if (!link) return ['aucun lien focalisable dans la fiche'];
        link.focus();
        p.sheet.scrollTop = 80;
        const scrolled = p.sheet.scrollTop;
        ctl.update(views.en);
        await rest(site);
        const problems = [...renderedProblems(site, views.en)];
        if (scrolled <= 0) problems.push('la fiche ne défile pas (texte le plus long)');
        if (!near(p.sheet.scrollTop, scrolled, 1))
          problems.push(`scrollTop ${p.sheet.scrollTop} au lieu de ${scrolled}`);
        if (site.doc.activeElement !== link) problems.push(`focus sur ${focusText(site)}`);
        if (!ctl.isOpen()) problems.push('isOpen() faux après update()');
        return [...problems, ...await noForeignText(site, 'en')];
      } finally {
        await switchTo(site, 'fr');
      }
    });
}

// ---------- Mise en page ----------

async function layoutTests(ctx, site, views) {
  const view = views.fr;
  await check(ctx, 'géométrie : feuille du bas jusqu\'à 880 px, panneau à droite au-delà',
    site, async (ctl, p) => {
      await show(ctl, site, view);
      const { win } = site;
      const style = win.getComputedStyle(p.sheet);
      const rect = p.sheet.getBoundingClientRect();
      const { width: vw, height: vh } = viewport(site);
      const problems = [];
      const expect = (label, actual, wanted) => {
        if (!near(actual, wanted))
          problems.push(`${label} ${actual.toFixed(1)} au lieu de ${wanted.toFixed(1)}`);
      };
      if (style.position !== 'fixed') problems.push(`position ${style.position}`);
      if (win.innerWidth <= PHONE_MAX) {
        expect('feuille : largeur', rect.width, vw);
        expect('feuille : hauteur', rect.height, SHEET_RATIO * vh);
        expect('feuille : bas', rect.bottom, vh);
        expect('feuille : gauche', rect.left, 0);
      } else {
        expect('panneau : largeur', rect.width, Math.min(PANEL_MAX, vw));
        expect('panneau : droite', rect.right, vw);
        expect('panneau : haut', rect.top, 0);
        expect('panneau : bas', rect.bottom, vh);
      }
      for (const side of ['Top', 'Right', 'Bottom', 'Left'])
        expect(`remplissage ${side}`, parseFloat(style[`padding${side}`]), 32);
      const panel = cssVar(site, p.sheet, 'background-color', '--panel');
      if (style.backgroundColor !== panel) problems.push(`fond ${style.backgroundColor}`);
      return problems;
    });
  await check(ctx, 'voile : plein écran, z-index 20, couleur --scrim, ouvert', site,
    async (ctl, p) => {
      await show(ctl, site, view);
      const { win } = site;
      const style = win.getComputedStyle(p.bg);
      const rect = p.bg.getBoundingClientRect();
      const problems = [];
      if (!isVisible(p.bg)) return ['#sheetBg non visible fiche ouverte'];
      if (style.position !== 'fixed') problems.push(`position ${style.position}`);
      if (style.zIndex !== '20') problems.push(`z-index ${style.zIndex} au lieu de 20`);
      const scrim = cssVar(site, p.bg, 'background-color', '--scrim');
      if (style.backgroundColor !== scrim) problems.push(`fond ${style.backgroundColor}`);
      const screen = viewport(site);
      if (rect.width < screen.width - 1 || rect.height < screen.height - 1)
        problems.push(`taille ${rect.width} × ${rect.height}, fenêtre ${screen.width}`);
      return problems;
    });
  await contentStyleTest(ctx, site, view);
  for (const lang of ['fr', 'en'])
    await check({ ...ctx, lang }, 'aucune zone coupée horizontalement (texte le plus long)',
      site, async (ctl, p) => {
        const own = views[lang];
        const long = own.links.map((l) => ({ ...l, label: l.href }));
        await show(ctl, site, own, { ...own, links: long });
        const box = p.sheet.getBoundingClientRect();
        const problems = [];
        if (p.sheet.scrollWidth > p.sheet.clientWidth + 1)
          problems.push(`scrollWidth ${p.sheet.scrollWidth} > ${p.sheet.clientWidth}`);
        for (const el of p.sheet.querySelectorAll('*')) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && (r.right > box.right + 1 || r.left < box.left - 1))
            problems.push(`${describe(el)} : ${r.left.toFixed(0)} à ${r.right.toFixed(0)} px`);
        }
        return problems.slice(0, 8);
      });
  await check(ctx, 'bouton fermer 44 × 44 px en haut à droite, cibles de 44 px', site,
    async (ctl, p) => {
      await show(ctl, site, view);
      const r = p.close.getBoundingClientRect();
      const box = p.sheet.getBoundingClientRect();
      const problems = [];
      if (r.width + 0.5 < MIN_TARGET || r.height + 0.5 < MIN_TARGET)
        problems.push(`#close ${r.width.toFixed(1)} × ${r.height.toFixed(1)} px`);
      if (box.right - r.right > 48 || r.top - box.top > 48)
        problems.push(`#close à ${(box.right - r.right).toFixed(0)} px de la droite`);
      const found = targetProblems(site, [p.sheet]);
      recordExceptions(ctx, found.exceptions);
      return [...problems, ...found.problems];
    });
}

async function contentStyleTest(ctx, site, view) {
  await check(ctx, 'texte : .cat, h3, tags, liens dans p/li et .body, <strong> en --text 600',
    site, async (ctl, p) => {
      await show(ctl, site, view, { ...view, blocks: [...view.blocks, EXTRA_BLOCK] });
      const style = (el) => site.win.getComputedStyle(el);
      const rem = parseFloat(style(site.doc.documentElement).fontSize);
      const problems = [];
      const want = (label, actual, wanted) => {
        if (actual !== wanted) problems.push(`${label} ${actual} au lieu de ${wanted}`);
      };
      if (p.title.localName !== 'h3') problems.push(`titre : <${p.title.localName}>`);
      want('.cat : couleur', style(p.cat).color, cssVar(site, p.sheet, 'color', '--accent'));
      if (!near(parseFloat(style(p.cat).fontSize), 0.85 * rem, 0.3))
        problems.push(`.cat : taille ${style(p.cat).fontSize}`);
      const tag = p.tags.querySelector('li');
      if (!tag) problems.push('aucun tag rendu');
      else {
        if (!near(parseFloat(style(tag).fontSize), 0.8 * rem, 0.3))
          problems.push(`tag : taille ${style(tag).fontSize}`);
        want('tag : bordure', style(tag).borderTopWidth, '1px');
        const pad = `${style(tag).paddingTop} ${style(tag).paddingLeft}`;
        want('tag : remplissage', pad, '3px 8px');
      }
      const strong = p.body.querySelector('strong');
      if (!strong) problems.push('<strong> du bloc absent');
      else {
        const text = cssVar(site, p.sheet, 'color', '--text');
        want('strong : couleur', style(strong).color, text);
        want('strong : graisse', style(strong).fontWeight, '600');
      }
      const accent = cssVar(site, p.sheet, 'color', '--accent');
      for (const a of p.body.querySelectorAll('a')) {
        if (!a.closest('p, li')) problems.push(`${describe(a)} hors d'un p ou d'un li`);
        if (!a.closest('.body')) problems.push(`${describe(a)} hors de .body`);
        want('lien : couleur', style(a).color, accent);
        if (style(a).textDecorationLine !== 'none')
          problems.push(`lien souligné (${style(a).textDecorationLine})`);
      }
      return problems;
    });
}

// ---------- Mouvement réduit et répétition ----------

async function motionTests(ctx, site, view) {
  await check(ctx, 'mouvement réduit : ouverture et fermeture sans transition longue', site,
    async (ctl, p) => {
      site.motion.set(true);
      const { origin } = addFixtures(site, view);
      ctl.open(view, origin);
      await sleep(IMMEDIATE_MS);
      const early = p.sheet.getBoundingClientRect();
      const slow = p.sheet.getAnimations()
        .filter((a) => a.effect?.getComputedTiming().duration > IMMEDIATE_MS);
      await rest(site);
      const final = p.sheet.getBoundingClientRect();
      const problems = [];
      if (!near(early.left, final.left, 1) || !near(early.top, final.top, 1))
        problems.push(
          `ouverture : à ${IMMEDIATE_MS} ms la fiche est en (${early.left.toFixed(0)}, ` +
            `${early.top.toFixed(0)}), au repos en (${final.left.toFixed(0)}, ` +
            `${final.top.toFixed(0)})`,
        );
      ko(problems, slow.length, `${slow.length} animation(s) de plus de ${IMMEDIATE_MS} ms`);
      ctl.close();
      await sleep(IMMEDIATE_MS);
      if (isVisible(p.sheet)) problems.push(`fermeture : encore visible à ${IMMEDIATE_MS} ms`);
      return problems;
    });
  const again = 'deux ouvertures puis une fermeture : ni écouteur de plus ni inert résiduel';
  await check(ctx, again, site, async (ctl) => {
    const { origin } = addFixtures(site, view);
    const cycle = async (opens) => {
      for (let i = 0; i < opens; i++) ctl.open(view, origin);
      await rest(site);
      ctl.close();
      await rest(site);
    };
    const tracker = trackListeners(site);
    try {
      await cycle(1);
      const single = tracker.count();
      await cycle(2);
      const problems = [];
      if (tracker.count() !== single)
        problems.push(`écouteurs vivants : ${single} après 1 ouverture, ${tracker.count()}`);
      if (ctl.isOpen()) problems.push('isOpen() vrai après la fermeture');
      for (const el of pageInert(site).filter((e) => e.inert))
        problems.push(`${describe(el)} encore inert`);
      return problems;
    } finally {
      tracker.stop();
    }
  });
}

// ---------- Lancement ----------

/** Groupe « Fiche » : cas communs à `mainWidth`, cas de mise en page à chaque largeur. */
export async function runSheet(widths, mainWidth) {
  const views = await sheetViews();
  const ctx = { group: GROUP, section: 'projects' };
  const control = await openSheetSite(mainWidth);
  try {
    const mainCtx = { ...ctx, width: mainWidth, lang: 'fr' };
    await idempotenceTest(mainCtx, control);
    await motionTests(mainCtx, control, views.fr);
  } finally {
    control.close();
  }
  for (const width of widths) {
    const site = await openSheetSite(width);
    try {
      const wide = { ...ctx, width, lang: 'fr' };
      await stateTests(wide, site, views.fr);
      await focusTests(wide, site, views.fr);
      await closeTests(wide, site, views.fr);
      await updateTest(wide, site, views);
      await layoutTests(wide, site, views);
    } finally {
      site.close();
    }
  }
}
