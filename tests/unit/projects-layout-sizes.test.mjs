/*
Contrat testé : js/sections/projects-layout.js, taille (size) des planètes de la Piscine.
Module pur, sans accès au DOM. Source : plan.md, Décisions (12/10/2026), point 1.
  planetSlots(system, { phone, maxRadius }) -> size de chaque planète de la Piscine, bureau
    et téléphone : 8.4 + (13 - 8.4) x rang / (n - 1), avec n = 20 et rang (0 à n - 1) du projet
    classé par longueur croissante (somme de block.html, ou de items.join('') en liste) ;
    à égalité de longueur, le premier de system.projects a le rang le plus bas ;
  autres systèmes : size = planetSize, testé dans projects-layout.test.mjs.
Lancer : node --test (depuis la racine du dépôt).
*/
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { clone, importModule, readLocale } from '../helpers.mjs';

const EPS = 1e-9;
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

// Projet de la Piscine : une liste de blocs de texte, de longueurs `blocs[j]`.
const texteDe = (total, nombre) => Array.from({ length: nombre }, (_, k) => ({
  type: 'text',
  html: 'a'.repeat(k === 0 ? total : 0),
}));
const piscineDe = blocs => ({
  id: 'piscine',
  name: 'Piscine',
  intro: 'Introduction',
  projects: blocs.map((blocks, j) => ({ id: `piscine-${j}`, title: `Titre ${j}`, blocks })),
});
// Longueur du contrat : somme, sur les blocs, de block.html ou de items.join('').
const longueurProjet = project => project.blocks
  .map(block => (block.type === 'list' ? block.items.join('') : block.html).length)
  .reduce((somme, n) => somme + n, 0);
// Tailles attendues du contrat : rang par longueur croissante, à égalité l'ordre des projets.
const tailleSelonRang = (projects) => {
  const ordre = projects
    .map((project, index) => ({ index, longueur: longueurProjet(project) }))
    .sort((a, b) => a.longueur - b.longueur || a.index - b.index);
  const tailles = [];
  ordre.forEach(({ index }, rang) => {
    tailles[index] = 8.4 + ((13 - 8.4) * rang) / (projects.length - 1);
  });
  return tailles;
};
// Plus le texte est long, plus la planète est grande (longueurs toutes différentes).
const verifieCroissante = (projects, tailles, nom) => {
  const longueurs = projects.map(longueurProjet);
  for (let a = 0; a < projects.length; a++) {
    for (let b = 0; b < projects.length; b++) {
      if (longueurs[a] < longueurs[b]) {
        const detail = `projet ${a} (${longueurs[a]}) à ${tailles[a]}`
          + `, projet ${b} (${longueurs[b]}) à ${tailles[b]}`;
        assert.ok(tailles[a] < tailles[b], `${nom} : ${detail}`);
      }
    }
  }
};

