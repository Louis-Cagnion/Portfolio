/*
Contrat testé : js/core/i18n.js (parties pures).
  SUPPORTED = ['fr', 'en']
  initialLang(stored) -> 'fr' | 'en' : la valeur mémorisée si elle est supportée, sinon
    'fr' (null, '', 'de', 'FR ', undefined, tout non-texte -> 'fr') ; ne lève jamais.
  format(template, vars) -> string : remplace chaque `{clé}` (clé = mot) par vars[clé] ;
    une clé absente de vars lève une Error dont le message nomme la clé ; les accolades
    qui ne forment pas `{mot}` restent telles quelles ; la valeur 0 devient "0" ;
    une valeur insérée n'est jamais réinterprétée.
Lancer : node --test (depuis la racine du dépôt).
*/
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { assertLinear, importModule } from '../helpers.mjs';

const load = () => importModule('js/core/i18n.js');

describe('SUPPORTED', () => {
  test("liste exactement ['fr', 'en'], dans cet ordre", async () => {
    const { SUPPORTED } = await load();
    assert.deepEqual([...SUPPORTED], ['fr', 'en']);
  });
});

describe('initialLang', () => {
  for (const lang of ['fr', 'en']) {
    test(`la langue mémorisée supportée "${lang}" est conservée`, async () => {
      const { initialLang } = await load();
      assert.equal(initialLang(lang), lang);
    });
  }

  const fallbacks = [
    ['null', null], ['undefined', undefined], ['chaîne vide', ''], ['"de"', 'de'],
    ['"FR " (majuscules et espace)', 'FR '], ['" en"', ' en'], ['"fr-FR"', 'fr-FR'],
    ['"EN-US"', 'EN-US'], ['"es"', 'es'], ['espaces seuls', '   '],
    ['un nombre', 42], ['NaN', NaN], ['0', 0], ['false', false], ['true', true],
    ['un tableau ["en"]', ['en']], ['un objet', { lang: 'en' }],
    ['"constructor"', 'constructor'], ['"__proto__"', '__proto__'],
    ['"toString"', 'toString'], ['"0"', '0'],
    ['une chaîne très longue', 'en'.repeat(100000)],
  ];
  for (const [name, input] of fallbacks) {
    test(`${name} -> "fr"`, async () => {
      const { initialLang } = await load();
      assert.equal(initialLang(input), 'fr', `initialLang(${name}) doit retomber sur fr`);
    });
  }

  test('sans argument -> "fr"', async () => {
    const { initialLang } = await load();
    assert.equal(initialLang(), 'fr');
  });

  test('le résultat est toujours dans SUPPORTED', async () => {
    const { initialLang, SUPPORTED } = await load();
    for (const input of ['fr', 'en', 'de', null, '', undefined, 7, {}]) {
      assert.ok(SUPPORTED.includes(initialLang(input)), `hors SUPPORTED pour ${input}`);
    }
  });
});

describe('format : cas valides', () => {
  test('remplace une clé', async () => {
    const { format } = await load();
    assert.equal(format('Explorer : {name}', { name: 'Langages' }), 'Explorer : Langages');
  });

  test('remplace plusieurs clés (gabarit réel du parcours)', async () => {
    const { format } = await load();
    assert.equal(format('escale {n} sur {total}', { n: 2, total: 8 }), 'escale 2 sur 8');
  });

  test('remplace chaque occurrence d\'une clé répétée', async () => {
    const { format } = await load();
    assert.equal(format('{a}-{a}-{b}-{a}', { a: 'x', b: 'y' }), 'x-x-y-x');
  });

  test('gabarit sans clé : renvoyé tel quel, y compris vide', async () => {
    const { format } = await load();
    assert.equal(format('Aucune clé ici', {}), 'Aucune clé ici');
    assert.equal(format('', {}), '');
  });

  test('clés en trop dans vars : ignorées', async () => {
    const { format } = await load();
    assert.equal(format('{n} projets', { n: 3, autre: 'x' }), '3 projets');
  });

  test('clé seule et clés collées', async () => {
    const { format } = await load();
    assert.equal(format('{a}', { a: 'x' }), 'x');
    assert.equal(format('{a}{b}', { a: '1', b: '2' }), '12');
  });

  test('caractères accentués et emoji dans le gabarit et les valeurs', async () => {
    const { format } = await load();
    assert.equal(format('Système {name} é', { name: 'Tressol 🚀' }), 'Système Tressol 🚀 é');
  });
});

