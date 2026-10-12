/*
Contrat testé : js/sections/projects-layout.js (placement des planètes de Projets).
Module pur, sans accès au DOM. Source : docs/design/s6/mockup.js (maquette validée).
  planetSize(project) -> 7 + min(6, 1.4 x nombre de blocs) (text et list comptés) ;
  systemRadii(systemId, { phone, maxRadius }) -> rayons des orbites :
    - 'piscine' bureau : [0.28, 0.46, 0.64, 0.82, 1] x maxRadius ;
    - 'piscine' téléphone : [43, 83, 123] (pixels d'écran, maxRadius ignoré) ;
    - tout autre système : [72, 120, 168] ;
  planetSlots(system, { phone, systemIndex, maxRadius }) ->
    [{ id, ring, radius, angle, size }],
    un élément par projet, dans l'ordre ; angle = angle initial + systemIndex (défaut 0) :
    - hors Piscine : ring = j % 3, angle = j x 2.4 + systemIndex (bureau et téléphone) ;
    - Piscine bureau : 5 orbites de 2, 4, 4, 5, 5 planètes, décalages [1.1, 3.59, 4.46,
      5.18, 0.71], cases triées par angle de base, le module j prend la case j ;
    - Piscine téléphone : 3, 6 et 11 planètes, couples [ring, angle] figés (PHONE_SLOTS) ;
    - Piscine hors de 20 projets : lève, ou renvoie un élément fini par projet ;
    - taille : hors Piscine, planetSize du projet ; Piscine, bureau et téléphone :
      8.4 + (13 - 8.4) x rang / (n - 1), n = 20, rang (0 à n - 1) du projet classé par
      longueur croissante (somme de block.html, ou de items.join('') en liste), à égalité
      le premier de system.projects d'abord ;
  splitTitle(title) -> [title] sans espace, sinon coupe à l'espace le plus proche du
    milieu (à égalité le premier), l'espace supprimé ;
  nearestPlanet(point, planets, hitRadius = 22) -> la planète au centre le plus proche,
    à une distance STRICTEMENT inférieure à hitRadius (égalité : la première), sinon null.
Position, anneau, rayon et angle ne dépendent que de `id` et de l'ordre des projets, jamais
des textes ni de la langue ; seule la taille de la Piscine dépend des longueurs de ses textes.
Taille de la Piscine (par rang de longueur) : projects-layout-sizes.test.mjs.
Lancer : node --test (depuis la racine du dépôt).
*/
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { clone, deepFreeze, importModule, readLocale } from '../helpers.mjs';

const EPS = 1e-9;
const TAU = 2 * Math.PI;
const MAX_RADIUS = 215;
const LANGS = ['fr', 'en'];

const load = async () => {
  const mod = await importModule('js/sections/projects-layout.js');
  const names = ['planetSize', 'systemRadii', 'planetSlots', 'splitTitle', 'nearestPlanet'];
  for (const name of names) {
    assert.equal(typeof mod[name], 'function', `projects-layout.js doit exporter ${name}`);
  }
  return mod;
};

const near = (actual, expected, message) => {
  assert.ok(
    Math.abs(actual - expected) < EPS,
    `${message ?? 'valeur'} : ${actual} attendu ${expected}`,
  );
};
const nearAll = (actual, expected, message) => {
  assert.equal(actual.length, expected.length, `${message} : longueur`);
  expected.forEach((value, i) => near(actual[i], value, `${message}[${i}]`));
};

const makeProject = (id, blockCount) => ({
  id,
  title: `Titre ${id}`,
  summary: `Résumé ${id}`,
  tags: ['a', 'b'],
  blocks: Array.from({ length: blockCount }, (_, i) =>
    i % 2 ? { type: 'list', items: [`item ${i}`] } : { type: 'text', html: `Texte ${i}` }),
});
const makeSystem = (id, count) => ({
  id,
  name: `Système ${id}`,
  intro: 'Introduction',
  projects: Array.from({ length: count }, (_, j) => makeProject(`${id}-${j}`, (j % 6) + 1)),
});

