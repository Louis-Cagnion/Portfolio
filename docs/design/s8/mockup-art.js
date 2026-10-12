/* Maquette S8 : dessins des quatre astres, repris de docs/design/prototype (lignes 733-934).
   Niveau 0 étoile en fusion, 1 géante jaune, 2 nébuleuse, 3 galaxie ; centrés en 0,0. */
const LEVELS = ['unknown', 'beginner', 'intermediate', 'advanced'];
const BODY_R = [14, 12, 22, 30];
const stop = (offset, color, opacity) => {
    const alpha = opacity === undefined ? '' : ` stop-opacity="${opacity}"`;
    return `<stop offset="${offset}" stop-color="${color}"${alpha}/>`;
};
const radial = (id, stops, extra = '') =>
    `<radialGradient id="${id}"${extra}>${stops.join('')}</radialGradient>`;
const DEFS_MARKUP = [
    radial('gGiant', [
        stop(0, '#fffbe6'), stop('.5', '#ffe17a'), stop('.85', '#f2a93b'),
        stop(1, '#f2a93b', 0),
    ]),
    radial('gGiantGlow', [stop(0, '#ffd75a', '.5'), stop(1, '#ffd75a', 0)]),
    radial('gNebA', [stop(0, '#c86bd8', '.9'), stop(1, '#c86bd8', 0)]),
    radial('gNebB', [stop(0, '#4fd1c5', '.78'), stop(1, '#4fd1c5', 0)]),
    radial('gNebC', [stop(0, '#e8b45a', '.72'), stop(1, '#e8b45a', 0)]),
    radial('gCore', [stop(0, '#fff7e0'), stop('.35', '#ffe0a0', '.9'), stop(1, '#9fb4ff', 0)]),
    radial('gMagmaRock', [
        stop(0, '#5c3426'), stop('.55', '#2b1713'), stop(1, '#120909'),
    ], ' cx=".38" cy=".32" r=".8"'),
    radial('gMagmaGlow', [stop('.45', '#ff5a1a', '.45'), stop(1, '#ff5a1a', 0)]),
    radial('gMagmaShade', [
        stop(0, '#ffd0a0', '.16'), stop('.6', '#000', 0), stop(1, '#000', '.5'),
    ], ' cx=".35" cy=".3" r=".75"'),
    '<clipPath id="cMagma"><circle r="10.6"/></clipPath>',
].join('');

/* bras de la galaxie : points sur deux spirales logarithmiques, calculés une fois */
const GALAXY_ARMS = (() => {
    let out = '';
    for (let arm = 0; arm < 2; arm++) for (let i = 0; i < 46; i++) {
        const t = i * 0.16, r = 3 + 26 * (i / 46), a = t + arm * Math.PI;
        const x = (r * Math.cos(a)).toFixed(2), y = (r * Math.sin(a)).toFixed(2);
        const op = (0.95 - i / 60).toFixed(2), rad = (1.5 - i / 46).toFixed(2);
        const col = i < 12 ? '#ffe9c2' : i < 30 ? '#cfd9ff' : '#8fa8ff';
        out += `<circle cx="${x}" cy="${y}" r="${rad}" fill="${col}" opacity="${op}"/>`;
    }
    return out;
})();
const LAVA_PATH = 'M-11-2L-7-1L-4-4L0-3L3-6L5-11M-4-4L-5-8L-3-11M-7-1L-6 3L-10 6M-6 3L-2 4'
    + 'L1 1L0-3M1 1L5 2L8-1L11-2M5 2L6 6L9 8M-2 4L-1 8L2 11M-1 8L-5 10M3-6L7-6L10-8M8-1L7-4'
    + 'M-10 6L-8 9';
const star = (cx, cy, r, op = 1) =>
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" opacity="${op}"/>`;
const BODY_MARKUP = [
    '<circle r="20" fill="url(#gMagmaGlow)"/><circle r="11" fill="url(#gMagmaRock)"/>'
    + '<g class="b-lava" clip-path="url(#cMagma)" fill="none" stroke-linejoin="round"'
    + ' stroke-linecap="round">'
    + `<path d="${LAVA_PATH}" stroke="#ff5a1a" stroke-width="2" opacity=".55"/>`
    + `<path d="${LAVA_PATH}" stroke="#ffd36a" stroke-width=".75"/></g>`
    + '<circle cx="5" cy="-3" r="1.4" fill="rgba(0,0,0,.35)"/>'
    + '<circle cx="-5" cy="5" r="1.1" fill="rgba(0,0,0,.3)"/>'
    + '<circle r="11" fill="url(#gMagmaShade)"/>',
    '<circle class="b-glow" r="22" fill="url(#gGiantGlow)"/>'
    + '<circle r="11" fill="url(#gGiant)"/>'
    + '<circle cx="-3" cy="2" r="2" fill="rgba(200,120,30,.22)"/>'
    + '<circle cx="3.5" cy="-2.5" r="1.4" fill="rgba(200,120,30,.18)"/>',
    '<g class="b-drift"><ellipse cx="-5" cy="-3" rx="20" ry="13" fill="url(#gNebA)"/>'
    + '<ellipse cx="7" cy="4" rx="17" ry="12" fill="url(#gNebB)" transform="rotate(25 7 4)"/>'
    + '<ellipse cx="1" cy="-1" rx="11" ry="9" fill="url(#gNebC)"/></g>'
    + star(-6, -4, 1.3) + star(6, 3, 1, '.85') + star(1, 8, '.8', '.7')
    + star(10, -6, '.7', '.6'),
    '<g transform="rotate(-24) scale(1 .55)"><circle r="30" fill="url(#gCore)" opacity=".8"/>'
    + `<g class="b-spin">${GALAXY_ARMS}</g><circle r="6" fill="url(#gCore)"/></g>`,
];
const bodyNodes = lv => fragmentFrom(BODY_MARKUP[lv]);
function bodyIcon(lv) {
    const svg = mk('svg', { class: 'ico', viewBox: '-36 -36 72 72', 'aria-hidden': 'true' });
    svg.append(...bodyNodes(lv));
    return svg;
}
