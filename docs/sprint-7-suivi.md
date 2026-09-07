# Suivi Sprint 7

## Objectifs

Le Sprint 7 consolide les parcours Participant, Formateur et Administrateur, leurs contrats croisés et la préparation de livraison. Il renforce la confidentialité, la propriété des ressources, la durabilité des notifications et décisions, la modération, ainsi que la cohérence web/mobile.

## Fonctionnalités livrées par profil

### Participant

- Parcours d'accueil et d'apprentissage responsive, progression explicite et gestion correcte des prérequis.
- Accès aux classes limité aux membres autorisés ; aucune donnée de classe privée n'est exposée publiquement.
- Quiz avec fenêtre de tentatives, réponses et résultats contrôlés côté serveur.
- Offres et tarification réelles en dirhams, avec action d'inscription idempotente.
- Notifications, préférences et rappels ; un refus `403` conserve la session alors qu'un `401` l'expire.

### Formateur

- Gestion des formations, modules, chapitres, ressources, quiz, publication et archivage sous contrôle de propriété.
- Gestion des classes, affectations et séances avec contrôle du propriétaire.
- Profil public limité aux informations publiables ; aucune classe, séance, salle ou URL temporaire n'est exposée.
- Suivi d'engagement et notifications cohérents avec les préférences et événements métier.

### Administrateur

- Décisions d'acceptation ou de refus des comptes Formateur, protégées contre les décisions concurrentes.
- Modération des avis signalés avec décision, auteur administratif et état final persistés.
- Notifications applicatives et emails obligatoires des décisions administratives, avec reprise durable.
- Navigation et endpoints réservés au rôle Administrateur.

### Socle partagé

- Contrats `401`/`403`, isolation des rôles, composants d'interface, thèmes clair/sombre et responsive.
- Sécurisation des URLs de stockage, nettoyage durable des objets et absence de données internes dans les contrats publics.

## Migrations V6 à V9

| Version | Objet | Validation |
| --- | --- | --- |
| V6 | Idempotence des notifications et journal des livraisons | Appliquée, test de migration dédié |
| V7 | File durable de nettoyage des objets | Appliquée, index de reprise et tests dédiés |
| V8 | Traçabilité des décisions Formateur et reprise durable des emails | Appliquée, tests de migration et concurrence |
| V9 | Résolution persistée des signalements d'avis | Appliquée, index et tests de modération/concurrence |

Les migrations V1 à V5 ne sont pas modifiées. L'historique Flyway local contient V1 à V9 avec `success=1`. Les checksums observés sont stables pour l'instance validée ; ils doivent rester identiques jusqu'à la livraison.

## Corrections de sécurité

- La configuration générale exige les paramètres sensibles de l'environnement et n'embarque pas de valeur de production par défaut.
- L'initialisation du compte de développement est désactivée par défaut et soumise à une politique de mot de passe.
- Les profils publics et aperçus ne divulguent ni classes privées, ni clés d'objet, ni salles, ni URL de réunion.
- Les opérations Formateur vérifient la propriété ; la modération et les décisions exigent le rôle Administrateur.
- Les erreurs de stockage et d'email sont normalisées afin de ne pas persister de secret ni d'URL temporaire.

## Tests et couvertures

Validation du 11 août 2026 :

- Backend : `mvn.cmd clean verify`, 101 tests réussis, contrôles JaCoCo respectés.
- Web : 21 fichiers et 128 tests réussis ; couverture globale de 66,92 % des instructions, 66,31 % des branches, 60,88 % des fonctions et 73,75 % des lignes.
- Web : typecheck, lint et build de production réussis.
- Mobile : analyse sans anomalie et 16 tests réussis.
- Docker Compose et `git diff --check` validés.

## Recette responsive

