# Récapitulatif du 12/10/2026 (session moniteur, Linux)

S6 « Projets et fiche » avance : feuilles validées 10/16. Prochaine étape en tête de `todo.md`, détail dans `arbre-s6.md`.

## Faits depuis le 11/10

- S7 « Parcours » close et S5b « Contenu indisponible » close (décisions de Louis dans `docs/design/plan.md`). Objectif : une V1 présentable sur ordinateur et téléphone (S6, S8, S9, S10), puis le pré-mortem.
- S6.B3 : groupe navigateur `projets` (5 fichiers `tests/browser/projects*.js`, 481 cas sur cinq largeurs, un scénario par largeur). Rouge sur le site actuel (4 réussis, 103 échecs à 390 px), vert sur un module de référence du tester, 10 mutations détectées.
- S6.C1 : `js/ui/sheet.js` et `css/projects.css` (fiche) ; groupe `fiche` à 98 réussis.
- S6.C2 : `js/sections/projects-layout.js` (pur) ; 50 tests unitaires réussis, Node 345 réussis et 24 rouges (S8 et S9).
- S6.C3 interrompue à 8h15 à la demande de Louis (arrêt à 8h25) : brouillon de `js/sections/projects-art.js` sur la branche `wip/s6-c3`, JavaScript seulement, non rendu, non relu.

## À savoir pour la reprise

- Hypothèses que le code de C4 et C5 doit satisfaire : `arbre-s6.md`, « Faits pour la suite » (DOM, boucle `requestAnimationFrame` repérée par sa pile d'appels, mouvement réduit, débordement des étiquettes invisibles au repos).
- Moniteur sonnet/high, à réévaluer avant C4 (code d'animation dense) ; C5 relu par un `analyst` opus/high avant le commit si le diff est trop long.
- Un agent peut laisser une boucle de lancements du banc sur un serveur expiré : vérifier les processus à chaque rapport.
