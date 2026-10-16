/* Maquette S8 : changement de rubrique, fiche d'un projet, parcours des projets liés
   (R1, R2, R3) et emplacements du lien Devpedia (D1 à D4). */
const wait = ms => new Promise(res => setTimeout(res, motion.instant || reduce() ? 0 : ms));
const views = { skills: $('skills'), projects: $('projects') };

function showView(name) {
    Object.entries(views).forEach(([key, node]) => {
        const on = key === name;
        node.classList.toggle('on', on);
        node.classList.toggle('enter', on);
    });
    document.querySelectorAll('[data-view]').forEach(b => {
        if (b.dataset.view === name) b.setAttribute('aria-current', 'page');
        else b.removeAttribute('aria-current');
    });
    scrollTo({ top: 0, behavior: 'auto' });
}

/* fiche d'un projet, partagée par les planètes et les puces « Projets liés » */
const sheet = $('sheet'), sheetBg = $('sheetBg');
let sheetOrigin = null;
function openSheet(entry, origin) {
    const { p, s } = entry;
    sheetOrigin = { node: origin, id: p.id };
    $('sCat').textContent = PR.systemOf.replace('{name}', s.name);
    setRich($('sTitle'), p.title);
    $('sTags').replaceChildren(...p.tags.map(t => el('li', '', t)));
    const body = $('sBody'), lead = el('p');
    body.replaceChildren(lead);
    setRich(lead, p.summary);
    p.blocks.forEach(b => {
        if (b.type === 'text') {
            const para = el('p');
            setRich(para, b.html);
            body.append(para);
        } else if (b.type === 'list') {
            const ul = el('ul');
            b.items.forEach(it => {
                const li = el('li');
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
const canFocus = n => !!n && n.isConnected && !!n.closest('.view.on')
    && n.getAttribute('tabindex') !== '-1' && getComputedStyle(n).visibility !== 'hidden';
/* focus rendu à l'élément d'origine, sinon à la planète du même projet, sinon au h2 */
function closeSheet() {
    if (!sheet.classList.contains('open')) return;
    sheet.classList.remove('open');
    sheetBg.classList.remove('open');
    const planet = sheetOrigin && planetOf(sheetOrigin.id);
    const target = [sheetOrigin && sheetOrigin.node, planet && planet.g].find(canFocus);
    (target || views.projects.querySelector('h2')).focus({ preventScroll: true });
    backToSystem();
    if (!target && !views.projects.classList.contains('on')) {
        views.skills.querySelector('h2').focus({ preventScroll: true });
    }
}
$('close').addEventListener('click', closeSheet);
sheetBg.addEventListener('click', closeSheet);
addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (sheet.classList.contains('open')) closeSheet();
    else if (views.projects.classList.contains('on')) exitZoom();
    else exitFocus();
});

/* parcours d'une puce « Projets liés » : R1 saut puis fiche, R2 saut, système zoomé puis
   fiche, R3 fiche sur place au-dessus de Compétences */
async function playRelated(entry, chip) {
    if (RELATED === 'r3') {
        openSheet(entry, chip);
        return;
    }
    showView('projects');
    await wait(750);
    if (RELATED !== 'r1') await playSystem(entry);
    openSheet(entry, chip);
}
/* R2 et ses lectures : R2a deux temps (système puis planète), R2b un seul mouvement
   jusqu'à la planète, R2c et R2 système zoomé seulement. Retour de caméra à la fermeture
   de la fiche pour R2a et R2b : le zoom reste sur le système, le focus va à la planète. */
async function playSystem(entry) {
    if (zoomSys >= 0 && zoomSys !== entry.si) await exitZoom();
    const pl = planetOf(entry.p.id);
    pl.g.classList.add('peek');
    const toPlanet = () => planetCam(pl);
    if (RELATED === 'r2b' && zoomSys < 0) await zoomTo(entry.si, toPlanet);
    else {
        if (zoomSys < 0) await zoomTo(entry.si);
        if (RELATED === 'r2a' || RELATED === 'r2b') {
            await scam.tween(toPlanet, 900, () => planets.forEach(placePlanet));
        }
    }
    cameraOnPlanet = RELATED === 'r2a' || RELATED === 'r2b';
}
let cameraOnPlanet = false;
function backToSystem() {
    if (!cameraOnPlanet || zoomSys < 0) return;
    cameraOnPlanet = false;
    scam.tween(() => focusCamSys(zoomSys), 800, () => planets.forEach(placePlanet));
}

/* lien Devpedia : la phrase des données telle quelle, « intro », une espace, le lien */
function devpediaParagraph(link) {
    const p = el('p', 'devpedia'), a = el('a', '', link.label);
    a.href = link.href;
    a.target = '_blank';
    a.rel = 'noopener';
    p.append(`${link.intro} `, a);
    return p;
}
function placeDevpedia(link) {
    if (!DEVPEDIA) return;
    const p = devpediaParagraph(link);
    if (DEVPEDIA === 'd1') $('legend').after(p);
    else if (DEVPEDIA === 'd2') $('sLede').after(p);
    else if (DEVPEDIA === 'd3') $('skill').append(p);
    else {
        p.classList.add('hint');
        $('hint').replaceWith(p);
    }
}
