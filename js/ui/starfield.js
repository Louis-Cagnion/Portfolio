/*
Ciel du fond (canvas#sky) : étoiles en perspective qui avancent, ou reculent pendant un saut
arrière, et poussière d'étoiles sur les marges au-dessus de 880 px. Rendu de la maquette, en
une seule boucle requestAnimationFrame à pas de temps plafonné, arrêtée quand l'onglet est
masqué. Sous mouvement réduit, une image figée, redessinée au redimensionnement seulement.
*/
import { BREAKPOINTS } from '../core/dom.js';
import { reduced, watchReduced } from '../core/motion.js';

const FRAME_MS = 1000 / 60; // vitesses de la maquette : par image de 60 Hz
const MAX_DT = 50; // ms (checklist, section 6) : une image longue ne fait pas bondir le ciel
const BASE_SPEED = 0.12;
const WARP_SPEED = 42;
const CATCH_UP = 0.08; // part de l'écart à la vitesse cible rattrapée en une image
const TRAIL_SPEED = 2; // au-delà, fond repeint en transparence : traînées du saut
const TRAIL_ALPHA = 0.35; // part du fond repeinte par image de 60 Hz
const DUST_FADE_SPEED = 6; // vitesse à laquelle la poussière a disparu
const MAX_PIXEL_RATIO = 2;
const STAR_AREA = 5000; // px² de ciel par étoile
const FOCAL = 128; // distance focale de la projection des étoiles
const STAR_PARALLAX = 30; // décalage des étoiles selon le pointeur
const DUST_PARALLAX = 16;
const DUST_DRIFT = 0.03; // montée de la poussière, en px par image
const TAU = Math.PI * 2;

/**
 * @brief Place une étoile au hasard dans le champ, à une profondeur donnée.
 *
 * @param {object} star étoile { x, y, z, pz }, modifiée sur place
 * @param {{ width: number, height: number }} size taille du ciel en px CSS
 * @param {number} depth profondeur, de 1 (au ras de l'écran) à size.width (au fond)
 *
 * @returns {object} `star`
 */
function placeStar(star, size, depth) {
  star.x = (Math.random() - 0.5) * size.width * 2;
  star.y = (Math.random() - 0.5) * size.height * 2;
  star.z = depth;
  star.pz = depth;
  return star;
}

/**
 * @brief Étoiles du champ, une par STAR_AREA px², à des profondeurs au hasard.
 *
 * @param {{ width: number, height: number }} size taille du ciel en px CSS
 *
 * @returns {object[]} étoiles { x, y, z, pz }
 */
function makeStars(size) {
  const count = Math.round((size.width * size.height) / STAR_AREA);
  return Array.from({ length: count }, () => placeStar({}, size, Math.random() * size.width));
}

/**
 * @brief Poussière des marges en bureau, sur une bande de chaque côté :
 *   band = max(140, (largeur - 1200) / 2 + 160) (docs/design-checklist.md, section 5).
 *
 * @param {{ width: number, height: number }} size taille du ciel en px CSS
 *
 * @returns {object[]} grains { x, y, r, alpha, phase, pace, gold, depth } ; aucun à 880 px
 *   et moins
 */
function makeDust(size) {
  if (matchMedia(BREAKPOINTS.narrow).matches) return [];
  const band = Math.max(140, (size.width - 1200) / 2 + 160);
  const count = Math.round((band * size.height) / 700);
  const dust = [];
  for (const side of [0, 1])
    for (let i = 0; i < count; i++) {
      const inset = band * Math.random() ** 1.8;
      dust.push({
        x: side ? size.width - inset : inset,
        y: Math.random() * size.height,
        r: Math.random() < 0.07 ? 1.4 : 0.35 + Math.random() * 0.65,
        alpha: 0.12 + Math.random() * 0.6,
        phase: Math.random() * TAU,
        pace: 0.4 + Math.random() * 1.8,
        gold: Math.random() < 0.12,
        depth: 0.3 + Math.random() * 0.7,
      });
    }
  return dust;
}

