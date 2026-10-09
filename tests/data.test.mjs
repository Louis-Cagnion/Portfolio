/*
Tests des données réelles (data/fr.json, data/en.json) et des tirets cadratins.
Critères : docs/design/plan.md (sections Schéma des données et Tests).
 - conformité à validateLocale (js/core/schema.js : string[] de chemins fautifs)
 - parité FR/EN : mêmes clés et longueurs ; champs non textuels égaux (id, ordre, href,
   level, body, at, now, type, live, références `projects`)
 - une seule escale `now: true` ; références de projets existantes ; identifiants uniques
 - aucune chaîne vide ou d'espaces ; HTML limité à <strong>, <em>, <a href="https:|mailto:">
   et seulement dans html, paragraphs[], blocks[].html, blocks[].items[]
 - un seul canal mailto: dans contact ; aucun tiret cadratin (U+2014) dans data/, js/,
   css/, index.html, README.md (jamais docs/ ni tests/)
Les détecteurs sont eux-mêmes vérifiés (sections « détecteurs ») et testés en volume.
Lancer : node --test (depuis la racine du dépôt).
*/
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { assertLinear, importModule, ROOT, ROOT_URL } from './helpers.mjs';

const LANGS = ['fr', 'en'];
const cache = new Map();
const locale = (lang) => {
  if (!cache.has(lang))
    cache.set(lang, JSON.parse(readFileSync(new URL(`data/${lang}.json`, ROOT_URL), 'utf8')));
  return cache.get(lang);
};

// ---------- Parcours de l'arbre ----------
const join = (parent, key) =>
  typeof key === 'number' ? `${parent}[${key}]` : parent ? `${parent}.${key}` : key;
const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);

/** Tous les nœuds : { path, key, value } ; `key` d'un élément de tableau = clé du tableau. */
function walk(value, path = '', key = null, out = []) {
  if (path) out.push({ path, key, value });
  if (Array.isArray(value)) value.forEach((v, i) => walk(v, join(path, i), key, out));
  else if (value && typeof value === 'object')
    for (const [k, v] of Object.entries(value)) walk(v, join(path, k), k, out);
  return out;
}
const get = (root, path) => path.split('.').reduce((node, k) => node?.[k], root);

/** Liste non vide à `path`, sinon échec qui nomme le fichier et le chemin attendu. */
function list(lang, path) {
  const value = get(locale(lang), path);
  assert.ok(
    Array.isArray(value) && value.length > 0,
    `data/${lang}.json : ${path} absent ou vide (schéma du plan attendu)`,
  );
  return value;
}

// ---------- Détecteurs (purs, vérifiés plus bas) ----------
const NON_TEXT_KEYS = new Set(['id', 'href', 'level', 'body', 'at', 'now', 'type', 'live']);
/* `projects` ne désigne des références (identiques en FR et EN) que dans un tableau ;
ailleurs (ui.nav.projects, home.ctas.projects) c'est un libellé traduit. */
const isProjectRef = (node, path) => node.key === 'projects' && path.endsWith(']');

/** Écarts entre deux langues : { structure: string[], values: string[] }. */
function compareLocales(a, b) {
  const structure = [];
  const values = [];
  const nodesA = new Map(walk(a).map((n) => [n.path, n]));
  const nodesB = new Map(walk(b).map((n) => [n.path, n]));
  for (const [path, nodeA] of nodesA) {
    const nodeB = nodesB.get(path);
    if (!nodeB) { structure.push(`${path} : présent en fr, absent en en`); continue; }
    const [typeA, typeB] = [typeOf(nodeA.value), typeOf(nodeB.value)];
    if (typeA !== typeB) {
      structure.push(`${path} : type ${typeA} (fr), ${typeB} (en)`);
      continue;
    }
    const fixed = typeA !== 'string'
      || NON_TEXT_KEYS.has(nodeA.key)
      || isProjectRef(nodeA, path);
    const leaf = typeA !== 'array' && typeA !== 'object';
    if (leaf && fixed && path !== 'meta.lang' && nodeA.value !== nodeB.value) {
      const [va, vb] = [JSON.stringify(nodeA.value), JSON.stringify(nodeB.value)];
      values.push(`${path} : ${va} (fr), ${vb} (en)`);
    }
  }
  for (const path of nodesB.keys())
    if (!nodesA.has(path)) structure.push(`${path} : absent en fr, présent en en`);
  return { structure, values };
}
const gaps = (a, b) => {
  const { structure, values } = compareLocales(a, b);
  return structure.length + values.length;
};

