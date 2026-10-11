> Prochaine tâche : S7 « Parcours », étape 8/8 : corriger les 8 écarts mineurs du crash-test listés ci-dessous, un fixer à la fois (les visibles comme `.jtitle` se comparent à la maquette, qui fait foi), puis suite complète et clôture de S7. Ensuite S9 « Contact », étape 5/8. Contexte des agents : `~/.claude/references/projects/portfolio/contexte.md`. Session Linux : Node 22, ports 5510 à 5519 pour les agents, 5520 et plus pour le moniteur.

## Refonte spatiale

- Suivre `docs/design/plan.md` (validé le 08/10/2026), étapes 4 à 8, sur la branche `redesign/space`.
- S7 « Parcours », étape 8/8 : corriger les 8 écarts mineurs du crash-test, un fixer à la fois, puis suite complète (scripts et captures du crash-test : scratchpad de la session du 10/10, perdus au redémarrage ; les scénarios ci-dessous suffisent) :
  - focus qui tombe sur `body` quand la largeur franchit 700 px avec une flèche focalisée (la paire masquée passe en `display: none`) : le passer à la flèche équivalente de la paire visible (`docs/design-checklist.md:315`, 319) ;
  - réactiver l'escale déjà choisie réécrit toute la fiche `aria-live` et relance le fondu (texte invisible tant qu'Entrée est maintenue) : n'écrire que ce qui change (`docs/design-checklist.md:322`) ;
  - jusqu'à 3 `requestAnimationFrame` actifs pendant un trajet (boucle `fadeTrail` séparée dans `js/sections/journey-ship.js`), au lieu de 2 (`docs/design-checklist.md:303-304`) ;
  - durée de la traînée liée à la cadence d'images (62 ms à 390 fps, 883 ms à 31 fps) : effacement et émission en fonction du temps écoulé (`docs/design-checklist.md:305`) ;
  - `.jtitle` du téléphone en colonne fixe `left: 112px; right: 62px` (`css/journey.css:292-314`) : titre rogné et passé sous les flèches à 200 et 300 % de police, et dès 320 px en police normale pour « Alternance RNCP6 » ; à exprimer en unités qui suivent la police ;
  - libellés SVG sans troncature : débordement de page avec des titres de 70 caractères ;
  - un layout par image au repos à cause des animations SVG infinies (`css/journey.css:162-204`, 233-241) : batterie sur téléphone, à mesurer et réduire si possible sans changer le rendu ;
  - en anglais, le vaisseau à quai traverse « during the curriculum » (libellé de Codewars) de 701 à 1400 px ;
- S8 « Compétences » : les règles de fiche (`.detail`, `.when`, `.count`, `.arrows`, boutons de flèche, `.b-spin`, `.b-drift` et leurs `@keyframes`) ne sont écrites que sous `#journey` dans `css/journey.css` ; les partager avec la fiche des compétences (maquette:400), dans une feuille dédiée plutôt que `css/layout.css` (655 lignes, environ 745 avec elles).
- Étape 5 de S6, S8 et S9 : retirer la rubrique du module de `MOUNTED` dans `tests/browser/unavailable.js` (le panneau « indisponible » ne vaut que pour les rubriques encore montées par `mountSimple`, `docs/design/plan.md:122`).
- S9 « Contact » : étapes 5 à 8 (tests rouges : groupe navigateur `contact`, `tests/unit/contact.test.mjs`). Trois textes du cœur à ajouter dans `data/*.json` (validés, `docs/design/plan.md`, dernière décision de Louis).
- Brief S6 : `#sheet` est un `<aside role="dialog">` repris de la maquette (rôle non admis sur `aside`), à passer en `<div>` ou `<section>` ; le voile `.sheet-bg` transitionne en 0,35 s sans jeton correspondant.
- S10 : `README.md` : le garder en anglais (choix de Louis du 08/10/2026), ajouter la section usage de l'IA et la liste des contributeurs (en dernier), décrire la nouvelle version.
- Reporter dans `data/*.json` les réponses de Louis : ouverture de « Je me présente », relecture des descriptions provisoires et des textes écrits sans source par S2 (`meta.description`, `ui.errors.timeout`, `json`, `schema` et `langSwitch`, résumés des nouvelles cartes et des planètes de la Piscine).
- Supprimer `docs/design/prototype/` une fois la refonte livrée et validée.
- Fin de S9 : supprimer `makeCamera` (`js/core/motion.js`) s'il n'a toujours aucun appelant (prévu par `docs/design/plan.md:35`, inutilisé à S5).
- Fusion dans `main` (décision de Louis du 10/10/2026) : `main` ne garde que le site (`index.html`, `css/`, `js/`, `data/`, `assets/`) et `README.md` ; `todo.md`, `RECAP-*.md`, `content-suggestions.md`, `docs/`, `tests/` et `CLAUDE.md` restent sur la branche de travail, jamais fusionnés.
