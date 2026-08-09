# Suivi du Sprint 6

## Objectif

Faire évoluer NexaLearn autour du « voyage de la connaissance » sans modifier les
contrats API ni introduire de données métier fictives. Les animations restent
courtes, locales, accessibles au clavier et neutralisées avec
`prefers-reduced-motion`.

## État des travaux

| Lot | État | Validation |
|---|---|---|
| Contrôle Git et intégration réelle du Sprint 5 | Terminé | `main` à `8f6ce23`, commit Sprint 5 `b4be2b7` inclus dans l’historique de merge et contenu fonctionnel présent |
| Validations frontend avant modification | Terminé | 47 tests, lignes 72,72 %, TypeScript, ESLint et build réussis |
| Audit visuel et structurel | Terminé | Pages publiques et participant contrôlées, règles `absolute`, débordements, contenus longs, thèmes et z-index inventoriés |
| Correction prioritaire du hero | Terminé | Statut et progression intégrés au flux de la carte, cinq largeurs validées en clair et sombre |
| Système global de mouvement | Terminé | Tokens partagés, interactions courtes, révélation unique et neutralisation reduced-motion |
| Parcours de connaissance interactif | Terminé | Navigation clavier, halo local avec `requestAnimationFrame`, mobile vertical et liste sémantique |
| Pages publiques et espaces privés | Terminé | Accueil, catalogue, cours, authentification, participant, formateur et administration consolidés par composants partagés et tests de rôles |
| Tests ciblés Sprint 6 | Terminé | 9 tests dédiés au hero, clavier, thèmes, rôles, timers, rollback et reduced-motion |
| Recette navigateur | Terminé avec réserves | Hero : 390, 768, 1024, 1366 et 1600 px en clair/sombre ; routes participant contrôlées aux cinq largeurs ; Engagement formateur validé après reconnexion et actualisation |
| Validation finale | Terminé | 60 tests frontend, couverture supérieure à la référence, TypeScript, ESLint, build, Docker Compose et 33 tests backend réussis |

## Audit et corrections

### Hero public

- Suppression des coordonnées absolues de `.live-chip`, `.hero-score` et
  `.hero-dashboard`.
- « Classe en direct » est désormais un badge compact dans le header de la carte.
- « 68 % » est aligné avec « Parcours actif » et reste attaché à sa barre de
  progression.
- Les trois actions sont en flux normal, entièrement visibles et protégées contre
  les contenus longs.
- L’aperçu est explicitement marqué « Aperçu illustratif » et « Donnée de
  démonstration » : il ne simule pas une session utilisateur réelle.

### Système visuel global

- Ajout de durées partagées de 140, 240 et 480 ms, de courbes d’accélération et
  d’une élévation limitée à 2 px.
- États hover, focus et active cohérents sur boutons, cartes et navigation.
- Header public plus compact au scroll avec listener passif limité par
  `requestAnimationFrame`.
- Révélation discrète des sections une seule fois avec `IntersectionObserver`.
- Désactivation des déplacements, halos et animations avec
  `prefers-reduced-motion`.
- Paragraphes limités à 72 caractères environ, focus visible, cibles tactiles de
  44 px et couleurs de statut renforcées en clair et sombre.

### Parcours de connaissance

- Étapes rendues navigables avec les flèches, `Home` et `End`.
- Halo limité au composant, mis à jour par variable CSS sans state React sur
  `pointermove`.
- Annulation du frame en attente au démontage.
- Passage vertical lisible sur mobile ; libellés et états restent disponibles dans
  l’arbre sémantique, sans dépendre du survol.

### Catalogue et formations

- Cartes stables avec élévation de 2 px, zoom d’image de 1,025 et équivalent focus.
- Images distantes servies par `next/image` avec `sizes` et origines MinIO
  autorisées.
- Badges attachés à l’image, largeur bornée et retour à la ligne.
- Footer des cartes, filtres et grilles protégés contre les textes longs et les
  largeurs intermédiaires.
