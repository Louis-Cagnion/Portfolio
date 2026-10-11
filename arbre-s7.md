# Arbre : S7 « Parcours », étape 8/8 (feuilles validées 0/6, plus 0 à 2 correctifs)
Statuts : [ ] à faire, [~] en cours, [x] faite, [v] validée, [!] bloquée
Prochaine feuille prête : S7.A2
Moniteur : opus/high au cadrage, opus/low pour dérouler (accord de Louis du 11/10/2026), réévalué au point de contrôle S7.A4

- S7 [nœud] : clore l'étape 8/8 ; point de contrôle : `docs/design/plan.md:124` et `docs/design/plan.md:158`, suite navigateur au moins 1057 réussis avec des rouges du seul groupe `Contact`, Node 295/319
  - S7.A [nœud] : plafonnement général des textes, branche `agent/fit-words` (worktree `.claude/worktrees/fit-words`)
    - [x] S7.A1 builder : `js/core/fit-words.js` et ses tests (`266d7fd`), interrompu avant son rapport ; fait par : opus/high
    - [ ] S7.A2 analyst : revue du diff contre `docs/design/plan.md:158` (boucle infinie, taille changée là où les mots tiennent, `SKIPPED` et `BOTTOM_FREE` de `tests/browser/journey-title-fit.js`, ligne de `docs/design-checklist.md`) ; dépend de : S7.A1 ; niveau pressenti : opus/medium
    - [ ] S7.A3 fixer : constats de S7.A2, s'il y en a ; dépend de : S7.A2 ; niveau d'après les constats
    - [ ] S7.A4 checker : rectangles avant/après inchangés là où les mots tiennent (320 à 2560 px), police réelle du navigateur à 200 et 300 % par CDP (plafonnement, bouton « Contact » de la barre d'onglets), groupe `parcours` ; dépend de : S7.A3 ; niveau pressenti : sonnet/medium
    - moniteur : fusion dans `redesign/space`, suppression du worktree et des branches `agent/fit-words` et `wip/fit-words` (local et origin)
  - S7.B [nœud] : cas jamais vérifiés par le crash-test du 11/10
    - [ ] S7.B1 crashtester : onglet masqué, clic réel sur l'escale actuelle sous le vaisseau, `--lift` de `.jtitle`, `overflow-wrap` de `.when`, relecture de `journey-livefill.js`, `journey-focus.js`, `journey-labels.js`, `journey-a11y-current.js`, `journey-moves.js` et `journey-overlap.js` (rejeux x3), hypothèse `buildStops` (`at`, `body` ou `now` différents entre `fr.json` et `en.json`) ; dépend de : S7.A (fusion) ; niveau pressenti : sonnet/high
    - [ ] S7.B2 fixer : constats de S7.B1, s'il y en a ; dépend de : S7.B1 ; niveau d'après les constats
  - S7.C [nœud] : vérification de Louis
    - [ ] S7.C1 Louis : Entrée et Espace maintenues sur une borne du parcours dans Chrome (répétition réelle du clavier), vaisseau immobile attendu ; dépend de : -
  - [ ] S7.D1 checker : suite navigateur complète et `node --test`, comparées au point de contrôle ; dépend de : S7.A, S7.B, S7.C ; niveau pressenti : haiku/medium
  - moniteur : commit, clôture de S7, mise à jour de `docs/design/plan.md` si une décision change

## Faits pour la suite
- S7.A1 : le gel de `wip/fit-words` ne se reproduit plus : `?groups=plafonnement` se termine en 85 s, 217 réussis, 0 échec (moniteur, 11/10/2026, 18h57) ; la revue doit quand même chercher une boucle sans borne.
