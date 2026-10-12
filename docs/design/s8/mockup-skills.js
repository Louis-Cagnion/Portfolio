/* Maquette S8 : constellations, déploiement, plongée et retour, depuis
   docs/design/prototype/prototype.template.html (lignes 733-934), données de data/<lang>.json.
   Écarts voulus : étoiles construites sans innerHTML, graine tirée de l'id du groupe. */
const svgC = $('constSvg'), layout = $('skillsLayout'), ccam = makeCamera(svgC);
let SK = null, CATS = [], gdim = { w: 1100, h: 440 }, geo = [];
let focusCat = -1, focusStar = 0, moving = false, curBS = 0.6;
const hashId = s => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
const bsOverview = () => narrow.matches ? 0.5 : 0.6;
const bsFocus = () => narrow.matches ? 1.15 : 1.4;
function setBS(v) {
    curBS = v;
    svgC.style.setProperty('--bs', v.toFixed(3));
}
const setBodyT = t => setBS(lerp(bsOverview(), bsFocus(), t));
const ratioC = () => ccam.ratio();

/* gros plan sur un astre : il remplit la zone visible, les voisins sortent du cadre */
function astreTarget(ci, sj) {
    const s = geo[ci].stars[sj], m = narrow.matches, W = svgC.clientWidth;
    const H = svgC.clientHeight;
    const w = W / (m ? 7 : 9), h = w * ratioC(), visW = m ? W : W * 0.54;
    const bs = Math.min(visW * 0.34, H * 0.34) / BODY_R[s.lv];
    const cam = m
        ? { cx: s.ex, cy: s.ey + 0.2 * h, w }
        : { cx: s.ex + 0.22 * w, cy: s.ey, w };
    return { cam, bs };
}
/* plongée sur l'étoile sj ; avec hopFrom, recul à mi-course pour montrer le chemin */
function dive(ci, sj, hopFrom) {
    const g = geo[ci], from = { cx: ccam.cx, cy: ccam.cy, w: ccam.w }, bs0 = curBS;
    const tgt = astreTarget(ci, sj);
    let mid = null;
    if (hopFrom != null) {
        const a = g.stars[hopFrom], b = g.stars[sj];
        const dist = Math.hypot(b.ex - a.ex, b.ey - a.ey);
        mid = { w: Math.max(dist * 2.4, 160), bs: bsFocus() };
    }
    return animate(mid ? 1400 : 950, k => {
        const e = ease(k), up = ease(Math.min(1, k * 2)), down = ease(Math.max(0, k * 2 - 1));
        const w = mid
            ? (k < 0.5 ? lerp(from.w, mid.w, up) : lerp(mid.w, tgt.cam.w, down))
            : lerp(from.w, tgt.cam.w, e);
        const bs = mid
            ? (k < 0.5 ? lerp(bs0, mid.bs, up) : lerp(mid.bs, tgt.bs, down))
            : lerp(bs0, tgt.bs, e);
        ccam.set({ cx: lerp(from.cx, tgt.cam.cx, e), cy: lerp(from.cy, tgt.cam.cy, e), w });
        setBS(bs);
        layoutStars(g, 1);
    });
}
const overviewCam = () => ({
    cx: gdim.w / 2,
    cy: gdim.h / 2,
    w: Math.max(gdim.w, gdim.h / ratioC()),
});
function focusCam(ci, sj) {
    const g = geo[ci], s = g.stars[sj], m = narrow.matches;
    const w = m
        ? Math.max(g.ebw + 70, (g.ebh + 90) / ratioC(), 200)
        : Math.max(g.ebw * 0.75 + 190, (g.ebh + 140) / ratioC(), 340);
    const h = w * ratioC();
    return m ? { cx: s.ex, cy: s.ey + 0.2 * h, w } : { cx: s.ex + 0.22 * w, cy: s.ey, w };
}
/* hauteur du plan : le téléphone passe de l'aspect-ratio de la grille à 1 / 1.15 */
function setHeight(focus) {
    if (narrow.matches) {
        svgC.style.height = 'auto';
        svgC.style.aspectRatio = focus ? '1 / 1.15' : `${gdim.w} / ${gdim.h}`;
    } else {
        svgC.style.aspectRatio = '';
        svgC.style.height = focus ? '540px' : '460px';
    }
}

