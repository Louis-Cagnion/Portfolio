/* Maquette S6 : projets et fiche. Mécanique de docs/design/prototype, textes de data/fr.json.
   Choix de Louis (11/10/2026) : introduction sous le plan, quatre systèmes deux par deux,
   téléphone : Piscine zoomée avec toutes les étiquettes et zones de toucher de 44 px.
   Options d'URL : zoom=<id système>, still (planètes figées), measure, hit=show (zones de
   toucher de 44 px visibles), peek=<id projet> (planète montrée comme touchée),
   scrollto=<id système> (téléphone). */
const NS = 'http://www.w3.org/2000/svg';
const OPT = new URLSearchParams(location.search);
const pick = (key, list, fallback) => list.includes(OPT.get(key)) ? OPT.get(key) : fallback;
const HIT_SHOW = pick('hit', ['show'], '') === 'show';
const STILL = OPT.has('still');
const root = document.documentElement;
if (HIT_SHOW) root.dataset.hit = 'show';
if (STILL) root.dataset.still = '';
if (OPT.has('zoom')) root.dataset.instant = '';

/* teintes : les trois premières viennent de la maquette, la Piscine est un bleu azur */
const TINTS = {
    pro: { sun: ['#fff6da', '#e8b45a'], planet: ['#ffd88f', '#b9822f'] },
    perso: { sun: ['#f3e1ff', '#a46bd8'], planet: ['#e3c3ff', '#7a45b0'] },
    school: { sun: ['#dcfff8', '#4fd1c5'], planet: ['#b8f5ec', '#25857c'] },
    piscine: { sun: ['#e2f0ff', '#4f8cff'], planet: ['#bcd8ff', '#2f62c9'] },
};
/* Piscine : 20 planètes sur 5 orbites de 2, 4, 4, 5 et 5 planètes (du centre vers le bord) */
const PIS_RATIOS = [0.28, 0.46, 0.64, 0.82, 1];
const PIS_COUNTS = [2, 4, 4, 5, 5];
const PIS_OFFSETS = [1.1, 3.59, 4.46, 5.18, 0.71];
/* Piscine sur téléphone, géométrie en pixels d'écran : 3 anneaux de 3, 6 et 11 planètes ;
   par module : [anneau, angle]. Les étiquettes sont sous les planètes, donc la géométrie
   ne dépend pas de la rotation (le système tourne d'un bloc, sans inclinaison). */
const PHONE_RINGS_PX = [43, 83, 123];
const PHONE_SLOTS = [
    [2, 4.42], [2, 4.995], [1, 6.059], [2, 1.875], [1, 3.043], [2, 5.448], [2, 1.296],
    [0, 1.113], [2, 0.444], [2, 0.902], [2, 0.007], [1, 1.565], [1, 3.903], [1, 0.659],
    [0, 3.428], [2, 5.82], [2, 3.49], [1, 2.253], [0, 5.268], [2, 2.661],
];
const PHONE_CAM = 370, PHONE_PIS_H = 320, PHONE_PIS_ROW = 152, HIT_R = 22;
const TAU = 2 * Math.PI;
const TILT = 0.42, Z_SPEED = 0.00005, Z_PHONE_RATIO = 1.25;
const SYS_ROW = 270, DESK_W = 1100, PHONE_W = 360;
const narrow = matchMedia('(max-width: 880px)');
const isPhonePis = i => narrow.matches && SYS[i].id === 'piscine';
const tiltFocus = i => isPhonePis(i) ? 1 : narrow.matches ? 0.9 : 0.62;
/* unités du plan par pixel d'écran quand la caméra est à la largeur du zoom téléphone */
const phoneUnit = () => PHONE_CAM / (sysSvg.clientWidth || PHONE_W);
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const lerp = (a, b, t) => a + (b - a) * t;
const ease = k => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const $ = id => document.getElementById(id);
const mk = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    parent && parent.append(e);
    return e;
};

