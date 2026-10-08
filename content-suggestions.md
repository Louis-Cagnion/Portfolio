# Suggestions de contenu

Points de contenu relevés pendant la refonte, à trancher ou à fournir par Louis. Les textes concernés sont dans `data/fr.json` et `data/en.json` (parité à garder), et dans `docs/design/prototype/skills-draft.json` pour les descriptions de compétences.

## Dates périmées

L'alternance « débutera en septembre 2026 » alors que la date est passée : `about.paragraphs[1]` et `journey.paragraphs[18]`, dans les deux langues. Louis a confirmé le 08/10/2026 qu'elle a commencé en septembre 2026, pour deux ans, au Groupe Tressol-Chabrier : écrire « J'y ai commencé en septembre 2026 une alternance de deux ans pour le titre RNCP6 Concepteur développeur de solutions informatiques ». La suite prévue : une seconde alternance d'un an pour un RNCP7 en IA.

Télémétrie de l'accueil, gardée telle quelle par Louis et reportée dans `docs/design/plan.md` : « Position actuelle : Groupe Tressol-Chabrier, alternance RNCP6 de 2 ans » et « Prochaine étape : RNCP7 en IA, alternance 1 an ».

## Contenu intemporel

Consigne de Louis du 08/10/2026 : le portfolio reste intemporel, sans « en cours », « actuellement », « aujourd'hui », « pour l'instant » ni « prochainement » ; un projet se décrit par ce qu'il fait et ce que j'y ai réalisé. Tournures datées du site actuel, à réécrire pendant S2 (en plus des cartes déjà reprises dans « Textes proposés ») :

