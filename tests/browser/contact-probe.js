/* Contact (S9) : ouverture, bouchons du presse-papiers et du mouvement, sondes du DOM
   et attentes des annonces, importés par contact.js. */
import {
  click,
  goTo,
  makeStorage,
  openSite,
  settle,
  waitFor,
  waitStatus,
} from './harness.js';
import { languageTexts } from './language.js';
import { expectEqual, test } from './runner.js';
import { stubMotion } from './warp.js';

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const uncaught = (site) => site.uncaught.map((e) => `exception non rattrapée : ${e}`);
export const textOf = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

// ---------- Ouverture et bouchons ----------

/** Bouchon de navigator.clipboard : `mode` ok | reject | throw | absent, modifiable. */
function stubClipboard(site, clip) {
  const { win } = site;
  const writeText = (text) => {
    clip.calls.push(text);
    if (clip.mode === 'throw') throw new win.Error('refus synchrone');
    if (clip.mode === 'reject') return win.Promise.reject(new win.Error('refus'));
    return win.Promise.resolve();
  };
  Object.defineProperty(win.navigator, 'clipboard', {
    configurable: true,
    get: () => (clip.mode === 'absent' ? undefined : { writeText }),
  });
}

/** Ouvre la rubrique Contact : `site.clip` {calls, mode}, mouvement réduit selon `reduce`. */
export async function openContact(width, { lang = 'fr', reduce = true, mode = 'ok' } = {}) {
  const clip = { calls: [], mode };
  const motion = { reduce };
  const site = await openSite({
    width,
    storage: makeStorage(lang === 'en' ? { lang } : {}),
    prepare: (opened) => {
      stubMotion(opened, motion);
      stubClipboard(opened, clip);
    },
  });
  site.clip = clip;
  site.motion = motion;
  try {
    await waitStatus(site, 'ready');
    await settle(site, 'home');
    await goTo(site, 'contact');
  } catch (error) {
    site.close();
    throw error;
  }
  return site;
}

export async function contactData(lang) {
  const { data } = await languageTexts();
  return data[lang].contact;
}
export const mailOf = (c) => c.channels[0].href.replace('mailto:', '');
export const grooveText = (c, k) => {
  return c.groove.replace('{n}', k + 1).replace('{name}', c.channels[k].name);
};
export const failedText = (c) => c.copyFailed.replace('{mail}', mailOf(c));

/** Liste de problèmes et sa fonction de comparaison nommée. */
export function collect() {
  const problems = [];
  const eq = (label, actual, expected) => expectEqual(problems, label, actual, expected);
  return [problems, eq];
}

/** Éléments de la rubrique (null si absents). */
export function parts(site) {
  const view = site.doc.getElementById('contact');
  const q = (selector) => view?.querySelector(selector) ?? null;
  const all = (selector) => [...(view?.querySelectorAll(selector) ?? [])];
  const names = all('svg.disc .arc-name');
  return {
    view,
    h2: q('h2'),
    wrap: q('.record-wrap'),
    disc: q('svg.disc'),
    msg: q('.msg'),
    status: q('.rec-status'),
    hint: q('.rec-hint'),
    links: all('svg.disc a.rec-hit'),
    core: q('svg.disc [role="button"]'),
    tracks: all('svg.disc .groove-track'),
    names,
    coreText: names.at(-1)?.querySelector('textPath') ?? null,
  };
}

/** Problèmes si la structure attendue du module n'est pas là (tout test commence par là). */
function missing(site) {
  const p = parts(site);
  const required = {
    '.record-wrap': p.wrap,
    'svg.disc': p.disc,
    '.msg': p.msg,
    'p.rec-status': p.status,
    'button.rec-hint': p.hint,
    '4 svg.disc a.rec-hit': p.links.length === 4,
    'svg.disc [role="button"] (cœur)': p.core,
    '4 .groove-track': p.tracks.length === 4,
    '5 .arc-name': p.names.length === 5,
  };
  return Object.entries(required)
    .filter(([, found]) => !found)
    .map(([label]) => `#contact : ${label} absent (js/sections/contact.js non monté ?)`);
}

/** Cas qui joue `fn(parts)` si la structure est là, sinon échoue sur la structure. */
export function check(ctx, name, site, fn) {
  return test(ctx, name, async () => {
    const absent = missing(site);
    if (absent.length) return absent;
    return [...(await fn(parts(site))), ...uncaught(site)];
  });
}

/** Clic dont on lit defaultPrevented, puis annulé : aucun lien ne quitte le banc. */
export function probeClick(site, el) {
  let prevented = null;
  const seal = (event) => {
    prevented = event.defaultPrevented;
    event.preventDefault();
  };
  site.win.addEventListener('click', seal);
  try {
    el.dispatchEvent(new site.win.MouseEvent('click', { bubbles: true, cancelable: true }));
  } finally {
    site.win.removeEventListener('click', seal);
  }
  return prevented;
}

export const press = (site, el, key) => {
  const init = { key, bubbles: true, cancelable: true };
  const event = new site.win.KeyboardEvent('keydown', init);
  el.dispatchEvent(event);
  return event;
};

/**
 * Focus clavier. Le document du banc n'a pas toujours le focus de la fenêtre (Chrome
 * headless) : Chrome n'émet alors ni focus ni blur. Les événements sont alors rejoués à la
 * main, après le vrai el.focus() (document.activeElement reste celui du navigateur).
 */
const fire = (site, el, type) => el.dispatchEvent(new site.win.FocusEvent(type));
export function focusOn(site, el) {
  const before = site.doc.activeElement;
  site.frame.focus();
  site.win.focus();
  el.focus();
  if (site.doc.hasFocus()) return;
  if (before && before !== el && before !== site.doc.body) fire(site, before, 'blur');
  fire(site, el, 'focus');
}
export function blurOn(site, el) {
  el.blur();
  if (!site.doc.hasFocus()) fire(site, el, 'blur');
}

export const escape = (site) => press(site, site.doc, 'Escape');
export const copy = (site, p) => click(site, p.core);
export const viewBoxOf = (disc) => (
  disc.getAttribute('viewBox').trim().split(/\s+/).map(Number)
);
export const sameBox = (a, b) => (
  a.length === b.length && a.every((n, i) => Math.abs(n - b[i]) < 0.6)
);
export const boxProblems = (label, disc, expected) => {
  if (sameBox(viewBoxOf(disc), expected)) return [];
  const actual = disc.getAttribute('viewBox');
  return [`${label} : viewBox "${actual}" au lieu de "${expected.join(' ')}"`];
};
export const classesOf = (disc) => disc.className.baseVal;

/** Élément atteint au pointeur au point (x, y) du repère du disque. */
export function hitAt(site, p, x, y) {
  p.disc.scrollIntoView({ block: 'center', behavior: 'instant' });
  const point = p.disc.createSVGPoint();
  point.x = x;
  point.y = y;
  const at = point.matrixTransform(p.disc.getScreenCTM());
  return site.doc.elementFromPoint(at.x, at.y);
}
export const reaches = (el, target) => Boolean(el && (el === target || target.contains(el)));

/** Attend que `probe()` soit vrai (4 s) ; l'échec cite l'annonce et la gravure du cœur. */
export const waitAnnounce = (site, label, probe) => {
  const state = () => {
    const p = parts(site);
    return `annonce « ${textOf(p.status)} », gravure « ${textOf(p.coreText)} »`;
  };
  return waitFor(probe, 4000, label, state);
};
