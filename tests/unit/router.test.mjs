/*
Contrat testé : js/core/router.js (partie pure), importable sous Node sans DOM.
  jumpDirection(fromId, toId, ids) -> 'forward' si toId vient après fromId dans ids,
    'backward' s'il vient avant ; null si fromId vaut null, si fromId === toId, ou si l'un
    des deux est absent de ids. Ne modifie jamais ids.
Lancer : node --test (depuis la racine du dépôt).
*/
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { assertLinear, deepFreeze, importModule } from '../helpers.mjs';

const load = () => importModule('js/core/router.js');
// Ordre des section.view de index.html.
const IDS = deepFreeze(['home', 'journey', 'skills', 'projects', 'contact']);
const call = (from, to) => `jumpDirection(${JSON.stringify(from)}, ${JSON.stringify(to)})`;

describe('jumpDirection', () => {
  test('exportée sous forme de fonction', async () => {
    const router = await load();
    assert.equal(typeof router.jumpDirection, 'function', 'jumpDirection non exportée');
  });

  test('rubrique suivante ou plus loin : forward', async () => {
    const { jumpDirection } = await load();
    for (const [from, to] of [
      ['home', 'journey'],
      ['home', 'contact'],
      ['journey', 'projects'],
      ['projects', 'contact'],
    ])
      assert.equal(jumpDirection(from, to, IDS), 'forward', call(from, to));
  });

  test('rubrique précédente ou plus loin en arrière : backward', async () => {
    const { jumpDirection } = await load();
    for (const [from, to] of [
      ['journey', 'home'],
      ['contact', 'home'],
      ['projects', 'skills'],
      ['contact', 'journey'],
    ])
      assert.equal(jumpDirection(from, to, IDS), 'backward', call(from, to));
  });

  test('toutes les paires distinctes suivent l\'ordre de ids', async () => {
    const { jumpDirection } = await load();
    for (const [i, from] of IDS.entries())
      for (const [j, to] of IDS.entries()) {
        if (i === j) continue;
        const expected = j > i ? 'forward' : 'backward';
        assert.equal(jumpDirection(from, to, IDS), expected, call(from, to));
      }
  });

  test('même rubrique : null', async () => {
    const { jumpDirection } = await load();
    for (const id of IDS) assert.equal(jumpDirection(id, id, IDS), null, call(id, id));
  });

  test('premier affichage (fromId null) : null', async () => {
    const { jumpDirection } = await load();
    for (const to of IDS) assert.equal(jumpDirection(null, to, IDS), null, call(null, to));
  });

  test('rubrique de départ ou d\'arrivée absente de ids : null', async () => {
    const { jumpDirection } = await load();
    for (const [from, to] of [
      ['home', 'dossier'],
      ['dossier', 'home'],
      ['inconnu', 'autre'],
      ['inconnu', 'inconnu'],
      ['home', undefined],
      [undefined, 'home'],
      ['home', ''],
      ['', 'contact'],
      ['Home', 'contact'],
      ['home', 'contact '],
    ])
      assert.equal(jumpDirection(from, to, IDS), null, call(from, to));
  });

  test('liste vide ou d\'une seule rubrique : null', async () => {
    const { jumpDirection } = await load();
    assert.equal(jumpDirection('home', 'journey', []), null, 'ids vide');
    assert.equal(jumpDirection('home', 'home', ['home']), null, 'ids = [home]');
    assert.equal(jumpDirection('home', 'journey', ['home']), null, 'journey absent');
  });

  test('suit la liste reçue, pas un ordre figé', async () => {
    const { jumpDirection } = await load();
    const reversed = deepFreeze([...IDS].reverse());
    assert.equal(jumpDirection('home', 'contact', reversed), 'backward', 'ordre inversé');
    assert.equal(jumpDirection('contact', 'home', reversed), 'forward', 'ordre inversé');
    assert.equal(jumpDirection('a', 'b', ['a', 'b']), 'forward', 'ids = [a, b]');
    assert.equal(jumpDirection('b', 'a', ['a', 'b']), 'backward', 'ids = [a, b]');
  });

  test('ne modifie pas ids (liste gelée acceptée)', async () => {
    const { jumpDirection } = await load();
    const ids = deepFreeze([...IDS]);
    jumpDirection('home', 'contact', ids);
    jumpDirection('contact', 'home', ids);
    assert.deepEqual(ids, IDS);
  });

  test('temps linéaire en la taille de ids', async () => {
    const { jumpDirection } = await load();
    const makeIds = (n) => Array.from({ length: n }, (_, i) => `id${i}`);
    // Pire cas : départ et arrivée en fin de liste.
    assertLinear(assert, 'jumpDirection', makeIds, (ids) => {
      for (let i = 0; i < 50; i++) jumpDirection(ids.at(-1), ids.at(-2), ids);
    });
  });
});