/* texte riche : seuls les liens et la mise en forme simple passent, jamais de HTML brut */
const RICH_TAGS = ['A', 'STRONG', 'EM', 'CODE'];
const SAFE_HREF = /^(https?:|mailto:|#|\/|\.)/;
function appendRich(parent, node) {
    node.childNodes.forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) parent.append(child.textContent);
        else if (RICH_TAGS.includes(child.tagName)) {
            const copy = document.createElement(child.tagName.toLowerCase());
            const href = child.getAttribute('href');
            if (child.tagName === 'A' && SAFE_HREF.test(href)) copy.href = href;
            appendRich(copy, child);
            parent.append(copy);
        } else appendRich(parent, child);
    });
}
function setRich(el, html) {
    el.replaceChildren();
    appendRich(el, new DOMParser().parseFromString(html, 'text/html').body);
}

/* caméra : anime le viewBox d'un SVG (centre et largeur), la hauteur suit le ratio */
function makeCamera(svg) {
    const c = { cx: 0, cy: 0, w: 1, raf: 0, pending: null, instant: false };
    const settle = () => {
        cancelAnimationFrame(c.raf);
        c.raf = 0;
        const p = c.pending;
        c.pending = null;
        p && p();
    };
    c.ratio = () => svg.clientHeight / svg.clientWidth || 0.4;
    c.apply = () => {
        const h = c.w * c.ratio();
        svg.setAttribute('viewBox', `${c.cx - c.w / 2} ${c.cy - h / 2} ${c.w} ${h}`);
        svg.style.setProperty('--u', (c.w / (svg.clientWidth || 1)).toFixed(4));
    };
    c.set = t => { settle(); Object.assign(c, t); c.apply(); };
    c.tween = (target, dur, onFrame) => {
        settle();
        const from = { cx: c.cx, cy: c.cy, w: c.w }, t0 = performance.now();
        const d = reduce() || c.instant ? 0 : dur;
        return new Promise(res => {
            c.pending = res;
            (function f(now) {
                const k = d ? Math.min(1, (now - t0) / d) : 1, e = ease(k), to = target();
                c.cx = lerp(from.cx, to.cx, e);
                c.cy = lerp(from.cy, to.cy, e);
                c.w = lerp(from.w, to.w, e);
                c.apply();
                onFrame && onFrame(e);
                if (k < 1) c.raf = requestAnimationFrame(f); else settle();
            })(t0);
        });
    };
    return c;
}

const sysSvg = $('systems'), sysLayout = $('sysLayout'), plist = $('plist');
const scam = makeCamera(sysSvg);
const measureCtx = document.createElement('canvas').getContext('2d');
let SYS = [], planets = [], systems = [], zoomSys = -1, zMoving = false, sysHover = false;
let TEXT = {}, introEl, opener;

/* largeur d'étiquette par canvas : valable même section masquée */
function labelWidth(t) {
    measureCtx.font = '500 12.5px "IBM Plex Sans", sans-serif';
    return measureCtx.measureText(t).width;
}
const plainTitle = t => t.replace(/<[^>]+>/g, '');
/* sur téléphone, un titre long se coupe à l'espace le plus proche du milieu */
function splitTitle(t) {
    const mid = t.length / 2;
    let best = -1;
    for (let k = 0; k < t.length; k++) {
        if (t[k] === ' ' && (best < 0 || Math.abs(k - mid) < Math.abs(best - mid))) best = k;
    }
    return best < 0 ? [t] : [t.slice(0, best), t.slice(best + 1)];
}

