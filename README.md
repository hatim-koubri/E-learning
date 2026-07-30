# Plateforme E-learning

Plateforme de cours en ligne avec catalogue public, apprentissage progressif, classes virtuelles,
quiz, personnalisation et outils d’engagement fondés sur des données pédagogiques réelles.

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
mvn clean verify

cd ../web
npm run test:coverage
npm run typecheck
npm run lint
npm run build
```

Les PDF de conception restent inchangés. Les suivis détaillés sont dans
`docs/sprint-1-suivi.md` à `docs/sprint-5-suivi.md`, ainsi que `docs/web-design-suivi.md`.

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

## Qualité, couverture et SonarQube

Les rapports de couverture attendus par SonarQube sont produits par les commandes suivantes :

```powershell
cd backend
mvn clean verify

cd ../web
npm run test:coverage
npm run typecheck
npm run lint
npm run build
```

JaCoCo écrit son rapport XML dans `backend/target/site/jacoco/jacoco.xml`. Vitest écrit
le rapport LCOV dans `web/coverage/lcov.info`. Ces rapports générés ne sont pas versionnés.

Après leur génération, lancer l'analyse depuis la racine du projet avec une instance
SonarQube accessible. Le jeton reste exclusivement dans une variable d'environnement :

```powershell
$env:SONAR_HOST_URL="http://localhost:9002"
$env:SONAR_TOKEN="<jeton SonarQube>"
sonar-scanner -Dsonar.host.url=$env:SONAR_HOST_URL -Dsonar.token=$env:SONAR_TOKEN
```

Le port `9002` évite le conflit avec MinIO, déjà exposé sur le port `9000` par la
configuration Docker locale. Adapter `SONAR_HOST_URL` si SonarQube utilise une autre adresse.

## Sprint 4 - Classes virtuelles et mobile

Le supplément de l'offre avec classes est configuré sur la formation. Le formateur gère ensuite
ses classes sur `/formateur/classes`; le participant affecté retrouve ses séances sur
`/participant/classes`. Le backend génère les salles et contrôle l'accès avant de fournir Jitsi.

L'instance se configure avec `JITSI_BASE_URL`. Pour Android Emulator :

```powershell
cd mobile
flutter run --dart-define=API_URL=http://10.0.2.2:8080/api
```

Le build iOS nécessite macOS et Xcode.

La mise à niveau simulée est idempotente grâce à l'en-tête `Idempotency-Key`. Une inscription avec
classes rend seulement le participant éligible : le formateur doit encore l'affecter à une classe.
L'application Flutter conserve le JWT avec `flutter_secure_storage`, bloque les appels hors ligne et
ouvre les ressources et réunions via des URL délivrées après contrôle du backend.

## Sprint 5 - Engagement, personnalisation et acquisition

L’expérience publique propose une orientation transparente sur `/orientation`. Elle recommande
uniquement des formations publiées à partir de règles explicables (domaine, niveau et contexte
d’apprentissage) et n’enregistre aucune réponse visiteur.

Après connexion, le participant peut compléter ou ignorer l’onboarding, reprendre sa dernière
consultation, gérer ses favoris, notes et signets privés, choisir un objectif hebdomadaire et suivre
le « parcours de connaissance » : Découvrir → Apprendre → Pratiquer → Participer → Maîtriser.
Seules les activités pédagogiques significatives alimentent l’objectif ; le simple temps d’ouverture
d’une page n’est jamais comptabilisé.

Les avis exigent une inscription active, au moins 30 % de progression et sont uniques par participant
et formation. Leur moyenne, les profils formateurs, les notifications et les indicateurs du tableau
de bord proviennent exclusivement de données réelles. Les pages privées sont exclues de l’indexation.
Un avis signalé ou masqué disparaît du flux public, mais son auteur conserve dans sa vue authentifiée
les actions de modification et de suppression ; la contrainte d’unicité interdit toujours un second avis.

Les routes REST sont documentées automatiquement dans Swagger sous le groupe
« Engagement et personnalisation ». Les règles, contrôles de sécurité, validations et résultats du
sprint sont détaillés dans `docs/sprint-5-suivi.md`.
