/*
Contrat testé : fonctions pures de js/sections/skills-layout.js, hors layoutConstellation
(testée dans skills-layout.test.mjs). Formules : maquette validée
docs/design/prototype/prototype.template.html (lignes entre parenthèses).
  gridOf(count, { phone }) -> { cols, cellWidth, cellHeight, width, height }  (813-814)
    bureau 4 x 275 x 220, téléphone 2 x 170 x 200 ; width = cols x cellWidth,
    height = ceil(count / cols) x cellHeight ; count entier >= 1, sinon Error nommant count.
  walkOrder(positions, center) -> [id]  (823-825) ; positions = [{ id, x, y }] ; tri par
    Math.atan2(y - center.y, x - center.x) croissant (égalité : ordre des données), puis
    rotation pour que positions[0].id ouvre ; permutation ; [] donne [] ; Error nommant
    positions (position non finie) ou center (centre invalide).
  spreadOf(positions, center, { phone }) -> [{ id, x, y }]  (826) ; même ordre ;
    center + (point - center) x spread, 2.1 bureau, 1.8 téléphone ; entrée intacte.
  extentOf(positions) -> { width, height }  (840) ; écarts max - min de x puis de y ;
    [] : Error nommant positions.
  overviewCamera({ width, height }, ratio) -> { cx, cy, w }  (798) ; cx = width / 2,
    cy = height / 2, w = max(width, height / ratio) ; ratio fini > 0, sinon Error (ratio).
  focusCamera(star, extent, ratio, { phone }) -> { cx, cy, w }  (799-804) ;
    téléphone : w = max(extent.width + 70, (extent.height + 90) / ratio, 200) ;
    bureau : w = max(extent.width x 0.75 + 190, (extent.height + 140) / ratio, 340) ;
    h = w x ratio ; téléphone : cx = star.x, cy = star.y + 0.2 x h ;
    bureau : cx = star.x + 0.22 x w, cy = star.y.
  bodyRadius(level) -> nombre  (736) ; unknown 14, beginner 12, intermediate 22,
    advanced 30 ; autre niveau : Error nommant level.
  diveTarget(star, view, { phone }) -> { cam: { cx, cy, w }, scale }  (743-748) ;
    star = { x, y, level }, view = { width, height, ratio } ; w = width / (phone ? 7 : 9),
    h = w x ratio, visibleWidth = phone ? width : width x 0.54,
    scale = min(visibleWidth x 0.34, height x 0.34) / bodyRadius(level) ; cam : focusCamera.
  bodyScale({ phone, focused }) -> nombre  (738) ; bureau 0.6 et 1.4, téléphone 0.5 et 1.15.
Critères : docs/design/plan.md:43 « Le placement organique des constellations est calculé
à partir de `id`, jamais du nom traduit. » ; plan.md:103 « placement des constellations
indépendant de la langue ». Lancer : node --test tests/unit/skills-geometry.test.mjs.
*/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deepFreeze, importModule, readLocale } from '../helpers.mjs';

const MODULE = 'js/sections/skills-layout.js';
const EPS = 1e-9;
const ORIGIN = { x: 0, y: 0 };
const CENTER = { x: 100, y: 50 };
const STAR = { x: 300, y: 200 };
const KEYS = ['cx', 'cy', 'w'];
const pt = (id, x, y) => ({ id, x, y });
const groupsOf = (lang) => readLocale(lang).skills.groups;
const namesParam = (word) => (e) => e instanceof Error && e.message.includes(word);
const near = (a, e, label) => assert.ok(Math.abs(a - e) < EPS, `${label} : ${a} pour ${e}`);
const nearCam = (cam, e, label) => {
  assert.deepEqual(Object.keys(cam).sort(), KEYS, `${label} : clés`);
  for (const k of KEYS) near(cam[k], e[k], `${label} ${k}`);
};
const allFinite = (v) => typeof v === 'number' ? Number.isFinite(v)
  : v !== null && typeof v === 'object' ? Object.values(v).every(allFinite) : true;

