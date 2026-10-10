/* Contact (S9). Contrat (docs/design/plan.md:126 ; maquette
docs/design/prototype/prototype.template.html) :
- #contact > h2 (contact.title, maquette:419) puis div.record-wrap (:420) [svg.disc[role=group]
  [aria-label=discLabel][viewBox="-250 -250 500 500"] (:421), section.msg > h3 (question) + p
  (message) (:439-442), p.rec-status[role=status] (:443), button.rec-hint[type=button] (:444)];
- svg.disc : 4 a.rec-hit[href=channels[k].href][aria-label="Sillon n : nom"] (JS :1120, k>0 :
  target=_blank rel=noopener :1121), 4 .groove-track, 4 .arc-name (nom en majuscules, :1119)
  et un g.rec-hit[tabindex=0][role=button][aria-label] au centre (:1141), son .arc-name valant
  copyHint puis copied (:1160) ; copie = writeText(adresse), annonce copiedStatus ou copyFailed
  {mail} dans .rec-status (:1158-1161), retour à copyHint, annonce vide après 2200 ms (:1163) ;
- Entrée et Espace copient (:1152) ; focus d'un sillon : piste .lit, nom .on, annonce (:1130) ;
- <= 820 px (51,25em, checklist:285) : une colonne message, disque, aide ; disque <= 320 px
  (:262), .locked sans pointeur (:263) ; clic = .open, viewBox "-125 -250 250 250" (:1195) ;
  .rec-hint (44 px, :267) tapHint puis backHint ; Échap referme (checklist:316) ;
- > 820 px : deux colonnes (:258), disque <= 460 px, aide masquée ; css/contact.css lié. */
import {
  click,
  goTo,
  isVisible,
  makeStorage,
  openSite,
  readText,
  settle,
  waitFor,
  waitStatus,
} from './harness.js';
import { MIN_TARGET, overflowProblems, targetProblems } from './checks.js';
import { languageTexts, noForeignText, switchTo } from './language.js';
import { expectEqual, recordExceptions, skip, test } from './runner.js';
import { stubMotion } from './warp.js';

