# Plateforme E-learning - Sprint 1

Socle d’une plateforme de cours en ligne : comptes participants, demandes formateurs, validation administrateur, connexion JWT et réinitialisation du mot de passe.

## Prérequis

- Java 21 et Maven 3.9+
- Node.js 20+ et npm
- Docker Desktop / Docker Compose

## Installation locale

1. Copier `.env.example` vers `.env` et remplacer toutes les valeurs factices.
2. Démarrer MySQL et Mailpit :

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

L’application est disponible sur `http://localhost:3000` et Mailpit sur `http://localhost:8025`.

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
mvn test

cd ../web
npm run typecheck
npm run lint
npm run build
```

Les PDF de conception restent inchangés. Le suivi détaillé est dans `docs/sprint-1-suivi.md`.