/* disposition des quatre systèmes : cellules du plan (deux par deux au bureau) */
function geometry() {
    const n = SYS.length;
    if (narrow.matches) {
        const cells = SYS.map((_, i) => ({ x: 0, y: SYS_ROW * i, w: PHONE_W, h: SYS_ROW }));
        return { w: PHONE_W, h: SYS_ROW * n, cells, pisMax: 0 };
    }
    const half = DESK_W / 2;
    const cells = SYS.map((_, k) => ({
        x: half * (k % 2), y: SYS_ROW * Math.floor(k / 2), w: half, h: SYS_ROW,
    }));
    return { w: DESK_W, h: SYS_ROW * 2, cells, pisMax: 215 };
}
const sysDims = () => { const g = geometry(); return { w: g.w, h: g.h }; };
function orbitRadii(s, cell, pisMax) {
    if (s.id === 'piscine' && narrow.matches) return PHONE_RINGS_PX.map(r => r * phoneUnit());
    if (s.id === 'piscine') return PIS_RATIOS.map(k => k * pisMax);
    return cell.w < 300 ? [48, 84, 120] : [72, 120, 168];
}

/* emplacements de la Piscine : angle de chaque case, triées pour suivre l'ordre des modules */
function pisSlots(radii) {
    const slots = [];
    radii.forEach((r, o) => {
        for (let m = 0; m < PIS_COUNTS[o]; m++) {
            slots.push({ r, ang: (PIS_OFFSETS[o] + m * TAU / PIS_COUNTS[o]) % TAU });
        }
    });
    return slots.sort((a, b) => a.ang - b.ang);
}

function placePlanet(pl) {
    const S = systems[pl.si];
    const x = S.cx + pl.r * Math.cos(pl.a), y = S.cy + pl.r * S.tilt * Math.sin(pl.a);
    pl.g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    pl.g.style.opacity = Math.sin(pl.a) < 0 ? 0.75 : 1;
    if (pl.hit22) {
        const u = parseFloat(sysSvg.style.getPropertyValue('--u')) || 1;
        pl.hit22.setAttribute('r', (HIT_R * u).toFixed(2));
    }
    placeLabel(pl, x, y);
}
/* les étiquettes gardent leur taille d'écran (--u) ; zoomées, elles fuient le soleil */
function placeLabel(pl, x, y) {
    const u = parseFloat(sysSvg.style.getPropertyValue('--u')) || 1;
    const lw = pl.lw * u, lh = pl.lh * u, d = pl.size + 6 * u;
    let bx = x + d, by = y - lh / 2;
    if (zoomSys === pl.si && pl.below) {
        const left = scam.cx - scam.w / 2 + 4 * u, right = scam.cx + scam.w / 2 - 4 * u;
        bx = Math.max(left, Math.min(right - lw, x - lw / 2));
        by = y + pl.size + 4 * u;
    } else if (zoomSys === pl.si) {
        const c = Math.cos(pl.a), s = Math.sin(pl.a);
        const left = scam.cx - scam.w / 2 + 4 * u, right = scam.cx + scam.w / 2 - 4 * u;
        bx = x + d * c - lw * (1 - c) / 2;
        by = y + d * s - lh * (1 - s) / 2;
        const cl = Math.max(left, Math.min(right - lw, bx));
        if (Math.abs(cl - bx) > 1 && Math.abs(s) < 0.6) by = s >= 0 ? y + d : y - d - lh;
        bx = cl;
    }
    const move = `translate(${(bx - x).toFixed(1)} ${(by - y).toFixed(1)})`;
    pl.lg.setAttribute('transform', `${move} scale(${u.toFixed(4)})`);
}

