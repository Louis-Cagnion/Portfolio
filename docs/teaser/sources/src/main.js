// Teaser 15 s du portfolio. Toute image ne dépend que de t (fonction pure), pas d'horloge ni d'état.
// Réutilise tel quel : journey-art.js (vaisseau, astres), dom.js, tokens.css ; le ciel reprend les
// constantes et la projection de js/ui/starfield.js, avec des positions déterministes.
import { shipArt, stopArt, artDefs } from '/assets/portfolio/js/sections/journey-art.js';
import { svg } from '/assets/portfolio/js/core/dom.js';

const W = 1920;
const H = 1080;
const BEATS = await (await fetch('/plan/beats.json')).json();
const DATA = await (await fetch('/assets/data.json')).json();
const TAU = Math.PI * 2;
const CUES = BEATS.cues;
const SC = (id) => BEATS.scenes[id].start;

// ───── Outils déterministes ─────
const hash = (i, k = 0) => {
  let h = Math.imul(i + 1, 374761393) ^ Math.imul(k + 7, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const lerp = (a, b, p) => a + (b - a) * p;

/** Courbe de Bézier CSS (mêmes courbes que tokens.css : --ease-in, --ease-out, --ease-inout). */
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (s) => ((ax * s + bx) * s + cx) * s;
  const Y = (s) => ((ay * s + by) * s + cy) * s;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0, hi = 1, s = x;
    for (let n = 0; n < 24; n++) {
      s = (lo + hi) / 2;
      if (X(s) < x) lo = s; else hi = s;
    }
    return Y(s);
  };
}
const easeIn = bezier(0.5, 0, 0.75, 0.4);
const easeOut = bezier(0.2, 0.8, 0.2, 1);
const easeInOut = bezier(0.65, 0, 0.35, 1);

// ───── Ciel : vitesse et distance parcourue, tabulées au pas de 1/60 s (fonction de t seule) ─────
const SKY = { base: 0.12, warp: 42, catchUp: 0.08, focal: 128, area: 5000, maxDepth: W };
const warpTarget = (t) => BEATS.warps.some((T) => t >= T - BEATS.warpLeadIn && t < T + BEATS.warpTail)
  ? SKY.warp : SKY.base;
const STEPS = Math.ceil((BEATS.duration + 1) * 60);
const speedTable = new Float32Array(STEPS + 2);
const distTable = new Float64Array(STEPS + 2);
{
  let s = SKY.base, d = 0;
  for (let i = 0; i <= STEPS + 1; i++) {
    s += (warpTarget(i / 60) - s) * SKY.catchUp;
    d += s;
    speedTable[i] = s;
    distTable[i] = d;
  }
}
const at = (table, t) => {
  const f = Math.min(Math.max(t * 60, 0), STEPS);
  const i = Math.floor(f);
  return lerp(table[i], table[i + 1], f - i);
};

const sky = document.getElementById('sky');
const ctx = sky.getContext('2d');
const STAR_COUNT = Math.round((W * H) / SKY.area);
const stars = Array.from({ length: STAR_COUNT }, (_, i) => ({
  z0: hash(i, 9001) * SKY.maxDepth,
  gold: hash(i, 77) < 0.14,
}));
const DUST_BAND = 760;
const dust = [];
for (const side of [0, 1]) {
  for (let i = 0; i < 700; i++) {
    const id = side * 1000 + i;
    const inset = DUST_BAND * hash(id, 31) ** 1.8;
    dust.push({
      x: side ? W - inset : inset,
      y: hash(id, 32) * H,
      r: hash(id, 33) < 0.07 ? 1.6 : 0.4 + hash(id, 34) * 0.8,
      alpha: 0.12 + hash(id, 35) * 0.6,
      phase: hash(id, 36) * TAU,
      pace: 0.4 + hash(id, 37) * 1.8,
      gold: hash(id, 38) < 0.12,
      depth: 0.3 + hash(id, 39) * 0.7,
    });
  }
}

