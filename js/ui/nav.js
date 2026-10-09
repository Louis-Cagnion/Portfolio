/*
Barre du site : pilule des rubriques (bureau), barre d'onglets (880 px et moins), bascule de
langue et hauteur mesurée (--bar-h). Les changements de rubrique relèvent du routeur
(js/core/router.js), qui signale la rubrique affichée par markCurrent.
*/
import { el, svg } from '../core/dom.js';
import { listViews } from '../core/router.js';

/* Icônes de la barre d'onglets (tracés 24 × 24 de la maquette), par rubrique. */
const ICONS = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  journey: 'M4 19c4-1 6-5 8-9s5-6 8-6',
  skills: 'M12 3l2.6 5.6L20 9.3l-4 4 1 5.7-5-2.8-5 2.8 1-5.7-4-4 5.4-.7z',
  projects: 'M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 9h18',
  contact: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l9 6 9-6',
};

/**
 * @brief Tient --bar-h à la hauteur réelle de la barre (58 à 70 px selon la largeur).
 *
 * @param {HTMLElement} bar élément header.bar
 */
function trackBarHeight(bar) {
  new ResizeObserver(() => {
    document.documentElement.style.setProperty('--bar-h', `${bar.offsetHeight}px`);
  }).observe(bar);
}

/**
 * @brief Icône d'onglet d'une rubrique.
 *
 * @param {string} id identifiant de rubrique (clé de ICONS)
 *
 * @returns {SVGSVGElement} icône décorative ; lève une Error si la rubrique n'a pas d'icône
 */
function icon(id) {
  if (!Object.hasOwn(ICONS, id)) throw new Error(`nav : aucune icône pour la rubrique ${id}`);
  return svg(
    'svg',
    {
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '1.8',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
    },
    svg('path', { d: ICONS[id] }),
  );
}

/**
 * @brief Construit et pilote la barre.
 *
 * Les rubriques et leur ordre viennent des section.view de main (index.html).
 *
 * @param {{ onLanguage: (lang: string) => void }} options rappel d'un bouton de langue
 *
 * @returns {object} { render(ui), pressLanguage(lang), markCurrent(id) }
 */
export function createNav({ onLanguage }) {
  const bar = document.querySelector('header.bar');
  const pillNav = bar.querySelector('nav.nav');
  const langGroup = bar.querySelector('.lang');
  const tabbar = document.querySelector('nav.tabbar');
  const ids = listViews().map((view) => view.id);
  const pill = el('span', { class: 'pill', 'aria-hidden': 'true' });
  let built = false;

  trackBarHeight(bar);
  langGroup.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-lang]');
    if (button) onLanguage(button.dataset.lang);
  });

  const goButtons = () => [
    ...pillNav.querySelectorAll('[data-go]'),
    ...tabbar.querySelectorAll('[data-go]'),
  ];

  const placePill = () => {
    const active = pillNav.querySelector('[aria-current="page"]');
    if (!active) return;
    pill.style.left = `${active.offsetLeft}px`;
    pill.style.width = `${active.offsetWidth}px`;
  };

  /**
   * @brief Crée les onglets de la pilule et de la barre d'onglets, puis suit leur largeur.
   *
   * Rejouable après un échec : chaque conteneur se remplit d'un bloc, une seule fois.
   *
   * @param {object} ui textes `ui` d'une langue (nav)
   */
  const build = (ui) => {
    const tab = (id, ...content) => el(
      'button',
      { type: 'button', 'data-go': id },
      ...content,
    );
    if (!pillNav.querySelector('[data-go]'))
      pillNav.append(pill, ...ids.map((id) => tab(id, ui.nav[id])));
    if (!tabbar.querySelector('[data-go]'))
      tabbar.append(...ids.map((id) => tab(id, icon(id), el('span', {}, ui.nav[id]))));
    new ResizeObserver(placePill).observe(pillNav);
    document.fonts?.ready.then(placePill); // largeurs des onglets avec les polices chargées
    built = true;
  };

  return {
    /**
     * @brief Crée les onglets au premier appel, puis met à jour leurs libellés.
     *
     * @param {object} ui textes `ui` d'une langue (nav, sections, language)
     */
    render(ui) {
      if (!built) build(ui);
      for (const button of goButtons())
        (button.querySelector('span') ?? button).textContent = ui.nav[button.dataset.go];
      pillNav.setAttribute('aria-label', ui.sections);
      tabbar.setAttribute('aria-label', ui.sections);
      langGroup.setAttribute('aria-label', ui.language);
      placePill();
    },

    /**
     * @brief Marque le bouton de langue choisi (aria-pressed), sans déplacer le focus.
     *
     * @param {string} lang code de langue
     */
    pressLanguage(lang) {
      for (const button of langGroup.querySelectorAll('button[data-lang]'))
        button.setAttribute('aria-pressed', String(button.dataset.lang === lang));
    },

    /**
     * @brief Marque l'onglet de la rubrique affichée (aria-current) et y glisse la pastille.
     *
     * @param {string} id identifiant de rubrique
     */
    markCurrent(id) {
      for (const button of goButtons())
        if (button.dataset.go === id) button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
      placePill();
    },
  };
}