function buildSystems() {
    sysSvg.replaceChildren();
    planets = []; systems = []; zoomSys = -1;
    sysLayout.classList.remove('zfocus');
    sysSvg.classList.remove('zoomed');
    plist.hidden = false;
    const m = narrow.matches, geo = geometry(), { w, h } = geo;
    sysSvg.style.height = '';
    sysSvg.style.aspectRatio = `${w} / ${h}`;
    scam.set({ cx: w / 2, cy: h / 2, w });
    const defs = mk('defs', {}, sysSvg);
    SYS.forEach((s, i) => {
        const cell = geo.cells[i], cx = cell.x + cell.w / 2, cy = cell.y + SYS_ROW / 2 - 26;
        const sg = mk('radialGradient', { id: `sun${i}` }, defs);
        mk('stop', { offset: 0, 'stop-color': s.sun[0] }, sg);
        mk('stop', { offset: 0.55, 'stop-color': s.sun[1] }, sg);
        mk('stop', { offset: 1, 'stop-color': s.sun[1], 'stop-opacity': 0 }, sg);
        const pg = mk('radialGradient', { id: `pl${i}`, cx: 0.35, cy: 0.3, r: 0.8 }, defs);
        mk('stop', { offset: 0, 'stop-color': s.planet[0] }, pg);
        mk('stop', { offset: 1, 'stop-color': s.planet[1] }, pg);
        const radii = orbitRadii(s, cell, geo.pisMax), isPis = s.id === 'piscine';
        const phonePis = isPis && m;
        const slots = isPis && !m ? pisSlots(radii) : [];
        const sysG = mk('g', { class: 'sys' }, sysSvg);
        const rmax = Math.max(...radii);
        const S = { g: sysG, cx, cy, tilt: TILT, orbits: [], rmax, phonePis };
        systems.push(S);
        mk('rect', {
            class: 'sys-hit', x: cell.x, y: cell.y, width: cell.w, height: cell.h,
        }, sysG);
        sysG.addEventListener('click', e => e.target.closest('.planet') || zoomTo(i));
        radii.forEach(r => {
            const orbit = { class: 'orbit', cx, cy, rx: r, ry: r * TILT };
            S.orbits.push(mk('ellipse', orbit, sysG));
        });
        const sun = mk('g', {
            class: 'sun-btn', tabindex: 0, role: 'button',
            'aria-label': TEXT.approach.replace('{name}', s.name),
        }, sysG);
        mk('circle', { class: 'sun-glow', cx, cy, r: 44, fill: `url(#sun${i})` }, sun);
        mk('circle', { cx, cy, r: 16, fill: s.sun[0] }, sun);
        mk('text', { class: 'sun-label', x: cx, y: cy + 112 }, sun).textContent = s.name;
        const count = TEXT.count.replace('{n}', s.projects.length);
        mk('text', { class: 'sun-sub', x: cx, y: cy + 132 }, sun).textContent = count;
        sun.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); zoomTo(i); }
        });
        s.projects.forEach((p, j) => {
            const nb = p.blocks.length, title = plainTitle(p.title);
            const size = 7 + Math.min(6, nb * 1.4);
            const lines = m && title.length > 20 ? splitTitle(title) : [title];
            const lw = Math.max(...lines.map(labelWidth)) + 16, lh = 8 + 14 * lines.length;
            const g = mk('g', {
                class: 'planet', tabindex: 0, role: 'button', 'aria-label': title,
            }, sysG);
            const hit = mk('circle', { class: 'pl-hit', r: size + 10 }, g);
            if (phonePis) hit.setAttribute('class', 'pl-hit hit44');
            mk('circle', { class: 'pl-body', r: size, fill: `url(#pl${i})` }, g);
            const lg = mk('g', { class: 'pl-label' }, g);
            mk('rect', { class: 'pl-bg', x: 0, y: 0, width: lw, height: lh, rx: 4 }, lg);
            const tx = mk('text', { class: 'pl-name', x: 8, y: 15 }, lg);
            lines.forEach((t, k) => {
                mk('tspan', { x: 8, dy: k ? 14 : 0 }, tx).textContent = t;
            });
            const slot = phonePis ? { r: 0, ang: PHONE_SLOTS[j][1] } : slots[j];
            const ring = phonePis ? PHONE_SLOTS[j][0] : 0;
            const r = phonePis ? radii[ring] : isPis ? slot.r : radii[j % 3];
            const angle0 = phonePis ? PHONE_SLOTS[0][1] : isPis ? slots[0].ang : 0;
            const rel = isPis ? slot.ang - angle0 : j * TAU / s.projects.length;
            const a0 = isPis ? slot.ang + i : j * 2.4 + i;
            const sp = 0.00012 * (180 / r);
            const pl = { g, lg, lw, lh, size, si: i, p, r, a: a0, rel, sp, ring };
            if (phonePis) {
                pl.below = true;
                pl.hit22 = hit;
                g.classList.add('nearest');
            }
            /* déplacer à nouveau le nœud survolé à chaque événement détournerait le clic */
            const raise = () => sysG.lastElementChild === g || sysG.append(g);
            g.addEventListener('mouseenter', raise);
            g.addEventListener('focus', raise);
            g.addEventListener('click', () => openSheet(p, s, g));
            g.addEventListener('keydown', e => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                openSheet(p, s, g);
            });
            placePlanet(pl);
            planets.push(pl);
        });
    });
}

