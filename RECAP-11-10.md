# Récapitulatif du 11/10/2026 (session moniteur, Linux)

S5b « Contenu indisponible » est close. S7 « Parcours » est réalisée et corrigée : les écarts du crash-test sont traités, sauf le plafonnement général des textes, interrompu à 12h58 sur une branche de travail. Prochaine étape en tête de `todo.md`.

## S7 « Parcours », étape 8/8 : les 15 écarts du crash-test

- Corrigés, un test rouge d'abord à chaque fois : vaisseau et traînée sans `pointer-events` ; libellés SVG non sélectionnables ; titre de scène du téléphone caché aux lecteurs d'écran ; `aria-current="step"` sur l'escale choisie ; Entrée et Espace maintenues ignorées sur les flèches ; `overflow-wrap` de la date de la fiche ; espace entre la date et le compteur de la fiche (marge réduite de la largeur de l'espace pour garder les 10 px de la maquette) ; fiche `aria-live` écrite seulement pour ce qui change ; traînée liée au temps et non à la cadence d'images ; deux boucles d'animation au plus pendant un trajet ; focus gardé sur une flèche au passage de 700 px ; titre de scène qui reste dans la scène à police normale ; libellés trop longs tronqués par « … » (texte complet gardé dans l'`aria-label` et la fiche).
- Conclu sans changement de rendu : le layout par image au repos vient de toute animation `transform` sur un enfant SVG dans Chrome (environ 60 par seconde, 3 à 5 ms) ; aucune piste (`will-change`, `contain`, `transform-box`) ne le réduit sans changer le rendu. Un test de garde borne les boucles à `transform` et `opacity`.
- Défaut révélé par la fusion : la place d'un libellé ancré en fin se calculait du mauvais côté (`js/sections/journey-labels.js`, corrigé).
- Crash-test indépendant du 11/10 (crashtester-sonnet-high, arrêté à 12h58) : 1 bug mineur (coupe des libellés en unités UTF-16, au todo), aucune régression sur les correctifs récents.

## Décisions de Louis du 11/10/2026 (dans `docs/design/plan.md`)

- Libellés de Codewars et de « RNCP 6 » alignés à droite, à gauche de leur astre : le vaisseau à quai traversait leur date dans la maquette, en français comme en anglais.
- Plafonnement général des textes : un texte dont le plus long mot ne tient pas sur une ligne voit sa police plafonnée, partout dans le site. Le module `js/core/fit-words.js` est sur la branche `wip/fit-words` : avec le vrai module la page de test se fige, cause à localiser.

## Méthode et règles ajoutées à /best-practice

- Jusqu'à 4 agents en parallèle pour les derniers écarts, chacun dans son worktree (historique linéaire : rebase puis fast-forward, branche supprimée) ; conflits de fusion limités aux lignes d'import et d'appel de `tests/browser/journey.js`.
- Règles nouvelles : Haiku indépendants lancés ensemble ; poussée sans demander au-delà de 5 commits d'avance ; compteur de progression partout où il se calcule ; arrêt d'un processus orphelin vérifié ; choix de design toujours montrés dans Chrome, y compris ceux issus d'un rapport d'agent ; effort max jamais choisi de soi-même ; critique constructive des demandes.
- Deux erreurs du moniteur relevées : heures de fin estimées sans relire l'horloge, et un `git commit` lancé avec un comptage dans le même appel.
- Agents arrêtés par Louis à 12h58 : leurs processus restants (serveur, Chrome) ont été arrêtés par PID après vérification.

## Reprise de l'après-midi (13h à 14h30)

- Suite complète sans le plafonnement, à 13h07 : navigateur 1057 réussis et 66 rouges (tous du groupe `Contact`, tests de S9 écrits avant le code) ; Node 295 réussis, 24 rouges (S8 et S9).
- Coupe des libellés par graphèmes : corrigée par un fixer dans un worktree, relue puis fusionnée (`3ee9d81`) ; groupe `parcours` à 138 réussis, 0 échec à 320 et 1280 px.
- Plafonnement général des textes : un builder (Opus, effort high) a repris le travail dans un worktree ; arrêté par Louis avant son rapport, son état est sauvegardé en WIP sur `agent/fit-words` (`266d7fd`), rien n'est vérifié.
- Le total des points de S7 était de 4 et non de 2 : plafonnement, graphèmes, cas jamais vérifiés du crash-test, contrôles dans Chrome (`todo.md`). Compteur à nommer par ce qu'il compte (« points clos 1/4 »).
- Règles ajoutées à /best-practice : points ouverts d'une sous-tâche S à enchaîner sans demander, commande en arrière-plan qui ne retarde pas un agent, sens du compteur, moniteur de niveau inférieur à ses agents avec un analyste de niveau supérieur pour le risqué.
