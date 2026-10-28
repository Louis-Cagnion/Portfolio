/*
Contrat testé : chaque système de projets déclaré dans data/fr.json et data/en.json est
dessinable, sans autre modification que sa déclaration et sa teinte.
  - tintOf (js/sections/projects-art.js) renvoie deux couleurs pour le soleil et deux pour
    les planètes, pour chaque `projects.systems[].id` ;
  - systemRadii (js/sections/projects-layout.js) renvoie au moins un rayon positif ;
  - FR et EN déclarent les mêmes systèmes, dans le même ordre.
Lancer : node --test (depuis la racine du dépôt).
*/
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { importModule, readLocale } from '../helpers.mjs';

const art = await importModule('js/sections/projects-art.js');
const layout = await importModule('js/sections/projects-layout.js');
const idsOf = (lang) => readLocale(lang).projects.systems.map((system) => system.id);

describe('systèmes de projets déclarés dans les données', () => {
  test('FR et EN déclarent les mêmes systèmes, dans le même ordre', () => {
    assert.deepEqual(idsOf('en'), idsOf('fr'));
  });

  for (const id of idsOf('fr')) {
    test(`${id} : une teinte de soleil et de planète`, () => {
      const tint = art.tintOf(id);
      assert.equal(tint.sun.length, 2, `soleil de ${id}`);
      assert.equal(tint.planet.length, 2, `planète de ${id}`);
    });

    test(`${id} : des rayons d'orbite positifs`, () => {
      const radii = layout.systemRadii(id, { phone: false, maxRadius: 200 });
      assert.equal(radii.length > 0 && radii.every((radius) => radius > 0), true);
    });
  }

  test('un système sans teinte est refusé en nommant son identifiant', () => {
    assert.throws(() => art.tintOf('inconnu'), /inconnu/);
  });
});
