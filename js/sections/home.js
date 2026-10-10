/*
Accueil : mission, nom, accroche, appels à l'action, télémétrie, repère « Dossier du pilote »
qui s'efface à l'arrivée du dossier, puis dossier du pilote. Structure de la maquette
(docs/design/prototype/prototype.template.html:344-368) ; mise en page dans css/home.css.
*/
import { el, setRich } from '../core/dom.js';
import { reduced } from '../core/motion.js';
import { opensElsewhere } from '../core/router.js';

const CUE_ZONE = '0px 0px -15% 0px'; // le repère s'efface quand le dossier passe ce seuil
const ARROW = '↓';

/**
 * @brief Ligne dt + dd de la télémétrie.
 *
 * @param {{ label: string, value: string, live: boolean }} row ligne des données
 *
 * @returns {HTMLDivElement} div > dt + dd, dd.live si la ligne est en direct
 */
function telemetryRow({ label, value, live }) {
  return el('div', {}, el('dt', {}, label), el('dd', { class: live ? 'live' : null }, value));
}

/**
 * @brief Ligne dt + dd du dossier du pilote ; le HTML de l'entrée passe par setRich.
 *
 * @param {{ label: string, html: string }} entry entrée des données
 * @param {number} index rang de l'entrée (nom du champ dans le diagnostic de setRich)
 *
 * @returns {HTMLDivElement} div > dt + dd > p.body
 */
function dossierRow(entry, index) {
  const body = el('p', { class: 'body' });
  setRich(body, entry.html, `home.dossier.entries[${index}].html`);
  return el('div', {}, el('dt', {}, entry.label), el('dd', {}, body));
}

/**
 * @brief Fait défiler la page jusqu'au dossier, en douceur sauf sous mouvement réduit.
 *
 * Le repère s'efface à l'arrivée du dossier : le focus passe au titre du dossier, sans
 * défilement, pour que l'utilisateur au clavier garde sa place. Un clic qui ouvre le lien à
 * part (touche de modification, bouton autre que le principal), ou pendant un saut, est
 * laissé au navigateur : le routeur termine le saut puis amène l'ancre.
 *
 * @param {HTMLElement} dossier section du dossier du pilote
 * @param {HTMLElement} title titre h2 du dossier (tabindex="-1"), reçoit le focus
 * @param {MouseEvent} event activation du repère (le lien natif est remplacé, sans changer le
 *   hash, sauf si opensElsewhere ou un saut en cours le réserve au navigateur)
 */
function scrollToDossier(dossier, title, event) {
  if (opensElsewhere(event) || document.documentElement.hasAttribute('data-warp')) return;
  event.preventDefault();
  dossier.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth' });
  title.focus({ preventScroll: true });
}

/**
 * @brief Monte l'accueil : structure construite une fois, insérée d'un bloc.
 *
 * Le repère porte .gone quand le dossier est entré dans la zone CUE_ZONE de l'écran.
 *
 * @param {HTMLElement} root section.view#home
 *
 * @returns {(content: object) => void} update(content) : textes d'une langue
 */
export function mount(root) {
  const mission = el('p', { class: 'mission' });
  const name = el('h1', { tabindex: '-1' });
  const pitch = el('p', { class: 'pitch' });
  const toProjects = el(
    'button',
    { type: 'button', class: 'btn primary', 'data-go': 'projects' },
  );
  const toContact = el('button', { type: 'button', class: 'btn', 'data-go': 'contact' });
  const telemetryTitle = el('h3');
  const rows = el('dl', { class: 'rows' });
  const hero = el(
    'div',
    { class: 'hero' },
    el('div', {}, mission, name, pitch, el('div', { class: 'ctas' }, toProjects, toContact)),
    el('aside', { class: 'hud telemetry' }, telemetryTitle, rows),
  );
  const cueLabel = document.createTextNode('');
  const cue = el(
    'a',
    { class: 'cue', id: 'cue', href: '#dossier' },
    cueLabel,
    el('span', { 'aria-hidden': 'true' }, ARROW),
  );
  const kicker = el('p', { class: 'kicker' });
  const title = el('h2', { tabindex: '-1' });
  const entries = el('dl', { class: 'hud dossier-body' });
  const dossier = el('section', { class: 'dossier', id: 'dossier' }, kicker, title, entries);
  cue.addEventListener('click', (event) => scrollToDossier(dossier, title, event));
  const watcher = new IntersectionObserver(
    ([entry]) => cue.classList.toggle('gone', entry.isIntersecting),
    { rootMargin: CUE_ZONE },
  );
  watcher.observe(dossier);
  root.append(hero, cue, dossier);
  return ({ home }) => {
    mission.textContent = home.mission;
    name.textContent = home.name;
    pitch.textContent = home.pitch;
    toProjects.textContent = home.ctas.projects;
    toContact.textContent = home.ctas.contact;
    telemetryTitle.textContent = home.telemetry.title;
    rows.replaceChildren(...home.telemetry.rows.map(telemetryRow));
    cueLabel.data = home.dossier.kicker;
    kicker.textContent = home.dossier.kicker;
    title.textContent = home.dossier.title;
    entries.replaceChildren(...home.dossier.entries.map(dossierRow));
  };
}
