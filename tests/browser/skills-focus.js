/* Compétences (S8.B3), DÉPLOIEMENT d'une constellation : plongée sur une étoile, saut
d'étoile, retour, clavier, Échap, mouvement réduit, bascule de langue. Cas écrits avant le code
(S8.C5 panneau, S8.C6 caméra) : sans déploiement, chacun rend « déploiement absent ». Contrat,
critères et durées : README.md, groupe competences ; mesures : skills-focus-probe.js ; noms des
astres : skills-focus-names.js ; mouvement réel : skills-focus-motion.js.
Cas fonctionnels : mouvement réduit. Entrée et Espace natifs d'un button ne s'injectent pas :
on contrôle que ce sont des button focalisables. */
import { overflowProblems, targetProblems } from './checks.js';
import { click, describe, waitFor } from './harness.js';
import { noForeignText, switchTo } from './language.js';
import { IMMEDIATE_MS, press, pressEscape } from './projects-probe.js';
import { recordExceptions, skip, test } from './runner.js';
import {
  activate,
  biggest,
  cameraOf,
  cameraProblems,
  chipProblems,
  classProblems,
  curStar,
  deploy,
  deployedProblems,
  diveProblems,
  focusKept,
  idsOf,
  isDeployed,
  jump,
  jumpTo,
  leave,
  need,
  panelParts,
  panelProblems,
  planProblems,
  ready,
  restProblems,
  skillProblems,
  spyCalls,
  tabOrder,
  tagged,
  uncaught,
  walkProblems,
} from './skills-focus-probe.js';
import { nameCases } from './skills-focus-names.js';
import { runLeaveHeight } from './skills-focus-leave.js';
import { runMotion } from './skills-focus-motion.js';
import {
  groupEls,
  openSkillsSite,
  parts,
  rest,
  skillsData,
  sleep,
  starEls,
  starsOf,
} from './skills-probe.js';

const GROUP = 'Compétences';
const LANGS = ['fr', 'en'];
const HOWS = ['clic', 'Entrée', 'Espace'];
const PHONE_WIDTHS = [320, 390, 430];
const REAL_WIDTHS = [390, 1280];
const LEAVE_WIDTHS = [320, 390]; // retour en mouvement réel : téléphone seulement
const WIDE_WIDTH = 2560;

// ---------- Déploiement et plongée ----------

async function deployCases(kit) {
  const { site, ctx, text } = kit;
  for (const [n, how] of HOWS.entries())
    await test(ctx, `déploiement par ${how} : classes, panneau, étoile 0, fiche, focus`,
      async () => {
        await ready(kit, n * 2, how, true);
        return [...deployedProblems(kit, n * 2), ...planProblems(kit, true)];
      });
  await test(ctx, 'puces : une seule aria-pressed, fond --accent et texte --accent-ink',
    async () => {
      await ready(kit, 1, 'clic', true);
      return chipProblems(site, text);
    });
  await test(ctx, 'autres constellations : .dim (opacité .06, sans pointeur), hors tabulation',
    async () => {
      await ready(kit, 0, 'clic', true);
      const problems = [];
      const order = tabOrder(site);
      groupEls(site).slice(1).forEach((group, i) => {
        const style = site.win.getComputedStyle(group);
        const label = `constellation ${i + 1}`;
        need(problems, style.opacity === '0.06', `${label} : opacité ${style.opacity}`);
        need(problems, style.pointerEvents === 'none', `${label} : pointeur actif`);
        const hit = order.filter((el) => group.contains(el));
        need(problems, !hit.length, `${label} : ${hit.length} élément(s) tabulable(s)`);
      });
      return problems.slice(0, 8);
    });
  await test(ctx, 'plongée : astre dans la zone libre, caméra serrée, échelle atteinte',
    async () => {
      await leave(site, text);
      const before = cameraOf(site);
      await deploy(site, 0, 'clic');
      return diveProblems(kit, before);
    });
}

// ---------- Sauts d'étoile ----------

/** Première paire d'étoiles de même niveau (rangs a < b du parcours) : { k, a, b } ou null. */
function sameLevelPair(site, text) {
  for (let k = 0; k < text.groups.length; k++) {
    const levels = idsOf(site, text, k)
      .map((id) => text.groups[k].items.find((item) => item.id === id).level);
    for (let b = 1; b < levels.length; b++) {
      const a = levels.indexOf(levels[b]);
      if (a < b) return { k, a, b };
    }
  }
  return null;
}

