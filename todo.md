> Prochaine tâche : S7 « Parcours », étape 7/8 : finir les correctifs listés ci-dessous, un fixer à la fois, puis l'étape 8/8. Ensuite S9 « Contact », étape 5/8. Contexte des agents : `~/.claude/references/projects/portfolio/contexte.md`. Session Linux : Node 22, ports 5510 à 5519 pour les agents, 5520 et plus pour le moniteur.

## Refonte spatiale

- Suivre `docs/design/plan.md` (validé le 08/10/2026), étapes 4 à 8, sur la branche `redesign/space`.
- S7 « Parcours », étape 7/8, correctifs restants de la revue, un fixer à la fois :
  - robustesse de `js/sections/journey.js` : `viewFor` sur scène masquée (`clientWidth` nul), `setRich` rejoué à chaque sélection (un paragraphe mal formé signalé plusieurs fois), vaisseau garé sur l'astre avec une seule escale en vertical, deux `now` et `body` avec espace non signalés ; au bureau, clic sur l'escale actuelle qui rejoue flamme, traînée et fondu comme la maquette (`pickStop` → `select`) ;
  - règles de fiche partagées (`.detail`, `.when`, `.count`, `.arrows`, boutons de flèche, `.b-spin`, `.b-drift` et leurs `@keyframes`) déplacées de `css/journey.css` vers `css/layout.css` pour S8 ;
  - `mount` (environ 390 lignes) scindé : construction du DOM et fabrique du vaisseau et de sa traînée hors de `mount`.
- S7 étape 8/8 : suite complète, vérification en vrai Chrome (trajet animé, focus clavier, mouvement réduit), chasse aux cas limites.
- Étape 5 de S6, S8 et S9 : retirer la rubrique du module de `MOUNTED` dans `tests/browser/unavailable.js` (le panneau « indisponible » ne vaut que pour les rubriques encore montées par `mountSimple`, `docs/design/plan.md:122`).
- S9 « Contact » : étapes 5 à 8 (tests rouges : groupe navigateur `contact`, `tests/unit/contact.test.mjs`). Trois textes du cœur à ajouter dans `data/*.json` (validés, `docs/design/plan.md`, dernière décision de Louis).
- Brief S6 : `#sheet` est un `<aside role="dialog">` repris de la maquette (rôle non admis sur `aside`), à passer en `<div>` ou `<section>` ; le voile `.sheet-bg` transitionne en 0,35 s sans jeton correspondant.
- S10 : `README.md` : le garder en anglais (choix de Louis du 08/10/2026), ajouter la section usage de l'IA et la liste des contributeurs (en dernier), décrire la nouvelle version.
- Reporter dans `data/*.json` les réponses de Louis : ouverture de « Je me présente », relecture des descriptions provisoires et des textes écrits sans source par S2 (`meta.description`, `ui.errors.timeout`, `json`, `schema` et `langSwitch`, résumés des nouvelles cartes et des planètes de la Piscine).
- Supprimer `docs/design/prototype/` une fois la refonte livrée et validée.
- Fin de S9 : supprimer `makeCamera` (`js/core/motion.js`) s'il n'a toujours aucun appelant (prévu par `docs/design/plan.md:35`, inutilisé à S5).
- Fusion dans `main` (décision de Louis du 10/10/2026) : `main` ne garde que le site (`index.html`, `css/`, `js/`, `data/`, `assets/`) et `README.md` ; `todo.md`, `RECAP-*.md`, `content-suggestions.md`, `docs/`, `tests/` et `CLAUDE.md` restent sur la branche de travail, jamais fusionnés.