- Décalage vertical artificiel des modules du parcours supprimé.

### Authentification et espaces privés

- Sélecteur de thème des écrans d’authentification replacé dans le flux Grid.
- Checkbox invisible de l’onboarding réduite à 1 × 1 px : le débordement mobile de
  75 px est supprimé.
- Rangées formateur et quiz passées de colonnes inline fixes à une classe responsive.
- Modales : titre unique, focus initial, fermeture par Échap, restauration du focus
  et nettoyage du listener.
- Onglets : roving `tabIndex`, flèches, `Home` et `End`.

### Engagement et apprentissage

- Favoris, notes et notifications optimistes avec restauration de l’état précédent
  en cas de refus serveur et feedback accessible.
- Quiz : icônes distinctes pour réussite et erreur, l’information ne dépend plus
  uniquement de la couleur ; animation unique du score.
- Classes virtuelles : statut « En direct » calculé à partir des dates réelles,
  compte à rebours réel et intervalle nettoyé au démontage.
- Dashboard participant : une erreur backend n’est plus remplacée silencieusement
  par un faux état générique.
- Engagement formateur : les états chargement, absence de données, session expirée,
  accès interdit, panne serveur, erreur réseau et succès sont distingués. Le bouton
  « Réessayer » relance la requête et les erreurs du profil ou d’une action restent
  séparées du chargement principal.
- Un formateur sans formation, inscription, statistique ni avis reçoit un payload
  vide valide et un état utile avec le lien « Voir mes formations ». Aucune
  statistique fictive ni note privée n’est affichée.
- La grille Engagement passe sur une colonne à 1 100 px pour tenir compte de la
  largeur occupée par la barre latérale et empêcher la carte du profil de sortir du
  viewport.

### Incident Engagement formateur

La recette authentifiée a reproduit l’incident avec les éléments suivants :

- URL : `http://localhost:8080/api/formateur/engagement` ;
- méthode : `GET` ;
- statut avant correction : **500 Internal Server Error** ;
- corps : `{"timestamp":"2026-07-31T13:55:37.234+00:00","status":500,"error":"Internal Server Error","path":"/api/formateur/engagement"}` ;
- console navigateur : aucun message ; l’erreur venait bien de la réponse backend.

Le processus Java lancé par IntelliJ utilisait un `target` incohérent :
`EngagementService.class` appelait
`InscriptionRepository.countByFormationFormateurId(Long)`, tandis que la classe
`InscriptionRepository.class` chargée ne contenait pas encore cette méthode Sprint 5.
Le défaut exact était donc un **`NoSuchMethodError` causé par un mélange de bytecode
Sprint 5 ancien et récent**, et non l’absence de données du formateur.

Après arrêt du processus obsolète, `mvn.cmd clean test` a recompilé les 104 sources.
L’appel réel renvoie désormais **200** avec
`{"inscriptions":0,"avisPublies":0,"moyenneAvis":0.0,"avis":[]}`. L’access log
Tomcat corrélé enregistre `POST /api/auth/login 200`, puis
`GET /api/formateur/engagement 200`, sans `ERROR` ni `NoSuchMethodError` dans le
journal applicatif.

Flyway a validé les cinq migrations et le schéma courant en version 5. La ligne
`flyway_schema_history` de V5 a `success = 1`. Les dix tables nécessaires existent :
`activites_apprentissage`, `avis_formations`, `favoris_formations`, `notes_privees`,
`notifications`, `objectifs_hebdomadaires`, `participant_preferences`,
`positions_apprentissage`, `preferences_notifications` et `signalements_avis`.

## Recette responsive et thèmes

Le hero a été mesuré dans le navigateur en thème clair et sombre :

| Largeur | Débordement horizontal | Éléments contenus dans la carte | Chevauchement |
|---:|---|---|---|
| 390 px | Aucun | Oui | Aucun |
| 768 px | Aucun | Oui | Aucun |
| 1024 px | Aucun | Oui | Aucun |
| 1366 px | Aucun | Oui | Aucun |
| 1600 px | Aucun | Oui | Aucun |