async function jumpCases(kit) {
  const { site, ctx, text } = kit;
  const k = biggest(text);
  const last = text.groups[k].items.length - 1;
  const run = (name, steps, how) => test(ctx, name, async () => {
    await ready(kit, k, 'clic', true);
    const ids = idsOf(site, text, k);
    const problems = [];
    for (const to of steps) {
      const from = await jump(kit, k, to, how);
      problems.push(...tagged(`${how} ${from}→${to}`, [
        ...skillProblems(kit, k, ids, to),
        ...walkProblems(site, k, from, to),
        ...focusKept(site),
      ]));
    }
    return problems.slice(0, 8);
  });
  await run('saut par puce, voisine et lointaine : .cur, aria-pressed, fiche, lien parcouru',
    [1, last, 2], 'puce');
  await run('saut par flèche suivante puis précédente : mêmes états', [1, 2, 1], 'flèche');
  await run('saut par clic sur une étoile : mêmes états', [2, 3], 'étoile');
  await test(ctx, 'étoile focalisée : Entrée et Espace sautent', async () => {
    await ready(kit, k, 'clic', true);
    const ids = idsOf(site, text, k);
    const stars = starsOf(groupEls(site)[k]);
    const open = stars.filter((s) => s !== curStar(site)).slice(0, 2);
    const problems = need([], open.length === 2, `${open.length} étoile(s) non courante(s)`);
    for (const [key, star] of [['Enter', open[0]], [' ', open[1] ?? open[0]]]) {
      if (!star) continue;
      star.focus();
      press(site, star, key);
      await rest(site);
      const to = stars.indexOf(star);
      problems.push(...tagged(`touche « ${key} »`, skillProblems(kit, k, ids, to)));
    }
    return problems;
  });
  await test(ctx, '#skill (aria-live) : seul le contenu qui change est écrit', async () => {
    const pair = sameLevelPair(site, text);
    if (!pair) return ['aucune paire d\'étoiles de même niveau dans les données'];
    await ready(kit, pair.k, 'clic', true);
    await jump(kit, pair.k, pair.a, 'puce');
    const { skill } = panelParts(site, text);
    const records = [];
    const watcher = new site.win.MutationObserver((list) => records.push(...list));
    watcher.observe(skill, {
      subtree: true,
      childList: true,
      characterData: true,
      characterDataOldValue: true,
      attributes: true,
    });
    const problems = [];
    await jump(kit, pair.k, pair.a, 'puce'); // l'étoile courante : rien ne change
    need(problems, !records.length, `étoile courante : ${records.length} écriture(s)`);
    await jump(kit, pair.k, pair.b, 'puce'); // même niveau : seuls le nom et la fiche changent
    watcher.disconnect();
    const texts = records.filter((r) => r.type !== 'attributes');
    const owner = (record) => record.target.closest
      ? record.target
      : record.target.parentElement;
    const within = (selector) => texts.filter((r) => owner(r)?.closest(selector));
    need(problems, !within('.arrows').length, 'flèches : texte réécrit');
    need(problems, !within('.lvl').length, 'niveau réécrit alors qu\'il ne change pas');
    const same = texts
      .filter((r) => r.type === 'characterData' && r.oldValue === r.target.data);
    need(problems, !same.length, `${same.length} texte(s) réécrit(s) à l'identique`);
    const after = panelParts(site, text);
    need(problems, after.skill === skill && !skill.contains(after.back), '#skill remplacé');
    return problems;
  });
  await arrowCases(kit, k);
}

