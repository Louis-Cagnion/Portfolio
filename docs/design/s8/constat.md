# S8.A1 (c) : constat de la disposition téléphone de la maquette

Mesuré le 12/10/2026 par `window.s8Measure` (`mockup-measure.js`) dans Chrome headless, sur
`mockup.html` (31 étoiles réelles, FR et EN, polices de repli : le réseau est coupé).
Rien n'est corrigé : un défaut est une option de plus pour S8.A2.

## Noms d'étoiles qui se chevauchent (tous visibles ensemble : survol, ou groupe déployé)

| Largeur | Paires qui se chevauchent au repos (EN) | Noms qui dépassent leur cellule |
|---|---|---|
| 320 px | 4 (`devtools` 2, `network` 1, `tools` 1) | 12 (FR 12) |
| 390 px | 2 (`devtools` 1, `network` 1) | 11 (FR 9) |
| 430 px | 1 (`devtools`) | 8 (FR 7) |
| 1280 px | 2 (`devtools` 1, `network` 1) | 1 (FR 2) |

- Nom le plus large : 205 px (EN, `concurrency`), 182 px (FR), pour une cellule de 170 px sur
  téléphone : chaque nom de la cellule de gauche ou de droite déborde sur sa voisine.
- Constellation `languages` (7 étoiles) déployée : 0 paire de noms qui se chevauchent aux
  quatre largeurs ; en plongée seul le nom de l'étoile courante est visible.

## Nom de l'étoile courante coupé en plongée (téléphone)

- Le nom se place au-dessus de l'astre ; l'astre remplit le plan, donc le nom sort du cadre
  (SVG qui coupe) et passe sous la barre collante : 29 étoiles sur 31 à 320, 390 et 430 px
  (les 2 galaxies `advanced` gardent leur nom). À 1280 px : 0 sur 31.
- Étoile au nom le plus long (`concurrency`, 31 caractères EN) : nom hors du cadre à 100 %
  à 320, 390 et 430 px (33 % de plus sous la barre à 430 px) ; 0 % à 1280 px.
  `processes` (« Processes, pipes and signals », galaxie) : nom entièrement visible à 390 px.

## Panneau (`margin-top: -34vw`) qui couvre l'astre

- Sur les 31 étoiles, l'astre est recouvert par le panneau pour 10 étoiles à chaque largeur
  téléphone, au plus 8,9 % (320 px), 9,6 % (390 px), 10 % (430 px) de sa surface ; 2,9 % à
  1280 px. Aucun nom n'est recouvert par le panneau.

## Saut de hauteur du plan à l'entrée et à la sortie (téléphone)

| Largeur | Plan au repos puis déployé | Saut en 1 image | Hauteur de la page après l'entrée |
|---|---|---|---|
| 320 px | 677,6 puis 331,2 px | 346,5 px | + 337 px (462 px en une image à la fin) |
| 390 px | 842,3 puis 411,7 px | 430,7 px | + 69 px (341 px en une image à la fin) |
| 430 px | 930,9 puis 455 px | 475,9 px | - 28 px (330 px en une image au début) |

- La sortie fait le même saut en sens inverse (346,5, 430,7 et 475,9 px en une image).
- Cause : `aspect-ratio` passe de celui de la grille à `1 / 1.15` d'un coup, hors transition.
- À 1280 px la hauteur est animée (460 puis 540 px) : au plus 5,4 px par image, aucun saut.
- Le contenu sous le panneau (légende) bouge aussi de 300 à 460 px en une image quand le
  panneau se remplit en fin d'entrée sur téléphone.
