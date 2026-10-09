/*
Écran de chargement et d'erreur (#status de index.html), un état à la fois : loading, error,
ready (masqué). Le panneau parle la langue qu'il charge ; ses textes viennent des modèles
<template data-lang> du panneau, puisque les données de cette langue manquent encore (ou ont
échoué). Ces modèles recopient ui.loading et ui.errors de data/*.json : verify() le contrôle.
*/
import { el } from '../core/dom.js';
import { formatParts, otherLang, SUPPORTED } from '../core/i18n.js';

/**
 * @brief Textes des modèles du panneau, par langue puis par chemin (`errors.title`...).
 *
 * @param {HTMLElement} root élément #status
 *
 * @returns {Map<string, Map<string, string>>} textes aux espaces normalisés ; lève une Error
 *   qui nomme la langue si son modèle manque
 */
function readTexts(root) {
  const texts = new Map();
  for (const lang of SUPPORTED) {
    const template = root.querySelector(`template[data-lang="${lang}"]`);
    if (!template) throw new Error(`#status : modèle <template data-lang="${lang}"> absent`);
    texts.set(
      lang,
      new Map(
        [...template.content.querySelectorAll('[data-key]')]
          .map((node) => [node.dataset.key, node.textContent.replace(/\s+/g, ' ').trim()]),
      ),
    );
  }
  return texts;
}

/**
 * @brief Pilote le panneau #status.
 *
 * @param {{ covered?: HTMLElement[], onRetry: (lang: string) => void,
 *   onSwitch: (lang: string) => void }} options éléments rendus inertes hors de l'état
 *   ready, rappel de « Réessayer » (langue en échec), rappel de l'autre langue
 *
 * @returns {object} { state, hasFocus(), loading(lang), error(lang, error), ready(),
 *   verify(lang, ui) }
 */
export function createStatus({ covered = [], onRetry, onSwitch }) {
  const root = document.getElementById('status');
  const title = root.querySelector('#status-title');
  const message = root.querySelector('#status-message');
  const retry = root.querySelector('button[data-action="retry"]');
  const switcher = root.querySelector('button[data-action="switch-lang"]');
  const texts = readTexts(root);
  const loadingTitle = title.textContent;
  let failed = null;

  const text = (lang, key) => {
    const value = texts.get(lang).get(key);
    if (value === undefined)
      throw new Error(`#status : texte ${key} absent du modèle ${lang}`);
    return value;
  };
  const setState = (state, lang) => {
    root.dataset.state = state;
    root.lang = lang ?? root.lang;
    covered.forEach((node) => {
      node.inert = state !== 'ready';
    });
  };
  const announce = (role) => {
    root.setAttribute('role', role);
    if (role === 'status') root.setAttribute('aria-live', 'polite');
    else root.removeAttribute('aria-live');
  };

  retry.addEventListener('click', () => {
    if (root.dataset.state === 'error') onRetry(failed);
  });
  switcher.addEventListener('click', () => {
    if (root.dataset.state === 'error') onSwitch(otherLang(failed));
  });

  return {
    /** @brief État affiché : 'loading', 'error' ou 'ready'. */
    get state() {
      return root.dataset.state;
    },

    /** @brief Vrai si le focus est dans le panneau. */
    hasFocus: () => root.contains(document.activeElement),

    /**
     * @brief État de chargement ; un focus présent dans le panneau passe au titre.
     *
     * @param {string} lang langue chargée (textes du panneau)
     */
    loading(lang) {
      const keepFocus = root.contains(document.activeElement);
      announce('status');
      title.textContent = loadingTitle;
      message.textContent = text(lang, 'loading');
      setState('loading', lang);
      if (keepFocus) title.focus();
    },

    /**
     * @brief État d'erreur : message propre à la cause, boutons, focus sur le titre.
     *
     * @param {string} lang langue en échec (textes du panneau, Réessayer la recharge)
     * @param {{ code: string, status?: number, path?: string }} error LocaleError
     */
    error(lang, error) {
      failed = lang;
      announce('alert');
      title.textContent = text(lang, 'errors.title');
      const parts = formatParts(
        text(lang, `errors.${error.code}`),
        { status: error.status, path: error.path },
      );
      message.replaceChildren(
        ...parts.map((part) => (part.key ? el('code', {}, part.text) : part.text)),
      );
      retry.textContent = text(lang, 'errors.retry');
      switcher.textContent = text(lang, 'errors.langSwitch');
      setState('error', lang);
      title.focus();
    },

    /** @brief Masque le panneau et rend la page interactive. */
    ready() {
      announce('status');
      setState('ready');
    },

    /**
     * @brief Signale en console tout texte du modèle qui diffère de data/<lang>.json.
     *
     * @param {string} lang code de langue
     * @param {object} ui textes `ui` validés de cette langue
     */
    verify(lang, ui) {
      for (const [key, value] of texts.get(lang)) {
        const expected = key.split('.').reduce((node, part) => node?.[part], ui);
        if (expected !== value)
          console.warn(
            `index.html : #status, texte ${key} (${lang}) différent de ` +
              `data/${lang}.json ui.${key}`,
          );
      }
    },
  };
}