/** Module chargé ; chaque nom doit être une fonction exportée (sinon test rouge). */
async function loadModule(names) {
  const mod = await importModule(MODULE);
  for (const name of names)
    assert.equal(typeof mod[name], 'function', `skills-layout.js doit exporter ${name}`);
  return mod;
}

test('gridOf : bureau 4 x 275 x 220, téléphone 2 x 170 x 200', async () => {
  const { gridOf } = await loadModule(['gridOf']);
  assert.deepEqual(gridOf(1, { phone: false }),
    { cols: 4, cellWidth: 275, cellHeight: 220, width: 4 * 275, height: 1 * 220 });
  assert.equal(gridOf(5, { phone: false }).height, 2 * 220);
  assert.deepEqual(gridOf(1, { phone: true }),
    { cols: 2, cellWidth: 170, cellHeight: 200, width: 2 * 170, height: 1 * 200 });
  assert.equal(gridOf(5, { phone: true }).height, 3 * 200);
});

test('gridOf : huit constellations réelles ; count invalide', async () => {
  const { gridOf } = await loadModule(['gridOf']);
  const count = groupsOf('fr').length;
  const desk = gridOf(count, { phone: false });
  assert.deepEqual([desk.width, desk.height], [4 * 275, Math.ceil(count / 4) * 220]);
  const phone = gridOf(count, { phone: true });
  assert.deepEqual([phone.width, phone.height], [2 * 170, Math.ceil(count / 2) * 200]);
  for (const bad of [0, -1, NaN, 1.5, Infinity, undefined, '3'])
    for (const p of [false, true])
      assert.throws(() => gridOf(bad, { phone: p }), namesParam('count'), `count ${bad}`);
});

test('walkOrder : tri par angle croissant, commence par positions[0]', async () => {
  const { walkOrder } = await loadModule(['walkOrder']);
  // angles : c = π, a = 0, d = -π/2, b = π/2 ; tri : d, a, b, c ; c ouvre : c, d, a, b
  const ring = [pt('c', -1, 0), pt('a', 1, 0), pt('d', 0, -1), pt('b', 0, 1)];
  assert.deepEqual(walkOrder(ring, ORIGIN), ['c', 'd', 'a', 'b']);
  const turned = [pt('a', 1, 0), pt('b', 0, 1), pt('c', -1, 0), pt('d', 0, -1)];
  assert.deepEqual(walkOrder(turned, ORIGIN), ['a', 'b', 'c', 'd']);
});

test('walkOrder : égalité dans l\'ordre des données ; centre décalé sans effet', async () => {
  const { walkOrder } = await loadModule(['walkOrder']);
  // y et x sont à l'angle 0, y avant x dans les données ; z (π/2) ouvre : z, y, x
  const tied = [pt('z', 0, 1), pt('y', 2, 0), pt('x', 1, 0)];
  assert.deepEqual(walkOrder(tied, ORIGIN), ['z', 'y', 'x']);
  const moved = tied.map((p) => pt(p.id, p.x + 10, p.y - 5));
  assert.deepEqual(walkOrder(moved, { x: 10, y: -5 }), walkOrder(tied, ORIGIN));
});

test('walkOrder : sept étoiles en tri exact ; ids exotiques ; aucun ou un point', async () => {
  const { walkOrder } = await loadModule(['walkOrder']);
  const positions = [4, 0, 6, 2, 5, 1, 3].map((k, i) => {
    const a = (k * 2 * Math.PI) / 7;
    return pt(`s${i}`, 3 * Math.cos(a), 3 * Math.sin(a));
  });
  const angle = (p) => Math.atan2(p.y, p.x);
  const sorted = [...positions].sort((p, q) => angle(p) - angle(q));
  const first = sorted.findIndex((p) => p.id === positions[0].id);
  const expected = [...sorted.slice(first), ...sorted.slice(0, first)].map((p) => p.id);
  assert.deepEqual(walkOrder(positions, ORIGIN), expected);
  const ids = ['é', '日本', 'x'.repeat(300), 'b'];
  const exotic = ids.map((id, i) => pt(id, Math.cos(i + 1), Math.sin(i + 1)));
  const result = walkOrder(exotic, ORIGIN);
  assert.equal(result[0], ids[0]);
  assert.deepEqual([...result].sort(), [...ids].sort());
  assert.deepEqual(walkOrder([], ORIGIN), []);
  assert.deepEqual(walkOrder([pt('seul', 5, 5)], ORIGIN), ['seul']);
});

