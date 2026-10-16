/* Page de comparaison : construit les cadres à partir d'une description des vues.
   Chaque cadre pointe vers mockup.html avec une chaîne de requête ; le lien sous le cadre
   ouvre la même vue seule. */
const PHONE_WIDTHS = [320, 390, 430];
const DESK_W = 1280, PHONE_HEIGHT = 900, DESK_HEIGHT = 900;
const LANGS = [['fr', 'FR'], ['en', 'EN']];
const D3_STATE = 'focus=markup&star=html';
const RELATED_STATE = 'focus=languages&star=c';
/* bash : une planète de la Piscine (shell00) et une de l'école (minishell) */
const R2_STATE = 'focus=languages&star=bash';

const el = (tag, className, text) => {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text) e.textContent = text;
    return e;
};
const viewUrl = query => `mockup.html?${query}`;
function frameFor(query, height) {
    const f = el('iframe');
    f.src = viewUrl(query);
    f.height = height;
    f.loading = 'lazy';
    return f;
}
const viewLink = (label, query) => {
    const a = el('a', 'view-link', label);
    a.href = viewUrl(query);
    a.target = '_blank';
    return a;
};
function deskView(label, query, height = DESK_HEIGHT) {
    const box = el('div', 'desk'), f = frameFor(query, height);
    f.title = label;
    box.style.width = `calc(${DESK_W}px * var(--s))`;
    box.style.height = `calc(${height}px * var(--s))`;
    box.append(f);
    const fig = el('figure', 'view');
    fig.append(box, viewLink(label, query));
    return fig;
}
function phoneView(label, query, width, height = PHONE_HEIGHT) {
    const fig = el('figure', 'phone'), f = frameFor(query, height);
    f.style.width = `${width + 20}px`;
    f.title = label;
    fig.append(f, viewLink(label, query));
    return fig;
}
const card = (title, views, note = '', measure = null) => ({
    title, views, note, measure,
});

/* une carte par option et par langue : bureau puis téléphone 390 px */
function optionCards(options, heights) {
    return options.flatMap(([code, label, query]) => LANGS.map(([lang, tag]) => {
        const q = `${query}&lang=${lang}`.replace(/^&/, '');
        const name = `${code} ${label}, ${tag}`;
        return card(name, [
            () => deskView(`${name}, 1280 px`, q, heights.desk),
            () => phoneView(`${name}, 390 px`, q, 390, heights.phone),
        ]);
    }));
}
const DEVPEDIA = optionCards([
    ['D1', 'sous la légende', 'devpedia=d1'],
    ['D2', 'sous le chapeau', 'devpedia=d2'],
    ['D3', 'dans le panneau', `devpedia=d3&${D3_STATE}`],
    ['D4', 'sous le plan', 'devpedia=d4'],
], { desk: 900, phone: 1600 });
const RELATED = optionCards([
    ['R1', 'saut puis fiche', `related=r1&${RELATED_STATE}`],
    ['R2', 'saut, système, fiche', `related=r2&${RELATED_STATE}`],
    ['R3', 'fiche sur place', `related=r3&${RELATED_STATE}`],
], { desk: 900, phone: 1100 });

const R2_NOTES = {
    R2a: 'Saut vers Projets, le système se zoome, puis la caméra va à la planète, puis la '
        + 'fiche. À la fermeture : focus sur la planète, caméra de retour sur le système.',
    R2b: 'Saut vers Projets, un seul mouvement de caméra du plan d\'ensemble à la '
        + 'planète (aucun arrêt sur le système), puis la fiche. À la fermeture : retour '
        + 'au système.',
    R2c: 'Système zoomé puis fiche (la caméra ne va pas à la planète). À la fermeture : '
        + 'le zoom reste sur le système, le focus va à la planète.',
};
const R2_OPTIONS = optionCards([
    ['R2a', 'deux temps', `related=r2a&${R2_STATE}`],
    ['R2b', 'un seul mouvement', `related=r2b&${R2_STATE}`],
    ['R2c', 'le zoom reste', `related=r2c&${R2_STATE}`],
], { desk: 900, phone: 1100 });
R2_OPTIONS.forEach(c => {
    c.note = `${R2_NOTES[c.title.slice(0, 3)]} Puce à cliquer : shell00 (Piscine) ou `
        + 'minishell (école) dans la fiche de Bash.';
});

