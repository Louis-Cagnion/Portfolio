/* Maquette S8 : rubrique Projets simplifiée, reconnaissable : quatre systèmes (soleil,
   orbites, planètes), zoom sur un système, fiche. Mécanique réduite de docs/design/s6/ :
   planètes fixes, une seule disposition pour le bureau et le téléphone. */
const sysSvg = $('systems'), sysLayout = $('sysLayout'), scam = makeCamera(sysSvg);
let PR = null, SYS = [], systems = [], planets = [], zoomSys = -1, zMoving = false;
const TINTS = {
    pro: { sun: ['#fff6da', '#e8b45a'], planet: ['#ffd88f', '#b9822f'] },
    perso: { sun: ['#f3e1ff', '#a46bd8'], planet: ['#e3c3ff', '#7a45b0'] },
    school: { sun: ['#dcfff8', '#4fd1c5'], planet: ['#b8f5ec', '#25857c'] },
    piscine: { sun: ['#e2f0ff', '#4f8cff'], planet: ['#bcd8ff', '#2f62c9'] },
};
const TAU = 2 * Math.PI, TILT = 0.5, SYS_ROW = 270, DESK_W = 1100, PHONE_W = 360;
const PIS_COUNTS = [2, 4, 4, 5, 5];
const PIS_RADII = [43, 75, 107, 139, 170];
const FEW_RADII = [60, 100, 140];

