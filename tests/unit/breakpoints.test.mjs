/*
Contrat testé : les points de rupture de js/core/dom.js (`BREAKPOINTS`) et les `@media` de
css/*.css disent la même chose. Un `@media` ne pouvant pas lire une variable, chaque largeur
est écrite en littéral dans les feuilles de style : ce test les compare à la source.
  - toute largeur d'un `@media (max-width: …)` de css/ est une valeur de BREAKPOINTS ;
  - chaque valeur de BREAKPOINTS est utilisée par au moins une feuille de style.
Lancer : node --test (depuis la racine du dépôt).
*/
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { importModule, ROOT_URL } from '../helpers.mjs';

const { BREAKPOINTS } = await importModule('js/core/dom.js');
const WIDTH = /\(max-width:\s*([0-9.]+em)\)/g;

const cssDir = new URL('css/', ROOT_URL);
const widthsByFile = new Map(
  readdirSync(cssDir)
    .filter((name) => name.endsWith('.css'))
    .map((name) => [
      name,
      [...readFileSync(new URL(name, cssDir), 'utf8').matchAll(WIDTH)].map((m) => m[1]),
    ]),
);
const declared = Object.values(BREAKPOINTS).map((query) => [...query.matchAll(WIDTH)][0]?.[1]);

describe('points de rupture : JS et CSS', () => {
  test('BREAKPOINTS : des largeurs en em, sans doublon', () => {
    assert.equal(declared.every(Boolean), true);
    assert.equal(new Set(declared).size, declared.length);
  });

  test('toute largeur de @media des feuilles de style est dans BREAKPOINTS', () => {
    for (const [name, widths] of widthsByFile)
      for (const width of widths)
        assert.equal(declared.includes(width), true, `css/${name} : ${width} inconnu`);
  });

  test('chaque point de rupture de BREAKPOINTS est utilisé par une feuille de style', () => {
    const used = new Set([...widthsByFile.values()].flat());
    for (const width of declared)
      assert.equal(used.has(width), true, `${width} de BREAKPOINTS jamais écrit en CSS`);
  });
});
