/* Sonde du déploiement des Compétences (S8.B3) : gestes, attentes et mesures de la plongée,
des sauts d'étoile et du retour (attendus : README.md, groupe competences). Les mesures de
caméra se font sur le viewBox du plan, en rapports de la largeur courante (jamais en unités
du dessin) ; les noms d'astres en pixels rendus. Aucun libellé en dur : tout vient de data/. */
import { click, describe, isVisible, waitFor } from './harness.js';
import { clickAtCentre, plain, press, pressEscape } from './projects-probe.js';
import {
  DESKTOP_MIN,
  gridFor,
  groupEls,
  labelOf,
  parts,
  rest,
  starEls,
  starName,
  starsOf,
  textOf,
} from './skills-probe.js';
import { normalize } from './text.js';

// ---------- Déploiement : gestes et attentes ----------

const DEPLOY_WAIT_MS = 800;
export const isDeployed = (site) => !!parts(site).layout?.classList.contains('focus');
export const curStar = (site) => site.doc.querySelector('#constSvg .st-g.cur');
/** Texte de `el` sans les nœuds décoratifs (`aria-hidden`), espaces normalisés. */
function ownText(el) {
  const copy = el.cloneNode(true);
  for (const hidden of copy.querySelectorAll('[aria-hidden="true"]')) hidden.remove();
  return normalize(copy.textContent);
}

/** Active `el` : clic réel au centre, Entrée ou Espace (focus d'abord pour les touches). */
export async function activate(site, el, how) {
  if (how === 'clic') {
    const target = await clickAtCentre(site, el);
    if (!target || !el.contains(target)) {
      const got = target ? describe(target) : 'rien';
      throw new Error(`clic sur ${describe(el)} reçu par ${got}`);
    }
    return;
  }
  el.focus();
  press(site, el, how === 'Espace' ? ' ' : 'Enter');
}

/** Déploie la constellation de rang `index` par `how`, puis attend le repos. */
export async function deploy(site, index, how = 'clic') {
  const key = `deploy:${how}`;
  if (site.refused?.[key]) throw new Error(site.refused[key]);
  const group = groupEls(site)[index];
  if (!group) throw new Error(`constellation ${index} introuvable`);
  await activate(site, group, how);
  const shown = await waitFor(() => isDeployed(site), DEPLOY_WAIT_MS, 'focus')
    .catch(() => null);
  if (!shown) {
    const message = `déploiement absent : #skillsLayout sans la classe focus après ${how}`;
    site.refused = { ...site.refused, [key]: message };
    throw new Error(message);
  }
  await rest(site);
}

/** Éléments du panneau déployé (null si absents), flèches repérées par `skills.prev/next`. */
export function panelParts(site, text) {
  const { panel } = parts(site);
  const skill = site.doc.getElementById('skill');
  const one = (root, selector) => root?.querySelector(selector) ?? null;
  const box = [...(panel?.querySelectorAll('div.chips') ?? [])]
    .find((el) => el.getAttribute('aria-label') === text.chipsLabel) ?? null;
  const arrows = [...(skill?.querySelectorAll('.arrows button') ?? [])];
  const named = (label) => arrows.find((b) => labelOf(b) === label) ?? null;
  return {
    panel,
    skill,
    box,
    back: one(panel, 'button.back'),
    title: one(panel, 'p.ctitle'),
    chips: [...(box?.querySelectorAll('button') ?? [])],
    h3: one(skill, 'h3'),
    lvl: one(skill, '.lvl'),
    body: one(skill, '.body'),
    related: one(skill, '.related'),
    prev: named(text.prev),
    next: named(text.next),
  };
}

/** Retour à la vue d'ensemble par le bouton (ou Échap sans lui), puis attend le repos. */
export async function leave(site, text) {
  if (!isDeployed(site)) return;
  const { back } = panelParts(site, text);
  if (back) click(site, back);
  else pressEscape(site);
  await waitFor(() => !isDeployed(site), DEPLOY_WAIT_MS, 'retour').catch(() => {});
  await rest(site);
}

