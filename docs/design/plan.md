# Plan d'implémentation de la refonte spatiale

Plan validé par Louis le 08/10/2026 (étape 3/8 de la chaîne en 8 étapes). Il transforme la maquette de `docs/design/prototype/` en site réel, bilingue et testé, sans build ni dépendance npm.

Il sert de référence aux étapes 4 à 8, puis sera supprimé avec la maquette une fois la refonte livrée.

## Sommaire

- [Principes](#principes)
- [Architecture](#architecture)
- [Schéma des données](#schéma-des-données)
- [Chaînes à créer](#chaînes-à-créer)
- [Tests](#tests)
- [Sous-tâches](#sous-tâches)
- [Pilotage](#pilotage)
- [Décisions de Louis](#décisions-de-louis)

## Principes

- Travail sur la branche `redesign/space`, fusionnée dans `main` (publiée par GitHub Pages) seulement après l'étape 8/8 ; un commit par sous-tâche.
- Contraintes du cadrage : JavaScript vanilla en modules ES, 320 px minimum, `prefers-reduced-motion`, aucune barre de défilement horizontale, fichiers sous 750 lignes, aucun tiret cadratin.
- Pièges de la maquette à éviter : jamais de mesure d'un élément masqué (largeur des étiquettes par canvas), premier rendu sans attendre les polices puis nouvelle mesure à `document.fonts.ready`, aucun déplacement DOM d'un élément déjà en place, pas de temps plafonné, recentrage bloqué pendant une animation de caméra.
- Une boucle d'animation par rubrique, active seulement quand la rubrique est visible ; seul le ciel tourne en continu.
- Aucun `innerHTML` brut : `setRich()` n'accepte que `<strong>`, `<em>` et `<a href>` en `https:` ou `mailto:`, le reste s'affiche en texte avec une erreur console qui nomme le champ.

## Architecture

```
index.html            <head>, bloc <script type="module" defer>, <body> squelette (barre, 5 sections, onglets, fiche, chargement statique)
assets/favicon.svg
css/                  tokens.css, layout.css, home.css, journey.css, skills.css, projects.css, contact.css
js/main.js            boot(env) injectable : chargement, rendu, bascule de langue, page d'erreur
js/core/              data.js (loadLocale, délai 10 s, une erreur par cause, cache), schema.js (validation pure),
                      i18n.js (langue initiale, format, langchange), dom.js (el, svg, setRich),
                      motion.js (reduced, ease, lerp, hashId, animate, makeCamera), router.js (hash, saut hyperespace)
js/ui/                starfield.js, nav.js, sheet.js, status.js
js/sections/          home.js, journey.js + journey-art.js, skills.js + skills-layout.js + skills-art.js, projects.js, contact.js
tests/                data.test.mjs, unit/*.test.mjs (node --test), browser/index.html + suite.js
```

- Supprimés car remplacés : `js/script.js`, `js/fetch.js`, `js/projects.js`, `js/tag.js`, `styles.css`.
- Chaque rubrique expose `mount(root, content, ui)` (structure construite une fois) et `update(content, ui)` (textes seuls). L'état (escale, constellation et étoile, système zoomé, fiche, disque) est gardé par identifiant lors d'un changement de langue.
- Le placement organique des constellations est calculé à partir de `id`, jamais du nom traduit. L'autre langue est préchargée après le premier rendu.

## Schéma des données

Identique en FR et en EN. Les champs non textuels (identifiants, ordre, `href`, `level`, `body`, `at`, `now`, références de projets) sont égaux dans les deux fichiers ; couleurs, rayons et dessins restent dans le JS, indexés par `id` ou `body`.

```jsonc
{
  "meta": { "lang", "title", "description" },
  "ui": { "nav": { "home", "journey", "skills", "projects", "contact" }, "language", "sections",
          "loading", "close", "errors": { "title", "network", "timeout", "http", "json", "schema", "retry", "langSwitch" } },
  "home": { "mission", "name", "pitch", "ctas": { "projects", "contact" },
            "telemetry": { "title", "rows": [{ "label", "value", "live" }] },
            "dossier": { "kicker", "title", "entries": [{ "label", "html" }] } },
  "journey": { "title", "lede": { "pointer", "arrows" }, "counter", "prev", "next", "stopsLabel",
               "stops": [{ "id", "body", "at", "now", "title", "when", "paragraphs": ["html"] }] },
  "skills": { "title", "lede", "hint", "back", "explore", "chipsLabel", "prev", "next", "related", "legend",
              "levels": { "advanced", "intermediate", "beginner", "unknown" },
              "link": { "intro", "label", "href" },
              "groups": [{ "id", "title", "short", "items": [{ "id", "name", "level", "projects": ["id"], "description" }] }] },
  "projects": { "title", "lede", "back", "count", "approach", "systemOf", "listLabel",
                "systems": [{ "id", "name", "intro", "projects": [{ "id", "title", "summary", "tags": [],
                  "blocks": [{ "type": "text", "html" } | { "type": "list", "items": ["html"] }],
                  "links": [{ "intro", "label", "href" }], "media": [] }] }] },
  "contact": { "title", "question", "message", "discLabel", "copyHint", "copied", "copiedStatus", "copyFailed",
               "groove", "armed", "tapHint", "backHint", "channels": [{ "id", "name", "href" }] }
}
```

- `blocks` remplace les champs propres à chaque projet (`bonuses`, `states`, `techStack`...) en gardant leur ordre.
- `about.paragraphs` et `journey.paragraphs` sont redistribués dans les escales et le dossier du pilote, selon `docs/design/prototype/build.js`.
- L'adresse gravée se déduit du canal `mailto:`.

## Chaînes à créer

| Clé | FR (maquette) | EN |
|---|---|---|
| `home.mission` | Mission en cours : de la piscine 42 à l'intelligence artificielle | Current mission: from the 42 piscine to artificial intelligence |
| `home.pitch` | Développeur au Groupe Tressol-Chabrier, formé à 42 Perpignan. Parti de zéro en 2024, je conçois aujourd'hui des applications et des pipelines de données en production. | Developer at Groupe Tressol-Chabrier, trained at 42 Perpignan. Starting from scratch in 2024, I now build applications and data pipelines running in production. |
| `home.ctas` | Voir mes projets / Me contacter | See my projects / Contact me |
| `telemetry` | Télémétrie ; Décollage : Piscine 42, 2024 ; Tronc commun 42 : Terminé en 18 mois ; Position actuelle : Groupe Tressol-Chabrier ; Prochaine étape : RNCP6, alternance 2 ans ; Destination : Recherche en IA | Telemetry; Lift-off: 42 piscine, 2024; 42 common core: Completed in 18 months; Current position: Groupe Tressol-Chabrier; Next stage: RNCP level 6, 2-year work-study; Destination: AI research |
| `dossier` | Dossier du pilote ; Je me présente ; Formation / Entraînement en cours / Projets passion | Pilot file; About me; Education / Current training / Passion projects |
| `journey` | Mon parcours ; Choisis une escale pour faire voyager le vaisseau et lire son récit. ; Utilise les flèches pour changer d'escale. ; escale {n} sur {total} ; Étape précédente / suivante ; Étapes du parcours | My journey; Choose a stop to fly the ship there and read its story.; Use the arrows to change stops.; stop {n} of {total}; Previous / Next stop; Journey stops |
| `stops[].title` | Première piscine, Seconde chance, Tronc commun, Codewars, Tressol-Chabrier, Alternance RNCP6, RNCP7 IA, Recherche en IA | First piscine, Second chance, Common core, Codewars, Tressol-Chabrier, RNCP 6 work-study, RNCP 7 in AI, AI research |
| `stops[].when` | 2024, 2024, nov. 2024 à 2026, pendant le cursus, depuis juillet 2026, sept. 2026 à 2028, ensuite, horizon | 2024, 2024, Nov. 2024 to 2026, during the curriculum, since July 2026, Sept. 2026 to 2028, next, on the horizon |
| `skills` | Chaque constellation regroupe un domaine. Choisis-en une pour l'explorer étoile par étoile. ; Sélectionne une constellation pour zoomer dessus. ; Toutes les compétences ; Explorer : {name} ; Étoile précédente / suivante ; Projets liés | Each constellation is a field. Pick one to explore it star by star.; Select a constellation to zoom in.; All skills; Explore: {name}; Previous / Next star; Related projects |
| `skills.levels`, légende | Avancé, Intermédiaire, Débutant, Niveau à préciser ; Chaque compétence est un astre : plus il est vaste, plus je la maîtrise. ; Galaxie, Nébuleuse, Géante jaune, Étoile en fusion | Advanced, Intermediate, Beginner, Level to be confirmed; Each skill is a celestial body: the larger it is, the better I master it.; Galaxy, Nebula, Yellow giant, Molten star |
| `projects` | Quatre systèmes stellaires, un par univers : chaque planète en orbite est un projet. Sélectionne un système pour t'en approcher, ou directement une planète pour ouvrir son projet. ; Tous les systèmes ; {n} projets ; Approcher le système {name} ; Système {name} ; Liste des projets ; Projets perso | Four star systems, one per world: each orbiting planet is a project. Select a system to fly closer, or a planet to open its project directly.; All systems; {n} projects; Approach the {name} system; {name} system; Project list; Personal projects |
| `contact` | Une question, une opportunité, une envie d'échanger ? ; Comme le disque d'or embarqué sur les sondes Voyager, ce message attend que quelqu'un le trouve. Mon adresse email est gravée au centre du disque. Chaque sillon mène aussi à l'un de mes réseaux. | A question, an opportunity, or just want to talk?; Like the golden record carried by the Voyager probes, this message is waiting for someone to find it. My email address is engraved at the centre of the disc. Each groove also leads to one of my networks. |
| `contact` (disque) | Écrire un e-mail ; COPIER L'EMAIL / EMAIL COPIÉ ; Email copié ; Copie impossible : l'adresse est {mail} ; Sillon {n} : {name} ; Touche-le encore pour l'ouvrir. ; Touche le disque pour choisir un contact ; Revenir au disque entier ; Disque d'or : adresse au centre, un réseau par sillon | Write an email; COPY EMAIL / EMAIL COPIED; Email copied; Copy failed: the address is {mail}; Groove {n}: {name}; Tap it again to open it.; Tap the disc to choose a contact; Back to the whole disc; Golden record: address at the centre, one network per groove |
| `ui` | Langue ; Sections ; Fermer ; Chargement… ; erreur : titre, un message par cause (réseau, délai dépassé, HTTP {status}, JSON invalide, champ {path} manquant), Réessayer | Language; Sections; Close; Loading…; same causes; Retry |

À traduire en S2 : 36 descriptions de compétences (WebSockets à rédiger), 18 résumés et listes de technologies de projets (12 encore à écrire), 8 titres et noms courts de constellations.

## Tests

- `node --test tests/` (Node 24 lit les `.js` ESM sans `package.json`), écrits à l'étape 4 et rouges avant l'implémentation.
  - Données : conformité à `schema.js`, parité FR/EN, une seule escale `now`, références de projets existantes, identifiants uniques, aucune chaîne vide, HTML limité à la liste blanche, aucun tiret cadratin (U+2014) dans `data/`, `js/`, `css/`, `index.html`, `README.md`.
  - Modules purs : langue initiale, `format()`, `animate()` immédiat si mouvement réduit, `hashId` stable, placement des constellations indépendant de la langue, une erreur `loadLocale` par cause avec un `fetch` simulé.
- `tests/browser/` (Live Server, Chrome) : le site en cadres de 320, 390, 430, 768 et 1280 px.
  - Aucun débordement horizontal par rubrique et par langue.
  - Navigation (pilule, onglets, `data-go`, hash, `#dossier`).
  - Bascule de langue (`lang`, aucun texte restant de l'autre langue, état conservé).
  - Zones cliquables de 44 px, états de chargement et d'erreur via `status.js` et un `fetch` simulé.
- Vérifications manuelles dans Chrome : interactions réellement déclenchées ; mouvement réduit via le réglage Windows « Afficher les animations ».

## Sous-tâches

Ordre imposé par les dépendances : socle avant rubriques, fiche projet avant compétences. Chaque rubrique (S5 à S9) se termine par sa chasse aux cas limites et une vérification réelle dans Chrome, téléphones compris.

| # | Sous-tâche | Fichiers | Critères de réussite |
|---|---|---|---|
| S1 | Checklist de design | `docs/design-checklist.md` | Jetons, composants, contrastes AA, 44 px, largeurs, mouvement, clavier, états ; exception du disque à 320 px tranchée par Louis |
| S2 | Migration des données et traductions | `data/fr.json`, `data/en.json` | Tests de données au vert, tirets cadratins retirés |
| S3 | Socle : chargement, erreurs, langue | `index.html`, `css/tokens.css`, `css/layout.css`, `js/main.js`, `js/core/*`, `js/ui/status.js`, `js/ui/nav.js`, `assets/favicon.svg` | Chargement visible avant le JS, page d'erreur stylée par cause avec Réessayer, bascule FR/EN qui met à jour `lang`, `<title>` et la description, anciens fichiers supprimés |
| S4 | Navigation, transition, ciel | `js/core/router.js`, `js/ui/starfield.js` | Hash et retour arrière, saut en deux temps avant et arrière, courbure FOV, aucune transition si mouvement réduit |
| S5 | Accueil et dossier du pilote | `js/sections/home.js`, `css/home.css` | Conforme à la maquette, repère qui s'efface, aucun débordement à 320 px |
| S6 | Projets et fiche | `projects.js`, `ui/sheet.js`, `css/projects.css` | Zoom, systèmes masqués, noms cliquables, liste, fiche accessible au clavier, intro de système placée selon la maquette validée, système de la Piscine (une vingtaine de planètes) lisible dès 320 px selon la maquette validée |
| S7 | Parcours | `journey.js`, `journey-art.js`, `css/journey.css` | Ouverture sur la position actuelle, flèches seules sur téléphone, toucher de l'escale actuelle qui descend à sa fiche |
| S8 | Compétences | `skills*.js`, `css/skills.css` | Déploiement, plongée, retour sans à-coup, projets liés qui ouvrent la fiche, lien Devpedia placé selon la maquette validée |
| S9 | Contact | `contact.js`, `css/contact.css` | Copie avec repli, sillons, disque verrouillé puis moitié haute sur téléphone, annonces aux lecteurs d'écran |
| S10 | README et clôture | `README.md` | En anglais, nouvelle version, usage de l'IA, contributeurs en dernier ; chasse aux cas limites sur tout le site |

## Pilotage

Session moniteur : Opus, effort high. Elle découpe les briefs, relit chaque diff, joue les tests complets, fait les vérifications dans Chrome, présente le résultat à Louis et ne corrige rien elle-même. Un agent à la fois, sur la branche `redesign/space` (pas de worktree : un seul acteur écrit à la fois).

| Étape | Agent |
|---|---|
| 4. Tests | `tester-sonnet-high` (données et modules purs), puis `tester-opus-high` (page navigateur) |
| 5. Réalisation | `builder-sonnet-medium` : S1, S5, S10 ; `builder-sonnet-high` : S2, S9 ; `builder-opus-high` : S3, S4, S6, S7, S8 |
| 6. Vérification | `analyst-sonnet-high` pour les sous-tâches Sonnet, `analyst-opus-high` pour les sous-tâches Opus |
| 7. Correction | un `fixer` par problème, au niveau de la sous-tâche ; une relance au même niveau, puis niveau supérieur |
| 8. Finalisation | `tester-opus-high` (suite complète), puis `crashtester-opus-high` (cas limites du site entier) |

## Décisions de Louis

- Langue par défaut : français, choix du visiteur mémorisé.
- Le lien Devpedia des compétences et les introductions des catégories de projets sont conservés : leur emplacement se propose en maquettes rendues dans Chrome pendant S6 et S8.
- Les contenus de `content-suggestions.md` (textes proposés le 08/10/2026 d'après ses dépôts, dates, ouverture de « Je me présente », photo) sont reportés par S2 une fois validés par Louis, au plus tard avant S10.
- La Piscine devient un quatrième système à côté de Tressol-Chabrier, personnel et 42, avec une planète par module (Shell00 et Shell01, C00 à C13, les trois rushs, BSQ) ; sa présentation se propose en maquettes rendues dans Chrome pendant S6.