/**
 * @brief Peint la poussière, qui scintille et monte lentement, effacée par la vitesse.
 *
 * @param {object} sky état du ciel (context, size, dust, pointer, colors)
 * @param {number} time horodatage en ms
 * @param {number} frames images de 60 Hz écoulées depuis la précédente (0 : figé)
 * @param {number} calm opacité de 0 (saut) à 1 (croisière)
 */
function paintDust(sky, time, frames, calm) {
  const { context, size, pointer, colors } = sky;
  for (const grain of sky.dust) {
    grain.y -= DUST_DRIFT * grain.depth * frames;
    if (grain.y < -2) grain.y = size.height + 2;
    const twinkle = 0.55 + 0.45 * Math.sin((time / 1000) * grain.pace + grain.phase);
    const shift = DUST_PARALLAX * grain.depth;
    context.globalAlpha = grain.alpha * twinkle * calm;
    context.fillStyle = grain.gold ? colors.gold : colors.star;
    context.beginPath();
    context.arc(grain.x - pointer.x * shift, grain.y - pointer.y * shift, grain.r, 0, TAU);
    context.fill();
  }
}

/**
 * @brief Avance les étoiles selon la vitesse et les peint en traits, de leur position
 *   précédente à la nouvelle.
 *
 * @param {object} sky état du ciel (context, size, stars, pointer, colors, speed)
 * @param {number} frames images de 60 Hz écoulées depuis la précédente (0 : figé)
 */
function paintStars(sky, frames) {
  const { context, size, pointer } = sky;
  const centerX = size.width / 2;
  const centerY = size.height / 2;
  context.strokeStyle = sky.colors.star;
  for (const star of sky.stars) {
    star.pz = star.z;
    star.z -= sky.speed * frames;
    if (star.z < 1) placeStar(star, size, size.width);
    else if (star.z > size.width)
      placeStar(star, size, size.width * (0.05 + Math.random() * 0.25));
    const near = 1 - star.z / size.width;
    const x = star.x - pointer.x * STAR_PARALLAX;
    const y = star.y - pointer.y * STAR_PARALLAX;
    const before = FOCAL / star.pz;
    const after = FOCAL / star.z;
    context.globalAlpha = Math.min(1, near * 1.4);
    context.lineWidth = Math.max(0.6, near * 2.2);
    context.beginPath();
    context.moveTo(x * before + centerX, y * before + centerY);
    context.lineTo(x * after + centerX + 0.1, y * after + centerY + 0.1);
    context.stroke();
  }
}

/**
 * @brief Peint une image du ciel : fond, poussière, étoiles.
 *
 * @param {object} sky état du ciel
 * @param {number} time horodatage en ms
 * @param {number} frames images de 60 Hz écoulées depuis la précédente (0 : figé)
 */
function paint(sky, time, frames) {
  const { context, size } = sky;
  const speed = Math.abs(sky.speed);
  context.globalAlpha = speed > TRAIL_SPEED ? 1 - (1 - TRAIL_ALPHA) ** frames : 1;
  context.fillStyle = sky.colors.void;
  context.fillRect(0, 0, size.width, size.height);
  const calm = Math.max(0, 1 - speed / DUST_FADE_SPEED);
  if (calm > 0.01) paintDust(sky, time, frames, calm);
  paintStars(sky, frames);
  context.globalAlpha = 1;
}

/**
 * @brief Anime le ciel de `canvas` et rend ses commandes de vitesse.
 *
 * La boucle tourne tant que l'onglet est visible et que le mouvement n'est pas réduit ;
 * ces deux réglages sont suivis en direct. Couleurs : jetons --void, --star et --accent.
 *
 * @param {HTMLCanvasElement | null} canvas élément canvas#sky
 *
 * @returns {{ warp: (direction: string) => void, calm: () => void }} warp : élan vers
 *   'forward' ou 'backward' ; calm : retour à la vitesse de croisière. Lève si `canvas`
 *   est absent ou n'a pas de contexte 2D
 */
