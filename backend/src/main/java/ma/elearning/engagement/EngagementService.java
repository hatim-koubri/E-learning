package ma.elearning.engagement;

import ma.elearning.api.EngagementDtos.*;
import ma.elearning.common.BusinessException;
import ma.elearning.formation.*;
import ma.elearning.learning.*;
import ma.elearning.quiz.QuizRepository;
import ma.elearning.user.*;
import ma.elearning.virtualclass.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class EngagementService {
    private final ParticipantPreferenceRepository preferences;
    private final FavoriteRepository favorites;
    private final LearningPositionRepository positions;
    private final PrivateNoteRepository notes;
    private final LearningActivityRepository activities;
    private final WeeklyGoalRepository goals;
    private final CourseReviewRepository reviews;
    private final ReviewReportRepository reports;
    private final UserNotificationRepository notifications;
    private final NotificationPreferenceRepository notificationPreferences;
    private final UserRepository users;
    private final FormateurRepository formateurs;
    private final FormationRepository formations;
    private final ChapitreRepository chapitres;
    private final RessourceRepository ressources;
    private final InscriptionRepository inscriptions;
    private final ProgressionChapitreRepository progressions;
    private final QuizRepository quizzes;
    private final ClasseMembreRepository membres;
    private final ClasseRepository classes;

    public EngagementService(
            ParticipantPreferenceRepository preferences,
            FavoriteRepository favorites,
            LearningPositionRepository positions,
            PrivateNoteRepository notes,
            LearningActivityRepository activities,
            WeeklyGoalRepository goals,
            CourseReviewRepository reviews,
            ReviewReportRepository reports,
            UserNotificationRepository notifications,
            NotificationPreferenceRepository notificationPreferences,
            UserRepository users,
            FormateurRepository formateurs,
            FormationRepository formations,
            ChapitreRepository chapitres,
            RessourceRepository ressources,
            InscriptionRepository inscriptions,
            ProgressionChapitreRepository progressions,
            QuizRepository quizzes,
            ClasseMembreRepository membres,
            ClasseRepository classes) {
        this.preferences = preferences;
        this.favorites = favorites;
        this.positions = positions;
        this.notes = notes;
        this.activities = activities;
        this.goals = goals;
        this.reviews = reviews;
        this.reports = reports;
        this.notifications = notifications;
        this.notificationPreferences = notificationPreferences;
        this.users = users;
        this.formateurs = formateurs;
        this.formations = formations;
        this.chapitres = chapitres;
        this.ressources = ressources;
        this.inscriptions = inscriptions;
        this.progressions = progressions;
        this.quizzes = quizzes;
        this.membres = membres;
        this.classes = classes;
    }

    @Transactional(readOnly = true)
    public PreferenceResponse preferences(String email) {
        return preferences.findByParticipantEmail(email).map(this::preferenceResponse)
                .orElseGet(() -> new PreferenceResponse(List.of(), NiveauFormation.DEBUTANT, "", 60,
                        PreferenceFormat.PRATIQUE, false, false, false, "Africa/Casablanca"));
    }

    @Transactional
    public PreferenceResponse savePreferences(String email, PreferenceRequest request) {
        Participant participant = participant(email);
        validateZone(request.fuseauHoraire());
        ParticipantPreference preference = preferences.findByParticipantEmail(email).orElseGet(() -> {
            ParticipantPreference created = new ParticipantPreference();
            created.setParticipant(participant);
            return created;
        });
        preference.setDomaines(request.domaines().stream()
                .map(String::trim).filter(value -> !value.isBlank())
                .map(value -> value.replace("|", "")).distinct().collect(Collectors.joining("|")));
        preference.setNiveau(request.niveau());
        preference.setObjectif(request.objectif().trim());
        preference.setMinutesHebdomadaires(request.minutesHebdomadaires());
        preference.setFormatPrefere(request.formatPrefere());
        preference.setRappelsActifs(request.rappelsActifs());
        preference.setFuseauHoraire(ZoneId.of(request.fuseauHoraire()).getId());
        preference.setOnboardingTermine(true);
        preference.setOnboardingIgnore(false);
        preferences.save(preference);
        WeeklyGoal goal = goals.findByParticipantEmail(email).orElseGet(() -> {
            WeeklyGoal created = new WeeklyGoal();
            created.setParticipant(participant);
            return created;
        });
        goal.setMinutesCible(normalizeGoal(request.minutesHebdomadaires()));
        goal.setFuseauHoraire(preference.getFuseauHoraire());
        goals.save(goal);
        return preferenceResponse(preference);
    }

    @Transactional
    public PreferenceResponse skipOnboarding(String email) {
        Participant participant = participant(email);
        ParticipantPreference preference = preferences.findByParticipantEmail(email).orElseGet(() -> {
            ParticipantPreference created = new ParticipantPreference();
            created.setParticipant(participant);
            return created;
        });
        preference.setOnboardingIgnore(true);
        preference.setOnboardingTermine(false);
        return preferenceResponse(preferences.save(preference));
    }

    @Transactional
    public FavoriteResponse addFavorite(String email, Long formationId) {
        Participant participant = participant(email);
        Formation formation = published(formationId);
        Favorite existing = favorites.findByParticipantEmailAndFormationId(email, formationId).orElse(null);
        if (existing != null) return favoriteResponse(existing, email);
        Favorite favorite = new Favorite();
        favorite.setParticipant(participant);
        favorite.setFormation(formation);
        try {
            return favoriteResponse(favorites.saveAndFlush(favorite), email);
        } catch (DataIntegrityViolationException exception) {
            return favorites.findByParticipantEmailAndFormationId(email, formationId)
                    .map(value -> favoriteResponse(value, email)).orElseThrow(() -> exception);
        }
    }

    @Transactional
    public void removeFavorite(String email, Long formationId) {
        favorites.findByParticipantEmailAndFormationId(email, formationId).ifPresent(favorites::delete);
    }

    @Transactional(readOnly = true)
    public List<FavoriteResponse> favorites(String email) {
        return favorites.findByParticipantEmailOrderByCreatedAtDesc(email).stream()
                .filter(value -> value.getFormation().getStatut() == FormationStatus.PUBLIEE)
                .map(value -> favoriteResponse(value, email)).toList();
    }

    @Transactional
    public ResumeResponse recordPosition(String email, Long formationId, LearningPositionRequest request) {
        Inscription inscription = activeEnrollment(email, formationId);
        Formation formation = inscription.getFormation();
        FormationModule module = request.moduleId() == null ? null : formation.getModules().stream()
                .filter(value -> value.getId().equals(request.moduleId())).findFirst().orElseThrow(this::notFound);
        Chapitre chapitre = request.chapitreId() == null ? null : chapitres.findById(request.chapitreId())
                .filter(value -> value.getModule().getFormation().getId().equals(formationId)).orElseThrow(this::notFound);
        RessourcePedagogique ressource = request.ressourceId() == null ? null : ressources.findById(request.ressourceId())
                .filter(value -> value.getChapitre().getModule().getFormation().getId().equals(formationId))
                .orElseThrow(this::notFound);
        if (ressource != null) {
            chapitre = ressource.getChapitre();
            module = chapitre.getModule();
        } else if (chapitre != null) {
            module = chapitre.getModule();
        }
        LearningPosition position = positions.findByParticipantEmailAndFormationId(email, formationId).orElseGet(() -> {
            LearningPosition created = new LearningPosition();
            created.setParticipant(inscription.getParticipant());
            created.setFormation(formation);
            return created;
        });
        position.setModule(module);
        position.setChapitre(chapitre);
        position.setRessource(ressource);
        position.setConsultedAt(Instant.now());
        return resumeResponse(positions.save(position));
    }

    @Transactional
    public void recordResourceConsultation(String email, Long formationId, RessourcePedagogique resource) {
        if (email == null || users.findByEmail(email).map(User::getRole).orElse(null) != Role.PARTICIPANT) return;
        recordPosition(email, formationId,
                new LearningPositionRequest(resource.getChapitre().getModule().getId(),
                        resource.getChapitre().getId(), resource.getId()));
        recordActivity(email, formationId, ActivityType.RESSOURCE_CONSULTEE,
                "resource:" + resource.getId() + ":" + LocalDate.now(ZoneOffset.UTC), 3);
    }

    @Transactional(readOnly = true)
    public ResumeResponse resume(String email) {
        return positions.findFirstByParticipantEmailOrderByConsultedAtDesc(email)
                .filter(position -> inscriptions.existsByParticipantEmailAndFormationIdAndStatutIn(
                        email, position.getFormation().getId(),
                        List.of(InscriptionStatut.ACTIVE, InscriptionStatut.CONFIRMEE)))
                .map(this::resumeResponse).orElse(null);
    }

    @Transactional
    public PrivateNoteResponse createNote(String email, Long formationId, PrivateNoteRequest request) {
        Inscription inscription = activeEnrollment(email, formationId);
        PrivateNote note = new PrivateNote();
        note.setParticipant(inscription.getParticipant());
        note.setFormation(inscription.getFormation());
        applyNote(note, formationId, request);
        return noteResponse(notes.saveAndFlush(note));
    }

    @Transactional
    public PrivateNoteResponse updateNote(String email, Long id, PrivateNoteRequest request) {
        PrivateNote note = notes.findByIdAndParticipantEmail(id, email).orElseThrow(this::notFound);
        applyNote(note, note.getFormation().getId(), request);
        return noteResponse(notes.save(note));
    }

    @Transactional
    public void deleteNote(String email, Long id) {
        notes.delete(notes.findByIdAndParticipantEmail(id, email).orElseThrow(this::notFound));
    }

    @Transactional(readOnly = true)
    public List<PrivateNoteResponse> notes(String email, Long formationId) {
        List<PrivateNote> result = formationId == null
                ? notes.findByParticipantEmailOrderByUpdatedAtDesc(email)
                : notes.findByParticipantEmailAndFormationIdOrderByUpdatedAtDesc(email, formationId);
        return result.stream().map(this::noteResponse).toList();
    }

    @Transactional
    public WeeklyGoalResponse updateGoal(String email, WeeklyGoalRequest request) {
        validateZone(request.fuseauHoraire());
        if (!Set.of(30, 60, 120, 180).contains(request.minutesCible())) {
            throw error(HttpStatus.BAD_REQUEST, "INVALID_WEEKLY_GOAL",
                    "Choisissez un objectif de 30, 60, 120 ou 180 minutes.");
        }
        WeeklyGoal goal = goals.findByParticipantEmail(email).orElseGet(() -> {
            WeeklyGoal created = new WeeklyGoal();
            created.setParticipant(participant(email));
            return created;
        });
        goal.setMinutesCible(request.minutesCible());
        goal.setFuseauHoraire(ZoneId.of(request.fuseauHoraire()).getId());
        goals.save(goal);
        return goalResponse(email, goal);
    }

    @Transactional(readOnly = true)
    public WeeklyGoalResponse goal(String email) {
        WeeklyGoal goal = goals.findByParticipantEmail(email).orElse(null);
        if (goal == null) {
            WeeklyGoal virtual = new WeeklyGoal();
            virtual.setMinutesCible(preferences.findByParticipantEmail(email)
                    .map(ParticipantPreference::getMinutesHebdomadaires).map(this::normalizeGoal).orElse(60));
            virtual.setFuseauHoraire(preferences.findByParticipantEmail(email)
                    .map(ParticipantPreference::getFuseauHoraire).orElse("Africa/Casablanca"));
            return goalResponse(email, virtual);
        }
        return goalResponse(email, goal);
    }

    @Transactional
    public void recordActivity(String email, Long formationId, ActivityType type, String sourceKey, int minutes) {
        if (activities.existsByParticipantEmailAndTypeAndSourceKey(email, type, sourceKey)) return;
        LearningActivity activity = new LearningActivity();
        activity.setParticipant(participant(email));
        activity.setFormation(formationId == null ? null : formations.findById(formationId).orElseThrow(this::notFound));
        activity.setType(type);
        activity.setSourceKey(sourceKey);
        activity.setMinutesValidees(Math.max(0, Math.min(minutes, 240)));
        try {
            activities.saveAndFlush(activity);
        } catch (DataIntegrityViolationException ignored) {
            // Idempotence is guaranteed by the database constraint.
        }
    }

    @Transactional(readOnly = true)
    public List<Recommendation> recommendations(String email) {
        ParticipantPreference preference = preferences.findByParticipantEmail(email).orElse(null);
        Set<String> domains = preference == null ? Set.of() : domains(preference.getDomaines());
        NiveauFormation level = preference == null ? null : preference.getNiveau();
        Map<Long, Inscription> enrollmentByFormation = inscriptions
                .findByParticipantEmailOrderByDateInscriptionDesc(email).stream()
                .collect(Collectors.toMap(value -> value.getFormation().getId(), Function.identity()));
        Set<String> learnedCategories = enrollmentByFormation.values().stream()
                .map(value -> value.getFormation().getCategorie().toLowerCase(Locale.ROOT)).collect(Collectors.toSet());
        Set<String> favoriteCategories = favorites.findByParticipantEmailOrderByCreatedAtDesc(email).stream()
                .map(value -> value.getFormation().getCategorie().toLowerCase(Locale.ROOT)).collect(Collectors.toSet());
        return scoreRecommendations(formations.findByStatutOrderByUpdatedAtDesc(FormationStatus.PUBLIEE),
                domains, level, learnedCategories, favoriteCategories, enrollmentByFormation, 6);
    }

    @Transactional(readOnly = true)
    public List<Recommendation> orientation(OrientationRequest request) {
        return scoreRecommendations(formations.findByStatutOrderByUpdatedAtDesc(FormationStatus.PUBLIEE),
                Set.of(request.domaine().trim().toLowerCase(Locale.ROOT)), request.niveau(),
                Set.of(), Set.of(), Map.of(), 5);
    }

    @Transactional
    public ReviewResponse createReview(String email, Long formationId, ReviewRequest request) {
        Inscription inscription = activeEnrollment(email, formationId);
        if (inscription.getProgression().compareTo(new BigDecimal("30")) < 0) {
            throw error(HttpStatus.CONFLICT, "REVIEW_PROGRESS_REQUIRED",
                    "Atteignez au moins 30 % de progression avant de publier un avis.");
        }
        if (reviews.findByParticipantEmailAndFormationId(email, formationId).isPresent()) {
            throw error(HttpStatus.CONFLICT, "REVIEW_ALREADY_EXISTS",
                    "Vous avez déjà publié un avis pour cette formation.");
        }
        CourseReview review = new CourseReview();
        review.setParticipant(inscription.getParticipant());
        review.setFormation(inscription.getFormation());
        review.setNote(request.note());
        review.setCommentaire(request.commentaire().trim());
        review = reviews.saveAndFlush(review);
        notifyUser(inscription.getFormation().getFormateur(), NotificationCategory.REPONSE_FORMATEUR,
                "Nouvel avis sur votre formation",
                inscription.getParticipant().getNom() + " a publié un avis sur " + inscription.getFormation().getTitre() + ".",
                "/formateur/engagement");
        return reviewResponse(review, email);
    }

    @Transactional
    public ReviewResponse updateReview(String email, Long id, ReviewRequest request) {
        CourseReview review = reviews.findByIdAndParticipantEmail(id, email).orElseThrow(this::notFound);
        review.setNote(request.note());
        review.setCommentaire(request.commentaire().trim());
        if (review.getStatut() == ReviewStatus.MASQUE) review.setStatut(ReviewStatus.SIGNALE);
        return reviewResponse(reviews.save(review), email);
    }

    @Transactional
    public void deleteReview(String email, Long id) {
        CourseReview review = reviews.findByIdAndParticipantEmail(id, email).orElseThrow(this::notFound);
        reports.deleteAllByReviewId(id);
        reviews.delete(review);
    }

    @Transactional(readOnly = true)
    public ReviewSummary publicReviews(Long formationId, int page, int size, String email) {
        published(formationId);
        int safeSize = Math.min(Math.max(size, 1), 30);
        var result = reviews.findByFormationIdAndStatutOrderByCreatedAtDesc(
                formationId, ReviewStatus.PUBLIE, PageRequest.of(Math.max(page, 0), safeSize));
        List<ReviewResponse> content = new ArrayList<>(
                result.getContent().stream().map(value -> reviewResponse(value, email)).toList());
        if (email != null && page <= 0) {
            reviews.findByParticipantEmailAndFormationId(email, formationId)
                    .filter(value -> value.getStatut() != ReviewStatus.PUBLIE)
                    .map(value -> reviewResponse(value, email))
                    .ifPresent(content::addFirst);
        }
        return new ReviewSummary(
                round(reviews.averageForFormation(formationId, ReviewStatus.PUBLIE)),
                reviews.countByFormationIdAndStatut(formationId, ReviewStatus.PUBLIE),
                content, result.getNumber(), result.getTotalPages());
    }

    @Transactional
    public ReviewResponse replyToReview(String email, Long id, ReviewReplyRequest request) {
        CourseReview review = reviews.findByIdAndFormationFormateurEmail(id, email).orElseThrow(this::notFound);
        review.setReponseFormateur(request.reponse().trim());
        review = reviews.save(review);
        notifyUser(review.getParticipant(), NotificationCategory.REPONSE_FORMATEUR,
                "Réponse à votre avis", "Le formateur a répondu à votre avis sur " + review.getFormation().getTitre() + ".",
                "/catalogue/" + review.getFormation().getId());
        return reviewResponse(review, null);
    }

    @Transactional(readOnly = true)
    public TrainerEngagement trainerEngagement(String email) {
        List<CourseReview> trainerReviews = reviews.findByFormationFormateurEmailOrderByCreatedAtDesc(email);
        long published = trainerReviews.stream().filter(value -> value.getStatut() == ReviewStatus.PUBLIE).count();
        double average = trainerReviews.stream().filter(value -> value.getStatut() == ReviewStatus.PUBLIE)
                .mapToInt(CourseReview::getNote).average().orElse(0);
        Formateur trainer = formateurs.findByEmailAndStatut(email, AccountStatus.ACTIF).orElseThrow(this::notFound);
        return new TrainerEngagement(inscriptions.countByFormationFormateurId(trainer.getId()), published,
                round(average), trainerReviews.stream().map(value -> reviewResponse(value, null)).toList());
    }

    @Transactional
    public void reportReview(String email, Long id, ReviewReportRequest request) {
        Participant reporter = participant(email);
        CourseReview review = reviews.findById(id).orElseThrow(this::notFound);
        if (review.getParticipant().getEmail().equalsIgnoreCase(email)) {
            throw error(HttpStatus.BAD_REQUEST, "OWN_REVIEW_REPORT", "Vous ne pouvez pas signaler votre propre avis.");
        }
        if (reports.existsByReviewIdAndParticipantEmail(id, email)) return;
        ReviewReport report = new ReviewReport();
        report.setReview(review);
        report.setParticipant(reporter);
        report.setMotif(request.motif().trim());
        reports.saveAndFlush(report);
        review.setStatut(ReviewStatus.SIGNALE);
        reviews.save(review);
    }

    @Transactional(readOnly = true)
    public List<ReviewReportResponse> reviewReports() {
        return reports.findAllByOrderByCreatedAtDesc().stream()
                .map(value -> new ReviewReportResponse(value.getId(), value.getReview().getId(),
                        value.getMotif(), value.getCreatedAt())).toList();
    }

    @Transactional
    public ReviewResponse moderateReview(Long id, ReviewModerationRequest request) {
        if (request.statut() != ReviewStatus.PUBLIE && request.statut() != ReviewStatus.MASQUE) {
            throw error(HttpStatus.BAD_REQUEST, "INVALID_MODERATION_STATUS",
                    "La modération doit publier ou masquer l'avis.");
        }
        CourseReview review = reviews.findById(id).orElseThrow(this::notFound);
        review.setStatut(request.statut());
        return reviewResponse(reviews.save(review), null);
    }

    @Transactional(readOnly = true)
    public NotificationPage notifications(String email, int page, int size) {
        var result = notifications.findByUserEmailOrderByCreatedAtDesc(
                email, PageRequest.of(Math.max(0, page), Math.min(Math.max(size, 1), 50)));
        return new NotificationPage(result.getContent().stream().map(this::notificationResponse).toList(),
                notifications.countByUserEmailAndLueFalse(email), result.getNumber(), result.getTotalPages());
    }

    @Transactional
    public NotificationResponse markRead(String email, Long id) {
        UserNotification notification = notifications.findByIdAndUserEmail(id, email).orElseThrow(this::notFound);
        notification.setLue(true);
        return notificationResponse(notifications.save(notification));
    }

    @Transactional
    public void markAllRead(String email) {
        notifications.markAllRead(email);
    }

    @Transactional(readOnly = true)
    public List<NotificationPreferenceResponse> notificationPreferences(String email) {
        Map<NotificationCategory, NotificationPreference> existing = notificationPreferences
                .findByUserEmailOrderByCategorie(email).stream()
                .collect(Collectors.toMap(NotificationPreference::getCategorie, Function.identity()));
        return Arrays.stream(NotificationCategory.values()).map(category -> {
            NotificationPreference preference = existing.get(category);
            return new NotificationPreferenceResponse(category,
                    preference == null || preference.isDansApplication(),
                    preference != null && preference.isEmailActif());
        }).toList();
    }

    @Transactional
    public NotificationPreferenceResponse updateNotificationPreference(
            String email, NotificationPreferenceRequest request) {
        User user = user(email);
        NotificationPreference preference = notificationPreferences
                .findByUserEmailAndCategorie(email, request.categorie()).orElseGet(() -> {
                    NotificationPreference created = new NotificationPreference();
                    created.setUser(user);
                    created.setCategorie(request.categorie());
                    return created;
                });
        preference.setDansApplication(request.dansApplication());
        preference.setEmailActif(request.emailActif());
        preference = notificationPreferences.save(preference);
        return new NotificationPreferenceResponse(preference.getCategorie(),
                preference.isDansApplication(), preference.isEmailActif());
    }

    @Transactional
    public void sendNotification(String email, NotificationCategory category,
                                 String title, String message, String actionUrl) {
        notifyUser(user(email), category, title, message, actionUrl);
    }

    @Transactional
    public void notifyFormationParticipants(Formation formation, NotificationCategory category,
                                            String title, String message, String actionUrl) {
        inscriptions.findByFormationId(formation.getId()).stream()
                .map(Inscription::getParticipant).distinct()
                .forEach(participant -> notifyUser(participant, category, title, message, actionUrl));
    }

    @Transactional(readOnly = true)
    public DashboardResponse dashboard(String email) {
        List<Inscription> participantEnrollments = inscriptions.findByParticipantEmailOrderByDateInscriptionDesc(email);
        int overall = participantEnrollments.isEmpty() ? 0 : participantEnrollments.stream()
                .map(Inscription::getProgression).reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(participantEnrollments.size()), 0, RoundingMode.HALF_UP).intValue();
        ResumeResponse resume = resume(email);
        String nextAction = resume != null ? "Reprendre " + resume.formationTitre()
                : participantEnrollments.isEmpty() ? "Choisir une première formation"
                : "Ouvrir votre prochaine formation";
        DashboardClass nextClass = nextClassForParticipant(email);
        int availableQuiz = participantEnrollments.stream()
                .filter(value -> value.getProgression().compareTo(new BigDecimal("100")) >= 0)
                .mapToInt(value -> Math.toIntExact(quizzes.countByFormationIdAndPublieTrue(value.getFormation().getId())))
                .sum();
        List<RecentActivity> recent = activities.findTop10ByParticipantEmailOrderByOccurredAtDesc(email).stream()
                .map(value -> new RecentActivity(value.getType(),
                        value.getFormation() == null ? null : value.getFormation().getTitre(),
                        value.getMinutesValidees(), value.getOccurredAt())).toList();
        return new DashboardResponse(resume, nextAction, overall, goal(email), nextClass, availableQuiz,
                participantEnrollments.stream().map(value -> new DashboardEnrollment(
                        value.getFormation().getId(), value.getFormation().getTitre(),
                        value.getProgression(), value.getTypeAcces().name())).toList(),
                favorites(email), recommendations(email), recent);
    }

    @Transactional(readOnly = true)
    public LearningJourney journey(String email, Long formationId) {
        Inscription inscription = activeEnrollment(email, formationId);
        Set<Long> completed = progressions.findByInscriptionId(inscription.getId()).stream()
                .filter(ProgressionChapitre::isTermine).map(value -> value.getChapitre().getId())
                .collect(Collectors.toSet());
        List<Chapitre> ordered = inscription.getFormation().getModules().stream()
                .flatMap(module -> module.getChapitres().stream()).toList();
        Map<Long, Integer> chapterIndex = new HashMap<>();
        for (int index = 0; index < ordered.size(); index++) chapterIndex.put(ordered.get(index).getId(), index);
        List<JourneyModule> moduleDtos = inscription.getFormation().getModules().stream().map(module -> {
            List<JourneyChapter> chapterDtos = module.getChapitres().stream().map(chapter -> {
                int index = chapterIndex.get(chapter.getId());
                boolean prerequisiteDone = index == 0 || completed.contains(ordered.get(index - 1).getId());
                String state = completed.contains(chapter.getId()) ? "TERMINE"
                        : prerequisiteDone ? "DISPONIBLE" : "VERROUILLE";
                List<JourneyResource> resourceDtos = chapter.getRessources().stream()
                        .map(resource -> new JourneyResource(resource.getId(), resource.getTitre(),
                                resource.getType().name(), state)).toList();
                return new JourneyChapter(chapter.getId(), chapter.getTitre(), state,
                        completed.contains(chapter.getId()) ? 100 : 0, resourceDtos);
            }).toList();
            int moduleProgress = chapterDtos.isEmpty() ? 0 : (int) chapterDtos.stream()
                    .filter(value -> "TERMINE".equals(value.etat())).count() * 100 / chapterDtos.size();
            String moduleState = moduleProgress == 100 ? "TERMINE"
                    : chapterDtos.stream().anyMatch(value -> !"VERROUILLE".equals(value.etat()))
                    ? "DISPONIBLE" : "VERROUILLE";
            return new JourneyModule(module.getId(), module.getTitre(), moduleState, moduleProgress, chapterDtos);
        }).toList();
        return new LearningJourney(formationId, inscription.getFormation().getTitre(),
                inscription.getProgression().intValue(), moduleDtos);
    }

    @Transactional(readOnly = true)
    public InstructorProfile instructor(Long id) {
        Formateur trainer = formateurs.findByIdAndStatut(id, AccountStatus.ACTIF).orElseThrow(this::notFound);
        List<Formation> courses = formations.findByFormateurIdAndStatutOrderByUpdatedAtDesc(id, FormationStatus.PUBLIEE);
        long reviewCount = courses.stream().mapToLong(value ->
                reviews.countByFormationIdAndStatut(value.getId(), ReviewStatus.PUBLIE)).sum();
        double weightedReviewSum = courses.stream().mapToDouble(value ->
                reviews.averageForFormation(value.getId(), ReviewStatus.PUBLIE)
                        * reviews.countByFormationIdAndStatut(value.getId(), ReviewStatus.PUBLIE)).sum();
        return new InstructorProfile(trainer.getId(), trainer.getNom(), trainer.getSpecialite(),
                trainer.getBiographie(), inscriptions.countByFormationFormateurId(id),
                reviewCount == 0 ? 0 : round(weightedReviewSum / reviewCount),
                nextClassForTrainer(trainer.getEmail()), courses.stream().map(value ->
                new InstructorCourse(value.getId(), value.getTitre(), value.getCategorie(), value.getNiveau())).toList());
    }

    @Transactional
    public InstructorProfile updateInstructor(String email, InstructorProfileRequest request) {
        Formateur trainer = formateurs.findByEmailAndStatut(email, AccountStatus.ACTIF).orElseThrow(this::notFound);
        trainer.setSpecialite(request.specialite().trim());
        trainer.setBiographie(request.biographie().trim());
        formateurs.save(trainer);
        return instructor(trainer.getId());
    }

    private PreferenceResponse preferenceResponse(ParticipantPreference value) {
        return new PreferenceResponse(new ArrayList<>(domains(value.getDomaines())), value.getNiveau(),
                value.getObjectif(), value.getMinutesHebdomadaires(), value.getFormatPrefere(),
                value.isRappelsActifs(), value.isOnboardingTermine(), value.isOnboardingIgnore(),
                value.getFuseauHoraire());
    }

    private FavoriteResponse favoriteResponse(Favorite favorite, String email) {
        BigDecimal progress = inscriptions.findByParticipantEmailAndFormationId(email, favorite.getFormation().getId())
                .map(Inscription::getProgression).orElse(BigDecimal.ZERO);
        return new FavoriteResponse(favorite.getId(), favorite.getFormation().getId(),
                favorite.getFormation().getTitre(), favorite.getFormation().getCategorie(),
                favorite.getFormation().getNiveau(), progress, favorite.getCreatedAt());
    }

    private ResumeResponse resumeResponse(LearningPosition position) {
        String href = "/catalogue/" + position.getFormation().getId();
        if (position.getChapitre() != null) href += "?chapitre=" + position.getChapitre().getId();
        if (position.getRessource() != null) href += "#ressource-" + position.getRessource().getId();
        return new ResumeResponse(position.getFormation().getId(), position.getFormation().getTitre(),
                position.getModule() == null ? null : position.getModule().getId(),
                position.getModule() == null ? null : position.getModule().getTitre(),
                position.getChapitre() == null ? null : position.getChapitre().getId(),
                position.getChapitre() == null ? null : position.getChapitre().getTitre(),
                position.getRessource() == null ? null : position.getRessource().getId(),
                position.getRessource() == null ? null : position.getRessource().getTitre(),
                position.getConsultedAt(), href);
    }

    private void applyNote(PrivateNote note, Long formationId, PrivateNoteRequest request) {
        String content = request.contenu() == null || request.contenu().isBlank()
                ? null : request.contenu().trim();
        if (content == null && !request.signet()) {
            throw error(HttpStatus.BAD_REQUEST, "EMPTY_PRIVATE_NOTE",
                    "Ajoutez une note ou activez le signet.");
        }
        Chapitre chapter = request.chapitreId() == null ? null : chapitres.findById(request.chapitreId())
                .filter(value -> value.getModule().getFormation().getId().equals(formationId))
                .orElseThrow(this::notFound);
        RessourcePedagogique resource = request.ressourceId() == null ? null : ressources.findById(request.ressourceId())
                .filter(value -> value.getChapitre().getModule().getFormation().getId().equals(formationId))
                .orElseThrow(this::notFound);
        if (resource != null) chapter = resource.getChapitre();
        note.setChapitre(chapter);
        note.setRessource(resource);
        note.setContenu(content);
        note.setSignet(request.signet());
    }

    private PrivateNoteResponse noteResponse(PrivateNote note) {
        return new PrivateNoteResponse(note.getId(), note.getFormation().getId(), note.getFormation().getTitre(),
                note.getChapitre() == null ? null : note.getChapitre().getId(),
                note.getChapitre() == null ? null : note.getChapitre().getTitre(),
                note.getRessource() == null ? null : note.getRessource().getId(),
                note.getRessource() == null ? null : note.getRessource().getTitre(),
                note.getContenu(), note.isSignet(), note.getCreatedAt(), note.getUpdatedAt());
    }

    private WeeklyGoalResponse goalResponse(String email, WeeklyGoal goal) {
        ZoneId zone = ZoneId.of(goal.getFuseauHoraire());
        LocalDate monday = LocalDate.now(zone).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        Instant start = monday.atStartOfDay(zone).toInstant();
        Instant end = monday.plusWeeks(1).atStartOfDay(zone).toInstant();
        long minutes = activities.validatedMinutes(email, start, end);
        long count = activities.countByParticipantEmailAndOccurredAtBetween(email, start, end);
        int percentage = goal.getMinutesCible() == 0 ? 0
                : (int) Math.min(100, Math.round(minutes * 100.0 / goal.getMinutesCible()));
        int streak = regularWeeks(email, zone, monday, count > 0);
        String message = percentage >= 100
                ? "Objectif atteint : prenez le temps de consolider vos acquis."
                : count == 0 ? "Votre semaine commence quand vous êtes prêt."
                : "Chaque activité validée fait avancer votre parcours.";
        return new WeeklyGoalResponse(goal.getMinutesCible(), minutes, count, percentage, streak,
                start, end, message);
    }

    private int regularWeeks(String email, ZoneId zone, LocalDate currentMonday, boolean currentHasActivity) {
        int streak = 0;
        LocalDate cursor = currentHasActivity ? currentMonday : currentMonday.minusWeeks(1);
        for (int index = 0; index < 52; index++) {
            Instant start = cursor.atStartOfDay(zone).toInstant();
            Instant end = cursor.plusWeeks(1).atStartOfDay(zone).toInstant();
            if (!activities.existsByParticipantEmailAndOccurredAtBetween(email, start, end)) break;
            streak++;
            cursor = cursor.minusWeeks(1);
        }
        return streak;
    }

    private List<Recommendation> scoreRecommendations(
            List<Formation> candidates, Set<String> domains, NiveauFormation level,
            Set<String> learnedCategories, Set<String> favoriteCategories,
            Map<Long, Inscription> enrollmentByFormation, int limit) {
        return candidates.stream().filter(formation -> {
                    Inscription enrollment = enrollmentByFormation.get(formation.getId());
                    return enrollment == null || enrollment.getProgression().compareTo(new BigDecimal("100")) < 0;
                }).map(formation -> {
                    int score = 0;
                    List<String> reasons = new ArrayList<>();
                    String category = formation.getCategorie().toLowerCase(Locale.ROOT);
                    if (domains.stream().anyMatch(value -> category.contains(value) || value.contains(category))) {
                        score += 40;
                        reasons.add("Dans votre domaine préféré");
                    }
                    if (level != null && (formation.getNiveau() == level
                            || formation.getNiveau() == NiveauFormation.TOUS_NIVEAUX)) {
                        score += 25;
                        reasons.add("Correspond à votre niveau");
                    }
                    if (favoriteCategories.contains(category)) {
                        score += 20;
                        reasons.add("Proche de vos favoris");
                    }
                    if (learnedCategories.contains(category)
                            && !enrollmentByFormation.containsKey(formation.getId())) {
                        score += 15;
                        reasons.add("Suite logique de votre formation actuelle");
                    }
                    if (reasons.isEmpty()) reasons.add("Formation publiée à découvrir");
                    return new Recommendation(formation.getId(), formation.getTitre(),
                            formation.getCategorie(), formation.getNiveau(), formation.getPrix(), score, reasons);
                }).sorted(Comparator.comparingInt(Recommendation::score).reversed()
                        .thenComparing(Recommendation::titre)).limit(limit).toList();
    }

    private ReviewResponse reviewResponse(CourseReview review, String email) {
        return new ReviewResponse(review.getId(), review.getFormation().getId(),
                review.getParticipant().getNom(), review.getNote(), review.getCommentaire(),
                review.getStatut(), review.getReponseFormateur(), review.getCreatedAt(),
                review.getUpdatedAt(), email != null && review.getParticipant().getEmail().equalsIgnoreCase(email));
    }

    private NotificationResponse notificationResponse(UserNotification value) {
        return new NotificationResponse(value.getId(), value.getCategorie(), value.getTitre(),
                value.getMessage(), value.getActionUrl(), value.isLue(), value.getCreatedAt());
    }

    private void notifyUser(User user, NotificationCategory category, String title, String message, String actionUrl) {
        boolean enabled = notificationPreferences.findByUserEmailAndCategorie(user.getEmail(), category)
                .map(NotificationPreference::isDansApplication).orElse(true);
        if (!enabled) return;
        UserNotification notification = new UserNotification();
        notification.setUser(user);
        notification.setCategorie(category);
        notification.setTitre(title);
        notification.setMessage(message);
        notification.setActionUrl(actionUrl);
        notifications.save(notification);
    }

    private DashboardClass nextClassForParticipant(String email) {
        return membres.findByParticipantEmailAndStatut(email, "ACCEPTE").stream()
                .map(ClasseMembre::getClasse).flatMap(value -> value.getSeances().stream())
                .filter(value -> "PLANIFIEE".equals(value.getStatut()) && value.getDateDebut().isAfter(Instant.now()))
                .min(Comparator.comparing(SeanceVirtuelle::getDateDebut))
                .map(this::dashboardClass).orElse(null);
    }

    private DashboardClass nextClassForTrainer(String email) {
        return classes.findByFormationFormateurEmailOrderByDateDebutDesc(email).stream()
                .flatMap(value -> value.getSeances().stream())
                .filter(value -> "PLANIFIEE".equals(value.getStatut()) && value.getDateDebut().isAfter(Instant.now()))
                .min(Comparator.comparing(SeanceVirtuelle::getDateDebut))
                .map(this::dashboardClass).orElse(null);
    }

    private DashboardClass dashboardClass(SeanceVirtuelle session) {
        return new DashboardClass(session.getId(), session.getTitre(),
                session.getClasse().getFormation().getTitre(), session.getDateDebut(), session.getFuseauHoraire());
    }

    private Set<String> domains(String encoded) {
        if (encoded == null || encoded.isBlank()) return Set.of();
        return Arrays.stream(encoded.split("\\|")).map(String::trim).filter(value -> !value.isBlank())
                .map(value -> value.toLowerCase(Locale.ROOT))
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private Inscription activeEnrollment(String email, Long formationId) {
        Inscription enrollment = inscriptions.findByParticipantEmailAndFormationId(email, formationId)
                .orElseThrow(() -> error(HttpStatus.FORBIDDEN, "ENROLLMENT_REQUIRED",
                        "Une inscription active est requise."));
        if (!List.of(InscriptionStatut.ACTIVE, InscriptionStatut.CONFIRMEE).contains(enrollment.getStatut())) {
            throw error(HttpStatus.FORBIDDEN, "ENROLLMENT_INACTIVE", "Cette inscription n'est plus active.");
        }
        return enrollment;
    }

    private Participant participant(String email) {
        User account = user(email);
        if (account instanceof Participant participant) return participant;
        throw error(HttpStatus.FORBIDDEN, "PARTICIPANT_ONLY", "Cette action est réservée aux participants.");
    }

    private User user(String email) {
        return users.findByEmail(email).orElseThrow(() ->
                error(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentification requise."));
    }

    private Formation published(Long id) {
        return formations.findOneByIdAndStatut(id, FormationStatus.PUBLIEE).orElseThrow(this::notFound);
    }

    private int normalizeGoal(int minutes) {
        return List.of(30, 60, 120, 180).stream()
                .min(Comparator.comparingInt(value -> Math.abs(value - minutes))).orElse(60);
    }

    private void validateZone(String zone) {
        try {
            ZoneId.of(zone);
        } catch (DateTimeException exception) {
            throw error(HttpStatus.BAD_REQUEST, "INVALID_TIMEZONE", "Fuseau horaire invalide.");
        }
    }

    private double round(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    private BusinessException notFound() {
        return error(HttpStatus.NOT_FOUND, "ENGAGEMENT_RESOURCE_NOT_FOUND", "Ressource introuvable.");
    }

    private BusinessException error(HttpStatus status, String code, String message) {
        return new BusinessException(status, code, message);
    }
}
