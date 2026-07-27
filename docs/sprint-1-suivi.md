# Suivi du Sprint 1

| ID | Description | Statut | Tests exécutés | Remarques |
|---|---|---|---|---|
| T1-01 | Organisation Git et structure du dépôt | Terminé | `git status`, branche et remote vérifiés | Branche `codex/sprint-1-authentification` |
| T1-02 | Projet Spring Boot Maven | Terminé | `mvn test` | Java 21, Spring Boot 3.5 |
| T1-03 | MySQL, profils, JPA et Flyway | À tester | Configuration Compose valide | Migration V1 créée; Docker Desktop indisponible lors de la vérification finale |
| T1-04 | Utilisateurs, rôles et statuts | Terminé | Tests d’inscription | Héritage JPA `SINGLE_TABLE` |
| T1-05 | Spring Security et JWT | Terminé | Tests connexion et accès protégé | JWT 15 min, sans renouvellement |
| T1-06 | Inscription, connexion et profil | Terminé | Tests unitaires et intégration | DTO uniquement |
| T1-07 | Réinitialisation du mot de passe | Terminé | Token valide, expiré et réutilisé | Token opaque haché, 30 min |
| T1-08 | Demande et validation formateur | Terminé | Acceptation, refus et double décision | Décision horodatée |
| T1-09 | Interfaces d’authentification | Terminé | `npm run typecheck`, `npm run lint`, `npm run build` | Next.js 16 |
| T1-10 | Écran admin formateurs | Terminé | TypeScript, ESLint, build | Motif de refus obligatoire |
| T1-11 | Swagger/OpenAPI | Terminé | Compilation backend | `/swagger-ui.html` |
| T1-12 | Tests authentification | Terminé | `mvn test` - 7 tests réussis | H2 en mode MySQL pour les tests |
