> Prochaine tâche : S5, étape 5/8 (réalisation de `js/sections/home.js` et `css/home.css` par un `builder`) contre les tests rouges de `tests/browser/home.js` et `cue.js` (groupe `accueil`, 48 rouges), plus le `<link>` de `css/home.css` dans `index.html`. Session Linux : Node 22 et serveur sur le port 5510.

## Refonte spatiale

- Suivre `docs/design/plan.md` (validé le 08/10/2026), étapes 4 à 8, sur la branche `redesign/space`.
- S5, brief de réalisation : `css/home.css` chargé par un `<link>` après `css/layout.css` (`index.html:14`, décision du plan) ; les tests suivent les textes de `data/` (pas ceux de la maquette), le repère affiche `home.dossier.kicker` (aucune clé propre) et le mouvement réduit coupe l'animation `cue` (`docs/design-checklist.md:298`).
- S5, vérification réelle dans Chrome (téléphones compris) : `.gone` du repère avec la marge `rootMargin` de -15 % (non mesurable dans l'iframe du banc), Entrée sur le repère, défilement fluide.
- S5, correctifs de la chasse aux cas limites (un `fixer` chacun) : Ctrl/Maj/Cmd+clic sur le repère laissé au navigateur ; chaîne longue sans espace qui déborde à 320 px (`.rows dt`, `.telemetry h3`, `.dossier h2`, `.kicker`, `.cue`) ; clic sur le repère pendant le saut d'arrivée sur l'accueil perdu (`land` de `js/core/router.js` remonte en haut). Hors S5 : `header.bar` déborde avec une police racine à 200 % (1000×600) et 300 % (1280×800).
- S5b « Contenu indisponible » (plan validé, `docs/design/plan.md`, ligne S5b et Décisions de Louis) : étapes 4 à 8, tests rouges d'abord.
- Brief S6 : `#sheet` est un `<aside role="dialog">` repris de la maquette (rôle non admis sur `aside`), à passer en `<div>` ou `<section>` ; le voile `.sheet-bg` transitionne en 0,35 s sans jeton correspondant.
- S10 : `README.md` : le garder en anglais (choix de Louis du 08/10/2026), ajouter la section usage de l'IA et la liste des contributeurs (en dernier), décrire la nouvelle version.
- Reporter dans `data/*.json` les réponses de Louis : ouverture de « Je me présente », relecture des descriptions provisoires et des textes écrits sans source par S2 (`meta.description`, `ui.errors.timeout`, `json`, `schema` et `langSwitch`, résumés des nouvelles cartes et des planètes de la Piscine).
- Supprimer `docs/design/prototype/` une fois la refonte livrée et validée.
- Avant la fusion dans `main` : GitHub Pages servira `todo.md`, `RECAP-*.md` et `content-suggestions.md` (versionnés, anonymisés) ; trancher avec Louis s'ils restent sur `main`.
