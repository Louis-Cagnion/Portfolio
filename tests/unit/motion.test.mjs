/*
Contrat testé : js/core/motion.js (parties pures et animate).
  lerp(a, b, t) : interpolation linéaire (lerp(a, b, 0) = a, lerp(a, b, 1) = b).
  ease(t) : ease(0) = 0, ease(1) = 1, croissante (au sens large) sur [0, 1].
  hashId(str) -> entier non signé 32 bits : stable d'un appel à l'autre, différent pour
    'c' et 'cpp', défini pour ''.
  animate({ duration, onFrame, reduced }) -> Promise : si `reduced` est vrai ou
    `duration <= 0`, appelle onFrame(1) exactement une fois et se résout sans jamais
    appeler requestAnimationFrame ; sinon appelle onFrame avec une progression de 0 à 1
    (croissante, finissant à 1) puis se résout.
Lancer : node --test (depuis la racine du dépôt).
*/
import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { assertLinear, guard, importModule } from '../helpers.mjs';

const load = () => importModule('js/core/motion.js');
const near = (actual, expected, label) =>
  assert.ok(Math.abs(actual - expected) < 1e-9,
    `${label} : obtenu ${actual}, attendu ${expected}`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// Course contre un délai, sans laisser de minuteur en suspens.
const within = (promise, ms) => new Promise((resolve) => {
  const timer = setTimeout(() => resolve('late'), ms);
  promise.then(() => { clearTimeout(timer); resolve('done'); });
});

describe('lerp', () => {
  test('bornes : t = 0 donne a, t = 1 donne b', async () => {
    const { lerp } = await load();
    assert.equal(lerp(10, 20, 0), 10);
    near(lerp(10, 20, 1), 20, 'lerp(10, 20, 1)');
    near(lerp(0.1, 0.7, 1), 0.7, 'lerp(0.1, 0.7, 1)');
  });

  test('milieu et quarts', async () => {
    const { lerp } = await load();
    near(lerp(0, 10, 0.5), 5, 'lerp(0, 10, 0.5)');
    near(lerp(0, 100, 0.25), 25, 'lerp(0, 100, 0.25)');
    near(lerp(-10, 10, 0.5), 0, 'lerp(-10, 10, 0.5)');
    near(lerp(10, 0, 0.3), 7, 'lerp(10, 0, 0.3)');
  });

  test('a = b : constant quel que soit t', async () => {
    const { lerp } = await load();
    for (const t of [0, 0.3, 1]) near(lerp(7, 7, t), 7, `lerp(7, 7, ${t})`);
  });

  test('valeurs négatives et extrêmes restent finies', async () => {
    const { lerp } = await load();
    near(lerp(-5, -1, 0.5), -3, 'lerp(-5, -1, 0.5)');
    assert.equal(lerp(0, Number.MAX_VALUE, 1), Number.MAX_VALUE);
    assert.equal(lerp(0, Number.MIN_VALUE, 0), 0);
    assert.ok(Number.isFinite(lerp(1e300, 2e300, 0.5)), 'lerp(1e300, 2e300, 0.5) non fini');
  });

  test('NaN en entrée donne NaN (jamais un nombre trompeur)', async () => {
    const { lerp } = await load();
    assert.ok(Number.isNaN(lerp(NaN, 1, 0.5)), 'a = NaN');
    assert.ok(Number.isNaN(lerp(0, NaN, 0.5)), 'b = NaN');
    assert.ok(Number.isNaN(lerp(0, 1, NaN)), 't = NaN');
  });
});

describe('ease', () => {
  test('ease(0) = 0 et ease(1) = 1 exactement', async () => {
    const { ease } = await load();
    assert.ok(ease(0) === 0, `ease(0) = ${ease(0)}`);
    assert.ok(ease(1) === 1, `ease(1) = ${ease(1)}`);
  });

  test('croissante sur [0, 1] (1 001 points) et bornée par [0, 1]', async () => {
    const { ease } = await load();
    let previous = ease(0);
    for (let i = 1; i <= 1000; i++) {
      const t = i / 1000;
      const value = ease(t);
      assert.ok(value >= previous, `ease décroît entre ${(i - 1) / 1000} et ${t}`);
      assert.ok(value >= 0 && value <= 1, `ease(${t}) = ${value} hors de [0, 1]`);
      previous = value;
    }
  });

  test('pas constante : ease(0.25) < ease(0.75)', async () => {
    const { ease } = await load();
    assert.ok(ease(0.25) < ease(0.75), 'ease doit progresser entre 0.25 et 0.75');
  });

  test('renvoie toujours un nombre fini sur les petites valeurs de t', async () => {
    const { ease } = await load();
    for (const t of [Number.MIN_VALUE, 1e-12, 0.5, 1 - 1e-12]) {
      assert.ok(Number.isFinite(ease(t)), `ease(${t}) doit être fini`);
    }
  });
});

describe('hashId', () => {
  const isUint32 = (n) => Number.isInteger(n) && n >= 0 && n <= 0xffffffff;

  test('entier non signé 32 bits pour des identifiants réels', async () => {
    const { hashId } = await load();
    for (const id of ['c', 'cpp', 'python', 'push_swap', 'js', 'WebSockets']) {
      assert.ok(isUint32(hashId(id)), `hashId(${JSON.stringify(id)}) = ${hashId(id)}`);
    }
  });

  test('stable : mêmes résultats sur des appels répétés', async () => {
    const { hashId } = await load();
    const first = hashId('minishell');
    for (let i = 0; i < 100; i++) assert.equal(hashId('minishell'), first);
  });

  test('stable entre deux instances du module', async () => {
    const a = await importModule('js/core/motion.js', '?instance=1');
    const b = await importModule('js/core/motion.js', '?instance=2');
    assert.equal(a.hashId('webserv'), b.hashId('webserv'));
  });

  test("'c' et 'cpp' donnent des hachages différents", async () => {
    const { hashId } = await load();
    assert.notEqual(hashId('c'), hashId('cpp'));
  });

  test('sensible à l\'ordre et à la casse', async () => {
    const { hashId } = await load();
    assert.notEqual(hashId('ab'), hashId('ba'));
    assert.notEqual(hashId('c'), hashId('C'));
  });

  test("chaîne vide : définie (entier 32 bits), stable", async () => {
    const { hashId } = await load();
    assert.ok(isUint32(hashId('')), `hashId('') = ${hashId('')}`);
    assert.equal(hashId(''), hashId(''));
  });

  test('unicode, espaces, caractère nul : entiers 32 bits valides', async () => {
    const { hashId } = await load();
    for (const s of ['é', 'Compétences', '🚀', ' ', '\u0000', 'a\u0000b', '日本語']) {
      assert.ok(isUint32(hashId(s)), `hashId(${JSON.stringify(s)}) = ${hashId(s)}`);
    }
  });

  test('chaîne d\'un million de caractères : toujours dans les bornes', async () => {
    const { hashId } = await load();
    assert.ok(isUint32(hashId('x'.repeat(1_000_000))));
  });

  test('1 000 identifiants proches : au plus 1 % de collisions', async () => {
    const { hashId } = await load();
    const seen = new Set(Array.from({ length: 1000 }, (_, i) => hashId(`star-${i}`)));
    assert.ok(seen.size >= 990, `seulement ${seen.size} hachages distincts sur 1000`);
  });

  test('temps linéaire quand la longueur double', async () => {
    const { hashId } = await load();
    assertLinear(assert, 'hashId', (n) => 'a'.repeat(n * 25), hashId);
  });
});

describe('animate', () => {
  const realRaf = globalThis.requestAnimationFrame;
  let rafCalls = 0;
  const forbidRaf = () => {
    rafCalls = 0;
    globalThis.requestAnimationFrame = () => { rafCalls++; return 0; };
  };
  // Simule requestAnimationFrame (~60 Hz) avec l'horloge réelle.
  const fakeRaf = () => {
    rafCalls = 0;
    globalThis.requestAnimationFrame = (cb) => {
      rafCalls++;
      return setTimeout(() => cb(performance.now()), 8);
    };
  };
  afterEach(() => {
    if (realRaf === undefined) delete globalThis.requestAnimationFrame;
    else globalThis.requestAnimationFrame = realRaf;
  });

  test('mouvement réduit : onFrame(1) une fois, sans requestAnimationFrame', async () => {
    const { animate } = await load();
    forbidRaf();
    const frames = [];
    const result = animate({ duration: 500, onFrame: (t) => frames.push(t), reduced: true });
    assert.ok(result instanceof Promise, 'animate doit renvoyer une Promise');
    await guard(result, 2000, 'animate (mouvement réduit)');
    await sleep(40);
    assert.deepEqual(frames, [1], `onFrame doit recevoir 1 une seule fois, reçu ${frames}`);
    assert.equal(rafCalls, 0, 'requestAnimationFrame ne doit pas être appelé');
  });

  for (const duration of [0, -1, -1000, -Infinity, -0, -Number.MIN_VALUE]) {
    const label = Object.is(duration, -0) ? '-0' : String(duration);
    test(`durée ${label} : onFrame(1) une fois, sans rAF`, async () => {
      const { animate } = await load();
      forbidRaf();
      const frames = [];
      const result = animate({ duration, onFrame: (t) => frames.push(t), reduced: false });
      assert.ok(result instanceof Promise, 'animate doit renvoyer une Promise');
      await guard(result, 2000, `animate (durée ${label})`);
      await sleep(40);
      assert.deepEqual(frames, [1], `reçu ${frames}`);
      assert.equal(rafCalls, 0, 'requestAnimationFrame ne doit pas être appelé');
    });
  }

  test('mouvement réduit prime sur une très longue durée', async () => {
    const { animate } = await load();
    forbidRaf();
    const frames = [];
    await guard(animate({ duration: 1e9, onFrame: (t) => frames.push(t), reduced: true }),
      2000, 'animate (très longue durée)');
    assert.deepEqual(frames, [1]);
    assert.equal(rafCalls, 0);
  });

  test('mouvement réduit sans requestAnimationFrame défini : se résout', async () => {
    const { animate } = await load();
    delete globalThis.requestAnimationFrame;
    const frames = [];
    await guard(animate({ duration: 300, onFrame: (t) => frames.push(t), reduced: true }),
      2000, 'animate (sans requestAnimationFrame)');
    assert.deepEqual(frames, [1]);
  });

  test('animation normale : progression de 0 à 1, croissante, finit à 1', async () => {
    const { animate } = await load();
    fakeRaf();
    const frames = [];
    const finished = animate({ duration: 60, onFrame: (t) => frames.push(t), reduced: false });
    assert.ok(finished instanceof Promise, 'animate doit renvoyer une Promise');
    const outcome = await within(finished, 3000);
    assert.equal(outcome, 'done', "animate ne s'est pas résolue en 3 s");
    assert.ok(frames.length >= 1, 'onFrame doit être appelé au moins une fois');
    assert.equal(frames.at(-1), 1, `dernière progression ${frames.at(-1)}, attendu 1`);
    for (let i = 0; i < frames.length; i++) {
      assert.ok(frames[i] >= 0 && frames[i] <= 1, `progression ${frames[i]} hors de [0, 1]`);
      if (i > 0) assert.ok(frames[i] >= frames[i - 1], `progression décroissante : ${frames}`);
    }
    const afterDone = frames.length;
    await sleep(60);
    assert.equal(frames.length, afterDone, 'onFrame appelé après la résolution');
  });
});