test('walkOrder : entrées invalides : Error nommant positions ou center', async () => {
  const { walkOrder } = await loadModule(['walkOrder']);
  const other = pt('b', 1, 1);
  for (const bad of [NaN, Infinity, -Infinity, undefined]) {
    assert.throws(() => walkOrder([pt('a', bad, 0), other], ORIGIN), namesParam('positions'));
    assert.throws(() => walkOrder([pt('a', 0, bad), other], ORIGIN), namesParam('positions'));
  }
  const ring = [pt('a', 1, 0), other];
  for (const center of [undefined, null, { x: NaN, y: 0 }, { x: 0 }, { x: 0, y: Infinity }])
    assert.throws(() => walkOrder(ring, center), namesParam('center'), `centre ${center}`);
});

test('spreadOf : x 2,1 au bureau, 1,8 sur téléphone ; ordre et centre fixe', async () => {
  const { spreadOf } = await loadModule(['spreadOf']);
  const one = spreadOf([pt('a', 110, 40)], CENTER, { phone: false });
  near(one[0].x, CENTER.x + (110 - CENTER.x) * 2.1, 'x bureau');
  near(one[0].y, CENTER.y + (40 - CENTER.y) * 2.1, 'y bureau');
  const phone = spreadOf([pt('a', 110, 40)], CENTER, { phone: true });
  near(phone[0].x, CENTER.x + (110 - CENTER.x) * 1.8, 'x téléphone');
  near(phone[0].y, CENTER.y + (40 - CENTER.y) * 1.8, 'y téléphone');
  const input = [pt('p', 97, 48), pt('q', 100, 50), pt('r', 103, 56)];
  const out = spreadOf(input, CENTER, { phone: false });
  assert.deepEqual(out.map((p) => p.id), ['p', 'q', 'r']);
  near(out[1].y, CENTER.y, 'centre y');
  near(out[2].y, CENTER.y + (56 - CENTER.y) * 2.1, 'r y');
});

test('extentOf : écarts max - min de x (width) puis de y (height)', async () => {
  const { extentOf } = await loadModule(['extentOf']);
  const set = [pt('a', 2, 5), pt('b', -1, 9), pt('c', 4, 1)];
  assert.deepEqual(extentOf(set), { width: 4 - (-1), height: 9 - 1 });
  assert.deepEqual(extentOf([pt('seul', 7, -3)]), { width: 0, height: 0 });
  assert.deepEqual(extentOf([...set].reverse()), extentOf(set));
  assert.throws(() => extentOf([]), namesParam('positions'));
});

test('overviewCamera : centre au milieu, w = max(largeur, hauteur / ratio)', async () => {
  const { overviewCamera } = await loadModule(['overviewCamera']);
  const dims = { width: 1100, height: 440 };
  // ratio 0,5 : 440 / 0,5 = 880 < 1100, donc w = 1100 ; ratio 0,25 : 1760 > 1100
  nearCam(overviewCamera(dims, 0.5), { cx: 550, cy: 220, w: 1100 }, 'ratio 0,5');
  nearCam(overviewCamera(dims, 0.25), { cx: 550, cy: 220, w: 440 / 0.25 }, 'ratio 0,25');
  for (const ratio of [NaN, 0, -1, Infinity, '1', undefined])
    assert.throws(() => overviewCamera(dims, ratio), namesParam('ratio'), `ratio ${ratio}`);
});

