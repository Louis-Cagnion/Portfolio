# Tests navigateur

Suite sans dépendance qui charge le site dans des iframes de 320, 390, 430, 768 et 1280 px (hauteur 800) et vérifie les critères de la section Tests de `docs/design/plan.md`.

## Lancer

1. Servir la racine du dépôt : Live Server (port 5500) ou `python -m http.server 5501`.
2. Ouvrir `http://127.0.0.1:5501/tests/browser/` dans Chrome (ou le port 5500), onglet au premier plan jusqu'à la fin (plusieurs minutes une fois le site en place).
3. Relance ciblée, paramètres facultatifs : `?widths=320,1280` et `?groups=contrat,setrich,etats,navigation,langue,matrice`.

## Lire

- En haut, le bilan : vert si tout passe, rouge sinon. La case « Afficher seulement les échecs » masque les cas réussis.
- Chaque ligne donne le groupe, le cas, la largeur, la langue, la rubrique et, en cas d'échec, l'élément fautif (chemin jusqu'à l'ancêtre identifié, texte, mesure).
- Le tableau « Exceptions » liste à part, sans les compter en échec, les cibles sous 44 px admises : liens en ligne d'un texte courant (`a` dans un `p` ou un `li`, entouré de texte), exemptés selon WCAG 2.5.8, et composants que la maquette validée dessine sous 44 px (`MOCKUP_SIZED` de `checks.js`, zones SVG comprises), validés par Louis.
- Lecture automatique : `window.__results` vaut `{ done, passed, failed, failures, exceptions, durationMs }` ; attendre `done === true`.

## Fonctionnement

Le banc lit `/index.html`, ajoute `data-noboot` sur `<html>` et un `<base>` vers la racine, l'injecte en `srcdoc`, importe `js/main.js` dans l'iframe puis appelle `boot({ fetch, storage })` avec un faux `fetch` (vrais `data/*.json`, ou fixture `tests/fixtures/valid-locale.json` pour les états de chargement et d'erreur) et un faux stockage. Toute attente a un délai maximal et un échec nommé. Le crochet `prepare(site)` d'`openSite` modifie le cadre avant l'amorçage : `states.js` y retire `AbortController` ou `meta[name="description"]` pour provoquer une exception inattendue.

Jusqu'à 1024 px, la barre de défilement de l'iframe est flottante, comme sur téléphone et tablette. Le `<base>` du banc ne doit pas fausser la navigation : un lien `href="#..."` cliqué par la suite et laissé au navigateur par le site est rejoué en navigation par fragment, et une URL relative passée à `history.pushState` ou `replaceState` est résolue contre le document (seul son fragment compte), comme sur le vrai site sans `<base>`. Une affectation `location.href = '#...'` reste en revanche détournée par le `<base>` : l'échec le signale (« l'iframe a quitté le site testé »), préférer `location.hash`.
