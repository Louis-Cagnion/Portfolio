/*
Point d'entrée : charge la langue, rend la barre et les rubriques, gère la bascule FR/EN et
l'écran #status. boot(env) est injectable (tests/browser/README.md) ; le module s'amorce seul,
sauf sur <html data-noboot>.
*/
import { cachedLocale, loadLocale, LocaleError } from './core/data.js';
import { el, setRich } from './core/dom.js';
import { initialLang, otherLang } from './core/i18n.js';
import { createNav } from './ui/nav.js';
import { createStatus } from './ui/status.js';

const STORAGE_KEY = 'lang';

/* Stockage de la page, lu à chaque appel : y accéder peut lever (navigation privée). */
const pageStorage = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
};

/**
 * @brief Lecture et écriture du choix de langue, sans jamais lever.
 *
 * Un stockage qui lève est signalé une seule fois en console ; la langue reste alors celle
 * de la session.
 *
 * @param {Storage | object | null} storage API getItem/setItem (localStorage ou faux stockage)
 *
 * @returns {{ read: () => string | null, write: (lang: string) => void }} accès au choix
 */
function languageMemory(storage) {
  let warned = false;
  const attempt = (action, fallback) => {
    try {
      return action();
    } catch (error) {
      if (!warned) console.warn(`Choix de langue non mémorisé : stockage indisponible ` +
        `(${error?.message})`);
      warned = true;
      return fallback;
    }
  };
  return {
    read: () => attempt(() => storage?.getItem(STORAGE_KEY) ?? null, null),
    write: (lang) => attempt(() => storage?.setItem(STORAGE_KEY, lang)),
  };
}

/**
 * @brief Monte le contenu minimal d'une rubrique : titre h2 et chapeau.
 *
 * @param {HTMLElement} root section.view de la rubrique
 * @param {(content: object) => string[]} pick [titre, chapeau] tirés des données d'une langue
 *
 * @returns {(content: object) => void} mise à jour des textes pour une langue
 */
function mountSimple(root, pick) {
  const title = el('h2', { tabindex: '-1' });
  const lede = el('p', { class: 'lede' });
  root.append(title, lede);
  return (content) => {
    [title.textContent, lede.textContent] = pick(content);
  };
}

/**
 * @brief Monte l'accueil minimal : mission, nom, accroche, appels et dossier du pilote.
 *
 * @param {HTMLElement} root section.view#home
 *
 * @returns {(content: object) => void} mise à jour des textes pour une langue
 */
function mountHome(root) {
  const mission = el('p', { class: 'mission' });
  const name = el('h1', { tabindex: '-1' });
  const pitch = el('p', { class: 'pitch' });
  const toProjects = el('button',
    { type: 'button', class: 'btn primary', 'data-go': 'projects' });
  const toContact = el('button', { type: 'button', class: 'btn', 'data-go': 'contact' });
  const kicker = el('p', { class: 'kicker' });
  const title = el('h2', { tabindex: '-1' });
  const entries = el('dl', { class: 'hud dossier-body' });
  root.append(mission, name, pitch, el('div', { class: 'ctas' }, toProjects, toContact),
    el('section', { class: 'dossier', id: 'dossier' }, kicker, title, entries));
  return ({ home }) => {
    mission.textContent = home.mission;
    name.textContent = home.name;
    pitch.textContent = home.pitch;
    toProjects.textContent = home.ctas.projects;
    toContact.textContent = home.ctas.contact;
    kicker.textContent = home.dossier.kicker;
    title.textContent = home.dossier.title;
    entries.replaceChildren(...home.dossier.entries.map((entry, index) => {
      const body = el('p', { class: 'body' });
      setRich(body, entry.html, `home.dossier.entries[${index}].html`);
      return el('div', {}, el('dt', {}, entry.label), el('dd', {}, body));
    }));
  };
}

/* Contenu minimal de chaque rubrique, par identifiant de section.view, en attendant les
modules js/sections/ (S5 à S9) : chaque montage rend la mise à jour des textes. */
const MOUNTS = {
  home: mountHome,
  journey: (root) => mountSimple(root, (c) => [c.journey.title, c.journey.lede.pointer]),
  skills: (root) => mountSimple(root, (c) => [c.skills.title, c.skills.lede]),
  projects: (root) => mountSimple(root, (c) => [c.projects.title, c.projects.lede]),
  contact: (root) => mountSimple(root, (c) => [c.contact.title, c.contact.question]),
};

