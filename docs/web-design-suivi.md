# Suivi du redesign Web

## Audit initial

- Base Git vérifiée le 29 juillet 2026 : `main` à `9176915`, incluant Sprint 4
  (`436fa786d6872d50aa8703008b34885eb31e6c5e`), Sprint 3 (`8b2f6d3`) et
  SonarQube (`fa788b2`).
- Branche locale de travail : `web-design`. Aucun push autorisé ni effectué.
- Frontend initial : 17 routes App Router, 3 composants partagés, styles globaux monolithiques,
  navigation publique incomplète et espaces métiers sans shell commun.
- Fonctionnel existant préservé : JWT, rôles, catalogue, inscription/achat simulé,
  contenus privés, progression, QCM, gestion des formations, classes et Jitsi.
- Validation initiale : 29 tests réussis ; couverture statements 67,31 %, branches
  60,47 %, fonctions 57,29 %, lignes 75,92 % ; typecheck, lint et build réussis.
- Référence RIHLA analysée en lecture seule : hiérarchie de dashboards, navigation par rôle,
  cartes KPI, états de page et comportement responsive. Son identité orange/rouge et ses
  effets décoratifs ne sont pas repris.
- Documentation locale Next.js 16 lue avant l’évolution de la structure App Router :
  pages/layouts, composants serveur/client, CSS global, images, fonts et metadata.

## Direction visuelle

Identité E-learning dédiée nommée **NexaLearn** : structure navy, actions bleu royal,
progression émeraude et direct ambre. Les surfaces utilisent des gris froids, des bordures
fines et des ombres courtes. La typographie repose sur une pile système sans téléchargement
externe. Le thème sombre, le focus clavier, la réduction des animations et les zones tactiles
de 44 px font partie du socle.

## Pages et avancement

| Parcours | Routes | État |
|---|---|---|
| Socle partagé | design tokens, thème, UI, header/footer, shells, états | Terminé |
| Accueil public | `/` | Terminé |
| Authentification | `/login`, `/register/participant`, `/register/formateur`, `/forgot-password`, `/reset-password` | Terminé |
| Catalogue | `/catalogue`, `/catalogue/[id]` | Terminé |
| Participant | `/profile`, `/apprentissage/[formationId]/quiz`, `/participant/classes` | Terminé |
| Formateur | `/formateur/formations`, éditeur, QCM, `/formateur/classes` | Terminé |
| Administration | `/admin/formateurs` | Terminé |
| États globaux | loading, error, not-found, confirmation, toast | Terminé |
| Recette | tests, couverture, typecheck, lint, build, desktop/mobile | Validée |

## Recette finale

- TypeScript : réussi.
- ESLint ciblé : réussi sur le périmètre du redesign. Une tentative supplémentaire après
  recette a été arrêtée après 60 secondes sans sortie ; la compilation à chaud Next.js et
  la recette des fichiers concernés ont servi de validation alternative.
- Tests : 33/33 réussis.
- Couverture : statements 66,10 %, branches 64,81 %, fonctions 56,95 %, lignes 71,85 %.
- Build de production Next.js : réussi.
- Recette navigateur réelle sur API locale : desktop 1366 × 768 et mobile 390 × 844,
  thèmes clair et sombre, navigation publique et authentifiée, formulaires d’inscription,
  connexion, recherche catalogue et espaces participant, formateur et administrateur.
- Console navigateur finale : aucune erreur ni alerte.
- Correctifs issus de la recette : conservation de la référence du formulaire avant
  l’appel asynchrone, retour à zéro fiable après inscription, gestion des identifiants longs
  sur mobile et déclaration explicite du défilement fluide pour Next.js.
- Le catalogue de la base locale ne contenait aucune formation publiée : les états vides
  de l’accueil, du catalogue et des espaces métier ont donc été validés sans inventer de
  données de démonstration.

## Réserves de contrat API

- Le détail public d’une formation n’expose pas le montant `supplementClasses` ni
  `classesGratuites`. Le frontend ne doit donc pas inventer ce tarif.
- Aucun compteur d’inscrits n’est exposé dans le résumé formateur ; le dashboard affiche
  uniquement les indicateurs réellement disponibles.