export function createSky(canvas) {
  if (!canvas) throw new Error('starfield : canvas#sky absent de la page');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('starfield : contexte 2D de canvas#sky indisponible');
  const tokens = getComputedStyle(document.documentElement);
  const token = (name) => tokens.getPropertyValue(name).trim();
  const sky = {
    context,
    colors: {
      void: token('--void'),
      star: `rgb(${token('--star')})`,
      gold: token('--accent'),
    },
    size: { width: 0, height: 0 },
    stars: [],
    dust: [],
    pointer: { x: 0, y: 0 },
    speed: BASE_SPEED,
    target: BASE_SPEED,
    ratio: 0,
    raf: 0,
    last: 0,
  };

  /** @brief Image figée à la vitesse de croisière, sans parallaxe. */
  const freeze = () => {
    sky.speed = BASE_SPEED;
    sky.target = BASE_SPEED;
    sky.pointer = { x: 0, y: 0 };
    paint(sky, 0, 0);
  };

  /**
   * @brief Une image de la boucle : vitesse rapprochée de sa cible, puis peinture.
   *
   * @param {DOMHighResTimeStamp} now horodatage de requestAnimationFrame, en ms
   */
  const step = (now) => {
    const dt = Math.min(Math.max(now - sky.last, 0), MAX_DT);
    const frames = dt / FRAME_MS;
    sky.last = now;
    sky.speed += (sky.target - sky.speed) * (1 - (1 - CATCH_UP) ** frames);
    paint(sky, now, frames);
    sky.raf = requestAnimationFrame(step);
  };

  /** @brief Lance ou arrête la boucle selon le mouvement réduit et la visibilité. */
  const sync = () => {
    const still = reduced();
    if (still || document.hidden) {
      cancelAnimationFrame(sky.raf);
      sky.raf = 0;
      if (still) freeze();
      return;
    }
    if (sky.raf) return;
    sky.last = performance.now();
    sky.raf = requestAnimationFrame(step);
  };

  /**
   * @brief Ajuste la définition du canvas à sa taille et à la densité d'écran ; boucle
   *   arrêtée : une image. Sans changement, rien ne se passe.
   *
   * Nouvelle largeur : ciel ressemé ; hauteur seule (barre d'adresse mobile) : étoiles
   * gardées, poussière étirée à la nouvelle hauteur.
   */
  const resize = () => {
    const ratio = Math.min(devicePixelRatio || 1, MAX_PIXEL_RATIO);
    const old = sky.size;
    const size = { width: canvas.clientWidth, height: canvas.clientHeight };
    if (size.width === old.width && size.height === old.height && ratio === sky.ratio) return;
    canvas.width = Math.round(size.width * ratio);
    canvas.height = Math.round(size.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    sky.size = size;
    sky.ratio = ratio;
    if (size.width !== old.width || !old.height) {
      sky.stars = makeStars(size);
      sky.dust = makeDust(size);
    } else {
      for (const grain of sky.dust) grain.y *= size.height / old.height;
    }
    if (!sky.raf) freeze();
  };

  /** @brief Suit la densité d'écran, qui change sans resize d'un écran à l'autre. */
  const watchRatio = () => {
    matchMedia(`(resolution: ${devicePixelRatio}dppx)`).addEventListener(
      'change',
      () => {
        resize();
        watchRatio();
      },
      { once: true },
    );
  };

  addEventListener('resize', resize);
  watchRatio();
  addEventListener('pointermove', (event) => {
    if (!sky.raf) return; // ciel figé : pas de parallaxe
    sky.pointer = {
      x: event.clientX / (sky.size.width || 1) - 0.5,
      y: event.clientY / (sky.size.height || 1) - 0.5,
    };
  });
  document.addEventListener('visibilitychange', sync);
  watchReduced(sync);
  resize();
  sync();
  return {
    /** @brief Élan du saut : `direction` vaut 'forward' ou 'backward'. */
    warp(direction) {
      sky.target = direction === 'backward' ? -WARP_SPEED : WARP_SPEED;
    },

    /** @brief Retour progressif à la vitesse de croisière. */
    calm() {
      sky.target = BASE_SPEED;
    },
  };
}
