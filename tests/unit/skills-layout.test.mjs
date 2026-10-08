/*
Contrat testé : js/sections/skills-layout.js (placement organique des constellations).
  layoutConstellation(group, { width, height }) -> [{ id, x, y }]
  - un élément par étoile de group.items, dans leur ordre ;
  - x et y finis, dans la boîte [0, width] x [0, height] ;
  - positions identiques si seuls `title`, `short`, `name`, `description` sont traduits
    (le placement ne dépend que de `id`) ;
  - deux étoiles ne se superposent jamais (distance minimale > 0) ;
  - dimension invalide (NaN, infinie, négative) : lève, ou renvoie des positions finies.
Les groupes réels viennent de data/fr.json et data/en.json (schéma du plan).
Lancer : node --test (depuis la racine du dépôt).
*/
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { clone, deepFreeze, importModule, ROOT_URL } from '../helpers.mjs';

const load = async () => {
  const mod = await importModule('js/sections/skills-layout.js');
  assert.equal(typeof mod.layoutConstellation, 'function',
    'skills-layout.js doit exporter layoutConstellation');
  return mod.layoutConstellation;
};

const LEVELS = ['advanced', 'intermediate', 'beginner', 'unknown'];
function makeGroup(id, count, prefix = 'star') {
  return {
    id, title: `Titre ${id}`, short: `Court ${id}`,
    items: Array.from({ length: count }, (_, i) => ({
      id: `${prefix}-${i}`, name: `Nom ${i}`, level: LEVELS[i % 4],
      projects: i % 2 ? [`p${i}`] : [], description: `Description ${i}`,
    })),
  };
}
function translate(group) {
  const copy = clone(group);
  copy.title = `Translated ${group.title} é`;
  copy.short = '';
  for (const item of copy.items) {
    item.name = `Translated ${item.name} 🚀`;
    item.description = 'x'.repeat(500);
  }
  return copy;
}

const BOXES = [
  { width: 320, height: 240 }, { width: 390, height: 600 }, { width: 1280, height: 720 },
  { width: 2560, height: 100 }, { width: 100, height: 2560 }, { width: 50, height: 50 },
];

function pairs(list) {
  const out = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) out.push([list[i], list[j]]);
  }
  return out;
}
function checkLayout(result, group, box, label) {
  assert.ok(Array.isArray(result), `${label} : le résultat doit être un tableau`);
  assert.deepEqual(result.map((s) => s.id), group.items.map((s) => s.id),
    `${label} : ids ou ordre différents`);
  for (const star of result) {
    assert.ok(Number.isFinite(star.x) && Number.isFinite(star.y),
      `${label} : position non finie pour ${star.id} (${star.x}, ${star.y})`);
    assert.ok(star.x >= 0 && star.x <= box.width && star.y >= 0 && star.y <= box.height,
      `${label} : ${star.id} en (${star.x}, ${star.y}) hors de ${box.width}x${box.height}`);
  }
  for (const [a, b] of pairs(result)) {
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    assert.ok(distance > 0,
      `${label} : ${a.id} et ${b.id} se superposent en (${a.x}, ${a.y})`);
  }
}

