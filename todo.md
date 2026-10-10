> Prochaine tâche : S5b « Contenu indisponible », étape 6/8 (revue indépendante par un `analyst` du commit de réalisation ; à juger : coins `.hud` ramenés de -2 px à 0 dans les rubriques pour passer le test de débordement du panneau). Ensuite S7 et S9, étape 5/8 (tests rouges déjà écrits). Session Linux : Node 22, serveur sur le port 5510.

## Refonte spatiale

- Suivre `docs/design/plan.md` (validé le 08/10/2026), étapes 4 à 8, sur la branche `redesign/space`.
- S5b « Contenu indisponible » (plan validé, `docs/design/plan.md`, ligne S5b et Décisions de Louis) : étapes 6 à 8.
- S7 « Parcours » : étapes 5 à 8 (tests rouges : groupe navigateur `parcours`, `tests/browser/journey*.js`). À trancher au brief de l'étape 5 : garder `id="jDetail"` sur la fiche ou transposer en classe les règles `#jDetail` de la maquette ; cadrage « centré » testé à 36 % ± 5 % de la scène ; `p.lede` = `lede.arrows` à 700 px et moins, `lede.pointer` au-dessus.
- S9 « Contact » : étapes 5 à 8 (tests rouges : groupe navigateur `contact`, `tests/unit/contact.test.mjs`). Textes de la maquette sans clé dans `data/*.json`, à faire valider à Louis avant l'étape 5 : « Copier l'email » (annonce au focus du cœur), « COPIE IMPOSSIBLE » (gravure après échec), `aria-label` « Copier l'adresse e-mail » du cœur.
- Après 13h (10/10/2026) : règle /best-practice du fichier de contexte des agents (créé au plan, mis à jour à chaque clôture d'étape, pièges récurrents triés), puis créer `docs/agent-brief.md` pour le Portfolio avec le lanceur headless sorti de l'annexe du RECAP vers `tools/`.
- Brief S6 : `#sheet` est un `<aside role="dialog">` repris de la maquette (rôle non admis sur `aside`), à passer en `<div>` ou `<section>` ; le voile `.sheet-bg` transitionne en 0,35 s sans jeton correspondant.
- S10 : `README.md` : le garder en anglais (choix de Louis du 08/10/2026), ajouter la section usage de l'IA et la liste des contributeurs (en dernier), décrire la nouvelle version.
- Reporter dans `data/*.json` les réponses de Louis : ouverture de « Je me présente », relecture des descriptions provisoires et des textes écrits sans source par S2 (`meta.description`, `ui.errors.timeout`, `json`, `schema` et `langSwitch`, résumés des nouvelles cartes et des planètes de la Piscine).
- Supprimer `docs/design/prototype/` une fois la refonte livrée et validée.
- Fin de S9 : supprimer `makeCamera` (`js/core/motion.js`) s'il n'a toujours aucun appelant (prévu par `docs/design/plan.md:35`, inutilisé à S5).
- Fusion dans `main` (décision de Louis du 10/10/2026) : `main` ne garde que le site (`index.html`, `css/`, `js/`, `data/`, `assets/`) et `README.md` ; `todo.md`, `RECAP-*.md`, `content-suggestions.md`, `docs/`, `tests/` et `CLAUDE.md` restent sur la branche de travail, jamais fusionnés.
