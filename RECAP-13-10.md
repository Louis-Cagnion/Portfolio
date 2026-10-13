# Récapitulatif du 13/10/2026 (session moniteur, Linux)

S6 « Projets et fiche » est validée par Louis, avec une décision de plus (zones de toucher visibles sur téléphone) en cours de livraison. S8 « Compétences » avance : feuilles validées 7/17, le montage (C4) est à reprendre.

## Faits de la journée

- S8.C3 : `js/sections/skills-art.js` (dessins des quatre niveaux, icône, groupe d'une constellation) et `css/skills.css`, comparés à la maquette à deux échelles. `.b-flicker` retiré du périmètre (mort dans la maquette).
- S6.E3 : Louis a vu Projets dans Chrome (« tout est bon »). Décision : sur téléphone, les zones de toucher de 44 px de la Piscine zoomée restent visibles (maquette `docs/design/s6/mockup.css:225-229`), enregistrée dans `docs/design/plan.md`. Feuilles ajoutées : S6.F4a (test, `tests/browser/projects-phone.js`) puis S6.F4b (CSS de `css/projects.css`).
- S6.F4a : tests des zones de toucher visibles écrits par un testeur Haiku (`tests/browser/projects-phone.js`, `projects.js`), 6 rouges attendus.
- S8.C4 : un builder lancé le matin a été arrêté par Louis avant son rapport.

## À savoir pour la reprise

- Le travail partiel de C4 est NON VÉRIFIÉ et sans mesure : `js/sections/skills.js`, `js/sections/skills-scene.js`, `css/skills.css`, `js/main.js`, `index.html`, `tests/browser/unavailable.js`. Le relire, mesurer `node --test` et les groupes `competences`, `indisponible`, `langue`, `matrice`, `saut`, `navigation`, puis relancer un builder qui termine.
- S6.F4a faite et validée (tests rouges pour la bonne raison). Reste F4b : la règle CSS, et le cas de test à étendre à 768 px (le mode téléphone de la Piscine joue jusqu'à 880 px). Au départ du chantier, le groupe `projets` donne 6 rouges attendus de F4a (2 par largeur de téléphone) jusqu'à F4b.
- S8.A2 : Louis a choisi D2 (lien Devpedia sous le chapeau, tutoyé), la légende « Galaxie : Avancé » et R2 avec la caméra qui va jusqu'à la planète du projet. Restent à maquetter (S8.A1b, arrêtée avant son premier fichier, à relancer sur son accord) : les trois lectures de R2 (deux temps, un seul mouvement, le zoom reste) et trois dispositions pour le défaut téléphone (P1 comme la maquette, P2 nom sous l'astre, P3 panneau sous le plan). Louis demande aussi que le nom de chaque astre soit visible en vue téléphone : critère noté dans S8.B3.
- Louis a demandé « ne build rien » le 13/10 : ne relancer aucun builder sans son accord.
- Un serveur lancé par un agent peut rester actif après son arrêt : vérifier les processus (arrêt par PID exact).
