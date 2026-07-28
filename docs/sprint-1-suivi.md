# Suivi du Sprint 1

| ID | Description | Statut | Tests exécutés | Remarques |
|---|---|---|---|---|
| T1-01 | Organisation Git et structure du dépôt | Terminé | `git status`, branche et remote vérifiés | Branche `codex/sprint-1-authentification` |
| T1-02 | Projet Spring Boot Maven | Terminé | `mvn test` | Java 21, Spring Boot 3.5 |
| T1-03 | MySQL, profils, JPA et Flyway | Terminé | `docker compose up -d`, healthchecks, `flyway_schema_history`, démarrage Spring Boot | MySQL 8.4 et Mailpit sains; migration V1 appliquée avec succès |
| T1-04 | Utilisateurs, rôles et statuts | Terminé | Tests d’inscription | Héritage JPA `SINGLE_TABLE` |
| T1-05 | Spring Security et JWT | Terminé | Connexion par rôle; réponses 401/403; préflight CORS; route admin Web protégée | JWT 15 min, sans renouvellement |
| T1-06 | Inscription, connexion et profil | Terminé | Tests unitaires et intégration | DTO uniquement |
| T1-07 | Réinitialisation du mot de passe | Terminé | Email reçu dans Mailpit; token valide; ancien mot de passe refusé; nouveau accepté; réutilisation refusée | Token opaque haché, 30 min |
| T1-08 | Demande et validation formateur | Terminé | Demande en attente refusée à la connexion; acceptation; refus avec motif; connexion après validation | Décision horodatée |
| T1-09 | Interfaces d’authentification | Terminé | Connexion participant dans le navigateur; profil affiché; TypeScript, ESLint et build | Next.js 16 |
| T1-10 | Écran admin formateurs | Terminé | Connexion admin, liste des demandes et redirection d’un participant non autorisé | Motif de refus obligatoire |
| T1-11 | Swagger/OpenAPI | Terminé | `/v3/api-docs` retourne HTTP 200; `/swagger-ui.html` redirige vers l’interface | OpenAPI 3.1.0 |
| T1-12 | Tests authentification | Terminé | `mvn test` : 8 tests réussis; parcours API/MySQL/Mailpit réels | H2 pour la suite automatisée; MySQL 8.4 pour la validation finale |

## Validation finale

- Docker Desktop 4.49.0 et moteur Docker 28.5.1 opérationnels.
- MySQL et Mailpit démarrés et sains via `docker compose`.
- Flyway : migration V1 présente avec `success = 1`.
- Backend Spring Boot et frontend Next.js démarrés avec succès.
- Parcours participant, formateur en attente, acceptation, refus, réinitialisation et autorisations validés.
- Tests finaux : 8 tests Maven, TypeScript, ESLint et build Next.js réussis.
- Corrections issues de la validation : mapping `CHAR(64)` MySQL, distinction HTTP 401/403 et configuration CORS robuste.
