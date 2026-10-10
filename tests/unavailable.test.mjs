/*
Tests du bloc ui.unavailable (S5b, docs/design/plan.md:122 et :151) : « Contenu indisponible »
des rubriques encore sans contenu.
 - data/fr.json et data/en.json : ui.unavailable.{title, message, home}, chaînes non vides,
   textes validés par Louis (10/10/2026), mot pour mot
 - parité de structure FR/EN du bloc (mêmes clés, aucune en trop)
 - js/core/schema.js : un ui.unavailable absent ou incomplet (champ manquant, vide, non
   chaîne, blanc) est rejeté, avec un chemin qui nomme le champ
Lancer : node --test (depuis la racine du dépôt).
*/
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { clone, importModule, readFixture, readLocale } from './helpers.mjs';

const KEYS = ['title', 'message', 'home'];
const EXPECTED = {
  fr: {
    title: 'Contenu indisponible',
    message: 'Ce secteur n\'est pas encore cartographié, le pilote n\'a pas encore trouvé ' +
      'le mode hyperespace. Reviens plus tard.',
    home: 'Retour à l\'accueil',
  },
  en: {
    title: 'Content unavailable',
    message: 'This sector hasn\'t been charted yet, the pilot hasn\'t found hyperspace mode ' +
      'yet. Come back later.',
    home: 'Back to home',
  },
};
const load = async () => {
  const mod = await importModule('js/core/schema.js');
  assert.equal(typeof mod.validateLocale, 'function', 'validateLocale manquante');
  return mod.validateLocale;
};
// Fixture dont ui.unavailable est posé ici, pour ne pas dépendre de son contenu.
const base = () => {
  const data = clone(readFixture('valid-locale.json'));
  data.ui.unavailable = { ...EXPECTED.fr };
  return data;
};
const namesField = (found, path) => found.some(
  (p) => p === path || p.startsWith(`${path}.`) || p.startsWith(`${path}[`),
);

describe('ui.unavailable : données', () => {
  for (const lang of ['fr', 'en']) {
    test(`${lang}.json : title, message, home en chaînes non vides`, () => {
      const block = readLocale(lang).ui?.unavailable;
      assert.ok(
        block && typeof block === 'object',
        `data/${lang}.json : ui.unavailable absent`,
      );
      for (const key of KEYS) {
        assert.equal(
          typeof block[key],
          'string',
          `ui.unavailable.${key} n'est pas une chaîne`,
        );
        assert.ok(block[key].trim(), `ui.unavailable.${key} vide`);
      }
    });

    test(`${lang}.json : textes validés par Louis, mot pour mot`, () => {
      assert.deepEqual(readLocale(lang).ui?.unavailable, EXPECTED[lang]);
    });
  }

  test('parité FR/EN : mêmes clés exactement', () => {
    const keys = (lang) => Object.keys(readLocale(lang).ui?.unavailable ?? {}).sort();
    assert.deepEqual(keys('fr'), [...KEYS].sort());
    assert.deepEqual(keys('en'), keys('fr'));
  });

  test('les textes FR et EN diffèrent', () => {
    for (const key of KEYS)
      assert.notEqual(EXPECTED.fr[key], EXPECTED.en[key]);
    assert.notDeepEqual(readLocale('fr').ui?.unavailable, readLocale('en').ui?.unavailable);
  });

  test('aucun tiret cadratin ni espace en bordure', () => {
    for (const lang of ['fr', 'en'])
      for (const key of KEYS) {
        const value = readLocale(lang).ui?.unavailable?.[key] ?? '';
        assert.ok(value && !value.includes('\u2014'), `${lang} ${key} : vide ou cadratin`);
        assert.equal(value, value.trim(), `${lang} ${key} : espace en bordure`);
      }
  });
});

describe('ui.unavailable : schéma', () => {
  test('la base de test (bloc complet) est acceptée', async () => {
    const validateLocale = await load();
    assert.deepEqual(validateLocale(base()), []);
  });

  test('les vraies données fr.json et en.json sont acceptées', async () => {
    const validateLocale = await load();
    assert.deepEqual(validateLocale(clone(readLocale('fr'))), []);
    assert.deepEqual(validateLocale(clone(readLocale('en'))), []);
  });

  test('ui.unavailable absent : rejeté, chemin nommé', async () => {
    const validateLocale = await load();
    const data = base();
    delete data.ui.unavailable;
    const found = validateLocale(data);
    assert.ok(namesField(found, 'ui.unavailable'), `obtenu : ${JSON.stringify(found)}`);
  });

  for (const bad of [null, 'texte', 42, [], true]) {
    test(`ui.unavailable = ${JSON.stringify(bad)} : rejeté`, async () => {
      const validateLocale = await load();
      const data = base();
      data.ui.unavailable = bad;
      const found = validateLocale(data);
      assert.ok(namesField(found, 'ui.unavailable'), `obtenu : ${JSON.stringify(found)}`);
    });
  }

  test('ui.unavailable = {} : les trois champs sont nommés', async () => {
    const validateLocale = await load();
    const data = base();
    data.ui.unavailable = {};
    const found = validateLocale(data);
    for (const key of KEYS)
      assert.ok(found.includes(`ui.unavailable.${key}`), `${key} : ${JSON.stringify(found)}`);
  });

  for (const key of KEYS) {
    const path = `ui.unavailable.${key}`;
    const cases = {
      manquant: (b) => { delete b[key]; },
      vide: (b) => { b[key] = ''; },
      'null': (b) => { b[key] = null; },
      nombre: (b) => { b[key] = 42; },
      tableau: (b) => { b[key] = ['x']; },
      objet: (b) => { b[key] = { a: 'x' }; },
      booléen: (b) => { b[key] = true; },
    };
    for (const [label, apply] of Object.entries(cases))
      test(`${path} ${label} : rejeté et nommé, seul`, async () => {
        const validateLocale = await load();
        const data = base();
        apply(data.ui.unavailable);
        assert.deepEqual(validateLocale(data), [path]);
      });
  }

  test('deux champs fautifs : les deux sont nommés', async () => {
    const validateLocale = await load();
    const data = base();
    data.ui.unavailable.title = '';
    delete data.ui.unavailable.home;
    const found = validateLocale(data);
    assert.ok(found.includes('ui.unavailable.title'), JSON.stringify(found));
    assert.ok(found.includes('ui.unavailable.home'), JSON.stringify(found));
    assert.ok(!found.includes('ui.unavailable.message'), JSON.stringify(found));
  });

  test('une clé en plus dans le bloc ne le fait pas rejeter', async () => {
    const validateLocale = await load();
    const data = base();
    data.ui.unavailable.extra = 'x';
    assert.deepEqual(validateLocale(data), []);
  });

  test('ne modifie pas l\'entrée invalide', async () => {
    const validateLocale = await load();
    const data = base();
    delete data.ui.unavailable.message;
    const before = JSON.stringify(data);
    validateLocale(data);
    assert.equal(JSON.stringify(data), before);
  });
});
