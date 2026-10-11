> Prochaine tâche : S7 « Parcours », étape 8/8 : prochaine feuille prête de `arbre-s7.md`. Ensuite la maquette dans l'ordre du plan (S6 « Projets et fiche », S8, S9, S10) jusqu'à une V1 présentable sur ordinateur et mobile, puis le pré-mortem. Contexte des agents : `~/.claude/references/projects/portfolio/contexte.md`. Session Linux : Node 22, ports 5510 à 5519 pour les agents, 5520 et plus pour le moniteur.

## Refonte spatiale

- Suivre `docs/design/plan.md` (validé le 08/10/2026), étapes 4 à 8, sur la branche `redesign/space`.
- S7 « Parcours », étape 8/8 : dérouler `arbre-s7.md` (arbre de feuilles, statuts et faits pour la suite), puis clôturer S7.
- Pré-mortem de la V1, une fois la V1 présentable sur ordinateur et mobile (S10 close ; décision de Louis du 11/10/2026 au soir, qui remplace « avant S9 ») : une feuille en lecture seule par axe (`~/.claude/references/best-practice/arborescence-taches.md`, « Phases d'un projet »), constats triés au backlog, puis arbre de correction ; il couvre les cas niche écartés des sections (largeurs de 200 à 240 px, police à 300 %), à noter ici quand un agent en signale un.
- S8 « Compétences » : les règles de fiche (`.detail`, `.when`, `.count`, `.arrows`, boutons de flèche, `.b-spin`, `.b-drift` et leurs `@keyframes`) ne sont écrites que sous `#journey` dans `css/journey.css` ; les partager avec la fiche des compétences (maquette:400), dans une feuille dédiée plutôt que `css/layout.css` (655 lignes, environ 745 avec elles).
- Étape 5 de S6, S8 et S9 : retirer la rubrique du module de `MOUNTED` dans `tests/browser/unavailable.js` (le panneau « indisponible » ne vaut que pour les rubriques encore montées par `mountSimple`, `docs/design/plan.md:122`).
- S9 « Contact » : étapes 5 à 8 (tests rouges : groupe navigateur `contact`, `tests/unit/contact.test.mjs`). Trois textes du cœur à ajouter dans `data/*.json` (validés, `docs/design/plan.md`, dernière décision de Louis).
- Brief S6 : `#sheet` est un `<aside role="dialog">` repris de la maquette (rôle non admis sur `aside`), à passer en `<div>` ou `<section>` ; le voile `.sheet-bg` transitionne en 0,35 s sans jeton correspondant.
- S10 : `README.md` : le garder en anglais (choix de Louis du 08/10/2026), ajouter la section usage de l'IA et la liste des contributeurs (en dernier), décrire la nouvelle version.
- Reporter dans `data/*.json` les réponses de Louis : ouverture de « Je me présente », relecture des descriptions provisoires et des textes écrits sans source par S2 (`meta.description`, `ui.errors.timeout`, `json`, `schema` et `langSwitch`, résumés des nouvelles cartes et des planètes de la Piscine).
- Supprimer `docs/design/prototype/` une fois la refonte livrée et validée.
- Fin de S9 : supprimer `makeCamera` (`js/core/motion.js`) s'il n'a toujours aucun appelant (prévu par `docs/design/plan.md:35`, inutilisé à S5).
- Fusion dans `main` (décision de Louis du 10/10/2026) : `main` ne garde que le site (`index.html`, `css/`, `js/`, `data/`, `assets/`) et `README.md` ; `todo.md`, `RECAP-*.md`, `content-suggestions.md`, `docs/`, `tests/` et `CLAUDE.md` restent sur la branche de travail, jamais fusionnés.
