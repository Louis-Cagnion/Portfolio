/*
Tests des textes du site : données (data/*.json), index.html, README.md.
Critères : docs/design/plan.md (Schéma des données, Chaînes à créer, Tests) et
docs/design-checklist.md (sections 8 et 9).
 - ui.errors : les dix clés du schéma du plan, non vides
 - textes imposés par le plan : ui.errors.unexpected, home.mission, dossier du pilote
 - modèles <template data-lang> de #status (index.html) = ui.loading et ui.errors, mot pour
   mot (espaces normalisés comme js/ui/status.js), sans clé en trop
 - aucun tiret cadratin (U+2014) dans data/, js/, css/, index.html, README.md (jamais docs/
   ni tests/)
 - aucun mot de temps relatif (« en cours », « actuellement », « aujourd », sans casse) dans
   data/, index.html, README.md
Les détecteurs sont eux-mêmes vérifiés (sections « détecteurs ») et testés en volume.
Lancer : node --test (depuis la racine du dépôt).
*/
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { assertLinear, readLocale as locale, ROOT } from './helpers.mjs';

const LANGS = ['fr', 'en'];

// Clés de ui.errors du schéma du plan : titre, une par cause, boutons.
const ERROR_KEYS = [
  'title',
  'network',
  'timeout',
  'http',
  'json',
  'schema',
  'unexpected',
  'boot',
  'retry',
  'langSwitch',
];
// Textes de la table « Chaînes à créer » du plan ; dossier : surtitre, titre, intitulés.
const PLAN_TEXTS = {
  fr: {
    unexpected: 'L\'intrication quantique a tenté de se faire avec les particules d\'une ' +
      'autre ligne temporelle. Réessaie.',
    mission: 'Mission : de la piscine 42 à l\'intelligence artificielle',
    dossier: [
      'Dossier du pilote',
      'Je me présente',
      'Formation',
      'Entraînement continu',
      'Projets passion',
    ],
  },
  en: {
    unexpected: 'Quantum entanglement tried to form with particles from another timeline. ' +
      'Try again.',
    mission: 'Mission: from the 42 piscine to artificial intelligence',
    dossier: [
      'Pilot file',
      'About me',
      'Education',
      'Continuous training',
      'Passion projects',
    ],
  },
};

// ---------- Détecteurs (purs, vérifiés plus bas) ----------
/** Lignes (1 = première) où `pattern` (sans drapeau g) se trouve : [{ line, excerpt }]. */
function matchingLines(text, pattern) {
  const out = [];
  text.split('\n').forEach((content, index) => {
    if (!pattern.test(content)) return;
    out.push({ line: index + 1, excerpt: content.trim().slice(0, 60) });
  });
  return out;
}

// Tiret cadratin brut, échappé (\u2014, \u{2014}) ou en entité (&mdash;, &#8212;, &#x2014;).
const EM_DASH = /\u2014|\\u0*2014|\\u\{0*2014\}|&mdash;|&#0*8212;|&#x0*2014;/i;
const emDashLines = (text) => matchingLines(text, EM_DASH);
/* Mots de temps relatif de la checklist (section 9), sans casse comme son `grep -rniE` :
« aujourd » couvre « aujourd'hui ». */
const RELATIVE_TIME = /en cours|actuellement|aujourd/i;
const relativeTimeLines = (text) => matchingLines(text, RELATIVE_TIME);

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: String.fromCodePoint(0xa0),
};
/** Texte d'un fragment HTML, comme textContent : balises retirées, entités décodées. */
const htmlText = (html) => html
  .replace(/<[^>]*>/g, '')
  .replace(/&(?:#(\d+)|#x([\da-f]+)|(\w+));/gi, (entity, dec, hex, name) => {
    if (dec) return String.fromCodePoint(Number(dec));
    if (hex) return String.fromCodePoint(parseInt(hex, 16));
    return ENTITIES[name] ?? entity;
  });

/**
 * Textes des modèles <template data-lang> d'un HTML, lus comme js/ui/status.js : Map
 * langue -> Map clé `data-key` -> texte aux espaces normalisés. Pour une langue, le premier
 * modèle compte (querySelector) ; pour une clé en double, la dernière.
 */
function statusTemplates(html) {
  const TEMPLATE = /<template\b[^>]*\bdata-lang="([^"]*)"[^>]*>([\s\S]*?)<\/template>/gi;
  const KEYED = /<(\w+)\b[^>]*\bdata-key="([^"]*)"[^>]*>([\s\S]*?)<\/\1>/gi;
  const templates = new Map();
  for (const [, lang, body] of html.matchAll(TEMPLATE)) {
    if (templates.has(lang)) continue;
    const texts = new Map();
    for (const [, , key, inner] of body.matchAll(KEYED))
      texts.set(key, htmlText(inner).replace(/\s+/g, ' ').trim());
    templates.set(lang, texts);
  }
  return templates;
}

/**
 * Écarts entre un modèle de #status (Map clé -> texte) et les textes `ui` d'une langue. Clés
 * attendues : loading, errors.<clé> pour ERROR_KEYS et pour toute autre clé de ui.errors.
 */