/**
 * Vrai si `el` est réellement inerte : `inert` n'agit que sur un ancêtre HTML, jamais sur un
 * `g` SVG (mesuré dans Chrome), donc `closest('[inert]')` seul serait trop clément.
 */
function isInert(site, el) {
  for (let node = el; node; node = node.parentElement)
    if (node instanceof site.win.HTMLElement && node.hasAttribute('inert')) return true;
  return false;
}

/** Éléments de #skills atteints par Tab, dans l'ordre du DOM. */
export function tabOrder(site) {
  const { root } = parts(site);
  return [...root.querySelectorAll('*')].filter((el) => el.tabIndex >= 0 && !el.disabled &&
    !isInert(site, el) && site.win.getComputedStyle(el).visibility !== 'hidden');
}

/** Appels de focus() et de défilement du cadre, gardés dans `calls` (espions posés ici). */
export function spyCalls(site) {
  const { win } = site;
  const calls = { focus: [], scroll: [] };
  const wrap = (proto, name, bucket) => {
    const original = proto[name];
    proto[name] = function spy(...args) {
      calls[bucket].push({ name, el: this, args });
      return original.apply(this, args);
    };
  };
  for (const proto of [win.HTMLElement.prototype, win.SVGElement.prototype])
    wrap(proto, 'focus', 'focus');
  for (const name of ['scrollTo', 'scroll', 'scrollBy']) {
    wrap(win, name, 'scroll');
    wrap(win.Element.prototype, name, 'scroll');
  }
  wrap(win.Element.prototype, 'scrollIntoView', 'scroll');
  return calls;
}

// ---------- Caméra, images, noms visibles ----------

/** Caméra du plan : centre, largeur et hauteur du viewBox. */
export function cameraOf(site) {
  const box = (parts(site).svg?.getAttribute('viewBox') ?? '0 0 0 0').split(/\s+/).map(Number);
  const [x, y, w, h] = box;
  return { cx: x + w / 2, cy: y + h / 2, w, h };
}

const ALL_KEYS = ['cx', 'cy', 'w', 'h'];

/** Écarts de `got` à `want` au-delà de `share` de la largeur (de la hauteur pour h). */
export function cameraProblems(label, got, want, share = 0.005, keys = ALL_KEYS) {
  const unit = (key) => (key === 'h' ? want.h : want.w);
  return keys
    .filter((key) => !(Math.abs(got[key] - want[key]) <= share * unit(key)))
    .map((key) => `${label} : ${key} ${got[key]?.toFixed(1)} pour ${want[key].toFixed(1)}`);
}

/**
 * Relève une image sur chaque requestAnimationFrame du site pendant `action` : caméra, hauteur
 * rendue du plan, hauteur du document, classe focus et `extra(frame)` éventuel.
 */
export async function recordFrames(site, action, extra = () => ({})) {
  const { svg, layout } = parts(site);
  const request = site.rawFrame;
  const frames = [];
  let on = true;
  const read = (at) => frames.push({
    at,
    ...cameraOf(site),
    plan: svg.getBoundingClientRect().height,
    doc: site.doc.documentElement.scrollHeight,
    focus: layout.classList.contains('focus'),
    ...extra(),
  });
  const tick = (at) => {
    if (!on) return;
    read(at);
    request(tick);
  };
  read(site.win.performance.now());
  request(tick);
  try {
    await action();
  } finally {
    on = false;
  }
  read(site.win.performance.now());
  return frames;
}

const area = (a, b) => {
  const across = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const down = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return across > 0 && down > 0 ? across * down : 0;
};
const grow = (r, by) => ({
  left: r.left - by,
  right: r.right + by,
  top: r.top - by,
  bottom: r.bottom + by,
});

