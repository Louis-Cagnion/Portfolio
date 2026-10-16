/* Maquette S8 : outils communs (options d'URL, texte riche, caméra, animation).
   Options d'URL : lang=fr|en, devpedia=d1..d4, related=r1, r2, r2a, r2b, r2c, r3,
   plunge=p1..p3, focus=<id constellation>,
   star=<id étoile ou longest>, view=<skills|projects>, fonts=web (polices du site, réseau).
   Scripts classiques (pas de modules) : la page s'ouvre aussi par file://. */
const NS = 'http://www.w3.org/2000/svg';
const OPT = new URLSearchParams(location.search);
const pick = (key, list, fallback) => list.includes(OPT.get(key)) ? OPT.get(key) : fallback;
const LANG = pick('lang', ['fr', 'en'], 'fr');
const DEVPEDIA = pick('devpedia', ['d1', 'd2', 'd3', 'd4'], '');
const RELATED = pick('related', ['r1', 'r2', 'r2a', 'r2b', 'r2c', 'r3'], 'r3');
const PLUNGE = pick('plunge', ['p1', 'p2', 'p3'], 'p1');
const motion = { instant: false };
const narrow = matchMedia('(max-width: 880px)');
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const lerp = (a, b, t) => a + (b - a) * t;
const ease = k => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const $ = id => document.getElementById(id);
const scrollMode = () => reduce() || motion.instant ? 'auto' : 'smooth';
document.documentElement.lang = LANG;

function mk(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    parent && parent.append(e);
    return e;
}
function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text) e.textContent = text;
    return e;
}
/* nœuds SVG construits depuis un fragment de balisage, sans innerHTML */
function fragmentFrom(markup) {
    const doc = new DOMParser().parseFromString(
        `<svg xmlns="${NS}">${markup}</svg>`,
        'image/svg+xml',
    );
    return [...doc.documentElement.childNodes].map(n => document.importNode(n, true));
}

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
function setRich(target, html) {
    target.replaceChildren();
    appendRich(target, new DOMParser().parseFromString(html, 'text/html').body);
}
const plainTitle = t => t.replace(/<[^>]+>/g, '');

/* caméra : anime le viewBox d'un SVG (centre et largeur), la hauteur suit le ratio */
function makeCamera(svg) {
    const c = { cx: 0, cy: 0, w: 1, raf: 0, pending: null };
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
    c.set = t => {
        settle();
        Object.assign(c, t);
        c.apply();
    };
    c.tween = (target, dur, onFrame) => {
        settle();
        const from = { cx: c.cx, cy: c.cy, w: c.w }, t0 = performance.now();
        const d = reduce() || motion.instant ? 0 : dur;
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
function animate(dur, frame) {
    return new Promise(res => {
        const t0 = performance.now(), d = reduce() || motion.instant ? 0 : dur;
        (function f(now) {
            const k = d ? Math.min(1, (now - t0) / d) : 1;
            frame(k);
            if (k < 1) requestAnimationFrame(f); else res();
        })(t0);
    });
}

/* polices du site : chargées seulement sur demande (fonts=web), la page reste sans réseau */
function loadWebFonts() {
    if (OPT.get('fonts') !== 'web') return;
    const link = el('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Michroma&family=IBM+Plex+Sans'
        + ':wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap';
    document.head.append(link);
}
loadWebFonts();
