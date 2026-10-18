# Plan de la refonte spatiale : critères et décisions

Référence de la refonte spatiale (V1 livrée le 18/10/2026, plan validé par Louis le 08/10/2026) : critères d'acceptation par rubrique, journal des décisions de Louis et options écartées. Le code et les tests citent ses intitulés ; les critères à venir (filtre par catégorie, médias des fiches, animation de langue, panneau abaissé) s'y ajoutent.

Sections : [Principes](#principes), [Critères par rubrique](#critères-par-rubrique), [Décisions de Louis](#décisions-de-louis), [Options écartées](#options-écartées).

## Principes

- Chaque rubrique exporte `mount(root)`, qui construit sa structure une fois et rend `update(content)` (textes seuls), la forme qu'attend `MOUNTS` dans `js/main.js`. L'état (escale, constellation et étoile, système zoomé, fiche, disque) est gardé par identifiant lors d'un changement de langue.
- Le placement organique des constellations est calculé à partir de `id`, jamais du nom traduit. L'autre langue est préchargée après le premier rendu.
- Les couleurs, rayons et dessins restent dans le JS, indexés par `id` ou `body` ; les champs non textuels des données (identifiants, ordre, `href`, `level`, `body`, `at`, `now`, références de projets) sont égaux en FR et EN (`tests/data.test.mjs`).
- Contraintes : JavaScript vanilla en modules ES, 320 px minimum, `prefers-reduced-motion`, aucune barre de défilement horizontale, fichiers sous 750 lignes, aucun tiret cadratin.
- Tests Node : `node --test` depuis la racine ; `node --test tests/` prend le dossier pour un fichier et échoue.
- Vérifications manuelles dans Chrome : interactions réellement déclenchées ; mouvement réduit via le réglage Windows « Afficher les animations ».
- Pièges de la maquette (mesures, polices, boucle d'animation, recentrage) : `docs/design-checklist.md` §6, §8 et §9.

## Critères par rubrique

Chaque rubrique (S5 à S9) se termine par sa chasse aux cas limites et une vérification réelle dans Chrome, téléphones compris. Les tests citent ces critères mot pour mot.

| # | Rubrique | Fichiers | Critères de réussite |
|---|---|---|---|
| S5 | Accueil et dossier du pilote | `js/sections/home.js`, `css/home.css`, `index.html`, `js/main.js` | Conforme à la maquette, repère qui s'efface, aucun débordement à 320 px |
| S5b | Contenu indisponible des rubriques à venir | `data/fr.json`, `data/en.json`, `js/core/schema.js`, `css/layout.css` | Bloc `ui.unavailable` (`title`, `message`, `home`) validé et identique en structure FR/EN ; sous le titre et le chapeau de chaque rubrique encore montée par `mountSimple`, un panneau `.status.hud[data-state="error"]` (titre, message, barre en pointillés, bouton `.btn.primary[data-go="home"]`) à 32 px du chapeau, mis à jour à la bascule de langue ; aucun débordement aux cinq largeurs, bouton de 44 px ; chaque module S6 à S9 retire le panneau de sa rubrique |
| S6 | Projets et fiche | `js/sections/projects*.js`, `js/ui/sheet.js`, `css/projects.css` | Zoom, systèmes masqués, noms cliquables, liste, fiche accessible au clavier, intro de système placée selon la maquette validée, système de la Piscine (une vingtaine de planètes) lisible dès 320 px selon la maquette validée |
| S7 | Parcours | `js/sections/journey*.js`, `css/journey.css` | Ouverture sur la position actuelle, flèches seules sur téléphone, toucher de l'escale actuelle qui descend à sa fiche |
| S8 | Compétences | `js/sections/skills*.js`, `css/skills.css` | Déploiement, plongée, retour sans à-coup, projets liés qui ouvrent la fiche, lien Devpedia placé selon la maquette validée |
| S9 | Contact | `js/sections/contact*.js`, `css/contact.css` | Copie avec repli, sillons, disque verrouillé puis moitié haute sur téléphone, annonces aux lecteurs d'écran |

S1 à S4 et S10 n'ont plus de critère propre : `docs/design-checklist.md` (§1 à §9), `tests/data.test.mjs`, `tests/texts.test.mjs`, `README.md` et les groupes `etats`, `langue`, `navigation` et `saut` de `tests/browser/README.md` les couvrent.

## Décisions de Louis

- Langue par défaut : français, choix du visiteur mémorisé.
- Le lien Devpedia des compétences et les introductions des catégories de projets sont conservés.
- Les contenus (textes proposés le 08/10/2026 d'après ses dépôts, dates, ouverture de « Je me présente », photo) ont été reportés dans `data/*.json` après validation de Louis.
- `css/home.css` se charge par un `<link>` dans `index.html`, après `css/layout.css`, et non par une injection depuis `home.js` (10/10/2026).
- Les modules de rubrique suivent la forme de `MOUNTS` (`mount(root)` qui rend `update(content)`), et chacun remplace dans `js/main.js` le montage minimal de sa rubrique (10/10/2026).
- La Piscine devient un quatrième système à côté de Tressol-Chabrier, personnel et 42, avec une planète par module (Shell00 et Shell01, C00 à C13, les trois rushs, BSQ).
- « Contenu indisponible » sur les rubriques encore sans contenu, variante B rendue dans Chrome (titre et chapeau gardés, panneau d'erreur dessous, bouton « Retour à l'accueil ») ; FR « Ce secteur n'a pas encore été cartographié, le pilote n'a pas encore trouvé le mode hyperespace. Reviens plus tard. », EN « This sector hasn't been charted yet, the pilot hasn't found hyperspace mode yet. Come back later. » ; titre « Contenu indisponible » / « Content unavailable », bouton « Retour à l'accueil » / « Back to home » (10/10/2026).
- Points de rupture en em (43.75em, 51.25em, 55em, soit 700, 820 et 880 px à la taille de police par défaut), en CSS comme dans `BREAKPOINTS` : la barre d'onglets prend le relais quand le texte agrandi ne tient plus dans la barre du haut (10/10/2026).
- Textes du cœur de Contact sans clé jusqu'ici, repris de la maquette : annonce au focus « Copier l'email » / « Copy email », gravure après échec « COPIE IMPOSSIBLE » / « COPY FAILED », `aria-label` « Copier l'adresse e-mail » / « Copy the email address » (10/10/2026).
- Module JS qui ne charge pas (fichier introuvable, réseau coupé) : le panneau `#status` affiche « L'intrication quantique s'est rompue. » / « Quantum entanglement has been broken. » avec « Réessayer », qui recharge la page (10/10/2026).
- Barres à l'étroit, maquettes rendues dans Chrome : le nom de la barre du haut se coupe sur deux lignes quand la place manque, le point vert restant rond (8 px, sans rétrécir) ; sous 16.25em (260 px en police normale, 780 px à 300 %), FR/EN passe en vertical avec un rayon de 10 px (nouveau jeton), et la barre d'onglets passe en icônes seules (libellé gardé pour les lecteurs d'écran). Un seul onglet est mis en avant (libellé d'origine sous l'icône, case élargie à sa taille, icône à 1.25rem) : l'onglet survolé ou focalisé au clavier, sinon celui de la rubrique courante. La couleur de sélection reste sur la rubrique courante et ne change qu'au clic. Les autres icônes se partagent le reste, chacune à `min(1.25rem, largeur de sa case - 4px)` (20 px en police normale), sans jamais descendre sous une case de 24 px : un libellé qui n'y tient pas voit sa police réduite. Le passage d'un onglet mis en avant à un autre est progressif (largeurs des cases animées sur `--dur`, libellé en fondu), d'après la largeur des libellés mesurée en JS (10/10/2026).
- Parcours sur téléphone (700 px et moins), variante C rendue dans Chrome : seule l'escale choisie reçoit le focus au Tab (`tabindex="0"`), les autres `tabindex="-1"`, les flèches ↑ ↓ changeant d'escale ; au bureau, toutes les escales restent au Tab (10/10/2026).
- Parcours au bureau, deux variantes rendues dans Chrome (11/10/2026) : les libellés des escales de Codewars et de « RNCP 6 » sont alignés à droite, à gauche de leur astre, car le vaisseau à quai sur l'escale suivante traversait leur date dans la maquette (en français comme en anglais) ; la règle est `LABEL_CLIMB` dans `js/sections/journey.js` (montée du tracé au-delà de laquelle le libellé du dessus passe à gauche).
- Projets, trois décisions de Louis du 12/10/2026 (variante C rendue dans Chrome pour la première) : (1) les planètes de la Piscine ont des tailles variables comme celles des autres systèmes, selon la longueur du texte de leur projet (somme des caractères des blocs), classées par rang de la plus courte à la plus longue, de 8,4 à 13 unités avec une égalité départagée par l'ordre des projets (calculées sur la langue des données affichées : les rangs diffèrent légèrement entre français et anglais, les positions jamais) ; les autres systèmes gardent la règle des blocs (`planetSize`) ; (2) tout le système est sélectionnable en vue générale : un clic sur son soleil, sur une planète ou sur le reste de sa cellule le zoome ; (3) aucune planète ne s'ouvre ni ne se focalise tant qu'aucun système n'est zoomé (soleils et liste restent le chemin au clavier), elles ne le deviennent que dans le système zoomé ; l'introduction de la rubrique devient « Sélectionne un système pour t'en approcher, puis une planète pour ouvrir son projet. » / « Select a system to fly closer, then a planet to open its project. » (texte proposé, à relire par Louis).
- Plafonnement général des textes (11/10/2026) : tout texte dont le plus long mot ne tiendrait pas sur une ligne dans sa largeur voit sa taille de police plafonnée, dans tout le site, jamais un mot coupé ni un débordement ; un texte dont les mots tiennent ne change pas.
- Projets, maquettes S6 rendues dans Chrome (11/10/2026) : l'introduction d'un système se place sous le plan, sur toute la largeur de la page, et ne s'affiche que système zoomé ; la liste des projets est masquée pendant un zoom (les planètes ouvrent les fiches) ; au bureau, quatre systèmes deux par deux au repos et plan de la Piscine zoomée de la maquette B (orbites de 215 unités au plus) ; planètes de la Piscine de mêmes tailles que celles des autres systèmes ; teinte azur de la Piscine (soleil `#e2f0ff`/`#4f8cff`, planète `#bcd8ff`/`#2f62c9`) ; sur téléphone, toutes les étiquettes de la Piscine zoomée, les planètes de la Piscine gardent leur taille normale avec une zone de toucher de 44 px (« le diamètre moyen d'un pouce », lecture R1 choisie par Louis), le plan s'agrandissant en hauteur si besoin ; si deux zones de toucher se touchent, le toucher choisit la planète dont le centre est le plus proche du centre du pouce.
- Projets, rendu final validé par Louis (13/10/2026) ; sur téléphone, les zones de toucher de 44 px des planètes de la Piscine zoomée restent visibles (option « Avec zones visibles » des maquettes S6 : remplissage et filet de teinte `--live`, `css/projects.css`, règle `.sys.on .planet.nearest .pl-hit`).
- Compétences, maquettes S8 rendues dans Chrome (13/10/2026) : le lien Devpedia se place avant le plan, entre le chapeau et les constellations, sur toute la largeur de la page (choix de Louis du 18/10/2026, qui remplace D4 du 17/10/2026 ; D4 avait remplacé D2 du 13/10) ; le parcours d'un projet lié part de R2 (saut vers Projets, système zoomé, fiche) mais la caméra va jusqu'à l'astre, c'est-à-dire la planète du projet ; lecture R2b choisie le 17/10/2026 sur les maquettes de S8.A1b : un seul mouvement de caméra du plan d'ensemble à la planète, sans arrêt sur le système, puis la fiche ; à la fermeture le focus va à la planète et la caméra revient au système ; phrase du lien Devpedia tutoyée (« tu peux consulter », point final ajouté) ; légende des astres au format « Galaxie : Avancé » (niveau tel que `skills.levels`) ; disposition téléphone P2 choisie le 17/10/2026 : en plongée, le nom de l'étoile se place sous l'astre, dans le cadre visible du plan (hors de la barre du haut), le saut de hauteur du plan à l'entrée et à la sortie étant corrigé par une hauteur animée.
- Compétences, noms d'étoile sur deux lignes (choix de Louis du 18/10/2026) : le champ facultatif `nameLines` trace le nom sur deux lignes, décalé de 24 px vers la gauche en vue d'ensemble ; `name` reste la source du panneau, des puces et des `aria-label`.

## Options écartées

À ne pas reproposer sans demande explicite de Louis.

| Sujet | Option écartée | Raison |
|---|---|---|
| Direction | « Atlas céleste » (serif, bleu de Prusse) | Non retenue d'emblée |
| Direction | « Deep Field » et « Console de mission » seules, hybride à bandeau de télémétrie | Fusionnées : style et télémétrie de la console, palette, animations et navigation du Deep Field ; le bandeau horizontal n'a pas plu |
| Palette | Graphite et orange signal | Bleu nuit et or préféré |
| Nom | Nom de famille en lettres creuses (Unbounded) | Police non appréciée |
| Compétences | Radar à secteurs | Constellations jugées plus stylées |
| Compétences | Constellations en zigzag « dépliées » | La génération organique précédente était mieux |
| Compétences | Étoile, planète, lune, étoile morte | Remplacées par galaxie, nébuleuse, géante jaune, étoile en roche magmatique craquelée |
| Parcours | Courbe horizontale sur mobile | Trop fine et trop petite |
| Parcours | Anneau comme marqueur | Remplacé par le vaisseau |
| Parcours | Ouverture sur la première escale | Position actuelle préférée |
| Parcours | Glisser ou molette sur la trajectoire pour changer d'escale sur téléphone | Gêne le défilement de la page : flèches seules |
| Transition | Zoom en un seul temps avec glissement vertical | Remplacé par le saut en deux temps centré |
| Projets | Missions avec écussons brodés, grille de cartes | Systèmes orbitaux préférés |
| Projets | Zoom avec panneau latéral listant les projets du système | Noms affichés sur les planètes préférés |
| Je me présente | Paragraphes fondus dans les escales du parcours, sans section dédiée | Une section « Je me présente » visible est attendue |
| Je me présente | Section en haut ou en bas du parcours | Sous l'accueil préféré |
| Contact | Canal de transmission (oscilloscope), antenne et satellites, amarrage du vaisseau, carte d'embarquement | Disque d'or préféré |
| Contact | Adresse, boutons et liste des réseaux en texte à côté du disque (et ses variantes téléphone : sans sillons, disque collant, disque à côté) | Le disque seul porte les contacts, pour inviter à le manipuler |
| Contact | Adresse gravée remplacée par « ADRESSE COPIÉE » au clic, ligne d'état visible sous le texte | L'adresse gravée reste intacte et le disque suffit (la ligne d'état n'existe plus que pour les lecteurs d'écran) |
| Contact | Sur téléphone, sillons du disque entier touchés directement (premier toucher pour voir, second pour ouvrir) | Anneaux trop fins (environ 20 px) : le disque s'ouvre d'abord sur sa moitié haute agrandie |
| Favicon | Monogramme LC, orbite, viseur | Trajectoire préférée |
