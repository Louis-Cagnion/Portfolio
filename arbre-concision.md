# Arbre : passe de concision de la documentation

Demande du 18/10/2026 : mettre la documentation au propre sans perdre d'information.
Moniteur : Sonnet 5.5, effort high. Un seul agent non-Haiku à la fois, un worktree par
feuille (`.claude/worktrees/<feuille>`, parti de `redesign/space`), fusion `--no-ff` après
relecture du diff. Aucune feuille ne touche au code ni à `main` (ces documents ne sont que
sur `redesign/space`).

## Feuilles

| Id | Document | Agent | Statut |
|----|----------|-------|--------|
| C1 | `todo.md` (22 800 caractères) : règles des fichiers de suivi (ne garder que l'action ouverte et son contexte minimal) | builder sonnet/high | à faire |
| C2 | `tests/browser/README.md` (12 000) | builder sonnet/medium | après C1 |
| C3 | `docs/design/README.md` (7 400) et `docs/design/s8/constat.md` (2 800) | builder sonnet/medium | après C2 |
| V1 | Vérification qu'aucune information n'est perdue, point par point, sur C1 à C3 | analyst opus/high | après C3 |

## Écartés de cette passe

- `docs/design-checklist.md` (42 700) et `docs/design/plan.md` (24 900) : 24 citations par
  numéro de ligne depuis les tests et le code, et `plan.md` annonce sa propre suppression
  avec la maquette. À trancher avec Louis (condenser et corriger les citations, ou supprimer
  `plan.md` et `docs/design/prototype/`).
- `README.md` racine (5 800) : présent aussi dans `main`, déjà détaillé et concis.
- `docs/teaser/**` : moins de 2 000 caractères par fichier.
