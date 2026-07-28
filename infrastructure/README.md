# Infrastructure

Les services de développement sont déclarés dans `docker-compose.yml` :

- MySQL 8.4 sur le port 3306 ;
- Mailpit sur les ports 1025 et 8025 ;
- MinIO sur le port API 9000 et le port console 9001 ;
- un conteneur d'initialisation idempotent créant le bucket pédagogique.

Les identifiants sont fournis par variables d'environnement. Le fichier `.env.example`
ne contient que des valeurs factices et le fichier `.env` ne doit jamais être versionné.
