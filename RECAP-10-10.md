# Récapitulatif du 10/10/2026 (session moniteur, Linux)

S5b « Contenu indisponible » est close, et S7 « Parcours » est réalisée, revue et corrigée : il ne lui reste que les 14 écarts mineurs du crash-test de l'étape 8/8. La suite complète donne 923 réussis et 66 rouges prévus (`Contact`). Prochaine étape en tête de `todo.md`.

## S5b « Contenu indisponible »

- Étape 8, suite complète : chaque morceau du critère couvert par un test vert ; seuls échouaient les rouges prévus de S7, S8 et S9.
- `tests/browser/contact.js` (907 lignes) scindé en `contact.js` et `contact-probe.js`, mêmes 66 rouges avant et après.
- Crash-test : aucun bug sur le critère, quatre écarts mineurs corrigés un fixer à la fois (`overflow-wrap` des titres et boutons, focus rendu après le saut, page « L'intrication quantique s'est rompue. » si un module JS ne charge pas, barres à l'étroit d'après les maquettes validées dans Chrome).
- Survol des onglets réservé aux appareils qui survolent ; anneau de focus de la barre d'onglets passé à l'intérieur de la case.

## S7 « Parcours »

- Étape 5 (builder-opus-medium, 26 min) : `journey.js`, `journey-art.js`, `css/journey.css` d'après la maquette, branchés dans `js/main.js` et `index.html` ; les 110 rouges `parcours` passent au vert. Points tranchés au brief : règles `#jDetail` transposées en `#journey .detail` (`.detail` sert aussi aux compétences), cadrage à 36 % de la scène, chapeau `lede.arrows` à 700 px et moins.
- Le test `Indisponible` exigeait encore le panneau dans `#journey` : retiré de `MOUNTED`, comme le prévoit `docs/design/plan.md:122`.
- Étape 6, revue indépendante : À CORRIGER, sans point critique.
- Étape 7, quatre correctifs, un fixer à la fois :
  - nettoyage : helper `scrollBehavior()` partagé avec l'accueil, descente à la fiche par `scroll-padding`, docstrings des astres ;
  - tabulation : Louis a choisi dans Chrome la variante C (sur téléphone, seule l'escale choisie au Tab), inscrite à `docs/design/plan.md:156`, tests rouges écrits avant le code puis vérifiée au clavier dans Chrome à 390 px ;
  - robustesse : caméra immobile rubrique masquée, paragraphes construits une fois par langue, vaisseau garé à côté d'une escale seule, `now` en trop signalé, clic sur l'escale actuelle au bureau qui rejoue la sélection comme la maquette ;
  - `mount` scindé (415 à 314 lignes) : vaisseau et traînée dans `journey-ship.js`, construction de la scène, pose des escales et contrôle des données hors de la fermeture.
- Reporté à S8 : partage des règles de fiche (`css/layout.css` passerait à environ 745 lignes pour un besoin que seul S8 précisera).
- Étape 8 : suite complète conforme ; dans Chrome, trajet animé, fiche, flèche désactivée à la borne, anneau de focus et Entrée vérifiés.
- Crash-test (crashtester-sonnet-high, 41 min) : aucun écart critique ni important, 14 mineurs (focus perdu à la bascule de 700 px, Entrée maintenue, fiche réécrite à l'identique, traînée liée à la cadence, titre de scène à police agrandie, débordements avec données extrêmes...), listés au todo. Testés sans casser : historique et hash en plein trajet, 157 largeurs à trois tailles de police, 2 et 20 escales, gestes tactiles, ordre de tabulation, 40 cycles sans fuite, injection par les données. Arrêt demandé par Louis à la fin du crash-test.

## Règles et contexte

- /best-practice : un choix d'interaction (Tab, focus, animation) se montre aussi dans Chrome, une variante par cadre, jamais en texte.
- Contexte des agents : filtre `?groups=` en minuscules, référence des suites, recette de lancement du serveur avec son PID et arrêt par ce PID avant le rapport.