async function arrowCases(kit, k) {
  const { site, ctx, text } = kit;
  const last = text.groups[k].items.length - 1;
  await test(ctx, 'flèches désactivées aux deux bouts : opacity .3, curseur, hors tabulation',
    async () => {
      await ready(kit, k, 'clic', true);
      const problems = [];
      for (const [index, side] of [[0, 'prev'], [last, 'next']]) {
        if (index) await jump(kit, k, index, 'puce');
        const button = panelParts(site, text)[side];
        if (!button) return [`flèche ${side} introuvable`];
        const style = site.win.getComputedStyle(button);
        need(problems, button.disabled, `flèche ${side} : active à l'étoile ${index}`);
        need(problems, style.opacity === '0.3', `flèche ${side} : opacité ${style.opacity}`);
        need(problems, style.cursor === 'default', `flèche ${side} : curseur ${style.cursor}`);
        need(problems, !tabOrder(site).includes(button), `flèche ${side} dans la tabulation`);
      }
      return problems;
    });
  await test(ctx, 'flèche devenue désactivée : le focus passe à l\'autre flèche', async () => {
    await ready(kit, k, 'clic', true);
    const problems = [];
    for (const [index, side, other] of [[last - 1, 'next', 'prev'], [1, 'prev', 'next']]) {
      await jump(kit, k, index, 'puce');
      const button = panelParts(site, text)[side];
      button.focus();
      click(site, button);
      await rest(site);
      const active = site.doc.activeElement;
      need(problems, active === panelParts(site, text)[other],
        `flèche ${side} désactivée : focus sur ${describe(active)}, pas sur ${other}`);
    }
    return problems;
  });
}

// ---------- Retour ----------

async function leaveCases(kit) {
  const { site, ctx, text } = kit;
  const k = 2;
  for (const how of ['bouton', 'Échap'])
    await test(ctx, `retour par ${how} : repos complet, focus à la constellation`,
      async () => {
      await leave(site, text);
      const plan = parts(site).svg.getBoundingClientRect().height;
      const before = { ...cameraOf(site), plan };
      await deploy(site, k, 'clic');
      kit.calls.focus.length = 0;
      const { back } = panelParts(site, text);
      if (how === 'bouton' && back) {
        back.focus();
        click(site, back);
      } else pressEscape(site);
      await waitFor(() => !isDeployed(site), 800, 'retour').catch(() => {});
      await rest(site);
      return isDeployed(site) ? [`retour par ${how} : encore déployée`]
        : restProblems(kit, k, before);
    });
  await test(ctx, 'Échap au repos : aucun effet', async () => {
    await leave(site, text);
    const group = groupEls(site)[1];
    group.focus();
    const before = cameraOf(site);
    pressEscape(site);
    await sleep(IMMEDIATE_MS);
    return [
      ...need([], !isDeployed(site) && site.doc.activeElement === group, 'Échap a agi'),
      ...cameraProblems('caméra', cameraOf(site), before),
    ];
  });
}

// ---------- Clavier ----------

async function keyboardCases(kit) {
  const { site, ctx, text } = kit;
  const k = biggest(text);
  await test(ctx, 'Tab : étoile courante, panneau, sans entrer dans une constellation .dim',
    async () => {
      await ready(kit, k, 'clic', true);
      const order = tabOrder(site);
      const p = panelParts(site, text);
      const cur = curStar(site);
      const problems = [];
      need(problems, order.includes(cur), 'étoile courante hors de la tabulation');
      for (const dim of site.doc.querySelectorAll('#constSvg .dim'))
        need(problems, !order.some((el) => dim.contains(el)), `${describe(dim)} tabulable`);
      const panel = [p.back, ...p.chips, p.prev, p.next].filter((el) => el && !el.disabled);
      const at = (el) => order.indexOf(el);
      need(problems, panel.every((el, i) => at(el) > (i ? at(panel[i - 1]) : at(cur))),
        'panneau absent ou dans le désordre (étoile, retour, puces, flèches)');
      return problems;
    });
  await test(ctx, 'plongée : seule l\'étoile courante est tabulable, les puces le restent',
    async () => {
      await ready(kit, k, 'clic', true);
      const order = tabOrder(site);
      const cur = curStar(site);
      const stars = starsOf(groupEls(site)[k]);
      const loose = stars.filter((star) => star !== cur && order.includes(star));
      const problems = need([], !!cur && order.includes(cur), 'étoile courante non tabulable');
      need(problems, !loose.length,
        `${loose.length} étoile(s) non courante(s) tabulable(s) sur ${stars.length - 1}`);
      const wrong = stars.filter((star) => star !== cur && star.tabIndex !== -1);
      need(problems, !wrong.length,
        `${wrong.length} étoile(s) non courante(s) sans tabIndex -1`);
      const chips = panelParts(site, text).chips;
      need(problems, chips.length > 0, 'aucune puce');
      const lost = chips.filter((chip) => !order.includes(chip));
      return need(problems, !lost.length, `${lost.length} puce(s) hors de la tabulation`);
    });
  await test(ctx, 'retour, puces et flèches : des button focalisables (Entrée, Espace natifs)',
    async () => {
      await ready(kit, k, 'clic');
      const p = panelParts(site, text);
      const problems = need([], !!p.back && p.chips.length > 0, 'panneau absent ou sans puce');
      for (const el of [p.back, ...p.chips, p.prev, p.next].filter(Boolean)) {
        el.focus();
        need(problems, el.localName === 'button', `${describe(el)} n'est pas un button`);
        const focused = site.doc.activeElement === el;
        need(problems, el.disabled || focused, `${describe(el)} sans focus`);
      }
      return problems;
    });
  await test(ctx, 'flèches du clavier sur la page : aucun changement d\'étoile', async () => {
    await ready(kit, k, 'clic', true);
    const cur = curStar(site);
    for (const target of [site.doc.body, site.doc, cur])
      for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'])
        target.dispatchEvent(new site.win.KeyboardEvent('keydown', { key, bubbles: true }));
    await rest(site);
    return need([], curStar(site) === cur && isDeployed(site), 'une flèche change d\'étoile');
  });
}