/**
 * Défile à la position de lecture sur téléphone : haut de la rubrique sous la barre, plan
 * collant à sa place d'origine, panneau à son recouvrement de départ (-34vw, checklist :285).
 */
export function scrollToPlan(site) {
  const bar = site.doc.querySelector('header.bar')?.getBoundingClientRect().bottom ?? 0;
  const top = parts(site).layout.getBoundingClientRect().top + site.win.scrollY;
  site.win.scrollTo({ top: Math.max(0, top - bar - PLAN_MARGIN), behavior: 'instant' });
}

/**
 * Part (en %) du nom `label` hors du cadre visible du plan (tolérance 1 px) ou de la fenêtre,
 * ou recouverte par la barre collante, la barre d'onglets ou le panneau.
 */
export function maskedShare(site, label) {
  const rect = label.getBoundingClientRect();
  const { svg, panel } = parts(site);
  const view = { left: 0, top: 0, right: site.win.innerWidth, bottom: site.win.innerHeight };
  const frame = grow(svg.getBoundingClientRect(), 1);
  const shown = {
    left: Math.max(rect.left, frame.left, view.left),
    top: Math.max(rect.top, frame.top, view.top),
    right: Math.min(rect.right, frame.right, view.right),
    bottom: Math.min(rect.bottom, frame.bottom, view.bottom),
  };
  const bars = ['header.bar', 'nav.tabbar'].map((css) => site.doc.querySelector(css));
  const covers = [...bars, panel]
    .filter((el) => el && isVisible(el)).map((el) => el.getBoundingClientRect());
  const hidden = covers.reduce((sum, cover) => sum + area(shown, cover), 0);
  const full = rect.width * rect.height || 1;
  return Math.max(0, 100 * (1 - (area(shown, shown) - hidden) / full));
}

// ---------- État attendu du déploiement (kit : { site, text, width, calls }) ----------

const FOCUSED_SCALE = { desk: 1.4, phone: 1.15 }; // --bs au moins égal à bodyScale(focused)
const DIVE_SHARE = 0.35; // largeur du viewBox plongé / vue d'ensemble : au plus
const DIVE_OFFSET = 0.3; // astre à moins de 0,3 largeur du centre du plan
const STEP_MAX = 0.25; // pas d'image : part de la largeur du viewBox (0,15 de l'arbre : flaky)
const PLAN_STEP_MAX = 0.12; // pas d'image : part de la hauteur de départ du plan
const SLOW_CAP = 2; // une image lente (charge de la machine) relâche la limite jusqu'à ×2
const FRAME_MS = 20;
const MOVE = 1e-4; // mouvement de caméra perceptible : part de la largeur du viewBox
const DESK_PLAN = { rest: 460, focus: 540 }; // px : hauteur du plan au bureau (arbre S8.B3)
const PHONE_FOCUS_RATIO = 1.15; // téléphone déployé : hauteur du plan en largeurs (:285)
const PLAN_MARGIN = 8; // px entre la barre du haut et le plan (maquette)
const LABEL_TOLERANCE = 2; // px : centre du nom sur celui de l'astre
const isDesk = (kit) => kit.width >= DESKTOP_MIN;
const sameList = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Ajoute `message` à `problems` si `ok` est faux ; rend `problems`. */
export const need = (problems, ok, message) => {
  if (!ok) problems.push(message);
  return problems;
};
export const tagged = (prefix, problems) => problems.map((text) => `${prefix} : ${text}`);

/** Rang de la constellation aux étoiles les plus nombreuses (sauts voisins et lointains). */
export const biggest = (text) => text.groups.reduce(
  (best, group, k) => (group.items.length > text.groups[best].items.length ? k : best),
  0,
);

/** Identifiants des étoiles de la constellation `k`, dans l'ordre du parcours (le DOM). */
export function idsOf(site, text, k) {
  const { items } = text.groups[k];
  return starsOf(groupEls(site)[k])
    .map((star) => items.find((item) => plain(item.name) === starName(star))?.id);
}

