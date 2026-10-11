/* Page de comparaison : construit les cadres à partir d'une description des options.
   Chaque cadre pointe vers mockup.html avec une chaîne de requête. */
const DESK_W = 1280;
const PHONE_FRAMES = { 320: 'Petit téléphone, 320 px', 390: 'Téléphone courant, 390 px',
    430: 'Grand téléphone, 430 px' };

/* Cartes : un cadre bureau (1280 px) et, au besoin, des cadres téléphone */
const deskCard = (label, query, height) => ({
    label,
    desk: { query, height },
    phones: [],
});
const phoneCard = (label, query, widths, height = 600) => ({
    label,
    desk: null,
    phones: widths.map(width => ({ width, query, height })),
});
const PHONES = [320, 390, 430];

const SECTIONS = [
    {
        id: 'decided',
        title: 'Décidé (11/10/2026)',
        lead: 'Introduction sous le plan sur toute la largeur de la page, visible seulement '
            + 'système zoomé (la liste des projets est alors masquée) ; bureau : quatre '
            + 'systèmes deux par deux au repos, Piscine zoomée ; téléphone : Piscine zoomée '
            + 'avec toutes les étiquettes et des zones de toucher de 44 px.',
        groups: [
            { title: 'Introduction sous le plan, bureau et téléphone',
                note: 'Tressol-Chabrier (texte long) puis Projets perso (texte court).',
                cards: [
                    deskCard('Tressol-Chabrier zoomé, bureau', 'zoom=pro', 900),
                    phoneCard('Tressol-Chabrier zoomé, 390 px', 'zoom=pro', [390], 900),
                    deskCard('Projets perso zoomé, bureau', 'zoom=perso', 900),
                    phoneCard('Projets perso zoomé, 390 px', 'zoom=perso', [390], 900),
                ] },
            { title: 'Bureau : deux par deux au repos, puis la Piscine zoomée',
                cards: [
                    deskCard('Au repos', '', 780),
                    deskCard('Piscine zoomée', 'zoom=piscine', 900),
                ] },
            { title: 'Téléphone : Piscine zoomée, zones de toucher de 44 px visibles',
                note: 'Cercles de 44 px de diamètre (paramètre hit=show) : le toucher choisit '
                    + 'la planète au centre le plus proche du point touché.',
                cards: [phoneCard('Avec zones visibles', 'zoom=piscine&hit=show', PHONES)] },
            { title: 'Téléphone : Piscine zoomée, rendu réel',
                cards: [phoneCard('Sans zones visibles', 'zoom=piscine', PHONES)] },
            { title: 'Téléphone : Piscine au repos (défilé jusqu\'à la Piscine)',
                cards: [phoneCard('Piscine au repos', 'scrollto=piscine', PHONES)] },
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
