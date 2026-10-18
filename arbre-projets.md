# Arbre : corrections de l'auto-review de la rubrique Projets

Source : auto-review du 18/10/2026 (`js/sections/projects*.js`, `css/projects.css`),
0 critique, 11 importants, une trentaine de mineurs. Base Node avant corrections :
419 réussis, 0 rouge (`node --test`). Moniteur : Sonnet 5.5, effort high.

Règles de l'étape : tous les Haiku indépendants ensemble, un seul agent non-Haiku à la
fois, chacun dans son worktree (`.claude/worktrees/<feuille>`, parti de `redesign/space`),
fusionné puis supprimé après relecture du diff. Les agents ne committent pas.

## Feuilles

| Id | Contenu | Agent | Statut |
|----|---------|-------|--------|
| F1 | Code mort : `TINT_FIELDS`, classe `hit44`, `run.restTilt`, repli `ratio() \|\| OVERVIEW_RATIO` | builder haiku/low | à faire |
| F4 | `tags ?? []`, `links ?? []` (projects.js:138,140) ; test de `getElementById('sheet')` (:318) | builder haiku/medium | à faire |
| F6 | Mineurs de forme : accolades, `PISCINE_SIZE` renommé, variables à une lettre, simplifications | builder haiku/medium | à faire |
| F2 | Un seul endroit pour `plainTitle`, `PHONE_CAMERA`, `PISCINE_ID`, `TAU` (fichiers Projets), rayon de toucher 22 | builder sonnet/medium | à faire |
| F3 | `format()` dans `buildSun`, pose de `rx`/`ry` commune, fabrique de l'objet `view` | builder sonnet/medium | après F2 |
| F5 | Documentation : en-tête de projects-art.js à 15 lignes, docstring de `buildSystems`, références d'historique, « 880 px » en « 55 em », `@param` manquants | builder sonnet/medium | après F3 |
| F7 | Constantes magiques, jetons de durée CSS | builder sonnet/medium | après F5 |
| F8 | `releaseOnClose` remplacé par un rappel `onClose` dans `ui/sheet.js` (fichier partagé) | builder sonnet/high + analyst | en attente de décision |

## Au pré-mortem (pas pour la V1)

- Rendu à chaque image des systèmes masqués.
- Écouteurs jamais retirés, `revealById` en état de module.
- Tests unitaires de `projects-art.js` (`placeLabel`, `placePlanet`).
- Découpage de `mount` (214 lignes) et de `createZoom` (284 lignes).
- Styles de la fiche dans `projects.css`.
- Généricité de `TINTS` et de la Piscine à 20 projets.

## Faits pour la suite

- `awk 'length > 95'` compte les octets : mesurer en caractères avec Python.
- Seule la suite Node tourne par feuille ; la suite navigateur revient au `checker` du
  point de contrôle (17 min environ).