export const GROUP = 'Contact';
const PHONE_MAX = 820; // @media (max-width: 51.25em), maquette:262
const DISC_PHONE_MAX = 320; // maquette:264
const DISC_WIDE_MAX = 460; // maquette:259
const TOLERANCE = 1;
const FULL = [-250, -250, 500, 500];
const HALF = [-125, -250, 250, 250];
const RING_RADII = [117, 150, 182, 219]; // milieu des anneaux : (100+134)/2 ... (198+240)/2
const RING_WIDTHS = [34, 32, 32, 42]; // épaisseur des anneaux (REC_EDGES, maquette:1112)
const REVERT_MS = 2200; // maquette:1163
const PANEL = '.status.hud[data-state="error"]';
const RING_LABEL = 'taille fixée par la maquette validée';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const uncaught = (site) => site.uncaught.map((e) => `exception non rattrapée : ${e}`);
const textOf = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

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
async function openContact(width, { lang = 'fr', reduce = true, mode = 'ok' } = {}) {
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

async function contactData(lang) {
  const { data } = await languageTexts();
  return data[lang].contact;
}
const mailOf = (c) => c.channels[0].href.replace('mailto:', '');
const grooveText = (c, k) => {
  return c.groove.replace('{n}', k + 1).replace('{name}', c.channels[k].name);
};
const failedText = (c) => c.copyFailed.replace('{mail}', mailOf(c));

/** Liste de problèmes et sa fonction de comparaison nommée. */
function collect() {
  const problems = [];
  const eq = (label, actual, expected) => expectEqual(problems, label, actual, expected);
  return [problems, eq];
}

/** Éléments de la rubrique (null si absents). */
function parts(site) {
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
function check(ctx, name, site, fn) {
  return test(ctx, name, async () => {
    const absent = missing(site);
    if (absent.length) return absent;
    return [...(await fn(parts(site))), ...uncaught(site)];
  });
}

/** Clic dont on lit defaultPrevented, puis annulé : aucun lien ne quitte le banc. */
function probeClick(site, el) {
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

const press = (site, el, key) => {
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
function focusOn(site, el) {
  const before = site.doc.activeElement;
  site.frame.focus();
  site.win.focus();
  el.focus();
  if (site.doc.hasFocus()) return;
  if (before && before !== el && before !== site.doc.body) fire(site, before, 'blur');
  fire(site, el, 'focus');
}
function blurOn(site, el) {
  el.blur();
  if (!site.doc.hasFocus()) fire(site, el, 'blur');
}

const escape = (site) => press(site, site.doc, 'Escape');
const copy = (site, p) => click(site, p.core);
const viewBoxOf = (disc) => disc.getAttribute('viewBox').trim().split(/\s+/).map(Number);
const sameBox = (a, b) => a.length === b.length && a.every((n, i) => Math.abs(n - b[i]) < 0.6);
const boxProblems = (label, disc, expected) => {
  if (sameBox(viewBoxOf(disc), expected)) return [];
  const actual = disc.getAttribute('viewBox');
  return [`${label} : viewBox "${actual}" au lieu de "${expected.join(' ')}"`];
};
const classesOf = (disc) => disc.className.baseVal;

/** Élément atteint au pointeur au point (x, y) du repère du disque. */
function hitAt(site, p, x, y) {
  p.disc.scrollIntoView({ block: 'center', behavior: 'instant' });
  const point = p.disc.createSVGPoint();
  point.x = x;
  point.y = y;
  const at = point.matrixTransform(p.disc.getScreenCTM());
  return site.doc.elementFromPoint(at.x, at.y);
}
const reaches = (el, target) => Boolean(el && (el === target || target.contains(el)));

/** Attend que `probe()` soit vrai (4 s) ; l'échec cite l'annonce et la gravure du cœur. */
const waitAnnounce = (site, label, probe) => {
  const state = () => {
    const p = parts(site);
    return `annonce « ${textOf(p.status)} », gravure « ${textOf(p.coreText)} »`;
  };
  return waitFor(probe, 4000, label, state);
};

// ---------- Contrat statique ----------

async function fileTests(ctx) {
  await test(ctx, 'js/sections/contact.js existe', async () => {
    const source = await readText('js/sections/contact.js').catch(() => null);
    return source === null ? ['js/sections/contact.js introuvable'] : [];
  });
  await test(ctx, 'css/contact.css existe et index.html le charge (<link>)', async () => {
    const css = await readText('css/contact.css').catch(() => null);
    const html = await readText('index.html');
    const problems = [];
    if (css === null) problems.push('css/contact.css introuvable');
    if (!/<link\b[^>]*href\s*=\s*["'](\.\/)?css\/contact\.css["'][^>]*>/i.test(html))
      problems.push('index.html : <link> vers css/contact.css absent');
    return problems;
  });
}

// ---------- Structure et textes ----------

async function structureTests(ctx, width) {
  const site = await openContact(width);
  try {
    const c = await contactData('fr');
    await check(ctx, 'structure : h2, record-wrap, disque, message, aide', site, (p) => {
      const [problems, eq] = collect();
      eq('h2', textOf(p.h2), c.title);
      eq('h3', textOf(p.msg.querySelector('h3')), c.question);
      eq('p du message', textOf(p.msg.querySelector('p')), c.message);
      eq('disque aria-label', p.disc.getAttribute('aria-label'), c.discLabel);
      eq('disque role', p.disc.getAttribute('role'), 'group');
      eq('hint type', p.hint.getAttribute('type'), 'button');
      const inWrap = [p.disc, p.msg, p.status, p.hint].every((el) => p.wrap.contains(el));
      if (!inWrap)
        problems.push('.record-wrap doit contenir disque, .msg, .rec-status, .rec-hint');
      if (p.view.querySelectorAll('.record-wrap').length !== 1)
        problems.push('un seul .record-wrap attendu');
      return problems;
    });
    await check(ctx, 'sillons : 4 liens (href, aria-label, target/rel), noms', site, (p) => {
      const [problems, eq] = collect();
      p.links.forEach((a, k) => {
        const n = k + 1;
        eq(`sillon ${n} href`, a.getAttribute('href'), c.channels[k].href);
        eq(`sillon ${n} aria-label`, a.getAttribute('aria-label'), grooveText(c, k));
        eq(`sillon ${n} target`, a.getAttribute('target'), k ? '_blank' : null);
        if (k && !/\bnoopener\b/.test(a.getAttribute('rel') ?? ''))
          problems.push(`sillon ${n} : rel sans noopener`);
        eq(`nom gravé ${n}`, textOf(p.names[k]), c.channels[k].name.toUpperCase());
      });
      return problems;
    });
    await check(ctx, 'cœur : bouton nommé, gravure copyHint, annonce vide', site, (p) => {
      const [problems, eq] = collect();
      eq('cœur role', p.core.getAttribute('role'), 'button');
      eq('cœur tabindex', p.core.getAttribute('tabindex'), '0');
      if (!(p.core.getAttribute('aria-label') ?? '').trim())
        problems.push('cœur : aria-label vide');
      eq('gravure du cœur', textOf(p.coreText), c.copyHint);
      eq('annonce initiale', textOf(p.status), '');
      return problems;
    });
    await check(ctx, 'annonces : .rec-status est une zone live dès le montage', site, (p) => {
      const role = p.status.getAttribute('role') === 'status';
      const live = ['polite', 'assertive'].includes(p.status.getAttribute('aria-live'));
      const problems = role || live ? [] : ['.rec-status sans role="status" ni aria-live'];
      if (p.status.getAttribute('aria-hidden') === 'true')
        problems.push('.rec-status aria-hidden');
      return problems;
    });
    await test(ctx, 'aucun panneau « Contenu indisponible » dans #contact', async () => {
      const view = site.doc.getElementById('contact');
      const problems = [];
      if (view.querySelector(PANEL)) problems.push(`${PANEL} encore dans #contact`);
      if (view.querySelector('.status')) problems.push('un .status subsiste dans #contact');
      return problems;
    });
  } finally {
    site.close();
  }
}

// ---------- Copie, repli, annonces ----------

async function copyTests(ctx, width) {
  const c = await contactData('fr');
  const mail = mailOf(c);
  const each = async (name, options, fn) => {
    const site = await openContact(width, options);
    try {
      await check(ctx, name, site, (p) => fn(site, p));
    } finally {
      site.close();
    }
  };
  await each('copie : writeText, annonce, gravure, retour 2,2 s', {}, async (site, p) => {
    const [problems, eq] = collect();
    const status = p.status;
    copy(site, p);
    await waitAnnounce(site, 'annonce de copie', () => textOf(status) === c.copiedStatus);
    eq('appels writeText', JSON.stringify(site.clip.calls), JSON.stringify([mail]));
    eq('gravure du cœur', textOf(p.coreText), c.copied);
    if (parts(site).status !== status || !status.isConnected)
      problems.push('.rec-status remplacé : un lecteur d\'écran n\'annoncerait rien');
    await sleep(REVERT_MS - 700);
    eq('annonce avant 2,2 s', textOf(status), c.copiedStatus);
    await waitAnnounce(site, 'retour de l\'annonce', () => textOf(status) === '');
    eq('gravure après 2,2 s', textOf(p.coreText), c.copyHint);
    return problems;
  });
  await each('copie au clavier : Entrée et Espace (sans défilement)', {}, async (site, p) => {
    const [problems, eq] = collect();
    const enter = press(site, p.core, 'Enter');
    const copied = () => textOf(p.status) === c.copiedStatus;
    await waitAnnounce(site, 'annonce après Entrée', copied);
    const space = press(site, p.core, ' ');
    eq('appels writeText', site.clip.calls.length, 2);
    if (!enter.defaultPrevented) problems.push('Entrée : defaultPrevented faux');
    if (!space.defaultPrevented) problems.push('Espace : defaultPrevented faux (défilement)');
    press(site, p.core, 'a');
    eq('appels après une autre touche', site.clip.calls.length, 2);
    return problems;
  });
  for (const mode of ['reject', 'throw', 'absent']) {
    const name = `repli : presse-papiers ${mode}, adresse lisible dans l'annonce`;
    await each(name, { mode }, async (site, p) => {
      const problems = [];
      copy(site, p);
      await waitAnnounce(site, 'annonce de repli', () => textOf(p.status) === failedText(c));
      if (textOf(p.coreText) === c.copied) problems.push('gravure « copié » malgré l\'échec');
      if (!textOf(p.status).includes(mail)) problems.push('annonce sans l\'adresse');
      return problems;
    });
  }
  const flip = 'repli : rejet puis réussite, puis réussite puis rejet';
  await each(flip, { mode: 'reject' }, async (site, p) => {
    const [problems, eq] = collect();
    copy(site, p);
    await waitAnnounce(site, 'échec', () => textOf(p.status) === failedText(c));
    site.clip.mode = 'ok';
    copy(site, p);
    await waitAnnounce(site, 'réussite', () => textOf(p.status) === c.copiedStatus);
    eq('gravure après réussite', textOf(p.coreText), c.copied);
    site.clip.mode = 'reject';
    copy(site, p);
    await waitAnnounce(site, 'nouvel échec', () => textOf(p.status) === failedText(c));
    if (textOf(p.coreText) === c.copied)
      problems.push('gravure « copié » restée après un échec');
    return problems;
  });
  await each('copies répétées : 6 clics, minuteur remis à zéro', {}, async (site, p) => {
    const [problems, eq] = collect();
    for (let i = 0; i < 6; i++) copy(site, p);
    await waitAnnounce(site, 'annonce', () => textOf(p.status) === c.copiedStatus);
    eq('appels writeText', site.clip.calls.length, 6);
    await sleep(1500);
    copy(site, p);
    await sleep(1100); // 2,6 s après le premier lot, 1,1 s après le dernier clic
    eq('annonce 1,1 s après la dernière copie', textOf(p.status), c.copiedStatus);
    eq('gravure 1,1 s après la dernière copie', textOf(p.coreText), c.copied);
    const back = () => !textOf(p.status) && textOf(p.coreText) === c.copyHint;
    await waitAnnounce(site, 'retour', back);
    return problems;
  });
  await each('copie puis échec : l\'ancien minuteur épargne l\'échec', {}, async (site, p) => {
    const [problems, eq] = collect();
    copy(site, p);
    await waitAnnounce(site, 'annonce', () => textOf(p.status) === c.copiedStatus);
    await sleep(1200);
    site.clip.mode = 'reject';
    copy(site, p);
    await waitAnnounce(site, 'échec', () => textOf(p.status) === failedText(c));
    await sleep(1400); // le minuteur du premier clic (2,2 s) est échu
    eq('annonce d\'échec après l\'ancien minuteur', textOf(p.status), failedText(c));
    return problems;
  });
}

// ---------- Sillons au clavier ----------

async function grooveFocusTests(ctx, width, label) {
  const c = await contactData('fr');
  const site = await openContact(width);
  try {
    await check(ctx, `${label} : cinq éléments au clavier, ni inert`, site, (p) => {
      const problems = [];
      const targets = [...p.links, p.core, ...(isVisible(p.hint) ? [p.hint] : [])];
      for (const el of targets) {
        focusOn(site, el);
        const name = el.getAttribute('aria-label') || textOf(el);
        if (site.doc.activeElement !== el) problems.push(`focus refusé : ${name}`);
        if (el.getAttribute('tabindex') === '-1') problems.push(`tabindex=-1 sur ${name}`);
      }
      for (let el = p.core; el && el !== site.doc.body; el = el.parentElement) {
        if (el.hasAttribute('inert') || el.getAttribute('aria-hidden') === 'true')
          problems.push(`ancêtre inert ou aria-hidden : ${el.localName}.${[...el.classList]}`);
      }
      return problems;
    });
    await check(ctx, `${label} : focus d'un sillon = piste, nom, annonce`, site, async (p) => {
      const [problems, eq] = collect();
      for (let k = 0; k < 4; k++) {
        focusOn(site, p.links[k]);
        await sleep(30);
        p.tracks.forEach((track, i) => {
          if (track.classList.contains('lit') !== (i === k))
            problems.push(`sillon ${k + 1} focalisé : piste ${i + 1} lit=${i !== k}`);
        });
        if (!p.names[k].classList.contains('on'))
          problems.push(`sillon ${k + 1} : nom gravé non affiché`);
        eq(`annonce du sillon ${k + 1}`, textOf(p.status), grooveText(c, k));
      }
      blurOn(site, p.links[3]);
      await sleep(30);
      if (p.tracks.some((t) => t.classList.contains('lit')))
        problems.push('piste encore allumée après blur');
      eq('annonce après blur', textOf(p.status), '');
      return problems;
    });
    const heart = `${label} : focus du cœur éteint les pistes, grave l'invite`;
    await check(ctx, heart, site, async (p) => {
      const problems = [];
      focusOn(site, p.links[1]);
      focusOn(site, p.core);
      await sleep(30);
      if (p.tracks.some((t) => t.classList.contains('lit')))
        problems.push('piste allumée sur le cœur');
      if (!p.names.at(-1).classList.contains('on'))
        problems.push('gravure du cœur non affichée au focus');
      if (!textOf(p.status)) problems.push('aucune annonce au focus du cœur');
      return problems;
    });
  } finally {
    site.close();
  }
}

/** Écran tactile (> 820 px) : le premier toucher annonce, le second suit le lien. */
async function armedTests(ctx) {
  const c = await contactData('fr');
  const site = await openContact(1280);
  const pointerDown = (p, pointerType) => {
    const init = { bubbles: true, pointerType };
    p.disc.dispatchEvent(new site.win.PointerEvent('pointerdown', init));
  };
  try {
    await check(ctx, 'tactile : 1er toucher retient, 2e suit le lien', site, (p) => {
      const problems = [];
      pointerDown(p, 'touch');
      if (probeClick(site, p.links[1]) !== true)
        problems.push('1er toucher : lien non retenu');
      const said = textOf(p.status);
      if (!said.startsWith(grooveText(c, 1)) || !said.includes(c.armed))
        problems.push(`annonce « ${said} » au lieu de « ${grooveText(c, 1)}. ${c.armed} »`);
      if (probeClick(site, p.links[1]) !== false) problems.push('2e toucher : lien non suivi');
      return problems;
    });
    await check(ctx, 'souris : un clic suit le lien sans le retenir', site, (p) => {
      pointerDown(p, 'mouse');
      return probeClick(site, p.links[2]) === false ? [] : ['clic souris retenu'];
    });
  } finally {
    site.close();
  }
}

// ---------- Téléphone : disque verrouillé puis moitié haute ----------

async function lockedTests(ctx, site, c) {
  const closedWidth = { value: 0 };
  await check(ctx, 'verrouillé : .locked, aide tapHint, viewBox entier', site, (p) => {
    const [problems, eq] = collect();
    if (!p.disc.classList.contains('locked')) problems.push('svg.disc sans .locked');
    if (p.disc.classList.contains('open')) problems.push('svg.disc .open au départ');
    if (!isVisible(p.hint)) problems.push('.rec-hint masqué');
    eq('.rec-hint', textOf(p.hint), c.tapHint);
    problems.push(...boxProblems('verrouillé', p.disc, FULL));
    closedWidth.value = p.disc.getBoundingClientRect().width;
    return problems;
  });
  await check(ctx, 'verrouillé : le pointeur n\'atteint ni sillon ni cœur', site, (p) => {
    const problems = [];
    RING_RADII.forEach((r, k) => {
      if (reaches(hitAt(site, p, 0, -r), p.links[k])) problems.push(`sillon ${k + 1} atteint`);
    });
    if (reaches(hitAt(site, p, 0, -50), p.core)) problems.push('cœur atteint au pointeur');
    const ring = p.links[0].querySelector('.ring') ?? p.links[0];
    const events = site.win.getComputedStyle(ring).pointerEvents;
    if (events !== 'none')
      problems.push(`anneau 1 : pointer-events ${events} au lieu de none`);
    return problems;
  });
  await check(ctx, 'verrouillé : clavier intact (focus, Entrée)', site, async (p) => {
    const problems = [];
    for (const el of [...p.links, p.core, p.hint]) {
      focusOn(site, el);
      if (site.doc.activeElement !== el)
        problems.push(`focus refusé : ${el.getAttribute('aria-label') || textOf(el)}`);
    }
    press(site, p.core, 'Enter');
    await waitAnnounce(site, 'copie au clavier', () => textOf(p.status) === c.copiedStatus);
    if (!p.disc.classList.contains('locked'))
      problems.push('la copie a déverrouillé le disque');
    return problems;
  });
  await check(ctx, 'déverrouillage : clic sur le disque, moitié haute, aide', site, (p) => {
    const problems = [];
    click(site, p.disc);
    if (!p.disc.classList.contains('open')) problems.push('svg.disc sans .open après le clic');
    if (p.disc.classList.contains('locked')) problems.push('svg.disc encore .locked');
    problems.push(...boxProblems('ouvert', p.disc, HALF));
    if (!textOf(p.hint).includes(c.backHint))
      problems.push(`.rec-hint « ${textOf(p.hint)} » sans « ${c.backHint} »`);
    if (p.disc.getBoundingClientRect().width + TOLERANCE < closedWidth.value)
      problems.push('le disque ouvert est plus étroit que fermé');
    return problems;
  });
  await check(ctx, 'ouvert : le pointeur atteint chaque sillon et le cœur', site, (p) => {
    const problems = [];
    RING_RADII.forEach((r, k) => {
      if (!reaches(hitAt(site, p, 0, -r), p.links[k]))
        problems.push(`sillon ${k + 1} inatteignable au pointeur`);
    });
    if (!reaches(hitAt(site, p, 0, -50), p.core))
      problems.push('cœur inatteignable au pointeur');
    return problems;
  });
  await check(ctx, 'ouvert : un clic sur un sillon suit le lien', site, (p) => {
    const init = { bubbles: true, pointerType: 'touch' };
    p.disc.dispatchEvent(new site.win.PointerEvent('pointerdown', init));
    return probeClick(site, p.links[1]) === false ? [] : ['clic retenu, disque ouvert'];
  });
  await check(ctx, 'ouvert : l\'aide referme (retour au disque verrouillé)', site, (p) => {
    const [problems, eq] = collect();
    click(site, p.hint);
    if (p.disc.classList.contains('open')) problems.push('.open resté');
    if (!p.disc.classList.contains('locked')) problems.push('.locked absent après fermeture');
    problems.push(...boxProblems('fermé', p.disc, FULL));
    eq('.rec-hint', textOf(p.hint), c.tapHint);
    return problems;
  });
  await check(ctx, 'aide ouvre, Échap referme, Échap fermé sans effet', site, (p) => {
    const problems = [];
    click(site, p.hint);
    if (!p.disc.classList.contains('open')) problems.push('l\'aide n\'ouvre pas le disque');
    escape(site);
    if (p.disc.classList.contains('open')) problems.push('Échap ne referme pas le disque');
    if (!p.disc.classList.contains('locked')) problems.push('.locked absent après Échap');
    problems.push(...boxProblems('après Échap', p.disc, FULL));
    escape(site);
    problems.push(...boxProblems('2e Échap', p.disc, FULL));
    if (!p.disc.classList.contains('locked')) problems.push('2e Échap : .locked perdu');
    return problems;
  });
  await check(ctx, 'clic sur le disque ouvert : il reste ouvert', site, (p) => {
    click(site, p.disc);
    const opened = p.disc.classList.contains('open');
    click(site, p.disc);
    const still = p.disc.classList.contains('open');
    return opened && still ? [] : ['le disque ne reste pas ouvert'];
  });
}

async function animatedTests(ctx, width) {
  const site = await openContact(width, { reduce: false });
  const halfReached = (p) => sameBox(viewBoxOf(p.disc), HALF);
  const state = (p) => `${p.disc.getAttribute('viewBox')} ${classesOf(p.disc)}`;
  try {
    const cycle = 'animé : moitié haute puis disque entier en moins de 3 s';
    await check(ctx, cycle, site, async (p) => {
      click(site, p.disc);
      await waitFor(() => halfReached(p), 3000, 'viewBox moitié haute', () => state(p));
      click(site, p.hint);
      const closed = () => {
        return sameBox(viewBoxOf(p.disc), FULL) && !p.disc.classList.contains('open');
      };
      await waitFor(closed, 3000, 'retour au disque entier', () => state(p));
      return [];
    });
    const reopen = 'animé : réouverture pendant la fermeture, ouvert à la fin';
    await check(ctx, reopen, site, async (p) => {
      click(site, p.disc);
      await waitFor(() => halfReached(p), 3000, 'ouverture', () => state(p));
      click(site, p.hint); // ferme
      await sleep(150);
      click(site, p.hint); // rouvre en cours de fermeture
      await sleep(1200);
      const problems = [];
      if (!p.disc.classList.contains('open'))
        problems.push('.open retiré malgré la réouverture');
      problems.push(...boxProblems('réouvert', p.disc, HALF));
      return problems;
    });
  } finally {
    site.close();
  }
}

async function phoneTests(ctx, width) {
  const c = await contactData('fr');
  const site = await openContact(width);
  try {
    await lockedTests(ctx, site, c);
  } finally {
    site.close();
  }
  await animatedTests(ctx, width);
}

// ---------- Redimensionnement et rupture à 820 px ----------

const frameWidth = async (site, width) => {
  site.frame.style.width = `${width}px`;
  site.width = width;
  await sleep(150);
};

async function resizeTests(ctx) {
  const c = await contactData('fr');
  const site = await openContact(500);
  try {
    const across = 'redimensionné au-delà de 820 px, disque ouvert : refermé';
    await check(ctx, across, site, async (p) => {
      const [problems, eq] = collect();
      click(site, p.disc);
      if (!p.disc.classList.contains('open')) problems.push('disque non ouvert avant');
      await frameWidth(site, 900);
      const closed = () => !p.disc.classList.contains('open');
      await waitFor(closed, 2000, 'fermeture au passage large', () => classesOf(p.disc));
      if (p.disc.classList.contains('locked')) problems.push('.locked sur grand écran');
      problems.push(...boxProblems('large', p.disc, FULL));
      if (isVisible(p.hint)) problems.push('.rec-hint visible sur grand écran');
      if (p.links.some((a) => a.getBoundingClientRect().width < 1))
        problems.push('sillon sans taille sur grand écran');
      problems.push(...overflowProblems(site));
      await frameWidth(site, 500);
      await sleep(100);
      if (!p.disc.classList.contains('locked'))
        problems.push('retour étroit : .locked absent');
      if (p.disc.classList.contains('open')) problems.push('retour étroit : disque rouvert');
      eq('.rec-hint au retour', textOf(p.hint), c.tapHint);
      problems.push(...boxProblems('retour étroit', p.disc, FULL));
      return problems;
    });
    const within = 'redimensionné 500 puis 700 px, disque ouvert : reste ouvert';
    await check(ctx, within, site, async (p) => {
      click(site, p.disc);
      await frameWidth(site, 700);
      const problems = [];
      if (!p.disc.classList.contains('open')) problems.push('refermé sans passer 820 px');
      problems.push(...boxProblems('700 px', p.disc, HALF));
      escape(site);
      return problems;
    });
    await check(ctx, 'Échap sur grand écran ne touche pas le disque', site, async (p) => {
      await frameWidth(site, 1000);
      escape(site);
      const problems = [...boxProblems('grand écran', p.disc, FULL)];
      if (p.disc.classList.contains('open') || p.disc.classList.contains('locked'))
        problems.push(`classes inattendues : ${classesOf(p.disc)}`);
      return problems;
    });
  } finally {
    site.close();
  }
  for (const [width, phone] of [[820, true], [821, false]]) {
    const edge = await openContact(width);
    const kind = phone ? 'une colonne, verrou' : 'deux colonnes';
    try {
      await check(ctx, `rupture exacte à ${width} px : ${kind}`, edge, (p) => {
        const [problems, eq] = collect();
        eq('.locked', p.disc.classList.contains('locked'), phone);
        eq('.rec-hint visible', isVisible(p.hint), phone);
        problems.push(...layoutProblems(p, phone));
        return problems;
      });
    } finally {
      edge.close();
    }
  }
}

// ---------- Mise en page, débordement, cibles ----------

/** Une colonne (message, disque, aide) au plus 820 px ; sinon disque à gauche du message. */
function layoutProblems(p, phone) {
  const problems = [];
  const disc = p.disc.getBoundingClientRect();
  const msg = p.msg.getBoundingClientRect();
  if (phone) {
    const hint = p.hint.getBoundingClientRect();
    if (msg.bottom > disc.top + TOLERANCE)
      problems.push('une colonne : message avant le disque');
    if (disc.bottom > hint.top + TOLERANCE)
      problems.push('une colonne : aide après le disque');
    if (!p.disc.classList.contains('open') && disc.width > DISC_PHONE_MAX + TOLERANCE)
      problems.push(`disque de ${disc.width.toFixed(1)} px (> ${DISC_PHONE_MAX})`);
  } else {
    if (disc.right > msg.left + TOLERANCE) problems.push('deux colonnes : disque à gauche');
    if (!(disc.top < msg.bottom && msg.top < disc.bottom))
      problems.push('deux colonnes : disque et message sur des lignes différentes');
    if (disc.width > DISC_WIDE_MAX + TOLERANCE)
      problems.push(`disque de ${disc.width.toFixed(1)} px (> ${DISC_WIDE_MAX})`);
    if (isVisible(p.hint)) problems.push('.rec-hint visible hors téléphone');
  }
  return problems;
}

/** Cibles : aide et cœur d'au moins 44 px ; anneaux et exceptions rangés à part. */
function targetChecks(ctx, site, p, phone) {
  const problems = [];
  if (phone) {
    const hint = p.hint.getBoundingClientRect();
    if (hint.height + TOLERANCE < MIN_TARGET)
      problems.push(`.rec-hint : ${hint.height.toFixed(1)} px de haut`);
  }
  const core = p.core.getBoundingClientRect();
  if (core.width + TOLERANCE < MIN_TARGET || core.height + TOLERANCE < MIN_TARGET)
    problems.push(`cœur : ${core.width.toFixed(1)} × ${core.height.toFixed(1)} px`);
  const scan = targetProblems(site, [p.view]);
  problems.push(...scan.problems);
  const scale = p.disc.getScreenCTM().a;
  const rings = p.links.map((a, k) => ({
    label: RING_LABEL,
    text: `anneau du sillon ${k + 1} : ${(scale * RING_WIDTHS[k]).toFixed(1)} px d'épaisseur`,
  }));
  recordExceptions(ctx, [...scan.exceptions, ...rings]);
  return problems;
}

async function layoutTests(ctx, width) {
  const site = await openContact(width);
  try {
    const phone = width <= PHONE_MAX;
    const columns = phone ? 'une colonne' : 'deux colonnes';
    await check(ctx, `mise en page à ${width} px : ${columns}`, site, (p) => {
      return layoutProblems(p, phone);
    });
    await check(ctx, 'aucun débordement horizontal (disque fermé)', site, () => {
      return overflowProblems(site);
    });
    await check(ctx, 'cibles : aide et cœur de 44 px, anneaux mesurés', site, (p) => {
      return targetChecks(ctx, site, p, phone);
    });
    if (!phone) return;
    await check(ctx, 'aucun débordement horizontal (disque ouvert)', site, (p) => {
      click(site, p.disc);
      const problems = overflowProblems(site);
      problems.push(...boxProblems('ouvert', p.disc, HALF));
      escape(site);
      return problems;
    });
  } finally {
    site.close();
  }
}

// ---------- Langue ----------

/** Problèmes de textes de la rubrique par rapport aux données `c` d'une langue. */
function textProblems(c, p) {
  const [problems, eq] = collect();
  eq('h2', textOf(p.h2), c.title);
  eq('h3', textOf(p.msg.querySelector('h3')), c.question);
  eq('message', textOf(p.msg.querySelector('p')), c.message);
  eq('aria-label du disque', p.disc.getAttribute('aria-label'), c.discLabel);
  p.links.forEach((a, k) => {
    eq(`aria-label du sillon ${k + 1}`, a.getAttribute('aria-label'), grooveText(c, k));
    eq(`nom gravé ${k + 1}`, textOf(p.names[k]), c.channels[k].name.toUpperCase());
  });
  return problems;
}

async function switchTests(ctx, width, fr, en) {
  const site = await openContact(width);
  try {
    const phone = width <= PHONE_MAX;
    const toEn = 'bascule FR vers EN : textes, libellés, noms gravés, aide';
    await check(ctx, toEn, site, async (p) => {
      if (phone) click(site, p.disc);
      await switchTo(site, 'en');
      const q = parts(site);
      const problems = textProblems(en, q);
      if (textOf(q.coreText) !== en.copyHint)
        problems.push(`gravure « ${textOf(q.coreText)} » au lieu de « ${en.copyHint} »`);
      if (phone && !textOf(q.hint).includes(en.backHint))
        problems.push(`aide ouverte « ${textOf(q.hint)} » sans « ${en.backHint} »`);
      problems.push(...(await noForeignText(site, 'en')));
      return problems;
    });
    await check(ctx, 'bascule EN vers FR : tout revient, aide cohérente', site, async () => {
      await switchTo(site, 'fr');
      const q = parts(site);
      const problems = textProblems(fr, q);
      problems.push(...(await noForeignText(site, 'fr')));
      if (phone) {
        const open = q.disc.classList.contains('open');
        const expected = open ? fr.backHint : fr.tapHint;
        if (!textOf(q.hint).includes(expected))
          problems.push(`aide « ${textOf(q.hint)} » incohérente avec l'état`);
      }
      return problems;
    });
  } finally {
    site.close();
  }
}

async function announceSwitchTests(ctx, width, fr, en) {
  for (const mode of ['ok', 'reject']) {
    const site = await openContact(width, { mode });
    const ok = mode === 'ok';
    const name = `bascule pendant une annonce (copie ${ok ? 'réussie' : 'en échec'})`;
    try {
      await check(ctx, name, site, async (p) => {
        const problems = [];
        copy(site, p);
        await waitAnnounce(site, 'annonce', () => textOf(p.status) !== '');
        await switchTo(site, 'en');
        const q = parts(site);
        const said = textOf(q.status);
        const frText = ok ? fr.copiedStatus : failedText(fr);
        const enText = ok ? en.copiedStatus : failedText(en);
        if (said !== '' && said !== enText)
          problems.push(`annonce « ${said} » après bascule : ni vide ni « ${enText} »`);
        if (said === frText) problems.push('annonce restée en français');
        const engraved = textOf(q.coreText);
        if (![en.copied, en.copyHint].includes(engraved))
          problems.push(`gravure « ${engraved} » ni EN copié ni EN invite`);
        problems.push(...(await noForeignText(site, 'en')));
        site.clip.mode = 'ok';
        copy(site, q);
        await waitAnnounce(site, 'annonce EN', () => textOf(q.status) === en.copiedStatus);
        const back = () => !textOf(q.status) && textOf(q.coreText) === en.copyHint;
        await waitAnnounce(site, 'retour EN', back);
        return problems;
      });
    } finally {
      site.close();
    }
  }
}

async function languageTests(ctx, width) {
  const fr = await contactData('fr');
  const en = await contactData('en');
  await switchTests(ctx, width, fr, en);
  await announceSwitchTests(ctx, width, fr, en);
}

// ---------- Lancement ----------

/** Rejoue le groupe Contact : structure, copie, sillons, téléphone, 820 px, langue. */
export async function runContact(widths, mainWidth) {
  const ctx = { group: GROUP, section: 'contact' };
  const phoneWidth = widths.find((w) => w <= PHONE_MAX && w >= 320) ?? mainWidth;
  const wideWidth = widths.find((w) => w > PHONE_MAX) ?? 1280;
  const step = async (name, run) => {
    try {
      await run();
    } catch (error) {
      skip(ctx, [name], `scénario interrompu : ${error?.message ?? error}`);
    }
  };
  await step('fichiers', () => fileTests(ctx));
  await step('structure', () => structureTests(ctx, wideWidth));
  await step('copie', () => copyTests(ctx, wideWidth));
  await step('sillons (grand écran)', () => grooveFocusTests(ctx, wideWidth, 'grand écran'));
  await step('sillons (téléphone)', () => grooveFocusTests(ctx, phoneWidth, 'téléphone'));
  await step('toucher', () => armedTests(ctx));
  await step('téléphone', () => phoneTests(ctx, phoneWidth));
  await step('redimensionnement', () => resizeTests(ctx));
  for (const width of widths)
    await step(`mise en page ${width}`, () => layoutTests(ctx, width));
  await step('langue (téléphone)', () => languageTests(ctx, phoneWidth));
  await step('langue (grand écran)', () => languageTests(ctx, wideWidth));
}
