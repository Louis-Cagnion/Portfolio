# Récapitulatif du 12/10/2026 (session moniteur, Linux)

S6 « Projets et fiche » avance : feuilles validées 17/23 (C5, D1 à D4 et E1 validées ; F1 à F3 puis E3 de Louis restantes, crash-test E2 reporté au pré-mortem). Prochaine étape en tête de `todo.md`, détail dans `arbre-s6.md`.

## Faits depuis le 11/10

- S7 « Parcours » close et S5b « Contenu indisponible » close (décisions de Louis dans `docs/design/plan.md`). Objectif : une V1 présentable sur ordinateur et téléphone (S6, S8, S9, S10), puis le pré-mortem.
- S6.B3 : groupe navigateur `projets` (5 fichiers `tests/browser/projects*.js`, 481 cas sur cinq largeurs, un scénario par largeur). Rouge sur le site actuel (4 réussis, 103 échecs à 390 px), vert sur un module de référence du tester, 10 mutations détectées.
- S6.C1 : `js/ui/sheet.js` et `css/projects.css` (fiche) ; groupe `fiche` à 98 réussis.
- S6.C2 : `js/sections/projects-layout.js` (pur) ; 50 tests unitaires réussis, Node 345 réussis et 24 rouges (S8 et S9).
- S6.C3 (reprise le 12/10 sur Windows) : `js/sections/projects-art.js` et règles CSS des soleils et planètes dans `css/projects.css`, rendu identique à la maquette (comparaison chiffrée à 1280 et 390 px, Piscine à 320, 390 et 430 px sans chevauchement d'étiquettes).

- S6.C4 (Windows, 12/10) : `js/sections/projects.js` et `projects-loop.js` (rubrique au repos : plan des quatre systèmes, liste, fiche, boucle unique, bascule de langue), `css/projects.css` complété ; groupe `projets` à 118 réussis (les rouges tiennent au zoom, C5), `fiche` 98 après réécriture de 3 cas dans `tests/browser/sheet-focus.js`. Feuilles validées 12/16.
- Demande de Louis (pré-mortem, `todo.md`) : projets triés par catégorie avec outil de filtre.

## À savoir pour la reprise

- Hypothèses que le code de C4 et C5 doit satisfaire : `arbre-s6.md`, « Faits pour la suite » (DOM, boucle `requestAnimationFrame` repérée par sa pile d'appels, mouvement réduit, débordement des étiquettes invisibles au repos).
- Moniteur sonnet/high, à réévaluer avant C4 (code d'animation dense) ; C5 relu par un `analyst` opus/high avant le commit si le diff est trop long.
- Un agent peut laisser une boucle de lancements du banc sur un serveur expiré : vérifier les processus à chaque rapport.

- S6.C5 : `projects-zoom.js` livré par un builder sonnet/high (Windows), validé le 12/10 sur Linux : `rest()` du banc corrigé par un tester haiku/medium, groupe `projets` vert aux cinq largeurs, zoom essayé dans Chrome. Le blocage du banc sur Windows (aucun rendu en 240 à 300 s) ne s'est pas reproduit sur Linux. Détail dans `arbre-s6.md`.
