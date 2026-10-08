# Checklist de design de la refonte

Cette checklist fixe les valeurs de design relevées dans la maquette `docs/design/prototype/prototype.template.html`, les règles de chaque composant et les contrôles d'accessibilité à respecter. Elle guide l'écriture des sous-tâches S3 à S9, puis sert de grille de vérification à la fin de chaque rubrique : chaque case doit être cochable par une mesure ou un constat, jamais par un avis.

Les valeurs viennent de la maquette (variable ou sélecteur cité). Quand une valeur de la maquette ne passe pas un critère, la règle retenue est écrite à côté et marquée **écart**.

Décision de Louis du 08/10/2026 : le rendu de la maquette est validé et fait foi. Un écart qui changerait l'apparence au repos (couleur, taille, espacement, hauteur de barre) ne s'applique pas : la maquette est reprise telle quelle et le contrôle concerné devient une exception listée (section « Décisions de Louis »). Seuls s'appliquent les ajouts invisibles au repos : clavier, focus, mouvement réduit, états de survol et actif, technique.

## Sommaire

- [1. Jetons de design](#1-jetons-de-design)
- [2. Composants](#2-composants)
- [3. Contrastes AA](#3-contrastes-aa)
- [4. Zones cliquables](#4-zones-cliquables)
- [5. Largeurs et points de rupture](#5-largeurs-et-points-de-rupture)
- [6. Mouvement](#6-mouvement)
- [7. Navigation clavier](#7-navigation-clavier)
- [8. Chargement et erreurs](#8-chargement-et-erreurs)
- [9. Pièges de la maquette](#9-pièges-de-la-maquette)
- [Décisions de Louis](#décisions-de-louis)
- [Vérification de la checklist](#vérification-de-la-checklist)

## 1. Jetons de design

Tous les jetons vivent dans `css/tokens.css` (sélecteur `:root`). Aucune couleur, police, durée ou ombre n'est écrite en dur ailleurs dans les feuilles de style : les couleurs de décor de la maquette ont aussi leur jeton (tableau « Couleurs de décor »), et les ombres de la section « Ombres, flous, durées » sont des jetons. Seuls les dessins des astres, des planètes et du disque restent hors des jetons, dans le JS, indexés par `id` ou `body` (plan, schéma des données).

### Couleurs

| Variable à créer | Valeur | Origine dans la maquette | Usage |
|---|---|---|---|
| `--void` | `#070d1f` | `:root --void` | fond de page, fond du ciel, encre sur or |
| `--panel` | `#0f1a38` | `:root --panel` | fond des panneaux, de la fiche, de la barre d'onglets |
| `--line` | `rgba(220, 230, 255, 0.13)` | `:root --line` | bordures et séparateurs |
| `--text` | `#e6ecff` | `:root --text` | texte principal, titres |
| `--dim` | `#9aa7cc` | `:root --dim` | texte secondaire, corps des panneaux |
| `--faint` | `#66739c` | `:root --faint` | mentions discrètes (compteurs, aides, légendes) ; 3,67:1 à 4,14:1, conservé (section 3) |
| `--accent` | `#e8b45a` | `:root --accent` | or : actions, coins HUD, focus, état actif |
| `--accent-ink` | `#070d1f` | `:root --accent-ink` | texte posé sur l'or |
| `--accent-soft` | `rgba(232, 180, 90, 0.15)` | `:root --accent-soft` | fond de l'élément actif (bascule de langue, onglet) |
| `--live` | `#8fe3bf` | `:root --live` | vert phosphore, réservé à la position actuelle (voir ci-dessous) |
| `--star` | `230, 236, 255` | `:root --star` | triplet RVB des étoiles, utilisé en `rgb(var(--star))` |
| `--accent-hover` | `#f6d08f` | `.body a:hover` | lien en ligne survolé |
| `--accent-edge` | `rgba(232, 180, 90, 0.55)` | `.const .group:hover .link`, `.planet .pl-bg` | filets or atténués au survol |
| `--scrim` | `rgba(0, 0, 0, 0.55)` | `.sheet-bg` | voile derrière la fiche |

Couleurs de décor (CSS de la maquette, valeurs relevées telles quelles) :

| Variable à créer | Valeur | Origine dans la maquette | Usage |
|---|---|---|---|
| `--label-bg` | `rgba(9, 16, 38, 0.92)` | `.planet .pl-bg` (fill) | fond d'étiquette de planète |
| `--orbit` | `rgba(220, 230, 255, 0.12)` | `.orbit` | orbite en pointillés |
| `--link` | `rgba(230, 236, 255, 0.24)` | `.const .link` | trait de constellation |
| `--link-sel` | `rgba(230, 236, 255, 0.35)` | `.const.focused .group.sel .link` | trait de la constellation sélectionnée |
| `--trail` | `#ffc56b` | `.trail circle` | traînée du vaisseau |
| `--groove` | `rgba(70, 45, 10, 0.35)` | `.groove-track` | piste d'un sillon |
| `--groove-lit` | `rgba(255, 235, 180, 0.85)` | `.groove-track.lit` | sillon allumé (halo `#ffd27a`) |
| `--engrave` | `rgba(80, 52, 14, 0.75)` | `.engrave` (stroke) | gravure du disque |
| `--engrave-text` | `rgba(80, 52, 14, 0.85)` | `.engrave-text` | texte gravé de l'étiquette ; 3,91:1, conservé (section 3) |
| `--arc-ink` | `#3b2507` | `.arc-name` (fill) | nom gravé d'un sillon |
| `--arc-halo` | `rgba(255, 240, 200, 0.55)` | `.arc-name` (stroke de 2px) | halo clair du nom gravé |
| `--lava` | `#ff7a2a` | `@keyframes lava` | lueur de la planète de lave |

- [ ] `--panel-2` (`#15244b`) n'est utilisé nulle part dans la maquette : ne pas le créer.
- [ ] Le vert `--live` n'apparaît que sur les signaux de la position actuelle : pastille de marque (`.brand i`), ligne `dd.live` de la télémétrie, pulsation de l'escale actuelle (`.traj .pulse`), voyants du vaisseau et de la station, point du favicon. Aucun bouton, lien, état de chargement ni message d'erreur ne l'utilise.
- [ ] Aucun rouge, orange ou autre teinte d'alerte n'est ajouté : les erreurs s'expriment avec l'or et le texte (section 8).
- [ ] Teintes des systèmes de projets, gardées dans `projects.js` : Tressol-Chabrier soleil `#fff6da`/`#e8b45a`, planète `#ffd88f`/`#b9822f` ; Projets perso soleil `#f3e1ff`/`#a46bd8`, planète `#e3c3ff`/`#7a45b0` ; 42 Perpignan soleil `#dcfff8`/`#4fd1c5`, planète `#b8f5ec`/`#25857c`. La teinte du système de la Piscine (S6) est distincte des trois autres et ne reprend ni l'or seul ni le vert `--live`.

### Polices

| Variable | Famille | Graisses chargées | Rôle |
|---|---|---|---|
| `--display` | `"Michroma", system-ui, sans-serif` | 400 | titres, nom, noms de systèmes |
| `--sans` | `"IBM Plex Sans", system-ui, sans-serif` | 400, 500, 600 | texte, boutons |
| `--mono` | `"IBM Plex Mono", ui-monospace, monospace` | 400, 500 | données, dates, étiquettes, disque |

- [ ] Le lien Google Fonts demande exactement ces graisses avec `display=swap` (`<link rel="stylesheet">` de la maquette).
- [ ] **Écart** : la maquette écrit `font: 600 9.5px var(--mono)` (`.engrave-text`) et `font: 700 15px var(--mono)` (`.arc-name`) alors que seules les graisses 400 et 500 de la Mono sont chargées, ce qui donne un gras synthétique. Charger la 600 et la 700, ou passer ces deux textes en 500.

Échelle typographique (taille, graisse, interligne ; `rem` = 16 px) :

| Rôle | Sélecteur d'origine | Taille | Graisse | Interligne ou autre |
|---|---|---|---|---|
| Corps de page | `body` | 1.0625rem | 400 Sans | 1.6 |
| Nom (h1) | `h1` | `clamp(2.3rem, 6.6vw, 5.2rem)` | 400 Display | 1.04, interlettrage -0.01em |
| Titre de rubrique (h2) | `h2` | `clamp(1.3rem, 3vw, 1.9rem)` | 400 Display | marges 56px 0 8px |
| Titre de fiche ou d'escale | `.detail h3` | 1.1rem | 400 Display | 1.4 |
| Titre de la fiche projet | `.sheet h3` | 1.25rem | 400 Display | 1.35 |
| Titre du message de contact | `.msg h3` | 1.15rem | 400 Display | 1.5 |
| Titre de constellation ou de système | `.ctitle` | 1.05rem | Display | marges 18px 0 12px |
| Marque | `.brand` | 0.82rem | Display | interlettrage 0.03em |
| Accroche | `.pitch` | 1.12rem | 400 Sans | largeur 33em |
| Ligne de mission | `.mission` | 1.0625rem | 500 Sans | couleur `--accent` |
| Chapeau | `.lede` | 1.0625rem | 400 Sans | largeur 60ch |
| Onglet de pilule | `.nav button` | 0.92rem | 500 Sans | |
| Bouton | `.btn` | 0.95rem | 600 Sans | |
| Bouton retour | `.back` | 0.9rem | 500 Sans | |
| Puce | `.chips button` | 0.88rem | 500 Sans | |
| Bascule de langue | `.lang button` | 0.8rem | 500 Mono | |
| Onglet du bas | `.tabbar button` | 0.68rem | 500 Sans | |
| Intitulé de dossier | `.dossier-body dt` | 0.85rem | 500 Mono | |
| Date d'escale | `.when` | 0.9rem | 400 Mono | |
| Compteur, aide, légende | `.count`, `.cue`, `.hint`, `.legend` | 0.8rem, 0.8rem, 0.9rem, 0.85rem | 400 | Mono pour compteur et repère |
| Étiquette de tag | `.tags li` | 0.8rem | 400 Mono | |
| Texte SVG | `.traj .wp text`, `.sun-label`, `.pl-name`, `.cname` | 14px, 15px, 12.5px, 14px | 500, 400 Display, 500, 600 | mis à l'échelle par `--u` en zoom |

- [ ] Aucun texte justifié ni alinéa ; texte aligné à gauche, lignes de 80 caractères au plus (`max-width` en `ch` : 60ch chapeau, 68ch corps et dossier).
- [ ] Les textes rédigés (`.body`, `.lede`, dossier) portent `overflow-wrap: anywhere` pour qu'une adresse ou un mot long ne crée jamais de débordement.

### Espacements, rayons, hauteur de barre

- [ ] Gouttière horizontale : `--gutter: clamp(16px, 4vw, 48px)` (barre et `main`). Largeur de contenu : `--content-max: 1200px`.
- [ ] Hauteur de la barre : `--bar-h` n'est pas une constante. La maquette fixe `61px` ; la barre mesure en réalité 58px sur mobile et 70px sur ordinateur (boutons de langue de 31px, groupe de 33px), donc 61px est une valeur approchée de la maquette. Le JS affecte `--bar-h` à la hauteur réelle de la barre (`ResizeObserver`), et les éléments collants (`top`) et les défilements s'en servent.
- [ ] Valeurs d'espacement employées par la maquette, à reprendre sans inventer d'autres : 2, 3, 4, 6, 7, 8, 10, 11, 12, 13, 14, 16, 18, 22, 24, 26, 28, 32, 48, 56, 80 et 120 px (bas de `main`).
- [ ] Remplissages de panneau : `.detail` 26px 28px (22px 18px sous 880 px) ; `.telemetry` 22px ; `.dossier-body` 6px 28px (4px 18px sous 700 px) ; `.sheet` 32px ; `.focus-panel` 22px 24px.
- [ ] Rayons : `--radius-pill: 999px` (pilule, bascule), `--radius-tabbar: 22px`, `--radius-tab: 16px`, `--radius-label: 4px` (fond d'étiquette de planète). Panneaux, boutons, flèches, puces, tags et fiche ont des angles droits (0) : c'est l'identité HUD.
- [ ] Échelle d'empilement : ciel 0 ; `main` 1 ; scène du saut 3 ; flash 4 ; barre (sticky) 5 ; barre d'onglets (fixe) 6 ; voile 20 ; fiche 21.

### Ombres, flous, durées

- [ ] Flou d'arrière-plan : 12px (barre `.bar`, `.focus-panel`), 14px (`.tabbar`, `#jDetail` sur téléphone). Toujours doublé de `-webkit-backdrop-filter` (la maquette ne le fait que pour `#jDetail`).
- [ ] Ombres portées : disque `0 20px 40px rgba(0,0,0,.6)` ; halo d'appel du disque `0 0 18px rgba(232,180,90,.45)` ; vaisseau `drop-shadow 4px rgba(232,180,90,.6)` ; survol d'escale `6px .55`, de planète `8px .8`, de soleil `10px .6` ; balise de marque `0 0 10px var(--live)`.
- [ ] Courbes : `--ease-inout: cubic-bezier(.65, 0, .35, 1)` (pilule 0.5s, hauteurs 0.7s), `--ease-out: cubic-bezier(.2, .8, .2, 1)` (fiche 0.45s, entrée du saut 0.55s), `--ease-in: cubic-bezier(.5, 0, .75, .4)` (sortie du saut 0.45s).
- [ ] Durées : `--dur-fast: 0.2s` (boutons), `--dur: 0.3s` (couleurs, étiquettes), `--dur-slow: 0.5s`. Saut en hyperespace : 1020 ms au total, courbure FOV maximale `0.3` pendant 1000 ms (`FOV_MAX`).

## 2. Composants

Règle commune : tout élément interactif a un état par défaut, survol, focus visible, actif et, quand il peut l'être, désactivé. Le survol est enveloppé dans `@media (hover: hover)` pour ne pas rester collé après un toucher (**ajout** : la maquette n'en utilise aucun).

### Focus visible

- [ ] Règle globale `:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px }` (maquette ligne 26) : 10,22:1 sur `--void`, 9,07:1 sur `--panel`.
- [ ] Jamais d'`outline: none` sans équivalent : la maquette retire le contour des éléments SVG focalisables (`.wp`, `.group`, `.planet`, `.sun-btn`, `.rec-hit`) et ne laisse qu'un filtre de luminosité, insuffisant. **Écart** : chacun reçoit un anneau net en `:focus-visible` (trait `--accent` de 2 px, au moins 3:1 contre le fond voisin) sur sa zone cliquable.
- [ ] **Écart** pour le disque d'or : l'anneau `#fff3cf` de `.rec-hit:focus-visible .core` donne 1,10:1 à 2,01:1 sur l'or. Anneau sombre `#3b2507` de 2 px à la place (6,49:1 sur `#d9a54d`, 7,64:1 sur `#e8b45a`). Un sillon focalisé au clavier reçoit aussi ce trait sombre de chaque côté de la piste, en plus de l'éclairage (`.groove-track.lit` donne seulement 1,50:1 à 3,50:1 contre l'or).
- [ ] Un élément focalisé n'est jamais masqué par la barre collante ni la barre d'onglets : `scroll-padding-top: calc(var(--bar-h) + 8px)` et `scroll-padding-bottom: 88px` sur `html`.

### Panneau HUD

- [ ] Classe `.hud` : bordure 1px `--line`, fond `linear-gradient(var(--panel), color-mix(in srgb, var(--panel) 40%, transparent))`, position relative.
- [ ] Deux coins or seulement, 14 × 14 px, trait 2px `--accent`, sans événements de pointeur : `::before` en haut à gauche (`top/left: -2px`, sans bordure droite ni basse) et `::after` en bas à droite (`bottom/right: -2px`, sans bordure gauche ni haute).
- [ ] Panneaux HUD : télémétrie, dossier du pilote, fiche d'escale, panneau de compétences. Le détail de compétence imbriqué (`.skill`) n'a ni bordure ni coins. La fiche projet n'est pas un HUD (fond `--panel`, filet gauche, ou haut sur téléphone).

### Boutons

| Composant | Repos | Survol | Focus | Actif | Désactivé |
|---|---|---|---|---|---|
| Primaire `.btn.primary` | fond `--accent`, texte `--accent-ink`, 600, remplissage 13px 22px | monte de 2px (`translateY(-2px)`) | anneau global | retour à `translateY(0)` (**ajout**, absent de la maquette) | sans objet |
| Secondaire `.btn` | transparent, bordure `--line`, texte `--text` | bordure `--accent`, monte de 2px | anneau global | retour à `translateY(0)`, bordure `--accent` (**ajout**) | sans objet |
| Retour `.back` | transparent, bordure `--line`, texte `--text`, 0.9rem 500, flèche `←` `aria-hidden` | bordure `--accent` | anneau global | bordure `--accent` (**ajout**) | sans objet |
| Flèche `.arrows button` | 44 × 44px, bordure `--line`, fond `--void` à 60 %, texte `--text` | bordure `--accent` | anneau global | bordure `--accent` (**ajout**) | `opacity: .3`, curseur par défaut, retirée de l'ordre de tabulation |
| Fermer `.close` | 44 × 44px, bordure `--line`, `×` | bordure `--accent` (**ajout**, aucun `.close:hover` dans la maquette) | anneau global | bordure `--accent` (**ajout**) | sans objet |
| Puce `.chips button` | bordure `--line`, texte `--dim` | texte `--text`, bordure or à 50 % | anneau global | `aria-pressed="true"` : fond `--accent`, texte `--accent-ink` | sans objet |
| Entrée de liste `.plist button` | sans bordure, texte `--dim`, pastille de 9px | texte `--text` | texte `--text` et anneau global | texte `--text` | sans objet |

- [ ] Flèches de l'escale et de l'étoile : `aria-label` traduit (`journey.prev`, `journey.next`, `skills.prev`, `skills.next`), glyphes `←` `→` (bureau) ou `↑` `↓` (parcours sur téléphone).
- [ ] Contraste du texte désactivé non exigé (WCAG 1.4.3), mais l'état se lit par plus que l'opacité : `disabled` natif.
- [ ] La transition de `transform` et de `border-color` des boutons dure `--dur-fast`. Pour `.btn` seulement, c'est la valeur de la maquette ; pour les autres boutons (retour, flèches, fermer, puces, entrées de liste), c'est un **ajout**.

### Pilule et barre d'onglets

- [ ] Pilule (au-dessus de 880 px) : conteneur `.nav` arrondi `--radius-pill`, bordure `--line`, fond `--panel` à 70 %, remplissage 4px, intervalle 4px. Boutons en 0.92rem 500, texte `--dim`, `--text` au survol.
- [ ] Onglet actif : `aria-current="page"`, texte `--accent-ink` sur l'élément `.pill` (fond `--accent`, `top/bottom: 4px`) qui glisse en 0.5s `--ease-inout` sur `left` et `width`.
- [ ] La pastille est repositionnée par mesure de l'onglet actif à l'ouverture, à `document.fonts.ready`, à chaque changement de langue (largeurs FR et EN différentes) et au passage de 880 px (la pilule est `display: none` en dessous, donc sa mesure vaut 0).
- [ ] Barre d'onglets (880 px et moins) : fixe à `left/right/bottom: 10px`, 5 colonnes égales, remplissage 6px, rayon 22px, bordure `--line`, fond `--panel` à 90 % flouté 14px. Chaque onglet : icône 20 × 20 px au-dessus d'un libellé 0.68rem 500, rayon 16px, texte `--dim`.
- [ ] Onglet actif de la barre du bas : `aria-current="page"`, texte `--accent`, fond `--accent-soft`.
- [ ] Les deux navigations portent `aria-label` = `ui.sections` et affichent les mêmes cinq entrées, dans l'ordre accueil, parcours, compétences, projets, contact.

### Bascule FR/EN

- [ ] Groupe `role="group"` avec `aria-label` = `ui.language`, deux boutons `FR` et `EN` en 0.8rem Mono 500, bordure `--line`, rayon `--radius-pill`, `overflow: hidden`.
- [ ] Bouton de la langue courante : `aria-pressed="true"`, fond `--accent-soft`, texte `--accent`. L'autre : texte `--dim`.
- [ ] Chaque bouton garde la taille de la maquette (7px 12px, soit 31px de haut, 33px pour le groupe), en exception de la suite navigateur.
- [ ] Un changement de langue met à jour `lang` de `<html>`, `<title>` et la description, sans reconstruire la barre : le bouton pressé garde le focus.

### Fiche projet

- [ ] Panneau fixe à droite (`top/right/bottom: 0`, `width: min(620px, 100%)`, remplissage 32px, fond `--panel`, filet gauche `--line`), glissant de `translateX(100%)` en 0.45s `--ease-out`. Sur téléphone (880 px et moins) : feuille du bas, `height: 88vh`, `width: 100%`, filet haut, glissant en `translateY(100%)`.
- [ ] Voile `--scrim` plein écran (z-index 20) qui ferme la fiche au clic.
- [ ] Contenu : catégorie `.cat` (0.85rem Mono, `--accent`, texte `ui.systemOf`), titre `h3`, liste de tags (0.8rem Mono, bordure `--line`, remplissage 3px 8px), blocs de texte et de liste, liens.
- [ ] Bouton fermer 44 × 44px en haut à droite ; aucune zone n'est coupée horizontalement à 320 px (aucun `scrollWidth > clientWidth + 1` ; la fiche défile en `overflow-y: auto`, ce qui reste permis).
- [ ] Rôle et comportement : voir section 7.

### Liens en ligne dans le texte rédigé

- [ ] Dans `.body` et `.lede` : couleur `--accent`, sans soulignement natif, filet de 1px en fond (`background: linear-gradient(currentColor, currentColor) 0 100% / 100% 1px no-repeat`), 2px et couleur `--accent-hover` au survol et au focus, transition `background-size` 0.25s. Le focus clavier de `.lede a` est un **ajout** (la maquette ne l'a que sur `.body a`). Contraste sur `--panel` (fond de la fiche et des panneaux) : 9,07:1 (repos), 11,70:1 (survol).
- [ ] Un lien se reconnaît sans la couleur seule : le filet est toujours présent.
- [ ] `<strong>` dans `.body` : `--text`, graisse 600.
- [ ] Tout texte qui contient un lien est rédigé dans un `p` ou un `li`, pour que la règle d'exemption des liens en ligne s'applique (`isInlineTextLink`). Dans la maquette, le parent des liens du dossier est un `dd`, hors de `.body` : l'implémentation les met dans des `p` portant la classe `.body`, pour hériter du style des liens ci-dessus.

## 3. Contrastes AA

Ratios calculés avec la formule WCAG 2.x (luminance relative sRGB, `(L1 + 0,05) / (L2 + 0,05)`) par un script Node jetable. Les fonds translucides sont composés sur `--void` (ciel). Seuils : 4,5:1 pour le texte courant, 3:1 pour le grand texte (24px, ou 18,66px en gras) et les composants graphiques.

### Texte

| Paire (texte sur fond) | Valeurs | Ratio | Verdict |
|---|---|---|---|
| `--text` sur `--void` | `#e6ecff` / `#070d1f` | 16,39 | réussi |
| `--text` sur `--panel` | `#e6ecff` / `#0f1a38` | 14,53 | réussi |
| `--text` sur fiche mobile translucide | `#e6ecff` / `#0b142c` | 15,48 | réussi |
| `--text` sur fond d'étiquette de planète | `#e6ecff` / `#091025` | 16,01 | réussi |
| `--dim` sur `--void` | `#9aa7cc` / `#070d1f` | 8,08 | réussi |
| `--dim` sur `--panel` | `#9aa7cc` / `#0f1a38` | 7,16 | réussi |
| `--dim` sur bas d'un panneau HUD | `#9aa7cc` / `#0a1229` | 7,75 | réussi |
| `--dim` sur panneau de compétences | `#9aa7cc` / `#0b142c` | 7,62 | réussi |
| `--dim` sur pilule (`.nav`) | `#9aa7cc` / `#0d1631` | 7,46 | réussi |
| `--dim` sur barre d'onglets | `#9aa7cc` / `#0e1936` | 7,24 | réussi |
| `--accent` sur `--void` | `#e8b45a` / `#070d1f` | 10,22 | réussi |
| `--accent` sur `--panel` | `#e8b45a` / `#0f1a38` | 9,07 | réussi |
| `--accent` sur `--accent-soft` (bascule de langue) | `#e8b45a` / `#292628` | 7,92 | réussi |
| `--accent` sur `--accent-soft` (onglet du bas) | `#e8b45a` / `#2f303b` | 6,91 | réussi |
| `--accent-ink` sur `--accent` | `#070d1f` / `#e8b45a` | 10,22 | réussi |
| `--live` sur `--void` | `#8fe3bf` / `#070d1f` | 12,80 | réussi |
| `--live` sur `--panel` | `#8fe3bf` / `#0f1a38` | 11,35 | réussi |
| `--accent-hover` sur `--void` | `#f6d08f` / `#070d1f` | 13,20 | réussi |
| `--accent-hover` sur `--panel` | `#f6d08f` / `#0f1a38` | 11,70 | réussi |
| **`--faint` de la maquette sur `--void`** | `#66739c` / `#070d1f` | **4,14** | **sous 4,5** |
| **`--faint` de la maquette sur `--panel`** | `#66739c` / `#0f1a38` | **3,67** | **sous 4,5** |
| **`--faint` de la maquette sur bas de HUD** | `#66739c` / `#0a1229` | **3,97** | **sous 4,5** |
| **`--faint` de la maquette sur fiche mobile** | `#66739c` / `#0b142c` | **3,91** | **sous 4,5** |
| Nom gravé du disque (`.arc-name` `#3b2507`) sur or clair | `#3b2507` / `#ffe7a8` | 11,87 | réussi |
| Nom gravé sur or `#e8b45a` | `#3b2507` / `#e8b45a` | 7,64 | réussi |
| Nom gravé sur sillon allumé | `#3b2507` / `#fce3a7` | 11,48 | réussi |
| Nom gravé mesuré au rendu, sillons 1 à 4 (`.arc-name` `#3b2507`, centré en haut du disque par `startOffset: 25%`) | `#3b2507` / fond rendu | 7,65 ; 6,91 ; 6,19 ; 5,72 | réussi (minimum 5,72) |
| Nom gravé mesuré au rendu, cœur | `#3b2507` / fond rendu | 8,27 | réussi |
| **Texte gravé de l'étiquette (`.engrave-text`)** | `#654517` / `#d9a54d` | **3,91** | **sous 4,5** |

Notes de lecture :

- Le fond d'un panneau HUD va de `--panel` (haut) à `--panel` à 40 % sur le ciel (bas) : un texte réussit si la paire passe sur les deux extrêmes, ce qui est le cas pour `--dim`.
- Les fonds du disque sont estimés par le dégradé radial `recGold` (stops `#ffe7a8`, `#e8b45a`, `#b47a2a`, `#7a4f17`). Les fonds translucides du tableau sont estimés sur `--void` : les astres qui passent derrière peuvent les éclaircir, donc la mesure au rendu fait foi.

Paires de texte sous le seuil dans la maquette : `--faint` sur les quatre fonds (usages : `.count`, `.cue`, `.hint`, `.legend`, `.related p`, `.sun-sub`, `.traj .wp text.y`, `.todo`) ; texte gravé de l'étiquette (`.engrave-text`). Les noms gravés `.arc-name` de la maquette passent (au moins 5,7:1 mesuré au rendu).

- [ ] `--faint` (`#66739c`) et `.engrave-text` gardent les valeurs de la maquette (décision de Louis) : ce sont les seules paires de texte admises sous 4,5:1.
- [ ] `.arc-name` garde l'encre `#3b2507` de la maquette ; contraste des noms gravés des quatre sillons et du cœur vérifié au rendu (outil de mesure du navigateur, au moins 4,5:1 ; la maquette donne 5,72 au minimum).
- [ ] Tout nouveau texte ajouté dans l'implémentation (messages d'erreur, annonces, système de la Piscine) est vérifié avec la même formule avant d'être validé.

### Composants graphiques et états (3:1)

| Élément | Valeurs | Ratio | Verdict |
|---|---|---|---|
| Anneau de focus global sur `--void` | `#e8b45a` / `#070d1f` | 10,22 | réussi |
| Anneau de focus global sur `--panel` | `#e8b45a` / `#0f1a38` | 9,07 | réussi |
| Anneau de focus global sur fiche mobile | `#e8b45a` / `#0b142c` | 9,65 | réussi |
| Coins HUD, bordure au survol, puce active | `#e8b45a` / `#070d1f` | 10,22 | réussi |
| **Anneau de focus du disque** (`#fff3cf`) sur or `#e8b45a` | `#fff3cf` / `#e8b45a` | **1,71** | **sous 3** |
| **Anneau de focus du disque** sur or `#d9a54d` | `#fff3cf` / `#d9a54d` | **2,01** | **sous 3** |
| **Anneau de focus du disque** sur or clair `#ffe7a8` | `#fff3cf` / `#ffe7a8` | **1,10** | **sous 3** |
| **Sillon allumé** sur or `#e8b45a` | `#fce3a7` / `#e8b45a` | **1,50** | **sous 3** |
| **Sillon allumé** sur or `#b47a2a` | `#fce3a7` / `#b47a2a` | **2,90** | **sous 3** |
| Anneau de focus du disque retenu `#3b2507` sur or `#d9a54d` | `#3b2507` / `#d9a54d` | 6,49 | réussi |
| **Bordure `--line` sur `--void`** | `#23293c` / `#070d1f` | **1,34** | **sous 3** |
| **Bordure `--line` sur `--panel`** | `#2a3552` / `#0f1a38` | **1,41** | **sous 3** |

- Bordures `--line` : décoratives. Elles séparent des panneaux ou cernent un bouton dont le libellé ou le glyphe (contrastes de texte réussis ci-dessus) l'identifie. Règle vérifiable : aucun contrôle n'est reconnaissable par sa seule bordure `--line` (pas de bouton sans libellé ni glyphe), et le survol, le focus et l'état actif passent à `--accent` (10,22:1).
- Sillon allumé : l'éclairage n'est pas le seul signe d'état, il s'accompagne du nom gravé (texte, tableau ci-dessus) et de l'anneau sombre au clavier.
- Boutons désactivés : exemptés par WCAG 1.4.3 et 1.4.11.

Composants sous le seuil dans la maquette : anneau de focus du disque, sillon allumé, bordures `--line` (traitées comme décoratives ci-dessus).

## 4. Zones cliquables

La suite navigateur mesure tout `a[href]`, `button`, `[role="button"]`, `[role="link"]`, `[tabindex]` et `[data-go]` visible (plus, pour l'ordre et l'inertie, la constante `INTERACTIVE` : `[tabindex]:not([tabindex="-1"])`, `input`, `select`, `textarea`, `summary`, `[role="tab"]`), à toutes les largeurs et dans les deux langues : 44 × 44px au minimum (`MIN_TARGET` de `tests/browser/checks.js`, tolérance 0,5px). Deux exceptions non bloquantes, codées dans `exceptionLabel` du même fichier :

- [ ] Lien en ligne (`isInlineTextLink`) : un `a` en `display: inline` dans un `p` ou un `li`, entouré d'autre texte (WCAG 2.5.8). Aucun lien qui forme à lui seul un bloc, un bouton ou une entrée de liste n'en profite.
- [ ] Les liens en ligne sont donc rédigés dans des `p` ou des `li`, y compris dans le dossier du pilote et les listes de la fiche projet.
- [ ] Composants que la maquette dessine sous 44px (`MOCKUP_SIZED`) : ils gardent sa taille (décision de Louis) et l'implémentation garde exactement ces sélecteurs, sans quoi la suite les compte en échec : onglets de la pilule `.nav button` (environ 35px de haut), `.lang button` (31px), `.back` (environ 36px), `.chips button` (environ 32px), `.plist button` (31,5px), `.cue`, `.brand`. Le bouton `.rec-hint` a déjà `min-height: 44px`.
- [ ] Les boutons de 44 × 44px de la maquette restent tels quels : flèches (`.arrows button`, `.stage-arrows button`), `.close`.
- [ ] Zones cliquables SVG (tout élément interactif dans un `svg`, en exception) : rayons de la maquette en unités du dessin, escales 22 ou 30 (`.traj .hit`), étoiles 18 (`s.hit`), planètes `size + 10` (17 à 23), sillons et cœur du disque (37 à 39px de large à 320 px).
- [ ] Espacement entre cibles voisines : celui de la maquette (6px entre les puces).

## 5. Largeurs et points de rupture

Largeurs de contrôle : 320, 390, 430, 768 et 1280 px, en français et en anglais, pour chaque rubrique.

- [ ] `documentElement.scrollWidth <= clientWidth` à chacune de ces largeurs et dans chaque rubrique ; aucun élément visible ne sort du viewport ; aucun défilement horizontal (`scrollWidth > clientWidth + 1`) sur un élément, l'`overflow-y: auto` de la fiche restant permis ; aucun `overflow-x: auto` ni `scroll` (la maquette met `body { overflow-x: clip }`, qui masque le défaut sans le corriger : ne pas s'en servir pour passer le test).
- [ ] En-tête à 320 px : marque 140,4px + bascule de la maquette (moins de 2 × 44px) + intervalle 24px + gouttières 32px tiennent en 286px : aucune règle de repli n'est nécessaire.
- [ ] Barre d'onglets à 320 px : la grille `repeat(5, 1fr)` de la maquette élargit la colonne « Compétences » à 68,2px et ramène les autres à 54,4px (mesuré au rendu de la maquette, 48px de haut) : aucun débordement, rien à changer. Vérifier aussi en anglais.

Points de rupture de la maquette (mêmes valeurs en CSS et en JS, définies une fois) :

| Largeur | Source | Ce qui change |
|---|---|---|
| 880 px et moins | `@media (max-width: 880px)` et `narrow` (`matchMedia`) | la pilule disparaît, la barre d'onglets du bas apparaît ; accueil sur une colonne (`gap: 32px`, hauteur automatique) ; fiche d'escale en 22px 18px ; Compétences : constellations sur 2 colonnes (170 × 200), plan de zoom ratio `1 / 1.15`, panneau de détail placé sous le plan collant avec `margin-top: -34vw` ; Projets : quatre systèmes empilés (plan ; la maquette en a trois) (360 × 810, inclinaison 0,9 au zoom), `.sys-head` dans le flux ; fiche projet en feuille du bas (88vh) ; poussière d'étoiles supprimée (`W <= 880`) |
| 820 px et moins | `@media (max-width: 820px)` et `phoneDisc` | Contact sur une colonne (message, disque, aide), disque de 320px au plus, disque verrouillé puis moitié haute, bouton `.rec-hint` |
| 700 px et moins | `@media (max-width: 700px)` et `mobile` | dossier du pilote sur une colonne (intitulé au-dessus du texte) ; parcours en courbe verticale (scène collante de 58svh, titre et flèches sur la scène, fiche translucide floutée remontée de 20svh, flèches de la fiche masquées) |

- [ ] Aucun point de rupture n'est ajouté sans mise à jour de ce tableau.
- [ ] La plage 701 à 880 px (dont 768 px) combine la barre d'onglets et le parcours horizontal : vérifier les deux ensemble.
- Non appliqué (décision de Louis) : à 768 px le parcours horizontal (`viewBox 0 0 1100 300`) est réduit à 0,64 (contenu de 706px) ; ses textes de 14px et 12px s'affichent à environ 9px et 7,7px. Le rendu de la maquette est conservé.
- [ ] Au-dessus de 880 px : le contenu s'arrête à `--content-max` (1200px) centré ; à 1280px la poussière d'étoiles borde les marges (`band = max(140, (W - 1200) / 2 + 160)`).
- [ ] À la fin de chaque rubrique, les cinq largeurs sont examinées en rendu réel dans Chrome, téléphones compris.

## 6. Mouvement

- [ ] `prefers-reduced-motion: reduce` est lu par `matchMedia` à chaque usage (pas une fois pour toutes) et son changement pendant la session est pris en compte.
- [ ] Sous mouvement réduit : le saut en hyperespace est remplacé par un changement de rubrique immédiat (ni scène, ni flash, ni courbure FOV) ; toute interpolation (`makeCamera.tween`, `animate`, `tweenVB`) se termine en une seule image (durée 0) ; `scrollTo` et `scrollIntoView` passent en `behavior: 'auto'` ; la traînée du vaisseau n'est pas émise ; les planètes ne tournent plus (la maquette garde la garde `!reduce()` dans `spin`).
- [ ] **Écart** : la règle CSS de la maquette (`animation-duration: 0.01ms`, `transition-duration: 0.01ms`) laisse tourner en boucle infinie à 0,01ms les animations `blink`, `cue`, `pulse`, `flame`, `bob`, `starPulse`, `breathe`, `spin`, `drift`, `lava`, `flicker`, `turn` et `discCall` (animations CSS ; `spin` est aussi le nom de la fonction JS qui fait tourner les planètes, traitée ci-dessous), ce qui produit un scintillement. À la place : `animation: none` pour toutes les boucles décoratives et `transition: none`.
- [ ] **Écart** : la boucle du ciel de la maquette ne regarde jamais `reduce()`. Sous mouvement réduit le ciel est figé : une seule image est dessinée (vitesse `BASE` sans défilement, aucune scintillation ni dérive de la poussière) et redessinée au redimensionnement seulement.
- [ ] Une boucle d'animation (`requestAnimationFrame`) par rubrique, démarrée à l'entrée de la rubrique et annulée (`cancelAnimationFrame`) à sa sortie, à l'onglet masqué (`document.hidden`) et à la fin du mouvement. Seul le ciel tourne en continu. La maquette lance `spin` en permanence et se contente de tester `current === 'projects'` à chaque image : ne pas copier.
- [ ] Contrôle : sur chaque rubrique, un compteur de `requestAnimationFrame` actifs ne dépasse pas 2 (ciel et rubrique), et vaut 1 sur l'accueil immobile.
- [ ] Toute boucle qui intègre le temps plafonne le pas : `dt = Math.min(now - last, 50)` (comme `spin` dans la maquette), pour qu'un onglet qui revient de l'arrière-plan ne fasse pas sauter les planètes. S'applique au ciel, aux planètes, au vaisseau.
- [ ] Une animation de caméra bloque le recentrage automatique au redimensionnement tant qu'elle tourne (`ccam.raf || moving`, `scam.raf || zMoving`).
- [ ] Animations d'entrée ou de sortie de texte ne portent que sur `opacity` et `transform` (`fadeText` 0.45s) ; les transitions de hauteur (`.viz`, `.systems`, 0.7s `--ease-inout`) sont les seules sur une propriété de mise en page.
- [ ] Aucune animation ne clignote plus de 3 fois par seconde sur une grande surface : le battement de la flamme (`steps(2)` en 0.14s) ne couvre que le vaisseau (30px).

## 7. Navigation clavier

- [ ] Ordre de tabulation, dans l'ordre du DOM : marque, pilule (au-dessus de 880 px), bascule FR puis EN, contenu de la rubrique affichée, barre d'onglets du bas (880 px et moins), fiche projet seulement quand elle est ouverte. Les rubriques non affichées (`display: none`) et la scène du saut (`pointer-events: none`) ne reçoivent pas le focus : la vue qui sort est `inert` pendant le saut.
- [ ] Boutons et lien de marque s'activent par Entrée ; les `button` et `[role="button"]` aussi par Espace. Les groupes SVG focalisables (escales, constellations, soleils, planètes, cœur du disque) portent `tabindex="0"`, `role="button"`, `aria-label` et gèrent Entrée et Espace comme dans la maquette. Les étoiles `.st-g` n'ont ni `tabindex` ni `role` dans la maquette : elles le deviennent (ajout validé, section « Décisions de Louis »).
- [ ] Flèches : la maquette n'installe aucun raccourci `ArrowLeft/Right/Up/Down`. Les flèches sont des boutons à l'écran, atteints par Tab ; ne pas ajouter de raccourci global sans décision de Louis.
- [ ] Un bouton flèche qui devient désactivé (première ou dernière escale ou étoile) ne laisse pas le focus tomber sur `body` : le focus passe à l'autre flèche.
- [ ] Les éléments masqués visuellement par un zoom (`.sys.dim`, `.const .group.dim`, opacité 0 ou 0,06) sortent aussi de l'ordre de tabulation (`tabindex="-1"` ou `inert`) ; la maquette les laisse focalisables.
- [ ] Échap, un cran à la fois : ferme la fiche projet si elle est ouverte ; sinon quitte le zoom des Compétences ; sinon quitte le zoom des Projets ; sinon, dans Contact, referme le disque (téléphone).
- [ ] Focus rendu à l'élément d'origine : fermeture de la fiche, retour à la planète, à l'entrée de liste ou à la puce qui l'a ouverte ; sortie du zoom des Compétences, retour à la constellation (`g.focus({ preventScroll: true })`) ; sortie du zoom des Projets, retour au soleil du système.
- [ ] Si l'élément d'origine n'est plus affiché (ouverture depuis une puce « Projets liés » des Compétences, puis fermeture dans Projets), le focus va à la planète du même projet, sinon au titre h2 de la rubrique (`tabindex="-1"`). Il ne reste jamais sur un élément détruit ou masqué.
- [ ] Fiche projet : `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointant le titre. À l'ouverture : le focus va au bouton fermer. Tab et Maj+Tab bouclent dans la fiche ; le reste de la page est `inert`. Fermée, la fiche est `inert` et `visibility: hidden` (la maquette la laisse seulement translatée hors écran, donc focalisable).
- [ ] Après un changement de rubrique, le focus est déplacé sur le titre h2 de la nouvelle rubrique (`tabindex="-1"`), pour que le lecteur d'écran l'annonce et que Tab reparte du haut du contenu.
- [ ] Les zones qui s'annoncent portent `aria-live="polite"` (`#jDetail`, `#skill`) ou `role="status"` (`#recStatus`, `#status`) ; seul le contenu qui change y est écrit.
- [ ] Contact : les quatre sillons sont des liens et le cœur un bouton, atteignables au clavier même quand le disque est verrouillé sur téléphone (le verrou ne bloque que le pointeur).
- [ ] Un lien qui ouvre un nouvel onglet (`target="_blank"`) porte `rel="noopener"`.

## 8. Chargement et erreurs

Le bloc `#status` est statique dans `index.html` et stylé par `layout.css`, donc visible avant que le JavaScript ait chargé. Variante « Console » choisie par Louis le 08/10/2026, référence rendue : `docs/design/prototype/status-variants.html`.

- [ ] Chargement : panneau HUD centré (largeur `min(34rem, 100% - 2 × var(--gutter))`, **proposé** : sans source dans la maquette) sur fond `--void`, texte `ui.loading` en `--dim`, titre en Display, indicateur : barre de 3px sur fond `--line`, segment or (`--accent`) de 35 % qui balaie en `transform` seulement (1,4s, `--ease-inout`) ; jamais le vert `--live`. `role="status"` et `aria-live="polite"`.
- [ ] Le texte statique est en français (langue par défaut) et il est remplacé dès que la langue est connue.
- [ ] Une balise `<noscript>` affiche un message dans le même panneau.
- [ ] Erreur : même panneau HUD, titre `ui.errors.title` (Display 1.15rem, `--text`), barre figée en pointillés or (14px pleins, 8px vides, opacité 0,55) entre le message et les boutons, un message distinct par cause, en `--dim` : `network`, `timeout` (délai de 10 s), `http` (avec `{status}`), `json`, `schema` (avec `{path}`). `role="alert"`.
- [ ] Bouton **Réessayer** (`ui.errors.retry`) en bouton primaire, 44 × 44px au moins ; un clic remet l'état de chargement, relance `loadLocale` et ne laisse pas le focus sur un bouton retiré du DOM. Le lien `ui.errors.langSwitch` est un bouton secondaire.
- [ ] À l'apparition de l'erreur, le focus va au titre du panneau (`tabindex="-1"`).
- [ ] Le chemin du champ (`{path}`) et le statut sont en Mono, avec `overflow-wrap: anywhere`.
- [ ] Aucun débordement ni contraste sous le seuil à 320, 390, 430, 768 et 1280 px, dans les deux langues, pour chacune des cinq causes (suite navigateur, `fetch` simulé).
- [ ] La page d'erreur ne contient aucune trace de pile ni message technique brut ; le détail utile (statut, champ) est dans la phrase.
- [ ] Le premier rendu n'attend pas les polices : texte visible dès le repli système (`display=swap`), puis mesure refaite à `document.fonts.ready`.

## 9. Pièges de la maquette

Les principes d'implémentation (mesures, polices, saut en hyperespace, placement des constellations) sont dans la section « Principes » de `docs/design/plan.md`. Règles rappelées ici :

- [ ] Aucune dimension n'est lue sur un élément d'une rubrique non affichée : les largeurs d'étiquettes de planète se calculent par `canvas.measureText`.
- [ ] Un élément survolé ou focalisé n'est déplacé dans le DOM que s'il n'est pas déjà le dernier de son parent (`sysG.lastElementChild === g || sysG.append(g)`), pour que le clic atteigne l'élément.
- [ ] Une animation de caméra bloque le recentrage au redimensionnement tant qu'elle tourne, pour que la vue n'alterne pas entre gros plan et vue globale.

Commandes de contrôle :

- [ ] `grep -rn innerHTML js/` ne renvoie que `js/core/dom.js` ; tout texte de données passe par `setRich()` (balises `<strong>`, `<em>` et `<a href>` en `https:` ou `mailto:` seulement).
- [ ] Le caractère U+2014 (tiret cadratin) est absent de `index.html`, `css/`, `js/`, `data/` et `README.md`.
- [ ] Aucun texte du site ne date une situation par un mot de temps relatif (« en cours », « actuellement », « aujourd'hui ») : `grep -rniE "en cours|actuellement|aujourd" index.html data/ README.md` ne renvoie rien. L'accroche de la maquette (`.pitch`) en contient un, absent du texte validé du plan.

## Décisions de Louis

Tranchées le 08/10/2026 : le rendu de la maquette fait foi.

Écarts non appliqués (apparence de la maquette conservée) :

- `--faint` (`#66739c`) et encre de `.engrave-text`, sous 4,5:1.
- Cibles sous 44px de la maquette (`MOCKUP_SIZED` et zones SVG, disque à 320 px compris), hauteurs de barre de la maquette, 6px entre les puces.
- Textes du parcours à 768 px (environ 9px et 7,7px).

Ajouts appliqués (invisibles au repos) :

- Focus : anneau de 2px en `:focus-visible` sur les éléments SVG, anneau sombre `#3b2507` du disque et trait du sillon focalisé, focus sur le h2 (`tabindex="-1"`) après un changement de rubrique, étoiles `.st-g` focalisables, éléments `.dim` sortis de la tabulation.
- Fiche avec `inert` et boucle de focus ; `scroll-padding-bottom: 88px` et `--bar-h` mesuré.
- Mouvement réduit en `animation: none` et `transition: none`, ciel figé.
- États `:active` et survol sous `@media (hover: hover)` ; bordures `--line` traitées comme décoratives.
- Une boucle `requestAnimationFrame` par rubrique ; graisses 600 et 700 de la Mono chargées.

Reste à concevoir avec Louis (maquettes rendues dans Chrome) : panneaux de chargement et d'erreur.

## Vérification de la checklist

- [ ] Chaque valeur chiffrée citée est présente dans la maquette (variable ou sélecteur indiqué), hors les rubriques marquées **écart**.
- [ ] La grille est rejouée à la fin de chaque rubrique S5 à S9, puis une dernière fois à S10.
