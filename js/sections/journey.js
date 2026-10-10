/*
Parcours : un vaisseau voyage d'escale en escale sur une trajectoire, de la Terre (départ)
à une galaxie (destination), et la fiche de l'escale choisie s'affiche dessous. Au-dessus
de 700 px, courbe horizontale fixe (viewBox 0 0 1100 300) ; à 700 px et moins, courbe
verticale suivie par une caméra, flèches ↑ ↓ sur la scène, et le toucher de l'escale où se
trouve déjà le vaisseau descend à sa fiche. Structure et mouvements de la maquette
(docs/design/prototype/prototype.html:370-387 et 584-731) ; dessins dans journey-art.js,
mise en page dans css/journey.css.
*/
import { BREAKPOINTS, el, setRich, svg } from '../core/dom.js';
import { format } from '../core/i18n.js';
import { ease, lerp, makeCamera, reduced, scrollBehavior } from '../core/motion.js';
import {
  artDefs,
  galaxyScale,
  hasArt,
  isGalaxy,
  shipArt,
  stopArt,
  stopRadius,
} from './journey-art.js';

const WIDE_VIEW = '0 0 1100 300';
const WIDE_TRACK = 'M40 250 C 340 250, 640 220, 990 120';
const ZOOM = 1.3; // pixels affichés par unité du dessin, parcours vertical
const FOCUS_Y = 0.36; // hauteur de la scène où se cadre l'escale choisie
const VIEW_LEFT = 6; // bord gauche de la vue verticale, en unités du dessin
const LANE = { x: 56, sway: 22, swing: 1.3, top: 50, gap: 130, lastGap: 40 };
const DOCK_GAP = 20; // le vaisseau se gare à cette distance du bord de l'astre
const HIT = { vertical: 30, horizontal: 22 }; // rayon minimal de la zone cliquable
const HIT_MARGIN = 6;
const PULSE_MARGIN = 3;
const LABEL = { gap: 16, maxRadius: 34, line: 17, shift: 12, below: 22, above: 26, top: 34 };
const LABEL_LINES = { title: 1, when: 19 }; // lignes sous le centre de l'astre, vertical
const TRIP_MS = 600; // durée de base d'un trajet, plus une part de la distance
const TRIP_MS_PER_UNIT = { vertical: 1.4, horizontal: 1.2 };
const SHIP_SCALE = 1.3;
const SHIP_NOSE = 13; // distance du centre du vaisseau à sa tuyère, pour la traînée
const HEADING_SPAN = 1.5; // demi-longueur du segment qui donne le cap du vaisseau
const TRAIL = { max: 40, fade: 0.035, jitter: 2, r: 2.2, minR: 0.6, growR: 1.8, alpha: 0.8 };
const FADE = [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }];
const FADE_MS = 450;
const ARROWS = { prev: '←', next: '→', up: '↑', down: '↓' };
const BISECT_STEPS = 40;

/**
 * @brief Tracé lisse passant par chaque point (Catmull-Rom en courbes de Bézier).
 *
 * @param {number[][]} points [x, y] dans l'ordre du parcours, au moins un
 *
 * @returns {string} attribut d d'un path
 */
function catmull(points) {
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i - 1] ?? points[i];
    const b = points[i];
    const c = points[i + 1];
    const e = points[i + 2] ?? c;
    d += ` C${b[0] + (c[0] - a[0]) / 6} ${b[1] + (c[1] - a[1]) / 6},` +
      ` ${c[0] - (e[0] - b[0]) / 6} ${c[1] - (e[1] - b[1]) / 6}, ${c[0]} ${c[1]}`;
  }
  return d;
}

/**
 * @brief Construit les éléments d'une escale (zone cliquable, pulsation, astre, textes).
 *
 * @param {{ body: string }} stop escale des données
 * @param {number} index rang de l'escale
 * @param {number} now rang de la position actuelle
 * @param {number} last rang de la destination
 *
 * @returns {object} { g, hit, pulse, art, title, when, body }
 */