// Valeurs attendues figées : géométrie de la Piscine téléphone (mockup.js:32-36).
const PHONE_SLOTS = [
  [2, 4.42], [2, 4.995], [1, 6.059], [2, 1.875], [1, 3.043], [2, 5.448], [2, 1.296],
  [0, 1.113], [2, 0.444], [2, 0.902], [2, 0.007], [1, 1.565], [1, 3.903], [1, 0.659],
  [0, 3.428], [2, 5.82], [2, 3.49], [1, 2.253], [0, 5.268], [2, 2.661],
];
const PHONE_RINGS = [43, 83, 123];
const DESK_COUNTS = [2, 4, 4, 5, 5];
const DESK_OFFSETS = [1.1, 3.59, 4.46, 5.18, 0.71];
const DESK_RATIOS = [0.28, 0.46, 0.64, 0.82, 1];

// Sorties sans la taille de la Piscine, seule taille qui dépend de la langue.
const sansTaillePiscine = (slots, system) => {
  if (system.id !== 'piscine') return slots;
  return slots.map(({ size, ...reste }) => reste);
};

// Cases de la Piscine bureau, recalculées depuis le contrat : [ring, angle de base] triés.
function deskSlots() {
  const slots = [];
  DESK_COUNTS.forEach((count, ring) => {
    for (let m = 0; m < count; m++) {
      slots.push([ring, (DESK_OFFSETS[ring] + (m * TAU) / count) % TAU]);
    }
  });
  return slots.sort((a, b) => a[1] - b[1]);
}

describe('planetSize', () => {
  test('1 bloc : 8,4', async () => {
    const { planetSize } = await load();
    near(planetSize(makeProject('p', 1)), 8.4);
  });

  test('4 blocs : 12,6', async () => {
    const { planetSize } = await load();
    near(planetSize(makeProject('p', 4)), 12.6);
  });

  test('5 blocs et plus : plafonné à 13', async () => {
    const { planetSize } = await load();
    for (const count of [5, 6, 10, 1000]) {
      near(planetSize(makeProject('p', count)), 13, `${count} blocs`);
    }
  });

  test('0 bloc : 7', async () => {
    const { planetSize } = await load();
    near(planetSize(makeProject('p', 0)), 7);
  });

  test('compte les blocs text et list de la même façon', async () => {
    const { planetSize } = await load();
    const texts = { blocks: [{ type: 'text', html: 'a' }, { type: 'text', html: 'b' }] };
    const lists = { blocks: [{ type: 'list', items: ['a'] }, { type: 'list', items: ['b'] }] };
    near(planetSize(texts), 9.8);
    near(planetSize(lists), 9.8);
  });

  test('croît avec le nombre de blocs puis reste constant', async () => {
    const { planetSize } = await load();
    const sizes = [0, 1, 2, 3, 4, 5, 6, 7].map(n => planetSize(makeProject('p', n)));
    for (let i = 1; i < sizes.length; i++) {
      assert.ok(sizes[i] >= sizes[i - 1] - EPS, `taille décroissante à ${i} blocs`);
    }
  });

  test('projet sans tableau blocks : lève, ou renvoie 7', async () => {
    const { planetSize } = await load();
    for (const bad of [{ id: 'x' }, { id: 'x', blocks: null }, { id: 'x', blocks: 'abc' }]) {
      try {
        near(planetSize(bad), 7, 'projet sans blocs');
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.notEqual(error.name, 'AssertionError', error.message);
      }
    }
  });

  test('ne modifie pas un projet gelé', async () => {
    const { planetSize } = await load();
    const project = deepFreeze(makeProject('p', 3));
    near(planetSize(project), 11.2);
  });
});

