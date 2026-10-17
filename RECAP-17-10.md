# Récapitulatif du 17/10/2026 (session moniteur, Linux)

S8 « Compétences » : feuilles validées 12/18 (A1, A1b, A2, B1, B2, B3, C0 à C5 et C4b), C6 commitée avec deux constats à corriger, B4 écrite non branchée. S9 « Contact » livrée, revue et corrigée. Arrêt à 14 h 15 demandé par Louis.

## Faits de la journée

- S8.A1c : les parcours R2 des maquettes ne tenaient pas dans l'index à cause de `performance.now()` mêlé à l'argument de `requestAnimationFrame` dans `docs/design/s8/mockup-core.js` (cadres créés après la page). Corrigé (299ddde).
- S8.A2 : Louis a choisi R2b (un seul mouvement de caméra jusqu'à la planète) et P2 (nom de l'étoile sous l'astre en plongée sur téléphone), enregistrés dans `docs/design/plan.md` (d097b83).
- S8.B3 : tests de déploiement fiabilisés (71322cf), puis trois cas d'interruption d'animation retirés de la V1 et rangés au pré-mortem (fb1d68b) : 131 cas à 390 px.
- S8.C6 : `skills-focus.js` et `skills-pose.js` (7d08fca), groupe `competences` 0 rouge. Relecture opus/high : À CORRIGER (I1 saut de page au retour sur téléphone, I2 tabulation sur des étoiles hors cadre), détails dans `arbre-s8.md`.
- S8.B4 : `tests/browser/skills-related.js` (projets liés R2b, lien Devpedia D4), écrit par un tester sonnet/medium dans le dépôt, NON branché et état de vérification inconnu à l'arrêt : le rejouer dans une copie avant de le brancher.
- S9 : `contact.js`, `contact-disc.js`, `css/contact.css`, textes du cœur (bc5cce8) ; revue opus/high : focus du disque invisible (corrigé 0858d48), clés de copie obligatoires et `mountSimple` retiré (ae7fb96). `node --test` 410 sur 410, groupe `contact` 55 réussis, 0 rouge.
- Teaser : `docs/teaser/` versionné (01304cb) pour LinkedIn et peut-être la page d'accueil (une copie sous `assets/` serait une décision à part).
- Règles : tri V1 et pré-mortem renforcé dans le dépôt des commandes (6c18ad4) ; skill `motion-video-director` installé en personnel sur Linux.

## À savoir pour la reprise

- Ordre : corriger I1 et I2 de C6 (tests d'abord ; I2 oblige à réviser le cas B3 « étoile focalisée : Entrée et Espace sautent »), vérifier et brancher B4, C7, D1, E1, E2, S10, crash-test de la V1.
- Lancer `?groups=contact` avec `widths=1280,390` (le banc ne joue les cas téléphone que si une largeur de téléphone figure dans le filtre).
- Lecture à confirmer par Louis à E2 : au retour dans Compétences après un projet lié, la constellation reste déployée.
- Moniteur : sonnet/high ; relecture opus/high pour les feuilles délicates.
