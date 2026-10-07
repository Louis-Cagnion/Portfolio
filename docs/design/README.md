# Maquette de référence de la refonte

Prototype navigable qui fixe les choix de design validés en octobre 2026 pour la refonte spatiale du portfolio. Il sert de référence visuelle pendant l'implémentation, puis sera supprimé une fois la refonte livrée et validée.

Ce code est volontairement jetable : compact, sans découpage en modules ni documentation détaillée. L'implémentation réelle le réécrit proprement dans `index.html`, les scripts de `js/`, les feuilles de style et `data/*.json`.

## Ouvrir la maquette

Avec Live Server (Louis l'utilise sur le port 5500) ou tout serveur statique lancé à la racine du dépôt :

| Page | Contenu |
|---|---|
| `docs/design/prototype/prototype.html` | Prototype complet des cinq rubriques et des transitions |
| `docs/design/prototype/phones.html` | Le prototype dans trois cadres de téléphone (320, 390 et 430 px) |

Le petit panneau gris en bas à gauche du prototype (choix du point de départ du parcours) n'existe que dans la maquette. Le texte reste en français seulement : la version anglaise sera traduite à l'implémentation. Les polices viennent de Google Fonts (connexion requise pour le bon rendu), et la maquette est publiée avec le site sur GitHub Pages tant qu'elle existe dans le dépôt.

## Régénérer après une modification

```bash
node docs/design/prototype/build.js
```

Le script injecte le contenu réel de `data/fr.json` et les descriptions de compétences provisoires de `skills-draft.json` dans `prototype.template.html`, et produit `prototype.html`. Les textes inventés pour la maquette (ligne de mission, télémétrie, titres d'escales, résumés de projets) vivent dans le gabarit et `build.js`, pas encore dans `data/*.json`.

## Méthode de revue

Chaque proposition de design est montrée à Louis en pages réellement rendues et ouvertes dans Chrome (extension Claude in Chrome), un onglet par option, avec `phones.html` pour le mobile. Il tranche sur le rendu, jamais sur un schéma texte.

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
| Projets | Trois systèmes orbitaux (Tressol-Chabrier, personnel, 42), planètes étiquetées sur fond, liste complète dessous, panneau de détail |
| Contact | Disque d'or gravé façon Voyager, un sillon par canal |
| Favicon | Trajectoire dorée avec point vert |

## Options écartées

À ne pas reproposer sans demande explicite de Louis.

| Sujet | Option écartée | Raison |
|---|---|---|
| Direction | « Atlas céleste » (serif, bleu de Prusse) | Non retenue d'emblée |
| Direction | « Deep Field » et « Console de mission » seules, hybride à bandeau de télémétrie | Fusionnées : style et télémétrie de la console, palette, animations et navigation du Deep Field ; le bandeau horizontal n'a pas plu |
| Palette | Graphite et orange signal | Bleu nuit et or préféré |
| Nom | Nom de famille en lettres creuses (Unbounded) | Police non appréciée |
| Compétences | Radar à secteurs | Constellations jugées plus stylées |
| Compétences | Constellations en zigzag « dépliées » | La génération organique précédente était mieux |
| Compétences | Étoile, planète, lune, étoile morte | Remplacées par galaxie, nébuleuse, géante jaune, étoile en roche magmatique craquelée |
| Parcours | Courbe horizontale sur mobile | Trop fine et trop petite |
| Parcours | Anneau comme marqueur | Remplacé par le vaisseau |
| Transition | Zoom en un seul temps avec glissement vertical | Remplacé par le saut en deux temps centré |
| Projets | Missions avec écussons brodés, grille de cartes | Systèmes orbitaux préférés |
| Contact | Canal de transmission (oscilloscope), antenne et satellites, amarrage du vaisseau, carte d'embarquement | Disque d'or préféré |
| Favicon | Monogramme LC, orbite, viseur | Trajectoire préférée |
