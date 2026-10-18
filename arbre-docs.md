# Arbre : mise au propre de la documentation de la maquette

Demande du 18/10/2026 : vérifier ce qui sert encore au pré-mortem, supprimer le reste,
condenser ce qui subsiste. Source : enquête d'un analyst Opus (lecture seule) du même jour.
Moniteur : Sonnet 5.5, effort high. Tous les Haiku indépendants ensemble, un seul agent
non-Haiku à la fois, un worktree par feuille (`.claude/worktrees/<feuille>`, parti de
`redesign/space`), fusion `--no-ff` après relecture du diff. Ces documents ne sont que sur
`redesign/space` ; `main` n'est pas touché (rien n'est publié par cet arbre).

## Décisions

- Supprimer `docs/design/prototype/`, `docs/design/s6/`, `docs/design/s8/` (dont `constat.md`)
  et `docs/design/README.md` : aucune lecture à l'exécution (`node --test` : 419/419 sur une
  copie sans `docs/`), valeurs reprises dans `css/tokens.css` et `js/`, décisions dans le plan.
- Garder `docs/design/lang-switch/` jusqu'à la livraison de l'animation de langue.
- Condenser `docs/design/plan.md` et `docs/design-checklist.md` avec des intitulés stables.
- Citer désormais par intitulé ou paragraphe (« plan, Critères par rubrique, S6 »), jamais par
  numéro de ligne (71 citations par ligne aujourd'hui, 39 déjà décalées).
- Le rendu de référence devient la V1 livrée (`main`) et la section « Décisions de Louis ».

## Feuilles

| Id | Contenu | Agent | Statut |
|----|---------|-------|--------|
| D1 | `plan.md` condensé ; y déplacer les « Options écartées » de `docs/design/README.md` ; table de correspondance ancienne ligne vers nouvel intitulé | builder sonnet/high | à faire |
| D2 | `design-checklist.md` condensée (§1 à §9 gardés) ; table de correspondance | builder sonnet/high | après D1 |
| V2 | Vérification qu'aucune information utile n'est perdue (D1 et D2) | analyst opus/high | après D2 |
| D3 | Réécrire les citations par ligne et les renvois de provenance dans `js/`, `css/`, `tests/` (groupes de fichiers distincts) | builder haiku/medium, en parallèle | après V2 |
| D4 | Supprimer les groupes G1, G2, G3, G6 ; mettre à jour `todo.md` ; contexte et mémoire hors dépôt | moniteur | après D3 |
| V3 | Plus aucun renvoi vers un fichier supprimé ni vers un numéro de ligne ; code identique hors commentaires ; `node --test` | moniteur | après D4 |
