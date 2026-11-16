/*
Panneau de compétence de la rubrique Compétences : retour, titre de la constellation, une puce
par étoile, fiche de l'étoile (nom, niveau, flèches, description, projets liés).
Balisage et remplissage de la maquette ; styles dans css/skills.css (flèches, retour et titre
dans css/panel.css).

Contrat :
  createPanel(root, { onBack, onStar, onRelated }) -> { show, update }
  show(index, texts)  affiche l'étoile de rang `index` de `texts.stars` (construit les puces
                      si leur nombre change, sinon réécrit seulement les textes)
  update(texts)       réécrit les textes sans rien reconstruire (bascule de langue) : le focus
                      reste où il est
  texts = { ui, title, stars } : `ui` est `skills` de data/*.json (back, chipsLabel, prev,
  next, related, levels, levelNotes), `title` le titre de la constellation et `stars` les
  étoiles DANS L'ORDRE DU PARCOURS : { name, level, description, projects: [{ id, title }] }.
  La fiche écrit `description`, puis `ui.levelNotes[level]` (même phrase pour un niveau),
  ou `levelNote` de l'étoile quand elle en a une propre.
  onBack() : retour à la vue d'ensemble ; onStar(i) : puce ou flèche vers le rang `i` ;
  onRelated(id, button) : projet lié, le module n'ouvre rien lui-même.
Le DOM se construit une fois ; seul `#skill` est `aria-live`, avec ce qui change seulement.
La classe `.traveling` (fondu pendant un saut) est posée par l'appelant sur `#skill`.
*/
import { el, setRich } from '../core/dom.js';
import { levelRank } from '../core/levels.js';
import { bodyIcon } from './skills-art.js';

/**
 * @brief Monte le panneau dans `root` (le `.focus-panel`) et rend ses points d'entrée.
 *
 * @param {HTMLElement} root conteneur `.focus-panel`, rempli ici une seule fois
 * @param {object} handlers rappels de l'appelant
 * @param {() => void} handlers.onBack bouton retour
 * @param {(index: number) => void} handlers.onStar puce ou flèche, rang dans le parcours
 * @param {(id: string, button: HTMLButtonElement) => void} handlers.onRelated projet lié
 *
 * @returns {{
 *   node: HTMLElement,
 *   show: (index: number, texts: object) => void,
 *   update: (texts: object) => void,
 * }} panneau monté
 */
export function createPanel(root, { onBack, onStar, onRelated }) {
  const state = { index: 0, texts: null, shown: { description: null, rank: null } };
  const backText = document.createTextNode('');
  const back = el('button', { type: 'button', class: 'back' });
  back.append(el('span', { 'aria-hidden': 'true' }, '←'), backText);
  back.addEventListener('click', () => onBack());
  const title = el('p', { class: 'ctitle' });
  const chips = el('div', { class: 'chips', role: 'group' });
  const name = el('h3');
  const level = el('span', { class: 'lvl' });
  const levelText = document.createTextNode('');
  const arrow = (glyph, step) => {
    const button = el('button', { type: 'button' }, glyph);
    button.addEventListener('click', () => onStar(state.index + step));
    return button;
  };
  const prev = arrow('←', -1);
  const next = arrow('→', 1);
  const body = el('div', { class: 'body' });
  const related = el('div', { class: 'related' });
  const skill = el('article', { class: 'skill', id: 'skill', 'aria-live': 'polite' });
  skill.append(
    el('header', {}, el('div', {}, name, level), el('div', { class: 'arrows' }, prev, next)),
    body,
    related,
  );
  root.replaceChildren(back, title, chips, skill);

  /** Texte d'une chaîne de l'interface ; une chaîne absente est signalée, jamais inventée. */
  const label = (key) => {
    const value = state.texts.ui[key];
    if (typeof value !== 'string')
      console.error(`skills-panel : chaîne absente skills.${key}`);
    return value ?? '';
  };

  /** Une puce par étoile : crée ou retire les boutons manquants, réécrit les noms. */
  const syncChips = () => {
    const { stars } = state.texts;
    while (chips.children.length > stars.length) chips.lastElementChild.remove();
    while (chips.children.length < stars.length) {
      const rank = chips.children.length;
      const chip = el('button', { type: 'button' });
      chip.addEventListener('click', () => onStar(rank));
      chips.append(chip);
    }
    [...chips.children].forEach((chip, rank) => {
      if (chip.textContent !== stars[rank].name) chip.textContent = stars[rank].name;
      chip.setAttribute('aria-pressed', String(rank === state.index));
    });
  };

  /** Flèches désactivées aux extrémités ; le focus ne tombe jamais sur `body`. */
  const syncArrows = () => {
    const held = [prev, next].find((button) => button === document.activeElement);
    prev.disabled = state.index === 0;
    next.disabled = state.index === state.texts.stars.length - 1;
    if (!held?.disabled) return;
    const other = held === prev ? next : prev;
    (other.disabled ? chips.children[state.index] : other).focus();
  };

  /** Projets liés : réécrit les titres en place si les projets sont les mêmes. */
  const syncRelated = (projects) => {
    const buttons = [...related.querySelectorAll('button')];
    if (
      buttons.length === projects.length
      && buttons.every((button, i) => button.dataset.id === projects[i].id)
    ) {
      buttons.forEach((button, i) => {
        button.textContent = projects[i].title;
      });
      if (projects.length) related.firstElementChild.textContent = label('related');
      return;
    }
    related.replaceChildren();
    if (!projects.length) return;
    const group = el('div', { class: 'chips' });
    for (const project of projects) {
      const button = el('button', { type: 'button', 'data-id': project.id }, project.title);
      button.addEventListener('click', () => onRelated(project.id, button));
      group.append(button);
    }
    related.append(el('p', {}, label('related')), group);
  };

  /** Fiche de l'étoile courante : n'écrit que ce qui diffère de l'état affiché. */
  const syncSkill = () => {
    const star = state.texts.stars[state.index];
    const rank = Math.max(levelRank(star.level), 0);
    if (name.textContent !== star.name) name.textContent = star.name;
    if (state.shown.rank !== rank) level.replaceChildren(bodyIcon(rank), levelText);
    state.shown.rank = rank;
    const levelName = state.texts.ui.levels?.[star.level] ?? '';
    if (levelText.data !== levelName) levelText.data = levelName;
    const note = star.levelNote ?? state.texts.ui.levelNotes?.[star.level];
    const description = note ? `${star.description} ${note}` : star.description;
    if (state.shown.description !== description) {
      setRich(body, description, `skills.groups[].items[${state.index}].description`);
      state.shown.description = description;
    }
    syncRelated(star.projects);
  };

  /** Textes fixes du panneau : retour, titre, étiquette du groupe de puces, flèches. */
  const syncLabels = () => {
    backText.data = label('back');
    title.textContent = state.texts.title;
    chips.setAttribute('aria-label', label('chipsLabel'));
    prev.setAttribute('aria-label', label('prev'));
    next.setAttribute('aria-label', label('next'));
  };

  const render = () => {
    syncLabels();
    syncChips();
    syncSkill();
    syncArrows();
  };
  return {
    show(index, texts) {
      state.index = index;
      state.texts = texts;
      render();
    },
    update(texts) {
      state.texts = texts;
      render();
    },
  };
}
