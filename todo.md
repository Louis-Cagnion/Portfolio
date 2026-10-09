> Prochaine tâche : S4 (étape 5/8, navigation, transition, ciel ; ligne S4 de `docs/design/plan.md`). Aucun test ne couvre encore ses critères : d'abord `tester-opus-high`, tests rouges du retour arrière par l'historique, du saut avant et arrière selon l'ordre des rubriques, de la courbure FOV et du changement immédiat sous mouvement réduit (départ : Node 234/255, rouges = `skills-layout` ; navigateur 511/511). Puis `builder-opus-high` ; son brief précise que la maquette déplace les rubriques dans `#warpStage`, ce que le plan interdit (« aucun déplacement DOM d'un élément déjà en place »).

## Refonte spatiale

- Suivre `docs/design/plan.md` (validé le 08/10/2026), étapes 4 à 8, sur la branche `redesign/space`.
- Brief S6 : `#sheet` est un `<aside role="dialog">` repris de la maquette (rôle non admis sur `aside`), à passer en `<div>` ou `<section>` ; le voile `.sheet-bg` transitionne en 0,35 s sans jeton correspondant.
- S10 : `README.md` : le garder en anglais (choix de Louis du 08/10/2026), ajouter la section usage de l'IA et la liste des contributeurs (en dernier), décrire la nouvelle version.
- Reporter dans `data/*.json` les réponses de Louis : ouverture de « Je me présente », relecture des descriptions provisoires et des textes écrits sans source par S2 (`meta.description`, `ui.errors.timeout`, `json`, `schema` et `langSwitch`, résumés des nouvelles cartes et des planètes de la Piscine).
- Supprimer `docs/design/prototype/` une fois la refonte livrée et validée.
- Avant la fusion dans `main` : GitHub Pages servira `todo.md`, `RECAP-*.md` et `content-suggestions.md` (versionnés, anonymisés) ; trancher avec Louis s'ils restent sur `main`.
