# Suivi du Sprint 5

## Audit et direction

- Base Git vérifiée le 30 juillet 2026 : `main` à `496888c`, contenant le redesign
  (`f2e3a31`, `dc8e182`) et sa stabilisation ESLint (`1ba8a33`).
- Branche locale de travail : `sprint5`. Aucun push n’est autorisé ni effectué.
- Architecture conservée : contrôleur REST → service transactionnel → repository JPA → MySQL.
- Priorité donnée aux parcours sécurisés et complets : onboarding, tableau de bord, reprise,
  favoris, parcours, notes, objectif, recommandations, avis, quiz, notifications, orientation et SEO.
- Signature interactive : « Le parcours de connaissance », avec cinq états cohérents sur l’accueil,
  le détail d’une formation, le tableau de bord et la carte d’apprentissage.
- Le design réutilise les tokens NexaLearn, reste léger en CSS, devient vertical sur mobile et
  respecte `prefers-reduced-motion`. Aucun compteur, avis, graphique ou sentiment d’urgence fictif
  n’est introduit.

## Architecture livrée

### Données et sécurité

La migration `V5__create_engagement_and_personalization.sql` ajoute :

- les préférences participant et l’objectif hebdomadaire ;
- les favoris avec unicité participant + formation ;
- les positions de reprise avec unicité participant + formation ;
- les notes et signets privés ;
- les activités pédagogiques significatives et leur clé d’idempotence ;
- les avis, réponses formateur et signalements ;
- les notifications et préférences par catégorie ;
- la spécialité et la biographie du formateur ;
- l’explication pédagogique d’une question de quiz.

Les migrations V1 à V4 ne sont pas modifiées. Les clés étrangères, index, contrôles de plage et
contraintes uniques sont portés par MySQL. Les DTO empêchent l’exposition directe des entités JPA.
Les recherches de notes, avis et notifications incluent le propriétaire dans la requête ; une
ressource étrangère renvoie une absence contrôlée plutôt qu’une fuite d’information.

### API et OpenAPI

Le groupe Swagger « Engagement et personnalisation » documente notamment :

- `POST /api/orientation/recommandations` ;
- `/api/participant/preferences`, `/favoris`, `/reprise`, `/notes`,
  `/objectif-hebdomadaire`, `/recommandations`, `/tableau-de-bord` et `/parcours` ;
- les avis participant, réponses formateur et modération administrateur ;
- `/api/notifications` et `/api/notifications/preferences` ;
- `/api/formateurs/{id}` et `/api/formateur/profil-public`.

Les routes publiques se limitent à l’orientation, aux avis publiés, au catalogue et aux profils
formateurs actifs. Les autres routes restent protégées par rôle. Les avis nécessitent une inscription
active, 30 % de progression et une unicité participant + formation. Leur suppression efface
explicitement les signalements associés, y compris dans l’environnement JPA de test.

## Règles transparentes

### Recommandation

Le moteur est fondé sur des règles, sans revendication d’intelligence artificielle :

| Signal réel | Score | Explication affichée |
|---|---:|---|
| Domaine choisi ou préféré | +40 | Dans votre domaine préféré |
| Niveau identique ou tous niveaux | +25 | Correspond à votre niveau |
| Catégorie proche d’un favori | +20 | Proche de vos favoris |
| Suite d’une catégorie déjà étudiée | +15 | Suite logique de votre formation actuelle |

Seules les formations publiées sont candidates. Une formation terminée à 100 % est exclue des
recommandations personnelles. À score égal, le titre assure un ordre stable. Les réponses d’un
visiteur restent dans la page d’orientation et ne sont transmises que pour le calcul courant.

### Engagement hebdomadaire

Les minutes sont attribuées uniquement lors d’événements validés : chapitre terminé, ressource
consultée, quiz soumis et classe rejointe. Une clé unique rend chaque événement idempotent.
La semaine commence le lundi dans le fuseau choisi par le participant. Le compteur de régularité
regarde au plus 52 semaines et les messages restent positifs, sans culpabilisation.

### Avis et notifications

- Aucun avis n’est synthétique ou prérempli.
- La moyenne et le nombre ne portent que sur les avis au statut `PUBLIE`.
- Un participant ne peut pas signaler son propre avis ni signaler deux fois le même avis.
- Le formateur peut répondre, mais ne peut ni lire les notes privées ni modifier une note d’avis.
- L’administrateur peut publier ou masquer ; il ne peut pas réécrire la note ou le commentaire.
- Les catégories de notification peuvent être désactivées séparément. Les emails restent
  désactivés par défaut et aucune relance périodique artificielle n’est créée.

## Interfaces livrées

