# Suivi du Sprint 2

| ID | Description | Statut | Validation |
|---|---|---|---|
| T2-01 | Formation, Module, Chapitre, Ressource et migration Flyway V2 | Terminé | Flyway V2 appliquée sur MySQL 8.4 et validation Hibernate réussie |
| T2-02 | API de création, liste, détail et modification des formations | Terminé | DTO Jakarta, tests service et MockMvc |
| T2-03 | Gestion et réordonnancement des modules et chapitres | Terminé | Ordres uniques, transactions et tests de réordonnancement |
| T2-04 | MinIO et client S3 | Terminé | Services sains, bucket créé de façon idempotente |
| T2-05 | Images, vidéos, PDF et liens YouTube | Terminé | Extension, MIME, signature, taille, clé serveur et suppression MinIO testés |
| T2-06 | Tableau de bord Next.js | Terminé | TypeScript, ESLint et build de production |
| T2-07 | Éditeur modules, chapitres et ressources | Terminé | Ajout, modification, suppression et ordre disponibles |
| T2-08 | Premier module en aperçu gratuit | Terminé | Règle contrôlée côté serveur et test automatisé |
| T2-09 | Propriété et sécurité des fichiers | Terminé | Contrôle propriétaire, rôle formateur, noms sûrs et formats autorisés |
| T2-10 | Tests du Sprint 2 | Terminé | 17 tests Maven, parcours API/MySQL/MinIO réel et build Next.js |

## Décisions de périmètre

- Une formation est créée au statut `BROUILLON`.
- La suppression d'une formation n'est pas exposée : FORM-01 demande sa création et sa
  modification, contrairement aux modules et chapitres dont la suppression est explicite.
- Les ressources PDF et vidéo peuvent être marquées téléchargeables. L'image et YouTube
  ne le peuvent pas.
- La génération de liens MinIO temporaires et les droits de consultation participant
  restent réservés au Sprint 3.

## Validation finale

- Migration `V2__create_formations_and_contents.sql` appliquée avec `success = 1`.
- MySQL conserve les métadonnées, jamais le contenu binaire.
- MinIO a accepté un PDF réel puis l'objet a disparu après suppression de la ressource.
- Les données créées pour le parcours d'intégration ont été supprimées.
- `mvn clean test` : 17 tests réussis, 0 échec, 0 erreur, 0 test ignoré.
- `npm run typecheck` : réussi.
- `npm run lint` : réussi ; l'outil signale uniquement un avertissement interne non bloquant
  de `jsx-ast-utils` sur `TSSatisfiesExpression`.
- `npm run build` : réussi avec Next.js 16.2.11 et Turbopack, 11 routes générées.
- `docker compose config` : configuration valide.
- MySQL 8.4 et MinIO sont sains ; `minio-init` se termine avec le code 0.
- Parcours navigateur validés sur desktop et mobile : connexion formateur, tableau de bord,
  ouverture de l'éditeur, affichage des modules, chapitres et formulaires de ressources.
- Aucune erreur applicative ni alerte visible dans le navigateur lors des parcours finaux.
- Les comptes, formations, ressources et objets MinIO temporaires de validation ont été
  supprimés.

## État de livraison

Le périmètre prévu pour le Sprint 2 est terminé. La suppression complète d'une formation
n'est volontairement pas exposée, conformément au Product Backlog ; les accès temporaires
aux ressources pour les participants restent planifiés au Sprint 3.