function templateGaps(template, ui) {
  const keys = new Set([...ERROR_KEYS, ...Object.keys(ui?.errors ?? {})]);
  const expected = new Map([
    ['loading', ui?.loading],
    ...[...keys].map((key) => [`errors.${key}`, ui?.errors?.[key]]),
  ]);
  const found = [];
  for (const [key, value] of expected) {
    const shown = template.get(key);
    if (typeof value !== 'string') found.push(`ui.${key} absent des données`);
    if (shown === undefined) found.push(`${key} absent du modèle`);
    else if (typeof value === 'string' && shown !== value)
      found.push(`${key} : modèle ${JSON.stringify(shown)}, données ${JSON.stringify(value)}`);
  }
  for (const key of template.keys())
    if (!expected.has(key))
      found.push(`${key} : dans le modèle, absent de ui.loading et ui.errors`);
  return found;
}

const SKIPPED_EXT = /\.(png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|pdf|mp4|webm|zip)$/i;
function filesUnder(relative) {
  let stat;
  try {
    stat = statSync(ROOT + relative);
  } catch {
    return []; // absent : ignoré
  }
  if (stat.isFile()) return SKIPPED_EXT.test(relative) ? [] : [relative];
  return readdirSync(ROOT + relative).sort()
    .flatMap((name) => filesUnder(`${relative}/${name}`));
}

/** Lignes trouvées par `detect` dans les fichiers `targets` : « fichier:ligne: extrait ». */
const findInFiles = (targets, detect) => targets.flatMap(filesUnder).flatMap((file) => {
  const lines = detect(readFileSync(ROOT + file, 'utf8'));
  return lines.map(({ line, excerpt }) => `${file}:${line}: ${excerpt}`);
});

// ---------- Textes du site ----------
describe('textes imposés par le plan (Chaînes à créer)', () => {
  for (const lang of LANGS) {
    const plan = PLAN_TEXTS[lang];
    const expectText = (path, actual, expected) => assert.equal(
      actual,
      expected,
      `data/${lang}.json : ${path} vaut ${JSON.stringify(actual)}, ` +
        `attendu ${JSON.stringify(expected)}`,
    );

    test(`${lang} : ui.errors.unexpected`, () => {
      expectText('ui.errors.unexpected', locale(lang).ui?.errors?.unexpected, plan.unexpected);
    });

    test(`${lang} : home.mission`, () => {
      expectText('home.mission', locale(lang).home?.mission, plan.mission);
    });

    test(`${lang} : dossier du pilote (surtitre, titre, intitulés des entrées)`, () => {
      const dossier = locale(lang).home?.dossier ?? {};
      const shown = [
        dossier.kicker,
        dossier.title,
        ...(dossier.entries ?? []).map((entry) => entry.label),
      ];
      assert.deepEqual(shown, plan.dossier, `data/${lang}.json : home.dossier`);
    });
  }
});

describe('écran #status : ui.errors et modèles de index.html', () => {
  for (const lang of LANGS) {
    test(`${lang} : ui.errors porte les dix clés du plan, non vides`, () => {
      const errors = locale(lang).ui?.errors ?? {};
      const missing = ERROR_KEYS
        .filter((key) => typeof errors[key] !== 'string' || errors[key].trim() === '')
        .map((key) => `ui.errors.${key}`);
      assert.deepEqual(
        missing,
        [],
        `data/${lang}.json : absents ou vides : ${missing.join(', ')}`,
      );
    });

    test(`${lang} : <template> de #status identique à ui.loading et ui.errors`, () => {
      const template = statusTemplates(readFileSync(`${ROOT}index.html`, 'utf8')).get(lang);
      assert.ok(template, `index.html : <template data-lang="${lang}"> absent`);
      const found = templateGaps(template, locale(lang).ui);
      assert.deepEqual(
        found,
        [],
        `index.html (modèle ${lang}) contre data/${lang}.json :\n${found.join('\n')}`,
      );
    });
  }
});

describe('aucun tiret cadratin (U+2014)', () => {
  test('data/, js/, css/, index.html et README.md en sont exempts', () => {
    const found = findInFiles(['data', 'js', 'css', 'index.html', 'README.md'], emDashLines);
    assert.deepEqual(found, [], `tirets cadratins trouvés :\n${found.join('\n')}`);
  });
});

describe('aucun mot de temps relatif (checklist, section 9)', () => {
  test('data/, index.html et README.md en sont exempts', () => {
    const found = findInFiles(['data', 'index.html', 'README.md'], relativeTimeLines);
    assert.deepEqual(found, [], `mots de temps relatif trouvés :\n${found.join('\n')}`);
  });
});

