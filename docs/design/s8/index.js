/* Page de comparaison : construit les cadres à partir d'une description des vues.
   Chaque cadre pointe vers mockup.html avec une chaîne de requête ; le lien sous le cadre
   ouvre la même vue seule. */
const DESK_W = 1280, PHONE_HEIGHT = 900, DESK_HEIGHT = 900;
const LANGS = [['fr', 'FR'], ['en', 'EN']];
const D3_STATE = 'focus=markup&star=html';
const RELATED_STATE = 'focus=languages&star=c';

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
const card = (title, views) => ({ title, views });

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

/* téléphone : trois largeurs côte à côte, puis le bureau, par état et par langue */
const PHONE_STATES = [
    ['Au repos', ''],
    ['Déployée sur languages', 'focus=languages'],
    ['Plongée sur le nom le plus long', 'star=longest'],
];
const PHONE_WIDTHS = [320, 390, 430];
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
    { id: 'phone', title: 'Téléphone', cards: PHONE_CARDS },
    { id: 'legend', title: 'Légende', cards: LEGEND },
];

function render() {
    const main = document.getElementById('main'), nav = document.getElementById('nav');
    let count = 0;
    for (const sec of SECTIONS) {
        const s = el('section'), cards = el('div', 'cards');
        s.id = sec.id;
        s.append(el('h2', '', sec.title), cards);
        for (const c of sec.cards) {
            const box = el('figure', 'card'), frames = el('div', 'frames');
            box.append(el('h4', '', c.title), frames);
            c.views.forEach(make => {
                frames.append(make());
                count++;
            });
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
