/* Barres à l'étroit (sous 16.25em, soit 260 px en police normale) : rien ne sort de l'écran,
FR/EN en colonne, point vert rond, barre d'onglets en icônes seules avec un seul libellé mis en
avant (focus clavier compris), cases d'au moins 24 px, remesure à la bascule de langue ; à
390 px, rendu inchangé.
Limite du banc : la police du navigateur ne se règle pas dans une iframe, et un `font-size`
posé sur <html> ne déplace pas les @media en em : le cas « 300 % » ne s'y reproduit pas. Le
survol se contrôle hors banc (aucun pointeur injecté ici). */
import {
  click,
  describe,
  goTo,
  isVisible,
  openSite,
  readJson,
  settle,
  waitFor,
  waitStatus,
} from './harness.js';
import { capped } from './checks.js';
import { expectEqual, skip, test } from './runner.js';

const GROUP = 'Barres étroites';
const NARROW_WIDTHS = [200, 240];
const SKILLS_WIDTH = 200; // largeur où Compétences, le libellé le plus long, est mis en avant
const REGULAR_WIDTH = 390;
const MIN_CELL = 24; // px : case d'un onglet non mis en avant
const TOLERANCE = 0.5; // px : arrondis de sous-pixel
const DOT_SIZE = 8;
const LANG_RADIUS = '10px';

const labels = (site) => [...site.doc.querySelectorAll('.tabbar span')];
const tabButton = (site, id) => site.doc.querySelector(`.tabbar [data-go="${id}"]`);

/** Attend la fin des transitions et animations finies (le point clignote sans fin). */
async function calm(site) {
  await waitFor(
    () => !site.doc.getAnimations().some(
      (a) => a.playState === 'running' && a.effect?.getComputedTiming().endTime !== Infinity,
    ),
    3000,
    'transitions de la barre',
  );
}

/** Textes des libellés d'onglet visibles (opacité comprise). */
const visibleLabels = (site) => labels(site)
  .filter((span) => isVisible(span))
  .map((span) => span.textContent.trim());

/** Éléments des barres dont la boîte sort de l'écran, ou qui défilent horizontalement. */
function overflowProblems(site) {
  const { doc } = site;
  const width = doc.documentElement.clientWidth;
  const problems = [];
  const nodes = doc.querySelectorAll('.bar, .bar *, .tabbar, .tabbar *');
  for (const node of nodes) {
    if (node.closest('.nav') || !node.getClientRects().length) continue;
    const rect = node.getBoundingClientRect();
    if (rect.left < -TOLERANCE || rect.right > width + TOLERANCE)
      problems.push(
        `${describe(node)} : de ${rect.left.toFixed(1)} à ${rect.right.toFixed(1)} px ` +
          `pour un écran de ${width} px`,
      );
  }
  for (const selector of ['.bar', '.tabbar']) {
    const node = doc.querySelector(selector);
    if (node.scrollWidth > node.clientWidth)
      problems.push(`${selector} : scrollWidth ${node.scrollWidth} > ${node.clientWidth}`);
  }
  return capped(problems);
}

/** Couleur calculée d'une valeur CSS (variable comprise), lue sur un élément jetable. */
function computed(site, property, value) {
  const probe = site.doc.createElement('i');
  probe.style[property] = value;
  site.doc.body.append(probe);
  const result = site.win.getComputedStyle(probe)[property];
  probe.remove();
  return result;
}

function langProblems(site) {
  const lang = site.doc.querySelector('.lang');
  const style = site.win.getComputedStyle(lang);
  const [first, second] = [...lang.querySelectorAll('button')];
  const problems = expectEqual([], '.lang flex-direction', style.flexDirection, 'column');
  expectEqual(problems, '.lang border-radius', style.borderTopLeftRadius, LANG_RADIUS);
  if (second.getBoundingClientRect().top < first.getBoundingClientRect().bottom - TOLERANCE)
    problems.push('FR et EN ne sont pas l\'un sous l\'autre');
  return problems;
}

function dotProblems(site) {
  const rect = site.doc.querySelector('.brand i').getBoundingClientRect();
  const sides = { largeur: rect.width, hauteur: rect.height };
  return Object.entries(sides)
    .filter(([, size]) => Math.abs(size - DOT_SIZE) > TOLERANCE)
    .map(([side, size]) => `.brand i : ${side} ${size.toFixed(1)} px au lieu de ${DOT_SIZE}`);
}