export function classProblems(kit, k) {
  const { site } = kit;
  const found = parts(site);
  const problems = [];
  need(problems, isDeployed(site), 'déploiement absent : #skillsLayout sans .focus');
  need(problems, found.svg.classList.contains('focused'), 'svg#constSvg sans .focused');
  need(problems, !found.panel.inert, '.focus-panel encore inert');
  groupEls(site).forEach((el, i) => {
    const mine = i === k;
    const label = `constellation ${i}`;
    need(problems, el.classList.contains('sel') === mine, `${label} : .sel ≠ ${mine}`);
    need(problems, el.classList.contains('dim') !== mine, `${label} : .dim = ${mine}`);
  });
  const role = groupEls(site)[k]?.getAttribute('role');
  return need(problems, role !== 'button', 'constellation choisie encore role="button"');
}

export function panelProblems(kit, k) {
  const { site, text } = kit;
  const group = text.groups[k];
  const p = panelParts(site, text);
  const problems = [];
  const same = (label, el, wanted) => {
    if (!el) problems.push(`${label} introuvable`);
    else if (ownText(el) !== wanted)
      problems.push(`${label} : « ${ownText(el).slice(0, 40)} » au lieu de « ${wanted} »`);
  };
  same('button.back', p.back, plain(text.back));
  same('p.ctitle', p.title, plain(group.title));
  if (!p.box) problems.push(`div.chips[aria-label="${text.chipsLabel}"] introuvable`);
  else {
    need(problems, p.box.getAttribute('role') === 'group', 'puces sans role="group"');
    const names = p.chips.map(ownText).sort();
    need(problems, sameList(names, group.items.map((i) => plain(i.name)).sort()),
      `puces : ${names.length} pour ${group.items.length} étoile(s), ou noms différents`);
  }
  need(problems, !!(p.prev && p.next), `flèches « ${text.prev} », « ${text.next} » absentes`);
  if (isDesk(kit) && p.prev && p.next)
    need(problems, ownText(p.prev) === '←' && ownText(p.next) === '→', 'glyphes ← → absents');
  need(problems, !!p.related, '.related absent');
  const live = p.skill?.getAttribute('aria-live');
  return need(problems, live === 'polite', `#skill : aria-live ${live}`);
}

/** Étoile `index` du parcours courante : .cur, puces, fiche, flèches désactivées au bout. */
export function skillProblems(kit, k, ids, index) {
  const { site, text } = kit;
  const p = panelParts(site, text);
  const item = text.groups[k].items.find((it) => it.id === ids[index]);
  const stars = starsOf(groupEls(site)[k]);
  const problems = [];
  const curs = [...site.doc.querySelectorAll('#constSvg .st-g.cur')];
  need(problems, curs.length === 1 && curs[0] === stars[index],
    `.cur sur ${curs.length} étoile(s), pas sur l'étoile ${index} du parcours`);
  for (const chip of p.chips) {
    const mine = ownText(chip) === plain(item.name);
    need(problems, (chip.getAttribute('aria-pressed') === 'true') === mine,
      `puce « ${ownText(chip)} » : aria-pressed ${chip.getAttribute('aria-pressed')}`);
  }
  const wanted = [
    ['h3', p.h3, plain(item.name)],
    ['.lvl', p.lvl, plain(text.levels[item.level])],
    ['.body', p.body, plain(item.description ?? '')],
  ];
  for (const [label, el, expected] of wanted)
    if (!el) problems.push(`${label} introuvable`);
    else need(problems, ownText(el) === expected, `${label} : « ${ownText(el).slice(0, 9)} »`);
  need(problems, !p.skill?.classList.contains('traveling'), '#skill encore .traveling');
  need(problems, p.prev?.disabled === (index === 0), `flèche précédente à l'étoile ${index}`);
  return need(problems, p.next?.disabled === (index === stars.length - 1),
    `flèche suivante à l'étoile ${index}`);
}