/* étoiles d'une constellation : spirale d'or bornée dans la cellule, triées par angle */
function placeStars(cat, cell) {
    const { x0, y0, cw, ch, cx, cy } = cell, n = cat.items.length, seed = hashId(cat.id);
    let stars = cat.items.map((it, j) => {
        const a = j * 2.39996 + (seed % 628) / 100;
        const rad = n === 1 ? 0 : 20 + 21 * Math.sqrt(j + 0.6);
        return {
            it,
            x: Math.max(x0 + 18, Math.min(x0 + cw - 18, cx + rad * Math.cos(a) * 1.25)),
            y: Math.max(y0 + 18, Math.min(y0 + ch - 54, cy + rad * Math.sin(a) * 0.9)),
        };
    });
    stars.sort((p, q) => Math.atan2(p.y - cy, p.x - cx) - Math.atan2(q.y - cy, q.x - cx));
    const first = stars.findIndex(s => s.it === cat.items[0]);
    stars = stars.slice(first).concat(stars.slice(0, first));
    const spread = narrow.matches ? 1.8 : 2.1;
    stars.forEach(s => {
        s.ex = cx + (s.x - cx) * spread;
        s.ey = cy + (s.y - cy) * spread;
    });
    return stars;
}
function buildStar(s, j, i, g) {
    const lv = Math.max(0, LEVELS.indexOf(s.it.level));
    const sg = mk('g', { class: `st-g lv${lv}` }, g);
    s.lv = lv;
    s.body = mk('g', { class: 'body' }, sg);
    mk('g', { class: 'body-in' }, s.body).append(...bodyNodes(lv));
    s.hit = mk('circle', { r: 18, fill: 'transparent' }, sg);
    s.label = mk('text', { class: 'name', 'text-anchor': 'middle' }, sg);
    s.label.textContent = s.it.name;
    sg.addEventListener('click', e => {
        if (focusCat !== i) return;
        e.stopPropagation();
        goStar(j);
    });
    s.el = sg;
}
function buildConst() {
    svgC.replaceChildren();
    geo = [];
    mk('defs', {}, svgC).append(...fragmentFrom(DEFS_MARKUP));
    setBodyT(0);
    const m = narrow.matches, cols = m ? 2 : 4, cw = m ? 170 : 275, ch = m ? 200 : 220;
    gdim = { w: cols * cw, h: Math.ceil(CATS.length / cols) * ch };
    CATS.forEach((cat, i) => {
        const x0 = (i % cols) * cw, y0 = Math.floor(i / cols) * ch;
        const cx = x0 + cw / 2, cy = y0 + ch / 2 - 14;
        const g = mk('g', {
            class: 'group', tabindex: 0, role: 'button',
            'aria-label': SK.explore.replace('{name}', cat.title),
        }, svgC);
        mk('rect', { class: 'cell', x: x0, y: y0, width: cw, height: ch }, g);
        const stars = placeStars(cat, { x0, y0, cw, ch, cx, cy });
        const links = stars.slice(1).map(() => mk('line', { class: 'link' }, g));
        stars.forEach((s, j) => buildStar(s, j, i, g));
        mk('text', { class: 'cname', x: cx, y: y0 + ch - 22 }, g).textContent = cat.short;
        const exs = stars.map(s => s.ex), eys = stars.map(s => s.ey);
        geo.push({
            g, stars, links,
            ebw: Math.max(...exs) - Math.min(...exs),
            ebh: Math.max(...eys) - Math.min(...eys),
        });
        layoutStars(geo[i], 0);
        g.addEventListener('click', () => focusCat < 0 && !moving && enterFocus(i));
        g.addEventListener('keydown', e => {
            if ((e.key !== 'Enter' && e.key !== ' ') || focusCat >= 0 || moving) return;
            e.preventDefault();
            enterFocus(i);
        });
    });
    setHeight(false);
    ccam.set(overviewCam());
}
/* t = 0 : constellation compacte (vue d'ensemble), t = 1 : étoiles écartées (déploiement) */
function layoutStars(g, t) {
    const u = parseFloat(svgC.style.getPropertyValue('--u') || 1);
    g.stars.forEach(s => {
        s.cx = lerp(s.x, s.ex, t);
        s.cy = lerp(s.y, s.ey, t);
        s.hit.setAttribute('cx', s.cx);
        s.hit.setAttribute('cy', s.cy);
        s.body.setAttribute('transform', `translate(${s.cx} ${s.cy})`);
        const off = (BODY_R[s.lv] * curBS * (s.lv === 3 ? 0.6 : 1) + 9) * u;
        s.label.setAttribute('x', s.cx);
        s.label.setAttribute('y', s.cy - off);
    });
    g.links.forEach((l, j) => {
        const a = g.stars[j], b = g.stars[j + 1];
        l.setAttribute('x1', a.cx);
        l.setAttribute('y1', a.cy);
        l.setAttribute('x2', b.cx);
        l.setAttribute('y2', b.cy);
    });
}
function renderChips() {
    const chips = $('chips');
    chips.replaceChildren();
    geo[focusCat].stars.forEach((s, j) => {
        const b = el('button', '', s.it.name);
        b.type = 'button';
        b.setAttribute('aria-pressed', String(j === focusStar));
        b.addEventListener('click', () => goStar(j));
        chips.append(b);
    });
}
function showSkill() {
    const s = geo[focusCat].stars[focusStar], it = s.it;
    $('kName').textContent = it.name;
    $('kLvl').replaceChildren(bodyIcon(s.lv), SK.levels[it.level]);
    const desc = el('p');
    setRich(desc, it.description);
    $('kDesc').replaceChildren(desc);
    renderRelated(it);
    $('kPrev').disabled = focusStar === 0;
    $('kNext').disabled = focusStar === geo[focusCat].stars.length - 1;
    geo[focusCat].stars.forEach((st, j) => st.el.classList.toggle('cur', j === focusStar));
    $('skill').classList.remove('traveling');
}
function renderRelated(it) {
    const rel = $('kRel');
    rel.replaceChildren();
    const projs = (it.projects || []).map(projectById).filter(Boolean);
    if (!projs.length) return;
    const chips = el('div', 'chips');
    projs.forEach(entry => {
        const b = el('button', '', plainTitle(entry.p.title));
        b.type = 'button';
        b.addEventListener('click', () => playRelated(entry, b));
        chips.append(b);
    });
    rel.append(el('p', '', SK.related), chips);
}
async function enterFocus(i) {
    focusCat = i;
    focusStar = 0;
    moving = true;
    geo.forEach((g, k) => {
        g.g.classList.toggle('sel', k === i);
        g.g.classList.toggle('dim', k !== i);
    });
    svgC.classList.add('focused');
    layout.classList.add('focus');
    $('cTitle').textContent = CATS[i].title;
    $('skill').classList.add('traveling');
    renderChips();
    setHeight(true);
    if (narrow.matches) {
        const bar = parseFloat(getComputedStyle(document.documentElement)
            .getPropertyValue('--bar-h'));
        const top = svgC.getBoundingClientRect().top + scrollY - bar - 8;
        scrollTo({ top, behavior: scrollMode() });
    }
    await ccam.tween(() => focusCam(i, 0), 1000, e => {
        setBodyT(e);
        layoutStars(geo[i], e);
    });
    setBodyT(1);
    layoutStars(geo[i], 1);
    if (focusCat !== i) return;
    await dive(i, 0, null);
    moving = false;
    showSkill();
}
async function goStar(j) {
    if (focusCat < 0 || j < 0 || j >= geo[focusCat].stars.length) return;
    if (j === focusStar || moving) return;
    const g = geo[focusCat], from = focusStar;
    const link = Math.abs(j - from) === 1 ? g.links[Math.min(j, from)] : null;
    moving = true;
    focusStar = j;
    renderChips();
    $('skill').classList.add('traveling');
    g.links.forEach(l => l.classList.remove('walk'));
    if (link) link.classList.add('walk');
    await dive(focusCat, j, from);
    moving = false;
    showSkill();
}
/* moving reste posé pendant le recul : le changement de hauteur ferait sinon revenir
   la caméra à la vue d'ensemble en plein vol */
