/*
Contrat testé : js/core/levels.js, source unique des niveaux de compétence.
  - LEVELS est ordonné du moins au plus avancé, sans doublon ; levelRank en donne l'indice ;
  - LEVELS_DESCENDING est son inverse ;
  - chaque table indexée par niveau couvre exactement LEVELS : rayon des astres
    (bodyRadius de skills-layout.js), et textes `levels`, `levelNotes` et `bodies` de
    data/fr.json et data/en.json.
Lancer : node --test (depuis la racine du dépôt).
*/
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { importModule, readLocale } from '../helpers.mjs';

const levels = await importModule('js/core/levels.js');
const layout = await importModule('js/sections/skills-layout.js');

describe('js/core/levels.js', () => {
  test('LEVELS : sans doublon, de unknown à advanced', () => {
    assert.equal(new Set(levels.LEVELS).size, levels.LEVELS.length);
    assert.equal(levels.LEVELS[0], 'unknown');
    assert.equal(levels.LEVELS.at(-1), 'advanced');
  });

  test('levelRank : indice dans LEVELS, -1 si inconnu', () => {
    levels.LEVELS.forEach((level, index) => assert.equal(levels.levelRank(level), index));
    assert.equal(levels.levelRank('expert'), -1);
  });

  test('LEVELS_DESCENDING : inverse de LEVELS', () => {
    assert.deepEqual(levels.LEVELS_DESCENDING, [...levels.LEVELS].reverse());
  });

  test('LEVELS et LEVELS_DESCENDING ne se modifient pas', () => {
    assert.equal(Object.isFrozen(levels.LEVELS), true);
    assert.equal(Object.isFrozen(levels.LEVELS_DESCENDING), true);
  });
});

describe('tables indexées par niveau', () => {
  test('bodyRadius : un rayon fini et positif pour chaque niveau', () => {
    for (const level of levels.LEVELS) {
      const radius = layout.bodyRadius(level);
      assert.equal(Number.isFinite(radius) && radius > 0, true, `rayon de ${level}`);
    }
  });

  for (const lang of ['fr', 'en']) {
    for (const table of ['levels', 'levelNotes', 'bodies']) {
      test(`${lang} : skills.${table} couvre exactement LEVELS`, () => {
        const keys = Object.keys(readLocale(lang).skills[table]);
        assert.deepEqual([...keys].sort(), [...levels.LEVELS].sort());
      });
    }
  }
});