/** Le seul libellé visible est celui de `id`, dans la langue `fr` de `ui`. */
function singleLabelProblems(site, ui, id) {
  const shown = visibleLabels(site);
  if (shown.length === 1 && shown[0] === ui.nav[id]) return [];
  return [`libellés visibles [${shown.join(', ')}] au lieu de [${ui.nav[id]}]`];
}

/**
 * Met `target` dans l'état « focalisé au clavier » et rend la fonction qui le défait.
 * Une page sans focus (Chrome headless du lanceur : ni `:focus` ni événements de focus) ne
 * peut pas l'obtenir : les règles de la barre sont alors rejouées, copie à l'appui, avec la
 * classe `.kbd` à la place de `:focus-visible`.
 */
function focusByKeyboard(site, target) {
  if (site.doc.hasFocus()) {
    target.focus();
    return () => target.blur();
  }
  const rulesOf = (sheet) => {
    try {
      return [...sheet.cssRules];
    } catch {
      return []; // feuille d'une autre origine (polices) : règles illisibles
    }
  };
  const originals = [...site.doc.styleSheets]
    .flatMap(rulesOf)
    .filter((rule) => rule.conditionText?.includes('16.25em'));
  const style = site.doc.createElement('style');
  style.textContent = originals
    .map((rule) => rule.cssText.replaceAll(':focus-visible', '.kbd'))
    .join('\n');
  const media = originals.map((rule) => rule.media.mediaText);
  for (const rule of originals) rule.media.mediaText = 'not all'; // copie seule active
  site.doc.head.append(style);
  target.classList.add('kbd');
  return () => {
    target.classList.remove('kbd');
    style.remove();
    originals.forEach((rule, index) => { rule.media.mediaText = media[index]; });
  };
}

/** Un onglet atteint au clavier est mis en avant, la couleur de sélection reste ailleurs. */
async function keyboardProblems(site, ui, current, other) {
  const target = tabButton(site, other);
  const release = focusByKeyboard(site, target);
  await calm(site);
  const problems = singleLabelProblems(site, ui, other);
  const style = (id) => site.win.getComputedStyle(tabButton(site, id));
  const accent = computed(site, 'color', 'var(--accent)');
  const soft = computed(site, 'backgroundColor', 'var(--accent-soft)');
  expectEqual(problems, `couleur de ${current}`, style(current).color, accent);
  expectEqual(problems, `fond de ${current}`, style(current).backgroundColor, soft);
  if (style(other).color === accent)
    problems.push(`${other} (focalisé) prend la couleur de sélection`);
  if (tabButton(site, other).getAttribute('aria-current'))
    problems.push(`${other} (focalisé) devient la rubrique courante`);
  if (tabButton(site, current).getAttribute('aria-current') !== 'page')
    problems.push(`${current} n'est plus la rubrique courante`);
  release();
  await calm(site);
  problems.push(...singleLabelProblems(site, ui, current).map((p) => `au blur : ${p}`));
  return problems;
}

/** Cases : libellé mis en avant entier dans la sienne, toutes les autres d'au moins 24 px. */
function cellProblems(site, lead) {
  const problems = [];
  const buttons = [...site.doc.querySelectorAll('.tabbar button')];
  for (const button of buttons) {
    const width = button.getBoundingClientRect().width;
    const id = button.dataset.go;
    if (id !== lead && width < MIN_CELL - TOLERANCE)
      problems.push(`${id} : case de ${width.toFixed(1)} px sous ${MIN_CELL} px`);
  }
  const span = tabButton(site, lead).querySelector('span');
  if (span.scrollWidth > span.clientWidth + 1)
    problems.push(`${lead} : libellé rogné (${span.scrollWidth} px dans ${span.clientWidth})`);
  problems.push(...overflowProblems(site));
  return problems;
}

/** Après la bascule en anglais : libellé remesuré, case et police recalculées (`leadBefore` :
 * --lead-w de Compétences en français). */
async function remeasureProblems(site, leadBefore) {
  click(site, site.doc.querySelector('.lang [data-lang="en"]'));
  await waitFor(() => site.doc.documentElement.lang === 'en', 4000, 'bascule en anglais');
  const en = await readJson('data/en.json');
  const button = tabButton(site, 'skills');
  await waitFor(
    () => button.querySelector('span').textContent === en.ui.nav.skills,
    4000,
    'libellé anglais de la barre',
  );
  await calm(site);
  const read = () => ({
    lead: button.style.getPropertyValue('--lead-w'),
    size: button.style.getPropertyValue('--label-size'),
  });
  const after = read();
  const problems = [];
  if (!after.lead) problems.push('--lead-w absent après la bascule');
  else if (after.lead === leadBefore)
    problems.push(`--lead-w inchangé (${after.lead}) malgré un libellé plus court`);
  if (after.size) problems.push(`--label-size ${after.size} gardé pour un libellé qui tient`);
  const width = button.getBoundingClientRect().width;
  if (Math.abs(width - parseFloat(after.lead)) > 1)
    problems.push(`case de ${width.toFixed(1)} px au lieu de ${after.lead}`);
  return [...problems, ...cellProblems(site, 'skills')];
}