La recette navigateur a validé l'accueil et le catalogue, les thèmes clair et sombre, les largeurs 390 px et 1366 px sans débordement horizontal, ainsi que les redirections vers la connexion des espaces Participant, Formateur et Administrateur non authentifiés. Aucune erreur console n'a été observée. Les sessions réelles des trois rôles n'ont pas été rejouées faute d'identifiants de recette fournis ; les contrats de navigation et `401`/`403` restent couverts par les tests automatisés réussis.

## Infrastructure

- MySQL, MinIO et Mailpit sont démarrés et sains lors de la validation.
- Le bucket MinIO est privé.
- Mailpit ne contient aucun message au moment du contrôle.
- Flyway V1–V9 et `ddl-auto=validate` sont compatibles avec le modèle Hibernate testé.
- Aucune tâche de nettoyage d'objet n'est en attente.

## Nettoyage QA

Mailpit est vide et aucune tâche de nettoyage QA n'est active. La base locale contient encore cinq comptes reconnaissables comme données QA/test ; leur suppression ciblée reste requise avant de pouvoir conclure à l'absence complète de résidu QA. Aucun identifiant de connexion n'est reproduit ici.

## Réserves non bloquantes

- Vérifier explicitement si le profil `application-local.yml`, actuellement non suivi et limité au développement local, fait partie du périmètre intentionnel de livraison.
- Les avertissements LF vers CRLF n'entraînent aucune erreur de whitespace mais méritent une vigilance lors du staging.
- L'avertissement interne du lint JSX n'a pas fait échouer ESLint.
- Un passage navigateur authentifié avec les trois rôles reste recommandé avant mise en production.

## État de préparation

- Aucun import React/JEE n'a été lancé.
- Aucun fichier n'a été indexé.
- Aucun commit et aucun push n'ont été effectués à ce stade.
- Le staging, le commit et le push nécessitent une autorisation explicite.
# Sécurité différée

- Le jeton JWT reste temporairement stocké dans `localStorage`. Une migration vers un cookie `HttpOnly`, `Secure` et `SameSite` est recommandée, mais doit être conçue comme une évolution transversale couvrant Participant, Formateur, Administrateur et le client Flutter. Elle est volontairement hors du périmètre de la finalisation Admin actuelle.

## Bienvenue Participant et certificat

- L'inscription Participant conserve l'activation immédiate existante. Aucun mécanisme de vérification d'adresse n'existant dans les parcours Web ou mobile, l'email ajouté est informatif et ne contient ni mot de passe, ni JWT, ni token.
- Après la persistance du Participant, un email transactionnel est inscrit dans `notification_deliveries` sous la catégorie `ACCOUNT_WELCOME` et la clé `participant-welcome:{participantId}`. Le lien est résolu depuis `APP_BASE_URL`. L'envoi intervient après commit ; une panne SMTP produit `RETRY` avec backoff et le scheduler reprend les distributions non envoyées.
- L'éligibilité au certificat est calculée par `CertificateEligibilityService` pour le plan d'évaluation, le téléchargement et la notification. Elle exige une inscription active/confirmée, un compte actif, tous les chapitres terminés, les quiz de module requis réussis et un quiz final publié réussi.
- Après une fin de chapitre ou une réussite de quiz, l'inscription est verrouillée, l'éligibilité est recalculée et la transition est matérialisée une seule fois par `certificate-eligible:{inscriptionId}`. La notification `CERTIFICATE_AVAILABLE` est toujours créée dans l'application ; son email est mis en file uniquement si la préférence Participant est active.
- Le PDF n'est pas généré automatiquement. Le téléchargement continue à recalculer les conditions côté serveur. La page cible réelle est `/apprentissage/{formationId}/quiz` et aucune URL MinIO n'est persistée.
- Aucune migration n'est ajoutée : les colonnes texte existantes acceptent les nouvelles valeurs enum et les contraintes uniques V6/V8 assurent déjà l'idempotence.
- Le client Flutter ne propose actuellement ni inscription, ni centre de notifications/préférences ; aucun écran incomplet n'a été ajouté. Ses parcours de session et d'apprentissage restent inchangés.
