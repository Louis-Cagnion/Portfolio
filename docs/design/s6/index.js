/* Page de comparaison : construit les cadres à partir d'une description des options.
   Chaque cadre pointe vers mockup.html avec une chaîne de requête. */
const DESK_W = 1280;
const PHONE_FRAMES = { 320: 'Petit téléphone, 320 px', 390: 'Téléphone courant, 390 px',
    430: 'Grand téléphone, 430 px' };

/* Introduction : quatre emplacements, deux systèmes (le texte le plus long, puis un court) */
const INTRO_OPTIONS = [
    ['a', 'A : sous le titre et le compte de la tête du système'],
    ['b', 'B : panneau à côté du plan (bureau), sous le plan (téléphone)'],
    ['c', 'C : sous le plan, avant la liste des projets'],
    ['none', 'Sans introduction (référence)'],
];
const introCards = system => INTRO_OPTIONS.map(([key, label]) => ({
    label,
    desk: { query: `layout=rows&intro=${key}&zoom=${system}`, height: 820 },
    phones: [{ width: 390, query: `intro=${key}&zoom=${system}`, height: 900 }],
}));

/* Piscine : trois dispositions bureau, puis le téléphone */
const LAYOUTS = [
    ['row', 'A : quatre systèmes en une ligne, rayons d\'orbite réduits', 560],
    ['rows', 'B : trois en une ligne, la Piscine seule en pleine largeur dessous', 780],
    ['grid', 'C : deux par deux', 780],
];
const layoutCards = zoom => LAYOUTS.map(([key, label, height]) => ({
    label,
    desk: {
        query: `layout=${key}${zoom ? '&zoom=piscine' : ''}`,
        height: zoom ? 820 : height,
    },
    phones: [],
}));
const phoneCards = (label, extra, widths, zoom) => [{
    label,
    desk: null,
    phones: widths.map(width => ({
        width,
        query: `${zoom ? 'zoom=piscine' : 'scrollto=piscine'}${extra}`,
        height: 600,
    })),
}];

const FOCUS_PEEK = 'zoom=piscine&zoomstyle=focus&peek=c05';

const SECTIONS = [
    {
        id: 'intro',
        title: 'Introduction de chaque système',
        lead: 'Où placer le texte de présentation d\'un système ? Il n\'apparaît que lorsque '
            + 'le système est zoomé ; au repos, rien. Cliquer le soleil d\'un système pour '
            + 'retrouver l\'état, Échap ou « Tous les systèmes » pour en sortir.',
        groups: [
            { title: 'Système Tressol-Chabrier zoomé (texte le plus long)',
                cards: introCards('pro') },
            { title: 'Projets perso zoomé (texte court)', cards: introCards('perso') },
        ],
    },
    {
        id: 'piscine',
        title: 'La Piscine, quatrième système',
        lead: 'Vingt planètes sur cinq orbites, teinte azur. Dispositions bureau, puis '
            + 'téléphone (les quatre systèmes s\'empilent sous 880 px).',
        groups: [
            { title: 'Bureau, au repos', cards: layoutCards(false) },
            { title: 'Bureau, la Piscine zoomée', cards: layoutCards(true) },
            { title: 'Téléphone, au repos (défilé jusqu\'à la Piscine)',
                note: 'Les étiquettes n\'apparaissent qu\'au survol ou au focus.',
                cards: phoneCards('Piscine au repos', '', [320, 390, 430], false) },
            { title: 'Téléphone, zoom avec toutes les étiquettes (zoomstyle=labels)',
                note: 'Comme la maquette : chaque planète porte son nom.',
                cards: phoneCards('Toutes les étiquettes', '&zoomstyle=labels',
                    [320, 390, 430], true) },
            { title: 'Téléphone, zoom avec étiquette de la planète touchée (zoomstyle=focus)',
                note: 'Seule la planète touchée ou survolée porte son nom (ici C05 est '
                    + 'montrée comme touchée sur les deux premiers cadres) ; son clic ouvre '
                    + 'la fiche comme dans la maquette.',
                cards: [{
                    label: 'Étiquette de la planète touchée',
                    desk: null,
                    phones: [
                        { width: 320, query: FOCUS_PEEK, height: 600 },
                        { width: 390, query: FOCUS_PEEK, height: 600 },
                        { width: 390, query: 'zoom=piscine&zoomstyle=focus', height: 600,
                            caption: 'Aucune planète touchée, 390 px' },
                    ],
                }] },
        ],
    },
];

const el = (tag, className, text) => {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text) e.textContent = text;
    return e;
};
function frameFor(url, height, lazy) {
    const f = el('iframe');
    f.src = url;
    f.height = height;
    f.loading = lazy ? 'lazy' : 'eager';
    return f;
}
function deskFrame(spec, title) {
    const box = el('div', 'desk');
    const f = frameFor(`mockup.html?${spec.query}`, spec.height, true);
    f.title = title;
    box.style.width = `calc(${DESK_W}px * var(--s))`;
    box.style.height = `calc(${spec.height}px * var(--s))`;
    box.append(f);
    return box;
}
function phoneFrame(spec, title) {
    const fig = el('figure', 'phone');
    const f = frameFor(`mockup.html?${spec.query}`, spec.height, true);
    f.style.width = `${spec.width + 20}px`;
    f.title = `${title}, ${spec.width} px`;
    fig.append(f, el('figcaption', '', spec.caption || PHONE_FRAMES[spec.width]));
    return fig;
}
function render() {
    const main = document.getElementById('main');
    for (const sec of SECTIONS) {
        const s = el('section');
        s.id = sec.id;
        s.append(el('h2', '', sec.title), el('p', '', sec.lead));
        for (const g of sec.groups) {
            s.append(el('h3', '', g.title));
            if (g.note) s.append(el('p', 'note', g.note));
            const cards = el('div', 'cards');
            for (const c of g.cards) {
                const card = el('figure', 'card'), frames = el('div', 'frames');
                card.append(el('h4', '', c.label));
                if (c.desk) frames.append(deskFrame(c.desk, c.label));
                c.phones.forEach(p => frames.append(phoneFrame(p, c.label)));
                card.append(frames);
                cards.append(card);
            }
            s.append(cards);
        }
        main.append(s);
    }
}
render();
document.getElementById('scale').addEventListener('change', e => {
    document.documentElement.style.setProperty('--s', e.target.value);
});