Les contrôles vérifient l’ordre vertical, les limites de la carte et l’absence
d’intersection entre le badge, la progression et les actions. Les routes
`/profile`, `/participant/onboarding`, `/participant/notes`,
`/participant/classes` et `/notifications` ont également été contrôlées aux cinq
largeurs sans débordement. L’authentification et le catalogue ont été contrôlés à
390 px ; les actions conservent une hauteur tactile de 44 px.

## Positions absolues conservées

Elles sont limitées à des usages attachés ou décoratifs :

- icône de recherche et bouton d’affichage du mot de passe à l’intérieur du champ ;
- badge de niveau borné sur l’image d’une formation ;
- lignes et halo décoratifs du parcours de connaissance ;
- lien d’évitement, modales, menu mobile, drawer et notifications superposées.

Aucune information métier du hero, action ou pourcentage n’utilise désormais un
positionnement absolu.

## Résultats des validations

Exécutés le 31 juillet 2026 :

- `npm.cmd run typecheck` : réussi ;
- `npm.cmd run lint` : réussi, avec le message informatif connu de
  `jsx-ast-utils` sur `TSSatisfiesExpression` ;
- `npm.cmd run test -- sprint6.test.tsx` : **1 fichier, 9 tests réussis** ;
- `npm.cmd run test` : **12 fichiers, 60 tests réussis** ;
- `npm.cmd run test:coverage` :
  - statements : **70,52 %** (1 005 / 1 425) ;
  - branches : **67,67 %** (693 / 1 024) ;
  - fonctions : **64,76 %** (318 / 491) ;
  - lignes : **74,20 %** (889 / 1 198) ;
- `npm.cmd run build` : réussi, **22 pages statiques** générées ;
- `docker-compose config --quiet` : réussi avec une configuration Docker locale
  isolée de la configuration utilisateur inaccessible ;
- backend reconstruit avec `mvn.cmd clean test` :
  **33 tests réussis, 0 échec, 0 erreur, 0 ignoré**. Deux tests couvrent
  explicitement le service et l’endpoint d’un formateur sans données.

La couverture progresse par rapport à la référence avant Sprint 6 :

- statements : 68,70 % → 70,52 % ;
- branches : 66,31 % → 67,67 % ;
- fonctions : 62,63 % → 64,76 % ;
- lignes : 72,72 % → 74,20 %.

## Réserves

- Le service backend local a renvoyé une erreur 500 sur
  `/participant/recommandations` pour un compte participant neuf. Les tests backend
  fraîchement compilés sont tous verts ; aucun backend ni contrat API n’a été
  modifié dans ce sprint frontend. Le dashboard affiche maintenant explicitement
  l’erreur au lieu d’inventer des données.
- Une capture desktop du hero, une capture mobile du catalogue et une capture de
  l’état vide Engagement ont été conservées. Le redimensionnement du panneau du
  navigateur intégré ne constitue pas une mesure de viewport ; les cinq mesures du
  hero restent celles de la recette géométrique dédiée.
- Deux comptes QA locaux créés pour la recette n’ont pas pu être supprimés : le
  daemon Docker refuse l’accès au pipe et la demande d’élévation a expiré. Aucun
  secret de ces comptes n’est stocké dans le dépôt.

## Périmètre respecté

- Aucun code backend de production, contrat API, migration Flyway, projet Flutter
  ou projet RIHLA modifié. Seuls deux tests backend de non-régression ont été
  ajoutés.
- Aucune dépendance d’animation ajoutée.
- Aucun push effectué.

---

## Reprise du 3 août 2026 — audit avant nouvelle modification

Cette section complète l’historique ci-dessus. Elle décrit l’état exact trouvé au
début de la reprise, avant les nouvelles corrections de stabilité et de design.

### État Git et sécurité de reprise

