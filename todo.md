> Prochaine tâche : S5 (étape 5/8, accueil et dossier du pilote), à ne lancer qu'au feu vert de Louis. Avant : tests rouges de S5 s'il en manque (relire la ligne S5 de `docs/design/plan.md` et les tests existants).

## Refonte spatiale

- Suivre `docs/design/plan.md` (validé le 08/10/2026), étapes 4 à 8, sur la branche `redesign/space`.
- `tests/browser/warp.js:28` fixe `WARP_MS = 1020` en dur alors que `js/core/router.js` lit la durée du saut dans `--dur-warp-out` et `--dur-warp-in` : faire lire au test les mêmes jetons.
- Lanceur headless de l'annexe de `RECAP-09-10.md` : port CDP fixe 9333, deux suites lancées en même temps entrent en conflit ; prendre un port libre.
- Brief S6 : `#sheet` est un `<aside role="dialog">` repris de la maquette (rôle non admis sur `aside`), à passer en `<div>` ou `<section>` ; le voile `.sheet-bg` transitionne en 0,35 s sans jeton correspondant.
- S10 : `README.md` : le garder en anglais (choix de Louis du 08/10/2026), ajouter la section usage de l'IA et la liste des contributeurs (en dernier), décrire la nouvelle version.
- Reporter dans `data/*.json` les réponses de Louis : ouverture de « Je me présente », relecture des descriptions provisoires et des textes écrits sans source par S2 (`meta.description`, `ui.errors.timeout`, `json`, `schema` et `langSwitch`, résumés des nouvelles cartes et des planètes de la Piscine).
- Supprimer `docs/design/prototype/` une fois la refonte livrée et validée.
- Avant la fusion dans `main` : GitHub Pages servira `todo.md`, `RECAP-*.md` et `content-suggestions.md` (versionnés, anonymisés) ; trancher avec Louis s'ils restent sur `main`.