/** Focus sur l'étoile courante ; étoiles focalisables nommées et en role="button". */
export function focusProblems(site) {
  const cur = curStar(site);
  const problems = [];
  need(problems, !!cur && site.doc.activeElement === cur,
    `focus sur ${describe(site.doc.activeElement)}, pas sur l'étoile courante`);
  need(problems, !!cur && cur.tabIndex >= 0, 'étoile courante hors de la tabulation');
  for (const star of starEls(site).filter((s) => s.tabIndex >= 0 && !isInert(site, s))) {
    need(problems, star.getAttribute('role') === 'button', `${describe(star)} sans role`);
    need(problems, !!labelOf(star), `${describe(star)} sans aria-label`);
  }
  return problems.slice(0, 6);
}

/** État complet d'une constellation `k` déployée sur l'étoile `index` (0 : la plongée). */
export function deployedProblems(kit, k, index = 0) {
  const { site, text } = kit;
  const problems = classProblems(kit, k);
  if (problems.length) return problems;
  const ids = idsOf(site, text, k);
  need(problems, ids[0] === text.groups[k].items[0].id, 'parcours : étoile 0 ≠ items[0]');
  return [
    ...problems,
    ...panelProblems(kit, k),
    ...skillProblems(kit, k, ids, index),
    ...focusProblems(site),
  ];
}

/** Demande le saut vers l'étoile `to` par une puce, une flèche ou un clic sur l'étoile. */
export function jumpTo(kit, k, to, how) {
  const { site, text } = kit;
  const stars = starsOf(groupEls(site)[k]);
  const from = stars.indexOf(curStar(site));
  const id = idsOf(site, text, k)[to];
  const name = plain(text.groups[k].items.find((it) => it.id === id).name);
  const p = panelParts(site, text);
  const target = {
    puce: p.chips.find((chip) => ownText(chip) === name),
    flèche: to > from ? p.next : p.prev,
    étoile: stars[to]?.querySelector(':scope > circle'),
  }[how];
  if (!target) throw new Error(`saut par ${how} : cible introuvable`);
  target.focus();
  click(site, target);
  return from;
}
export async function jump(kit, k, to, how) {
  const from = jumpTo(kit, k, to, how);
  await rest(kit.site);
  return from;
}

export function walkProblems(site, k, from, to) {
  const links = [...groupEls(site)[k].querySelectorAll('.link')];
  const marked = links.filter((link) => link.classList.contains('walk'));
  const wanted = Math.abs(to - from) === 1 ? [links[Math.min(from, to)]] : [];
  const same = marked.length === wanted.length && marked.every((el, i) => el === wanted[i]);
  return need([], same, `.link.walk : ${marked.length} lien(s), ${wanted.length} attendu(s)`);
}

export function focusKept(site) {
  const active = site.doc.activeElement;
  return need([], !!active && active !== site.doc.body && parts(site).root.contains(active),
    `focus sur ${active ? describe(active) : 'rien'} après le geste`);
}