- branche active : `sprint6`, au commit `8f6ce2332921099f38f055f651289da091d73eab` ;
- un seul worktree, situé dans `D:\Stage\dev` ;
- aucun `index.lock`, aucune variation des empreintes Git pendant la fenêtre de
  contrôle et aucun signe d’un second agent modifiant le dossier ;
- le worktree contenait déjà un lot Sprint 6 non commité : **35 fichiers suivis
  modifiés, 1 764 insertions et 281 suppressions**, plus plusieurs nouveaux tests,
  composants du lecteur et ce document ;
- ces changements préexistants sont conservés. Aucun reset, stash, push, merge ou
  changement de branche n’a été effectué.

### Légende de l’audit A–E

- **A — déjà réel et exploitable** : données et autorisations issues des API ;
- **B — fragile ou incohérent** : fonctionnalité présente mais parcours, état ou
  rendu à corriger ;
- **C — améliorable sans backend** : amélioration d’interface possible avec les
  contrats actuels ;
- **D — backend/API nécessaire** : ne doit pas être simulé côté client ;
- **E — hors périmètre Sprint 6 / post-MVP** : explicitement différé par le backlog.

### Matrice fonctionnelle et visuelle

| Zone | A — réel | B/C — à traiter dans Sprint 6 | D/E — non simulé |
|---|---|---|---|
| Accueil public | Catalogue publié réel, navigation, thème, aperçu explicitement illustratif | Renforcer la densité et le rythme responsive ; verrouiller le focus et le scroll du menu mobile | Aucun chiffre métier public supplémentaire sans API |
| Catalogue | Recherche, catégorie, niveau, pagination et cartes issus de `/api/catalogue` | **B :** le lien `?favoris=1` n’active pas le filtre ; la langue existe dans l’API mais pas dans l’UI ; bouton de recherche cassé à 768 px ; favoris filtrés seulement dans la page chargée | **D :** prix min/max, tri, type d’accès, note intégrée à la carte, aperçu vidéo et pagination serveur des favoris |
| Fiche formation | Programme, aperçu gratuit, ressources, formateur et avis réels | **B :** “contenu + classes” proposé sans exposer clairement disponibilité, supplément et type d’accès déjà acheté ; **C :** choix d’offre accessible et récapitulatif tarifaire | **D :** bénéfices, prérequis, séances publiques à venir et vidéo de présentation |
| Lecteur de cours | Progression ordonnée, modules verrouillés/disponibles/terminés, notes, signets, PDF.js, liens YouTube validés et URLs de ressources autorisées | **B :** lecteur vidéo fichier encore natif et peu contrôlé ; reprise vidéo non exposée ; avertissement LCP sur la vignette YouTube ; **C :** commandes vidéo accessibles et état média plus explicite | **D :** position de reprise exposée par l’API, sous-titres gérés, téléchargement hors ligne Web |
| Quiz participant | Questions et réponses sans correction divulguée, score et feedback calculés serveur, tentatives réelles | **B :** toutes les questions sont présentées d’un bloc, sans confirmation finale ni affichage de `prochaineDisponibilite` ; **C :** progression question par question et récapitulatif avant envoi | **D :** brouillon serveur, minuterie/durée et historique détaillé ; aucun faux chronomètre ne sera ajouté |
| Classes | Groupes, membres, séances, compte à rebours et URL Jitsi issus du serveur | **B :** une séance simplement `PLANIFIEE` reste rejoignable trop tôt ou après sa fin ; absence de salle d’attente NexaLearn ; **C :** historique/calendrier dérivable des dates existantes | **D :** présence, replay, enregistrement et compte rendu de séance |
| Dashboard participant | Inscriptions, progression, objectif, recommandations, classe suivante, favoris et activité issus des API | **B :** le hero annonce “première étape” malgré une inscription lorsqu’aucune ressource n’a encore été consultée ; raccourci favoris incohérent ; **C :** hiérarchie et priorités d’action | **D :** détail des quiz à reprendre sans enrichissement API |
| Espace formateur | CRUD formation/modules/chapitres/ressources, publication, réordonnancement, classes, quiz et agrégats d’engagement réels | **B :** éditeur générique, modifications par `prompt`, action QCM visuellement vide, informations de formation peu lisibles, progression d’upload absente ; **C :** aperçu participant et édition structurée | **D :** statistiques détaillées par apprenant, taux de réussite, présence et résultats avancés |
| Administration | Demandes formateurs et avis signalés réels | **B :** date `null` rendue au 01/01/1970 ; table et actions à fiabiliser sur petit écran | **D :** CRUD utilisateurs, modération des formations, paiements, commissions, certificats et statistiques globales |
| Certificats | Aucun écran fictif | — | **D :** génération, QR code et vérification publique ; fonctionnalité backlog non implémentée |
| Post-MVP | — | — | **E :** abonnements, remboursements/coupons, statistiques avancées, Google Login, enregistrement Jitsi, multilingue complet et rétention |

