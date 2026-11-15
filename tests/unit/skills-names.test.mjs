/*
Contrat testé : js/sections/skills-names.js (placement des noms d'étoiles, module pur).
  placeNames(names, { min, max, font, lift, obstacles }) -> [{ x, base }], ordre des entrées
  - sans gêne : place habituelle, centre `cx - shift`, base `y - radius - lift` ;
  - deux noms ne se chevauchent jamais, aucun nom ne sort de [min, max] ;
  - le nom le plus large garde sa place, le plus court se décale ; aucun nom des
    constellations réelles n'est empilé à un cran ou plus de son astre ;
  - aucun nom sur l'astre d'une autre étoile ni sur un obstacle (titre de la constellation) ;
  - entrées non modifiées, résultat identique d'un appel à l'autre, liste vide acceptée.
Les constellations réelles viennent de data/fr.json et data/en.json, placées par
skills-layout.js, bornées à leur cellule élargie de 20 % ; largeur d'un nom estimée
(0,51 em par caractère, mesure du nom le plus long dans Chrome).
Lancer : node --test (depuis la racine du dépôt).
*/
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { deepFreeze, importModule, readLocale } from '../helpers.mjs';

const FONT = 12.5;
const LIFT = 9;
const OPTIONS = { min: 0, max: 1100, font: FONT, lift: LIFT, obstacles: [] };
const RADII = { beginner: 7.2, intermediate: 13.2, advanced: 10.8 };
const TOLERANCE = 0.01;

const load = async () => (await importModule('js/sections/skills-names.js')).placeNames;
const star = (cx, y, half, extra = {}) => ({
  cx,
  y,
  radius: 8,
  half,
  rise: 0,
  shift: 0,
  ...extra,
});

/** Boîte d'un nom posé : mêmes proportions que le module (1 em au-dessus, 0,28 dessous). */
const boxOf = (name, spot) => ({
  l: spot.x - name.half,
  r: spot.x + name.half,
  t: spot.base - (name.rise * 1.15 + 1) * FONT,
  b: spot.base + 0.28 * FONT,
});
const bodyOf = (name) => ({
  l: name.cx - name.radius,
  r: name.cx + name.radius,
  t: name.y - name.radius,
  b: name.y + name.radius,
});
const overlap = (a, b) => Math.min(a.r, b.r) - Math.max(a.l, b.l) > TOLERANCE
  && Math.min(a.b, b.b) - Math.max(a.t, b.t) > TOLERANCE;

/** Défauts d'un placement : chevauchements, débords, noms sur un astre ou un obstacle. */
function problems(names, spots, options) {
  const boxes = names.map((name, k) => boxOf(name, spots[k]));
  const found = [];
  boxes.forEach((box, k) => {
    if (box.l < options.min - TOLERANCE || box.r > options.max + TOLERANCE)
      found.push(`nom ${k} hors du plan [${box.l.toFixed(1)}, ${box.r.toFixed(1)}]`);
    boxes.slice(k + 1).forEach((other, j) => {
      if (overlap(box, other)) found.push(`noms ${k} et ${k + 1 + j} superposés`);
    });
    names.forEach((name, j) => {
      if (j !== k && overlap(box, bodyOf(name))) found.push(`nom ${k} sur l'astre ${j}`);
    });
    options.obstacles.forEach((obstacle, j) => {
      if (overlap(box, obstacle)) found.push(`nom ${k} sur l'obstacle ${j}`);
    });
  });
  return found;
}

