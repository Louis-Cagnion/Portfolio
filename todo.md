> Prochaine tâche : S5b « Contenu indisponible », étape 8/8, correctifs des écarts du crash-test (liste sous S5b ci-dessous, un `fixer` à la fois). Ensuite S7 et S9, étape 5/8 (tests rouges déjà écrits). Contexte des agents : `~/.claude/references/projects/portfolio/contexte.md`. Session Linux : Node 22, ports 5510 à 5519 pour les agents, 5520 et plus pour le moniteur.

## Refonte spatiale

- Suivre `docs/design/plan.md` (validé le 08/10/2026), étapes 4 à 8, sur la branche `redesign/space`.
- S5b « Contenu indisponible » (plan validé, `docs/design/plan.md`, ligne S5b et Décisions de Louis) : étape 8, correctifs des écarts du crash-test (rapport et scripts dans le scratchpad de session `s5b-crash/`, à reproduire si perdus) :
  - Saut (S4) : `finishJump()` (`js/core/router.js:266-274`) rend le focus au titre même si l'utilisateur l'a déplacé pendant le saut (bouton EN cliqué entre 100 et 900 ms) ; ne focaliser le titre que si le focus n'a pas bougé depuis le départ.
  - Module JS qui ne charge pas (`js/main.js` en 404, une dépendance en échec) : la page reste sur « Tentative de connexion avec le pilote… » sans erreur ni « Réessayer » ; afficher le texte validé (`docs/design/plan.md`, Décisions de Louis, « Module JS qui ne charge pas »).
  - Sous 260 px, `.tabbar` (`css/layout.css:403`) et `.lang` (`:138`) sortent de l'écran, `.lang` aussi à 300 % de police sur 320 à 390 px : choix de rendu à proposer en maquettes dans Chrome.
- S7 « Parcours » : étapes 5 à 8 (tests rouges : groupe navigateur `parcours`, `tests/browser/journey*.js`). À trancher au brief de l'étape 5 : garder `id="jDetail"` sur la fiche ou transposer en classe les règles `#jDetail` de la maquette ; cadrage « centré » testé à 36 % ± 5 % de la scène ; `p.lede` = `lede.arrows` à 700 px et moins, `lede.pointer` au-dessus.
- S9 « Contact » : étapes 5 à 8 (tests rouges : groupe navigateur `contact`, `tests/unit/contact.test.mjs`). Trois textes du cœur à ajouter dans `data/*.json` (validés, `docs/design/plan.md`, dernière décision de Louis).
- Brief S6 : `#sheet` est un `<aside role="dialog">` repris de la maquette (rôle non admis sur `aside`), à passer en `<div>` ou `<section>` ; le voile `.sheet-bg` transitionne en 0,35 s sans jeton correspondant.
- S10 : `README.md` : le garder en anglais (choix de Louis du 08/10/2026), ajouter la section usage de l'IA et la liste des contributeurs (en dernier), décrire la nouvelle version.
- Reporter dans `data/*.json` les réponses de Louis : ouverture de « Je me présente », relecture des descriptions provisoires et des textes écrits sans source par S2 (`meta.description`, `ui.errors.timeout`, `json`, `schema` et `langSwitch`, résumés des nouvelles cartes et des planètes de la Piscine).
- Supprimer `docs/design/prototype/` une fois la refonte livrée et validée.
- Fin de S9 : supprimer `makeCamera` (`js/core/motion.js`) s'il n'a toujours aucun appelant (prévu par `docs/design/plan.md:35`, inutilisé à S5).
- Fusion dans `main` (décision de Louis du 10/10/2026) : `main` ne garde que le site (`index.html`, `css/`, `js/`, `data/`, `assets/`) et `README.md` ; `todo.md`, `RECAP-*.md`, `content-suggestions.md`, `docs/`, `tests/` et `CLAUDE.md` restent sur la branche de travail, jamais fusionnés.
