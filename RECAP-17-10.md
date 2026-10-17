# Récapitulatif du 17/10/2026 (session moniteur, Linux)

S8 « Compétences » : feuilles validées 12/18. A1b, A2 et B3 sont closes ; C6 (caméra et plongée) est la prochaine feuille.

## Faits de la journée

- S8.A1c : les parcours R2 des maquettes ne tenaient pas dans l'index à cause de `performance.now()` mêlé à l'argument de `requestAnimationFrame` dans `docs/design/s8/mockup-core.js` (cadres créés après la page : horloges décalées, `viewBox` projeté à l'infini). Corrigé et joué au clic réel dans Chrome (299ddde).
- S8.A2 : Louis a choisi R2b (un seul mouvement de caméra jusqu'à la planète, retour au système à la fermeture) et P2 (nom de l'étoile sous l'astre en plongée sur téléphone), consignés dans `docs/design/plan.md` (d097b83). Il veut aussi sélectionner les autres étoiles pendant et après le parcours R : lecture du moniteur (constellation déployée au retour), à confirmer à S8.E2.
- S8.B3 : tests de déploiement fiabilisés (reprise du travail partiel de la veille) : référence jetable 514 réussis et 0 rouge, 20 mutations sur 20 détectées, site réel rouge pour la seule cause « déploiement absent » ; fichiers sous 600 lignes (71322cf).
- Teaser : `docs/teaser/` (vidéos, voix, mixage, sources, 41 Mo) versionné pour LinkedIn et, peut-être, la page d'accueil (01304cb) ; une copie sous `assets/` serait alors une décision à part.
- Skill de montage vidéo `motion-video-director` installé en personnel sur la machine Linux (non versionné).

## À savoir pour la reprise

- C6 : lire « Faits de B3 pour C6 » dans `arbre-s8.md` (`inert` sans effet sur un `g` SVG, cadrage de tout le nuage sur téléphone, ancrage de défilement, panneau créé au premier déploiement) ; relecture d'un analyst opus/high avant son commit.
- Les maquettes de S8 se servent depuis la racine du dépôt (port 5520 pour le moniteur, 5513 à 5514 pour les agents) ; un onglet d'arrière-plan ralentit les `requestAnimationFrame`.
- Moniteur : sonnet/high, convient pour C6 avec une relecture opus/high.
