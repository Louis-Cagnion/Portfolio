/* Mouvement : préférence de mouvement réduit, courbes, interpolations et caméra SVG. */

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';
const DEFAULT_RATIO = 0.4; // hauteur / largeur d'un SVG pas encore mesuré (maquette)

/**
 * @brief Préférence « mouvement réduit », relue à chaque appel (elle peut changer en cours).
 *
 * @returns {boolean} vrai si le système demande moins d'animations
 */
export function reduced() {
  return typeof matchMedia === 'function' && matchMedia(REDUCED_QUERY).matches;
}

/**
 * @brief Courbe cubique d'accélération puis de freinage (maquette).
 *
 * @param {number} t progression entre 0 et 1
 *
 * @returns {number} progression adoucie, ease(0) = 0 et ease(1) = 1
 */
export function ease(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
}

/**
 * @brief Interpolation linéaire.
 *
 * @param {number} a valeur de départ
 * @param {number} b valeur d'arrivée
 * @param {number} t progression (0 donne a, 1 donne b)
 *
 * @returns {number} valeur intermédiaire (NaN si une entrée vaut NaN)
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * @brief Hachage stable d'un identifiant (placement indépendant de la langue).
 *
 * @param {string} id identifiant de données
 *
 * @returns {number} entier non signé 32 bits, identique à celui de la maquette
 */
export function hashId(id) {
  let hash = 7;
  for (const char of String(id)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

/**
 * @brief Appelle `onFrame` à chaque image avec une progression de 0 à 1, puis se résout.
 *
 * Sous mouvement réduit ou pour une durée nulle ou négative : un seul appel onFrame(1),
 * sans requestAnimationFrame.
 *
 * @param {{ duration: number, onFrame: (t: number) => void, reduced?: boolean }} options
 *   durée en ms, rappel d'image, mouvement réduit (préférence du système par défaut)
 *
 * @returns {Promise<void>} résolue après l'appel onFrame(1)
 */
export function animate({ duration, onFrame, reduced: still = reduced() }) {
  if (still || !(duration > 0)) {
    onFrame(1);
    return Promise.resolve();
  }
  const start = performance.now();
  return new Promise((resolve) => {
    const frame = (now) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      onFrame(t);
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}

/**
 * @brief Caméra d'un SVG : centre et largeur de sa viewBox, hauteur suivant son ratio affiché.
 *
 * camera.set({ cx, cy, w }) place la vue ; camera.tween(() => cible, ms, onFrame) l'anime
 * (durée 0 sous mouvement réduit) et rend une Promise ; un nouvel appel termine le
 * précédent. `camera.raf` est non nul pendant une animation. La variable CSS --u vaut
 * les unités du dessin par pixel affiché.
 *
 * @param {SVGSVGElement} svg élément dont la viewBox est pilotée
 *
 * @returns {object} caméra { cx, cy, w, raf, ratio, apply, set, tween }
 */
export function makeCamera(svg) {
  const camera = { cx: 0, cy: 0, w: 1, raf: 0, pending: null };
  const settle = () => {
    cancelAnimationFrame(camera.raf);
    camera.raf = 0;
    const done = camera.pending;
    camera.pending = null;
    done?.();
  };
  camera.ratio = () => svg.clientHeight / svg.clientWidth || DEFAULT_RATIO;
  camera.apply = () => {
    const height = camera.w * camera.ratio();
    svg.setAttribute('viewBox',
      `${camera.cx - camera.w / 2} ${camera.cy - height / 2} ${camera.w} ${height}`);
    svg.style.setProperty('--u', (camera.w / (svg.clientWidth || 1)).toFixed(4));
  };
  camera.set = (target) => {
    settle();
    Object.assign(camera, target);
    camera.apply();
  };
  camera.tween = (target, duration, onFrame) => {
    settle();
    const from = { cx: camera.cx, cy: camera.cy, w: camera.w };
    const start = performance.now();
    const length = reduced() ? 0 : duration;
    return new Promise((resolve) => {
      camera.pending = resolve;
      const frame = (now) => {
        const t = length ? Math.min(1, Math.max(0, (now - start) / length)) : 1;
        const k = ease(t);
        const to = target();
        camera.cx = lerp(from.cx, to.cx, k);
        camera.cy = lerp(from.cy, to.cy, k);
        camera.w = lerp(from.w, to.w, k);
        camera.apply();
        onFrame?.(k);
        if (t < 1) camera.raf = requestAnimationFrame(frame);
        else settle();
      };
      frame(start);
    });
  };
  return camera;
}