describe('planetSlots, taille de la Piscine par rang de longueur', () => {
  // Longueurs toutes différentes, dans le désordre, et rangs attendus par index.
  const LONGUEURS = [
    50, 3, 120, 0, 77, 9, 200, 14, 33, 65,
    150, 2, 98, 27, 180, 5, 41, 110, 60, 8,
  ];
  const RANGS = [10, 2, 16, 0, 13, 5, 19, 6, 8, 12, 17, 1, 14, 7, 18, 3, 9, 15, 11, 4];
  // Égalités : 7 (index 0, 1, 3), 3 (2, 5), 5 (9, 10), 6 (15, 16, 17), 12 (6, 7), 20 (12, 13).
  const EGALITES = [7, 7, 3, 7, 0, 3, 12, 12, 1, 5, 5, 9, 20, 20, 4, 6, 6, 6, 30, 2];
  const RANGS_EGALITES = [
    11, 12, 3, 13, 0, 4, 15, 16, 1, 6, 7, 14, 17, 18, 5, 8, 9, 10, 19, 2,
  ];

  test('longueurs toutes différentes : rang exact, taille 8,4 + 4,6 x rang / 19', async () => {
    const { planetSlots } = await load();
    const system = piscineDe(LONGUEURS.map(n => texteDe(n, 1)));
    for (const phone of [false, true]) {
      const slots = planetSlots(system, { phone, maxRadius: MAX_RADIUS });
      assert.equal(slots.length, 20);
      slots.forEach((slot, j) => {
        const lieu = phone ? 'téléphone' : 'bureau';
        near(slot.size, 8.4 + (4.6 * RANGS[j]) / 19, `${lieu}, projet ${j}`);
      });
    }
  });

  test('la plus courte vaut 8,4, la plus longue 13', async () => {
    const { planetSlots } = await load();
    const system = piscineDe(LONGUEURS.map(n => texteDe(n, 1)));
    const sizes = planetSlots(system, { phone: false, maxRadius: MAX_RADIUS })
      .map(slot => slot.size);
    near(Math.min(...sizes), 8.4, 'minimum');
    near(Math.max(...sizes), 13, 'maximum');
    near(sizes[3], 8.4, 'longueur 0');
    near(sizes[6], 13, 'longueur 200');
  });

  test('croissante avec la longueur du texte, au bureau et au téléphone', async () => {
    const { planetSlots } = await load();
    const system = piscineDe(LONGUEURS.map(n => texteDe(n, 1)));
    for (const phone of [false, true]) {
      const sizes = planetSlots(system, { phone, maxRadius: MAX_RADIUS })
        .map(slot => slot.size);
      verifieCroissante(system.projects, sizes, `${phone ? 'téléphone' : 'bureau'}`);
    }
  });

  test('égalités de longueur : départagées par l\'ordre des projets', async () => {
    const { planetSlots } = await load();
    const system = piscineDe(EGALITES.map(n => texteDe(n, 1)));
    const slots = planetSlots(system, { phone: false, maxRadius: MAX_RADIUS });
    slots.forEach((slot, j) => {
      near(slot.size, 8.4 + (4.6 * RANGS_EGALITES[j]) / 19, `projet ${j}`);
    });
  });

  test('toutes égales, blocs de nombres différents : rangs par ordre', async () => {
    const { planetSlots } = await load();
    const system = piscineDe(Array.from({ length: 20 }, (_, j) => texteDe(10, (j % 6) + 1)));
    const slots = planetSlots(system, { phone: true, maxRadius: MAX_RADIUS });
    slots.forEach((slot, j) => {
      near(slot.size, 8.4 + (4.6 * j) / 19, `projet ${j}`);
    });
  });

  test('croissantes et décroissantes : rang = position, puis 19 - position', async () => {
    const { planetSlots } = await load();
    const croissante = piscineDe(Array.from({ length: 20 }, (_, j) => texteDe(5 * j, 1)));
    const decroissante = piscineDe(
      Array.from({ length: 20 }, (_, j) => texteDe(5 * (19 - j), 1)),
    );
    const up = planetSlots(croissante, { phone: false, maxRadius: MAX_RADIUS });
    const down = planetSlots(decroissante, { phone: false, maxRadius: MAX_RADIUS });
    up.forEach((slot, j) => near(slot.size, 8.4 + (4.6 * j) / 19, `croissante ${j}`));
    down.forEach((slot, j) => {
      near(slot.size, 8.4 + (4.6 * (19 - j)) / 19, `décroissante ${j}`);
    });
  });

  test('projet sans bloc : longueur 0, rang le plus bas', async () => {
    const { planetSlots } = await load();
    const blocs = [[], ...Array.from({ length: 19 }, (_, j) => texteDe(3 * (j + 1), 1))];
    const slots = planetSlots(piscineDe(blocs), { phone: false, maxRadius: MAX_RADIUS });
    slots.forEach((slot, k) => near(slot.size, 8.4 + (4.6 * k) / 19, `projet ${k}`));
  });

  test('bloc list compté par la jonction sans séparateur de ses items', async () => {
    const { planetSlots } = await load();
    // Projet 1 : items 'abc' et 'def', longueur 6 sans séparateur (rang 1, entre 4 et 7).
    // Avec ',' elle vaudrait 7 (égalité avec le projet 0, rang 2) ;
    // comptée en items, 2 (rang 0).
    const system = piscineDe([
      texteDe(7, 1),
      [{ type: 'list', items: ['abc', 'def'] }],
      texteDe(4, 1),
      ...Array.from({ length: 17 }, (_, k) => texteDe(100 + k, 1)),
    ]);
    const slots = planetSlots(system, { phone: false, maxRadius: MAX_RADIUS });
    near(slots[0].size, 8.4 + (4.6 * 2) / 19, 'texte de 7 caractères');
    near(slots[1].size, 8.4 + (4.6 * 1) / 19, 'liste de 6 caractères');
    near(slots[2].size, 8.4, 'texte de 4 caractères');
    for (let k = 3; k < 20; k++) {
      near(slots[k].size, 8.4 + (4.6 * k) / 19, `projet ${k}`);
    }
  });

  test('titre, résumé et tags ne changent pas la taille', async () => {
    const { planetSlots } = await load();
    const system = piscineDe(LONGUEURS.map(n => texteDe(n, 1)));
    const changed = clone(system);
    changed.projects.forEach((project) => {
      project.title = 'x'.repeat(300);
      project.summary = '';
      project.tags = [];
    });
    const sizes = planetSlots(changed, { phone: false, maxRadius: MAX_RADIUS })
      .map(slot => slot.size);
    nearAll(sizes, tailleSelonRang(system.projects), 'tailles après réécriture');
  });

  test('autres systèmes : taille = planetSize, longueurs de texte sans effet', async () => {
    const { planetSlots } = await load();
    const blocs = [texteDe(1, 1), texteDe(5000, 1), texteDe(1, 6), texteDe(4000, 2)];
    for (const id of ['pro', 'perso', 'school']) {
      const system = {
        id,
        name: `Système ${id}`,
        intro: 'Introduction',
        projects: blocs.map((blocks, j) => ({ id: `${id}-${j}`, title: `T${j}`, blocks })),
      };
      for (const phone of [false, true]) {
        const sizes = planetSlots(system, { phone }).map(slot => slot.size);
        // planetSize : 7 + min(6, 1,4 x blocs) -> 8,4 ; 8,4 ; 13 ; 9,8.
        nearAll(sizes, [8.4, 8.4, 13, 9.8], `${id} ${phone ? 'téléphone' : 'bureau'}`);
      }
    }
  });
});

