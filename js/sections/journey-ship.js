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
const TRAIL = { max: 40, fade: 0.035, jitter: 2, r: 2.2, minR: 0.6, growR: 1.8, alpha: 0.8 };

/**
 * @brief Fabrique le vaisseau : le pose sur le tracé et entretient sa traînée.
 *
 * Les particules vivent dans la fabrique ; elles survivent à une nouvelle pose et s'éteignent
 * d'elles-mêmes.
 *
 * @param {SVGElement} art dessin du vaisseau (shipArt)
 * @param {SVGElement} trail groupe qui reçoit les particules de la traînée
 * @param {(d: number) => {x: number, y: number}} pointAt point du tracé à l'abscisse d
 *
 * @returns {{ place: (d: number, dir: number, moving: boolean) => void }} place(d, dir,
 *   moving) : pose le vaisseau à l'abscisse d, cap vers l'avant (dir > 0) ou l'arrière,
 *   poussée allumée si moving
 */
export function makeShip(art, trail, pointAt) {
  let particles = [];
  let frame = 0;

  /** Particules de la traînée : elles pâlissent et rétrécissent, puis disparaissent. */
  const fadeTrail = () => {
    particles = particles.filter((particle) => {
      particle.life -= TRAIL.fade;
      if (particle.life <= 0) {
        particle.node.remove();
        return false;
      }
      particle.node.setAttribute('r', (TRAIL.minR + TRAIL.growR * particle.life).toFixed(2));
      particle.node.setAttribute('opacity', (particle.life * TRAIL.alpha).toFixed(2));
      return true;
    });
    frame = particles.length ? requestAnimationFrame(fadeTrail) : 0;
  };

  const emitTrail = (x, y) => {
    if (particles.length > TRAIL.max) particles.shift().node.remove();
    const jitter = () => (Math.random() - 0.5) * TRAIL.jitter;
    const node = svg('circle', { cx: x + jitter(), cy: y + jitter(), r: TRAIL.r });
    trail.append(node);
    particles.push({ node, life: 1 });
    if (!frame) frame = requestAnimationFrame(fadeTrail);
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
    if (moving && !reduced())
      emitTrail(p.x - Math.cos(angle) * SHIP_NOSE, p.y - Math.sin(angle) * SHIP_NOSE);
  };

  return { place };
}
