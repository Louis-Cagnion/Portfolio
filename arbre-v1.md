# Arbre : fin de la V1 (S10, crash-test, corrections, fusion dans `main`)
Statuts : [ ] à faire, [~] en cours, [x] faite, [v] validée, [!] bloquée, [>] reportée au pré-mortem
Prochaine étape : V1.E en cours (crash-test), V1.C et V1.D attendent Louis
Moniteur : sonnet/high (réglage `settings.json`, 18/10/2026) : convient pour trier un rapport et chaîner des feuilles de correction ; le crash-test (V1.E) et la relecture avant fusion (V1.H) sont confiés à opus, au-dessus du moniteur
Objectif de Louis (18/10/2026) : finir la V1 dans la journée.

- V1 [nœud] : une V1 qu'un recruteur consulte sur ordinateur et téléphone, poussée dans `main` (`docs/design/plan.md:128` : « En anglais, nouvelle version, usage de l'IA, contributeurs en dernier ; chasse aux cas limites sur tout le site »)
  - [v] V1.A builder sonnet/medium : `README.md` en anglais, usage de l'IA, contributeurs en dernier (commit 830de78)
  - [v] V1.B moniteur : ouverture de « Je me présente » écrite par Louis, reportée dans `data/fr.json` et `data/en.json` (commit 130e1c7)
  - [ ] V1.C Louis : relit les textes provisoires sur la page de relecture (compétences, résumés de projets, messages d'interface) ; le moniteur reporte ses corrections dans `data/*.json` ; dépend de : rien
  - [ ] V1.D Louis : S8.E2, rendu final des Compétences à 1280 px et en téléphone émulé, confirme la phrase Devpedia réécrite et la lecture « constellation déployée au retour » ; dépend de : S8.E1 (validée)
  - [~] V1.E crashtester opus/high (18/10/2026) : lecture seule, toute la V1 à 320, 390, 768, 1280 et 2560 px, FR et EN, police de 100 % à 200 %, périmètre V1 seulement (aucun cas niche, aucune interruption d'animation, aucun axe du pré-mortem) ; rapport trié bloquant / majeur / mineur ; dépend de : V1.A
  - [ ] V1.F arbre de correction : construit d'après le rapport de V1.E (bloquants et majeurs qui gênent un visiteur en usage courant, les mineurs vont au `todo.md`) ; dépend de : V1.E
  - [ ] V1.G Louis : valide la V1 dans Chrome ; dépend de : V1.F, V1.C, V1.D
  - [ ] V1.H moniteur : fusion dans `main` (seulement `index.html`, `css/`, `js/`, `data/`, `assets/` et `README.md`, décision du 10/10/2026), push, puis le pré-mortem ; dépend de : V1.G
