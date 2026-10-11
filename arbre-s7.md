# Arbre : S7 « Parcours », étape 8/8 (feuilles validées 4/6 : A3b, A4, B1 et B2 reportées au pré-mortem)
Statuts : [ ] à faire, [~] en cours, [x] faite, [v] validée, [!] bloquée, [>] reportée au pré-mortem
S7 close le 11/10/2026 : suite navigateur complète 1283 réussis, 66 rouges du seul groupe `Contact`, Node 295/319
Moniteur : sonnet/high, recommandé et en place depuis la reprise du 11/10/2026 au soir (équivaut à opus/medium, plus économe) ; réévalué au point de contrôle S7.A4

- S7 [nœud] : clore l'étape 8/8 ; point de contrôle : `docs/design/plan.md:124` et `docs/design/plan.md:158`, suite navigateur au moins 1057 réussis avec des rouges du seul groupe `Contact`, Node 295/319
  - S7.A [nœud] : plafonnement général des textes, branche `agent/fit-words` (worktree `.claude/worktrees/fit-words`)
    - [x] S7.A1 builder : `js/core/fit-words.js` et ses tests (`266d7fd`), interrompu avant son rapport ; fait par : opus/high
    - [v] S7.A2 analyst : revue du diff contre `docs/design/plan.md:158` ; À CORRIGER ; fait par : opus/medium
    - [v] S7.A3 fixer : (1) `tests/browser/journey-title-fit.js:45-47,94-95` : `fitProblems` asynchrone, attendre `afterFit` après chaque écriture de texte ; (2) `js/core/fit-words.js:240,262-263` : `MAX_REFITS` ne compte que les retours à un état déjà vu (vraie alternance) ; (3) mineurs : garde morte `fit-words.js:208` et tests vides `tests/browser/fit-words-module.js:141-150,331-338`, première image sans plafond (`router.js:224` bascule `.on`, non observé), JSDoc sans `@param`/`@returns`, commentaire de 4 lignes `journey-title-fit.js:20-23` ; dépend de : S7.A2 ; fait par : sonnet/high ; relu et joué par le moniteur le 11/10/2026 (`plafonnement` 220 réussis, `parcours` 254 réussis, Node 295/319), commit de la branche `agent/fit-words`
    - [v] Louis : plancher du titre de scène, maquettes Chrome montrées le 11/10/2026 ; décisions : (a) titre et date en écriture verticale (D1 : `writing-mode: vertical-rl`, titre en blanc à droite, date en jaune à gauche) quand l'horizontale ne tient pas, plancher de police 8 px ; (b) flèches de scène (E3) : boîte `min(2.62em, 64px)`, glyphe `min(1.05rem, 28px)`, constat de Louis à 240 px et 300 % (glyphe de 50 px dans une boîte de 44 px, mesuré) ; (c) bascule de langue FR/EN : aucun plafond, Louis garde le rendu actuel après maquettes Chrome (le 11/10/2026) ; elle est déjà en colonne à 320 px et 300 % (`@media (max-width: 16.25em)` = 780 px à 300 %)
    - [>] S7.A3b builder : reportée au pré-mortem (décision de Louis du 11/10/2026 : version présentable asap, seul l'obligatoire) ; spécification dans `todo.md`
    - [>] S7.A4 checker : reportée au pré-mortem (police réelle à 200 et 300 % par CDP) ; la suite navigateur complète de S7.D1 tient lieu de point de contrôle
    - moniteur : fusion dans `redesign/space`, suppression du worktree et des branches `agent/fit-words` et `wip/fit-words` (local et origin)
  - S7.B [nœud] : cas jamais vérifiés par le crash-test du 11/10
    - [>] S7.B1 crashtester : reportée au pré-mortem ; liste des cas dans `todo.md`
    - [>] S7.B2 fixer : reportée au pré-mortem, avec S7.B1
  - S7.C [nœud] : vérification de Louis
    - [v] S7.C1 Louis : Entrée et Espace maintenues sur une borne du parcours dans Chrome (répétition réelle du clavier), vaisseau immobile attendu ; dépend de : - ; confirmé par Louis le 11/10/2026
  - [v] S7.D1 checker : suite navigateur complète et `node --test`, comparées au point de contrôle ; dépend de : S7.A, S7.B, S7.C ; niveau pressenti : haiku/medium
  - moniteur : commit, clôture de S7, mise à jour de `docs/design/plan.md` si une décision change

## Faits pour la suite
- S7.A1 : le gel de `wip/fit-words` ne se reproduit plus : `?groups=plafonnement` se termine en 85 s, 217 réussis, 0 échec (moniteur, 11/10/2026, 18h57) ; la revue doit quand même chercher une boucle sans borne.
- S7.A2 : aucune boucle sans fin ; toute mesure juste après une écriture de texte attend au moins une microtâche (MutationObserver de fit-words) ; `?groups=plafonnement` ne joue pas `journey-title-fit.js` (groupe `parcours`) ; `cappedSize` ne dépasse jamais la taille naturelle.
- S7.A3 : `fit-words.js` observe désormais `class` sur tout le corps (plafonnement à l'arrivée d'une rubrique) ; son coût n'est pas mesuré (réserve laissée au pré-mortem, `todo.md`) ; la borne `MAX_SEEN` (64) n'a pas de test ; `tests/browser/README.md:28` ne décrit pas le cas « changement de rubrique » du groupe `plafonnement` (à compléter en S7.A3b) ; `refit` mesure toujours à la taille naturelle, une place qui ne dépend que de la police de l'élément converge en un tour.
