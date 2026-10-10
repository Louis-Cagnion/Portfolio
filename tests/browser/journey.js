/* Parcours (S7). Contrat (plan.md:124 : ouverture sur la position actuelle, flèches seules
sur téléphone, toucher de l'escale actuelle qui descend à sa fiche) :
- section#journey : h2, p.lede (lede.pointer ; lede.arrows à 700 px et moins, maquette:643),
  div.jstage [svg.traj[role=group][aria-label=stopsLabel] : path.track, path.done, g.wp
  [tabindex=0][role=button][aria-label="titre, date"] (circle.hit, circle.pulse sur now seul,
  g.stop.<body>, text + text.y ; .future après now, .dest dernier, .sel actuelle), g.ship-g ;
  div.jtitle (b, span) ; div.stage-arrows (2 button ↑ ↓)], article.hud.detail[aria-live]
  (h3, .when, .count = counter, div.arrows 2 button ← →, div.body > p) (maquette:370-387,
  653-666, 696-703 ; checklist:154) ; css/journey.css chargé ;
- bureau : viewBox 0 0 1100 300, .jtitle et .stage-arrows masqués (maquette:141, 646) ;
  téléphone (700 px et moins) : svg.traj.vertical, scène collante 58svh, .jtitle à 112 / 62,
  flèches à droite à 36 %, fiche remontée de 20svh (maquette:317-331, 586, 642) ;
- flèches 44 × 44, désactivées aux bornes, focus à l'autre flèche (checklist:149, 314), pas
  de raccourci ArrowLeft/Right (checklist:313) ; toucher de l'actuelle sur téléphone : descente
  à la fiche sans rejouer le trajet (maquette:688-693) ; SVG exemptés (checklist:269). */
import { click, settle } from './harness.js';
import { overflowProblems, targetProblems } from './checks.js';
import { noForeignText, switchTo } from './language.js';
import { recordExceptions, test } from './runner.js';
import {
  EDGE_WIDTHS,
  LONG_WORD,
  arrowPairs,
  context,
  detailProblems,
  editedFetch,
  eventually,
  hitProblems,
  journeyData,
  layoutProblems,
  mountedProblems,
  nowIndex,
  panelProblems,
  phone,
  positionProblems,
  sleep,
  structureProblems,
  stylesheetProblems,
  textProblems,
  uncaught,
  view,
  withJourney,
  wps,
} from './journey-probe.js';
import {
  runDesktopTouch,
  runKeyboard,
  runLanguageMidway,
  runPhoneTouch,
  runRapid,
  runResize,
  walkProblems,
} from './journey-moves.js';

const WIDTH_CASES = {
  open: 'ouverture centrée sur l\'escale actuelle (fiche, vaisseau, cadrage, flèches)',
  layout: 'mise en page de la scène et de la fiche',
  hit: 'zone cliquable de l\'escale actuelle',
  text: 'textes français issus des données',
  panel: 'aucun panneau « Contenu indisponible » dans la rubrique',
  walk: 'flèches : de la première à la dernière escale et retour',
  targets: 'cibles de 44 px (flèches ; zones SVG en exception)',
  overflowFr: 'aucun débordement horizontal (fr)',
  switchEn: 'bascule en anglais : position gardée, textes anglais',
  foreign: 'bascule en anglais : aucun texte français visible',
  overflowEn: 'aucun débordement horizontal (en)',
  back: 'retour en français : position gardée',
  errors: 'aucune exception non rattrapée',
};

/** Cas d'une largeur : ouverture, textes, mise en page, flèches, cibles, débordement. */
async function runWidth(width) {
  const ctx = context(width);
  const en = { ...ctx, lang: 'en' };
  const names = WIDTH_CASES;
  await withJourney(ctx, Object.values(names), {}, async (site) => {
    const fr = await journeyData('fr');
    const english = await journeyData('en');
    const now = nowIndex(fr);
    const atNow = (data) => eventually(() => positionProblems(site, data, now, width));
    const switched = async (lang, data) => {
      await switchTo(site, lang);
      await settle(site, 'journey');
      return [...await atNow(data), ...textProblems(site, data, width)];
    };
    const mounted = (problems) => [...mountedProblems(site), ...problems];
    await test(ctx, names.open, () => atNow(fr));
    await test(ctx, names.layout, () => layoutProblems(site, width));
    await test(ctx, names.hit, () => hitProblems(site, fr, width));
    await test(ctx, names.text, () => textProblems(site, fr, width));
    await test(ctx, names.panel, () => panelProblems(site));
    await test(ctx, names.walk, () => walkProblems(site, fr, width));
    await test(ctx, names.targets, () => {
      const { problems, exceptions } = targetProblems(site, [view(site)]);
      recordExceptions(ctx, exceptions);
      return mounted(problems);
    });
    await test(ctx, names.overflowFr, () => mounted(overflowProblems(site)));
    await test(en, names.switchEn, () => switched('en', english));
    await test(en, names.foreign, async () => [
      ...(wps(site).length ? [] : ['aucune escale rendue : texte non jugé']),
      ...await noForeignText(site, 'en'),
    ]);
    await test(en, names.overflowEn, () => mounted(overflowProblems(site)));
    await test(ctx, names.back, () => switched('fr', fr));
    await test(ctx, names.errors, () => mounted(uncaught(site)));
  });
}