/* liste des projets : visible en vue d'ensemble, masquée pendant un zoom */
function buildList() {
    plist.replaceChildren();
    plist.setAttribute('aria-label', TEXT.listLabel);
    SYS.forEach((s, i) => s.projects.forEach(p => {
        const b = document.createElement('button'), dot = document.createElement('i');
        b.type = 'button';
        b.dataset.sys = i;
        dot.style.background = s.planet[1];
        b.append(dot, plainTitle(p.title));
        b.addEventListener('click', () => openSheet(p, s, b));
        plist.append(b);
    }));
}
function filterList() {
    plist.hidden = zoomSys >= 0;
}

/* les planètes tournent ; zoomé, le système s'arrête sous le pointeur */
let lastSpin = performance.now();
(function spin(now) {
    const dt = Math.min(now - lastSpin, 50);
    lastSpin = now;
    const focused = !!sysSvg.querySelector('.sys.on .planet:focus-visible');
    const held = zoomSys >= 0 && (sysHover || focused);
    if (!STILL && !reduce()) for (const pl of planets) {
        const mine = pl.si === zoomSys;
        if (mine ? !held : !pl.g.matches(':hover, :focus-visible')) {
            pl.a += (mine ? Z_SPEED : pl.sp) * dt;
        }
        placePlanet(pl);
    }
    requestAnimationFrame(spin);
})(lastSpin);
sysSvg.addEventListener('pointerenter', () => { sysHover = true; });
sysSvg.addEventListener('pointerleave', () => { sysHover = false; });