async function exitFocus() {
    if (focusCat < 0 || moving) return;
    const i = focusCat, g = geo[i];
    focusCat = -1;
    moving = true;
    layout.classList.remove('focus');
    svgC.classList.remove('focused');
    geo.forEach(x => {
        x.g.classList.remove('sel', 'dim');
        x.links.forEach(l => l.classList.remove('walk'));
        x.stars.forEach(s => s.el.classList.remove('cur'));
    });
    setHeight(false);
    const from = { cx: ccam.cx, cy: ccam.cy, w: ccam.w }, bs0 = curBS;
    await animate(1200, k => {
        const e = ease(k), to = overviewCam();
        ccam.set({
            cx: lerp(from.cx, to.cx, e),
            cy: lerp(from.cy, to.cy, e),
            w: lerp(from.w, to.w, e),
        });
        setBS(lerp(bs0, bsOverview(), e));
        layoutStars(g, 1 - e);
    });
    moving = false;
    ccam.set(overviewCam());
    setBodyT(0);
    layoutStars(g, 0);
    g.g.focus({ preventScroll: true });
}
function recentre() {
    if (ccam.raf || moving || !svgC.clientWidth) return;
    if (focusCat < 0) {
        ccam.set(overviewCam());
        return;
    }
    const t = astreTarget(focusCat, focusStar);
    ccam.set(t.cam);
    setBS(t.bs);
    layoutStars(geo[focusCat], 1);
}
new ResizeObserver(recentre).observe(svgC);
$('back').addEventListener('click', exitFocus);
$('kPrev').addEventListener('click', () => goStar(focusStar - 1));
$('kNext').addEventListener('click', () => goStar(focusStar + 1));