/** Plongée : caméra serrée (`before` : vue d'ensemble), astre visible, échelle. */
export function diveProblems(kit, before) {
  const { site } = kit;
  const { svg, panel } = parts(site);
  const frame = svg.getBoundingClientRect();
  const cur = curStar(site);
  if (!cur) return ['plongée absente : aucune étoile courante'];
  const problems = [];
  const camera = cameraOf(site);
  need(problems, camera.w <= DIVE_SHARE * before.w,
    `caméra non serrée : largeur ${camera.w.toFixed(0)} pour ${before.w.toFixed(0)} au repos`);
  const box = cur.querySelector('.body').getBoundingClientRect();
  const at = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const off = Math.hypot(at.x - frame.x - frame.width / 2, at.y - frame.y - frame.height / 2);
  need(problems, off <= DIVE_OFFSET * frame.width, `astre à ${off.toFixed(0)} px du centre`);
  need(problems, area({ left: at.x, right: at.x + 1, top: at.y, bottom: at.y + 1 }, frame) > 0,
    'astre hors du cadre du plan');
  const under = panel.getBoundingClientRect();
  need(problems, !(at.x > under.left && at.x < under.right && at.y > under.top &&
    at.y < under.bottom), 'astre sous le panneau');
  const scale = parseFloat(svg.style.getPropertyValue('--bs'));
  const wanted = FOCUSED_SCALE[isDesk(kit) ? 'desk' : 'phone'];
  return need(problems, scale >= wanted - 0.001, `--bs ${scale} sous l'échelle ${wanted}`);
}

/** Repos complet après le retour ; `before` : caméra et hauteur `plan` d'ensemble. */
export function restProblems(kit, k, before) {
  const { site } = kit;
  const found = parts(site);
  const problems = [];
  need(problems, !isDeployed(site), '#skillsLayout encore .focus');
  need(problems, !found.svg.classList.contains('focused'), 'svg#constSvg encore .focused');
  const left = site.doc.querySelectorAll('#constSvg :is(.sel, .dim, .cur, .walk)').length;
  need(problems, !left, `${left} élément(s) encore .sel, .dim, .cur ou .walk`);
  need(problems, found.panel.inert, '.focus-panel pas inert');
  need(problems, !textOf(found.panel), '.focus-panel non vide au repos');
  groupEls(site).forEach((group, i) => {
    need(problems, group.getAttribute('role') === 'button', `constellation ${i} sans role`);
    const tabbable = group.tabIndex === 0 && !isInert(site, group);
    need(problems, tabbable, `constellation ${i} inerte`);
  });
  const loose = starEls(site).filter((s) => s.getAttribute('tabindex') !== '-1');
  need(problems, !loose.length, `${loose.length} étoile(s) sans tabindex="-1"`);
  const group = groupEls(site)[k];
  need(problems, site.doc.activeElement === group,
    `focus sur ${describe(site.doc.activeElement)}, pas sur la constellation ${k}`);
  const calls = kit.calls.focus.filter((call) => call.el === group);
  need(problems, calls.some((call) => call.args[0]?.preventScroll === true),
    'focus() de la constellation sans { preventScroll: true }');
  problems.push(...cameraProblems('caméra de retour', cameraOf(site), before));
  need(problems, Math.abs(found.svg.getBoundingClientRect().height - before.plan) <= 1,
    'hauteur du plan différente de la vue d\'ensemble');
  return [...problems, ...planProblems(kit, false)];
}

/** Hauteur rendue du plan au repos (`deployed` faux) ou déployé, selon le bureau ou non. */
export function planProblems(kit, deployed) {
  const { site, text, width } = kit;
  const box = parts(site).svg.getBoundingClientRect();
  const grid = gridFor(width, text.groups.length);
  const rest = (box.width * grid.rows * grid.cellHeight) / (grid.cols * grid.cellWidth);
  const wanted = isDesk(kit)
    ? DESK_PLAN[deployed ? 'focus' : 'rest']
    : (deployed ? box.width * PHONE_FOCUS_RATIO : rest);
  return need([], Math.abs(box.height - wanted) <= 1,
    `plan de ${box.height.toFixed(1)} px au lieu de ${wanted.toFixed(1)} px`);
}

/** Couleur calculée du jeton `--name` (rgb), lue sur un élément jetable. */
function tokenColor(site, name) {
  const probe = site.doc.createElement('span');
  probe.style.color = `var(${name})`;
  site.doc.body.append(probe);
  const color = site.win.getComputedStyle(probe).color;
  probe.remove();
  return color;
}

