/*
Contrat testé : les rubriques du site sont déclarées au même nombre et dans le même ordre
à chaque endroit où elles s'écrivent, pour qu'en ajouter une n'en oublie aucun.
  - les `<section class="view" id="…">` de index.html ;
  - les clés de `MOUNTS` dans js/main.js ;
  - les clés de `ui.nav` de data/fr.json et data/en.json.
Lancer : node --test (depuis la racine du dépôt).
*/
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readLocale, ROOT_URL } from '../helpers.mjs';

const read = (path) => readFileSync(new URL(path, ROOT_URL), 'utf8');

const inPage = [...read('index.html').matchAll(/<section class="view" id="([^"]+)"/g)]
  .map((match) => match[1]);
const mounts = read('js/main.js').match(/const MOUNTS = \{([^}]*)\}/);
const inMain = [...(mounts?.[1] ?? '').matchAll(/^\s*(\w+):/gm)].map((match) => match[1]);

describe('rubriques : index.html, MOUNTS et ui.nav', () => {
  test('index.html déclare des rubriques et MOUNTS est lisible', () => {
    assert.equal(inPage.length > 0, true, 'aucune <section class="view"> dans index.html');
    assert.equal(inMain.length > 0, true, 'MOUNTS introuvable dans js/main.js');
  });

  test('MOUNTS suit les sections de index.html', () => {
    assert.deepEqual(inMain, inPage);
  });

  for (const lang of ['fr', 'en']) {
    test(`${lang} : ui.nav suit les sections de index.html`, () => {
      assert.deepEqual(Object.keys(readLocale(lang).ui.nav), inPage);
    });
  }
});
