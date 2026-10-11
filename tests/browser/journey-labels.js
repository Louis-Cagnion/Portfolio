/* Parcours : libellés des escales (titre et date en <text> SVG). Un libellé plus long que la
place disponible est tronqué par une ellipse « … » ; le texte complet reste dans l'aria-label
de l'escale et dans la fiche, et un libellé des données réelles n'est jamais touché. Aucun
libellé ne sort de la scène, aucun débordement horizontal de la page. */
import { overflowProblems } from './checks.js';
import { switchTo } from './language.js';
import { test } from './runner.js';
import {
  LONG_WORD,
  TOL,
  all,
  context,
  detailProblems,
  editedFetch,
  eventually,
  journeyData,
  mountedProblems,
  nowIndex,
  one,
  phone,
  withJourney,
  wps,
} from './journey-probe.js';

const ELLIPSIS = '…';
const LONG_TITLE = 'a'.repeat(70); // 70 caractères sans espace
const SPACED_TITLE = 'mot assez long '.repeat(5).slice(0, 70); // 70 caractères avec espaces
const LONG_WHEN = '0123456789'.repeat(4); // 40 caractères
const END_STOPS = [3, 5]; // rangs 4 et 6 : ancrés en `end` au bureau (journey.js)
const TRUNCATED_STOP = 3; // rang 4 : son titre dépasse sa place (le rang 6 la tient)

/**
 * Edite les données : titres de 70 caractères sur deux escales (sans espace, puis avec
 * espaces) et sur la dernière, dates de 40 caractères sur trois escales et sur la dernière.
 *
 * @returns {{ edited: Set<string>, must: Set<string> }} libellés édités, au format
 *   « rang:champ », et ceux de la dernière escale (trop longs à toute largeur)
 */
function lengthen(journey) {
  const last = journey.stops.length - 1;
  const edited = new Set();
  const set = (at, field, text) => {
    journey.stops[at][field] = text;
    edited.add(`${at}:${field}`);
  };
  set(1, 'title', LONG_TITLE);
  set(2, 'title', SPACED_TITLE);
  set(last, 'title', LONG_TITLE);
  [2, 3, nowIndex(journey), last].forEach((at) => set(at, 'when', LONG_WHEN));
  return { edited, must: new Set([`${last}:title`, `${last}:when`]) };
}

/** Libellé tronqué : complet, ou terminé par « … » et début plus court du texte complet. */
function truncationProblems(label, shown, full) {
  const head = shown.slice(0, -1).trimEnd();
  if (shown === full) return [];
  if (!shown.endsWith(ELLIPSIS))
    return [`${label} : ni complet ni terminé par « … » : ${shown}`];
  if (!head || !full.startsWith(head))
    return [`${label} : « ${shown} » n'est pas un début de « ${full} »`];
  return [];
}

/** Libellé `text` d'une escale : texte attendu, rectangle dans la scène. */
function textProblems(label, text, full, { box, arrows, cut }) {
  const shown = text.textContent;
  const problems = cut === null
    ? (shown === full ? [] : [`${label} : « ${shown} » modifié (attendu « ${full} »)`])
    : truncationProblems(label, shown, full);
  if (cut && shown === full) problems.push(`${label} : non tronqué alors qu'il est trop long`);
  const rect = text.getBoundingClientRect();
  if (rect.left < box.left - TOL || rect.right > box.right + TOL)
    problems.push(
      `${label} : de ${rect.left.toFixed(0)} à ${rect.right.toFixed(0)} px, ` +
        `scène de ${box.left.toFixed(0)} à ${box.right.toFixed(0)} px`,
    );
  const shadowed = text.parentElement.classList.contains('sel') ? [] : arrows;
  if (shadowed.some((a) => rect.right > a.left && rect.left < a.right &&
    rect.bottom > a.top && rect.top < a.bottom))
    problems.push(`${label} : recouvre une flèche de scène`);
  return problems;
}

/**
 * Libellés d'une langue : aria-label complet, libellés dans la scène et hors des flèches de
 * scène, texte complet ou tronqué selon `edits` (aucun changement sans édition).
 *
 * @param {object} journey données de la langue
 * @param {number} width largeur jouée
 * @param {{ edited: Set<string>, must: Set<string> }} edits libellés édités (tronqués ou
 *   non selon la place) et libellés qui doivent l'être ; sur téléphone, tout titre édité
 *   (70 caractères) l'est aussi
 */