function geometry() {
    const n = SYS.length;
    if (narrow.matches) {
        const cells = SYS.map((_, i) => ({ x: 0, y: SYS_ROW * i, w: PHONE_W }));
        return { w: PHONE_W, h: SYS_ROW * n, cells };
    }
    const half = DESK_W / 2;
    const cells = SYS.map((_, k) => ({
        x: half * (k % 2), y: SYS_ROW * Math.floor(k / 2), w: half,
    }));
    return { w: DESK_W, h: SYS_ROW * 2, cells };
}
const sysDims = () => {
    const g = geometry();
    return { w: g.w, h: g.h };
};
const overviewCamSys = () => {
    const { w, h } = sysDims();
    return { cx: w / 2, cy: h / 2, w };
};
function focusCamSys(i) {
    const S = systems[i], h = 2 * (S.rmax * TILT * 1.2 + 46);
    return { cx: S.cx, cy: S.cy, w: Math.max(h / scam.ratio(), 2 * S.rmax + 80) };
}
/* hauteur du plan zoomé : 520 px au bureau, 1,25 fois la largeur sur téléphone */
function setSysHeight(focus) {
    const W = sysSvg.clientWidth, { w, h } = sysDims();
    sysSvg.style.height = sysSvg.clientHeight + 'px';
    void sysSvg.offsetHeight;
    const zoomed = narrow.matches ? W * 1.25 : 520;
    sysSvg.style.height = (focus ? zoomed : W * h / w) + 'px';
}
function placePlanet(pl) {
    const S = systems[pl.si];
    const x = S.cx + pl.r * Math.cos(pl.a), y = S.cy + pl.r * TILT * Math.sin(pl.a);
    pl.g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    pl.g.style.opacity = Math.sin(pl.a) < 0 ? 0.75 : 1;
    const u = parseFloat(sysSvg.style.getPropertyValue('--u')) || 1;
    const dx = (pl.size + 6 * u).toFixed(1), dy = (-pl.lh * u / 2).toFixed(1);
    pl.lg.setAttribute('transform', `translate(${dx} ${dy}) scale(${u})`);
}
function labelSize(title) {
    labelSize.ctx = labelSize.ctx || document.createElement('canvas').getContext('2d');
    const ctx = labelSize.ctx;
    if (!ctx) return 8 * title.length + 16;
    ctx.font = '500 12.5px "IBM Plex Sans", system-ui, sans-serif';
    return ctx.measureText(title).width + 16;
}
function buildPlanet(p, j, s, i, slot, sysG) {
    const title = plainTitle(p.title), size = 7 + Math.min(6, p.blocks.length * 1.4);
    const g = mk('g', {
        class: 'planet', tabindex: -1, role: 'button', 'aria-label': title,
    }, sysG);
    mk('circle', { class: 'pl-hit', r: size + 10 }, g);
    mk('circle', { class: 'pl-body', r: size, fill: `url(#pl${i})` }, g);
    const lg = mk('g', { class: 'pl-label' }, g), lw = labelSize(title);
    mk('rect', { class: 'pl-bg', x: 0, y: 0, width: lw, height: 22, rx: 4 }, lg);
    mk('text', { class: 'pl-name', x: 8, y: 15 }, lg).textContent = title;
    const pl = { g, lg, lh: 22, size, si: i, p, r: slot.r, a: slot.a, title };
    g.addEventListener('click', () => openSheet({ p, s }, g));
    g.addEventListener('keydown', e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        openSheet({ p, s }, g);
    });
    placePlanet(pl);
    planets.push(pl);
}
function slotsFor(s, i) {
    if (s.id !== 'piscine') {
        return s.projects.map((_, j) => ({ r: FEW_RADII[j % 3], a: j * 2.4 + i }));
    }
    const slots = [];
    PIS_COUNTS.forEach((count, ring) => {
        for (let m = 0; m < count; m++) {
            slots.push({ r: PIS_RADII[ring], a: m * TAU / count + ring });
        }
    });
    return slots;
}
function buildSystems() {
    sysSvg.replaceChildren();
    planets = [];
    systems = [];
    zoomSys = -1;
    sysLayout.classList.remove('zfocus');
    sysSvg.classList.remove('zoomed');
    const geo = geometry(), { w, h } = geo, defs = mk('defs', {}, sysSvg);
    sysSvg.style.height = '';
    sysSvg.style.aspectRatio = `${w} / ${h}`;
    scam.set({ cx: w / 2, cy: h / 2, w });
    SYS.forEach((s, i) => {
        const cell = geo.cells[i], cx = cell.x + cell.w / 2, cy = cell.y + SYS_ROW / 2 - 26;
        defs.append(...fragmentFrom(tintMarkup(s, i)));
        const sysG = mk('g', { class: `sys${s.projects.length < 10 ? ' few' : ''}` }, sysSvg);
        const slots = slotsFor(s, i), rmax = Math.max(...slots.map(x => x.r));
        systems.push({ g: sysG, cx, cy, rmax });
        mk('rect', {
            class: 'sys-hit', x: cell.x, y: cell.y, width: cell.w, height: SYS_ROW,
        }, sysG);
        sysG.addEventListener('click', e => e.target.closest('.planet') || zoomTo(i));
        [...new Set(slots.map(x => x.r))].forEach(r => {
            mk('ellipse', { class: 'orbit', cx, cy, rx: r, ry: r * TILT }, sysG);
        });
        buildSun(s, i, sysG, cx, cy);
        s.projects.forEach((p, j) => buildPlanet(p, j, s, i, slots[j], sysG));
    });
}
function tintMarkup(s, i) {
    return `<radialGradient id="sun${i}">`
        + `<stop offset="0" stop-color="${s.sun[0]}"/>`
        + `<stop offset=".55" stop-color="${s.sun[1]}"/>`
        + `<stop offset="1" stop-color="${s.sun[1]}" stop-opacity="0"/></radialGradient>`
        + `<radialGradient id="pl${i}" cx=".35" cy=".3" r=".8">`
        + `<stop offset="0" stop-color="${s.planet[0]}"/>`
        + `<stop offset="1" stop-color="${s.planet[1]}"/></radialGradient>`;
}
function buildSun(s, i, sysG, cx, cy) {
    const sun = mk('g', {
        class: 'sun-btn', tabindex: 0, role: 'button',
        'aria-label': PR.approach.replace('{name}', s.name),
    }, sysG);
    mk('circle', { cx, cy, r: 44, fill: `url(#sun${i})` }, sun);
    mk('circle', { cx, cy, r: 16, fill: s.sun[0] }, sun);
    mk('text', { class: 'sun-label', x: cx, y: cy + 112 }, sun).textContent = s.name;
    const count = PR.count.replace('{n}', s.projects.length);
    mk('text', { class: 'sun-sub', x: cx, y: cy + 132 }, sun).textContent = count;
    sun.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            zoomTo(i);
        }
    });
}
function setPlanetTabs(on) {
    planets.forEach(pl => pl.g.setAttribute('tabindex', pl.si === on ? '0' : '-1'));
}
async function zoomTo(i) {
    if (zoomSys >= 0 || zMoving) return;
    zoomSys = i;
    zMoving = true;
    const s = SYS[i];
    systems.forEach((x, k) => {
        x.g.classList.toggle('on', k === i);
        x.g.classList.toggle('dim', k !== i);
    });
    setPlanetTabs(i);
    sysSvg.classList.add('zoomed');
    sysLayout.classList.add('zfocus');
    $('sysHeadTitle').textContent = PR.systemOf.replace('{name}', s.name);
    $('sysHeadCount').textContent = PR.count.replace('{n}', s.projects.length);
    setSysHeight(true);
    if (narrow.matches) {
        const top = sysLayout.getBoundingClientRect().top + scrollY - 70;
        scrollTo({ top, behavior: scrollMode() });
    }
    await scam.tween(() => focusCamSys(i), 1000, () => planets.forEach(placePlanet));
    zMoving = false;
}
async function exitZoom() {
    if (zoomSys < 0 || zMoving) return;
    const i = zoomSys;
    zMoving = true;
    sysLayout.classList.remove('zfocus');
    systems.forEach(x => x.g.classList.remove('on', 'dim'));
    setPlanetTabs(-1);
    setSysHeight(false);
    await scam.tween(overviewCamSys, 900, () => planets.forEach(placePlanet));
    zoomSys = -1;
    zMoving = false;
    sysSvg.classList.remove('zoomed');
    sysSvg.style.height = '';
    const { w, h } = sysDims();
    sysSvg.style.aspectRatio = `${w} / ${h}`;
    systems[i].g.querySelector('.sun-btn').focus({ preventScroll: true });
}
$('sysBack').addEventListener('click', exitZoom);
new ResizeObserver(() => {
    if (scam.raf || zMoving || !sysSvg.clientWidth) return;
    if (zoomSys >= 0 && narrow.matches) sysSvg.style.height = sysSvg.clientWidth * 1.25 + 'px';
    scam.set(zoomSys >= 0 ? focusCamSys(zoomSys) : overviewCamSys());
    planets.forEach(placePlanet);
}).observe(sysSvg);

/* projet par identifiant : { p, s } avec le système qui le porte */
function projectById(id) {
    for (const s of SYS) {
        const p = s.projects.find(x => x.id === id);
        if (p) return { p, s, si: SYS.indexOf(s) };
    }
    return null;
}
const planetOf = id => planets.find(pl => pl.p.id === id) || null;
function fillProjects(data) {
    PR = data.projects;
    SYS = PR.systems.map(s => ({ ...s, ...TINTS[s.id] }));
    $('pHead').textContent = PR.title;
    $('pLede').textContent = PR.lede;
    $('sysBack').replaceChildren(el('span', '', '←'), PR.back);
    $('sysBack').firstChild.setAttribute('aria-hidden', 'true');
    sysSvg.setAttribute('aria-label', PR.title);
}
