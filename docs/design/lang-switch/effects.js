/*
Maquettes de l'animation de changement de langue, branchées sur le vrai site (iframe).
install() relève les textes visibles au clic sur FR ou EN, laisse le site basculer, puis
rejoue, sur chaque texte visible qui a changé, le passage de l'ancien au nouveau.
Durée plafonnée quelle que soit la longueur : vague de STAGGER_MS de haut en bas, puis
la durée propre de l'effet. Mouvement réduit : bascule immédiate, comme aujourd'hui.
Maquette seulement : le site animerait un calque aria-hidden, jamais le texte réel (lecteurs
d'écran et js/core/fit-words.js ne verraient que le texte final).
*/

const STAGGER_MS = 180;
const EN_SPACE = ' '; // garde à peu près la place d'une lettre pas encore écrite
const CARET = '▌';
const GLYPHS = [
  [/\p{Lu}/u, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'],
  [/\p{Ll}/u, 'abcdefghijklmnopqrstuvwxyz'],
  [/\p{Nd}/u, '0123456789'],
];

/**
 * @brief Lettre de brouillage de la même famille que `char`, stable pendant un créneau.
 *
 * @param {string} char lettre d'origine
 * @param {number} seed entier qui change à chaque créneau
 *
 * @returns {string} lettre de même casse, chiffre pour un chiffre, `char` sinon
 */
function glyph(char, seed) {
  const family = GLYPHS.find(([test]) => test.test(char));
  if (!family) return char;
  const set = family[1];
  return set[Math.abs((seed * 2654435761) | 0) % set.length];
}

/**
 * @brief Début de `text` puis la place du reste de `ref` en espaces.
 *
 * @param {string} text texte à montrer
 * @param {string} ref texte dont la longueur réserve la place
 * @param {number} count nombre de caractères de `text` montrés
 *
 * @returns {string} texte affiché à cette image
 */
function padTo(text, ref, count) {
  return text.slice(0, count) + ref.slice(count).replace(/\S/g, EN_SPACE);
}

/* Effets : `dur` en ms, `frame(from, to, p, now)` donne le texte à l'avancement p (0 à 1),
`fade` (facultatif) les images clés d'opacité de l'élément parent. */
const EFFECTS = {
  decode: {
    dur: 520,
    frame(from, to, p, now) {
      const solved = Math.floor(Math.max(0, (p - 0.15) / 0.85) * to.length);
      const slot = Math.floor(now / 60);
      return [...to].map((char, i) => (
        i < solved || /\s/.test(char) ? char : glyph(char, slot * 31 + i)
      )).join('');
    },
  },
  type: {
    dur: 700,
    frame(from, to, p) {
      if (p < 0.35)
        return padTo(from, to, Math.round((1 - p / 0.35) * from.length));
      const typed = Math.floor(((p - 0.35) / 0.65) * to.length);
      const shown = padTo(to, to, typed);
      return typed < to.length ? shown.slice(0, typed) + CARET + shown.slice(typed + 1) : to;
    },
  },
  fade: {
    dur: 440,
    frame: (from, to, p) => (p < 0.45 ? from : to),
    fade: [
      { opacity: 1, filter: 'blur(0)', transform: 'none' },
      { opacity: 0, filter: 'blur(3px)', transform: 'translateY(-2px)', offset: 0.45 },
      { opacity: 0, filter: 'blur(3px)', transform: 'translateY(3px)', offset: 0.46 },
      { opacity: 1, filter: 'blur(0)', transform: 'none' },
    ],
  },
  flap: {
    dur: 620,
    frame(from, to, p, now) {
      const length = Math.max(from.length, to.length);
      const slot = Math.floor(now / 45);
      let out = '';
      for (let i = 0; i < length; i++) {
        const start = (i / Math.max(length, 1)) * 0.5;
        const q = (p - start) / 0.5;
        const target = to[i] ?? '';
        if (q <= 0) out += from[i] ?? EN_SPACE;
        else if (q >= 1 || /\s/.test(target)) out += target;
        else out += glyph(target || from[i], slot * 17 + i);
      }
      return p >= 1 ? to : out;
    },
  },
};

/**
 * @brief Textes non vides de la page dont une partie est dans la fenêtre.
 *
 * @param {Window} win fenêtre du site
 *
 * @returns {{ node: Text, top: number }[]} nœuds texte et haut de leur première boîte
 */
function visibleTexts(win) {
  const doc = win.document;
  const range = doc.createRange();
  const walker = doc.createTreeWalker(doc.body, win.NodeFilter.SHOW_TEXT);
  const found = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.data.trim() || /^(SCRIPT|STYLE)$/.test(node.parentNode.nodeName)) continue;
    range.selectNodeContents(node);
    const box = [...range.getClientRects()].find((rect) => (
      rect.width > 0
      && rect.bottom > 0
      && rect.top < win.innerHeight
      && rect.right > 0
      && rect.left < win.innerWidth
    ));
    if (box) found.push({ node, top: box.top });
  }
  return found;
}