- `journey.paragraphs[18]` : « Depuis que j'ai terminé le tronc commun, j'ai rejoint » devient « Une fois le tronc commun terminé, j'ai rejoint ».
- `journey.paragraphs[19]` : « sur lesquels j'ai travaillé ou sur lesquels je travaille actuellement » devient « sur lesquels j'ai travaillé ».
- `projects.professional.intro` : « Depuis que je travaille au siège du Groupe Tressol-Chabrier, je participe au développement » devient « Au siège du Groupe Tressol-Chabrier, j'ai participé au développement ».
- `projects.professional.list[1]` : « Je contribue à plusieurs tableaux de bord » devient « J'ai contribué à plusieurs tableaux de bord ».
- `projects.personal.list[3]` (Devpedia) : « Le site couvre aujourd'hui » devient « Le site couvre ».
- `about.paragraphs[1]` (« Aujourd'hui, mon tronc commun terminé ») : couvert par « Dates périmées » ci-dessus.

## Je me présente

`about.paragraphs[0]`, désormais en tête de la section sous l'accueil, commence par « Je m'appelle Louis Cagnion et je suis étudiant à 42 Perpignan » : le nom répète celui de l'accueil, et « étudiant » ne colle plus au poste actuel (tronc commun terminé, développeur au Groupe Tressol-Chabrier). Phrase d'ouverture à revoir.

## Compétences

- **PHP** : niveau « Débutant » alors que le back-office PHP 8 du Groupe Tressol-Chabrier est en production. Niveau à revoir.
- **Niveau à préciser** pour les compétences hors langages : chacune s'affiche aujourd'hui en « étoile en fusion ». Niveaux proposés dans « Textes proposés > Compétences », compétences professionnelles comprises.
- **WebSockets** : aucun usage trouvé dans le code de Louis. Webserv n'a pas de WebSocket (ni `Upgrade`, ni `Sec-WebSocket-Key`, ni statut 101), seulement des sockets TCP, et leur gestion revient à un coéquipier ; le Socket.IO de Transcendence revient à un autre. Validé par Louis le 08/10/2026 : renommer en « Sockets TCP et HTTP/1.1 », illustrée par Webserv.
- **C++** : Webserv est bien en C++98. Preuves limitées à C++98 (modules 00 à 09, part de Louis dans Webserv) : niveau « Intermédiaire » proposé au lieu d'« Avancé ».
- **Bash** : la description ne cite que Minishell, écrit en C ; citer aussi les scripts de Louis (Shell00/01 de la Piscine, `speedtest.sh`).
- **À ajouter** : TypeScript (débutant, Transcendence), Three.js (Pong 3D), tests unitaires JavaScript (Vitest dans Heartopia, `node --test` dans Supermarket-Compare), adressage IP (Netpractice) ; les compétences systèmes sont regroupées en deux (cf. « Textes proposés > Compétences »).
- **Descriptions provisoires** : toutes celles de `skills-draft.json` ont été rédigées pour la maquette, à relire une par une.

## Projets

Choix de Louis du 08/10/2026 :

- Une carte par projet du cursus encore absent : libft, ft_printf, get_next_line, Pipex, Minitalk, Born2beroot, Netpractice ; une seule carte pour les modules C++ 00 à 09.
- Projets personnels à ajouter : Codewars, Supermarket-Compare, Ultimate libft ; la Piscine devient un quatrième système, avec une planète par module (idée de Louis, reportée dans `docs/design/plan.md`).
- Dépôts ajoutés ensuite par Louis : Artificial-Intelligence (chatbot et expériences d'IA), Creativity-box et Games, proposés ci-dessous.
- Rush01 (Piscine) : le code du solveur est de Louis, Claude l'a aidé à améliorer son algorithme jusqu'au 9×9 ; seul `BILAN-RECHERCHE.md` (recherche SAT/CDCL jusqu'à n=108) est rédigé par Claude.

Faits relevés dans les dépôts du cursus et les dépôts personnels, à reporter dans les textes :

- **Minishell** : part de Louis donnée par lui (pipes, builtins `cd`, `env`, `exit`, `pwd` et le bonus des opérateurs logiques). Les en-têtes 42 se contredisent (« Created », « By » et « Updated » ne désignent pas le même auteur, « marvin » par défaut) et ne prouvent rien : Louis a fait `cd`, `env`, `exit` et `pwd`, ceux que la ligne « By » attribue justement à un coéquipier. Le texte actuel ne lui attribue que le bonus. Coquille : « Ctrl+/ » pour « Ctrl+\ ».
- **Cub3D** : d'après Louis, sa part est le parseur des cartes, la collision avec les murs, la minimap, les déplacements et la vitesse du personnage ; son binôme a fait le raycasting, les textures des murs, les entités et la vue haut-bas (la ligne « By » lui attribuait à tort les entités). « Fausse 2D » est inexact (pseudo-3D par raycasting).
- **Webserv** : part de Louis = parsing de la configuration, autoindex, GET/POST/DELETE, cookies et sessions (un dossier d'upload par session), CGI avec son binôme.
- **Transcendence** : IA = trajectoire prédite avec rebonds, zone de réaction limitée, fatigue au fil de l'échange, calquée sur le jeu de Louis ; 3D = Three.js, caméra animée puis orbitale, choix 2D/3D avec aperçu.
- **Fract-ol** : la troisième fractale est Multibrot.
- **Codewars** : Skyscraper Kyu 1 (6×6 en 0,5 s en février 2026, puis 7×7), interpréteur assembleur en C, RoboScript en Python.
- **Heartopia** : carte interactive, suivi de progression, recettes avec calculateur de profit, panneau d'administration qui édite les JSON, tests Vitest. Son README déclare une assistance Claude Code sur tout le développement.
- **Supermarket-Compare** : comparaison au prix normalisé (€/kg, €/L), liste de courses groupée par magasin, import par collage, 100 % côté client. une partie des commits co-écrits avec Claude, déclaré dans son README.

## Médias

- Photo de profil : `home.photo` est vide. À fournir si elle doit apparaître.
- Illustrations ou captures d'écran des projets : aucune aujourd'hui, à fournir si souhaitées dans le panneau de détail.

## Liens

Cub3D renvoie vers une recherche d'images Brave pour illustrer Wolfenstein (`projects.school`, ligne 306 des deux fichiers) : à remplacer par une source stable (page Wikipédia du jeu, par exemple).

## Textes proposés

Textes français validés par Louis le 08/10/2026, tirés des sections « Compétences » et « Projets » ; S2 les reporte dans `data/fr.json` et écrit leur version anglaise dans `data/en.json`. Le placement (cartes, listes, système de la Piscine) sera montré en maquette Chrome pendant S6.

### Cartes existantes corrigées

**Fract-ol** : premier bonus réécrit en « Créer une troisième fractale, Multibrot, en plus de Julia et Mandelbrot ».

**Minishell** : introduction et liste inchangées, sauf « Ctrl+/ » corrigé en « Ctrl+\ ». La fin devient :

- Les bonus consistaient à ajouter les opérateurs logiques `&&` et `||`, les priorités avec des parenthèses et les wildcards `*`.
- « De mon côté, j'ai écrit les pipes, les builtins `cd`, `env`, `exit` et `pwd`, ainsi que toute la partie bonus des opérateurs logiques et des priorités : un arbre binaire qui porte l'ordre d'exécution des commandes. » (Sources : Louis le 08/10/2026 et la carte actuelle, écrite par lui.)

**Cub3D** :

- Le but de ce second projet de groupe était de créer un jeu inspiré de [Wolfenstein 3D](https://fr.wikipedia.org/wiki/Wolfenstein_3D), avec un moteur en raycasting : une carte en deux dimensions projetée en pseudo-3D.
- « De mon côté, j'ai écrit le parseur des cartes, la collision avec les murs, la minimap, ainsi que les déplacements du personnage et la gestion de sa vitesse. Mon binôme s'est chargé du raycasting, des textures des murs, des entités et de la vue haut-bas des bonus. » (Source : Louis le 08/10/2026.)
- Les bonus consistaient notamment à : (liste inchangée)
- Phrase sur le binôme (caméra verticale) et remerciements : inchangés.

**Webserv** : introduction et liste inchangées. La fin devient :

- C'était déjà un énorme morceau pour la partie obligatoire. Pour les bonus, il fallait gérer les sessions des clients et les cookies, ainsi que plusieurs types de CGI.
- Mon binôme a pris en charge les sockets et la boucle `poll`. J'ai écrit le parsing du fichier de configuration, avec un message d'erreur pour chaque directive mal formée, l'autoindex, le traitement des requêtes GET, POST et DELETE, et les cookies et sessions : chaque visiteur dispose de son propre dossier d'upload. Les CGI, nous les avons écrits à deux.

**Transcendence** : le jeu nommé dès l'introduction, un paragraphe ajouté après la liste technique, et les deux modules détaillés.

- Première phrase : « Pour ce dernier projet du tronc commun, qui était également un projet de groupe, le but était de créer une véritable application web complète autour du jeu Pong, à jouer contre une IA ou contre un autre joueur sur le même clavier. »
- L'application repose sur React et TypeScript côté client, et sur des microservices NestJS côté serveur, le tout dans des conteneurs Docker.
- Créer une IA capable d'affronter les joueurs au Pong : elle prédit la trajectoire de la balle, rebonds compris, ne réagit que lorsque la balle entre dans sa zone et perd en précision au fil d'un long échange, comme un joueur fatigué. Je l'ai rendue plus humaine en analysant mes propres parties contre elle.
- Créer une version 3D du Pong avec Three.js : modèles, éclairage et palette, une caméra qui s'anime pendant le décompte puis tourne autour de la table au clavier, et un choix entre 2D et 3D avec un aperçu avant la partie.

### Projets professionnels

Sources : les dépôts professionnels de Louis et ses branches dans les dépôts d'équipe. Louis précise que tous ses projets pro sont réalisés avec Claude, et qu'il a repris l'outil de recherche conversationnelle d'un collègue en arrivant.

**Introduction de la catégorie**, phrase ajoutée à la fin : « Ces projets ont été réalisés avec l'assistance de Claude Code : j'en ai conçu, dirigé, relu et testé chaque changement. »

**Recherche conversationnelle** :

- Début réécrit : « J'ai repris le développement d'un outil de recherche conversationnelle, lancé par un collègue, qui permet d'interroger le stock de véhicules du groupe en langage naturel. »
- « de plusieurs méga-octets à quelques dizaines de kilo-octets » devient « de plus de 5 Mo à moins de 10 Ko » (5,2 Mo ramenés à 9,5 Ko).
- Retirer « et une application web installable (PWA) avec saisie vocale » : c'est le travail d'un collègue.
- Le reste est confirmé et vient de Louis : token signé HMAC, limitation de débit par IP, CSRF, campagne de crash-test (contrôle d'accès par concession, en-têtes CSP, fixation de session, délais réseau).

**Tableaux de bord** : confirmé, le tableau de bord de direction est surtout le travail de Louis, avec 17 endpoints. Phrase ajoutée : « Il permet de sélectionner plusieurs concessions à la fois et couvre aussi le centre d'appels et la qualité. »

**Scores NPS** et **audit nocturne** : confirmés, Louis est le seul auteur des deux pipelines et des deux modules du back-office (304 tests pour l'audit).

**Parseur PDF** : confirmé (171 tests, 12 marques, -29 % de temps à 150 DPI).

**Back-office d'administration** : réécrit, le socle (authentification, OAuth2, limitation de débit, CSRF) est l'œuvre de collègues et le client HTTP cURL vient de l'outil de recherche conversationnelle, par un collègue.

- « J'ai développé des modules dans le back-office d'administration commun à plusieurs applications internes : PHP 8 avec Slim 4, SQL Server en PDO, une base par module et des droits d'accès par module et par profil. »
- « J'y ai réalisé les modules de scores NPS et d'audit des boutiques en ligne décrits ci-dessus, et j'ai refondu le module de suivi des appels. »

**Nouvelle carte : la résolution des appels** : « J'ai porté dans le back-office l'outil de résolution des appels du centre d'appels, qu'un collègue avait prototypé en Python avec Streamlit. Le module lit l'entrepôt de données, permet de rattacher chaque appel à la bonne concession et calcule la facturation des appels, sur six onglets pensés pour être utilisables sans jargon technique, jusque sur téléphone. Il est couvert par 151 tests, dont 38 d'intégration. »

**Nouvelle carte : une migration de fiches clients** (terminée, à montrer, confirmé par Louis le 08/10/2026) : « J'ai réalisé les scripts Python qui ont préparé puis envoyé plus de 430 000 fiches clients d'un ancien logiciel vers l'API du nouveau, par lots, avec point de reprise, journaux d'envoi et rapport des fiches refusées. »

**Non retenus** : deux dépôts internes (auteur inconnu pour l'un, deux requêtes SQL pour l'autre).

### Nouvelles cartes du cursus

**Libft** : Le tout premier projet du cursus : recréer une quarantaine de fonctions de la bibliothèque standard du C (manipulation de chaînes et de mémoire, conversions, affichage), puis, en bonus, une petite boîte à outils de listes chaînées. Cette bibliothèque m'a ensuite suivi dans tous mes projets C, au point de devenir l'Ultimate libft.

**Ft_printf** : Recréer la fonction `printf` avec les conversions `c`, `s`, `p`, `d`, `i`, `u`, `x`, `X` et `%`. Les bonus ajoutaient les options de mise en forme : largeur, précision et les drapeaux `-`, `0`, `.`, `#`, `+` et espace, dont toutes les combinaisons doivent se comporter exactement comme l'original.

**Get_next_line** : Écrire une fonction qui renvoie un fichier ligne par ligne, quelle que soit la taille du tampon de lecture choisie à la compilation, sans fuite de mémoire. Le bonus demandait de lire plusieurs fichiers en même temps sans mélanger leurs lignes.

**Born2beroot** : Mon premier serveur : une machine virtuelle Debian installée et durcie à la main, avec des partitions chiffrées sous LVM, SSH sur un port dédié, un pare-feu UFW, une politique de mots de passe stricte, `sudo` journalisé et un script de supervision lancé toutes les dix minutes par cron. En bonus, j'y ai ajouté un site WordPress servi par lighttpd avec MariaDB et PHP, ainsi qu'un service supplémentaire de mon choix.

**Pipex** : Reproduire en C le comportement de `< fichier cmd1 | cmd2 > fichier` avec `fork`, `pipe`, `dup2` et `execve`. Les bonus ajoutaient un nombre quelconque de commandes enchaînées et le `here_doc`, qui lit l'entrée jusqu'à un mot limite et écrit à la suite du fichier de sortie.

**Minitalk** : Faire dialoguer un client et un serveur avec deux signaux seulement, `SIGUSR1` et `SIGUSR2` : chaque caractère est envoyé bit par bit, et le serveur accuse réception de chacun, ce qui évite d'en perdre en route.

**Netpractice** : Dix niveaux de configuration de petits réseaux à faire fonctionner : adresses IP, masques de sous-réseau, passerelles et tables de routage, sans aucune ligne de code mais avec beaucoup de calcul binaire.

**Les modules C++** : Dix modules pour passer du C au C++ orienté objet (C++98) :

- classes et premiers pas (00), mémoire, références et pointeurs sur membres (01) ;
- forme canonique et surcharge d'opérateurs avec un nombre à virgule fixe (02) ;
- héritage, y compris en diamant (03), polymorphisme, classes abstraites et interfaces (04) ;
- exceptions (05), conversions de types et sérialisation (06) ;
- templates (07), conteneurs, itérateurs et algorithmes de la STL (08) ;
- et un dernier module d'exercices complets : un convertisseur de cours du Bitcoin, une calculatrice en notation polonaise inversée et le tri de Ford-Johnson (09).

### Système de la Piscine

**Introduction du système** : La Piscine est le mois de sélection de 42, avant le cursus : chaque planète de ce système est l'un de ses modules. J'en ai validé une partie pendant la Piscine, et terminé le reste après, pour le plaisir, jusqu'à 100 %.

Une planète par module :

- **Shell00** : premiers pas dans le terminal : droits des fichiers, liens, archives, Git et clés SSH.
- **Shell01** : premiers scripts : recherche et comptage de fichiers, adresse MAC, lecture de `/etc/passwd` avec `sed` et `rev`, calcul dans des bases inventées, et un fichier au nom volontairement piégé.
- **C00** : premiers programmes en C avec une seule fonction autorisée, `write` : alphabet, nombres et combinaisons.
- **C01** : les pointeurs : échange de valeurs, division, inversion et tri d'un tableau.
- **C02** : les chaînes de caractères : copie, tests, majuscules, et un affichage de la mémoire à la manière de `hexdump`.
- **C03** : comparer, concaténer et chercher dans des chaînes.
- **C04** : convertir du texte en nombre et inversement, dans n'importe quelle base.
- **C05** : récursivité et mathématiques : factorielle, puissance, Fibonacci, nombres premiers et le problème des dix dames.
- **C06** : les arguments de la ligne de commande, jusqu'à les trier.
- **C07** : l'allocation dynamique : duplication, concaténation, conversion de base et découpage d'une chaîne.
- **C08** : en-têtes, macros et structures.
- **C09** : ma première bibliothèque statique et mon premier Makefile.
- **C10** : lire des fichiers en recréant `cat`, `tail` et `hexdump`.
- **C11** : les pointeurs sur fonctions : `map`, `foreach`, tri générique et une calculatrice.
- **C12** : les listes chaînées.
- **C13** : les arbres binaires : insertion, recherche et parcours (préfixe, infixe, suffixe, par niveau).
- **Rush00** : dessiner un rectangle en caractères selon un motif imposé, en équipe et en un week-end.
- **Rush01** : résoudre un Skyscraper 4×4. Je l'ai repris bien après, jusqu'aux grilles 9×9 ; Claude m'a aidé à améliorer mon algorithme (propagation de contraintes, retour arrière sur la ligne la plus contrainte), mais le code est le mien, et un bilan de recherche rédigé avec lui explore ensuite des tailles bien plus grandes.
- **Rush02** : écrire un nombre en toutes lettres à partir d'un dictionnaire.
- **BSQ** : le projet final : trouver le plus vite possible le plus grand carré libre dans une carte d'obstacles.

### Nouveaux projets personnels

**Codewars** : Mes solutions aux exercices de Codewars, en C et en Python. La plus difficile est un Skyscraper de niveau Kyu 1, le plus haut du site, que j'ai fini par résoudre en 0,5 s sur une grille 6×6, puis en 0,01 s en 7×7 après avoir élagué les possibilités dès les indices. On y trouve aussi un interpréteur d'assembleur écrit en C et la série RoboScript, un petit langage à interpréter en Python.

**Ultimate libft** : La suite de ma libft : plus de 150 fonctions C rangées par thème (chaînes, listes chaînées, mathématiques et conversions de bases, mémoire, fichiers, affichage en couleurs, vérifications), réutilisées dans chacun de mes projets C.

**Un comparateur de courses** (Supermarket-Compare) : Une application web qui compare les prix de plusieurs supermarchés, toujours ramenés au kilo ou au litre pour ne pas se faire piéger par la taille des paquets. Elle génère la liste de courses magasin par magasin en limitant le nombre d'arrêts, accepte une liste collée depuis une application de notes, et tourne entièrement dans le navigateur. Développée avec l'assistance de Claude Code, chaque changement étant relu et dirigé par moi, et couverte par des tests unitaires.

**Creativity box** : Ma boîte à expériences, où je m'autorise tout, surtout la manière la plus compliquée : trois variantes de `printf` recodées de zéro (`fprintf`, `sprintf`, `asprintf`), un système solaire modélisé en C++ orienté objet qui classe les planètes par masse, diamètre, température ou gravité, et quelques utilitaires du quotidien, comme un convertisseur de couleurs RGB vers Pantone ou un suivi de séances de sport.

**Des outils pour mes jeux** (Games) : De petits programmes, surtout en C++, pour les jeux auxquels je joue : calculateurs de multiplicateurs de types pour Pokémon et Temtem, un calcul de score pour Balatro, un catalogue des ballons de Bloons TD 6, un solveur pour Tusmo, un jeu textuel en C inspiré de Solo Leveling avec sauvegarde des joueurs, et le premier prototype de la carte de Heartopia, devenu ensuite le wiki.

**Un chatbot IA** (mise à jour de la carte actuelle) : « En termes d'IA, j'ai créé un chatbot qui dialogue avec un modèle Mistral exécuté en local par Ollama : une interface web en JavaScript et un petit serveur Express qui relaie les messages, sans aucune API externe. J'ai aussi mené des expériences dans un dépôt dédié : statistiques et standardisation de données avec NumPy, traitement d'images, graphiques avec Matplotlib et un premier réseau de neurones avec Keras. » L'ancienne mention « relié par adresse IP » ne décrit pas le code : le serveur appelle l'API locale d'Ollama.

**Devpedia** (mise à jour de la carte actuelle) : Louis a écrit la base (architecture, parseur Markdown, premières pages, juin 2026), puis a confié à Claude l'essentiel du projet : contenu, nouvelles fonctionnalités et traductions dans les quatre langues. Louis avait intégré lui-même l'API DeepL (29/07/2026), abandonnée une fois son quota gratuit d'un million de caractères épuisé, puis retirée le 17/08/2026.

- Le troisième paragraphe devient : « J'ai écrit la base du site, dont le parseur Markdown qui assure le rendu de chaque chapitre, et j'y avais intégré l'API DeepL pour traduire automatiquement chaque page. Son quota gratuit d'un million de caractères n'a pas tenu longtemps : j'ai alors passé le relais à Claude Code, qui en a rédigé l'essentiel du contenu, ajouté les nouvelles fonctionnalités et traduit chaque page en anglais, espagnol et portugais. Chaque page peut aussi être écoutée, grâce à une lecture audio générée dans les quatre langues. »

**Ce portfolio** : « Et oui, ça compte. » devient « Et oui, ça compte. Sa refonte spatiale a été réalisée avec l'assistance de Claude Code. »

**Wiki Heartopia** (mise à jour de la carte actuelle) : le premier paragraphe devient « j'ai créé un wiki interactif autour du jeu Heartopia : une carte où situer les objets à collectionner et la faune, suivre sa progression et parcourir les recettes, avec un calculateur de profit ». Un paragraphe ajouté : « Un panneau d'administration permet de modifier les données directement depuis le navigateur. Le projet a été développé avec l'assistance de Claude Code et il est couvert par des tests unitaires. »

### Compétences

- **C++** : niveau « Intermédiaire ». Description : « Appris avec les dix modules C++ de 42, de la programmation orientée objet aux templates et à la STL, puis mis en pratique dans Webserv, un serveur HTTP écrit de zéro en C++98. »
- **C** : description complétée par « jusqu'à un Skyscraper de niveau Kyu 1 sur Codewars ».
- **Bash** : description : « Scripts de la Piscine et scripts de mesure de mes solveurs, et surtout Minishell, qui m'a fait reproduire en C le comportement de Bash : redirections, variables d'environnement, signaux, opérateurs logiques et priorités. »
- **WebSockets** devient **Sockets TCP et HTTP/1.1** : « Webserv : requêtes GET, POST et DELETE, codes de statut, cookies et sessions, CGI, sur un serveur non bloquant écrit de zéro. »
- **Nouvelles compétences** :
  - TypeScript (Débutant, un seul projet et une partie ciblée) : « Le Pong de Transcendence : l'IA adverse côté serveur et le rendu 3D côté client. »
  - Three.js (Débutant, une scène simple sans shader) : « La version 3D du Pong de Transcendence : modèles, éclairage et caméra animée. »
  - Tests unitaires JavaScript (Débutant, suites écrites avec l'assistance de Claude Code) : « Vitest pour le wiki Heartopia, `node --test` pour le comparateur de courses. »
  - Réseau IP (Intermédiaire, les dix niveaux de Netpractice et deux machines configurées) : « Adresses, masques de sous-réseau et routage appris avec Netpractice, pare-feu et SSH configurés dans Born2beroot. »
- **Systèmes, regroupés en deux compétences** au lieu de « Threads / sémaphores », « Mutex et processus enfants », qui se recoupaient :
  - Threads, mutex et sémaphores (Intermédiaire, Philosophers seul ; les threads de Cub3D sont de ton binôme) : « Philosophers : maintenir des philosophes en vie à la milliseconde près, avec des threads et des mutex, puis des processus et des sémaphores en bonus. »
  - Processus, pipes et signaux (Avancé : les pipes de Minishell sont de Louis, en plus de trois projets solo avec leurs bonus) : « `fork`, `pipe`, `dup2` et `execve` dans Pipex puis dans les pipes de Minishell, signaux UNIX dans Minitalk, processus et sémaphores dans le bonus de Philosophers. »
- **Niveaux des compétences existantes** :
  - HTML et CSS : Intermédiaire (quatre sites en ligne ou locaux, responsive, sans framework).
  - Makefiles : Intermédiaire (un par projet C, règles bonus, options d'optimisation réglées sur le solveur Skyscraper).
  - Git et GitHub : Intermédiaire (des centaines de commits sur une dizaine de dépôts, travail d'équipe sur Transcendence, sites publiés sur GitHub Pages, alertes Dependabot corrigées).
  - Sockets TCP et HTTP/1.1 : Intermédiaire (ta part de Webserv porte sur HTTP, pas sur les sockets).
  - VirtualBox : Intermédiaire (Debian installée et durcie dans Born2beroot, puis base d'Inception).
  - MinilibX : Intermédiaire (Fract-ol en entier, puis la minimap, les déplacements et les collisions de Cub3D).
  - Valgrind : Intermédiaire (traque des fuites dans tous les projets C du cursus, où la moindre fuite fait échouer l'évaluation).
  - Docker : Débutant (Inception sans les bonus, le projet qui t'a donné le plus de mal ; le Docker de Transcendence est d'un coéquipier).
  - VS Code : retiré des compétences (Louis, 08/10/2026 : une interface de code n'est pas une compétence).
  - NumPy et Matplotlib : Débutant (scripts d'expérimentation du dépôt Artificial-Intelligence : statistiques, valeurs manquantes, standardisation, affichage d'images et de courbes). Descriptions : « Mes expériences d'IA : statistiques, standardisation et valeurs manquantes » ; « Courbes d'apprentissage et affichage d'images dans mes expériences d'IA ».
  - PyTorch devient **TensorFlow / Keras** (Débutant) : Louis se souvient de tests d'IA dans son dépôt perso, mais tout son historique ne contient que TensorFlow (détection des GPU) et Keras (réseau linéaire), aucun `import torch`. Description : « Mes premiers pas en deep learning : un réseau de neurones linéaire avec Keras dont je suis l'apprentissage, et la détection du GPU avec TensorFlow. »
  - Compétences pro, toutes exercées avec l'assistance de Claude Code (à dire dans chaque description) :
    - PHP : Intermédiaire au lieu de Débutant (dix mois de développement quotidien, une plateforme multi-applications et quatre modules de back-office, dont la sécurisation).
    - SQL / PDO : Intermédiaire (pipeline Staging, Silver, Gold sur SQL Server avec tests de cohérence, accès PDO dans le back-office).
    - APIs : Intermédiaire (17 endpoints du tableau de bord de direction, Power BI embarqué, API d'envoi des fiches clients, API locale d'Ollama pour le chatbot, et l'API DeepL que j'avais intégrée à Devpedia). Dans la description actuelle, « Devpedia est traduit via l'API DeepL » devient « j'avais intégré l'API DeepL pour traduire Devpedia automatiquement ».
    - Sécurité web : Intermédiaire (token HMAC, CSRF, limitation de débit, contrôle d'accès par concession, CSP, fixation de session, corrigés en crash-test).
    - Elasticsearch : Débutant (le moteur de recherche existait avant la reprise ; corrections des filtres et de la qualité des données).
  - Nouvelles compétences pro proposées : Azure DevOps Pipelines (Débutant, déploiement planifié des pipelines NPS et d'audit, avec Ruff et pytest) et Playwright (Débutant, extraction en parallèle par plateforme de l'audit nocturne).