/**
 * @brief Amorce le site : langue initiale, chargement, rendu, bascule de langue.
 *
 * Seule la dernière demande de langue s'applique ; une langue déjà chargée s'affiche sans
 * écran de chargement. L'autre langue est préchargée après le premier rendu.
 *
 * @param {{ fetch?: Function, storage?: object | null, timeoutMs?: number }} [env] fetch
 *   (celui de la page par défaut), stockage du choix (localStorage par défaut), délai de
 *   chargement en ms (10 000 par défaut)
 *
 * @returns {Promise<void>} résolue quand le premier chargement aboutit ou s'affiche en erreur
 */
export function boot(env = {}) {
  const { fetch = (...args) => window.fetch(...args), storage = pageStorage, timeoutMs } = env;
  const memory = languageMemory(storage);
  const app = { shown: null, wanted: null, ticket: 0, updates: [] };

  /** @brief Monte le contenu minimal de chaque rubrique (une fois). */
  const mountSections = () => {
    for (const view of document.querySelectorAll('main > section.view')) {
      if (!Object.hasOwn(MOUNTS, view.id)) {
        throw new Error(`main : rubrique #${view.id} sans contenu prévu dans MOUNTS`);
      }
      app.updates.push(MOUNTS[view.id](view));
    }
  };

  /**
   * @brief Précharge une langue sans l'afficher ; un échec reviendra si elle est choisie.
   *
   * @param {string} lang code de langue
   */
  const preload = (lang) => {
    loadLocale(lang, { fetch, timeoutMs }).then(
      (content) => status.verify(lang, content.ui),
      (error) => console.warn(`Langue ${lang} non préchargée (nouvel essai si elle est ` +
        `choisie) : ${error.message}`),
    );
  };

  /**
   * @brief Affiche une langue chargée : textes, attributs de la page, fin du chargement.
   *
   * @param {string} lang code de langue
   * @param {object} content JSON validé de cette langue
   */
  const apply = (lang, content) => {
    const first = app.shown === null;
    if (first) mountSections();
    if (lang !== app.shown) {
      app.updates.forEach((update) => update(content));
      nav.render(content.ui);
      status.verify(lang, content.ui);
      app.shown = lang;
    }
    document.documentElement.lang = lang;
    document.title = content.meta.title;
    document.querySelector('meta[name="description"]').content = content.meta.description;
    document.getElementById('close').setAttribute('aria-label', content.ui.close);
    memory.write(lang);
    const hadFocus = status.hasFocus();
    status.ready();
    if (first) {
      nav.start();
      preload(otherLang(lang));
    }
    if (hadFocus) nav.focusCurrent();
  };

  /**
   * @brief Demande une langue : affichage immédiat si elle est en cache, sinon chargement.
   *
   * @param {string} lang code de langue
   *
   * @returns {Promise<void>} résolue une fois la langue affichée, l'erreur affichée, ou la
   *   demande dépassée par une plus récente
   */
  const request = async (lang) => {
    const ticket = ++app.ticket;
    app.wanted = lang;
    nav.pressLanguage(lang);
    const cached = cachedLocale(lang);
    if (cached) {
      apply(lang, cached);
      return;
    }
    status.loading(lang);
    let content;
    try {
      content = await loadLocale(lang, { fetch, timeoutMs });
    } catch (error) {
      if (ticket !== app.ticket) return;
      if (!(error instanceof LocaleError)) throw error;
      status.error(lang, error);
      return;
    }
    if (ticket === app.ticket) apply(lang, content);
  };

  const nav = createNav({
    onLanguage: (lang) => {
      if (lang !== app.wanted || status.state === 'error') request(lang);
    },
  });
  const status = createStatus({
    covered: [document.querySelector('main')],
    onRetry: request,
    onSwitch: request,
  });
  return request(initialLang(memory.read()));
}

if (!document.documentElement.hasAttribute('data-noboot')) boot();