/**
 * @brief Rang d'un nœud texte parmi les nœuds texte de son parent.
 *
 * @param {Text} node nœud texte attaché
 *
 * @returns {number} rang à partir de 0
 */
function textIndex(node) {
  return [...node.parentNode.childNodes].filter((child) => child.nodeType === 3).indexOf(node);
}

/**
 * @brief Branche un effet sur les boutons de langue du site chargé dans `win`.
 *
 * @param {Window} win fenêtre du site, même origine
 * @param {'decode' | 'type' | 'fade' | 'flap'} name effet de EFFECTS
 */
export function install(win, name) {
  const effect = EFFECTS[name];
  const doc = win.document;
  const still = win.matchMedia('(prefers-reduced-motion: reduce)');
  let before = null; // textes relevés au clic, en attente de la bascule
  let jobs = [];
  let fades = [];

  const finish = () => {
    for (const job of jobs) if (job.node.data !== job.to) job.node.data = job.to;
    fades.forEach((anim) => anim.cancel());
    jobs = [];
    fades = [];
  };

  doc.addEventListener('click', (event) => {
    if (!event.target.closest('button[data-lang]')) return;
    finish();
    if (still.matches) return;
    const byNode = new Map();
    const byParent = new Map();
    for (const { node } of visibleTexts(win)) {
      byNode.set(node, node.data);
      const list = byParent.get(node.parentNode) ?? [];
      list[textIndex(node)] = node.data;
      byParent.set(node.parentNode, list);
    }
    before = { byNode, byParent };
  }, true);

  const tick = (now) => {
    jobs = jobs.filter((job) => {
      const p = Math.min(1, Math.max(0, (now - job.start) / effect.dur));
      const text = p >= 1 ? job.to : effect.frame(job.from, job.to, p, now);
      if (job.node.data !== text) job.node.data = text;
      return p < 1;
    });
    if (jobs.length) win.requestAnimationFrame(tick);
    else fades = [];
  };

  new win.MutationObserver(() => {
    if (!before) return;
    const { byNode, byParent } = before;
    before = null;
    const now = win.performance.now();
    const faded = new Set();
    for (const { node, top } of visibleTexts(win)) {
      const from = byNode.get(node) ?? byParent.get(node.parentNode)?.[textIndex(node)] ?? '';
      if (from === node.data) continue;
      const delay = Math.min(1, Math.max(0, top / win.innerHeight)) * STAGGER_MS;
      jobs.push({ node, from, to: node.data, start: now + delay });
      node.data = effect.frame(from, node.data, 0, now);
      if (effect.fade && !faded.has(node.parentNode)) {
        faded.add(node.parentNode);
        fades.push(node.parentNode.animate(effect.fade, {
          duration: effect.dur,
          delay,
          easing: 'ease-in-out',
          fill: 'backwards',
        }));
      }
    }
    if (jobs.length) win.requestAnimationFrame(tick);
  }).observe(doc.documentElement, { attributes: true, attributeFilter: ['lang'] });
}