test('focusCamera : téléphone et bureau, w = max(...), décalages', async () => {
  const { focusCamera } = await loadModule(['focusCamera']);
  const extent = { width: 100, height: 200 };
  // téléphone : max(100 + 70, (200 + 90) / 0,5, 200) = 580 ; h = 580 x 0,5 = 290
  const wPhone = (200 + 90) / 0.5;
  nearCam(focusCamera(STAR, extent, 0.5, { phone: true }),
    { cx: 300, cy: 200 + 0.2 * (wPhone * 0.5), w: wPhone }, 'téléphone');
  // bureau : max(100 x 0,75 + 190, (200 + 140) / 0,5, 340) = 680
  const wDesk = (200 + 140) / 0.5;
  nearCam(focusCamera(STAR, extent, 0.5, { phone: false }),
    { cx: 300 + 0.22 * wDesk, cy: 200, w: wDesk }, 'bureau');
  // planchers 200 et 340 ; largeur dominante 1000 + 70 et 1000 x 0,75 + 190
  const nul = { width: 0, height: 0 };
  const large = { width: 1000, height: 0 };
  near(focusCamera(STAR, nul, 1, { phone: true }).w, 200, 'plancher téléphone');
  near(focusCamera(STAR, nul, 1, { phone: false }).w, 340, 'plancher bureau');
  near(focusCamera(STAR, large, 1, { phone: true }).w, 1000 + 70, 'largeur téléphone');
  near(focusCamera(STAR, large, 1, { phone: false }).w, 1000 * 0.75 + 190, 'largeur bureau');
});

test('bodyRadius et bodyScale : valeurs par niveau et par mode', async () => {
  const { bodyRadius, bodyScale } = await loadModule(['bodyRadius', 'bodyScale']);
  assert.deepEqual(['unknown', 'beginner', 'intermediate', 'advanced'].map(bodyRadius),
    [14, 12, 22, 30]);
  for (const level of ['Avancé', 'ADVANCED', ' advanced', '', undefined, null, 4])
    assert.throws(() => bodyRadius(level), namesParam('level'), `niveau ${level} accepté`);
  assert.equal(bodyScale({ phone: false, focused: false }), 0.6);
  assert.equal(bodyScale({ phone: false, focused: true }), 1.4);
  assert.equal(bodyScale({ phone: true, focused: false }), 0.5);
  assert.equal(bodyScale({ phone: true, focused: true }), 1.15);
});

test('diveTarget : bureau et téléphone, w, scale, rayons par niveau', async () => {
  const { diveTarget } = await loadModule(['diveTarget']);
  const view = { width: 900, height: 600, ratio: 0.5 };
  const desk = diveTarget({ x: 100, y: 50, level: 'advanced' }, view, { phone: false });
  nearCam(desk.cam, { cx: 100 + 0.22 * (900 / 9), cy: 50, w: 900 / 9 }, 'caméra bureau');
  near(desk.scale, Math.min(900 * 0.54 * 0.34, 600 * 0.34) / 30, 'scale bureau');
  const phoneView = { width: 390, height: 700, ratio: 1.2 };
  const dive = diveTarget({ x: 200, y: 300, level: 'beginner' }, phoneView, { phone: true });
  const w = 390 / 7;
  nearCam(dive.cam, { cx: 200, cy: 300 + 0.2 * (w * 1.2), w }, 'caméra téléphone');
  near(dive.scale, Math.min(390 * 0.34, 700 * 0.34) / 12, 'scale téléphone');
  const radii = { unknown: 14, beginner: 12, intermediate: 22, advanced: 30 };
  const visible = Math.min(900 * 0.54 * 0.34, 600 * 0.34);
  for (const [level, radius] of Object.entries(radii)) {
    const scale = diveTarget({ x: 0, y: 0, level }, view, { phone: false }).scale;
    near(scale * radius, visible, level);
  }
  const hors = { x: 0, y: 0, level: 'Avancé' };
  assert.throws(() => diveTarget(hors, view, { phone: false }), namesParam('level'));
});

// Positions fabriquées à partir de l'index et de l'id seulement, sans aucun texte.
const fabricate = (group) =>
  group.items.map((item, i) => pt(item.id, 50 + ((i * 37) % 97), 40 + ((i * 53) % 71)));

