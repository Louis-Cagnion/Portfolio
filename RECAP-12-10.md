# Récapitulatif du 12/10/2026 (session moniteur, Linux)

S6 « Projets et fiche » est livrée, il ne reste que le regard de Louis (S6.E3). S8 « Compétences » est lancée : arbre de 17 feuilles dans `arbre-s8.md`, 6 validées. Prochaine étape en tête de `todo.md`.

## Faits de la journée

- S6 : zoom (C5), revue indépendante (D1) puis trois correctifs de focus et d'Échap (D2 à D4), point de contrôle (E1), puis les trois décisions de Louis (tailles de la Piscine par rang de longueur de texte, système entier sélectionnable, planètes inertes au repos) livrées en F1 à F3. Suites après S6 : Node 359 réussis, navigateur complet 1979 réussis et 66 rouges du seul groupe `Contact` (S9). Le crash-test E2 est reporté au pré-mortem.
- Règle ajoutée aux commandes : toute feuille ou tout constat qui n'est pas pour la V1 va au pré-mortem, jamais dans l'arbre de la V1.
- S8 : cadrage par un analyste, maquettes de choix (A1, 56 vues dans `docs/design/s8/`), tests des fonctions pures (B1) et du groupe navigateur au repos (B2), module `skills-layout.js` (C1), clé `skills.legendItem` (C0), CSS partagé `css/panel.css` (C2). Node : 410 tests, 407 réussis, 3 rouges (`contact`, S9).

## À savoir pour la reprise

- Louis voit les maquettes et Projets le 13/10 : S6.E3 (Projets dans Chrome, rechargement forcé car le cache du navigateur garde d'anciens modules) et S8.A2 (choix sur `docs/design/s8/index.html`, à servir depuis la racine du dépôt, jamais en `file://`).
- S8.C3 (dessin des astres) est à lancer : un premier lancement a été arrêté à 22 h, rien n'est resté dans le dépôt. Son brief doit citer les bonnes lignes de la maquette : `GALAXY_ARMS` `prototype.template.html:778-788`, `DEFS` `:768`, `bodyMarkup` `:789-794`, `bodyIcon` `:795`.
- Un lancement du banc à une seule largeur (`?widths=<w>`) rejoue les cas de la largeur principale : ne jamais additionner de tels lancements pour prévoir le total d'un lancement complet.
- Un agent qui s'arrête peut laisser un serveur ou un Chrome : vérifier les processus à chaque rapport (arrêt par PID exact).