/** Chaînes vides ou d'espaces (chemins), à toute profondeur. */
const blankStrings = (tree) => walk(tree)
  .filter((n) => typeof n.value === 'string' && n.value.trim() === '').map((n) => n.path);

const isHtmlField = (path) => /(^|\.)html$/.test(path) || /\.paragraphs\[\d+\]$/.test(path) ||
  /\.blocks\[\d+\]\.items\[\d+\]$/.test(path);
const ALLOWED_TAG = [
  /<(?:strong|em)>/y,
  /<\/(?:strong|em|a)>/y,
  /<a href="(?:https:\/\/|mailto:)[^"\s<>]+">/y,
];

/** Balises hors liste blanche dans `html` : [{ path, excerpt }]. */
function htmlViolations(text, path) {
  const out = [];
  for (let i = text.indexOf('<'); i !== -1; i = text.indexOf('<', i + 1)) {
    if (!/[A-Za-z/!?]/.test(text[i + 1] ?? '')) continue; // « a < b » n'est pas une balise
    const allowed = ALLOWED_TAG.some((re) => { re.lastIndex = i; return re.test(text); });
    if (!allowed) out.push({ path, excerpt: text.slice(i, i + 40) });
  }
  return out;
}

/** Violations HTML d'un arbre : balise interdite, ou balise hors des champs html. */
function treeHtmlViolations(tree) {
  const out = [];
  for (const { path, value } of walk(tree)) {
    if (typeof value !== 'string' || !value.includes('<')) continue;
    if (isHtmlField(path)) out.push(...htmlViolations(value, path));
    else if (/<[A-Za-z/!?]/.test(value)) out.push({ path, excerpt: value.slice(0, 40) });
  }
  return out;
}

// Tiret cadratin brut, échappé (\u2014, \u{2014}) ou en entité (&mdash;, &#8212;, &#x2014;).
const EM_DASH = /\u2014|\\u0*2014|\\u\{0*2014\}|&mdash;|&#0*8212;|&#x0*2014;/i;
/** Lignes (1 = première) contenant un tiret cadratin : [{ line, excerpt }]. */
function emDashLines(text) {
  const out = [];
  text.split('\n').forEach((content, index) => {
    if (!EM_DASH.test(content)) return;
    out.push({ line: index + 1, excerpt: content.trim().slice(0, 60) });
  });
  return out;
}

const SKIPPED_EXT = /\.(png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|pdf|mp4|webm|zip)$/i;
function filesUnder(relative) {
  let stat;
  try { stat = statSync(ROOT + relative); } catch { return []; } // absent : ignoré
  if (stat.isFile()) return SKIPPED_EXT.test(relative) ? [] : [relative];
  return readdirSync(ROOT + relative).sort()
    .flatMap((name) => filesUnder(`${relative}/${name}`));
}

// ---------- Schéma et parité ----------
describe('conformité au schéma (validateLocale)', () => {
  for (const lang of LANGS) {
    test(`data/${lang}.json est conforme`, async () => {
      const { validateLocale } = await importModule('js/core/schema.js');
      assert.equal(typeof validateLocale, 'function', 'schema.js : validateLocale manquante');
      const found = validateLocale(locale(lang));
      assert.deepEqual(found, [], `data/${lang}.json : chemins fautifs : ${found.join(', ')}`);
    });

    test(`data/${lang}.json déclare sa langue dans meta.lang`, () => {
      assert.equal(locale(lang).meta?.lang, lang);
    });
  }
});

