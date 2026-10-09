/*
Contrat testé : js/core/schema.js (validation pure du JSON d'une langue).
  validateLocale(data) -> string[]
  - liste des chemins fautifs, forme `home.telemetry.rows[2].label` (points, crochets) ;
  - tableau vide si `data` est conforme au schéma de docs/design/plan.md ;
  - champ manquant, mauvais type, tableau vide là où une liste est attendue,
    chaîne vide : chacun produit son chemin ;
  - ne lève jamais (même pour null, un nombre, un tableau) et ne modifie pas `data`.
Fixture valide minimale : tests/fixtures/valid-locale.json.
Lancer : node --test (depuis la racine du dépôt).
*/
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { assertLinear, clone, deepFreeze, importModule, readFixture } from '../helpers.mjs';

const MODULE = 'js/core/schema.js';
const valid = readFixture('valid-locale.json');
const load = async () => {
  const mod = await importModule(MODULE);
  assert.equal(typeof mod.validateLocale, 'function', `${MODULE} : validateLocale manquante`);
  return mod.validateLocale;
};

// --- Parcours de l'arbre : tous les nœuds avec leur chemin au format du contrat ---
const toPath = (segs) =>
  segs.reduce(
    (acc, s) => {
      if (typeof s === 'number') return `${acc}[${s}]`;
      return acc ? `${acc}.${s}` : s;
    },
    '',
  );

function collectNodes(value, segs = [], out = []) {
  if (segs.length) out.push({ segs, path: toPath(segs), value });
  if (Array.isArray(value)) value.forEach((v, i) => collectNodes(v, [...segs, i], out));
  else if (value && typeof value === 'object')
    for (const [k, v] of Object.entries(value)) collectNodes(v, [...segs, k], out);
  return out;
}

const DELETE = Symbol('delete');
function mutate(segs, replacement) {
  const copy = clone(valid);
  const parent = segs.slice(0, -1).reduce((node, s) => node[s], copy);
  const last = segs[segs.length - 1];
  if (replacement === DELETE) delete parent[last];
  else parent[last] = replacement;
  return copy;
}

const nodes = collectNodes(valid);
const shape = (path) => path.replace(/\[\d+\]/g, '[]');
const isSelfOrChild = (found, path) =>
  found === path || found.startsWith(`${path}.`) || found.startsWith(`${path}[`);

// Champs que le schéma peut raisonnablement laisser facultatifs : jamais testés en absence.
const OPTIONAL_SHAPES = new Set([
  'journey.stops[].now',
  'home.telemetry.rows[].live',
  'projects.systems[].projects[].media',
  'projects.systems[].projects[].tags',
  'projects.systems[].projects[].links',
  'skills.groups[].items[].projects',
]);
// Listes qui doivent contenir au moins un élément.
const NON_EMPTY_SHAPES = [
  'journey.stops',
  'skills.groups',
  'skills.groups[].items',
  'projects.systems',
  'projects.systems[].projects',
  'home.telemetry.rows',
  'home.dossier.entries',
  'contact.channels',
  'journey.stops[].paragraphs',
  'projects.systems[].projects[].blocks',
  'projects.systems[].projects[].blocks[].items',
];

function wrongValue(value) {
  if (typeof value === 'string') return 42;
  if (typeof value === 'number') return '1';
  if (typeof value === 'boolean') return 'oui';
  return 'x'; // objet ou tableau remplacé par une chaîne
}

describe('validateLocale : cas valides', () => {
  test('la fixture conforme ne produit aucun chemin', async () => {
    const validateLocale = await load();
    assert.deepEqual(validateLocale(clone(valid)), [], 'la fixture valide doit être acceptée');
  });

  test('renvoie un tableau neuf de chaînes, sans lever sur une entrée gelée', async () => {
    const validateLocale = await load();
    const result = validateLocale(deepFreeze(clone(valid)));
    assert.ok(Array.isArray(result), 'le résultat doit être un tableau');
    assert.deepEqual(result, []);
  });

  test("ne modifie pas l'entrée, même invalide", async () => {
    const validateLocale = await load();
    const broken = mutate(['home', 'telemetry', 'rows', 2, 'label'], '');
    const before = JSON.stringify(broken);
    validateLocale(broken);
    assert.equal(JSON.stringify(broken), before, "validateLocale a modifié l'entrée");
  });

  test('deux appels sur la même entrée donnent le même résultat', async () => {
    const validateLocale = await load();
    const broken = mutate(['journey', 'title'], '');
    assert.deepEqual(validateLocale(broken), validateLocale(broken));
  });
});

