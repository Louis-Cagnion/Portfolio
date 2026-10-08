// Harnais de la suite navigateur : site chargé en iframe, faux fetch, faux stockage, attentes
// bornées. Aucune attente infinie : chaque attente a un délai maximal et un libellé d'échec.

export const ROOT = new URL('../../', import.meta.url).href;
export const SECTIONS = ['home', 'journey', 'skills', 'projects', 'contact'];
// Jusqu'à cette largeur : écran tactile, barre de défilement flottante.
const OVERLAY_SCROLLBAR_MAX = 1024;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Message lisible d'une erreur quelconque. */
export function errorText(error) {
  if (error instanceof Error || (error && typeof error.message === 'string')) {
    return `${error.name || 'Error'} : ${error.message}`;
  }
  return String(error);
}

/**
 * Attend que `probe()` rende une valeur vraie, sondée toutes les 25 ms, au plus `ms`.
 * En cas de dépassement, l'erreur cite `label` et l'état décrit par `state()`.
 */
export async function waitFor(probe, ms, label, state) {
  const end = performance.now() + ms;
  let lastError = null;
  for (;;) {
    try {
      const value = probe();
      if (value) return value;
      lastError = null;
    } catch (error) {
      lastError = error;
    }
    if (performance.now() >= end) break;
    await sleep(25);
  }
  let detail = '';
  try {
    detail = state ? ` (état : ${state()})` : '';
  } catch (error) {
    detail = ` (état illisible : ${errorText(error)})`;
  }
  const cause = lastError ? ` ; dernière erreur : ${errorText(lastError)}` : '';
  throw new Error(`${label} : délai de ${ms} ms dépassé${detail}${cause}`);
}

/** Rejette si `promise` ne se résout pas en `ms` (garde-fou d'un scénario entier). */
export function bounded(promise, ms, label) {
  let timer;
  const limit = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} : délai de ${ms} ms dépassé`)), ms);
  });
  return Promise.race([promise, limit]).finally(() => clearTimeout(timer));
}

// ---------- Ressources lues une fois ----------
const cache = new Map();
function once(key, load) {
  if (!cache.has(key)) cache.set(key, load());
  return cache.get(key);
}

/** Texte d'un fichier du dépôt (chemin relatif à la racine), sans cache HTTP. */
export function readText(path) {
  return once(`text:${path}`, async () => {
    const response = await fetch(new URL(path, ROOT), { cache: 'no-store' });
    if (!response.ok) throw new Error(`${path} : HTTP ${response.status}`);
    return response.text();
  });
}

/** JSON d'un fichier du dépôt ; erreur nommant le fichier si le JSON est invalide. */
export async function readJson(path) {
  const text = await readText(path);
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${path} : JSON invalide (${error.message})`);
  }
}

/** index.html préparé pour le banc : `data-noboot` sur <html>, <base> vers la racine. */
async function testHtml(width) {
  const html = await readText('index.html');
  if (!/<html[\s>]/i.test(html)) throw new Error('index.html : balise <html> introuvable');
  if (!/<head[\s>]/i.test(html)) throw new Error('index.html : balise <head> introuvable');
  // Téléphones et tablettes : barre de défilement flottante, comme sur l'appareil réel.
  const overlay = width <= OVERLAY_SCROLLBAR_MAX
    ? '<style>html{scrollbar-width:none}</style>' : '';
  return html
    .replace(/<html(?=[\s>])/i, '<html data-noboot')
    .replace(/<head(\s[^>]*)?>/i, (tag) => `${tag}<base href="${ROOT}">${overlay}`);
}

// ---------- Faux stockage et faux fetch ----------