describe('systemRadii', () => {
  test('Piscine bureau : rapports x maxRadius', async () => {
    const { systemRadii } = await load();
    nearAll(
      systemRadii('piscine', { phone: false, maxRadius: MAX_RADIUS }),
      DESK_RATIOS.map(k => k * MAX_RADIUS),
      'rayons',
    );
    nearAll(
      systemRadii('piscine', { phone: false, maxRadius: 100 }),
      [28, 46, 64, 82, 100],
      'rayons à 100',
    );
  });

  test('Piscine téléphone : [43, 83, 123], maxRadius ignoré', async () => {
    const { systemRadii } = await load();
    for (const maxRadius of [MAX_RADIUS, 1, undefined, NaN]) {
      nearAll(systemRadii('piscine', { phone: true, maxRadius }), PHONE_RINGS, 'rayons');
    }
  });

  test('autres systèmes : [72, 120, 168] au bureau et au téléphone', async () => {
    const { systemRadii } = await load();
    for (const id of ['pro', 'perso', 'school']) {
      for (const phone of [false, true]) {
        nearAll(systemRadii(id, { phone, maxRadius: MAX_RADIUS }), [72, 120, 168], id);
      }
    }
  });

  test('autres systèmes : maxRadius absent ou invalide sans effet', async () => {
    const { systemRadii } = await load();
    nearAll(systemRadii('pro', { phone: false }), [72, 120, 168], 'sans maxRadius');
    nearAll(systemRadii('school', { phone: false, maxRadius: NaN }), [72, 120, 168], 'NaN');
  });

  test('Piscine bureau, maxRadius invalide : lève, ou rayons finis positifs', async () => {
    const { systemRadii } = await load();
    const invalid = [NaN, Infinity, -Infinity, 0, -5, undefined];
    for (const maxRadius of invalid) {
      try {
        const radii = systemRadii('piscine', { phone: false, maxRadius });
        assert.ok(radii.length > 0, `maxRadius ${maxRadius} : liste vide`);
        for (const r of radii) {
          assert.ok(Number.isFinite(r) && r > 0, `maxRadius ${maxRadius} : rayon ${r}`);
        }
      } catch (error) {
        assert.notEqual(error.name, 'AssertionError', error.message);
      }
    }
  });

  test('renvoie un tableau neuf à chaque appel', async () => {
    const { systemRadii } = await load();
    const first = systemRadii('pro', { phone: false });
    first[0] = -1;
    nearAll(systemRadii('pro', { phone: false }), [72, 120, 168], 'second appel');
  });
});

describe('planetSlots, hors Piscine', () => {
  test('ring = j % 3 et angle = j x 2.4, au bureau et au téléphone', async () => {
    const { planetSlots } = await load();
    const system = makeSystem('school', 16);
    for (const phone of [false, true]) {
      const slots = planetSlots(system, { phone });
      assert.equal(slots.length, 16);
      slots.forEach((slot, j) => {
        assert.equal(slot.id, system.projects[j].id);
        assert.equal(slot.ring, j % 3);
        near(slot.angle, j * 2.4, `angle ${j}`);
        near(slot.radius, [72, 120, 168][j % 3], `rayon ${j}`);
      });
    }
  });

  test('systemIndex s\'ajoute à l\'angle, rien d\'autre ne change', async () => {
    const { planetSlots } = await load();
    const system = makeSystem('perso', 9);
    const base = planetSlots(system, { phone: false, systemIndex: 0 });
    for (const systemIndex of [1, 2, 3]) {
      const shifted = planetSlots(system, { phone: false, systemIndex });
      shifted.forEach((slot, j) => {
        near(slot.angle, base[j].angle + systemIndex, `angle ${j}`);
        assert.deepEqual({ ...slot, angle: 0 }, { ...base[j], angle: 0 });
      });
    }
  });

  test('systemIndex absent vaut 0', async () => {
    const { planetSlots } = await load();
    const system = makeSystem('pro', 8);
    assert.deepEqual(planetSlots(system, { phone: false }), planetSlots(system, {
      phone: false,
      systemIndex: 0,
    }));
  });

  test('size = planetSize du projet', async () => {
    const { planetSlots, planetSize } = await load();
    const system = makeSystem('pro', 8);
    planetSlots(system, { phone: false }).forEach((slot, j) => {
      near(slot.size, planetSize(system.projects[j]), `taille ${j}`);
    });
  });

  test('système sans projet : tableau vide', async () => {
    const { planetSlots } = await load();
    assert.deepEqual(planetSlots(makeSystem('pro', 0), { phone: false }), []);
  });
});

