# Suivi du Sprint 4

## Décisions techniques

- `supplementClasses` est défini sur la formation en DH. Une valeur nulle masque l'offre, sauf lorsque
  `classesGratuites` est explicitement activé.
- La mise à niveau exige `Idempotency-Key`. L'opération conserve le montant au moment de la simulation,
  la devise `DH`, la date, le type d'accès, le mode `SIMULATION` et le statut `CONFIRME`.
- Une inscription `CONTENU_ET_CLASSES` rend le participant éligible. Seule son affectation explicite par
  le formateur propriétaire lui donne accès à une classe.
- Le nom de salle est un UUID généré côté serveur. `JITSI_BASE_URL` permet de remplacer l'instance de
  développement par une instance auto-hébergée sans modifier le métier.
- Flutter utilise `flutter_secure_storage`, détecte l'absence de réseau et ouvre l'URL Jitsi contrôlée
  dans l'application externe. Le SDK natif Jitsi est reporté afin de stabiliser le MVP.
- `kotlin.incremental=false` évite sous Windows l'échec des caches Kotlin lorsque Pub est sur `C:` et le
  projet sur `D:`.

| Tâche | Statut | Validation |
|---|---|---|
| T4-01 | Terminé | Migration V4, classes, membres, séances, contraintes |
| T4-02 | Terminé | URL configurable, salle non prévisible, endpoint sécurisé |
| T4-03 | Terminé | Création/modification, membres, planification/modification/annulation et Jitsi Web |
| T4-04 | Terminé | Classes participant et refus contrôlés côté backend |
| T4-05 | Terminé | Projet Flutter Android/iOS et API configurable |
| T4-06 | Terminé | Connexion, JWT sécurisé, expiration et déconnexion |
| T4-07 | Terminé | Recherche catalogue, détail, formations et offre avec classes |
| T4-08 | Terminé | Modules, chapitres, ressources externes et progression |
| T4-09 | Terminé | Classes, séances et ouverture Jitsi externe |
| T4-10 | Terminé | État hors ligne; appels et quiz refusés sans réseau |
| T4-11 | Terminé | 26 tests backend, 29 tests Web, tests/analyse Flutter |
| T4-12 | Terminé | Parcours API réel et recette Web desktop/mobile |

## Résultats

- Flyway : V4 appliquée avec `success = 1` sur MySQL 8.4; Hibernate valide le schéma.
- Backend : `mvn clean verify` réussi; JaCoCo instructions 75,48 %.
- Web : 29 tests; couverture instructions 67,31 %, lignes 75,92 %; typecheck, lint et build réussis.
- Couverture globale pondérée backend/Web : 75,04 %.
- Flutter : `pub get`, analyse et tests réussis; APK debug construit. iOS non compilé sous Windows.
- Infrastructure : MySQL, MinIO et Mailpit sains. MinIO renvoie HTTP 403 sans autorisation.
- Parcours réel : offre 100 + 25 DH, inscription `CONTENU_ET_CLASSES` à 125 DH, affectation, séance,
  salle serveur, accès membre et refus HTTP 403 du non-membre.
- Navigateur : vues formateur et participant validées sur desktop et 390 x 844, sans erreur console ni
  débordement d'élément applicatif.

## Limites

- L'APK, `target`, `.next`, `coverage` et les journaux sont générés localement mais ignorés par Git.
- Le build iOS nécessite macOS et Xcode.
- SonarQube n'était pas joignable sur le port 9002 (`HTTP 000`). JaCoCo et LCOV ont été générés, mais
  aucun Quality Gate n'est revendiqué.
- Les rappels avancés, l'enregistrement Jitsi et la synchronisation hors ligne restent hors périmètre.
