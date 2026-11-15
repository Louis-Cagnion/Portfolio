/*
Contrat testé : js/core/viewport.js (partie pure), importable sous Node sans DOM.
  fitHeight({ wanted, windowHeight, tabbarTop, planTop, margin }) -> hauteur en px :
    jamais supérieure à `wanted`, jamais négative ni non finie ; borne : le plus bas de
    windowHeight et tabbarTop, moins planTop et margin, avec un plancher de 60 px.
Lancer : node --test (depuis la racine du dépôt).
*/
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { importModule } from '../helpers.mjs';

const load = async () => (await importModule('js/core/viewport.js')).fitHeight;
// Portrait 390 x 844 : barre d'onglets à 770 px, plan à 66 px, hauteur voulue 448,5 px.
const PORTRAIT = { wanted: 448.5, windowHeight: 844, tabbarTop: 770, planTop: 66, margin: 80 };
// Paysage 844 x 390 : hauteur voulue 970 px, barre d'onglets à 318 px.
const LANDSCAPE = { wanted: 970, windowHeight: 390, tabbarTop: 318, planTop: 66, margin: 80 };

describe('fitHeight', () => {
  test('portrait : la hauteur voulue reste inchangée', async () => {
    const fitHeight = await load();
    assert.equal(fitHeight(PORTRAIT), 448.5);
  });

  test('paysage : bornée par la barre d\'onglets (318 - 66 - 80)', async () => {
    const fitHeight = await load();
    assert.equal(fitHeight(LANDSCAPE), 172);
  });

  test('la fenêtre borne aussi quand la barre d\'onglets est plus basse', async () => {
    const fitHeight = await load();
    assert.equal(fitHeight({ ...LANDSCAPE, tabbarTop: 1000 }), 244);
  });

  test('place trop petite : plancher de 60 px, sans dépasser la hauteur voulue', async () => {
    const fitHeight = await load();
    assert.equal(fitHeight({ ...LANDSCAPE, margin: 400 }), 60);
    assert.equal(fitHeight({ ...LANDSCAPE, margin: 400, wanted: 40 }), 40);
  });

  test('barre d\'onglets masquée ou mesure absente : la fenêtre seule borne', async () => {
    const fitHeight = await load();
    assert.equal(fitHeight({ ...LANDSCAPE, tabbarTop: NaN }), 244);
    assert.equal(fitHeight({ ...LANDSCAPE, windowHeight: NaN, tabbarTop: NaN }), 970);
  });

  test('planTop ou margin non finis comptent pour 0', async () => {
    const fitHeight = await load();
    assert.equal(fitHeight({ ...LANDSCAPE, planTop: undefined, margin: NaN }), 318);
  });

  test('entrées non finies : toujours un nombre fini, positif, au plus wanted', async () => {
    const fitHeight = await load();
    for (const wanted of [NaN, Infinity, -Infinity, undefined]) {
      const height = fitHeight({ ...LANDSCAPE, wanted });
      assert.ok(Number.isFinite(height) && height >= 0, `wanted ${wanted} : ${height}`);
    }
    for (const bad of [NaN, Infinity, -Infinity, undefined, null]) {
      const height = fitHeight({
        wanted: 500,
        windowHeight: bad,
        tabbarTop: bad,
        planTop: bad,
        margin: bad,
      });
      assert.ok(Number.isFinite(height) && height >= 0 && height <= 500, `${bad} : ${height}`);
    }
    assert.equal(fitHeight({ ...LANDSCAPE, wanted: -50 }), 0);
  });
});