describe('planetSlots, taille de la Piscine dans les données réelles', () => {
  for (const lang of LANGS) {
    test(`${lang} : 20 tailles selon le rang, 8,4 au minimum et 13 au maximum`, async () => {
      const { planetSlots } = await load();
      const system = readLocale(lang).projects.systems.find(s => s.id === 'piscine');
      const attendues = tailleSelonRang(system.projects);
      assert.equal(attendues.length, 20);
      for (const phone of [false, true]) {
        const sizes = planetSlots(system, { phone, maxRadius: MAX_RADIUS })
          .map(slot => slot.size);
        assert.equal(sizes.length, 20);
        sizes.forEach((size, j) => {
          near(size, attendues[j], `${lang} ${phone ? 'téléphone' : 'bureau'}, projet ${j}`);
        });
        near(Math.min(...sizes), 8.4, `${lang} minimum`);
        near(Math.max(...sizes), 13, `${lang} maximum`);
      }
    });

    test(`${lang} : tailles croissantes avec la longueur du texte`, async () => {
      const { planetSlots } = await load();
      const system = readLocale(lang).projects.systems.find(s => s.id === 'piscine');
      const sizes = planetSlots(system, { phone: false, maxRadius: MAX_RADIUS })
        .map(slot => slot.size);
      verifieCroissante(system.projects, sizes, lang);
    });
  }
});