/* zoom sur un système : la caméra approche, les orbites s'ouvrent, les autres s'effacent */
function focusCamSys(i) {
    const S = systems[i];
    if (S.phonePis) {
        const dy = (phoneHeight(i) / 2 - PHONE_PIS_ROW) * phoneUnit();
        return { cx: S.cx, cy: S.cy + dy, w: PHONE_CAM };
    }
    if (narrow.matches) return { cx: S.cx, cy: S.cy, w: PHONE_CAM };
    /* hauteur ajustée à la plus grande orbite : 300 unités avec les rayons de la maquette */
    const hUnits = 2 * (S.rmax * tiltFocus() + 46);
    const w = Math.max(hUnits / scam.ratio(), 2 * S.rmax + 80);
    return { cx: S.cx, cy: S.cy, w };
}
/* hauteur du plan zoomé sur téléphone : fixe pour la Piscine, sinon multiple de la largeur */
const phoneHeight = i => {
    if (!isPhonePis(i)) return sysSvg.clientWidth * Z_PHONE_RATIO;
    /* au-delà de 430 px les planètes grossissent (unités du plan) : l'étiquette descend */
    return PHONE_PIS_H + Math.max(0, 8.4 / phoneUnit() - 9.8);
};
/* les rayons des anneaux de la Piscine suivent la largeur d'écran (rayons fixes en pixels) */
function rescalePhonePis() {
    systems.forEach((S, i) => {
        if (!S.phonePis) return;
        const k = phoneUnit();
        S.orbits.forEach((o, n) => {
            const rx = PHONE_RINGS_PX[n] * k;
            o.setAttribute('rx', rx.toFixed(2));
            o.setAttribute('ry', (rx * S.tilt).toFixed(2));
        });
        planets.forEach(pl => { if (pl.si === i) pl.r = PHONE_RINGS_PX[pl.ring] * k; });
        S.rmax = PHONE_RINGS_PX[2] * k;
    });
}
const overviewCamSys = () => {
    const { w, h } = sysDims();
    return { cx: w / 2, cy: h / 2, w };
};
function setSysHeight(focus, i) {
    const W = sysSvg.clientWidth, { w, h } = sysDims();
    sysSvg.style.height = sysSvg.clientHeight + 'px';
    sysSvg.style.aspectRatio = '';
    void sysSvg.offsetHeight;
    const zoomed = narrow.matches ? phoneHeight(i) : 520;
    sysSvg.style.height = (focus ? zoomed : W * h / w) + 'px';
}
function setTilt(S, t) {
    S.tilt = t;
    S.orbits.forEach(o => o.setAttribute('ry', (o.getAttribute('rx') * t).toFixed(2)));
    planets.forEach(pl => systems[pl.si] === S && placePlanet(pl));
}
async function zoomTo(i, instant = false) {
    if (zoomSys >= 0 || zMoving) return;
    zoomSys = i; zMoving = true; scam.instant = instant;
    const s = SYS[i], S = systems[i], t0 = S.tilt, mine = planets.filter(pl => pl.si === i);
    systems.forEach((x, k) => {
        x.g.classList.toggle('on', k === i);
        x.g.classList.toggle('dim', k !== i);
    });
    sysSvg.classList.add('zoomed');
    sysSvg.classList.toggle('bleed', S.phonePis);
    sysLayout.classList.add('zfocus');
    $('sysHeadTitle').textContent = TEXT.systemOf.replace('{name}', s.name);
    $('sysHeadCount').textContent = TEXT.count.replace('{n}', mine.length);
    setRich(introEl, s.intro);
    filterList();
    setSysHeight(true, i);
    if (instant) sysSvg.style.transition = 'none';
    if (narrow.matches) {
        const top = sysLayout.getBoundingClientRect().top + scrollY - 8;
        scrollTo({ top, behavior: reduce() || instant ? 'auto' : 'smooth' });
    }
    /* les planètes dérivent vers un espacement régulier puis partagent une vitesse */
    const base = mine[0].a;
    const shift = mine.map(pl => {
        const dl = ((base + pl.rel - pl.a) % TAU + TAU) % TAU;
        return dl > Math.PI ? dl - TAU : dl;
    });
    let prev = 0;
    await scam.tween(() => focusCamSys(i), 1000, e => {
        mine.forEach((pl, k) => { pl.a += shift[k] * (e - prev); });
        prev = e;
        setTilt(S, lerp(t0, tiltFocus(i), e));
    });
    zMoving = false; scam.instant = false;
    sysSvg.style.transition = '';
}
async function exitZoom() {
    if (zoomSys < 0 || zMoving) return;
    const S = systems[zoomSys], t0 = S.tilt;
    zMoving = true;
    sysLayout.classList.remove('zfocus');
    systems.forEach(x => x.g.classList.remove('on', 'dim'));
    setSysHeight(false, zoomSys);
    await scam.tween(overviewCamSys, 900, e => setTilt(S, lerp(t0, TILT, e)));
    zoomSys = -1; zMoving = false;
    filterList();
    sysSvg.classList.remove('zoomed', 'bleed');
    sysSvg.style.height = '';
    const { w, h } = sysDims();
    sysSvg.style.aspectRatio = `${w} / ${h}`;
    S.g.querySelector('.sun-btn').focus({ preventScroll: true });
}
$('sysBack').addEventListener('click', exitZoom);
new ResizeObserver(() => {
    rescalePhonePis();
    if (scam.raf || zMoving) return;
    if (zoomSys >= 0 && narrow.matches) {
        sysSvg.style.height = phoneHeight(zoomSys) + 'px';
    }
    scam.set(zoomSys >= 0 ? focusCamSys(zoomSys) : overviewCamSys());
}).observe(sysSvg);