function buildStop(stop, index, now, last) {
  const classes = ['wp', index > now ? 'future' : '', index === last ? 'dest' : ''];
  const hit = svg('circle', { class: 'hit' });
  const pulse = index === now ? svg('circle', { class: 'pulse' }) : null;
  const art = svg(
    'g',
    { class: hasArt(stop.body) ? `stop ${stop.body}` : 'stop' },
    ...stopArt(stop.body),
  );
  const title = svg('text');
  const when = svg('text', { class: 'y' });
  const g = svg(
    'g',
    { class: classes.filter(Boolean).join(' '), tabindex: -1, role: 'button' },
    hit,
    pulse,
    art,
    title,
    when,
  );
  return { g, hit, pulse, art, title, when, body: stop.body };
}

/**
 * @brief Monte le parcours : structure construite une fois, insérée d'un bloc.
 *
 * L'escale choisie est gardée par identifiant à la bascule de langue ; la première mise à
 * jour ouvre sur l'escale `now`. Le passage de 700 px reconstruit la géométrie sans
 * recréer d'élément.
 *
 * @param {HTMLElement} root section.view#journey
 *
 * @returns {(content: object) => void} update(content) : textes d'une langue
 */
export function mount(root) {
  const mobile = matchMedia(BREAKPOINTS.mobile);
  const heading = el('h2', { tabindex: '-1' });
  const lede = el('p', { class: 'lede' });
  const track = svg('path', { class: 'track' });
  const done = svg('path', { class: 'done' });
  const stopsLayer = svg('g');
  const trail = svg('g', { class: 'trail' });
  const ship = shipArt();
  const traj = svg(
    'svg',
    { class: 'traj', role: 'group' },
    artDefs(),
    track,
    done,
    stopsLayer,
    trail,
    ship,
  );
  const sceneName = el('b');
  const sceneWhen = el('span');
  const sceneTitle = el('div', { class: 'jtitle' }, sceneName, sceneWhen);
  const up = el('button', { type: 'button' }, ARROWS.up);
  const down = el('button', { type: 'button' }, ARROWS.down);
  const stage = el(
    'div',
    { class: 'jstage' },
    traj,
    sceneTitle,
    el('div', { class: 'stage-arrows' }, up, down),
  );
  const title = el('h3');
  const when = el('span', { class: 'when' });
  const count = el('span', { class: 'count' });
  const prev = el('button', { type: 'button' }, ARROWS.prev);
  const next = el('button', { type: 'button' }, ARROWS.next);
  const body = el('div', { class: 'body' });
  const detail = el(
    'article',
    { class: 'hud detail', 'aria-live': 'polite' },
    el(
      'header',
      {},
      el('div', {}, title, when, count),
      el('div', { class: 'arrows' }, prev, next),
    ),
    body,
  );
  const camera = makeCamera(traj);
  const state = {
    journey: null,
    ids: [], // identifiants des escales construites
    paragraphs: [], // <p> de la fiche de chaque escale, refaits à chaque mise à jour
    stops: [], // éléments de chaque escale (buildStop)
    now: 0,
    cur: 0,
    vertical: mobile.matches,
    lens: [], // abscisse curviligne de chaque escale sur le tracé
    len: 0,
    shipPos: 0,
    shipDir: 1,
    moving: false,
    trip: 0, // numéro du trajet en cours : un trajet dépassé n'écrit plus rien
    shipFrame: 0,
    particles: [],
    trailFrame: 0,
  };
  const last = () => state.stops.length - 1;
  const pointAt = (d) => {
    const p = track.getPointAtLength(Math.min(Math.max(d, 0), state.len));
    // Tracé de longueur nulle (une seule escale) : on le prolonge vers le bas.
    return state.len ? p : { x: p.x, y: p.y + d };
  };
  const radiusOf = (index) => stopRadius(state.stops[index].body, state.vertical);

  /** Où se gare le vaisseau : juste avant l'astre, ou juste après la Terre au départ. */
  const dock = (index) => (index === 0
    ? state.lens[0] + radiusOf(0) + DOCK_GAP
    : state.lens[index] - radiusOf(index) - DOCK_GAP);

  /** Abscisse curviligne du point du tracé vertical d'ordonnée `y` (tracé monotone). */
  const lengthAtY = (y) => {
    let low = 0;
    let high = state.len;
    for (let n = 0; n < BISECT_STEPS; n++) {
      const mid = (low + high) / 2;
      if (track.getPointAtLength(mid).y < y) low = mid;
      else high = mid;
    }
    return (low + high) / 2;
  };

  /**
   * Vue de la caméra qui place l'abscisse `d` à FOCUS_Y de la scène, bord gauche fixe ; scène
   * masquée (sans largeur), la vue ne bouge pas et le ResizeObserver recadre au retour.
   */
  const viewFor = (d) => {
    if (!stage.clientWidth) return { cx: camera.cx, cy: camera.cy, w: camera.w };
    const w = stage.clientWidth / ZOOM;
    const h = w * camera.ratio();
    return { cx: VIEW_LEFT + w / 2, cy: pointAt(d).y + (0.5 - FOCUS_Y) * h, w };
  };

  /**
   * @brief Suit la largeur : géométrie refaite au passage de 700 px, sinon caméra recadrée
   *   sur l'escale choisie (jamais pendant un trajet ni scène masquée).
   */
  const recentre = () => {
    if (!state.stops.length) return;
    if (mobile.matches !== state.vertical) layout();
    else if (state.vertical && !camera.raf && stage.clientWidth)
      camera.set(viewFor(state.lens[state.cur]));
  };

  /** Particules de la traînée : elles pâlissent et rétrécissent, puis disparaissent. */
  const fadeTrail = () => {
    state.particles = state.particles.filter((particle) => {
      particle.life -= TRAIL.fade;
      if (particle.life <= 0) {
        particle.node.remove();
        return false;
      }
      particle.node.setAttribute('r', (TRAIL.minR + TRAIL.growR * particle.life).toFixed(2));
      particle.node.setAttribute('opacity', (particle.life * TRAIL.alpha).toFixed(2));
      return true;
    });
    state.trailFrame = state.particles.length ? requestAnimationFrame(fadeTrail) : 0;
  };

  const emitTrail = (x, y) => {
    if (state.particles.length > TRAIL.max) state.particles.shift().node.remove();
    const jitter = () => (Math.random() - 0.5) * TRAIL.jitter;
    const node = svg('circle', { cx: x + jitter(), cy: y + jitter(), r: TRAIL.r });
    trail.append(node);
    state.particles.push({ node, life: 1 });
    if (!state.trailFrame) state.trailFrame = requestAnimationFrame(fadeTrail);
  };

  /** Pose le vaisseau à l'abscisse courante, tourné selon le tracé et le sens du trajet. */
  const placeShip = (moving) => {
    const d = state.shipPos;
    const a = pointAt(d - HEADING_SPAN);
    const b = pointAt(d + HEADING_SPAN);
    const p = pointAt(d);
    const angle = Math.atan2(b.y - a.y, b.x - a.x) + (state.shipDir < 0 ? Math.PI : 0);
    ship.setAttribute(
      'transform',
      `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) ` +
        `rotate(${((angle * 180) / Math.PI).toFixed(2)}) scale(${SHIP_SCALE})`,
    );
    ship.classList.toggle('thrust', moving);
    if (moving && !reduced())
      emitTrail(p.x - Math.cos(angle) * SHIP_NOSE, p.y - Math.sin(angle) * SHIP_NOSE);
  };

  /** Fin d'un trajet : vaisseau au repos, cap remis vers l'avant, titre de scène affiché. */
  const arrive = () => {
    state.moving = false;
    state.shipDir = 1;
    placeShip(false);
    sceneTitle.classList.remove('out');
  };

  /** Interrompt le trajet en cours (vaisseau, caméra) sans le terminer. */
  const halt = () => {
    state.trip++;
    cancelAnimationFrame(state.shipFrame);
    state.shipFrame = 0;
    if (camera.raf) camera.set({});
  };

  /** Chapeau : consigne des flèches sur le parcours vertical, du pointeur sinon. */
  const showLede = () => {
    const { lede: texts } = state.journey;
    lede.textContent = state.vertical ? texts.arrows : texts.pointer;
  };

  /**
   * Ordre de tabulation des escales : sur le parcours vertical seule l'escale choisie y
   * reste (les flèches changent d'escale), au bureau toutes. Le focus n'est jamais retiré.
   */
  const setTabStops = () => {
    state.stops.forEach((item, index) => {
      const reachable = !state.vertical || index === state.cur;
      item.g.setAttribute('tabindex', reachable ? '0' : '-1');
    });
  };

  /** Textes du titre de scène, de la fiche et état des flèches pour l'escale choisie. */
  const fill = (fade) => {
    const { journey, cur } = state;
    const stop = journey.stops[cur];
    sceneName.textContent = stop.title;
    sceneWhen.textContent = stop.when;
    title.textContent = stop.title;
    when.textContent = stop.when;
    count.textContent = format(journey.counter, { n: cur + 1, total: journey.stops.length });
    body.replaceChildren(...state.paragraphs[cur]);
    if (fade && !reduced()) body.animate(FADE, { duration: FADE_MS, easing: 'ease' });
    prev.disabled = up.disabled = cur === 0;
    next.disabled = down.disabled = cur === last();
    state.stops.forEach((item, index) => item.g.classList.toggle('sel', index === cur));
    setTabStops();
  };

  /** Place tracé, escales et textes du dessin selon l'orientation, puis le vaisseau. */
  const layout = () => {
    halt();
    const vertical = mobile.matches;
    state.vertical = vertical;
    traj.classList.toggle('vertical', vertical);
    let lanes = null;
    if (vertical) {
      lanes = state.stops.map((stop, index) => [
        LANE.x + LANE.sway * Math.sin(index * LANE.swing),
        LANE.top + index * LANE.gap + (index === last() ? LANE.lastGap : 0),
      ]);
      track.setAttribute('d', catmull(lanes));
    } else {
      traj.setAttribute('viewBox', WIDE_VIEW);
      traj.style.removeProperty('--u');
      track.setAttribute('d', WIDE_TRACK);
    }
    done.setAttribute('d', track.getAttribute('d'));
    state.len = track.getTotalLength();
    state.lens = vertical
      ? lanes.map(([, y]) => lengthAtY(y))
      : state.journey.stops.map((stop) => stop.at * state.len);
    done.style.strokeDasharray = state.len;
    done.style.strokeDashoffset = state.len - state.lens[state.now];
    state.stops.forEach((item, index) => placeStop(item, index));
    state.shipPos = dock(state.cur);
    arrive();
    showLede();
    setTabStops();
    recentre();
  };

  /** Pose plusieurs attributs d'un coup sur un élément. */
  const setAttributes = (element, attributes) => {
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
  };

  /** Pose une escale au point du tracé qui lui revient, avec ses deux lignes de texte. */
  const placeStop = (item, index) => {
    const { vertical } = state;
    const p = pointAt(state.lens[index]);
    const radius = radiusOf(index);
    const center = { cx: p.x, cy: p.y };
    const minimum = vertical ? HIT.vertical : HIT.horizontal;
    setAttributes(item.hit, { ...center, r: Math.max(minimum, radius + HIT_MARGIN) });
    if (item.pulse) setAttributes(item.pulse, { ...center, r: radius + PULSE_MARGIN });
    const scale = isGalaxy(item.body) ? ` scale(${galaxyScale(vertical)})` : '';
    item.art.setAttribute('transform', `translate(${p.x} ${p.y})${scale}`);
    let x = p.x - LABEL.shift;
    let y = 0;
    let anchor = 'start';
    if (vertical) x = p.x + Math.min(radius, LABEL.maxRadius) + LABEL.gap;
    else if (index === last() && index > 0) {
      x = p.x;
      y = p.y - radius - LABEL.top;
      anchor = 'middle';
    } else y = index % 2 === 0 ? p.y + radius + LABEL.below : p.y - radius - LABEL.above;
    const lines = vertical
      ? [p.y + LABEL_LINES.title, p.y + LABEL_LINES.when]
      : [y, y + LABEL.line];
    [item.title, item.when].forEach((text, at) => {
      text.setAttribute('x', x);
      text.setAttribute('y', lines[at]);
      text.setAttribute('text-anchor', anchor);
    });
  };

  /**
   * @brief Choisit une escale et y fait voyager le vaisseau (caméra sur téléphone).
   *
   * Un nouveau choix pendant un trajet repart de la position atteinte.
   *
   * @param {number} index rang voulu, ramené entre la première et la dernière escale
   */
  const select = (index) => {
    halt();
    const target = Math.max(0, Math.min(last(), index));
    const trip = state.trip;
    const from = state.shipPos;
    const to = dock(target);
    if (to !== from) state.shipDir = to > from ? 1 : -1;
    state.cur = target;
    fill(true);
    const speed = state.vertical ? TRIP_MS_PER_UNIT.vertical : TRIP_MS_PER_UNIT.horizontal;
    const duration = TRIP_MS + Math.abs(to - from) * speed;
    const travel = (k) => {
      state.shipPos = lerp(from, to, k);
      placeShip(k < 1);
    };
    state.moving = true;
    if (state.vertical) {
      const top = root.getBoundingClientRect().top + scrollY;
      if (scrollY > top) scrollTo({ top, behavior: scrollBehavior() });
      sceneTitle.classList.add('out');
      camera.tween(() => viewFor(state.lens[target]), duration, travel).then(() => {
        if (trip === state.trip) arrive();
      });
      return;
    }
    if (reduced()) {
      travel(1);
      arrive();
      return;
    }
    const start = performance.now();
    const frame = (now) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      travel(ease(t));
      if (t < 1) state.shipFrame = requestAnimationFrame(frame);
      else arrive();
    };
    state.shipFrame = requestAnimationFrame(frame);
  };

  /** Escale touchée : voyage, ou descente à la fiche si le vaisseau y est déjà (vertical). */
  const pick = (index) => {
    if (!state.vertical || index !== state.cur || state.moving) {
      select(index);
      return;
    }
    detail.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
  };

  /** Flèche : pas d'une escale ; à la borne, le focus passe à l'autre flèche de la paire. */
  const bindArrows = (back, forth) => {
    [[back, forth, -1], [forth, back, 1]].forEach(([button, other, dir]) => {
      button.addEventListener('click', () => {
        const focused = document.activeElement === button;
        select(state.cur + dir);
        if (focused && button.disabled) other.focus({ preventScroll: true });
      });
    });
  };
  bindArrows(prev, next);
  bindArrows(up, down);

  /**
   * @brief (Re)construit les escales quand leur liste change (identifiants), sinon les garde.
   *
   * @param {object[]} stops escales des données
   *
   * @returns {boolean} vrai si les escales ont été reconstruites
   */
  const buildStops = (stops) => {
    const ids = stops.map((stop) => stop.id);
    const same = ids.length === state.ids.length &&
      ids.every((id, index) => id === state.ids[index]);
    if (state.stops.length && same) return false;
    const kept = state.ids[state.cur];
    halt();
    state.ids = ids;
    state.now = stops.findIndex((stop) => stop.now);
    if (state.now < 0) {
      console.error('parcours : aucune escale journey.stops[].now, ouverture sur la première');
      state.now = 0;
    }
    const extra = stops.flatMap((stop, at) => (stop.now && at > state.now ? [at] : []));
    if (extra.length) {
      const fields = extra.map((index) => `journey.stops[${index}].now`).join(', ');
      console.error(`parcours : ${fields} en plus de journey.stops[${state.now}].now, ignoré`);
    }
    stops.forEach(({ body }, index) => {
      if (hasArt(body)) return;
      const message = `parcours : journey.stops[${index}].body « ${body} » sans dessin`;
      console.error(`${message}, galaxie à la place`);
    });
    const lastIndex = stops.length - 1;
    state.stops = stops.map((stop, index) => buildStop(stop, index, state.now, lastIndex));
    state.stops.forEach((item, index) => {
      item.g.addEventListener('click', () => pick(index));
      item.g.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        pick(index);
      });
    });
    stopsLayer.replaceChildren(...state.stops.map((item) => item.g));
    const found = stops.findIndex((stop) => stop.id === kept);
    state.cur = found < 0 ? state.now : found;
    return true;
  };

  mobile.addEventListener('change', recentre);
  new ResizeObserver(recentre).observe(stage);
  root.append(heading, lede, stage, detail);

  return ({ journey }) => {
    state.journey = journey;
    heading.textContent = journey.title;
    traj.setAttribute('aria-label', journey.stopsLabel);
    [prev, up].forEach((button) => button.setAttribute('aria-label', journey.prev));
    [next, down].forEach((button) => button.setAttribute('aria-label', journey.next));
    state.paragraphs = journey.stops.map((stop, index) => stop.paragraphs.map((html, at) => {
      const paragraph = el('p');
      setRich(paragraph, html, `journey.stops[${index}].paragraphs[${at}]`);
      return paragraph;
    }));
    const rebuilt = buildStops(journey.stops);
    journey.stops.forEach((stop, index) => {
      const item = state.stops[index];
      item.g.setAttribute('aria-label', `${stop.title}, ${stop.when}`);
      item.title.textContent = stop.title;
      item.when.textContent = stop.when;
    });
    if (rebuilt) layout();
    else showLede();
    fill(false);
  };
}