describe('parité FR/EN', () => {
  test('mêmes clés, mêmes longueurs de tableaux, mêmes types', () => {
    list('fr', 'journey.stops'); // refuse l'ancien schéma au lieu de comparer du vide
    list('en', 'journey.stops');
    const { structure } = compareLocales(locale('fr'), locale('en'));
    const shown = structure.slice(0, 20).join('\n');
    assert.deepEqual(structure, [], `écarts de structure :\n${shown}`);
  });

  test('champs non textuels égaux (id, href, level, body, at, now, type, projets)', () => {
    list('fr', 'skills.groups');
    list('en', 'skills.groups');
    const { values } = compareLocales(locale('fr'), locale('en'));
    assert.deepEqual(values, [], `valeurs non textuelles différentes :\n${values.join('\n')}`);
  });

  test('ordre identique des escales, groupes, étoiles, systèmes, projets et canaux', () => {
    const ids = (lang, path) => list(lang, path).map((item) => item.id);
    const collections = [
      'journey.stops',
      'skills.groups',
      'projects.systems',
      'contact.channels',
    ];
    for (const path of collections)
      assert.deepEqual(ids('en', path), ids('fr', path), `ordre différent pour ${path}`);
    const stars = (lang) => list(lang, 'skills.groups')
      .map((g) => [g.id, g.items.map((i) => i.id)]);
    assert.deepEqual(stars('en'), stars('fr'), 'étoiles différentes entre FR et EN');
    const projects = (lang) => list(lang, 'projects.systems')
      .map((s) => [s.id, s.projects.map((p) => p.id)]);
    assert.deepEqual(projects('en'), projects('fr'), 'projets différents entre FR et EN');
  });
});

describe('cohérence interne', () => {
  for (const lang of LANGS) {
    test(`${lang} : exactement une escale now: true`, () => {
      const now = list(lang, 'journey.stops').filter((s) => s.now === true).map((s) => s.id);
      assert.equal(
        now.length,
        1,
        `data/${lang}.json : escales now: true = ${JSON.stringify(now)}`,
      );
    });

    test(`${lang} : chaque référence de projet des compétences existe`, () => {
      const known = new Set(
        list(lang, 'projects.systems').flatMap((system) => system.projects.map((p) => p.id)),
      );
      assert.ok(known.size > 0, `data/${lang}.json : aucun projet défini`);
      let checked = 0;
      const unknown = [];
      list(lang, 'skills.groups').forEach((group, g) => group.items.forEach((item, i) => {
        (item.projects ?? []).forEach((ref, r) => {
          checked++;
          if (!known.has(ref)) {
            const where = `skills.groups[${g}].items[${i}].projects[${r}]`;
            unknown.push(`${where} = ${JSON.stringify(ref)}`);
          }
        });
      }));
      assert.ok(checked > 0, `data/${lang}.json : aucune référence de projet à vérifier`);
      assert.deepEqual(unknown, [], `références inconnues (${lang}) : ${unknown.join(' ; ')}`);
    });

    test(`${lang} : identifiants uniques par collection`, () => {
      const duplicates = (label, ids) => {
        const seen = new Set();
        const dup = ids.filter((id) => (seen.has(id) ? true : (seen.add(id), false)));
        return dup.length ? [`${label} : ${JSON.stringify([...new Set(dup)])}`] : [];
      };
      const ids = (path, pick = (x) => x.id) => list(lang, path).map(pick);
      const problems = [
        ...duplicates('journey.stops', ids('journey.stops')),
        ...duplicates('skills.groups', ids('skills.groups')),
        ...list(lang, 'skills.groups').flatMap(
          (g) => duplicates(`items du groupe ${g.id}`, g.items.map((i) => i.id)),
        ),
        ...duplicates('projects.systems', ids('projects.systems')),
        ...duplicates(
          'projets (tous systèmes confondus)',
          list(lang, 'projects.systems').flatMap((s) => s.projects.map((p) => p.id)),
        ),
        ...duplicates('contact.channels', ids('contact.channels')),
      ];
      assert.deepEqual(problems, [], `data/${lang}.json : doublons : ${problems.join(' ; ')}`);
    });

    test(`${lang} : un seul canal mailto: dans contact, avec une adresse`, () => {
      const channels = list(lang, 'contact.channels');
      const mail = channels.filter((c) => String(c.href).startsWith('mailto:'));
      assert.equal(
        mail.length,
        1,
        `data/${lang}.json : canaux mailto: = ${JSON.stringify(mail.map((c) => c.id))}`,
      );
      assert.match(
        mail[0].href,
        /^mailto:[^@\s]+@[^@\s]+\.[^@\s]+$/,
        `data/${lang}.json : adresse mailto: invalide (${mail[0].href})`,
      );
    });
  }
});