/* Piscine sur téléphone : le toucher choisit la planète au centre le plus proche du point
   touché, parmi celles à moins de 22 px (zones de 44 px qui peuvent se chevaucher) ; à
   défaut, la planète dont l'étiquette est touchée */
function nearestPlanet(x, y) {
    let best = null, bestD = HIT_R;
    for (const pl of planets) {
        if (pl.si !== zoomSys || !pl.below) continue;
        const [cx, cy] = centre(pl.g.querySelector('.pl-body').getBoundingClientRect());
        const d = Math.hypot(cx - x, cy - y);
        if (d < bestD) { bestD = d; best = pl; }
    }
    if (best) return best;
    return planets.find(pl => {
        if (pl.si !== zoomSys || !pl.below) return false;
        const b = pl.lg.querySelector('.pl-bg').getBoundingClientRect();
        return x >= b.left && x <= b.right && y >= b.top && y <= b.bottom;
    }) || null;
}
sysSvg.addEventListener('click', e => {
    if (zoomSys < 0 || !systems[zoomSys].phonePis || e.target.closest('.planet')) return;
    const pl = nearestPlanet(e.clientX, e.clientY);
    pl && openSheet(pl.p, SYS[pl.si], pl.g);
});

/* fiche d'un projet, partagée par les planètes et la liste */
const sheet = $('sheet'), sheetBg = $('sheetBg');
function openSheet(p, s, from) {
    opener = from;
    $('sCat').textContent = TEXT.systemOf.replace('{name}', s.name);
    setRich($('sTitle'), p.title);
    $('sTags').replaceChildren(...p.tags.map(t => {
        const li = document.createElement('li');
        li.textContent = t;
        return li;
    }));
    const body = $('sBody'), lead = document.createElement('p');
    body.replaceChildren(lead);
    setRich(lead, p.summary);
    p.blocks.forEach(b => {
        if (b.type === 'text') {
            const para = document.createElement('p');
            setRich(para, b.html);
            body.append(para);
        } else if (b.type === 'list') {
            const ul = document.createElement('ul');
            b.items.forEach(it => {
                const li = document.createElement('li');
                setRich(li, it);
                ul.append(li);
            });
            body.append(ul);
        }
    });
    sheet.classList.add('open');
    sheetBg.classList.add('open');
    sheet.scrollTop = 0;
    $('close').focus();
}
function closeSheet() {
    if (!sheet.classList.contains('open')) return;
    sheet.classList.remove('open');
    sheetBg.classList.remove('open');
    opener && opener.isConnected && opener.focus();
}
$('close').onclick = closeSheet;
sheetBg.onclick = closeSheet;
addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (sheet.classList.contains('open')) closeSheet(); else exitZoom();
});

/* mesure du zoom : distances entre planètes et étiquettes, sur un tour complet */
const centre = r => [r.x + r.width / 2, r.y + r.height / 2];
const overlap = (a, b) =>
    Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1
    && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