/* légende : une entrée par niveau, « astre : niveau » depuis skills.bodies et skills.levels */
const LEGEND_FORMAT = { fr: '{body} : {level}', en: '{body}: {level}' };
function legendLabel(key) {
    return LEGEND_FORMAT[LANG]
        .replace('{body}', SK.bodies[key])
        .replace('{level}', SK.levels[key].toLocaleLowerCase(LANG));
}
function buildLegend() {
    const legend = $('legend');
    legend.replaceChildren(el('span', '', SK.legend));
    [...LEVELS].reverse().forEach(key => {
        const mag = el('span', 'mag');
        mag.append(bodyIcon(LEVELS.indexOf(key)), legendLabel(key));
        legend.append(mag);
    });
}
/* étoile au nom le plus long, toutes constellations confondues */
function longestStar() {
    let best = null;
    CATS.forEach((cat, ci) => cat.items.forEach(it => {
        if (best && it.name.length <= best.name.length) return;
        best = { ci, id: it.id, name: it.name };
    }));
    return best;
}
function fillSkills(data) {
    SK = data.skills;
    CATS = SK.groups;
    $('sTitle2').textContent = SK.title;
    $('sLede').textContent = SK.lede;
    $('hint').textContent = SK.hint;
    $('back').replaceChildren(el('span', '', '←'), SK.back);
    $('back').firstChild.setAttribute('aria-hidden', 'true');
    $('chips').setAttribute('aria-label', SK.chipsLabel);
    $('kPrev').setAttribute('aria-label', SK.prev);
    $('kNext').setAttribute('aria-label', SK.next);
    svgC.setAttribute('aria-label', SK.title);
    buildLegend();
    buildConst();
    narrow.addEventListener('change', () => {
        focusCat = -1;
        layout.classList.remove('focus');
        svgC.classList.remove('focused');
        buildConst();
    });
}
