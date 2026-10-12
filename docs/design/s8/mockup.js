/* Maquette S8 : amorçage. Charge data/<lang>.json, remplit les deux rubriques, place le
   lien Devpedia, puis rejoue l'état demandé par l'URL sans animation (focus=, star=). */
function buildBars(data) {
    $('brand').textContent = data.meta.title;
    ['skills', 'projects'].forEach(key => {
        [$('nav'), $('tabbar')].forEach(bar => {
            const b = el('button', '', data.ui.nav[key]);
            b.type = 'button';
            b.dataset.view = key;
            b.addEventListener('click', () => showView(key));
            bar.append(b);
        });
    });
}
/* constellation et étoile demandées par l'URL ; star=longest : nom le plus long */
function wantedState() {
    const wanted = OPT.get('star');
    if (wanted === 'longest') {
        const best = longestStar();
        return { ci: best.ci, id: best.id };
    }
    const ci = CATS.findIndex(c => c.id === OPT.get('focus'));
    return { ci, id: wanted };
}
async function restoreState() {
    const { ci, id } = wantedState();
    if (ci < 0) return;
    document.documentElement.dataset.instant = '';
    motion.instant = true;
    await enterFocus(ci);
    const j = geo[ci].stars.findIndex(s => s.it.id === id);
    if (j > 0) await goStar(j);
    motion.instant = false;
    await new Promise(res => requestAnimationFrame(res));
    delete document.documentElement.dataset.instant;
}
async function init() {
    const data = await (await fetch(`../../../data/${LANG}.json`)).json();
    buildBars(data);
    fillSkills(data);
    fillProjects(data);
    buildSystems();
    narrow.addEventListener('change', buildSystems);
    placeDevpedia(data.skills.link);
    showView(pick('view', ['skills', 'projects'], 'skills'));
    views.skills.classList.remove('enter');
    await restoreState();
    if (OPT.get('scrollto') === 'legend') {
        $('legend').scrollIntoView({ block: 'center', behavior: 'auto' });
    }
    document.body.dataset.ready = '1';
}
init();