// ---------- Mouvement réduit ----------

async function motionCases(kit) {
  const { site, ctx, text } = kit;
  const k = biggest(text);
  const requested = () => site.loops.requests;
  await test(ctx, 'mouvement réduit : déploiement et plongée en une seule image', async () => {
    await leave(site, text);
    const asked = requested();
    await activate(site, groupEls(site)[k], 'Entrée');
    await sleep(IMMEDIATE_MS);
    const early = cameraOf(site);
    const problems = deployedProblems(kit, k);
    need(problems, requested() === asked, `${requested() - asked} requestAnimationFrame`);
    await rest(site);
    return [
      ...problems,
      ...planProblems(kit, true),
      ...cameraProblems('caméra à 120 ms', early, cameraOf(site)),
    ];
  });
  await test(ctx, 'mouvement réduit : saut et retour d\'une seule image', async () => {
    await ready(kit, k, 'clic', true);
    const asked = requested();
    const ids = idsOf(site, text, k);
    jumpTo(kit, k, 2, 'puce');
    await sleep(IMMEDIATE_MS);
    const problems = tagged('saut', skillProblems(kit, k, ids, 2));
    const { back } = panelParts(site, text);
    if (back) click(site, back);
    await sleep(IMMEDIATE_MS);
    need(problems, !isDeployed(site) && parts(site).panel.inert, 'retour pas fini à 120 ms');
    return need(problems, requested() === asked, `${requested() - asked} rAF demandé(s)`);
  });
  await test(ctx, 'mouvement réduit : scrollTo, scrollIntoView en behavior auto', async () => {
    await leave(site, text);
    kit.calls.scroll.length = 0;
    await deploy(site, k, 'clic');
    await jump(kit, k, 2, 'flèche');
    await leave(site, text);
    const smooth = kit.calls.scroll.filter((call) => call.args[0]?.behavior === 'smooth');
    return need([], !smooth.length, `${smooth.length} défilement(s) smooth`);
  });
  await test(ctx, 'mouvement réduit : boucles des astres et transition du plan coupées (CSS)',
    () => {
      const readable = (sheet) => {
        try {
          return [...sheet.cssRules];
        } catch {
          return []; // feuille d'une autre origine
        }
      };
      const rules = [...site.doc.styleSheets].flatMap(readable)
        .filter((rule) => /prefers-reduced-motion:\s*reduce/.test(rule.conditionText ?? ''))
        .flatMap((rule) => [...rule.cssRules]);
      const cut = (el, property) => rules
        .some((rule) => el.matches(rule.selectorText) && rule.style?.[property] === 'none');
      site.motion.set(false); // la feuille jetable du banc couperait déjà les boucles
      const animated = '#skills :is(.b-glow, .b-spin, .b-drift, .b-lava)';
      const loops = [...site.doc.querySelectorAll(animated)]
        .filter((el) => site.win.getComputedStyle(el).animationName !== 'none');
      site.motion.set(true);
      const loose = loops.filter((el) => !cut(el, 'animationName'));
      const problems = need([], loops.length > 0, 'aucun astre animé trouvé');
      need(problems, !loose.length, `${loose.length} boucle(s) sans animation: none`);
      return need(problems, cut(parts(site).svg, 'transitionProperty'), 'transition du plan');
    });
}