describe('planetSlots, Piscine bureau', () => {
  test('20 cases : orbites de 2, 4, 4, 5 et 5 planètes', async () => {
    const { planetSlots } = await load();
    const system = makeSystem('piscine', 20);
    const slots = planetSlots(system, { phone: false, maxRadius: MAX_RADIUS });
    const perRing = [0, 1, 2, 3, 4].map(r => slots.filter(s => s.ring === r).length);
    assert.deepEqual(perRing, DESK_COUNTS);
  });

  test('angle de base et orbite de chaque case, triés par angle croissant', async () => {
    const { planetSlots } = await load();
    const system = makeSystem('piscine', 20);
    const slots = planetSlots(system, { phone: false, maxRadius: MAX_RADIUS });
    const expected = deskSlots();
    slots.forEach((slot, j) => {
      assert.equal(slot.id, system.projects[j].id);
      assert.equal(slot.ring, expected[j][0], `orbite ${j}`);
      near(slot.angle, expected[j][1], `angle ${j}`);
      near(slot.radius, DESK_RATIOS[expected[j][0]] * MAX_RADIUS, `rayon ${j}`);
    });
  });

  test('les angles de base sont croissants', async () => {
    const { planetSlots } = await load();
    const system = makeSystem('piscine', 20);
    const slots = planetSlots(system, { phone: false, maxRadius: MAX_RADIUS });
    for (let j = 1; j < slots.length; j++) {
      assert.ok(slots[j].angle >= slots[j - 1].angle, `angle ${j} avant l'angle ${j - 1}`);
    }
  });

  test('systemIndex 3 : angle de base + 3', async () => {
    const { planetSlots } = await load();
    const system = makeSystem('piscine', 20);
    const slots = planetSlots(system, { phone: false, systemIndex: 3, maxRadius: MAX_RADIUS });
    const expected = deskSlots();
    slots.forEach((slot, j) => near(slot.angle, expected[j][1] + 3, `angle ${j}`));
  });

  test('maxRadius change les rayons proportionnellement', async () => {
    const { planetSlots } = await load();
    const system = makeSystem('piscine', 20);
    const small = planetSlots(system, { phone: false, maxRadius: 100 });
    const large = planetSlots(system, { phone: false, maxRadius: 200 });
    small.forEach((slot, j) => {
      near(large[j].radius, slot.radius * 2, `rayon ${j}`);
      assert.equal(large[j].ring, slot.ring);
    });
  });
});

describe('planetSlots, Piscine téléphone', () => {
  test('anneaux de 3, 6 et 11 planètes', async () => {
    const { planetSlots } = await load();
    const slots = planetSlots(makeSystem('piscine', 20), { phone: true });
    const perRing = [0, 1, 2].map(r => slots.filter(s => s.ring === r).length);
    assert.deepEqual(perRing, [3, 6, 11]);
  });

  test('couples [anneau, angle] et rayons figés', async () => {
    const { planetSlots } = await load();
    const system = makeSystem('piscine', 20);
    const slots = planetSlots(system, { phone: true });
    slots.forEach((slot, j) => {
      assert.equal(slot.id, system.projects[j].id);
      assert.equal(slot.ring, PHONE_SLOTS[j][0], `anneau ${j}`);
      near(slot.angle, PHONE_SLOTS[j][1], `angle ${j}`);
      near(slot.radius, PHONE_RINGS[PHONE_SLOTS[j][0]], `rayon ${j}`);
    });
  });

  test('maxRadius ignoré, systemIndex 2 ajouté aux angles', async () => {
    const { planetSlots } = await load();
    const system = makeSystem('piscine', 20);
    const slots = planetSlots(system, { phone: true, systemIndex: 2, maxRadius: 999 });
    slots.forEach((slot, j) => {
      near(slot.angle, PHONE_SLOTS[j][1] + 2, `angle ${j}`);
      near(slot.radius, PHONE_RINGS[PHONE_SLOTS[j][0]], `rayon ${j}`);
    });
  });

  /* Zones de toucher de 44 px (2 x 22) disjointes ; la maquette mesure 45,4 px au plus bas. */
  test('toutes les planètes sont à 44 px au moins les unes des autres', async () => {
    const { planetSlots } = await load();
    const slots = planetSlots(makeSystem('piscine', 20), { phone: true });
    for (const phase of [0, 1.3, 4.1]) {
      const points = slots.map(({ radius, angle }) => [
        radius * Math.cos(angle + phase),
        radius * Math.sin(angle + phase),
      ]);
      for (let a = 0; a < points.length; a++) {
        for (let b = a + 1; b < points.length; b++) {
          const d = Math.hypot(points[a][0] - points[b][0], points[a][1] - points[b][1]);
          assert.ok(d >= 44, `planètes ${a} et ${b} à ${d.toFixed(2)} px (phase ${phase})`);
        }
      }
    }
  });
});

describe('planetSlots, Piscine hors de 20 projets', () => {
  test('lève (nombre reçu nommé) ou renvoie un élément fini par projet', async () => {
    const { planetSlots } = await load();
    for (const count of [0, 1, 19, 21, 40]) {
      for (const phone of [false, true]) {
        const system = makeSystem('piscine', count);
        try {
          const slots = planetSlots(system, { phone, maxRadius: MAX_RADIUS });
          assert.equal(slots.length, count, `${count} projets`);
          for (const slot of slots) {
            for (const key of ['ring', 'radius', 'angle', 'size']) {
              assert.ok(Number.isFinite(slot[key]), `${count} projets : ${key} ${slot[key]}`);
            }
          }
        } catch (error) {
          assert.notEqual(error.name, 'AssertionError', error.message);
          assert.match(error.message, new RegExp(`\\b${count}\\b`), 'message sans le nombre');
        }
      }
    }
  });
});

