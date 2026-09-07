# Conseiller pédagogique conversationnel NexaLearn

## Architecture

Le navigateur Next.js appelle uniquement `http://localhost:8080/api/orientation`. Spring Boot authentifie le Participant (ou vérifie la session opaque du visiteur), conserve la conversation dans MySQL, charge les formations `PUBLIEE`, calcule les scores, puis appelle l’API locale Ollama `POST /api/chat`. Le navigateur n’accède jamais au port 11434.

MySQL reste la source de vérité pour les titres, prix, Formateurs, langues, niveaux, modules et identifiants. Qwen3 comprend le texte libre, extrait des préférences et rédige une explication ; il ne choisit pas les données commerciales et ne calcule pas les scores. Cette première version utilise une réponse HTTP non streamée pour garantir une gestion d’erreur réelle et ne simule aucun faux streaming.

## Installation locale sous Windows

1. Installer Ollama, puis vérifier avec `ollama --version`.
2. Télécharger le modèle seulement lorsque l’espace disque et la mémoire le permettent : `ollama pull qwen3:4b`.
3. Vérifier avec `ollama list`, puis démarrer si nécessaire avec `ollama serve`.
4. Démarrer l’infrastructure : `docker compose up -d`.
5. Démarrer Spring Boot avec le profil local et `AI_ENABLED=true`.
6. Dans `web`, lancer `npm run dev`, puis ouvrir `http://localhost:3000/orientation`.

```powershell
$env:SPRING_PROFILES_ACTIVE="local"
$env:AI_ENABLED="true"
mvn spring-boot:run
```

Le profil local active l’IA par défaut. La configuration générale la désactive par défaut afin qu’un déploiement ne dépende jamais implicitement d’Ollama.

## Configuration

| Variable | Défaut | Rôle |
|---|---:|---|
| `AI_ENABLED` | `false` | Active les appels IA |
| `AI_BASE_URL` | `http://localhost:11434` | Adresse Ollama vue par Spring Boot |
| `AI_MODEL` | `qwen3:4b` | Modèle local |
| `AI_TIMEOUT_SECONDS` | `60` | Délai maximal |
| `AI_MAX_HISTORY_MESSAGES` | `12` | Historique récent envoyé au modèle |
| `AI_HOURLY_LIMIT` | `20` | Messages par session et par heure |
| `AI_DAILY_LIMIT` | `100` | Messages par session et par 24 heures |
| `AI_MAX_RESPONSE_CHARACTERS` | `12000` | Taille brute maximale acceptée |

Pour changer de modèle : le télécharger explicitement, arrêter le backend, définir `AI_MODEL`, puis redémarrer. Aucun modèle n’est enregistré dans Git.

## Sécurité et anti-hallucination

- Un Participant est identifié par le JWT ; aucun `participantId` n’est accepté.
- Une conversation Participant est chargée par identifiant et email. Une conversation visiteur exige `X-Orientation-Session`.
- Admin et Formateur ne peuvent pas utiliser une conversation personnelle.
- Le JSON Qwen3 est validé et borné avant toute fusion ; une valeur absente n’écrase pas le profil connu.
- Ollama reçoit un JSON Schema strict avec `think: false`; le raisonnement interne n’est ni retourné ni persisté.
- Les montants en DH et durées explicitement écrits par l’utilisateur sont relus déterministiquement par Spring Boot et priment sur une extraction IA incohérente.
- Seules les formations encore `PUBLIEE` lors de l’enregistrement sont retournées.
- Le score Java sur 100 est : objectif/catégorie 30, compétences 20, niveau 15, langue 10, budget 10, classes 5, format 5, contenu visible 5. Les égalités utilisent l’identifiant croissant.
- React rend le texte sans `dangerouslySetInnerHTML`.
- JWT, secrets, liens présignés, emails privés et réponses de quiz ne sont jamais placés dans le prompt.

## Endpoints

- `POST /api/orientation/conversations`
- `GET /api/orientation/conversations` (Participant connecté)
- `GET /api/orientation/conversations/{id}`
- `POST /api/orientation/conversations/{id}/messages`
- `POST /api/orientation/conversations/{id}/preferences`
- `DELETE /api/orientation/conversations/{id}`

Chaque envoi porte un `requestId`. Un envoi concurrent reçoit `409 CONVERSATION_BUSY` et une contrainte SQL empêche le doublon durable.

## Erreurs fréquentes

- `AI_DISABLED` (503) : définir `AI_ENABLED=true`, puis redémarrer Spring Boot.
- `AI_SERVICE_UNAVAILABLE` (503) : vérifier `ollama serve`, le port 11434 et `AI_BASE_URL`.
- `AI_TIMEOUT` (503) : augmenter raisonnablement le timeout ou choisir un modèle plus petit.
- `AI_INVALID_RESPONSE` (502) : le message reste enregistré et les préférences ne sont pas corrompues.
- `AI_RATE_LIMIT` (429) : attendre la fin de la fenêtre.
- `CONVERSATION_NOT_FOUND` (404) : mauvaise session visiteur ou conversation d’un autre compte.

Le chatbot ne fonctionne pas si Spring Boot est arrêté. Si Ollama est arrêté, l’interface affiche l’indisponibilité et propose une nouvelle tentative.

## Démonstration pour le jury

1. Montrer navigateur → Spring Boot → MySQL/Ollama.
2. Poser « Java ou JavaScript ? » pour illustrer la conversation naturelle.
3. Donner progressivement objectif, niveau, budget, langue et disponibilité.
4. Demander trois recommandations et ouvrir une vraie fiche catalogue.
5. Montrer scores et raisons, puis sélectionner deux cartes pour les comparer.
6. Arrêter Ollama, montrer le `503` contrôlé, relancer Ollama et réessayer.

Pour arrêter : interrompre `mvn spring-boot:run`, `npm run dev` et `ollama serve` avec `Ctrl+C`. `docker compose stop` arrête l’infrastructure sans supprimer ses volumes.

## Limites connues

Qwen3 4B peut être lent sur une petite machine. Lors de la recette locale, les réponses structurées prenaient généralement 7 à 12 secondes après chargement du modèle. Il n’y a pas encore de SSE : la réponse apparaît lorsqu’elle est complète. La pertinence dépend des métadonnées réellement renseignées dans le catalogue.
