> Prochaine tâche : étape 7/8 de S3, point IMPORTANT de la revue : une exception hors `LocaleError` (`main.js:202`, `apply()` non protégé, `boot()` sans `catch`) laisse le chargement tourner sans fin. D'abord `tester-opus-high` : tests rouges de la cause `ui.errors.unexpected` (plan.md, schéma et table « Chaînes à créer », mis à jour le 09/10/2026) et fixture ; au passage, `tests/data.test.mjs:67` porte deux instructions sur une ligne. Puis `fixer-opus-high` : cause `unexpected` (données FR/EN, modèles de `index.html`, `schema.js`, `status.js`, `catch` de `main.js`), plus `home.mission` et l'entrée « Entraînement continu » du dossier reformulées selon le plan.

## Refonte spatiale

- Suivre `docs/design/plan.md` (validé le 08/10/2026), étapes 4 à 8, sur la branche `redesign/space`.
- Avant S4 : faire écrire par `tester-opus-high` les tests rouges de ses critères (retour arrière par l'historique, saut avant et arrière selon l'ordre des rubriques, courbure FOV, changement immédiat sous mouvement réduit), aucun n'existant. Brief S4 : la maquette déplace les rubriques dans `#warpStage`, interdit par le plan (« aucun déplacement DOM d'un élément déjà en place »).
- Brief S6 : `#sheet` est un `<aside role="dialog">` repris de la maquette (rôle non admis sur `aside`), à passer en `<div>` ou `<section>` ; le voile `.sheet-bg` transitionne en 0,35 s sans jeton correspondant.
- S10 : `README.md` : le garder en anglais (choix de Louis du 08/10/2026), ajouter la section usage de l'IA et la liste des contributeurs (en dernier), décrire la nouvelle version.
- Reporter dans `data/*.json` les réponses de Louis : ouverture de « Je me présente », relecture des descriptions provisoires et des textes écrits sans source par S2 (`meta.description`, `ui.errors.timeout`, `json`, `schema` et `langSwitch`, résumés des nouvelles cartes et des planètes de la Piscine).
- Supprimer `docs/design/prototype/` une fois la refonte livrée et validée.
- Avant la fusion dans `main` : GitHub Pages servira `todo.md`, `RECAP-*.md` et `content-suggestions.md` (versionnés, anonymisés) ; trancher avec Louis s'ils restent sur `main`.