describe('planetSlots, données réelles', () => {
  for (const lang of LANGS) {
    test(`${lang} : 4 systèmes, une orbite et des valeurs finies par projet`, async () => {
      const { planetSlots, systemRadii } = await load();
      const systems = readLocale(lang).projects.systems;
      assert.deepEqual(systems.map(s => s.id), ['pro', 'perso', 'school', 'piscine']);
      systems.forEach((system, systemIndex) => {
        for (const phone of [false, true]) {
          const options = { phone, systemIndex, maxRadius: MAX_RADIUS };
          const slots = planetSlots(system, options);
          const radii = systemRadii(system.id, options);
          assert.deepEqual(slots.map(s => s.id), system.projects.map(p => p.id));
          for (const slot of slots) {
            for (const key of ['ring', 'radius', 'angle', 'size']) {
              assert.ok(Number.isFinite(slot[key]), `${system.id} ${slot.id} : ${key}`);
            }
            assert.ok(Number.isInteger(slot.ring) && slot.ring >= 0, `${slot.id} : ring`);
            assert.ok(slot.ring < radii.length, `${slot.id} : planète sans orbite`);
            near(slot.radius, radii[slot.ring], `${slot.id} : rayon`);
            assert.ok(slot.size >= 7 - EPS && slot.size <= 13 + EPS, `${slot.id} : taille`);
          }
        }
      });
    });

    test(`${lang} : la Piscine compte 20 planètes`, () => {
      const piscine = readLocale(lang).projects.systems.find(s => s.id === 'piscine');
      assert.equal(piscine.projects.length, 20);
    });
  }
});

describe('planetSlots, indépendance de la langue', () => {
  test('fr et en donnent les mêmes sorties, hors taille de la Piscine', async () => {
    const { planetSlots } = await load();
    const fr = readLocale('fr').projects.systems;
    const en = readLocale('en').projects.systems;
    fr.forEach((system, systemIndex) => {
      for (const phone of [false, true]) {
        const options = { phone, systemIndex, maxRadius: MAX_RADIUS };
        assert.deepEqual(
          sansTaillePiscine(planetSlots(system, options), system),
          sansTaillePiscine(planetSlots(en[systemIndex], options), en[systemIndex]),
        );
      }
    });
  });

  test('textes réécrits : sorties inchangées, hors taille de la Piscine', async () => {
    const { planetSlots } = await load();
    const systems = readLocale('fr').projects.systems;
    systems.forEach((system, systemIndex) => {
      const changed = clone(system);
      changed.name = 'Autre nom';
      changed.intro = 'Autre introduction';
      for (const project of changed.projects) {
        project.title = `Titre réécrit ${'é'.repeat(80)}`;
        project.summary = '';
        project.tags = ['x'];
        for (const block of project.blocks) {
          if (block.html !== undefined) block.html = 'y'.repeat(900);
          if (block.items !== undefined) block.items = block.items.map(() => 'z');
        }
      }
      for (const phone of [false, true]) {
        const options = { phone, systemIndex, maxRadius: MAX_RADIUS };
        assert.deepEqual(
          sansTaillePiscine(planetSlots(changed, options), changed),
          sansTaillePiscine(planetSlots(system, options), system),
        );
      }
    });
  });

  test('entrées gelées : jamais modifiées, sortie identique', async () => {
    const { planetSlots, systemRadii, planetSize } = await load();
    const systems = deepFreeze(clone(readLocale('fr').projects.systems));
    const reference = readLocale('fr').projects.systems;
    systems.forEach((system, systemIndex) => {
      const options = deepFreeze({ phone: true, systemIndex, maxRadius: MAX_RADIUS });
      const expected = planetSlots(reference[systemIndex], options);
      assert.deepEqual(planetSlots(system, options), expected);
      systemRadii(system.id, options);
      system.projects.forEach(project => planetSize(project));
    });
    assert.deepEqual(systems, reference);
  });
});