describe('contenu des textes', () => {
  for (const lang of LANGS) {
    test(`${lang} : aucune chaîne vide ni composée d'espaces`, () => {
      list(lang, 'journey.stops');
      const blank = blankStrings(locale(lang));
      assert.deepEqual(blank, [], `data/${lang}.json : chaînes vides : ${blank.join(', ')}`);
    });

    test(`${lang} : HTML limité à strong, em, a[href] dans les champs autorisés`, () => {
      list(lang, 'journey.stops');
      const bad = treeHtmlViolations(locale(lang))
        .map((v) => `${v.path} : ${JSON.stringify(v.excerpt)}`);
      assert.deepEqual(bad, [], `data/${lang}.json : HTML interdit :\n${bad.join('\n')}`);
    });
  }
});

describe('aucun tiret cadratin (U+2014)', () => {
  const targets = ['data', 'js', 'css', 'index.html', 'README.md'];
  test('data/, js/, css/, index.html et README.md en sont exempts', () => {
    const found = [];
    for (const file of targets.flatMap(filesUnder))
      for (const { line, excerpt } of emDashLines(readFileSync(ROOT + file, 'utf8')))
        found.push(`${file}:${line}: ${excerpt}`);
    assert.deepEqual(found, [], `tirets cadratins trouvés :\n${found.join('\n')}`);
  });
});

// ---------- Vérification des détecteurs ----------
describe('détecteurs : html', () => {
  const accepted = [
    'Texte simple',
    '<strong>gras</strong> et <em>italique</em>',
    'a < b et 5 <3',
    '<a href="https://example.com/x?y=1&z=2">lien</a>',
    '<a href="mailto:a@b.fr">écrire</a>',
    '<strong><em>mêlés</em></strong>',
    '',
  ];
  const refused = [
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    '<b>gras</b>',
    '<br/>',
    '<a href="javascript:alert(1)">x</a>',
    '<a href="http://example.com">x</a>',
    '<a href="https://x.fr" target="_blank">x</a>',
    "<a href='https://x.fr'>x</a>",
    '<a onclick="x" href="https://x.fr">x</a>',
    '<STRONG>x</STRONG>',
    '<!-- note -->',
    '<a href="data:text/html;base64,AA">x</a>',
    '<a>sans href</a>',
    '<em class="x">x</em>',
    'ok <iframe src="https://x.fr"></iframe>',
    '<a href="https:">vide</a>',
    '</div>',
    '<strong >x</strong>',
    '<?php ?>',
  ];
  for (const text of accepted)
    test(`accepte ${JSON.stringify(text)}`, () => {
      assert.deepEqual(htmlViolations(text, 'x.html'), []);
    });
  for (const text of refused)
    test(`refuse ${JSON.stringify(text)}`, () => {
      assert.ok(htmlViolations(text, 'x.html').length > 0, `${text} aurait dû être refusé`);
    });

  test('seuls html, paragraphs[], blocks[].html et items[] admettent des balises', () => {
    const tree = {
      home: { dossier: { entries: [{ label: '<b>x</b>', html: '<strong>ok</strong>' }] } },
      journey: { stops: [{ title: '<em>x</em>', paragraphs: ['<em>ok</em>', '<b>non</b>'] }] },
      projects: {
        systems: [{
          projects: [{
            summary: '<strong>x</strong>',
            tags: ['<i>'],
            blocks: [
              { html: '<em>ok</em>' },
              { items: ['<strong>ok</strong>', '<u>non</u>'] },
            ],
          }],
        }],
      },
    };
    const paths = [...new Set(treeHtmlViolations(tree).map((v) => v.path))].sort();
    assert.deepEqual(
      paths,
      [
        'home.dossier.entries[0].label',
        'journey.stops[0].paragraphs[1]',
        'journey.stops[0].title',
        'projects.systems[0].projects[0].blocks[1].items[1]',
        'projects.systems[0].projects[0].summary',
        'projects.systems[0].projects[0].tags[0]',
      ].sort(),
    );
  });

  test('le diagnostic nomme chemin et extrait', () => {
    const [v] = htmlViolations('avant <script>alert(1)</script>', 'a.b[1].html');
    assert.equal(v.path, 'a.b[1].html');
    assert.ok(v.excerpt.startsWith('<script>'), `extrait : ${v.excerpt}`);
  });
});