function labelProblems(site, journey, width, edits) {
  const list = wps(site);
  const box = one(site, '.jstage')?.getBoundingClientRect();
  if (!box || list.length !== journey.stops.length) return ['scène ou escales absentes'];
  const arrows = phone(width)
    ? all(site, '.stage-arrows button').map((button) => button.getBoundingClientRect())
    : [];
  return journey.stops.flatMap((stop, at) => {
    const aria = list[at].getAttribute('aria-label');
    const problems = aria === `${stop.title}, ${stop.when}`
      ? []
      : [`escale ${at + 1} : aria-label « ${aria} »`];
    ['title', 'when'].forEach((field) => {
      const text = list[at].querySelector(field === 'title' ? 'text:not(.y)' : 'text.y');
      const key = `${at}:${field}`;
      const long = edits.must.has(key) || (phone(width) && field === 'title');
      const cut = edits.edited.has(key) ? long : null;
      problems.push(...textProblems(
        `escale ${at + 1} (${field})`,
        text,
        stop[field],
        { box, arrows, cut },
      ));
    });
    return problems;
  });
}

/**
 * Escales ancrées en `end` (END_STOPS) : titre de 70 caractères sans espace, tronqué par
 * « … » au rang 4 (TRUNCATED_STOP) et entier au rang 6, qui le tient ; date de 40 caractères,
 * entière (elle tient à ces rangs). Tout reste dans la scène et l'aria-label garde le titre
 * complet.
 *
 * @param {object} site site ouvert sur la rubrique
 * @returns {string[]} problèmes trouvés
 */
function endProblems(site) {
  const list = wps(site);
  const box = one(site, '.jstage')?.getBoundingClientRect();
  if (!box || list.length <= Math.max(...END_STOPS)) return ['scène ou escales absentes'];
  return END_STOPS.flatMap((at) => {
    const aria = list[at].getAttribute('aria-label');
    const problems = aria.includes(LONG_WORD)
      ? []
      : [`escale ${at + 1} : aria-label « ${aria} » sans le titre complet`];
    ['title', 'when'].forEach((field) => {
      const text = list[at].querySelector(field === 'title' ? 'text:not(.y)' : 'text.y');
      const anchor = text.getAttribute('text-anchor');
      if (anchor !== 'end') problems.push(`escale ${at + 1} (${field}) : ancrage ${anchor}`);
      const full = field === 'title' ? LONG_WORD : LONG_WHEN;
      const cut = field === 'title' && at === TRUNCATED_STOP ? true : null;
      problems.push(...textProblems(
        `escale ${at + 1} (${field})`,
        text,
        full,
        { box, arrows: [], cut },
      ));
    });
    return problems;
  });
}

/**
 * @brief Libellés trop longs puis libellés réels, à `width` px, en français et en anglais.
 *
 * Données éditées : titres de 70 caractères (sans espace, avec espaces) et dates de 40
 * caractères, dont la dernière escale. Pas de débordement de la page ni de la scène, texte
 * complet dans l'aria-label et la fiche, libellé trop long terminé par « … ». Données
 * réelles : aucun libellé modifié ni tronqué.
 *
 * @param {number} width largeur jouée
 */
export async function runLabelFit(width) {
  const ctx = context(width);
  const en = { ...ctx, lang: 'en' };
  const names = {
    overflow: `libellés trop longs à ${width} px : aucun débordement horizontal`,
    inside: `libellés trop longs à ${width} px : tronqués, dans la scène, texte complet gardé`,
    english: `libellés trop longs à ${width} px : idem après bascule en anglais`,
    real: `libellés des données réelles à ${width} px : inchangés, aucun tronqué (fr, en)`,
  };
  const endName = `libellés d'escales ancrées en fin à ${width} px : tronqués, ` +
    'dans la scène, texte complet gardé';
  const edited = {};
  const fetch = editedFetch((data, lang) => {
    edited[lang] = { journey: data, ...lengthen(data) };
  });
  const endFetch = editedFetch((data) => {
    END_STOPS.forEach((at) => {
      data.stops[at].title = LONG_WORD;
      data.stops[at].when = LONG_WHEN;
    });
  });
  await withJourney(ctx, Object.values(names), { fetch }, async (site) => {
    const fit = (lang) => eventually(() => [
      ...labelProblems(site, edited[lang].journey, width, edited[lang]),
      ...detailProblems(site, edited[lang].journey, nowIndex(edited[lang].journey), width),
    ]);
    await test(ctx, names.overflow, () => [
      ...mountedProblems(site),
      ...overflowProblems(site),
    ]);
    await test(ctx, names.inside, () => fit('fr'));
    await test(en, names.english, async () => {
      await switchTo(site, 'en');
      return [...await fit('en'), ...overflowProblems(site)];
    });
  });
  if (!phone(width)) {
    const run = (site) => test(ctx, endName, () => eventually(() => endProblems(site)));
    await withJourney(ctx, [endName], { fetch: endFetch }, run);
  }
  await withJourney(ctx, [names.real], {}, (site) => test(ctx, names.real, async () => {
    const none = { edited: new Set(), must: new Set() };
    const problems = [];
    for (const lang of ['fr', 'en']) {
      if (lang === 'en') await switchTo(site, 'en');
      const journey = await journeyData(lang);
      problems.push(...await eventually(() => labelProblems(site, journey, width, none)));
    }
    return problems;
  }));
}
