/*
Garde-fou de démarrage, script classique (non module) pour s'exécuter même quand le graphe de
modules de js/main.js échoue (fichier introuvable, réseau coupé, erreur de syntaxe). Si, au
DOMContentLoaded, <html> ne porte ni data-booted (posé par js/main.js) ni data-noboot (banc de
tests), le panneau #status passe en erreur avec les textes de ses modèles <template data-lang>.
*/
(function guardBoot() {
  'use strict';

  /**
   * @brief Langue du panneau : `lang` du stockage local si c'est `fr` ou `en`, sinon `fr`.
   *
   * @returns {string} code de langue ; le stockage indisponible n'est jamais fatal
   */
  function storedLang() {
    try {
      const lang = window.localStorage.getItem('lang');
      return lang === 'fr' || lang === 'en' ? lang : 'fr';
    } catch {
      return 'fr';
    }
  }

  /**
   * @brief Texte d'une clé `data-key` du modèle d'une langue.
   *
   * @param {HTMLElement} root élément #status
   * @param {string} lang code de langue
   * @param {string} key clé du texte (`errors.boot`...)
   *
   * @returns {string} texte aux espaces normalisés ; vide si le modèle ou la clé manque
   */
  function templateText(root, lang, key) {
    const template = root.querySelector(`template[data-lang="${lang}"]`);
    const node = template?.content.querySelector(`[data-key="${key}"]`);
    return node ? node.textContent.replace(/\s+/g, ' ').trim() : '';
  }

  /** @brief Passe #status en erreur de démarrage si les modules ne se sont pas lancés. */
  function showBootError() {
    const html = document.documentElement;
    if (html.hasAttribute('data-noboot') || html.hasAttribute('data-booted')) return;
    const root = document.getElementById('status');
    const title = root?.querySelector('#status-title');
    const message = root?.querySelector('#status-message');
    const retry = root?.querySelector('button[data-action="retry"]');
    const switcher = root?.querySelector('button[data-action="switch-lang"]');
    if (!title || !message || !retry || !switcher) return;
    const lang = storedLang();
    title.textContent = templateText(root, lang, 'errors.title');
    message.textContent = templateText(root, lang, 'errors.boot');
    retry.textContent = templateText(root, lang, 'errors.retry');
    retry.addEventListener('click', () => window.location.reload());
    switcher.hidden = true;
    root.setAttribute('role', 'alert');
    root.removeAttribute('aria-live');
    root.lang = lang;
    root.dataset.state = 'error';
    title.focus();
  }

  document.addEventListener('DOMContentLoaded', showBootError);
}());
