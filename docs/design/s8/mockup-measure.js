/* Maquette S8 : mesures du constat téléphone (feuille S8.A1 (c)), appelées par un script
   de vérification : window.s8Measure.names(), .panel(), .jump(). Rien ne s'exécute seul. */
const rectOf = n => n.getBoundingClientRect();
const overlapArea = (a, b) => {
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return w > 0 && h > 0 ? w * h : 0;
};
const round = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

/* noms d'étoiles qui se chevauchent (visibles ensemble au survol ou une fois déployé) */
function measureNames() {
    const frame = rectOf(svgC), out = { groups: [], pairs: 0, outOfFrame: 0, outOfCell: 0 };
    geo.forEach((g, ci) => {
        const labels = g.stars.map(s => rectOf(s.label));
        const cell = rectOf(g.g.querySelector('.cell'));
        const cname = rectOf(g.g.querySelector('.cname'));
        let pairs = 0, outCell = 0, onCname = 0;
        labels.forEach((a, i) => {
            for (let k = i + 1; k < labels.length; k++) pairs += overlapArea(a, labels[k]) > 4;
            if (a.left < cell.left - 1 || a.right > cell.right + 1) outCell++;
            if (overlapArea(a, cname) > 4) onCname++;
            if (a.left < frame.left - 1 || a.right > frame.right + 1) out.outOfFrame++;
        });
        out.pairs += pairs;
        out.outOfCell += outCell;
        out.groups.push({ id: CATS[ci].id, stars: labels.length, pairs, outCell, onCname });
    });
    out.withOverlap = out.groups.filter(g => g.pairs > 0).map(g => g.id);
    const widths = geo.flatMap(g => g.stars.map(s => rectOf(s.label).width));
    out.maxNameWidth = round(Math.max(...widths));
    return out;
}
/* groupe déployé : tous les noms visibles ensemble, pris dans la constellation choisie */
function measureSelected() {
    const g = geo[focusCat], labels = g.stars.map(s => rectOf(s.label));
    const frame = rectOf(svgC), pr = rectOf($('focusPanel'));
    let pairs = 0, outFrame = 0, underPanel = 0;
    labels.forEach((a, i) => {
        for (let k = i + 1; k < labels.length; k++) pairs += overlapArea(a, labels[k]) > 4;
        if (a.left < frame.left - 1 || a.right > frame.right + 1) outFrame++;
        if (a.top < frame.top - 1 || a.bottom > frame.bottom + 1) outFrame++;
        if (overlapArea(a, pr) > 4) underPanel++;
    });
    return { group: CATS[focusCat].id, stars: labels.length, pairs, outFrame, underPanel };
}
/* panneau contre astre : part de l'astre courant et de son nom masquée par le panneau */
function measurePanel() {
    const s = geo[focusCat].stars[focusStar], pr = rectOf($('focusPanel'));
    const body = rectOf(s.body.querySelector('.body-in')), label = rectOf(s.label);
    const frame = rectOf(svgC), bar = rectOf(document.querySelector('.bar'));
    const share = r => round(100 * overlapArea(r, pr) / (r.width * r.height || 1));
    const share2 = (r, area) => 100 * overlapArea(r, area) / (r.width * r.height || 1);
    return {
        star: s.it.id, level: s.it.level,
        bodyBox: [round(body.width), round(body.height)],
        panelTop: round(pr.top), panelHeight: round(pr.height),
        bodyBottom: round(body.bottom), frameTop: round(frame.top),
        frameBottom: round(frame.bottom), barBottom: round(bar.bottom),
        bodyCoveredPct: share(body), nameCoveredPct: share(label),
        nameBox: [round(label.width), round(label.height)],
        nameTop: round(label.top), nameBottom: round(label.bottom),
        nameOutsideFramePct: round(100 - share2(label, frame)),
        nameCoveredByBarPct: round(share2(label, bar)),
        bodyOutsideFramePct: round(100 - share2(body, frame)),
        viewport: [innerWidth, innerHeight],
    };
}
/* échantillonne une lecture à chaque image pendant qu'une promesse se résout */
async function sampleDuring(promise, read) {
    const samples = [read()];
    let on = true;
    (function tick() {
        if (!on) return;
        samples.push(read());
        requestAnimationFrame(tick);
    })();
    await promise;
    on = false;
    samples.push(read());
    return samples;
}
const readPlan = () => ({
    h: rectOf(svgC).height,
    legendTop: rectOf($('legend')).top + scrollY,
    docH: document.documentElement.scrollHeight,
    scroll: scrollY,
});
function stepsOf(samples, key) {
    let max = 0, at = 0;
    for (let i = 1; i < samples.length; i++) {
        const d = Math.abs(samples[i][key] - samples[i - 1][key]);
        if (d > max) {
            max = d;
            at = i;
        }
    }
    const from = round(samples[0][key]), to = round(samples.at(-1)[key]);
    return { from, to, maxStep: round(max), at };
}
const summary = samples => ({
    frames: samples.length,
    plan: stepsOf(samples, 'h'),
    legend: stepsOf(samples, 'legendTop'),
    doc: stepsOf(samples, 'docH'),
});
/* saut de hauteur du plan à l'entrée (déploiement et plongée) puis à la sortie : la
   lecture « avant » précède l'appel, qui change la hauteur dès son premier instant */
async function measureJump() {
    const wasInstant = motion.instant;
    motion.instant = false;
    const before = readPlan();
    const enter = await sampleDuring(enterFocus(0), readPlan);
    enter.unshift(before);
    const mid = readPlan();
    const exit = await sampleDuring(exitFocus(), readPlan);
    exit.unshift(mid);
    motion.instant = wasInstant;
    return { enter: summary(enter), exit: summary(exit) };
}
/* les 31 étoiles tour à tour : astre ou nom masqué par le panneau, la barre ou le cadre */
async function measureAll() {
    const wasInstant = motion.instant;
    motion.instant = true;
    const rows = [];
    for (let ci = 0; ci < CATS.length; ci++) {
        await enterFocus(ci);
        rows.push(measurePanel());
        for (let j = 1; j < geo[ci].stars.length; j++) {
            await goStar(j);
            rows.push(measurePanel());
        }
        await exitFocus();
    }
    motion.instant = wasInstant;
    const count = test => rows.filter(test).length;
    return {
        stars: rows.length,
        bodyCovered: count(r => r.bodyCoveredPct > 0),
        maxBodyCoveredPct: Math.max(...rows.map(r => r.bodyCoveredPct)),
        nameCovered: count(r => r.nameCoveredPct > 0),
        nameOutsideFrame: count(r => r.nameOutsideFramePct > 0),
        nameUnderBar: count(r => r.nameCoveredByBarPct > 0),
        bodyOutsideFrame: count(r => r.bodyOutsideFramePct > 1),
        names: rows.filter(r => r.nameOutsideFramePct > 0 || r.nameCoveredPct > 0)
            .map(r => r.star),
    };
}
window.s8Measure = {
    names: measureNames,
    selected: measureSelected,
    panel: measurePanel,
    jump: measureJump,
    all: measureAll,
};