test('langue : sorties identiques FR et EN ; niveaux réels valides', async () => {
  const mod = await loadModule(['walkOrder', 'spreadOf', 'extentOf', 'focusCamera',
    'diveTarget']);
  const [fr, en] = ['fr', 'en'].map(groupsOf);
  const run = (group, phone) => {
    const pos = fabricate(group);
    const spread = mod.spreadOf(pos, ORIGIN, { phone });
    const cam = mod.focusCamera(spread[0], mod.extentOf(spread), 0.5, { phone });
    return { order: mod.walkOrder(pos, ORIGIN), spread, cam };
  };
  const view = { width: 390, height: 500, ratio: 1 / 1.15 };
  fr.forEach((group, i) => {
    const ids = group.items.map((s) => s.id);
    assert.equal(en[i].id, group.id, 'constellations FR et EN dans un autre ordre');
    assert.deepEqual(en[i].items.map((s) => s.id), ids, `${group.id} : ids FR et EN`);
    assert.deepEqual([...run(group, false).order].sort(), [...ids].sort());
    for (const phone of [false, true])
      assert.deepEqual(run(en[i], phone), run(group, phone), `${group.id} : FR et EN`);
    for (const item of [...group.items, ...en[i].items]) {
      const star = { x: 10, y: 20, level: item.level };
      const dive = mod.diveTarget(star, view, { phone: true });
      assert.ok(allFinite(dive) && dive.scale > 0, `${item.id} : cible de plongée`);
    }
  });
});

test('invariants : entrées gelées non modifiées, sorties stables et finies', async () => {
  const mod = await loadModule([
    'gridOf', 'walkOrder', 'spreadOf', 'extentOf', 'overviewCamera',
    'focusCamera', 'diveTarget', 'bodyScale',
  ]);
  const pos = deepFreeze([pt('a', 110, 40), pt('b', 97, 48), pt('c', 103, 56)]);
  const center = deepFreeze({ ...CENTER });
  const star = deepFreeze({ x: 300, y: 200, level: 'advanced' });
  const extent = deepFreeze({ width: 100, height: 200 });
  const view = deepFreeze({ width: 900, height: 600, ratio: 0.5 });
  const dims = deepFreeze({ width: 1100, height: 440 });
  const inputs = [pos, center, star, extent, view, dims];
  const before = JSON.stringify(inputs);
  const run = () => [
    mod.gridOf(3, { phone: false }),
    mod.walkOrder(pos, center),
    mod.spreadOf(pos, center, { phone: true }),
    mod.extentOf(pos),
    mod.overviewCamera(dims, 0.5),
    mod.focusCamera(star, extent, 0.5, { phone: false }),
    mod.diveTarget(star, view, { phone: true }),
    mod.bodyScale({ phone: true, focused: true }),
  ];
  const first = run();
  assert.ok(allFinite(first), 'une sortie n\'est pas finie');
  assert.deepEqual(run(), first, 'sorties différentes d\'un appel à l\'autre');
  assert.equal(JSON.stringify(inputs), before, 'une entrée gelée a été modifiée');
});

test('chaîne de bout en bout : 1, 2, 7 étoiles, caméras finies', async () => {
  const mod = await loadModule(['gridOf', 'walkOrder', 'spreadOf', 'extentOf',
    'overviewCamera', 'focusCamera']);
  for (const count of [1, 2, 7])
    for (const phone of [false, true]) {
      const label = `${count} étoile(s), téléphone ${phone}`;
      const grid = mod.gridOf(count, { phone });
      const center = { x: grid.cellWidth / 2, y: grid.cellHeight / 2 };
      const raw = Array.from({ length: count }, (_, k) => {
        const a = (k * 2 * Math.PI) / count + 0.3;
        const r = 20 + 15 * k;
        return pt(`star-${k}`, center.x + r * Math.cos(a), center.y + r * Math.sin(a));
      });
      const ordered = mod.walkOrder(raw, center).map((id) => raw.find((p) => p.id === id));
      const spread = mod.spreadOf(ordered, center, { phone });
      const focus = mod.focusCamera(spread[0], mod.extentOf(spread), 1 / 1.15, { phone });
      const cams = [mod.overviewCamera(grid, grid.height / grid.width), focus];
      assert.ok(cams.every((c) => allFinite(c) && c.w > 0), `${label} : caméra non finie`);
    }
});