// ---------- Bascule de langue ----------

async function switchCases(kit) {
  const { site, ctx, text, datas, lang } = kit;
  const other = lang === 'fr' ? 'en' : 'fr';
  const k = biggest(text);
  const nodesOf = () => [...groupEls(site), ...starEls(site), ...[parts(site).panel]];
  await test(ctx, `bascule en ${other} puis ${lang} en déploiement : même état, textes`,
    async () => {
      await ready(kit, k, 'clic', true);
      const ids = idsOf(site, text, k);
      await jump(kit, k, 2, 'puce');
      const cur = curStar(site);
      cur.focus();
      const [nodes, before] = [nodesOf(), cameraOf(site)];
      const problems = [];
      for (const to of [other, lang]) {
        await switchTo(site, to);
        await rest(site);
        const here = { ...kit, text: datas[to] };
        const after = nodesOf();
        need(problems, nodes.length === after.length && nodes.every((n, i) => n === after[i]),
          `${to} : nœuds remplacés`);
        need(problems, curStar(site) === cur && site.doc.activeElement === cur,
          `${to} : étoile courante ou focus perdu`);
        problems.push(...tagged(to, [
          ...classProblems(here, k),
          ...panelProblems(here, k),
          ...skillProblems(here, k, ids, 2),
          ...cameraProblems('caméra', cameraOf(site), before),
          ...await noForeignText(site, to),
        ]));
      }
      return problems.slice(0, 8);
    });
}

// ---------- Hygiène ----------

async function hygieneCases(kit) {
  const { site, ctx, text } = kit;
  const k = biggest(text);
  await test(ctx, 'déploiement : aucun débordement horizontal (scrollWidth <= clientWidth)',
    async () => {
      await ready(kit, k, 'clic', true);
      return overflowProblems(site);
    });
  await test(ctx, 'déploiement : cibles de 44 px (flèches ; .back et puces exceptées)',
    async () => {
      await ready(kit, k, 'clic');
      const { problems, exceptions } = targetProblems(site, [parts(site).panel]);
      recordExceptions(ctx, exceptions);
      return problems;
    });
}

// ---------- Lancement ----------

/** Site réduit de `width` px : kit des cas fonctionnels, ou null (cas « non joué »). */
async function openKit(width, lang, datas) {
  const ctx = { group: GROUP, section: 'skills', width, lang };
  try {
    const site = await openSkillsSite(width, { lang, reduce: true, loops: true });
    return { site, ctx, text: datas[lang], datas, lang, width, calls: spyCalls(site) };
  } catch (error) {
    skip(ctx, ['ouverture du site sur Compétences'], `ouverture : ${error.message}`);
    return null;
  }
}

async function runSite(width, lang, datas) {
  const kit = await openKit(width, lang, datas);
  if (!kit) return;
  try {
    await deployCases(kit);
    await jumpCases(kit);
    await leaveCases(kit);
    await keyboardCases(kit);
    await motionCases(kit);
    await switchCases(kit);
    await hygieneCases(kit);
    if (PHONE_WIDTHS.includes(width)) await nameCases(kit);
    await test(kit.ctx, 'aucune exception non rattrapée', () => uncaught(kit.site));
  } finally {
    kit.site.close();
  }
}

/** Cas à 2560 px : déploiement, retour et débordement (français, mouvement réduit). */
async function runWide(datas) {
  const kit = await openKit(WIDE_WIDTH, 'fr', datas);
  if (!kit) return;
  try {
    await deployCases(kit);
    await leaveCases(kit);
    await hygieneCases(kit);
    await test(kit.ctx, 'aucune exception non rattrapée', () => uncaught(kit.site));
  } finally {
    kit.site.close();
  }
}

/**
 * Déploiement des constellations : cas par largeur et langue (mouvement réduit), noms des
 * astres à 320, 390 et 430 px, mouvement réel à 390 et 1280 px, 2560 px avec la principale.
 */
export async function runSkillsFocus(widths, mainWidth) {
  const datas = await skillsData();
  for (const width of widths) {
    for (const lang of LANGS) await runSite(width, lang, datas);
    if (REAL_WIDTHS.includes(width)) await runMotion(width, datas);
    if (LEAVE_WIDTHS.includes(width)) await runLeaveHeight(width, datas);
  }
  if (widths.includes(mainWidth)) await runWide(datas);
}