### Validations de référence du 3 août 2026

- frontend `npm.cmd run test:coverage` : **16 fichiers, 80 tests réussis** ;
  statements **72,77 %**, branches **70,93 %**, fonctions **65,48 %**, lignes
  **76,16 %** ;
- frontend `typecheck`, `lint` et `build` : réussis ; build Next.js 16.2.11,
  **22 pages statiques** ;
- backend `mvn.cmd clean verify` : **37 tests réussis**, aucune erreur ; JaCoCo
  lignes **82,77 %** et branches **58,16 %** ;
- Flutter 3.38.4 / Dart 3.11.5 : `flutter analyze` sans problème et **1 test
  réussi** ;
- `docker-compose config --quiet` : réussi avec une configuration Docker isolée ;
- le daemon Docker local est indisponible (pipe Docker absent), donc MySQL, MinIO
  et la pile Compose réelle n’ont pas encore été déclarés validés ;
- recette visuelle effectuée sur une base **H2 en mémoire, éphémère** avec les
  vraies API : visiteur, participante, formatrice et administrateur ; desktop,
  tablette 768 px et mobile 390 px. Cette base disparaît à l’arrêt du processus et
  ne modifie pas MySQL.

### Ordre de correction retenu

1. Cohérence des contrats publics et de l’offre classes, favoris, dates admin,
   fenêtre Jitsi et états participant.
2. Accessibilité des modales/menus, tokens, propriétés logiques, thèmes et
   responsive 390/768/1024/1366/1600.
3. Parcours public, lecteur, quiz et classes.
4. Éditeur formateur, classes/engagement et administration, uniquement avec les
   capacités réellement fournies par le backend.
5. Interactions distinctives discrètes, puis recette complète et commit local.

---

## Finalisation du 5 août 2026 — état livré

Cette section remplace les chiffres et réserves historiques ci-dessus pour la
livraison finale. Aucun document React ou JEE du dossier local `cours/` n'a été
importé.

### Corrections réalisées

- Hero d'accueil : le statut illustratif « Classe en direct » est intégré au
  header de la carte « Mon apprentissage » et le taux illustratif « 68 % » reste
  attaché au bloc de progression. Les deux éléments sont explicitement annoncés
  comme des exemples, restent dans la carte et ne recouvrent aucune action.
- Audit responsive : cartes, textes longs, menus, modales, z-index, thèmes,
  animations et cibles tactiles ont été stabilisés avec Grid/Flexbox et des
  positionnements absolus limités aux décorations.
- Lecteur : navigation ordonnée, plan repliable, PDF.js multipage et grand format,
  miniatures, zoom, plein écran, lien YouTube canonique sans iframe, lecteur vidéo
  MinIO accessible, notes, signets, progression et états vides.
- Accès : visibilité des modules selon l'inscription, métadonnées de ressources,
  offre avec ou sans classes et fenêtre réelle d'accès Jitsi contrôlées côté
  serveur. Les tests vérifient notamment qu'un participant non inscrit reçoit un
  refus et qu'un participant inscrit voit les modules autorisés.
