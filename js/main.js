/*
Point d'entrée : charge la langue, rend la barre et les rubriques, démarre le ciel et la
navigation, gère la bascule FR/EN et l'écran #status. boot(env) est injectable
(tests/browser/README.md) ; le module s'amorce seul, sauf sur <html data-noboot>.
*/
import { cachedLocale, loadLocale, LocaleError } from './core/data.js';
import { el, setRich } from './core/dom.js';
import { initialLang, otherLang } from './core/i18n.js';
import { createRouter, listViews } from './core/router.js';
import { createNav } from './ui/nav.js';
import { createSky } from './ui/starfield.js';
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
      if (!warned)
        console.warn(
          `Choix de langue non mémorisé : stockage indisponible (${error?.message})`,
        );
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
  const toProjects = el(
    'button',
    { type: 'button', class: 'btn primary', 'data-go': 'projects' },
  );
  const toContact = el('button', { type: 'button', class: 'btn', 'data-go': 'contact' });
  const kicker = el('p', { class: 'kicker' });
  const title = el('h2', { tabindex: '-1' });
  const entries = el('dl', { class: 'hud dossier-body' });
  root.append(
    mission,
    name,
    pitch,
    el('div', { class: 'ctas' }, toProjects, toContact),
    el('section', { class: 'dossier', id: 'dossier' }, kicker, title, entries),
  );
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

/**
 * @brief Démarre le ciel animé de canvas#sky ; son échec (décor seul) part en console.error.
 *
 * @returns {{ warp: Function, calm: Function } | null} commandes du ciel, null en cas d'échec
 */
function startSky() {
  try {
    return createSky(document.getElementById('sky'));
  } catch (error) {
    console.error('main : ciel #sky non affiché', error);
    return null;
  }
}

/* Contenu minimal de chaque rubrique, par identifiant de section.view, en attendant les
modules js/sections/ (S5 à S9) : chaque montage insère sa structure d'un bloc, en dernier
(rien s'il lève), et rend la mise à jour des textes. */
const MOUNTS = {
  home: mountHome,
  journey: (root) => mountSimple(root, (c) => [c.journey.title, c.journey.lede.pointer]),
  skills: (root) => mountSimple(root, (c) => [c.skills.title, c.skills.lede]),
  projects: (root) => mountSimple(root, (c) => [c.projects.title, c.projects.lede]),
  contact: (root) => mountSimple(root, (c) => [c.contact.title, c.contact.question]),
};

/**
 * @brief Amorce le site : ciel, langue initiale, chargement, rendu, navigation, bascule de
 *   langue.
 *
 * Seule la dernière demande de langue s'applique ; une langue déjà chargée s'affiche sans
 * écran de chargement, sauf par Réessayer. L'autre langue est préchargée après le premier
 * rendu. Toute exception levée après la création du panneau #status aboutit à son écran
 * d'erreur ; l'échec de cette création part seul en console.error.
 *
 * @param {{ fetch?: Function, storage?: object | null, timeoutMs?: number }} [env] fetch
 *   (celui de la page par défaut), stockage du choix (localStorage par défaut), délai de
 *   chargement en ms (10 000 par défaut)
 *
 * @returns {Promise<void>} jamais rejetée ; résolue quand le premier chargement aboutit ou
 *   s'affiche en erreur
 */
export function boot(env = {}) {
  const { fetch = (...args) => window.fetch(...args), storage = pageStorage, timeoutMs } = env;
  const memory = languageMemory(storage);
  const app = {
    shown: null,
    wanted: null,
    ticket: 0,
    started: false,
    updates: new Map(),
  };

  /** @brief Monte le contenu minimal de chaque rubrique pas encore montée. */
  const mountSections = () => {
    for (const view of listViews()) {
      if (app.updates.has(view)) continue;
      if (!Object.hasOwn(MOUNTS, view.id))
        throw new Error(`main : rubrique #${view.id} sans contenu prévu dans MOUNTS`);
      app.updates.set(view, MOUNTS[view.id](view));
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
      (error) => console.warn(
        `Langue ${lang} non préchargée (nouvel essai si elle est choisie) : ${error.message}`,
      ),
    );
  };

  /**
   * @brief Affiche une langue chargée : textes, attributs de la page, fin du chargement.
   *
   * Rejouable après une exception : chaque rubrique est montée et la barre démarrée une
   * seule fois ; app.shown ne nomme que la langue dont tous les textes sont en place.
   *
   * @param {string} lang code de langue
   * @param {object} content JSON validé de cette langue
   */
  const apply = (lang, content) => {
    mountSections();
    if (lang !== app.shown) {
      app.shown = null;
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
    if (!app.started) {
      app.started = true;
      router.start();
      preload(otherLang(lang));
    }
    if (hadFocus) router.focusCurrent();
  };

  /**
   * @brief Affiche l'échec d'une langue sans jamais lever.
   *
   * Une exception autre que LocaleError part en console.error (le panneau n'en montre que
   * errors.unexpected), de même qu'un échec du panneau lui-même.
   *
   * @param {string} lang code de langue
   * @param {unknown} error valeur levée au chargement ou à l'affichage
   */
  const fail = (lang, error) => {
    if (!(error instanceof LocaleError))
      console.error(`main : langue ${lang} non affichée (exception inattendue)`, error);
    try {
      status.error(lang, error);
    } catch (panelError) {
      console.error('main : écran d\'erreur impossible à afficher', panelError);
    }
  };

  /**
   * @brief Demande une langue : affichage immédiat si elle est en cache, sinon chargement.
   *
   * Crée la barre et le routeur s'ils n'existent pas encore. Toute exception, à ces
   * créations, au chargement ou à l'affichage, aboutit à l'erreur de cette langue.
   *
   * @param {string} lang code de langue
   * @param {{ reload?: boolean }} [options] reload : passe par l'état de chargement même si
   *   la langue est en cache (Réessayer)
   *
   * @returns {Promise<void>} jamais rejetée ; résolue une fois la langue affichée, l'erreur
   *   affichée, ou la demande dépassée par une plus récente
   */
  const request = async (lang, { reload = false } = {}) => {
    const ticket = ++app.ticket;
    app.wanted = lang;
    try {
      nav ??= createNav({ onLanguage });
      router ??= createRouter({ onView: (id) => nav.markCurrent(id), sky });
      nav.pressLanguage(lang);
      const cached = reload ? null : cachedLocale(lang);
      if (!cached) status.loading(lang);
      const content = cached ?? (await loadLocale(lang, { fetch, timeoutMs }));
      if (ticket === app.ticket) apply(lang, content);
    } catch (error) {
      if (ticket === app.ticket) fail(lang, error);
    }
  };

  /**
   * @brief Bouton de langue de la barre : demande cette langue si elle ne l'est pas déjà
   *   ou si l'écran d'erreur est affiché.
   *
   * @param {string} lang code de langue
   */
  const onLanguage = (lang) => {
    if (lang !== app.wanted || status.state === 'error') request(lang);
  };

  let nav = null; // barre et routeur créés par request() ; création rejouée tant qu'elle lève
  let router = null;
  let status;
  try {
    status = createStatus({
      covered: [document.querySelector('main')],
      onRetry: (lang) => request(lang, { reload: true }),
      onSwitch: (lang) => request(lang),
    });
  } catch (error) {
    console.error('main : panneau #status impossible à créer, site non affiché', error);
    return Promise.resolve();
  }
  const sky = startSky();
  return request(initialLang(memory.read()));
}

if (!document.documentElement.hasAttribute('data-noboot')) boot();