function paintSky(t) {
  const speed = at(speedTable, t);
  const D = at(distTable, t);
  const tok = getComputedStyle(document.documentElement);
  ctx.globalAlpha = 1;
  ctx.fillStyle = tok.getPropertyValue('--void').trim();
  ctx.fillRect(0, 0, W, H);
  const calm = Math.max(0, 1 - speed / 6);
  const px = Math.sin(t * 0.45) * 0.1;
  const py = Math.cos(t * 0.33) * 0.07;
  if (calm > 0.01) {
    for (const g of dust) {
      const y = (((g.y - 0.03 * g.depth * t * 60) % (H + 4)) + (H + 4)) % (H + 4) - 2;
      const tw = 0.55 + 0.45 * Math.sin(t * g.pace + g.phase);
      ctx.globalAlpha = g.alpha * tw * calm;
      ctx.fillStyle = g.gold ? '#e8b45a' : 'rgb(230,236,255)';
      ctx.beginPath();
      ctx.arc(g.x - px * 16 * g.depth, y - py * 16 * g.depth, g.r, 0, TAU);
      ctx.fill();
    }
  }
  const trail = speed * 2.6 + 0.25;
  const fast = 1 + Math.min(1, speed / 20) * 0.9;
  stars.forEach((s, i) => {
    const raw = s.z0 - D;
    const wraps = raw >= 0 ? 0 : Math.ceil(-raw / SKY.maxDepth);
    const z = raw + wraps * SKY.maxDepth;
    if (z < 1.5) return;
    const x = wraps ? (hash(i, wraps * 2 + 1) - 0.5) * W * 2 : (hash(i, 5001) - 0.5) * W * 2;
    const y = wraps ? (hash(i, wraps * 2 + 2) - 0.5) * H * 2 : (hash(i, 5002) - 0.5) * H * 2;
    const near = 1 - z / SKY.maxDepth;
    const sx = x - px * 30;
    const sy = y - py * 30;
    const before = SKY.focal / (z + trail);
    const after = SKY.focal / z;
    ctx.globalAlpha = Math.min(1, near * 1.4);
    ctx.lineWidth = Math.max(0.7, near * 2.2) * fast;
    ctx.strokeStyle = s.gold && speed > 3 ? '#ffd9a0' : 'rgb(230,236,255)';
    ctx.beginPath();
    ctx.moveTo(sx * before + W / 2, sy * before + H / 2);
    ctx.lineTo(sx * after + W / 2 + 0.1, sy * after + H / 2 + 0.1);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
}

// ───── Fabrique de DOM ─────
const html = (s) => {
  const tpl = document.createElement('template');
  tpl.innerHTML = s.trim();
  return tpl.content.firstElementChild;
};
const viewsRoot = document.getElementById('views');
const mk = (cls, inner) => {
  const v = html(`<section class="view ${cls}">${inner}</section>`);
  viewsRoot.append(v);
  return v;
};
// Dégradés partagés : un seul jeu d'identifiants, dans un svg de taille nulle mais rendu (pas display:none).
const defsHost = svg('svg', { width: 0, height: 0, style: 'position:absolute' }, artDefs());
document.getElementById('frame').prepend(defsHost);
const stageSvg = () => svg('svg', { class: 'stage', viewBox: `0 0 ${W} ${H}` });

/** Pose un dessin de vaisseau ou d'astre : même transformation que journey-ship.js place(). */
const SHIP_NOSE = 13;
function placeShip(art, pose, scale, thrust) {
  const deg = (pose.angle * 180) / Math.PI;
  art.setAttribute('transform',
    `translate(${pose.x.toFixed(2)} ${pose.y.toFixed(2)}) rotate(${deg.toFixed(2)}) scale(${scale})`);
  art.classList.toggle('thrust', thrust);
}
/** Traînée : particules de journey-ship.js (TRAIL), une par image à 60 Hz, vie retirée 0.035 par image. */
function paintTrail(group, t, poseAt, scale, from, to) {
  const nodes = [];
  const kMax = Math.floor(t * 60);
  for (let k = kMax; k > kMax - 30; k--) {
    const tk = k / 60;
    if (tk < from || tk > to) continue;
    const life = 1 - 0.035 * (t - tk) * 60;
    if (life <= 0) continue;
    const p = poseAt(tk);
    const jx = (hash(k, 1) - 0.5) * 2 * scale;
    const jy = (hash(k, 2) - 0.5) * 2 * scale;
    nodes.push(svg('circle', {
      cx: (p.x - Math.cos(p.angle) * SHIP_NOSE * scale + jx).toFixed(1),
      cy: (p.y - Math.sin(p.angle) * SHIP_NOSE * scale + jy).toFixed(1),
      r: ((0.6 + 1.8 * life) * scale * 0.85).toFixed(2),
      opacity: (life * 0.8).toFixed(2),
    }));
  }
  group.replaceChildren(...nodes);
}

// ───── Vue 1 : accueil ─────
const home = DATA.home;
const rows = home.telemetry.rows.map((r, i) => `
  <div class="row" data-in="${(CUES.home.pitch + 1.3 + i * 0.95).toFixed(2)}"><dt>${r.label}</dt><dd class="${r.live ? 'live' : ''}">${r.value}</dd></div>`).join('');
const vHome = mk('home', `
  <div class="hero">
    <div>
      <p class="mission" data-in="${CUES.home.mission}">${home.mission}</p>
      <h1 data-in="${CUES.home.name}">${home.name}</h1>
      <p class="pitch" data-in="${CUES.home.pitch}">${home.pitch}</p>
      <div data-in="${CUES.home.ctas}"><span class="btn primary">${home.ctas.projects}</span><span class="btn">${home.ctas.contact}</span></div>
    </div>
    <aside class="hud telemetry" data-in="${CUES.home.pitch + 1.0}"><h3>${home.telemetry.title}</h3><dl>${rows}</dl></aside>
  </div>`);
const homeStage = stageSvg();
const homeTrail = svg('g', { class: 'trail' });
const homeShip = shipArt();
homeStage.append(homeTrail, homeShip);
vHome.append(homeStage);
const homePose = (t) => {
  const p = clamp01((t - 0.1) / (BEATS.warps[0] - 0.1));
  const x = -170 + 2000 * p ** 1.25;
  const y = 940 - 36 * Math.sin(t * 1.6);
  return { x, y, angle: -0.03 + 0.02 * Math.sin(t * 1.3) };
};

// ───── Vue 2 : parcours ─────
const stops = DATA.stops;
const vJourney = mk('journey', `<div class="jtitle" data-in="0.1"><div class="kick">${DATA.nav.journey}</div><h2>${DATA.journeyTitle}</h2></div>`);
const jStage = stageSvg();
const PATH = 'M 230 800 C 560 960, 700 470, 990 620 S 1420 930, 1690 430';
const pathEl = svg('path', { d: PATH, fill: 'none', stroke: 'rgba(230,236,255,.24)', 'stroke-width': 2.5, 'stroke-dasharray': '3 11', 'stroke-linecap': 'round' });
const litEl = svg('path', { d: PATH, fill: 'none', stroke: '#e8b45a', 'stroke-width': 3.5, 'stroke-linecap': 'round', opacity: '.85' });
const jTrail = svg('g', { class: 'trail' });
const jShip = shipArt();
jStage.append(pathEl, litEl);
const TOTAL = pathEl.getTotalLength();
const STOP_FRAC = [0, 0.26, 0.5, 0.76, 1];
const STOP_SCALE = { earth: 7, mars: 7, station: 6.5, nebula: 5, galaxy: 4 };
const stopG = stops.map((s, i) => {
  const p = pathEl.getPointAtLength(STOP_FRAC[i] * TOTAL);
  const g = svg('g', { transform: `translate(${p.x} ${p.y}) scale(${STOP_SCALE[s.body]})` }, ...stopArt(s.body));
  const wrap = svg('g', {}, g);
  jStage.append(wrap);
  return { wrap, p, s };
});
const pulse = svg('circle', { r: 16, fill: 'none', stroke: '#8fe3bf', 'stroke-width': 2.5 });
jStage.append(pulse);
jStage.append(jTrail, jShip);
vJourney.append(jStage);
const LABELS = [
  { dx: 0, dy: 100, cls: 'center', w: 520, ox: -260 },
  { dx: 0, dy: 100, cls: 'center', w: 520, ox: -260 },
  { dx: 0, dy: -170, cls: 'center', w: 560, ox: -280 },
  { dx: 0, dy: 110, cls: 'center', w: 520, ox: -260 },
  { dx: 0, dy: -215, cls: 'center', w: 520, ox: -260 },
];
const labelEls = stopG.map(({ p, s }, i) => {
  const L = LABELS[i];
  const tag = s.now ? '<div class="tag">NOW</div>' : '';
  const e = html(`<div class="slabel ${L.cls} ${s.now ? 'now' : ''}" style="left:${p.x + L.ox}px;top:${p.y + L.dy}px;width:${L.w}px"><div class="t">${s.title}</div><div class="w">${s.when}</div>${tag}</div>`);
  vJourney.append(e);
  return e;
});
const J = BEATS.journey;
/** Abscisse du vaisseau sur le tracé : arrêts aux escales, trajets en --ease-inout. */
const shipD = (t) => {
  let i = 0;
  while (i < 4 && t >= J.depart[i]) i++;
  // i = escale visée (0 : sur place)
  if (i === 0) return 0;
  const from = STOP_FRAC[i - 1];
  const to = STOP_FRAC[i];
  const p = clamp01((t - J.depart[i - 1]) / (J.arrive[i - 1] - J.depart[i - 1]));
  return lerp(from, to, easeInOut(p)) * TOTAL;
};
const shipMoving = (t) => J.depart.some((d, i) => t >= d && t < J.arrive[i]);
const jPoseAt = (t) => {
  const d = shipD(t);
  const a = pathEl.getPointAtLength(Math.max(d - 1.5, 0));
  const b = pathEl.getPointAtLength(Math.min(d + 1.5, TOTAL));
  const p = pathEl.getPointAtLength(d);
  return { x: p.x, y: p.y, angle: Math.atan2(b.y - a.y, b.x - a.x) };
};

// ───── Vue 3 : compétences ─────
const vSkills = mk('skills', `<div class="jtitle" data-in="0.1"><div class="kick">${DATA.nav.skills}</div><h2>${DATA.skills.title}</h2></div><div class="legend" data-in="${CUES.skills.legend}">${DATA.skills.legend}</div>`);
const skStage = stageSvg();
vSkills.append(skStage);
const CENTERS = [[560, 450], [1360, 450], [560, 810], [1360, 810]];
const MAX_ITEMS = [5, 3, 4, 3];
const clusters = DATA.skills.groups.map((g, gi) => {
  const items = g.items.filter((it) => it.name.length <= 14).slice(0, MAX_ITEMS[gi]);
  const [cx, cy] = CENTERS[gi];
  const pts = items.map((it, i) => {
    const a = -Math.PI / 2 + (i / items.length) * TAU + (hash(gi * 40 + i, 3) - 0.5) * 0.5;
    const r = 80 + hash(gi * 40 + i, 4) * 55;
    return { it, x: cx + Math.cos(a) * r * 1.9, y: cy + Math.sin(a) * r * 0.75 };
  });
  const lines = pts.slice(1).map((q, i) => ({ a: pts[i], b: q, len: Math.hypot(q.x - pts[i].x, q.y - pts[i].y) }));
  const lineEls = lines.map((l) => {
    const e = svg('line', { x1: l.a.x, y1: l.a.y, x2: l.b.x, y2: l.b.y, stroke: 'rgba(230,236,255,.3)', 'stroke-width': 2 });
    skStage.append(e);
    return e;
  });
  const name = svg('text', { class: 'sk-name', x: cx - 40, y: cy - 165 });
  name.textContent = g.short;
  skStage.append(name);
  const bodies = pts.map(({ it, x, y }) => {
    const sc = it.level === 'advanced' ? 2.1 : it.level === 'intermediate' ? 1.8 : 1.4;
    let art;
    if (it.level === 'advanced') art = stopArt('galaxy');
    else if (it.level === 'intermediate') art = stopArt('nebula');
    else art = [svg('circle', { r: 14, fill: '#ffd98a', opacity: '.25' }), svg('circle', { r: 8, fill: '#ffe3a8' })];
    const g1 = svg('g', { transform: `translate(${x} ${y}) scale(${sc})` }, ...art);
    const wrap = svg('g', {}, g1);
    const label = svg('text', { class: 'sk-item', x: x + 8, y: y + 62, 'text-anchor': 'middle' });
    label.textContent = it.name;
    wrap.append(label);
    skStage.append(wrap);
    return wrap;
  });
  return { name, lineEls, lines, bodies, gi, pts };
});
const cRing = svg('circle', { r: 40, fill: 'none', stroke: '#e8b45a', 'stroke-width': 3, opacity: 0 });
skStage.append(cRing);

// ───── Vue 4 : projets ─────
const vProjects = mk('projects', `<div class="jtitle" data-in="0.1"><div class="kick">${DATA.nav.projects}</div><h2>${DATA.projects.title}</h2></div>`);
const prStage = stageSvg();
vProjects.append(prStage);
const SYS_X = [345, 782, 1218, 1655];
const PLANETS = ['earth', 'moon', 'mars', 'saturn', 'earth', 'moon', 'mars', 'saturn'];
const systems = DATA.projects.systems.map((sy, si) => {
  const cx = SYS_X[si];
  const cy = 540;
  const orbits = [[86, 3], [140, 3], [195, 2]];
  const g = svg('g', { transform: `translate(${cx} ${cy})` });
  const orbitEls = orbits.map(([r]) => svg('ellipse', { rx: r, ry: r * 0.42, fill: 'none', stroke: 'rgba(220,230,255,.18)', 'stroke-width': 2, transform: 'rotate(-10)' }));
  const sun = svg('g', { transform: 'scale(1.3)' }, svg('circle', { r: 46, fill: 'url(#jNebC)' }), svg('circle', { r: 17, fill: '#ffe0a0' }), svg('circle', { r: 9, fill: '#fff7e0' }));
  g.append(...orbitEls, sun);
  const planets = [];
  let pi = 0;
  const n = Math.min(sy.n, 8);
  orbits.forEach(([r, cnt], oi) => {
    for (let k = 0; k < cnt && pi < n; k++, pi++) {
      const kind = PLANETS[(pi + si) % PLANETS.length];
      const pg = svg('g', {}, ...stopArt(kind));
      const wrap = svg('g', {}, pg);
      g.append(wrap);
      planets.push({ wrap, pg, r, phase: (k / cnt) * TAU + hash(si * 10 + pi, 6) * 1.2, w: 1.5 / (oi + 1) ** 0.6, kind });
    }
  });
  prStage.append(g);
  const name = svg('text', { class: 'sys-name', x: cx, y: cy + 310 });
  name.textContent = sy.name.length > 18 ? sy.name : sy.name;
  const count = svg('text', { class: 'sys-count', x: cx, y: cy + 355 });
  count.textContent = DATA.projects.count.replace('{n}', sy.n).toUpperCase();
  prStage.append(name, count);
  return { g, planets, orbitEls, sun, name, count, cx, cy };
});

// ───── Vue 5 : contact ─────
const C = DATA.contact;
const chips = C.channels.map((c, i) => `<div class="chip" data-in="${CUES.contact.chips[i].toFixed(2)}"><i></i>${c}</div>`).join('');
const vContact = mk('contact', `
  <div class="contact-text">
    <div class="kick" data-in="${SC('contact') + 0.3}">${DATA.nav.contact}</div>
    <h2 data-in="${SC('contact') + 0.4}">${C.title}</h2>
    <p class="q" data-in="${SC('contact') + 0.9}">${C.question}</p>
    <div class="chips">${chips}</div>
  </div>
  <div class="site" data-in="${CUES.contact.site}">louis-cagnion.github.io/Portfolio</div>
  <div class="sign" data-in="${CUES.contact.sign}">Louis Cagnion · Tech &amp; Data Engineering Apprentice</div>`);
const cStage = stageSvg();
const DISC = { x: 1390, y: 590, r: 330 };
const disc = svg('g', { transform: `translate(${DISC.x} ${DISC.y})` });
disc.append(
  svg('defs', {}, (() => {
    const g = svg('radialGradient', { id: 'goldDisc', cx: '.4', cy: '.35', r: '.85' });
    [['0', '#f7d892'], ['.5', '#dca84f'], ['1', '#8a5b1a']].forEach(([o, c]) => g.append(svg('stop', { offset: o, 'stop-color': c })));
    return g;
  })()),
  svg('circle', { r: DISC.r + 34, fill: 'url(#jHalo)', opacity: '.6' }),
  svg('circle', { r: DISC.r, fill: 'url(#goldDisc)', stroke: 'rgba(255,235,180,.6)', 'stroke-width': 3 }),
);
for (let r = 118; r <= 316; r += 13) disc.append(svg('circle', { r, fill: 'none', stroke: 'rgba(70,45,10,.35)', 'stroke-width': 1.4 }));
const ARC_R = [150, 208, 266, 306];
const arcs = ARC_R.map((r, i) => {
  const a = svg('circle', { r, fill: 'none', stroke: 'rgba(255,235,180,.9)', 'stroke-width': 6, 'stroke-linecap': 'round' });
  a.dataset.r = r;
  disc.append(a);
  return a;
});
disc.append(
  svg('circle', { r: 96, fill: '#3b2507', stroke: 'rgba(255,240,200,.55)', 'stroke-width': 3 }),
  svg('rect', { x: -40, y: -26, width: 80, height: 54, rx: 5, fill: 'none', stroke: '#e8b45a', 'stroke-width': 4 }),
  svg('path', { d: 'M-40-22L0 8L40-22', fill: 'none', stroke: '#e8b45a', 'stroke-width': 4, 'stroke-linejoin': 'round' }),
);
cStage.append(disc);
const cTrail = svg('g', { class: 'trail' });
const cShip = shipArt();
cStage.append(cTrail, cShip);
vContact.append(cStage);
const glare = html('<div class="glare"></div>');
vContact.append(glare);
const ORBIT = { x: DISC.x, y: DISC.y, rx: 560, ry: 400 };
const cPoseAt = (t) => {
  const th = -2.45 + (t - SC('contact')) * 0.26;
  const x = ORBIT.x + Math.cos(th) * ORBIT.rx;
  const y = ORBIT.y + Math.sin(th) * ORBIT.ry;
  const dx = -Math.sin(th) * ORBIT.rx;
  const dy = Math.cos(th) * ORBIT.ry;
  return { x, y, angle: Math.atan2(dy, dx) };
};

// ───── Barre de navigation ─────
const nav = document.querySelector('.nav');
const pill = nav.querySelector('.pill');
const navBtns = BEATS.views.map((id) => {
  const b = html(`<button>${DATA.nav[id]}</button>`);
  nav.append(b);
  return b;
});
await document.fonts.ready;
for (const f of ['400 40px Michroma', '500 20px "IBM Plex Sans"', '600 20px "IBM Plex Sans"', '400 20px "IBM Plex Sans"', '500 20px "IBM Plex Mono"', '600 20px "IBM Plex Mono"', '400 20px "IBM Plex Mono"']) await document.fonts.load(f);
const slots = navBtns.map((b) => ({ left: b.offsetLeft, width: b.offsetWidth }));

// ───── Calendrier des vues ─────
const bounds = [0, ...BEATS.warps, BEATS.duration];
const views = [vHome, vJourney, vSkills, vProjects, vContact];
function viewState(i, t) {
  const start = bounds[i];
  const end = bounds[i + 1];
  if (t < start || t > end) return null;
  if (i > 0 && t < start + BEATS.warpIn) {
    const e = easeOut((t - start) / BEATS.warpIn);
    return { opacity: e, scale: lerp(0.55, 1, e) };
  }
  if (i < views.length - 1 && t > end - BEATS.warpOut) {
    const e = easeIn((t - (end - BEATS.warpOut)) / BEATS.warpOut);
    return { opacity: 1 - e, scale: lerp(1, 1.7, e) };
  }
  return { opacity: 1, scale: 1 };
}
const currentView = (t) => {
  let i = 0;
  while (i < views.length - 1 && t >= bounds[i + 1]) i++;
  return i;
};

function reveal(root, t) {
  root.querySelectorAll('[data-in]').forEach((e) => {
    const p = easeOut(clamp01((t - Number(e.dataset.in)) / 0.5));
    e.style.opacity = p.toFixed(3);
    e.style.transform = `translateY(${((1 - p) * 22).toFixed(1)}px)`;
  });
}

function seekAnimations(t) {
  document.getAnimations().forEach((a) => {
    const target = a.effect && a.effect.target;
    a.pause();
    const k = target && target.classList && target.classList.contains('b-spin') ? 6 : 1;
    a.currentTime = t * 1000 * k;
  });
}

const flashEl = document.querySelector('.flash');
const veil = document.querySelector('.veil');
const barEl = document.querySelector('.bar');

function renderFrame(t) {
  paintSky(t);
  const cur = currentView(t);
  views.forEach((v, i) => {
    const st = viewState(i, t);
    v.style.display = st ? 'block' : 'none';
    if (st) {
      v.style.opacity = st.opacity.toFixed(3);
      v.style.transform = `scale(${st.scale.toFixed(4)})`;
    }
  });

  // accueil
  reveal(vHome, t);
  const hp = homePose(t);
  placeShip(homeShip, hp, 4.2, true);
  paintTrail(homeTrail, t, homePose, 4.2, 0.1, BEATS.warps[0] + 0.3);

  // parcours
  reveal(vJourney, t);
  const t0 = SC('journey');
  stopG.forEach(({ wrap }, i) => {
    const p = easeOut(clamp01((t - (t0 + 0.12 + i * 0.07)) / 0.4));
    wrap.setAttribute('opacity', p.toFixed(3));
  });
  const d = shipD(t);
  litEl.setAttribute('stroke-dasharray', `${d.toFixed(1)} ${TOTAL + 50}`);
  const jp = jPoseAt(t);
  placeShip(jShip, jp, 4.2, shipMoving(t));
  paintTrail(jTrail, t, jPoseAt, 4.2, t0, J.arrive[3] + 0.05);
  labelEls.forEach((e, i) => {
    const arr = i === 0 ? t0 + 0.7 : CUES.journey.stops[i] - 0.15;
    const p = easeOut(clamp01((t - arr) / 0.4));
    e.style.opacity = p.toFixed(3);
    e.style.transform = `translateY(${((1 - p) * 18).toFixed(1)}px)`;
  });
  const np = stopG[2].p;
  const ph = (((t - J.arrive[1]) % 2) + 2) % 2 / 2;
  pulse.setAttribute('cx', np.x);
  pulse.setAttribute('cy', np.y);
  const live = t >= J.arrive[1] - 0.1 && t < BEATS.warps[1] - 0.3 ? 1 : 0;
  pulse.setAttribute('r', (16 * (1 + 2 * ph) * 1.6).toFixed(1));
  pulse.setAttribute('opacity', (live * 0.9 * (1 - ph)).toFixed(3));

  // compétences
  reveal(vSkills, t);
  clusters.forEach((c) => {
    const base = CUES.skills.clusters[c.gi];
    c.name.setAttribute('opacity', easeOut(clamp01((t - base) / 0.35)).toFixed(3));
    c.bodies.forEach((b, i) => {
      const p = easeOut(clamp01((t - (base + 0.08 * i)) / 0.35));
      b.setAttribute('opacity', p.toFixed(3));
    });
    c.lineEls.forEach((l, i) => {
      const p = clamp01((t - (base + 0.12 + 0.08 * i)) / 0.3);
      const len = c.lines[i].len;
      l.setAttribute('stroke-dasharray', `${(len * p).toFixed(1)} ${len + 1}`);
    });
  });

  const pc = clusters[0].pts[0];
  const rp = ((t - CUES.skills.c) / 1.5);
  cRing.setAttribute('cx', pc.x);
  cRing.setAttribute('cy', pc.y);
  cRing.setAttribute('r', (50 + 90 * easeOut(clamp01(rp % 1))).toFixed(1));
  cRing.setAttribute('opacity', (rp >= 0 && rp < 2.2 ? 0.9 * (1 - clamp01(rp % 1)) : 0).toFixed(3));

  // projets
  reveal(vProjects, t);
  const tp = SC('projects');
  systems.forEach((s, si) => {
    const base = CUES.projects.systems[si] - 0.2;
    const p = easeOut(clamp01((t - base) / 0.4));
    // « Four star systems » : orbites et soleils d'abord ; planètes et noms à l'énoncé de chaque système
    s.g.setAttribute('opacity', easeOut(clamp01((t - (tp + 0.5 + si * 0.2)) / 0.5)).toFixed(3));
    s.name.setAttribute('opacity', p.toFixed(3));
    s.count.setAttribute('opacity', p.toFixed(3));
    s.planets.forEach((pl) => {
      pl.wrap.setAttribute('opacity', p.toFixed(3));
      const th = pl.phase + pl.w * (t - tp) * 1.4;
      const x = Math.cos(th) * pl.r;
      const y = Math.sin(th) * pl.r * 0.42;
      const rot = -10 * Math.PI / 180;
      const rx = x * Math.cos(rot) - y * Math.sin(rot);
      const ry = x * Math.sin(rot) + y * Math.cos(rot);
      const depth = 0.8 + 0.25 * Math.sin(th);
      const sc = (pl.kind === 'saturn' ? 1.5 : 2) * depth;
      pl.wrap.setAttribute('transform', `translate(${rx.toFixed(1)} ${ry.toFixed(1)}) scale(${sc.toFixed(3)})`);
    });
  });

  // contact
  reveal(vContact, t);
  const tc = SC('contact');
  disc.setAttribute('opacity', easeOut(clamp01((t - (tc + 0.1)) / 0.5)).toFixed(3));
  arcs.forEach((a, i) => {
    const r = Number(a.dataset.r);
    const circ = TAU * r;
    const span = circ * 0.28;
    const rot = (t * (24 + i * 9) + i * 70) % 360;
    a.setAttribute('stroke-dasharray', `${span.toFixed(1)} ${(circ - span).toFixed(1)}`);
    a.setAttribute('transform', `rotate(${rot.toFixed(2)})`);
    const lit = clamp01(1 - Math.abs(((t - tc - 1.0 - i * 0.16) % 1.6) - 0.3) * 1.8);
    a.setAttribute('opacity', (0.35 + 0.65 * lit).toFixed(3));
  });
  const gl = DISC.r * 2;
  glare.style.cssText = `left:${DISC.x - DISC.r}px;top:${DISC.y - DISC.r}px;width:${gl}px;height:${gl}px;`
    + `background:conic-gradient(from ${(t * 60).toFixed(1)}deg, transparent 0 28%, rgba(255,240,200,.38) 36%, transparent 44%, transparent 76%, rgba(255,240,200,.26) 84%, transparent 92%);`
    + `-webkit-mask:radial-gradient(circle, transparent 98px, #000 100px, #000 ${DISC.r - 2}px, transparent ${DISC.r}px);`
    + `opacity:${easeOut(clamp01((t - (tc + 0.2)) / 0.5)).toFixed(3)}`;
  const cp = cPoseAt(t);
  placeShip(cShip, cp, 3.6, true);
  paintTrail(cTrail, t, cPoseAt, 3.6, tc, BEATS.duration);

  // barre : pastille qui glisse vers l'onglet actif au moment du saut
  const idx = cur;
  let slotLeft = slots[idx].left;
  let slotWidth = slots[idx].width;
  if (idx > 0) {
    const e = easeInOut(clamp01((t - bounds[idx]) / 0.5));
    slotLeft = lerp(slots[idx - 1].left, slots[idx].left, e);
    slotWidth = lerp(slots[idx - 1].width, slots[idx].width, e);
  }
  pill.style.left = `${slotLeft}px`;
  pill.style.width = `${slotWidth}px`;
  navBtns.forEach((b, i) => b.classList.toggle('cur', i === idx));

  // flash du saut
  let f = 0;
  for (const T of BEATS.warps) {
    if (t >= T - BEATS.warpOut && t < T) f = Math.max(f, easeIn((t - (T - BEATS.warpOut)) / BEATS.warpOut));
    else if (t >= T && t < T + 0.55) f = Math.max(f, 1 - easeOut((t - T) / 0.55));
  }
  flashEl.style.opacity = f.toFixed(3);

  // fondu d'entrée et de sortie dans le vide
  const vin = 1 - clamp01(t / BEATS.fadeInEnd);
  const vout = clamp01((t - BEATS.fadeOutStart) / (BEATS.duration - BEATS.fadeOutStart));
  veil.style.opacity = Math.max(vin, vout).toFixed(3);
  barEl.style.opacity = (1 - Math.max(vin, vout) * 0).toFixed(3);

  seekAnimations(t);
}

window.renderFrame = async (t) => {
  renderFrame(t);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
};
window.__ready = true;
