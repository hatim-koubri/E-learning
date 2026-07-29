# Suivi du Sprint 3

| ID | Description | Statut | Validation |
|---|---|---|---|
| T3-01 | API publique du catalogue, recherche, filtres et pagination | Terminé | DTO, tri titre/id, formations publiées uniquement |
| T3-02 | Catalogue Next.js responsive | Terminé | Recherche, pagination, chargement, vide et erreurs |
| T3-03 | Fiche formation et programme | Terminé | Formateur, prix DH, niveaux, compteurs, aperçu et verrous |
| T3-04 | Inscription et règles d'accès | Terminé | Achat simulé idempotent, participant uniquement, propriété et rôles |
| T3-05 | Accès temporaire MinIO | Terminé | URL courte configurable après contrôle; bucket jamais public |
| T3-06 | Lecteur pédagogique | Terminé | Vidéo, PDF, YouTube, renouvellement d'URL et navigation |
| T3-07 | Progression | Terminé | Chapitres ordonnés, position vidéo, calcul serveur 0-100 et idempotence |
| T3-08 | Modèle des évaluations | Terminé | Quiz, questions, réponses proposées et tentatives dans V3 |
| T3-09 | Création de QCM par le propriétaire | Terminé | Interface, API, validation et publication |
| T3-10 | Passage d'un QCM en ligne | Terminé | Prérequis, 3 tentatives/8 h ou 24 h |
| T3-11 | Correction serveur | Terminé | Score serveur, réponses étrangères refusées, résultat enregistré |
| T3-12 | Tests | Terminé | Tests Spring, TypeScript, ESLint, build et parcours Docker/MySQL |

## Décisions du MVP

- Une inscription est unique pour un participant et une formation.
- Le prix courant est copié en DH avec le mode `SIMULATION`; aucune donnée bancaire n'est stockée.
- Le type `CONTENU` ne donne aucun droit sur les futures classes virtuelles.
- Tous les chapitres doivent être terminés avant l'accès aux quiz publiés.
- Une question est réussie seulement lorsque l'ensemble exact de ses réponses correctes est sélectionné.
- Aucun téléchargement hors ligne n'est exposé; les réponses d'accès indiquent toujours
  `telechargeable=false`.

## Migration

`V3__create_learning_progress_and_quizzes.sql` ajoute uniquement les inscriptions, progressions,
quiz, questions, réponses, tentatives et réponses soumises. V1 et V2 restent inchangées.

## Réserves

- Les classes virtuelles et le type `CONTENU_ET_CLASSES` restent réservés au Sprint 4.
- Le paiement est volontairement simulé; aucune passerelle bancaire n'est intégrée.
- La reprise exacte de position vidéo est enregistrée par l'API; l'automatisation fine des événements
  du lecteur pourra être enrichie après le MVP.
