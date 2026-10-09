> Prochaine tâche : finir S4 (étape 5/8, navigation, saut, ciel). Le `builder-opus-high` a été arrêté juste avant son rapport, son travail est NON COMMITTÉ sur la machine Windows (`js/core/router.js`, `js/ui/starfield.js`, `css/layout.css`, `index.html`, `js/core/motion.js`, `js/main.js`, `js/ui/nav.js`). À faire : vérifier qu'aucune ligne ne dépasse 95 caractères, `node --test` (attendu 245/266, rouges = `skills-layout`), suite navigateur (attendu 540/540, tests rouges du commit 9d9001f), choix de `#dossier` depuis une autre rubrique, puis vérification dans Chrome (saut avant et arrière, bouton retour, mouvement réduit), revue indépendante `analyst-opus-high` (étape 6/8), corrections, commit. Ensuite S5.

## Refonte spatiale

- Suivre `docs/design/plan.md` (validé le 08/10/2026), étapes 4 à 8, sur la branche `redesign/space`.
- Brief S6 : `#sheet` est un `<aside role="dialog">` repris de la maquette (rôle non admis sur `aside`), à passer en `<div>` ou `<section>` ; le voile `.sheet-bg` transitionne en 0,35 s sans jeton correspondant.
- S10 : `README.md` : le garder en anglais (choix de Louis du 08/10/2026), ajouter la section usage de l'IA et la liste des contributeurs (en dernier), décrire la nouvelle version.
- Reporter dans `data/*.json` les réponses de Louis : ouverture de « Je me présente », relecture des descriptions provisoires et des textes écrits sans source par S2 (`meta.description`, `ui.errors.timeout`, `json`, `schema` et `langSwitch`, résumés des nouvelles cartes et des planètes de la Piscine).
- Supprimer `docs/design/prototype/` une fois la refonte livrée et validée.
- Avant la fusion dans `main` : GitHub Pages servira `todo.md`, `RECAP-*.md` et `content-suggestions.md` (versionnés, anonymisés) ; trancher avec Louis s'ils restent sur `main`.