function measureZoom(steps = 72) {
    const mine = planets.filter(pl => pl.si === zoomSys);
    const frame = sysSvg.getBoundingClientRect();
    const saved = mine.map(pl => pl.a), base = saved[0] - mine[0].rel;
    const res = { planets: mine.length, minDist: Infinity, worstPairs: 0, worstOut: 0 };
    let close44 = 0;
    let phasesWithOverlap = 0, labelOnBody = 0;
    for (let s = 0; s < steps; s++) {
        mine.forEach(pl => { pl.a = base + pl.rel + s * TAU / steps; placePlanet(pl); });
        const bodies = mine.map(pl => pl.g.querySelector('.pl-body').getBoundingClientRect());
        const labels = mine.map(pl => pl.lg.querySelector('.pl-bg').getBoundingClientRect());
        let pairs = 0, out = 0, onBody = 0, close = 0;
        mine.forEach((_, i) => {
            const ci = centre(bodies[i]);
            const l = labels[i];
            if (l.left < frame.left - 1 || l.right > frame.right + 1) out++;
            else if (l.top < frame.top - 1 || l.bottom > frame.bottom + 1) out++;
            for (let k = i + 1; k < mine.length; k++) {
                const ck = centre(bodies[k]);
                const dist = Math.hypot(ci[0] - ck[0], ci[1] - ck[1]);
                res.minDist = Math.min(res.minDist, dist);
                if (dist < 2 * HIT_R) close++;
                if (overlap(l, labels[k])) pairs++;
            }
            for (let k = 0; k < mine.length; k++) {
                if (k !== i && overlap(l, bodies[k])) onBody++;
            }
        });
        close44 = Math.max(close44, close);
        res.worstPairs = Math.max(res.worstPairs, pairs);
        res.worstOut = Math.max(res.worstOut, out);
        labelOnBody = Math.max(labelOnBody, onBody);
        if (pairs) phasesWithOverlap++;
    }
    mine.forEach((pl, k) => { pl.a = saved[k]; placePlanet(pl); });
    res.minDist = Math.round(res.minDist * 10) / 10;
    res.labelOnBody = labelOnBody;
    res.pairsUnder44 = close44;
    res.overlapShare = Math.round(100 * phasesWithOverlap / steps);
    return res;
}
window.s6Measure = measureZoom;

/* introduction : sous le plan, sur toute la largeur de la rubrique, visible système zoomé */
function placeIntro() {
    introEl = document.createElement('p');
    introEl.className = 'sys-intro';
    const block = document.createElement('div');
    block.className = 'intro-c';
    block.append(introEl);
    sysLayout.after(block);
}

/* comparaison : montre une planète comme si elle était touchée (étiquette et lueur) */
function peekPlanet(id) {
    const pl = planets.find(x => x.p.id === id);
    if (!pl) return;
    pl.g.classList.add('peek');
    systems[pl.si].g.append(pl.g);
}
/* comparaison : sur téléphone, amène un système au repos en haut de la fenêtre */
function scrollToSystem(id) {
    const i = SYS.findIndex(s => s.id === id);
    if (i < 0 || !narrow.matches || zoomSys >= 0) return;
    const box = sysSvg.getBoundingClientRect(), { h } = sysDims();
    scrollTo({ top: scrollY + box.top + SYS_ROW * i / h * box.height - 8, behavior: 'auto' });
}

async function init() {
    const res = await fetch('../../../data/fr.json');
    const data = (await res.json()).projects;
    TEXT = data;
    SYS = data.systems.map(s => ({ ...s, ...TINTS[s.id] }));
    $('pTitle').textContent = data.title;
    $('pLede').textContent = data.lede;
    $('sysBack').replaceChildren();
    const arrow = document.createElement('span');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '←';
    $('sysBack').append(arrow, data.back);
    sysSvg.setAttribute('aria-label', data.title);
    placeIntro();
    const fonts = [
        '500 12.5px "IBM Plex Sans"', '400 15px Michroma', '400 12px "IBM Plex Mono"',
    ];
    const loading = Promise.all(fonts.map(f => document.fonts.load(f))).catch(() => 0);
    await Promise.race([loading, new Promise(r => setTimeout(r, 3000))]);
    buildList();
    buildSystems();
    narrow.addEventListener('change', () => { buildSystems(); filterList(); });
    rescalePhonePis();
    const wanted = SYS.findIndex(s => s.id === OPT.get('zoom'));
    if (wanted >= 0) await zoomTo(wanted, true);
    peekPlanet(OPT.get('peek'));
    scrollToSystem(OPT.get('scrollto'));
    if (OPT.has('measure')) {
        const out = document.createElement('pre');
        out.id = 'measure';
        out.style.cssText = 'position:fixed;left:0;bottom:0;margin:0;font-size:10px';
        out.textContent = JSON.stringify(measureZoom());
        document.body.append(out);
    }
    document.body.dataset.ready = '1';
}
init();