describe('format : valeurs limites', () => {
  test('la valeur 0 devient "0" (pas une valeur absente)', async () => {
    const { format } = await load();
    assert.equal(format('{n} projets', { n: 0 }), '0 projets');
    assert.equal(format('{n}', { n: -0 }), '0');
  });

  test('chaîne vide comme valeur : remplace par rien', async () => {
    const { format } = await load();
    assert.equal(format('[{a}]', { a: '' }), '[]');
  });

  test('false, NaN, Infinity, négatifs et décimaux sont convertis en texte', async () => {
    const { format } = await load();
    assert.equal(format('{v}', { v: false }), 'false');
    assert.equal(format('{v}', { v: NaN }), 'NaN');
    assert.equal(format('{v}', { v: Infinity }), 'Infinity');
    assert.equal(format('{v}', { v: -12 }), '-12');
    assert.equal(format('{v}', { v: 0.5 }), '0.5');
    assert.equal(format('{v}', { v: Number.MAX_SAFE_INTEGER }), '9007199254740991');
  });

  test('une valeur insérée n\'est pas réinterprétée', async () => {
    const { format } = await load();
    assert.equal(format('{a} {b}', { a: '{b}', b: 'X' }), '{b} X');
  });

  test('les motifs spéciaux de String.replace ($&, $1, $$) restent littéraux', async () => {
    const { format } = await load();
    assert.equal(format('<{a}>', { a: '$&' }), '<$&>');
    assert.equal(format('<{a}>', { a: '$1' }), '<$1>');
    assert.equal(format('<{a}>', { a: '$$' }), '<$$>');
    assert.equal(format('<{a}>', { a: "$'" }), "<$'>");
  });
});

describe('format : accolades qui ne sont pas {mot}', () => {
  const plain = ['{}', '{ }', '{ n }', '{a b}', '{', '}', '{{', 'a } b { c', '{1 2}', '{-}'];
  for (const text of plain) {
    test(`${JSON.stringify(text)} reste inchangé sans lever`, async () => {
      const { format } = await load();
      assert.equal(format(text, { n: 1, a: 'x' }), text);
    });
  }

  test('accolade ouverte non fermée autour d\'une vraie clé', async () => {
    const { format } = await load();
    assert.equal(format('{ {n}', { n: 5 }), '{ 5');
    assert.equal(format('{n} }', { n: 5 }), '5 }');
  });
});

describe('format : clé absente', () => {
  test('lève une Error dont le message nomme la clé', async () => {
    const { format } = await load();
    assert.throws(() => format('Bonjour {nom}', {}),
      (error) => error instanceof Error && error.message.includes('nom'),
      'le message doit nommer la clé "nom"');
  });

  test('nomme la clé manquante parmi plusieurs présentes', async () => {
    const { format } = await load();
    assert.throws(() => format('{n} sur {total} ({reste})', { n: 1, total: 2 }),
      (error) => error instanceof Error && error.message.includes('reste') &&
        !error.message.includes('total'));
  });

  test('vars undefined, null ou vide : lève aussi', async () => {
    const { format } = await load();
    for (const vars of [undefined, null, {}]) {
      assert.throws(() => format('{x}', vars),
        (e) => e instanceof Error && e.message.includes('x'), `vars = ${vars}`);
    }
  });

  test('une clé héritée du prototype compte comme absente', async () => {
    const { format } = await load();
    for (const key of ['toString', 'constructor', '__proto__', 'hasOwnProperty']) {
      assert.throws(() => format(`{${key}}`, {}), (e) => e instanceof Error &&
        e.message.includes(key), `{${key}} doit être refusée`);
    }
  });

  test('la casse compte : {N} n\'est pas {n}', async () => {
    const { format } = await load();
    assert.throws(() => format('{N}', { n: 1 }), (e) => e.message.includes('N'));
  });
});

describe('format : volume', () => {
  test('gabarit de 10 000 clés : résultat exact', async () => {
    const { format } = await load();
    const template = Array.from({ length: 10000 }, () => '{k}').join(',');
    const out = format(template, { k: 'v' });
    assert.equal(out, Array.from({ length: 10000 }, () => 'v').join(','));
  });

  test('temps linéaire quand la taille double', async () => {
    const { format } = await load();
    const make = (n) => Array.from({ length: n }, () => '{k} texte').join(' ');
    assertLinear(assert, 'format', make, (template) => format(template, { k: 'v' }));
  });

  test('temps linéaire sur des accolades ouvertes sans fermeture (regex sûre)',
    async () => {
      const { format } = await load();
      assertLinear(assert, 'format sur "{{{..."', (n) => '{'.repeat(n) + 'a',
        (template) => format(template, {}));
    });
});
