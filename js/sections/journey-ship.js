/*
Vaisseau du parcours : pose du dessin sur le tracé (position, cap) et traînée de particules
qu'il laisse en voyage. Valeurs de la maquette (docs/design/prototype/prototype.html:584-731) ;
le dessin du vaisseau est dans journey-art.js, le trajet dans journey.js.
*/
import { svg } from '../core/dom.js';
import { reduced } from '../core/motion.js';

const SHIP_SCALE = 1.3;
const SHIP_NOSE = 13; // distance du centre du vaisseau à sa tuyère, pour la traînée
const HEADING_SPAN = 1.5; // demi-longueur du segment qui donne le cap du vaisseau
const FRAME_MS = 1000 / 60; // image de la maquette : émission et effacement sont réglés dessus
const STEP_MAX_MS = 50; // plafond du pas de temps (onglet masqué, image très tardive)
// fade : vie retirée par image à 60 Hz
const TRAIL = { max: 40, fade: 0.035, jitter: 2, r: 2.2, minR: 0.6, growR: 1.8, alpha: 0.8 };

/**
 * @brief Fabrique le vaisseau : le pose sur le tracé et entretient sa traînée.
 *
 * Les particules vivent dans la fabrique ; elles survivent à une nouvelle pose et s'éteignent
 * d'elles-mêmes. Émission et effacement suivent le temps écoulé (une particule par image à
 * 60 Hz, quelle que soit la cadence réelle). En voyage, l'appelant fait avancer l'effacement
 * à chaque image par fade() : la traînée n'a de boucle propre qu'au repos.
 *
 * @param {SVGElement} art dessin du vaisseau (shipArt)
 * @param {SVGElement} trail groupe qui reçoit les particules de la traînée
 * @param {(d: number) => {x: number, y: number}} pointAt point du tracé à l'abscisse d
 *
 * @returns {{
 *   place: (d: number, dir: number, moving: boolean) => void,
 *   fade: (now?: number) => void
 * }} place(d, dir, moving) : pose le vaisseau à l'abscisse d, cap vers l'avant (dir > 0) ou
 *   l'arrière, poussée allumée si moving ; fade(now) : un pas d'effacement de la traînée à
 *   l'horodatage now (l'instant présent par défaut)
 */
export function makeShip(art, trail, pointAt) {
  let particles = [];
  let frame = 0;
  let fadedAt = null; // horodatage de la dernière image d'effacement
  let emittedAt = null; // date de la dernière pose en voyage ; null au repos
  let owed = 0; // temps de voyage pas encore payé en particules
  let driven = false; // l'appelant anime l'effacement (voyage en cours) : pas de boucle propre

  /**
   * Particules de la traînée : elles pâlissent et rétrécissent, puis disparaissent.
   * @param {number} now horodatage de requestAnimationFrame
   */
  const fadeTrail = (now = performance.now()) => {
    frame = 0;
    const dt = fadedAt === null ? FRAME_MS : Math.max(0, Math.min(now - fadedAt, STEP_MAX_MS));
    fadedAt = now;
    particles = particles.filter((particle) => {
      particle.life -= (TRAIL.fade * dt) / FRAME_MS;
      if (particle.life <= 0) {
        particle.node.remove();
        return false;
      }
      particle.node.setAttribute('r', (TRAIL.minR + TRAIL.growR * particle.life).toFixed(2));
      particle.node.setAttribute('opacity', (particle.life * TRAIL.alpha).toFixed(2));
      return true;
    });
    if (particles.length && !driven) frame = requestAnimationFrame(fadeTrail);
    else if (!particles.length) fadedAt = null;
  };

  /** Fait avancer l'effacement depuis la boucle du trajet ; la boucle propre est annulée. */
  const fade = (now) => {
    driven = true;
    cancelAnimationFrame(frame);
    fadeTrail(now);
  };

  const emitTrail = (x, y) => {
    if (particles.length > TRAIL.max) particles.shift().node.remove();
    const jitter = () => (Math.random() - 0.5) * TRAIL.jitter;
    const node = svg('circle', { cx: x + jitter(), cy: y + jitter(), r: TRAIL.r });
    trail.append(node);
    particles.push({ node, life: 1 });
    if (!frame && !driven) frame = requestAnimationFrame(fadeTrail);
  };

  /** Nombre de particules dues depuis la dernière pose en voyage (une dès la première). */
  const dueParticles = () => {
    const now = performance.now();
    owed += emittedAt === null ? FRAME_MS : Math.min(now - emittedAt, STEP_MAX_MS);
    emittedAt = now;
    const count = Math.floor(owed / FRAME_MS);
    owed -= count * FRAME_MS;
    return count;
  };

  const place = (d, dir, moving) => {
    const a = pointAt(d - HEADING_SPAN);
    const b = pointAt(d + HEADING_SPAN);
    const p = pointAt(d);
    const angle = Math.atan2(b.y - a.y, b.x - a.x) + (dir < 0 ? Math.PI : 0);
    art.setAttribute(
      'transform',
      `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) ` +
        `rotate(${((angle * 180) / Math.PI).toFixed(2)}) scale(${SHIP_SCALE})`,
    );
    art.classList.toggle('thrust', moving);
    if (!moving || reduced()) {
      driven = false;
      emittedAt = null;
      owed = 0;
      if (particles.length && !frame) frame = requestAnimationFrame(fadeTrail);
      return;
    }
    const x = p.x - Math.cos(angle) * SHIP_NOSE;
    const y = p.y - Math.sin(angle) * SHIP_NOSE;
    for (let n = dueParticles(); n > 0; n -= 1) emitTrail(x, y);
  };

  return { place, fade };
}
