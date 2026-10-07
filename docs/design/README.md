# Maquette de référence de la refonte

Prototype navigable qui fixe les choix de design validés en octobre 2026 pour la refonte spatiale du portfolio. Il sert de référence visuelle pendant l'implémentation, puis sera supprimé une fois la refonte livrée et validée.

Ce code est volontairement jetable : compact, sans découpage en modules ni documentation détaillée. L'implémentation réelle le réécrit proprement dans `index.html`, `js/` et `css/`.

## Ouvrir la maquette

Avec Live Server (ou tout serveur statique) lancé à la racine du dépôt :

| Page | Contenu |
|---|---|
| `docs/design/prototype/prototype.html` | Prototype complet : accueil, parcours, compétences, projets et contact provisoires, transitions |
| `docs/design/prototype/phones.html` | Le prototype dans trois cadres de téléphone (320, 390 et 430 px) |
| `docs/design/prototype/projects-orbits.html` | Rubrique Projets retenue : systèmes orbitaux |
| `docs/design/prototype/contact-golden-record.html` | Rubrique Contact retenue : disque d'or |

Le petit panneau gris en bas à gauche du prototype (choix du point de départ du parcours) n'existe que dans la maquette.

## Régénérer après une modification

```bash
node docs/design/prototype/build.js
```

Le script injecte le contenu réel de `data/fr.json` et les descriptions de compétences provisoires de `skills-draft.json` dans `prototype.template.html`, et produit `prototype.html` et `projects-data.js`.

## Choix validés

| Élément | Décision |
|---|---|
| Identité | Bleu nuit `#070d1f` et or `#e8b45a`, vert phosphore `#8fe3bf` réservé à la position actuelle ; Michroma (titres), IBM Plex Sans (texte), IBM Plex Mono (données) ; panneaux HUD à coins dorés |
| Fond | Champ d'étoiles animé, poussière d'étoiles sur les marges en ordinateur |
| Navigation | Une rubrique à la fois ; pilule glissante en ordinateur, barre d'onglets en bas sur mobile ; bascule FR/EN |
| Transition | Saut en hyperespace en deux temps (la rubrique part puis la suivante arrive, depuis le centre), sens avant ou arrière selon l'ordre des rubriques, courbure FOV en barillet |
| Accueil | Ligne « Mission en cours », nom en Michroma, accroche, boutons, panneau de télémétrie |
| Parcours | Voyage en vaisseau de la Terre à une galaxie géante (8 escales), caméra posée sur la position actuelle ; courbe verticale zoomée et fiche translucide floutée sur mobile |
| Compétences | Constellations organiques ; astres selon le niveau (galaxie, nébuleuse, géante jaune, étoile magmatique) ; clic : déploiement puis plongée plein champ sur l'astre choisi |
| Projets | Trois systèmes orbitaux (Tressol-Chabrier, personnel, 42), planètes étiquetées, liste complète dessous, panneau de détail |
| Contact | Disque d'or gravé façon Voyager, un sillon par canal |
| Favicon | Trajectoire dorée avec point vert |