describe('layoutConstellation : cas valides', () => {
  test('un élément par étoile, dans l\'ordre, dans la boîte, sans superposition', async () => {
    const layoutConstellation = await load();
    for (const box of BOXES) {
      for (const count of [1, 2, 3, 5, 8, 12]) {
        const group = makeGroup('languages', count);
        checkLayout(layoutConstellation(group, box), group, box,
          `${count} étoiles dans ${box.width}x${box.height}`);
      }
    }
  });

  test('déterministe : deux appels identiques donnent les mêmes positions', async () => {
    const layoutConstellation = await load();
    const group = makeGroup('web', 7);
    const box = { width: 390, height: 500 };
    assert.deepEqual(layoutConstellation(group, box), layoutConstellation(group, box));
  });

  test('indépendant des autres appels (pas d\'état partagé)', async () => {
    const layoutConstellation = await load();
    const group = makeGroup('web', 6);
    const box = { width: 600, height: 400 };
    const alone = layoutConstellation(group, box);
    layoutConstellation(makeGroup('autre', 9), { width: 100, height: 100 });
    assert.deepEqual(layoutConstellation(group, box), alone);
  });

  test('traduire title, short, name et description ne change aucune position', async () => {
    const layoutConstellation = await load();
    for (const box of BOXES) {
      const group = makeGroup('languages', 8);
      assert.deepEqual(layoutConstellation(translate(group), box),
        layoutConstellation(group, box),
        `positions modifiées par la traduction dans ${box.width}x${box.height}`);
    }
  });

  test('ne modifie pas le groupe et accepte un groupe gelé', async () => {
    const layoutConstellation = await load();
    const group = makeGroup('data', 5);
    const before = JSON.stringify(group);
    layoutConstellation(deepFreeze(group), { width: 320, height: 240 });
    assert.equal(JSON.stringify(group), before);
  });

  test('groupe sans étoile : tableau vide', async () => {
    const layoutConstellation = await load();
    const box = { width: 320, height: 240 };
    assert.deepEqual(layoutConstellation(makeGroup('empty', 0), box), []);
  });

  test('200 étoiles : toutes dans la boîte et distinctes', async () => {
    const layoutConstellation = await load();
    const box = { width: 1280, height: 720 };
    const group = makeGroup('many', 200);
    checkLayout(layoutConstellation(group, box), group, box, '200 étoiles');
  });

  test('identifiants à caractères accentués ou très longs', async () => {
    const layoutConstellation = await load();
    const group = makeGroup('é', 0);
    group.items = ['é', 'e', '日本', 'x'.repeat(10000)].map((id) => ({
      id, name: 'n', level: 'unknown', projects: [], description: 'd',
    }));
    const box = { width: 320, height: 240 };
    checkLayout(layoutConstellation(group, box), group, box, 'identifiants exotiques');
  });
});

describe('layoutConstellation : dimensions limites', () => {
  const group = makeGroup('edge', 4);
  const invalid = [
    ['largeur NaN', { width: NaN, height: 100 }], ['hauteur NaN', { width: 100, height: NaN }],
    ['largeur infinie', { width: Infinity, height: 100 }],
    ['hauteur infinie', { width: 100, height: Infinity }],
    ['largeur négative', { width: -320, height: 100 }],
    ['hauteur négative', { width: 100, height: -1 }],
    ['largeur nulle', { width: 0, height: 100 }], ['boîte nulle', { width: 0, height: 0 }],
    ['dimensions absentes', {}], ['boîte absente', undefined],
  ];
  for (const [name, box] of invalid) {
    test(`${name} : lève, ou ne renvoie que des positions finies`, async () => {
      const layoutConstellation = await load();
      let result;
      try {
        result = layoutConstellation(group, box);
      } catch {
        return; // refuser est acceptable
      }
      assert.ok(Array.isArray(result), `${name} : résultat non tableau`);
      for (const star of result) {
        assert.ok(Number.isFinite(star.x) && Number.isFinite(star.y),
          `${name} : ${star.id} placée en (${star.x}, ${star.y})`);
      }
    });
  }

  test('boîte minuscule (1x1) : positions finies dans la boîte', async () => {
    const layoutConstellation = await load();
    const box = { width: 1, height: 1 };
    const result = layoutConstellation(group, box);
    for (const star of result) {
      assert.ok(star.x >= 0 && star.x <= 1 && star.y >= 0 && star.y <= 1,
        `${star.id} en (${star.x}, ${star.y}) hors de 1x1`);
    }
  });

  test('boîte énorme (1e9) : positions finies dans la boîte', async () => {
    const layoutConstellation = await load();
    const box = { width: 1e9, height: 1e9 };
    checkLayout(layoutConstellation(group, box), group, box, 'boîte 1e9');
  });
});

describe('layoutConstellation : groupes réels de data/*.json', () => {
  const read = (lang) =>
    JSON.parse(readFileSync(new URL(`data/${lang}.json`, ROOT_URL), 'utf8'));
  const groupsOf = (lang) => {
    const groups = read(lang).skills?.groups;
    assert.ok(Array.isArray(groups) && groups.length > 0,
      `data/${lang}.json : skills.groups absent (schéma attendu du plan)`);
    return groups;
  };

  test('placement identique en français et en anglais, sans superposition', async () => {
    const layoutConstellation = await load();
    const [fr, en] = [groupsOf('fr'), groupsOf('en')];
    assert.equal(fr.length, en.length, 'nombre de constellations différent entre FR et EN');
    for (const box of BOXES) {
      fr.forEach((group, i) => {
        const label = `constellation ${group.id} dans ${box.width}x${box.height}`;
        const resultFr = layoutConstellation(group, box);
        checkLayout(resultFr, group, box, label);
        assert.deepEqual(layoutConstellation(en[i], box), resultFr,
          `${label} : FR et EN diffèrent`);
      });
    }
  });
});
