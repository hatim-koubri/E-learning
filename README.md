# Plateforme E-learning

Socle d’une plateforme de cours en ligne : comptes participants, demandes formateurs, validation administrateur, connexion JWT et réinitialisation du mot de passe.

## Prérequis

- Java 21 et Maven 3.9+
- Node.js 20+ et npm
- Docker Desktop / Docker Compose

## Installation locale

1. Copier `.env.example` vers `.env` et remplacer toutes les valeurs factices.
2. Démarrer MySQL, MinIO et Mailpit :

```powershell
docker compose up -d
```

3. Démarrer le backend :

```powershell
cd backend
mvn spring-boot:run
```

Flyway applique automatiquement les migrations. Swagger est disponible sur `http://localhost:8080/swagger-ui.html`.

4. Dans un autre terminal, démarrer le frontend :

```powershell
cd web
npm install
npm run dev
```

L’application est disponible sur `http://localhost:3000`, Mailpit sur `http://localhost:8025`
et la console MinIO sur `http://localhost:9001`.

Pour vérifier l’état des services :

```powershell
docker compose ps
```

## Administrateur de développement

La création est désactivée par défaut. Pour l’activer, définir `DEV_ADMIN_ENABLED=true`, `DEV_ADMIN_EMAIL` et `DEV_ADMIN_PASSWORD`. Le mot de passe est haché avec BCrypt et l’initialisation est idempotente. N’ajoutez jamais le fichier `.env` à Git.

## Stratégie JWT

Le backend émet un JWT d’accès signé HMAC valable 15 minutes (configurable). Il n’existe pas de refresh token au Sprint 1 : à expiration, l’utilisateur se reconnecte. La déconnexion supprime le jeton du stockage navigateur.

Les tokens de réinitialisation sont opaques, hachés en SHA-256 en base, utilisables une seule fois et valables 30 minutes. La réponse « mot de passe oublié » est identique pour un email connu ou inconnu.

## Vérifications

```powershell
cd backend
mvn clean test

cd ../web
npm run typecheck
npm run lint
npm run build
```

Les PDF de conception restent inchangés. Les suivis détaillés sont dans
`docs/sprint-1-suivi.md`, `docs/sprint-2-suivi.md` et `docs/sprint-3-suivi.md`.

## Sprint 2 - Formations et contenus

Un formateur validé dispose du tableau de bord `/formateur/formations`. Il peut créer et
modifier ses formations, organiser les modules et chapitres, configurer le premier module
comme aperçu gratuit et ajouter des images, vidéos, PDF ou liens YouTube.

Les fichiers sont stockés dans le bucket MinIO configuré par `MINIO_BUCKET`; MySQL ne
conserve que leurs métadonnées et leur clé d'objet. Les limites d'upload et identifiants
MinIO se configurent dans `.env`. Aucun accès temporaire participant n'est généré au
Sprint 2 : cette autorisation appartient au Sprint 3.

Le suivi détaillé du Sprint 2 est dans `docs/sprint-2-suivi.md`.

## Sprint 3 - Catalogue, apprentissage et évaluations

Le catalogue public est disponible sur `/catalogue`. Une formation publiée expose son programme et
son premier module d'aperçu sans authentification. Un participant peut s'inscrire gratuitement ou
simuler l'achat d'une formation payante; aucune donnée bancaire n'est collectée. L'inscription
déverrouille les ressources en ligne, la progression ordonnée et les QCM après les prérequis.

Les ressources MinIO restent privées. Le backend contrôle la formation et les droits avant de produire
une URL temporaire configurable par `MINIO_URL_EXPIRY_SECONDS`. Les téléchargements hors ligne et
l'accès aux classes ne font pas partie de ce sprint.

Le formateur publie une formation depuis son éditeur et gère ses QCM sur
`/formateur/formations/{id}/quiz`.