describe('placeNames', () => {
  test('liste vide : liste vide', async () => {
    const placeNames = await load();
    assert.deepEqual(placeNames([], OPTIONS), []);
  });

  test('sans gêne : place habituelle au-dessus de l\'astre', async () => {
    const placeNames = await load();
    const names = [star(300, 200, 40), star(600, 200, 40, { shift: 24, rise: 1 })];
    assert.deepEqual(placeNames(names, OPTIONS), [
      { x: 300, base: 200 - 8 - LIFT },
      { x: 576, base: 200 - 8 - LIFT },
    ]);
  });

  test('deux étoiles voisines aux noms larges : aucun chevauchement', async () => {
    const placeNames = await load();
    const names = [star(300, 200, 90), star(340, 205, 80), star(320, 230, 70)];
    const spots = placeNames(names, OPTIONS);
    assert.deepEqual(problems(names, spots, OPTIONS), []);
    const usual = { x: 300, base: 200 - 8 - LIFT };
    assert.deepEqual(spots[0], usual, 'le plus large garde sa place');
  });

  test('nom long sous un nom court plus haut : le long garde sa place', async () => {
    const placeNames = await load();
    const names = [star(300, 220, 90), star(400, 214, 30)];
    const spots = placeNames(names, OPTIONS);
    assert.deepEqual(problems(names, spots, OPTIONS), []);
    assert.deepEqual(spots[0], { x: 300, base: 220 - 8 - LIFT });
  });

  test('nom qui dépasserait du plan : ramené à l\'intérieur, des deux côtés', async () => {
    const placeNames = await load();
    const names = [star(1080, 100, 90), star(15, 300, 90)];
    const spots = placeNames(names, OPTIONS);
    assert.deepEqual(problems(names, spots, OPTIONS), []);
  });

  test('nom plus large que le plan : centré sur le plan', async () => {
    const placeNames = await load();
    const [spot] = placeNames([star(30, 100, 90)], { ...OPTIONS, min: 0, max: 120 });
    assert.equal(spot.x, 60);
  });

  test('obstacle sous l\'astre : le nom déplacé l\'évite', async () => {
    const placeNames = await load();
    const obstacle = { l: 250, r: 400, t: 215, b: 235 };
    const options = { ...OPTIONS, obstacles: [obstacle] };
    const names = [star(300, 200, 90), star(330, 202, 90)];
    assert.deepEqual(problems(names, placeNames(names, options), options), []);
  });

  test('entrées gelées non modifiées, résultat stable', async () => {
    const placeNames = await load();
    const names = deepFreeze([star(300, 200, 90), star(340, 205, 80)]);
    const options = deepFreeze({ ...OPTIONS });
    assert.deepEqual(placeNames(names, options), placeNames(names, options));
  });

  test('résultat toujours fini, même avec une largeur ou un rayon non finis', async () => {
    const placeNames = await load();
    const names = [star(300, 200, NaN), star(340, 205, 80, { radius: Infinity })];
    for (const spot of placeNames(names, OPTIONS))
      assert.ok(Number.isFinite(spot.x) && Number.isFinite(spot.base), JSON.stringify(spot));
  });

  for (const lang of ['fr', 'en']) {
    test(`constellations réelles (${lang}) : aucun chevauchement ni débord`, async () => {
      const placeNames = await load();
      const layout = await importModule('js/sections/skills-layout.js');
      const { layoutConstellation, gridOf } = layout;
      const { groups } = readLocale(lang).skills;
      const grid = gridOf(groups.length, { phone: false });
      groups.forEach((group, k) => {
        const origin = {
          x: (k % grid.cols) * grid.cellWidth,
          y: Math.floor(k / grid.cols) * grid.cellHeight,
        };
        const options = {
          ...OPTIONS,
          min: Math.max(0, origin.x - grid.cellWidth * 0.2),
          max: Math.min(grid.width, origin.x + grid.cellWidth * 1.2),
        };
        const points = layoutConstellation(
          group,
          { width: grid.cellWidth, height: grid.cellHeight },
        );
        const names = points.map((point, j) => {
          const item = group.items[j];
          const lines = item.nameLines ?? [item.name];
          const widest = Math.max(...lines.map((line) => line.length));
          return {
            cx: origin.x + point.x,
            y: origin.y + point.y,
            radius: RADII[item.level] ?? 8.4,
            half: (widest * 0.51 * FONT) / 2,
            rise: item.nameLines ? 1 : 0,
            shift: item.nameLines ? 24 : 0,
          };
        });
        const spots = placeNames(names, options);
        assert.deepEqual(problems(names, spots, options), [], `constellation ${group.id}`);
        names.forEach((name, j) => {
          const usual = name.y - name.radius - LIFT;
          const below = name.y + name.radius + LIFT + (name.rise * 1.15 + 1) * FONT;
          const near = spots[j].base >= usual - FONT / 2 && spots[j].base <= below + FONT / 2;
          assert.ok(near, `${group.id} : nom ${j} empilé loin de son astre`);
        });
      });
    });
  }
});