describe('validateLocale : champs fautifs nommés par leur chemin', () => {
  test('exemple du contrat : home.telemetry.rows[2].label manquant', async () => {
    const validateLocale = await load();
    const found = validateLocale(mutate(['home', 'telemetry', 'rows', 2, 'label'], DELETE));
    assert.deepEqual(found, ['home.telemetry.rows[2].label']);
  });

  test('champ manquant : chaque champ obligatoire est nommé', async () => {
    const validateLocale = await load();
    const misses = [];
    for (const node of nodes) {
      if (typeof node.segs.at(-1) === 'number') continue;
      if (OPTIONAL_SHAPES.has(shape(node.path))) continue;
      const found = validateLocale(mutate(node.segs, DELETE));
      const named = typeof node.value === 'object' && node.value !== null
        ? found.some((p) => isSelfOrChild(p, node.path))
        : found.includes(node.path);
      if (!named) misses.push(`${node.path} (obtenu: ${JSON.stringify(found)})`);
    }
    assert.deepEqual(misses, [], `champs absents non signalés : ${misses.join(' ; ')}`);
  });

  test('chaîne vide : chaque chaîne du schéma est nommée', async () => {
    const validateLocale = await load();
    const misses = nodes.filter((n) => typeof n.value === 'string')
      .filter((n) => !validateLocale(mutate(n.segs, '')).includes(n.path))
      .map((n) => n.path);
    assert.deepEqual(misses, [], `chaînes vides non signalées : ${misses.join(', ')}`);
  });

  test('mauvais type : chaque nœud remplacé par un type incompatible est nommé', async () => {
    const validateLocale = await load();
    const misses = [];
    for (const node of nodes) {
      const found = validateLocale(mutate(node.segs, wrongValue(node.value)));
      if (!found.some((p) => isSelfOrChild(p, node.path)))
        misses.push(`${node.path} -> ${JSON.stringify(wrongValue(node.value))}`);
    }
    assert.deepEqual(misses, [], `mauvais types non signalés : ${misses.join(' ; ')}`);
  });

  test('null à la place de chaque valeur est nommé', async () => {
    const validateLocale = await load();
    const misses = nodes
      .filter(
        (n) => !validateLocale(mutate(n.segs, null)).some((p) => isSelfOrChild(p, n.path)),
      )
      .map((n) => n.path);
    assert.deepEqual(misses, [], `null non signalé pour : ${misses.join(', ')}`);
  });

  test('tableau vide là où une liste est attendue : la liste est nommée', async () => {
    const validateLocale = await load();
    const lists = nodes.filter((n) => NON_EMPTY_SHAPES.includes(shape(n.path)));
    assert.ok(lists.length >= 11, `la fixture doit couvrir les listes (${lists.length})`);
    const misses = lists.filter((n) => !validateLocale(mutate(n.segs, [])).includes(n.path))
      .map((n) => n.path);
    assert.deepEqual(misses, [], `listes vides non signalées : ${misses.join(', ')}`);
  });

  test('type de bloc inconnu : le chemin du champ type est nommé', async () => {
    const validateLocale = await load();
    const segs = ['projects', 'systems', 0, 'projects', 0, 'blocks', 0, 'type'];
    for (const bad of ['video', '', 'TEXT', 1])
      assert.ok(
        validateLocale(mutate(segs, bad)).includes(toPath(segs)),
        `type de bloc ${JSON.stringify(bad)} non signalé`,
      );
  });

  test('bloc list sans items : le chemin items est nommé', async () => {
    const validateLocale = await load();
    const base = ['projects', 'systems', 0, 'projects', 0, 'blocks', 0];
    const copy = mutate([...base, 'type'], 'list'); // le bloc texte devient une liste
    assert.ok(
      validateLocale(copy).includes(toPath([...base, 'items'])),
      'une liste sans items doit nommer projects.systems[0].projects[0].blocks[0].items',
    );
  });

  test('plusieurs fautes : tous les chemins sont rendus, sans doublon', async () => {
    const validateLocale = await load();
    const copy = mutate(['home', 'telemetry', 'rows', 2, 'label'], DELETE);
    copy.journey.title = '';
    copy.contact.channels[1].href = 12;
    const found = validateLocale(copy);
    const expected = [
      'home.telemetry.rows[2].label',
      'journey.title',
      'contact.channels[1].href',
    ];
    for (const p of expected)
      assert.ok(found.includes(p), `chemin ${p} absent de ${JSON.stringify(found)}`);
    assert.equal(new Set(found).size, found.length, `doublons dans ${JSON.stringify(found)}`);
  });

  test('un seul défaut ne produit pas de faux positifs ailleurs', async () => {
    const validateLocale = await load();
    assert.deepEqual(
      validateLocale(mutate(['skills', 'groups', 1, 'items', 0, 'name'], '')),
      ['skills.groups[1].items[0].name'],
    );
  });
});