/** Structure DOM de la maquette et feuille de style, à la largeur `width`. */
async function runStructure(width) {
  const ctx = context(width);
  const names = [
    'structure DOM de la maquette (scène, tracé, escales, fiche)',
    'css/journey.css chargé',
  ];
  await withJourney(ctx, names, {}, async (site) => {
    await test(ctx, names[0], async () => structureProblems(site, await journeyData('fr')));
    await test(ctx, names[1], () => stylesheetProblems(site));
  });
}

const markNow = (index) => (journey) => {
  journey.stops.forEach((stop, at) => {
    stop.now = at === (index < 0 ? journey.stops.length - 1 : index);
  });
};
const stopsEdits = {
  'une seule escale (now)': (journey) => {
    const only = journey.stops.find((stop) => stop.now);
    journey.stops = [{ ...only, at: 0 }];
  },
  'escale actuelle en première position': markNow(0),
  'escale actuelle en dernière position': markNow(-1),
};

/** Un pas depuis l'escale actuelle (ou les deux flèches s'il n'y a qu'une escale). */
async function editedProblems(site, journey, width) {
  const now = nowIndex(journey);
  const at = (index) => eventually(() => positionProblems(site, journey, index, width));
  const problems = await at(now);
  const pair = arrowPairs(site).visible;
  if (!pair) return [...problems, 'aucune paire de flèches affichée'];
  if (journey.stops.length > 1) {
    const dir = now === 0 ? 1 : -1;
    click(site, pair[dir > 0 ? 1 : 0]);
    return [...problems, ...await at(now + dir)];
  }
  pair.forEach((button) => click(site, button));
  await sleep(200);
  problems.push(...await at(0));
  const only = wps(site)[0];
  if (only) click(site, only.querySelector('.hit'));
  await sleep(200);
  return [...problems, ...positionProblems(site, journey, 0, width)];
}

/** Une seule escale, escale actuelle en première ou en dernière position. */
async function runEdited(width) {
  const ctx = context(width);
  for (const [label, edit] of Object.entries(stopsEdits)) {
    const name = `${label} : ouverture, flèches aux bornes et pas vers l'autre escale ` +
      `(${width} px)`;
    let journey = null;
    const fetch = editedFetch((data, lang) => {
      edit(data);
      if (lang === 'fr') journey = data;
    });
    await withJourney(ctx, [name], { fetch }, (site) => test(ctx, name, async () => [
      ...await editedProblems(site, journey, width),
      ...panelProblems(site),
      ...uncaught(site),
    ]));
  }
}

/** Mot de 70 lettres dans la fiche de l'escale actuelle, à 320 px. */
async function runLongWord() {
  const width = 320;
  const ctx = context(width);
  const name = 'mot de 70 lettres dans la fiche de l\'escale actuelle à 320 px : ' +
    'aucun débordement';
  let journey = null;
  const fetch = editedFetch((data, lang) => {
    const stop = data.stops.find((item) => item.now);
    stop.paragraphs[0] = `${LONG_WORD} ${stop.paragraphs[0]}`;
    if (lang === 'fr') journey = data;
  });
  await withJourney(ctx, [name], { fetch }, (site) => test(ctx, name, async () => [
    ...await eventually(() => detailProblems(site, journey, nowIndex(journey), width)),
    ...overflowProblems(site),
  ]));
}

/** Mise en page et position seules aux largeurs de part et d'autre de 700 et de 880 px. */
async function runEdge(width) {
  const ctx = context(width);
  const kind = phone(width) ? 'parcours vertical' : 'parcours horizontal';
  const name = `rupture : ${kind} à ${width} px`;
  await withJourney(ctx, [name], {}, (site) => test(ctx, name, async () => {
    const fr = await journeyData('fr');
    return [
      ...await eventually(() => positionProblems(site, fr, nowIndex(fr), width)),
      ...layoutProblems(site, width),
      ...overflowProblems(site),
    ];
  }));
}

/**
 * @brief Groupe « Parcours » : ouverture, flèches, toucher, clavier, langue, 44 px,
 *   débordement, cas limites (une escale, now en bord, clics rapides, ruptures, redimension).
 *
 * @param {number[]} widths largeurs jouées
 * @param {number} mainWidth largeur des cas qui ne dépendent pas de la mise en page
 */
export async function runJourney(widths, mainWidth) {
  await runStructure(mainWidth);
  for (const width of widths) await runWidth(width);
  for (const width of EDGE_WIDTHS) await runEdge(width);
  const phones = widths.filter(phone);
  const desktops = widths.filter((width) => !phone(width));
  for (const width of phones) await runPhoneTouch(width);
  for (const width of desktops) await runDesktopTouch(width);
  for (const width of new Set([mainWidth, ...desktops.slice(-1)])) {
    await runKeyboard(width);
    await runRapid(width);
    await runLanguageMidway(width);
    await runEdited(width);
  }
  await runLongWord();
  await runResize();
}