| Parcours | Route principale | Résultat |
|---|---|---|
| Orientation visiteur | `/orientation` | Questionnaire en cinq étapes, résultats expliqués |
| Onboarding | `/participant/onboarding` | Préférences modifiables, rappels facultatifs, étape ignorable |
| Aujourd’hui | `/profile` | Reprise, objectif, classes, quiz, favoris, recommandations, activité |
| Favoris | `/catalogue` | Bouton instantané et filtre « Mes favoris » |
| Notes privées | `/participant/notes` | Consultation, modification et suppression |
| Carte de cours | `/apprentissage/{id}` | Prérequis réels et alternative accessible en liste |
| Quiz | `/apprentissage/{id}/quiz` | Score, verdict, feedback et chapitres à revoir après soumission |
| Notifications | `/notifications` | Lecture, tout lire et préférences par catégorie |
| Engagement formateur | `/formateur/engagement` | Agrégats réels, avis, réponse et profil public |
| Modération | `/admin/avis` | Signalements, publication ou masquage |
| Profil public | `/formateurs/{id}` | Biographie, cours et métriques réelles sans coordonnées privées |

Les états vides et de chargement sont explicites. Le partage utilise l’API native lorsqu’elle existe
et le presse-papiers en repli. Les métadonnées Course, Open Graph, sitemap et robots sont générés à
partir des données publiques. Les layouts privés déclarent `noindex`.

## Tests et couverture

- Backend : 31 tests réussis ; JaCoCo lignes **82,28 %** (1 458 / 1 772).
- Frontend : 47 tests réussis ; statements **68,70 %**, branches **66,31 %**,
  fonctions **62,63 %**, lignes **72,72 %** (744 / 1 023).
- Couverture globale pondérée par lignes : **78,78 %** (2 202 / 2 795).
- `mvn clean verify`, `npm.cmd run test:coverage`, `npm.cmd run typecheck`,
  `npm.cmd run lint` et `npm.cmd run build` réussissent.
- Le message informatif `jsx-ast-utils` relatif à `TSSatisfiesExpression` n’est pas une erreur ESLint.

Les tests Sprint 5 couvrent les préférences, fuseaux, objectifs, activité idempotente, favoris sans
doublon, reprise, propriété des notes, prérequis de parcours, recommandations, seuil et moyenne
d’avis, réponse, signalement, modération, notifications, profil public et protections de rôle.
Le frontend couvre l’onboarding, l’orientation, les notes, les favoris, le parcours, les avis/quiz,
les notifications, les espaces formateur/administrateur, le profil public, robots et sitemap.

## SonarQube et artefacts

`sonar-project.properties` référence :

- `backend/target/site/jacoco/jacoco.xml` ;
- `web/coverage/lcov.info` ;
- les sources et tests Java/TypeScript ;
- l’exclusion des artefacts, layouts et DTO techniques.

Les rapports sont générés localement et ignorés par Git. Aucun Quality Gate distant n’est revendiqué
sans exécution effective d’un serveur SonarQube et présence d’un jeton dans l’environnement.

## Validation réelle

La recette a été exécutée sur les services réels du `docker-compose.yml` :

- MySQL 8.4, MinIO et Mailpit sont démarrés et sains ; `docker compose config` est valide.
- Flyway a appliqué la migration V5 au rang 5 avec `success = 1`, puis Hibernate a validé le schéma
  MySQL sans modification automatique.
- L’OpenAPI réel expose le groupe « Engagement et personnalisation » et les routes attendues.
- Le parcours API a couvert création de compte, préférences, orientation, recommandations, favori,
  inscription, reprise, note privée, objectif, activité idempotente, carte, quiz avec feedback,
  avis, réponse formateur, signalement, modération et notification. Le temps hebdomadaire ne varie
  qu’après une activité pédagogique significative.
- Un avis masqué est absent du flux public. Son auteur le retrouve dans sa vue authentifiée avec
  `Modifier` et `Supprimer`, sans bouton permettant un second avis ; l’administrateur conserve les
  actions de publication et de masquage.

La recette navigateur a couvert les largeurs 390, 768, 1 366 et 1 600 px : orientation en cinq
étapes, tableau de bord réel, clair/sombre, favori, notes, parcours, quiz, notifications, profil
formateur public et modération. Aucun débordement horizontal ni erreur ou avertissement console
n’a été relevé. Le lien d’évitement est utilisable au clavier avec un focus visible. La version
mobile rend le parcours vertical et l’alternative textuelle reste accessible. Le média
`prefers-reduced-motion` neutralise les transitions et animations non essentielles.

Les quatre comptes de recette `sprint5.qa.*`, leurs deux formations et toute leur fermeture
relationnelle ont été supprimés. Les 10 comptes préexistants conservent avant/après le même checksum
`352989525`, et leur jeton de réinitialisation existant est intact. Le bucket
`contenus-pedagogiques` est vide : aucune clé temporaire QA n’était présente et les ressources de
recette étaient uniquement des liens externes. Les journaux locaux de recette ont également été
supprimés.

## Limites connues

- Les recommandations sont volontairement déterministes et ne constituent pas un modèle prédictif.
- Les emails sont configurables et consentis, mais aucun ordonnanceur de relance automatique n’est
  ajouté afin d’éviter les rappels excessifs.
- Le sitemap publie jusqu’à 50 formations par génération dans ce MVP ; le catalogue applicatif reste
  paginé.