describe('validateLocale : entrées limites', () => {
  for (const [name, input] of [
    ['null', null],
    ['undefined', undefined],
    ['un nombre', 42],
    ['NaN', NaN],
    ['une chaîne', 'fr'],
    ['une chaîne vide', ''],
    ['true', true],
    ['un tableau', []],
    ['un tableau de la fixture', [valid]],
    ['un objet vide', {}],
  ]) {
    test(`${name} : renvoie des chemins sans lever`, async () => {
      const validateLocale = await load();
      const found = validateLocale(input);
      assert.ok(Array.isArray(found) && found.length > 0, `${name} doit être refusé`);
      assert.ok(
        found.every((p) => typeof p === 'string' && p.length > 0),
        `chemins invalides pour ${name} : ${JSON.stringify(found)}`,
      );
    });
  }

  test('objet vide : chaque section racine manquante est nommée', async () => {
    const validateLocale = await load();
    const found = validateLocale({});
    for (const section of Object.keys(valid))
      assert.ok(found.includes(section), `section ${section} manquante non signalée`);
  });

  test('chaîne très longue et caractères exotiques acceptés', async () => {
    const validateLocale = await load();
    const copy = clone(valid);
    copy.home.pitch = 'é'.repeat(1_000_000);
    copy.home.name = '🚀 \u0000 <>';
    assert.deepEqual(validateLocale(copy), []);
  });

  test('chaîne composée d\'espaces : ne lève pas', async () => {
    const validateLocale = await load();
    const copy = clone(valid);
    copy.home.pitch = '   ';
    assert.ok(Array.isArray(validateLocale(copy)));
  });

  test('clé supplémentaire inconnue : ne plante pas', async () => {
    const validateLocale = await load();
    const copy = clone(valid);
    copy.__extra = { constructor: 1 };
    assert.ok(Array.isArray(validateLocale(copy)));
  });
});

describe('validateLocale : tableau de 10 000 chaînes', () => {
  const withParagraphs = (n, text) => {
    const copy = clone(valid);
    copy.journey.stops[0].paragraphs = Array.from({ length: n }, () => text);
    return copy;
  };

  test('10 000 chaînes valides : accepté', async () => {
    const validateLocale = await load();
    assert.deepEqual(validateLocale(withParagraphs(10000, 'texte')), []);
  });

  test('la 10 000e chaîne vide est nommée par son indice', async () => {
    const validateLocale = await load();
    const copy = withParagraphs(10000, 'texte');
    copy.journey.stops[0].paragraphs[9999] = '';
    assert.deepEqual(validateLocale(copy), ['journey.stops[0].paragraphs[9999]']);
  });

  test('10 000 chaînes vides : 10 000 chemins distincts', async () => {
    const validateLocale = await load();
    const found = validateLocale(withParagraphs(10000, ''));
    assert.equal(found.length, 10000);
    assert.equal(new Set(found).size, 10000, 'chemins en double');
  });

  test('temps linéaire quand la taille double (valide)', async () => {
    const validateLocale = await load();
    assertLinear(
      assert,
      'validateLocale (valide)',
      (n) => withParagraphs(n, 'texte'),
      validateLocale,
    );
  });

  test('temps linéaire quand la taille double (toutes fautives)', async () => {
    const validateLocale = await load();
    assertLinear(
      assert,
      'validateLocale (fautif)',
      (n) => withParagraphs(n, ''),
      validateLocale,
    );
  });
});
