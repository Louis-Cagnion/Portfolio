/*
Tests Node de la rubrique Contact (S9, docs/design/plan.md:126). Le comportement se joue dans
le navigateur (tests/browser/contact.js) ; ici, ce qui se juge sans DOM :
 - données (maquette docs/design/prototype/prototype.template.html:1110-1111 et :1167-1190) :
   quatre sillons dans l'ordre e-mail, LinkedIn, GitHub, Codewars ; l'adresse copiée vient du
   premier href (mailto:) ; modèles « {n} », « {name} » et « {mail} » présents en FR et EN ;
 - fichiers : js/sections/contact.js exporte mount, css/contact.css existe et est chargé par
   un <link> de index.html, js/main.js monte la rubrique par ce module (plus mountSimple).
Lancer : node --test (depuis la racine du dépôt).
*/
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { ROOT, readLocale } from '../helpers.mjs';

const LANGS = ['fr', 'en'];
const IDS = ['mail', 'linkedin', 'github', 'codewars'];
const urlOf = (path) => new URL(path, `file://${ROOT}`);
const read = (path) => readFileSync(urlOf(path), 'utf8');

describe('contact : données', () => {
  for (const lang of LANGS) {
    const contact = () => readLocale(lang).contact;
    test(`${lang} : quatre sillons dans l'ordre e-mail, LinkedIn, GitHub, Codewars`, () => {
      assert.deepEqual(contact().channels.map((c) => c.id), IDS);
    });
    test(`${lang} : le premier sillon est un mailto: avec une adresse`, () => {
      const [mail] = contact().channels;
      assert.match(mail.href, /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });
    test(`${lang} : les autres sillons sont des liens https:`, () => {
      for (const c of contact().channels.slice(1))
        assert.match(c.href, /^https:\/\/\S+$/, c.id);
    });
    test(`${lang} : modèles {n}/{name}, {mail} et textes de l'interface non vides`, () => {
      const c = contact();
      assert.ok(c.groove.includes('{n}') && c.groove.includes('{name}'), 'groove');
      assert.ok(c.copyFailed.includes('{mail}'), 'copyFailed');
      for (const key of ['title', 'question', 'message', 'discLabel', 'copyHint', 'copied',
        'copiedStatus', 'armed', 'tapHint', 'backHint'])
        assert.ok(typeof c[key] === 'string' && c[key].trim(), key);
      for (const channel of c.channels) assert.ok(channel.name.trim(), channel.id);
    });
  }
  test('mêmes adresses de sillon en FR et EN', () => {
    const hrefs = (lang) => readLocale(lang).contact.channels.map((c) => c.href);
    assert.deepEqual(hrefs('fr'), hrefs('en'));
  });
  test('gravure copyHint et copied différentes (la confirmation se voit)', () => {
    for (const lang of LANGS) {
      const c = readLocale(lang).contact;
      assert.notEqual(c.copyHint, c.copied, lang);
      assert.notEqual(c.copiedStatus, c.copyFailed, lang);
    }
  });
});

describe('contact : module et styles', () => {
  test('js/sections/contact.js existe et exporte mount', () => {
    assert.ok(existsSync(urlOf('js/sections/contact.js')), 'fichier absent');
    assert.match(read('js/sections/contact.js'), /export\s+(function|const)\s+mount\b/);
  });
  test('css/contact.css existe et index.html le charge par un <link>', () => {
    assert.ok(existsSync(urlOf('css/contact.css')), 'css/contact.css absent');
    assert.match(read('index.html'),
      /<link\b[^>]*href\s*=\s*["'](\.\/)?css\/contact\.css["'][^>]*>/i);
  });
  test('js/main.js remplace le montage minimal de la rubrique contact', () => {
    const main = read('js/main.js');
    assert.match(main, /from\s+['"]\.\/sections\/contact\.js['"]/);
    assert.doesNotMatch(main, /contact:\s*\(root\)\s*=>\s*mountSimple/);
  });
});