- Engagement formateur : états chargement/vide/authentification/interdiction/
  serveur/succès distincts, nouvelle tentative réelle et état vide utile sans
  statistiques fictives ni notes privées. L'incident reproduit était un `GET`
  `/api/formateur/engagement` en **500**, causé par un `NoSuchMethodError` provenant
  d'un mélange de bytecode Sprint 5 ancien et récent ; une reconstruction propre
  aligne désormais le service et le repository, et le cas sans données répond en
  succès avec un payload vide valide.
- Sécurité de livraison : `/cours/` est ajouté à `.gitignore`; le dossier reste
  local et non indexé. Les sorties de build, couvertures, dépendances, journaux,
  fichiers temporaires et volumes d'upload restent exclus.

### Tests exécutés et résultats

- Backend : `mvn.cmd clean test` — **37 tests réussis**, 0 échec, 0 erreur,
  0 ignoré. Les tests d'intégration couvrent les règles d'accès aux modules et
  ressources, la propriété formateur, le formateur sans données et la fenêtre de
  participation aux classes.
- JaCoCo backend (`mvn.cmd jacoco:report`) : instructions **80,59 %**
  (10 544 / 13 083), branches **58,81 %** (377 / 641), lignes **82,90 %**
  (1 493 / 1 801), méthodes **80,82 %** (746 / 923), complexité **68,48 %**
  (854 / 1 247).
- Frontend : `npm.cmd run test:coverage` — **17 fichiers et 85 tests réussis**.
  Couverture : statements **68,13 %** (1 514 / 2 222), branches **66,19 %**
  (1 134 / 1 713), fonctions **62,55 %** (431 / 689), lignes **72,41 %**
  (1 331 / 1 838).
- `npm.cmd run typecheck` : réussi.
- `npm.cmd run lint` : réussi ; seul le message informatif amont de
  `jsx-ast-utils` sur `TSSatisfiesExpression` est émis.
- `npm.cmd run build` : réussi avec Next.js 16.2.11 ; 22 pages statiques générées.
- `docker-compose.exe config --quiet` : configuration valide. MySQL, MinIO et
  Mailpit sont démarrés et `healthy`. Flyway V5 est enregistré avec `success = 1`
  et ses dix tables sont présentes.
- `git diff --check` : réussi, sans erreur d'espace blanc.

### Recette réelle

- Navigation « Fonctionnement » : ancre correcte et section visible.
- Participant neuf : inscription, connexion, onboarding ignoré, catalogue réel,
  inscription gratuite et visibilité immédiate des modules autorisés.
- Lecteur : PDF cinq pages, PDF large sans débordement, lien YouTube en nouvel
  onglet avec `noopener noreferrer` et sans iframe, vidéo MinIO chargée
  (`readyState = 4`) avec commandes accessibles.
- Formateur neuf validé localement : espace formations vide puis page Engagement
  vide utile ; même résultat après actualisation.
- Hero contrôlé à **390, 768, 1024, 1366 et 1600 px** : aucun débordement document
  ou carte, badges contenus dans la carte, aucune intersection avec les actions.
- Thèmes clair et sombre contrôlés ; captures desktop et mobile conservées dans
  `docs/screenshots/`.
- Console navigateur : **0 erreur et 0 avertissement** sur les parcours contrôlés.

### Réserves finales

- Deux comptes temporaires et une inscription de recette ont été créés uniquement
  dans la base MySQL locale afin de valider les parcours participant et formateur ;
  aucune donnée d'identification ni aucun secret n'est stocké dans Git.
- Les messages Maven sur l'auto-attachement futur de Mockito et le message ESLint
  amont `TSSatisfiesExpression` sont informatifs et n'affectent ni les tests ni le
  build.
- Les fonctionnalités explicitement post-MVP de la matrice d'audit restent hors
  Sprint 6. L'import des futures formations React/JEE est volontairement différé.