describe('détecteurs : tirets cadratins', () => {
  test('trouve le tiret brut, échappé ou en entité, avec le numéro de ligne', () => {
    const text = [
      'propre',
      'a \u2014 b',
      'propre',
      '"\\u2014"',
      '&mdash;',
      '&#8212;',
      '&#x2014;',
      '\\u{2014}',
    ].join('\n');
    assert.deepEqual(emDashLines(text).map((l) => l.line), [2, 4, 5, 6, 7, 8]);
  });

  test('ignore les autres tirets, et gère CRLF et dernière ligne sans saut', () => {
    assert.deepEqual(emDashLines('a - b\r\nc \u2013 d\r\n\u2015\r\n'), []);
    assert.deepEqual(emDashLines('a\r\nb\r\nc\u2014').map((l) => l.line), [3]);
    assert.deepEqual(emDashLines('\u2014').map((l) => l.line), [1]);
    assert.deepEqual(emDashLines(''), []);
  });

  test('fichiers absents ignorés, dossiers parcourus', () => {
    assert.deepEqual(filesUnder('dossier-inexistant'), []);
    assert.deepEqual(filesUnder('fichier-inexistant.md'), []);
    assert.ok(filesUnder('data').every((f) => f.startsWith('data/')));
  });
});

describe('détecteurs : parité et chaînes vides', () => {
  const base = () => ({
    meta: { lang: 'fr' },
    journey: { stops: [{ id: 'a', at: 0, now: true, title: 'T' }] },
    skills: { groups: [{ id: 'g', items: [{ id: 'c', projects: ['p'], name: 'C' }] }] },
  });
  const other = () => {
    const copy = base();
    copy.meta.lang = 'en';
    copy.journey.stops[0].title = 'Title';
    copy.skills.groups[0].items[0].name = 'Name';
    return copy;
  };

  test('deux arbres équivalents (textes traduits) ne signalent rien', () => {
    assert.equal(gaps(base(), other()), 0);
  });

  test('détecte clé manquante, longueur de tableau et type différents', () => {
    const a = other();
    delete a.journey.stops[0].title;
    assert.equal(gaps(base(), a), 1);
    const b = other();
    b.skills.groups[0].items.push({ id: 'd' });
    assert.ok(gaps(base(), b) >= 1);
    const c = other();
    c.journey.stops[0].title = 3;
    assert.equal(gaps(base(), c), 1);
  });

  test('détecte un champ non textuel différent (id, at, now, référence de projet)', () => {
    const mutations = {
      id: (d) => { d.journey.stops[0].id = 'z'; },
      at: (d) => { d.journey.stops[0].at = 0.1; },
      now: (d) => { d.journey.stops[0].now = false; },
      projects: (d) => { d.skills.groups[0].items[0].projects[0] = 'q'; },
    };
    for (const [name, mutate] of Object.entries(mutations)) {
      const copy = other();
      mutate(copy);
      assert.equal(gaps(base(), copy), 1, `différence de ${name} non détectée`);
    }
  });

  test('chaînes vides ou d\'espaces repérées à toute profondeur', () => {
    const tree = { a: '', b: ['x', ' \t\n', { c: { d: '   ' } }], e: 'ok', f: 0 };
    assert.deepEqual(blankStrings(tree).sort(), ['a', 'b[1]', 'b[2].c.d']);
  });
});

describe('détecteurs : volume (10 000 chaînes, temps linéaire)', () => {
  const tree = (n, text) =>
    ({ journey: { stops: [{ paragraphs: Array.from({ length: n }, () => text) }] } });

  test('chaînes vides', () => {
    assert.equal(blankStrings(tree(10000, '')).length, 10000);
    assertLinear(assert, 'blankStrings', (n) => tree(n, ''), blankStrings);
  });

  test('HTML', () => {
    // <b> et </b> : deux balises interdites par chaîne
    assert.equal(treeHtmlViolations(tree(10000, '<strong>a</strong> <b>x</b>')).length, 20000);
    assertLinear(
      assert,
      'treeHtmlViolations',
      (n) => tree(n, '<em>a</em> <script>'),
      treeHtmlViolations,
    );
  });

  test('tirets cadratins', () => {
    const text = (n) => Array.from({ length: n }, (_, i) => (i % 2 ? 'ligne' : 'a \u2014 b'))
      .join('\n');
    assert.equal(emDashLines(text(10000)).length, 5000);
    assertLinear(assert, 'emDashLines', text, emDashLines);
  });

  test('parité', () => {
    assertLinear(
      assert,
      'compareLocales',
      (n) => [tree(n, 'x'), tree(n, 'y')],
      ([a, b]) => gaps(a, b),
      { sizes: [2500, 5000, 10000] },
    );
  });
});
