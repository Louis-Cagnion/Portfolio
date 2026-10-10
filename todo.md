> Prochaine tâche : S5b « Contenu indisponible », étape 5/8 (réalisation par un `builder` : faire passer au vert `tests/unavailable.test.mjs` et le groupe navigateur `indisponible`, 36 + 4 rouges Node et 215 navigateur), d'après la ligne S5b de `docs/design/plan.md`. Session Linux : Node 22, serveur sur le port 5510.

## Refonte spatiale

- Suivre `docs/design/plan.md` (validé le 08/10/2026), étapes 4 à 8, sur la branche `redesign/space`.
- S5b « Contenu indisponible » (plan validé, `docs/design/plan.md`, ligne S5b et Décisions de Louis) : étapes 5 à 8.
- Brief S6 : `#sheet` est un `<aside role="dialog">` repris de la maquette (rôle non admis sur `aside`), à passer en `<div>` ou `<section>` ; le voile `.sheet-bg` transitionne en 0,35 s sans jeton correspondant.
- S10 : `README.md` : le garder en anglais (choix de Louis du 08/10/2026), ajouter la section usage de l'IA et la liste des contributeurs (en dernier), décrire la nouvelle version.
- Reporter dans `data/*.json` les réponses de Louis : ouverture de « Je me présente », relecture des descriptions provisoires et des textes écrits sans source par S2 (`meta.description`, `ui.errors.timeout`, `json`, `schema` et `langSwitch`, résumés des nouvelles cartes et des planètes de la Piscine).
- Supprimer `docs/design/prototype/` une fois la refonte livrée et validée.
- Fin de S9 : supprimer `makeCamera` (`js/core/motion.js`) s'il n'a toujours aucun appelant (prévu par `docs/design/plan.md:35`, inutilisé à S5).
- Fusion dans `main` (décision de Louis du 10/10/2026) : `main` ne garde que le site (`index.html`, `css/`, `js/`, `data/`, `assets/`) et `README.md` ; `todo.md`, `RECAP-*.md`, `content-suggestions.md`, `docs/`, `tests/` et `CLAUDE.md` restent sur la branche de travail, jamais fusionnés.
