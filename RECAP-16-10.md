# Récapitulatif du 16/10/2026 (session moniteur, Linux)

S6 « Projets et fiche » est close (26/26 feuilles validées). S8 « Compétences » avance : feuilles validées 9/18, la vue d'ensemble est montée et mesurée, la suite reprend à B3.

## Faits de la journée

- S8.C4 : le travail partiel laissé le 13/10 est conforme au contrat (`node --test` 407 sur 410, 3 rouges `contact` ; six groupes navigateur aux cinq largeurs plus 2560 px : 658 réussis, 0 rouge ; vu dans Chrome). Validée.
- S8.C4b : la légende affiche le niveau tel que `skills.levels` (« Galaxie : Avancé »), conformément au choix de Louis (`docs/design/plan.md:163`). Le code mettait le niveau en minuscules et les tests l'exigeaient : corrigé (tests d'abord), `lang` mort retiré.
- S6.F4b : zones de toucher de la Piscine visibles sur téléphone (`css/projects.css`, `color-mix` sur `--live`), cas de test étendu à 768 px, lecteur de couleur du banc étendu à `color(srgb ...)`.
- S6.F5 (bug trouvé dans Chrome) : un clic réel sur le soleil de la Piscine ouvrait une fiche jusqu'à 880 px. Corrigé (clic d'entrée consommé) ; le cas de test n'est rouge qu'à 768 px, voir le pré-mortem du `todo.md`.
- La consigne ponctuelle « ne build rien » du 13/10 est retirée : les agents se relancent sans accord.
- Décision de Louis : après S10, un crash-test opus de toute la V1 (périmètre V1), corrections, validation, fusion dans `main`, puis le pré-mortem.
- Notifications : `notify-send -u critical` (règle du dépôt des commandes) ; `PushNotification` ne s'affiche pas sous GNOME Terminal.

## À savoir pour la reprise

- Prochaine feuille : S8.B3 (tester sonnet/medium, relevé à high si la mesure de l'à-coup n'est pas fixée au brief) : `tests/browser/skills-focus.js`, groupe `competences`, déploiement, plongée, saut, retour, clavier, Échap, mouvement réduit, boucles, bascule de langue ; vérifie aussi que le nom de chaque astre est visible en vue téléphone (critère de Louis du 13/10). Sondes à réutiliser : `tests/browser/skills-probe.js` (`groupEls`, `starEls`, `surveyOf`...) ; `s8Measure` de `docs/design/s8/mockup-measure.js` pour la mesure du saut de hauteur. Puis C5, C6 (relecture d'un analyst opus/high avant son commit), A1b, B4, C7, D1, E1, E2.
- Contrat de DOM déjà posé par C3 et C4 : `#constSvg`, `.group` (`tabindex` 0, `role="button"`), `rect.cell`, `.st-g` (`tabindex="-1"` au repos), `text.name`, `text.cname`, `.focus-panel.hud` (`inert` au repos), `.legend .mag`.
- Le Chrome de Louis garde les CSS et modules en cache : `fetch(url, { cache: 'reload' })` puis recharger avant de juger un rendu. Un onglet Claude in Chrome affiche les planètes avec quelques secondes de retard.
- Un clic synthétique du banc (`activate`) n'a pas de coordonnées : pour un défaut dépendant du point cliqué, utiliser `clickAtCentre` (`tests/browser/projects-probe.js`).
- Moniteur : sonnet/high convient (réévalué à la clôture de S6) ; relecture indépendante opus/high avant le commit de C6. Serveurs du moniteur sur 5520 et plus, agents sur 5510 à 5519.