/** Stockage en mémoire (API de localStorage) ; `writes` garde l'historique des écritures. */
export function makeStorage(initial = {}) {
  const map = new Map(Object.entries(initial).map(([k, v]) => [k, String(v)]));
  return {
    writes: [],
    getItem: (key) => (map.has(String(key)) ? map.get(String(key)) : null),
    setItem(key, value) {
      this.writes.push([String(key), String(value)]);
      map.set(String(key), String(value));
    },
    removeItem: (key) => { map.delete(String(key)); },
    clear: () => map.clear(),
    key: (index) => [...map.keys()][index] ?? null,
    get length() { return map.size; },
  };
}

/** Stockage indisponible (navigation privée stricte) : chaque appel lève. */
export function throwingStorage() {
  const fail = () => { throw new DOMException('Stockage refusé', 'SecurityError'); };
  return { getItem: fail, setItem: fail, removeItem: fail, clear: fail, key: fail,
    get length() { return fail(); } };
}

/** Langue demandée par une URL de données (`.../fr.json`), ou null. */
export function langOfUrl(url) {
  const match = /(?:^|[/\\])(fr|en)\.json(?:[?#]|$)/.exec(url);
  return match ? match[1] : null;
}

/**
 * Faux fetch. `respond({ lang, url, init, site, call })` rend une Response (ou la promesse
 * d'une Response, ou lève). Les appels sont gardés dans `fn.calls`.
 */
export function makeFetch(respond) {
  const calls = [];
  const fn = (input, init = {}) => {
    const url = typeof input === 'string' ? input : String(input?.url ?? input);
    const call = { url, lang: langOfUrl(url), signal: init.signal };
    calls.push(call);
    return Promise.resolve().then(() => respond({ ...call, init, site: fn.site, call }));
  };
  fn.calls = calls;
  return fn;
}

/** Réponse construite dans le domaine JavaScript de l'iframe (comme une vraie réponse). */
export function response(site, body, status = 200) {
  const Ctor = site?.win?.Response || Response;
  return new Ctor(body, { status, headers: { 'Content-Type': 'application/json' } });
}

/** Faux fetch qui sert les vrais data/fr.json et data/en.json (404 pour toute autre URL). */
export function realDataFetch({ delays = {} } = {}) {
  return makeFetch(async ({ lang, site }) => {
    if (!lang) return response(site, 'introuvable', 404);
    if (delays[lang]) await sleep(delays[lang]);
    return response(site, await readText(`data/${lang}.json`));
  });
}

/** Faux fetch qui ne répond jamais mais respecte `signal`, comme le vrai. */
export function hangingResponse({ init, site }) {
  return new Promise((resolve, reject) => {
    init.signal?.addEventListener('abort', () => {
      const Ctor = site?.win?.DOMException || DOMException;
      reject(new Ctor('The operation was aborted.', 'AbortError'));
    });
  });
}

// ---------- Site en iframe ----------
const stage = () => document.getElementById('stage') || document.body;

/**
 * Charge le site dans une iframe de `width` × `height` px puis, si `boot` est vrai, importe
 * js/main.js dans l'iframe et appelle boot({ fetch, storage[, timeoutMs] }).
 * `hash` (sans #) est posé avant l'amorçage, sans nouvelle entrée d'historique.
 */
export async function openSite(options) {
  const { width, height = 800, storage = makeStorage(), fetch: fakeFetch = realDataFetch(),
    timeoutMs, hash, boot = true } = options;
  const site = { width, storage, fetch: fakeFetch, uncaught: [], bootError: null };
  fakeFetch.site = site;
  const frame = document.createElement('iframe');
  frame.title = `site à ${width} px`;
  frame.style.cssText = `width:${width}px;height:${height}px;border:1px solid #567;`;
  frame.srcdoc = await testHtml(width);
  site.frame = frame;
  site.close = () => frame.remove();
  stage().append(frame);
  try {
    await waitFor(() => frame.contentWindow?.location.href === 'about:srcdoc' &&
      frame.contentDocument?.readyState === 'complete', 15000, 'chargement de l\'iframe',
    () => frame.contentDocument?.readyState);
    site.win = frame.contentWindow;
    site.doc = frame.contentDocument;
    site.win.addEventListener('error', (event) => {
      site.uncaught.push(errorText(event.error || event.message));
    });
    site.win.addEventListener('unhandledrejection', (event) => {
      site.uncaught.push(`promesse rejetée sans traitement : ${errorText(event.reason)}`);
    });
    shimHistory(site.win);
    if (hash) site.win.history.replaceState(null, '', `#${hash}`);
    if (boot) await bootSite(site, { fetch: fakeFetch, storage, timeoutMs });
  } catch (error) {
    frame.remove();
    throw error;
  }
  return site;
}

/**
 * Artefact du banc : le <base> ferait résoudre `pushState(…, '#skills')` vers la vraie page,
 * hors de l'origine about:srcdoc (SecurityError). Une URL relative est donc résolue contre le
 * document, comme sur le vrai site d'une seule page : seul son fragment compte.
 */
function shimHistory(win) {
  const resolve = (url) => {
    const text = String(url);
    try {
      return new win.URL(text).href; // déjà absolue
    } catch {
      const page = win.location.href.split('#')[0];
      const at = text.indexOf('#');
      return at >= 0 ? page + text.slice(at) : page;
    }
  };
  for (const name of ['pushState', 'replaceState']) {
    const original = win.history[name].bind(win.history);
    win.history[name] = (...args) => (args.length >= 3 && args[2] != null
      ? original(args[0], args[1], resolve(args[2])) : original(...args));
  }
}

async function bootSite(site, env) {
  const { win, doc } = site;
  const mainUrl = new URL('js/main.js', ROOT).href;
  const script = doc.createElement('script');
  script.type = 'module';
  script.textContent = `import(${JSON.stringify(mainUrl)}).then(
    (m) => { window.__suiteMain = m; }, (e) => { window.__suiteMainError = e; });`;
  doc.head.append(script);
  await waitFor(() => win.__suiteMain || win.__suiteMainError, 10000, 'import de js/main.js');
  if (win.__suiteMainError) {
    throw new Error(`import de js/main.js impossible : ${errorText(win.__suiteMainError)}`);
  }
  if (typeof win.__suiteMain.boot !== 'function') {
    throw new Error('js/main.js n\'exporte pas de fonction boot');
  }
  if (env.timeoutMs === undefined) delete env.timeoutMs;
  let result;
  try {
    result = win.__suiteMain.boot(env);
  } catch (error) {
    throw new Error(`boot() a levé : ${errorText(error)}`);
  }
  if (result && typeof result.then === 'function') {
    result.then(null, (error) => { site.bootError = error; });
  }
}

// ---------- Lecture de l'état du site ----------

/** Visibilité réelle (display, visibility, opacité nulle comprises). */
export function isVisible(el) {
  if (!el || !el.isConnected) return false;
  if (typeof el.checkVisibility === 'function') {
    if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

export const statusState = (site) => {
  const status = site.doc.getElementById('status');
  if (!status) return '#status absent';
  return `data-state="${status.dataset.state}", texte « ${status.textContent.trim()} »`;
};

/** Attend `data-state` voulu sur #status. */
export function waitStatus(site, state, ms = 10000) {
  return waitFor(() => site.doc.getElementById('status')?.dataset.state === state, ms,
    `#status[data-state="${state}"]`, () => statusState(site) +
      (site.bootError ? ` ; boot a rejeté : ${errorText(site.bootError)}` : ''));
}

export const activeViews = (site) => [...site.doc.querySelectorAll('.view.on')];
const viewState = (site) => {
  const href = site.win.location.href;
  if (!href.startsWith('about:srcdoc')) return `l'iframe a quitté le site testé pour ${href}`;
  return `vues actives [${activeViews(site).map((v) => `#${v.id}`)}], ` +
    `hash "${site.win.location.hash}"`;
};

const nextFrame = (win) => bounded(
  new Promise((resolve) => win.requestAnimationFrame(resolve)), 500, 'requestAnimationFrame',
).catch(() => {});

/**
 * Attend la fin de la transition vers `id` : une seule `.view.on`, la bonne, hash `#id`
 * (si `checkHash`), animations CSS finies (au plus 3 s), polices prêtes, deux images peintes.
 */
export async function settle(site, id, { checkHash = true, ms = 6000 } = {}) {
  await waitFor(() => {
    const views = activeViews(site);
    return views.length === 1 && views[0].id === id &&
      (!checkHash || site.win.location.hash === `#${id}`);
  }, ms, `transition vers #${id}`, () => viewState(site));
  await waitFor(() => !site.doc.getAnimations().some((a) => a.playState === 'running' &&
    a.effect?.getComputedTiming().endTime !== Infinity), 3000, 'animations').catch(() => {});
  await bounded(site.doc.fonts.ready, 5000, 'polices').catch(() => {});
  await nextFrame(site.win);
  await nextFrame(site.win);
}

/** Barres de rubriques réellement affichées : pilule (`nav.nav`), onglets (`nav.tabbar`). */
export function shownNavs(site) {
  const shown = [];
  const pill = site.doc.querySelector('header.bar nav.nav');
  const tabs = site.doc.querySelector('nav.tabbar');
  if (isVisible(pill)) {
    shown.push({ kind: 'pilule', selector: 'header.bar nav.nav', el: pill });
  }
  if (isVisible(tabs)) shown.push({ kind: 'onglets', selector: 'nav.tabbar', el: tabs });
  return shown;
}

/**
 * Clic synthétique sur `el`. Le <base> du banc ferait sortir un lien `href="#x"` non
 * intercepté vers la vraie page : un dernier écouteur rejoue alors la navigation par fragment
 * qu'aurait faite le navigateur sans <base>. Tout autre lien est bloqué et signalé.
 */
export function click(site, el) {
  const { win } = site;
  const shim = (event) => {
    if (event.defaultPrevented) return;
    const link = event.target.closest?.('a[href]');
    if (!link) return;
    event.preventDefault();
    const href = link.getAttribute('href');
    if (href.startsWith('#')) win.location.hash = href;
    else site.blockedLinks = [...(site.blockedLinks || []), href];
  };
  win.addEventListener('click', shim);
  try {
    if (typeof el.click === 'function') el.click();
    else el.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }));
  } finally {
    win.removeEventListener('click', shim);
  }
}

/** Va sur la rubrique `id` par le `[data-go]` de la barre affichée, puis attend la fin. */
export async function goTo(site, id) {
  const navs = shownNavs(site);
  if (navs.length !== 1) {
    throw new Error(`barre de rubriques : ${navs.length} affichée(s) au lieu d'une`);
  }
  const target = navs[0].el.querySelector(`[data-go="${id}"]`);
  if (!target) throw new Error(`${navs[0].selector} [data-go="${id}"] absent`);
  if (activeViews(site).length === 1 && activeViews(site)[0].id === id) return;
  click(site, target);
  await settle(site, id);
}

/** Description courte d'un élément : chemin jusqu'à l'ancêtre identifié le plus proche. */
export function describe(el) {
  const parts = [];
  let node = el;
  while (node && node.nodeType === 1 && parts.length < 4) {
    let part = node.localName;
    if (node.id) {
      parts.unshift(`${part}#${node.id}`);
      break;
    }
    const classes = [...node.classList].slice(0, 2);
    if (classes.length) part += `.${classes.join('.')}`;
    const parent = node.parentElement;
    const same = parent ? [...parent.children].filter((c) => c.localName === node.localName)
      : [];
    if (same.length > 1) part += `:nth-of-type(${same.indexOf(node) + 1})`;
    parts.unshift(part);
    node = parent;
  }
  const label = (el.getAttribute?.('aria-label') || el.textContent || '').trim();
  const short = label.replace(/\s+/g, ' ').slice(0, 30);
  return parts.join(' > ') + (short ? ` « ${short} »` : '');
}
