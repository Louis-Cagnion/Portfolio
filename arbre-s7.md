# Arbre : S7 « Parcours », étape 8/8 (feuilles validées 2/6, plus 0 à 2 correctifs)
Statuts : [ ] à faire, [~] en cours, [x] faite, [v] validée, [!] bloquée
Prochaine feuille prête : S7.A3 (après la maquette Chrome du plancher, cf. S7.A3)
Moniteur : recommandé sonnet/high (équivaut à opus/medium, plus économe) ; en place : opus/low depuis le cadrage (opus/high), réévalué au point de contrôle S7.A4

- S7 [nœud] : clore l'étape 8/8 ; point de contrôle : `docs/design/plan.md:124` et `docs/design/plan.md:158`, suite navigateur au moins 1057 réussis avec des rouges du seul groupe `Contact`, Node 295/319
  - S7.A [nœud] : plafonnement général des textes, branche `agent/fit-words` (worktree `.claude/worktrees/fit-words`)
    - [x] S7.A1 builder : `js/core/fit-words.js` et ses tests (`266d7fd`), interrompu avant son rapport ; fait par : opus/high
    - [v] S7.A2 analyst : revue du diff contre `docs/design/plan.md:158` ; À CORRIGER ; fait par : opus/medium
    - [ ] S7.A3 fixer : (1) `tests/browser/journey-title-fit.js:45-47,94-95` : `fitProblems` asynchrone, attendre `afterFit` après chaque écriture de texte ; (2) `js/core/fit-words.js:240,262-263` : `MAX_REFITS` ne compte que les retours à un état déjà vu (vraie alternance) ; (3) mineurs : garde morte `fit-words.js:208` et tests vides `tests/browser/fit-words-module.js:141-150,331-338`, première image sans plafond (`router.js:224` bascule `.on`, non observé), JSDoc sans `@param`/`@returns`, commentaire de 4 lignes `journey-title-fit.js:20-23` ; dépend de : S7.A2 et du choix de Louis sur le plancher ; niveau pressenti : opus/medium (sonnet/high si brief étoffé)
    - [ ] Louis : taille 0 px sans plancher à 200 px de large (`journey-title-fit.js:20-23`, `docs/design-checklist.md:108`), absent de `plan.md:158` : maquettes avec et sans plancher à montrer dans Chrome avant S7.A3
    - [ ] S7.A4 checker : rectangles avant/après inchangés là où les mots tiennent (320 à 2560 px), police réelle du navigateur à 200 et 300 % par CDP (plafonnement, bouton « Contact » de la barre d'onglets), groupes `parcours`, `etroit` et `plafonnement`, coupes après « / », « – », U+200B comparées au modèle de `fit-words.js:12-13` (hypothèse de S7.A2) ; dépend de : S7.A3 ; niveau pressenti : sonnet/medium
    - moniteur : fusion dans `redesign/space`, suppression du worktree et des branches `agent/fit-words` et `wip/fit-words` (local et origin)
  - S7.B [nœud] : cas jamais vérifiés par le crash-test du 11/10
    - [ ] S7.B1 crashtester : onglet masqué, clic réel sur l'escale actuelle sous le vaisseau, `--lift` de `.jtitle`, `overflow-wrap` de `.when`, relecture de `journey-livefill.js`, `journey-focus.js`, `journey-labels.js`, `journey-a11y-current.js`, `journey-moves.js` et `journey-overlap.js` (rejeux x3), hypothèse `buildStops` (`at`, `body` ou `now` différents entre `fr.json` et `en.json`) ; dépend de : S7.A (fusion) ; niveau pressenti : sonnet/high
    - [ ] S7.B2 fixer : constats de S7.B1, s'il y en a ; dépend de : S7.B1 ; niveau d'après les constats
  - S7.C [nœud] : vérification de Louis
    - [v] S7.C1 Louis : Entrée et Espace maintenues sur une borne du parcours dans Chrome (répétition réelle du clavier), vaisseau immobile attendu ; dépend de : - ; confirmé par Louis le 11/10/2026
  - [ ] S7.D1 checker : suite navigateur complète et `node --test`, comparées au point de contrôle ; dépend de : S7.A, S7.B, S7.C ; niveau pressenti : haiku/medium
  - moniteur : commit, clôture de S7, mise à jour de `docs/design/plan.md` si une décision change

## Faits pour la suite
- S7.A1 : le gel de `wip/fit-words` ne se reproduit plus : `?groups=plafonnement` se termine en 85 s, 217 réussis, 0 échec (moniteur, 11/10/2026, 18h57) ; la revue doit quand même chercher une boucle sans borne.
- S7.A2 : aucune boucle sans fin ; toute mesure juste après une écriture de texte attend au moins une microtâche (MutationObserver de fit-words) ; `?groups=plafonnement` ne joue pas `journey-title-fit.js` (groupe `parcours`) ; `cappedSize` ne dépasse jamais la taille naturelle.