// ---------- Vérification des détecteurs ----------
describe('détecteurs : tirets cadratins', () => {
  test('trouve le tiret brut, échappé ou en entité, avec le numéro de ligne', () => {
    const text = [
      'propre',
      'a \u2014 b',
      'propre',
      '"\\u2014"',
      '&mdash;',
      '&#8212;',
      '&#x2014;',
      '\\u{2014}',
    ].join('\n');
    assert.deepEqual(emDashLines(text).map((l) => l.line), [2, 4, 5, 6, 7, 8]);
  });

  test('ignore les autres tirets, et gère CRLF et dernière ligne sans saut', () => {
    assert.deepEqual(emDashLines('a - b\r\nc \u2013 d\r\n\u2015\r\n'), []);
    assert.deepEqual(emDashLines('a\r\nb\r\nc\u2014').map((l) => l.line), [3]);
    assert.deepEqual(emDashLines('\u2014').map((l) => l.line), [1]);
    assert.deepEqual(emDashLines(''), []);
  });

  test('fichiers absents ignorés, dossiers parcourus', () => {
    assert.deepEqual(filesUnder('dossier-inexistant'), []);
    assert.deepEqual(filesUnder('fichier-inexistant.md'), []);
    assert.ok(filesUnder('data').every((f) => f.startsWith('data/')));
  });
});

describe('détecteurs : mots de temps relatif', () => {
  test('trouve chaque mot sans casse, avec le numéro de ligne', () => {
    const text = [
      'propre',
      'Mission en cours',
      'EN COURS',
      'Actuellement',
      'aujourd\'hui',
      'Aujourd’hui',
      'concours, encours, en-cours, actuel',
    ].join('\n');
    assert.deepEqual(relativeTimeLines(text).map((l) => l.line), [2, 3, 4, 5, 6]);
  });

  test('gère CRLF, texte vide et dernière ligne sans saut', () => {
    assert.deepEqual(relativeTimeLines('a\r\nb\r\nc en cours').map((l) => l.line), [3]);
    assert.deepEqual(relativeTimeLines(''), []);
  });
});

describe('détecteurs : modèles de #status', () => {
  const fullUi = () => ({
    loading: 'Chargement',
    errors: Object.fromEntries(ERROR_KEYS.map((key) => [key, `texte ${key}`])),
  });
  const fullTemplate = () => new Map([
    ['loading', 'Chargement'],
    ...ERROR_KEYS.map((key) => [`errors.${key}`, `texte ${key}`]),
  ]);

  test('lit chaque modèle, normalise les espaces et décode les entités', () => {
    const html = [
      '<section id="status">',
      '<template data-lang="fr">',
      '  <p data-key="loading">Connexion\n      au pilote…</p>',
      '  <p class="x" data-key="errors.http">HTTP &amp; {status}&#x21;&#33;</p>',
      '</template>',
      '<template data-lang="en"><p data-key="loading"> <em>Loading</em> </p></template>',
      '<template data-lang="fr"><p data-key="loading">ignoré</p></template>',
      '</section>',
    ].join('\n');
    const templates = statusTemplates(html);
    assert.deepEqual([...templates.keys()], ['fr', 'en']);
    assert.deepEqual(
      Object.fromEntries(templates.get('fr')),
      { loading: 'Connexion au pilote…', 'errors.http': 'HTTP & {status}!!' },
    );
    assert.deepEqual(Object.fromEntries(templates.get('en')), { loading: 'Loading' });
    assert.equal(statusTemplates('<p data-key="loading">hors modèle</p>').size, 0);
  });

  test('modèle et données identiques : aucun écart', () => {
    assert.deepEqual(templateGaps(fullTemplate(), fullUi()), []);
  });

  test('signale clé absente du modèle ou des données, texte différent, clé en trop', () => {
    const template = fullTemplate();
    template.delete('errors.unexpected');
    template.set('errors.json', 'autre');
    template.set('errors.extra', 'x');
    const ui = fullUi();
    delete ui.errors.title;
    ui.errors.bonus = 'b';
    assert.deepEqual(
      templateGaps(template, ui),
      [
        'ui.errors.title absent des données',
        'errors.json : modèle "autre", données "texte json"',
        'errors.unexpected absent du modèle',
        'errors.bonus absent du modèle',
        'errors.extra : dans le modèle, absent de ui.loading et ui.errors',
      ],
    );
  });

  test('ui absent : chaque clé attendue est signalée', () => {
    const found = templateGaps(new Map(), undefined);
    assert.equal(found.filter((gap) => gap.endsWith('absent des données')).length, 11);
    assert.equal(found.filter((gap) => gap.endsWith('absent du modèle')).length, 11);
  });
});

describe('détecteurs : volume (10 000 lignes ou éléments, temps linéaire)', () => {
  test('tirets cadratins', () => {
    const text = (n) => Array.from({ length: n }, (_, i) => (i % 2 ? 'ligne' : 'a \u2014 b'))
      .join('\n');
    assert.equal(emDashLines(text(10000)).length, 5000);
    assertLinear(assert, 'emDashLines', text, emDashLines);
  });

  test('modèles de #status', () => {
    const html = (n) => {
      const keyed = Array.from(
        { length: n },
        (_, i) => `<p data-key="k${i}">Connexion   &amp;\n pilote</p>`,
      );
      return `<template data-lang="fr">${keyed.join('\n')}</template>`;
    };
    assert.equal(statusTemplates(html(10000)).get('fr').size, 10000);
    assertLinear(assert, 'statusTemplates', html, statusTemplates);
  });
});