/** Cas d'une largeur étroite : barres, point, libellé unique, focus clavier. */
async function runNarrowWidth(width, ui) {
  const ctx = { group: GROUP, width, lang: 'fr', section: 'journey' };
  const names = [
    'aucun débordement de .bar ni de .tabbar',
    'FR/EN en colonne, rayon de 10 px',
    'point vert de 8 × 8 px',
    'un seul libellé visible : la rubrique courante',
  ];
  const keyboardName = 'focus clavier : onglet mis en avant, sélection sur la rubrique ' +
    'courante';
  const skillsNames = [
    'Compétences mis en avant : autres cases d\'au moins 24 px, libellé entier',
    'bascule en anglais : cases et libellé remesurés',
  ];
  let site;
  try {
    site = await openSite({ width });
    await waitStatus(site, 'ready');
    await settle(site, 'home');
    await goTo(site, 'journey');
    await calm(site);
  } catch (error) {
    site?.close();
    const all = width === SKILLS_WIDTH ? [...names, ...skillsNames, keyboardName]
      : [...names, keyboardName];
    skip(ctx, all, `ouverture du site impossible (${error.message})`);
    return;
  }
  try {
    await test(ctx, names[0], () => overflowProblems(site));
    await test(ctx, names[1], () => langProblems(site));
    await test(ctx, names[2], () => dotProblems(site));
    await test(ctx, names[3], () => singleLabelProblems(site, ui, 'journey'));
    await test(ctx, keyboardName, () => keyboardProblems(site, ui, 'journey', 'skills'));
    if (width === SKILLS_WIDTH) {
      await goTo(site, 'skills');
      await calm(site);
      const before = tabButton(site, 'skills').style.getPropertyValue('--lead-w');
      const at = { ...ctx, section: 'skills' };
      await test(at, skillsNames[0], () => cellProblems(site, 'skills'));
      await test(at, skillsNames[1], () => remeasureProblems(site, before));
    }
    await test(
      { ...ctx, section: null },
      'aucune exception non rattrapée',
      () => site.uncaught.map((e) => `exception non rattrapée : ${e}`),
    );
  } finally {
    site.close();
  }
}

/** À 390 px : cinq libellés visibles, FR/EN en ligne, aucune mesure posée. */
async function runRegularWidth(ui) {
  const ctx = { group: GROUP, width: REGULAR_WIDTH, lang: 'fr', section: 'journey' };
  const name = 'rendu inchangé : cinq libellés, FR/EN en ligne, point de 8 × 8 px';
  let site;
  try {
    site = await openSite({ width: REGULAR_WIDTH });
    await waitStatus(site, 'ready');
    await settle(site, 'home');
    await goTo(site, 'journey');
    await calm(site);
  } catch (error) {
    site?.close();
    skip(ctx, [name], `ouverture du site impossible (${error.message})`);
    return;
  }
  try {
    await test(ctx, name, () => {
      const shown = visibleLabels(site);
      const expected = ['home', 'journey', 'skills', 'projects', 'contact']
        .map((id) => ui.nav[id]);
      const problems = [];
      if (shown.join() !== expected.join())
        problems.push(`libellés visibles [${shown.join(', ')}] au lieu de [${expected}]`);
      const lang = site.win.getComputedStyle(site.doc.querySelector('.lang'));
      expectEqual(problems, '.lang flex-direction', lang.flexDirection, 'row');
      expectEqual(problems, '.tabbar display', site.win.getComputedStyle(
        site.doc.querySelector('.tabbar'),
      ).display, 'grid');
      const measured = [...site.doc.querySelectorAll('.tabbar button')]
        .filter((button) => button.style.getPropertyValue('--lead-w'));
      if (measured.length) problems.push(`--lead-w posé sur ${measured.map(describe)}`);
      return [...problems, ...dotProblems(site), ...overflowProblems(site)];
    });
  } finally {
    site.close();
  }
}

/** Cas des barres à l'étroit (groupe `etroit`). */
export async function runNarrow() {
  const { ui } = await readJson('data/fr.json');
  for (const width of NARROW_WIDTHS) await runNarrowWidth(width, ui);
  await runRegularWidth(ui);
}