/* plongée sur une étoile (nom le plus long), trois largeurs, avec les mesures */
const PLUNGES = [
    ['P1', 'comme la maquette', 'p1'],
    ['P2', 'nom sous l\'astre', 'p2'],
    ['P3', 'panneau sous le plan', 'p3'],
].flatMap(([code, label, id]) => LANGS.map(([lang, tag]) => {
    const q = `plunge=${id}&star=longest&lang=${lang}`;
    const name = `${code} ${label}, ${tag}`;
    const views = PHONE_WIDTHS.map(w => () => phoneView(`${name}, ${w} px`, q, w, 1100));
    return card(name, views, '', PHONE_WIDTHS.map(w => ({ width: w, query: q })));
}));

/* téléphone : trois largeurs côte à côte, puis le bureau, par état et par langue */
const PHONE_STATES = [
    ['Au repos', ''],
    ['Déployée sur languages', 'focus=languages'],
    ['Plongée sur le nom le plus long', 'star=longest'],
];
const PHONE_CARDS = PHONE_STATES.flatMap(([label, query]) => LANGS.map(([lang, tag]) => {
    const q = [query, `lang=${lang}`].filter(Boolean).join('&');
    return card(`${label}, ${tag}`, [
        ...PHONE_WIDTHS.map(w => () => phoneView(`${label}, ${tag}, ${w} px`, q, w, 1100)),
        () => deskView(`${label}, ${tag}, 1280 px`, q, 900),
    ]);
}));
const LEGEND = LANGS.map(([lang, tag]) => card(`Légende, ${tag}`, [
    () => deskView(`Légende, ${tag}, 1280 px`, `lang=${lang}&scrollto=legend`, 420),
    () => phoneView(`Légende, ${tag}, 390 px`, `lang=${lang}&scrollto=legend`, 390, 420),
]));
const SECTIONS = [
    { id: 'devpedia', title: 'Lien Devpedia', cards: DEVPEDIA },
    { id: 'related', title: 'Projets liés', cards: RELATED },
    { id: 'related2', title: 'Projets liés : lectures de R2', cards: R2_OPTIONS },
    { id: 'plunge', title: 'Téléphone : plongée sur une étoile', cards: PLUNGES },
    { id: 'phone', title: 'Téléphone', cards: PHONE_CARDS },
    { id: 'legend', title: 'Légende', cards: LEGEND },
];

/* mesures de s8Measure.all() par largeur, prises dans un cadre caché de même taille */
const measureLine = (w, r) => `${w} px : ${r.nameOutsideFrame} noms sortent du cadre et `
    + `${r.nameCovered} noms et ${r.bodyCovered} astres sont recouverts par le panneau, `
    + `sur ${r.stars} étoiles.`;
function measureBox(list) {
    const box = el('ul', 'measure');
    list.forEach(({ width, query }) => {
        const li = el('li', '', `${width} px : mesure en cours`), f = frameFor(query, 1100);
        f.style.cssText = `position: fixed; left: -9999px; width: ${width}px; height: 1100px;`;
        f.loading = 'eager';
        f.addEventListener('load', async () => {
            const w = f.contentWindow;
            while (!w.document.body.dataset.ready) await new Promise(r => setTimeout(r, 100));
            li.textContent = measureLine(width, await w.s8Measure.all());
            f.remove();
        });
        document.body.append(f);
        box.append(li);
    });
    return box;
}
function render() {
    const main = document.getElementById('main'), nav = document.getElementById('nav');
    let count = 0;
    for (const sec of SECTIONS) {
        const s = el('section'), cards = el('div', 'cards');
        s.id = sec.id;
        s.append(el('h2', '', sec.title), cards);
        for (const c of sec.cards) {
            const box = el('figure', 'card'), frames = el('div', 'frames');
            box.append(el('h4', '', c.title));
            if (c.note) box.append(el('p', 'note', c.note));
            box.append(frames);
            c.views.forEach(make => {
                frames.append(make());
                count++;
            });
            if (c.measure) box.append(measureBox(c.measure));
            cards.append(box);
        }
        main.append(s);
        const a = el('a', '', sec.title);
        a.href = `#${sec.id}`;
        nav.append(a);
    }
    document.getElementById('count').textContent = `${count} vues`;
}
render();
document.getElementById('scale').addEventListener('change', e => {
    document.documentElement.style.setProperty('--s', e.target.value);
});