/** Puces : une seule `aria-pressed="true"`, fond --accent et texte --accent-ink (:152). */
export function chipProblems(site, text) {
  const { chips } = panelParts(site, text);
  const problems = [];
  const pressed = chips.filter((chip) => chip.getAttribute('aria-pressed') === 'true');
  need(problems, pressed.length === 1, `${pressed.length} puce(s) en aria-pressed="true"`);
  const [accent, ink] = [tokenColor(site, '--accent'), tokenColor(site, '--accent-ink')];
  for (const chip of chips) {
    const style = site.win.getComputedStyle(chip);
    const on = pressed.includes(chip);
    const label = `puce « ${ownText(chip)} »`;
    need(problems, (style.backgroundColor === accent) === on,
      `${label} : fond ${style.backgroundColor}, --accent ${accent}`);
    need(problems, !on || style.color === ink, `${label} : texte ${style.color}`);
  }
  return problems.slice(0, 4);
}

/** Nom d'une étoile sous son astre (téléphone, plongée) : haut du nom sous le centre. */
export function belowProblems(star) {
  const label = star.querySelector('text.name').getBoundingClientRect();
  const hit = star.querySelector(':scope > circle').getBoundingClientRect();
  const [x, y] = [hit.x + hit.width / 2, hit.y + hit.height / 2];
  const problems = [];
  need(problems, label.top >= y, `nom au-dessus du centre de l'astre (${label.top} < ${y})`);
  const off = Math.abs(label.x + label.width / 2 - x);
  return need(problems, off <= LABEL_TOLERANCE, `nom décentré de ${off.toFixed(1)} px`);
}

/** Début et durée (ms) du mouvement de caméra relevé dans `frames` (0 sans mouvement). */
export function motionOf(frames) {
  let start = null;
  let end = null;
  for (let i = 1; i < frames.length; i++) {
    const [a, b] = [frames[i - 1], frames[i]];
    if (!['cx', 'cy', 'w'].some((key) => Math.abs(b[key] - a[key]) > MOVE * b.w)) continue;
    start ??= a.at;
    end = b.at;
  }
  return { start: start ?? 0, ms: start === null ? 0 : end - start };
}

/** Pas d'une image à l'autre : caméra et, si `withPlan`, hauteur rendue du plan. */
export function stepProblems(label, frames, withPlan = true) {
  const problems = [];
  const plan0 = frames[0].plan;
  for (let i = 1; i < frames.length; i++) {
    const [a, b] = [frames[i - 1], frames[i]];
    const slack = Math.min(SLOW_CAP, Math.max(1, (b.at - a.at) / FRAME_MS));
    for (const key of ['cx', 'cy', 'w'])
      if (Math.abs(b[key] - a[key]) > STEP_MAX * b.w * slack)
        problems.push(`${label}, im. ${i} : ${key} saute de ${(b[key] - a[key]).toFixed(0)}`);
    if (withPlan && Math.abs(b.plan - a.plan) > PLAN_STEP_MAX * plan0 * slack)
      problems.push(`${label}, im. ${i} : plan ${a.plan.toFixed(0)}, ${b.plan.toFixed(0)}`);
  }
  return problems.slice(0, 3);
}

// ---------- Parcours partagés par les fichiers de cas ----------

export const DURATIONS = { deploy: 1950, far: 1400, near: 1400, leave: 1200 };
export const DURATION_SHARE = 0.25; // part de tolérance sur chaque durée
export const uncaught = (site) => site.uncaught.map((e) => `exception non rattrapée : ${e}`);

/** Déploie `k` (de zéro si `fresh`, sinon sans rien faire quand elle l'est déjà). */
export async function ready(kit, k, how = 'clic', fresh = false) {
  const { site, text } = kit;
  const open = site.doc.querySelector('#constSvg .group.sel') === groupEls(site)[k];
  if (isDeployed(site) && open && !fresh) return;
  await leave(site, text);
  await deploy(site, k, how);
}