describe('splitTitle', () => {
  test('sans espace : le titre seul', async () => {
    const { splitTitle } = await load();
    assert.deepEqual(splitTitle('Portfolio'), ['Portfolio']);
    assert.deepEqual(splitTitle(''), ['']);
  });

  test('un seul espace : coupe là, espace supprimé', async () => {
    const { splitTitle } = await load();
    assert.deepEqual(splitTitle('Hello world'), ['Hello', 'world']);
    assert.deepEqual(splitTitle('a bcdefghij'), ['a', 'bcdefghij']);
  });

  test('plusieurs espaces : le plus proche du milieu', async () => {
    const { splitTitle } = await load();
    // milieu 10,5 : espaces en 2, 8 et 11 -> 11 (distance 0,5)
    assert.deepEqual(splitTitle('Un outil de recherche'), ['Un outil de', 'recherche']);
    assert.deepEqual(splitTitle('aaaa bb cccccccc'), ['aaaa bb', 'cccccccc']);
  });

  test('à égalité de distance : le premier espace', async () => {
    const { splitTitle } = await load();
    // longueur 7, milieu 3,5 : espaces en 3 et 4, distances 0,5 et 0,5
    assert.deepEqual(splitTitle('abc  de'), ['abc', ' de']);
  });

  test('espace en tête ou en queue : coupe sans perdre le reste', async () => {
    const { splitTitle } = await load();
    assert.deepEqual(splitTitle(' abc'), ['', 'abc']);
    assert.deepEqual(splitTitle('abc '), ['abc', '']);
  });

  test('reconstitue le titre : avant + espace + après', async () => {
    const { splitTitle } = await load();
    for (const lang of LANGS) {
      for (const system of readLocale(lang).projects.systems) {
        for (const { title } of system.projects) {
          const parts = splitTitle(title);
          assert.ok(parts.length === 1 || parts.length === 2);
          assert.equal(parts.join(' '), title);
        }
      }
    }
  });
});

describe('nearestPlanet', () => {
  const planets = deepFreeze([
    { id: 'a', x: 0, y: 0 },
    { id: 'b', x: 30, y: 0 },
    { id: 'c', x: 100, y: 100 },
  ]);

  test('liste vide : null', async () => {
    const { nearestPlanet } = await load();
    assert.equal(nearestPlanet({ x: 0, y: 0 }, []), null);
  });

  test('aucune planète à moins de 22 px : null', async () => {
    const { nearestPlanet } = await load();
    assert.equal(nearestPlanet({ x: 60, y: 60 }, planets), null);
  });

  test('une planète touchée : renvoie cet élément même', async () => {
    const { nearestPlanet } = await load();
    assert.equal(nearestPlanet({ x: 98, y: 101 }, planets), planets[2]);
  });

  test('zones qui se chevauchent : le centre le plus proche gagne', async () => {
    const { nearestPlanet } = await load();
    assert.equal(nearestPlanet({ x: 14, y: 0 }, planets), planets[0]);
    assert.equal(nearestPlanet({ x: 16, y: 0 }, planets), planets[1]);
    assert.equal(nearestPlanet({ x: 16, y: 0 }, [...planets].reverse()), planets[1]);
  });

  test('distance exactement égale au rayon : null (strictement inférieur)', async () => {
    const { nearestPlanet } = await load();
    assert.equal(nearestPlanet({ x: 22, y: 0 }, [{ id: 'a', x: 0, y: 0 }]), null);
    assert.equal(nearestPlanet({ x: 3, y: 4 }, [{ id: 'a', x: 0, y: 0 }], 5), null);
    assert.equal(nearestPlanet({ x: 21.99, y: 0 }, [planets[0]]), planets[0]);
  });

  test('rayon personnalisé', async () => {
    const { nearestPlanet } = await load();
    assert.equal(nearestPlanet({ x: 40, y: 0 }, planets), planets[1]);
    assert.equal(nearestPlanet({ x: 60, y: 0 }, planets, 40), planets[1]);
    assert.equal(nearestPlanet({ x: 60, y: 0 }, planets, 29), null);
  });

  test('distance égale entre deux planètes : la première de la liste', async () => {
    const { nearestPlanet } = await load();
    const tie = [{ id: 'p', x: -10, y: 0 }, { id: 'q', x: 10, y: 0 }];
    assert.equal(nearestPlanet({ x: 0, y: 0 }, tie), tie[0]);
    assert.equal(nearestPlanet({ x: 0, y: 0 }, [tie[1], tie[0]]), tie[1]);
  });

  test('ne modifie ni le point ni la liste gelés', async () => {
    const { nearestPlanet } = await load();
    const point = deepFreeze({ x: 5, y: 5 });
    assert.equal(nearestPlanet(point, planets), planets[0]);
  });
});
