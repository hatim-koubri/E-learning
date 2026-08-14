package ma.elearning.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import ma.elearning.api.EngagementDtos.*;
import ma.elearning.api.FormationDtos.*;
import ma.elearning.admin.AdminReviewModerationService;
import ma.elearning.common.BusinessException;
import ma.elearning.engagement.*;
import ma.elearning.formation.*;
import ma.elearning.learning.LearningService;
import ma.elearning.security.JwtService;
import ma.elearning.storage.ObjectStorage;
import ma.elearning.user.*;
import ma.elearning.virtualclass.SeanceVirtuelleRepository;
import ma.elearning.virtualclass.VirtualClassService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties =
        "spring.datasource.url=jdbc:h2:mem:sprint5_integration;MODE=MySQL;DATABASE_TO_LOWER=TRUE")
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class Sprint5IntegrationTest {
    private static final AtomicInteger SEQUENCE = new AtomicInteger();

    @Autowired EngagementService engagement;
    @Autowired AdminReviewModerationService moderation;
    @Autowired FormationService formationService;
    @Autowired LearningService learningService;
    @Autowired VirtualClassService virtualClasses;
    @Autowired SeanceVirtuelleRepository sessions;
    @Autowired UserRepository users;
    @Autowired ParticipantPreferenceRepository preferences;
    @Autowired FavoriteRepository favorites;
    @Autowired LearningActivityRepository activities;
    @Autowired PrivateNoteRepository notes;
    @Autowired ReviewReportRepository reviewReports;
    @Autowired ma.elearning.learning.InscriptionRepository inscriptions;
    @Autowired JwtService jwt;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @MockitoBean ObjectStorage storage;

    Formateur trainer;
    Participant participant;
    Participant outsider;
    Admin admin;
    Long formationId;
    Long firstModule;
    Long firstChapter;
    Long secondChapter;
    Long resourceId;

    @BeforeEach
    void setup() {
        int suffix = SEQUENCE.incrementAndGet();
        trainer = save(new Formateur(), "trainer-s5-" + suffix + "@test.local", Role.FORMATEUR);
        participant = save(new Participant(), "participant-s5-" + suffix + "@test.local", Role.PARTICIPANT);
        outsider = save(new Participant(), "outsider-s5-" + suffix + "@test.local", Role.PARTICIPANT);
        admin = save(new Admin(), "admin-s5-" + suffix + "@test.local", Role.ADMIN);

        formationId = formationService.create(trainer.getEmail(), new FormationRequest(
                "Java moderne " + suffix, "Parcours publié et vérifiable", "fr",
                NiveauFormation.DEBUTANT, "Java", new BigDecimal("90.00"))).id();
        firstModule = formationService.addModule(trainer.getEmail(), formationId,
                new ModuleRequest("Fondations", "Première étape", true)).id();
        firstChapter = formationService.addChapitre(trainer.getEmail(), firstModule,
                new ChapitreRequest("Comprendre Java", "Notions essentielles")).id();
        resourceId = formationService.addYoutube(trainer.getEmail(), firstChapter,
                new YoutubeRequest("Cours d'introduction", "https://youtu.be/intro-java")).id();
        Long secondModule = formationService.addModule(trainer.getEmail(), formationId,
                new ModuleRequest("Pratique", "Deuxième étape", false)).id();
        secondChapter = formationService.addChapitre(trainer.getEmail(), secondModule,
                new ChapitreRequest("Mettre en pratique", "Exercices")).id();
        formationService.addYoutube(trainer.getEmail(), secondChapter,
                new YoutubeRequest("Exercice guidé", "https://youtu.be/pratique-java"));
        formationService.changeStatus(trainer.getEmail(), formationId, FormationStatus.PUBLIEE);
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void preferencesWeeklyGoalAndMeaningfulActivityAreStoredAndIdempotent() {
        PreferenceResponse defaults = engagement.preferences(participant.getEmail());
        assertFalse(defaults.onboardingTermine());
        assertEquals("Africa/Casablanca", defaults.fuseauHoraire());

        PreferenceResponse saved = engagement.savePreferences(participant.getEmail(), new PreferenceRequest(
                List.of("Java", "Architecture"), NiveauFormation.DEBUTANT,
                "Devenir développeur backend", 120, PreferenceFormat.PRATIQUE,
                true, "Africa/Casablanca"));
        assertTrue(saved.onboardingTermine());
        assertEquals(120, engagement.goal(participant.getEmail()).minutesCible());

        engagement.recordActivity(participant.getEmail(), formationId,
                ActivityType.RESSOURCE_CONSULTEE, "resource:test", 7);
        engagement.recordActivity(participant.getEmail(), formationId,
                ActivityType.RESSOURCE_CONSULTEE, "resource:test", 7);
        WeeklyGoalResponse goal = engagement.goal(participant.getEmail());
        assertEquals(7, goal.minutesValidees());
        assertEquals(1, goal.activitesValidees());
        assertTrue(goal.pourcentage() > 0);

        BusinessException invalidZone = assertThrows(BusinessException.class, () ->
                engagement.updateGoal(participant.getEmail(),
                        new WeeklyGoalRequest(60, "Fuseau/Inexistant")));
        assertEquals("INVALID_TIMEZONE", invalidZone.getCode());

        PreferenceResponse skipped = engagement.skipOnboarding(outsider.getEmail());
        assertTrue(skipped.onboardingIgnore());
        assertFalse(skipped.onboardingTermine());
    }

    @Test
    void favoritesRecommendationsAndPublicOrientationUseOnlyRealPublishedCourses() {
        engagement.savePreferences(participant.getEmail(), new PreferenceRequest(
                List.of("java"), NiveauFormation.DEBUTANT, "Renforcer le backend",
                60, PreferenceFormat.LECTURE, false, "UTC"));

        FavoriteResponse first = engagement.addFavorite(participant.getEmail(), formationId);
        FavoriteResponse duplicate = engagement.addFavorite(participant.getEmail(), formationId);
        assertEquals(first.id(), duplicate.id());
        assertEquals(1, engagement.favorites(participant.getEmail()).stream()
                .filter(item -> item.formationId().equals(formationId)).count());

        List<Recommendation> recommendations = engagement.recommendations(participant.getEmail());
        Recommendation recommendation = recommendations.stream()
                .filter(item -> item.formationId().equals(formationId)).findFirst().orElseThrow();
        assertTrue(recommendation.score() >= 65);
        assertTrue(recommendation.raisons().contains("Dans votre domaine préféré"));

        List<Recommendation> orientation = engagement.orientation(new OrientationRequest(
                "Développer une API", NiveauFormation.DEBUTANT, "Java",
                120, PreferenceFormat.PRATIQUE));
        assertTrue(orientation.stream().anyMatch(item -> item.formationId().equals(formationId)));

        formationService.changeStatus(trainer.getEmail(), formationId, FormationStatus.DEPUBLIEE);
        assertTrue(engagement.orientation(new OrientationRequest(
                "Développer une API", NiveauFormation.DEBUTANT, "Java",
                120, PreferenceFormat.PRATIQUE)).stream()
                .noneMatch(item -> item.formationId().equals(formationId)));

        engagement.removeFavorite(participant.getEmail(), formationId);
        assertTrue(engagement.favorites(participant.getEmail()).stream()
                .noneMatch(item -> item.formationId().equals(formationId)));
    }

    @Test
    void recommendationsReturnPublishedCoursesForACompletelyNewParticipant() throws Exception {
        assertTrue(preferences.findByParticipantEmail(outsider.getEmail()).isEmpty());
        assertTrue(favorites.findByParticipantEmailOrderByCreatedAtDesc(outsider.getEmail()).isEmpty());
        assertTrue(inscriptions.findByParticipantEmailOrderByDateInscriptionDesc(outsider.getEmail()).isEmpty());
        assertTrue(activities.findTop10ByParticipantEmailOrderByOccurredAtDesc(outsider.getEmail()).isEmpty());

        mvc.perform(get("/api/participant/recommandations")
                        .header("Authorization", "Bearer " + jwt.generate(outsider)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].formationId").isNumber())
                .andExpect(jsonPath("$[0].score").value(0))
                .andExpect(jsonPath("$[0].raisons[0]").value("Formation publiée à découvrir"));
    }

    @Test
    void resumePrivateNotesAndJourneyEnforceEnrollmentOwnershipAndPrerequisites() {
        learningService.enroll(participant.getEmail(), formationId);
        ResumeResponse position = engagement.recordPosition(participant.getEmail(), formationId,
                new LearningPositionRequest(firstModule, firstChapter, resourceId));
        assertEquals(resourceId, position.ressourceId());
        assertEquals("/apprentissage/" + formationId + "?ressource=" + resourceId, position.href());
        assertEquals(firstChapter, engagement.resume(participant.getEmail()).chapitreId());

        PrivateNoteResponse note = engagement.createNote(participant.getEmail(), formationId,
                new PrivateNoteRequest(firstChapter, resourceId, "Résumé strictement privé", true));
        assertEquals("Résumé strictement privé", note.contenu());
        BusinessException foreignUpdate = assertThrows(BusinessException.class, () ->
                engagement.updateNote(outsider.getEmail(), note.id(),
                        new PrivateNoteRequest(firstChapter, null, "Tentative étrangère", false)));
        assertEquals("ENGAGEMENT_RESOURCE_NOT_FOUND", foreignUpdate.getCode());
        assertTrue(engagement.notes(outsider.getEmail(), null).isEmpty());

        LearningJourney initial = engagement.journey(participant.getEmail(), formationId);
        assertEquals("DISPONIBLE", initial.modules().getFirst().chapitres().getFirst().etat());
        assertEquals("VERROUILLE", initial.modules().get(1).chapitres().getFirst().etat());

        learningService.progress(participant.getEmail(), formationId, firstChapter, true, 35);
        LearningJourney progressed = engagement.journey(participant.getEmail(), formationId);
        assertEquals("TERMINE", progressed.modules().getFirst().chapitres().getFirst().etat());
        assertEquals("DISPONIBLE", progressed.modules().get(1).chapitres().getFirst().etat());
        assertEquals(50, progressed.progression());

        DashboardResponse dashboard = engagement.dashboard(participant.getEmail());
        assertNotNull(dashboard.reprise());
        assertEquals(50, dashboard.progressionGlobale());
        assertFalse(dashboard.activiteRecente().isEmpty());

        engagement.deleteNote(participant.getEmail(), note.id());
        assertTrue(engagement.notes(participant.getEmail(), formationId).isEmpty());
    }

    @Test
    void bookmarksAreIdempotentPerExactTargetWhileFreeNotesRemainMultiple() throws Exception {
        learningService.enroll(participant.getEmail(), formationId);
        PrivateNoteRequest free = new PrivateNoteRequest(firstChapter, resourceId, "Note libre", false);
        PrivateNoteResponse firstFree = engagement.createNote(participant.getEmail(), formationId, free);
        PrivateNoteResponse secondFree = engagement.createNote(participant.getEmail(), formationId, free);
        assertNotEquals(firstFree.id(), secondFree.id());

        PrivateNoteRequest bookmark = new PrivateNoteRequest(firstChapter, resourceId, null, true);
        PrivateNoteResponse firstBookmark = engagement.createNote(participant.getEmail(), formationId, bookmark);
        PrivateNoteResponse repeatedBookmark = engagement.createNote(participant.getEmail(), formationId, bookmark);
        assertEquals(firstBookmark.id(), repeatedBookmark.id());

        var ready = new CountDownLatch(2);
        var start = new CountDownLatch(1);
        var executor = Executors.newFixedThreadPool(2);
        try {
            var calls = List.of(
                    executor.submit(() -> { ready.countDown(); start.await(); return engagement.createNote(participant.getEmail(), formationId, bookmark).id(); }),
                    executor.submit(() -> { ready.countDown(); start.await(); return engagement.createNote(participant.getEmail(), formationId, bookmark).id(); })
            );
            ready.await();
            start.countDown();
            assertEquals(firstBookmark.id(), calls.get(0).get());
            assertEquals(firstBookmark.id(), calls.get(1).get());
        } finally {
            executor.shutdownNow();
        }

        List<PrivateNote> stored = notes.findByParticipantEmailAndFormationIdOrderByUpdatedAtDesc(
                participant.getEmail(), formationId);
        assertEquals(3, stored.size());
        assertEquals(1, stored.stream().filter(PrivateNote::isSignet)
                .filter(note -> note.getRessource().getId().equals(resourceId)).count());
        assertTrue(engagement.notes(outsider.getEmail(), formationId).isEmpty());
    }

    @Test
    void reviewsRequireProgressSupportRealAveragesRepliesReportsAndModeration() {
        learningService.enroll(participant.getEmail(), formationId);
        BusinessException threshold = assertThrows(BusinessException.class, () ->
                engagement.createReview(participant.getEmail(), formationId,
                        new ReviewRequest(4, "Un contenu utile et structuré.")));
        assertEquals("REVIEW_PROGRESS_REQUIRED", threshold.getCode());

        learningService.progress(participant.getEmail(), formationId, firstChapter, true, 0);
        ReviewResponse review = engagement.createReview(participant.getEmail(), formationId,
                new ReviewRequest(4, "Un contenu utile et structuré."));
        assertEquals(4.0, engagement.publicReviews(formationId, 0, 10, participant.getEmail()).moyenne());
        assertTrue(review.proprietaire());

        BusinessException duplicate = assertThrows(BusinessException.class, () ->
                engagement.createReview(participant.getEmail(), formationId,
                        new ReviewRequest(5, "Un second avis ne doit pas passer.")));
        assertEquals("REVIEW_ALREADY_EXISTS", duplicate.getCode());

        engagement.updateReview(participant.getEmail(), review.id(),
                new ReviewRequest(5, "Un contenu excellent après relecture."));
        assertEquals(5.0, engagement.publicReviews(formationId, 0, 10, null).moyenne());

        engagement.replyToReview(trainer.getEmail(), review.id(),
                new ReviewReplyRequest("Merci pour ce retour pédagogique."));
        NotificationPage participantNotifications =
                engagement.notifications(participant.getEmail(), 0, 20);
        assertTrue(participantNotifications.content().stream()
                .anyMatch(item -> item.categorie() == NotificationCategory.REPONSE_FORMATEUR));

        engagement.reportReview(outsider.getEmail(), review.id(),
                new ReviewReportRequest("Vérification de modération demandée"));
        assertEquals(ReviewStatus.SIGNALE,
                engagement.trainerEngagement(trainer.getEmail()).avis().getFirst().statut());
        assertFalse(moderation.pending(0, 20).content().isEmpty());
        ReviewSummary ownerView = engagement.publicReviews(
                formationId, 0, 10, participant.getEmail());
        assertEquals(0, ownerView.nombre());
        assertTrue(ownerView.content().getFirst().proprietaire());
        assertEquals(ReviewStatus.SIGNALE, ownerView.content().getFirst().statut());

        authenticate(admin);
        moderation.hide(review.id());
        assertEquals(0, engagement.publicReviews(formationId, 0, 10, null).nombre());
        BusinessException secondDecision = assertThrows(BusinessException.class,
                () -> moderation.republish(review.id()));
        assertEquals("REVIEW_ALREADY_MODERATED", secondDecision.getCode());

        BusinessException protectedHistory = assertThrows(BusinessException.class,
                () -> engagement.deleteReview(participant.getEmail(), review.id()));
        assertEquals("REVIEW_HAS_MODERATION_HISTORY", protectedHistory.getCode());
        assertEquals(ReviewReportStatus.TRAITE_AVIS_MASQUE,
                reviewReports.findByReviewIdOrderByIdAsc(review.id()).getFirst().getStatutTraitement());
    }

    @Test
    void trainerEngagementWithoutCoursesReturnsAnEmptyPayload() {
        Formateur emptyTrainer = save(new Formateur(),
                "empty-trainer-service-" + trainer.getId() + "@test.local", Role.FORMATEUR);

        TrainerEngagement result = engagement.trainerEngagement(emptyTrainer.getEmail());

        assertEquals(0, result.inscriptions());
        assertEquals(0, result.avisPublies());
        assertEquals(0, result.moyenneAvis());
        assertTrue(result.avis().isEmpty());
    }

    @Test
    void trainerEngagementEndpointReturnsOkForATrainerWithoutData() throws Exception {
        Formateur emptyTrainer = save(new Formateur(),
                "empty-trainer-http-" + trainer.getId() + "@test.local", Role.FORMATEUR);
        String token = jwt.generate(emptyTrainer);

        mvc.perform(get("/api/formateur/engagement")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.inscriptions").value(0))
                .andExpect(jsonPath("$.avisPublies").value(0))
                .andExpect(jsonPath("$.moyenneAvis").value(0))
                .andExpect(jsonPath("$.avis").isEmpty());
    }

    @Test
    void notificationsProfilesAndRoleProtectionsAreExposedThroughSecuredEndpoints() throws Exception {
        InstructorProfile updated = engagement.updateInstructor(trainer.getEmail(),
                new InstructorProfileRequest("Architecture Java", "Formatrice backend et qualité logicielle."));
        assertEquals("Architecture Java", updated.specialite());
        assertEquals(formationId, engagement.instructor(trainer.getId()).formations().getFirst().id());

        engagement.sendNotification(participant.getEmail(), NotificationCategory.QUIZ,
                "Quiz disponible", "Un quiz publié est disponible.", "/profile");
        NotificationPage notificationPage = engagement.notifications(participant.getEmail(), 0, 20);
        assertEquals(1, notificationPage.nonLues());
        engagement.markRead(participant.getEmail(), notificationPage.content().getFirst().id());
        assertEquals(0, engagement.notifications(participant.getEmail(), 0, 20).nonLues());

        engagement.updateNotificationPreference(participant.getEmail(),
                new NotificationPreferenceRequest(NotificationCategory.QUIZ, false, false));
        engagement.sendNotification(participant.getEmail(), NotificationCategory.QUIZ,
                "Ne doit pas être créée", "Préférence désactivée.", "/profile");
        assertEquals(1, engagement.notifications(participant.getEmail(), 0, 20).content().size());
        assertEquals(4,
                engagement.notificationPreferences(participant.getEmail()).size());
        engagement.markAllRead(participant.getEmail());

        String participantToken = jwt.generate(participant);
        String trainerToken = jwt.generate(trainer);
        String adminToken = jwt.generate(admin);

        mvc.perform(get("/api/participant/preferences"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/participant/preferences")
                        .header("Authorization", "Bearer " + trainerToken))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/participant/preferences")
                        .header("Authorization", "Bearer " + participantToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.onboardingTermine").value(false));
        mvc.perform(get("/api/formateur/engagement")
                        .header("Authorization", "Bearer " + participantToken))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/avis/signalements")
                        .header("Authorization", "Bearer " + participantToken))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/avis/signalements")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        mvc.perform(post("/api/orientation/recommandations")
                        .contentType("application/json")
                        .content(json.writeValueAsString(new OrientationRequest(
                                "Apprendre Java", NiveauFormation.DEBUTANT, "Java",
                                60, PreferenceFormat.PRATIQUE))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].formationId").isNumber());
        mvc.perform(get("/api/formateurs/" + trainer.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.specialite").value("Architecture Java"))
                .andExpect(jsonPath("$.email").doesNotExist());
    }

    @Test
    void publicInstructorContractNeverLeaksPrivateClassData() throws Exception {
        engagement.updateInstructor(trainer.getEmail(),
                new InstructorProfileRequest("Architecture Java", "Biographie publique autorisée."));
        participant.setNom("Participant privé Alpha");
        users.saveAndFlush(participant);

        Long classFormationId = formationService.create(trainer.getEmail(), new FormationRequest(
                "Formation avec classe privée", "Formation publiée sans exposition du groupe", "fr",
                NiveauFormation.INTERMEDIAIRE, "Java", new BigDecimal("120.00"),
                new BigDecimal("30.00"), false)).id();
        Long moduleId = formationService.addModule(trainer.getEmail(), classFormationId,
                new ModuleRequest("Programme privé", null, false)).id();
        Long privateChapterId = formationService.addChapitre(trainer.getEmail(), moduleId,
                new ChapitreRequest("Chapitre privé", null)).id();
        formationService.addYoutube(trainer.getEmail(), privateChapterId,
                new YoutubeRequest("Ressource privée", "https://youtu.be/private-class-course"));
        formationService.changeStatus(trainer.getEmail(), classFormationId, FormationStatus.PUBLIEE);

        var privateClass = virtualClasses.create(trainer.getEmail(), new VirtualClassDtos.ClasseRequest(
                classFormationId, "Groupe privé Alpha", "Description réservée aux membres", 12,
                LocalDate.now(), LocalDate.now().plusDays(30)));
        learningService.enrollComplete(participant.getEmail(), classFormationId,
                "public-profile-private-class-" + privateClass.id());
        virtualClasses.addMember(trainer.getEmail(), privateClass.id(), participant.getId());
        Instant privateStart = Instant.now().plusSeconds(3600);
        var privateSession = virtualClasses.schedule(trainer.getEmail(), privateClass.id(),
                new VirtualClassDtos.SessionRequest("Séance confidentielle Alpha", privateStart,
                        privateStart.plusSeconds(3600), "Africa/Casablanca"));
        String privateRoom = sessions.findById(privateSession.id()).orElseThrow().getIdentifiantSalle();

        String publicJson = mvc.perform(get("/api/formateurs/" + trainer.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nom").value(trainer.getNom()))
                .andExpect(jsonPath("$.specialite").value("Architecture Java"))
                .andExpect(jsonPath("$.formations[*].id").value(
                        org.hamcrest.Matchers.hasItem(classFormationId.intValue())))
                .andReturn().getResponse().getContentAsString();

        assertPublicProfileHasNoPrivateClassData(json.readTree(publicJson), Set.of(
                "Groupe privé Alpha", "Description réservée aux membres",
                "Séance confidentielle Alpha", privateStart.toString(), privateRoom,
                participant.getNom(), participant.getEmail()));

        var trainerPrivateClass = virtualClasses.trainerClasses(trainer.getEmail()).stream()
                .filter(value -> value.id().equals(privateClass.id())).findFirst().orElseThrow();
        assertEquals("Séance confidentielle Alpha", trainerPrivateClass.seances().getFirst().titre());
        assertEquals(participant.getEmail(), trainerPrivateClass.membres().getFirst().email());
        assertEquals("Séance confidentielle Alpha",
                virtualClasses.mine(participant.getEmail()).getFirst().seances().getFirst().titre());

        Formateur otherActiveTrainer = save(new Formateur(),
                "public-other-" + SEQUENCE.incrementAndGet() + "@test.local", Role.FORMATEUR);
        mvc.perform(get("/api/formateurs/" + otherActiveTrainer.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.formations").isEmpty());

        Formateur pendingTrainer = new Formateur();
        pendingTrainer.setNom("Formateur en attente privé");
        pendingTrainer.setEmail("public-pending-" + SEQUENCE.incrementAndGet() + "@test.local");
        pendingTrainer.setPasswordHash("hash");
        pendingTrainer.setRole(Role.FORMATEUR);
        pendingTrainer.setStatut(AccountStatus.EN_ATTENTE);
        pendingTrainer = users.saveAndFlush(pendingTrainer);
        mvc.perform(get("/api/formateurs/" + pendingTrainer.getId()))
                .andExpect(status().isNotFound());
    }

    private void assertPublicProfileHasNoPrivateClassData(JsonNode node, Set<String> privateValues) {
        Set<String> forbiddenFields = Set.of(
                "prochaineClasse", "classe", "classes", "seance", "seances",
                "membres", "roomName", "baseUrl", "joinUrl", "identifiantSalle",
                "email", "telephone");
        if (node.isObject()) {
            node.fields().forEachRemaining(entry -> {
                assertFalse(forbiddenFields.contains(entry.getKey()),
                        () -> "Champ privé exposé dans le profil public : " + entry.getKey());
                assertPublicProfileHasNoPrivateClassData(entry.getValue(), privateValues);
            });
        } else if (node.isArray()) {
            node.forEach(child -> assertPublicProfileHasNoPrivateClassData(child, privateValues));
        } else if (node.isTextual()) {
            privateValues.forEach(value -> assertFalse(node.textValue().contains(value),
                    () -> "Valeur privée exposée dans le profil public : " + value));
        }
    }

    @SuppressWarnings("unchecked")
    private <T extends User> T save(T user, String email, Role role) {
        user.setNom(role.name() + " Sprint 5");
        user.setEmail(email);
        user.setPasswordHash("hash");
        user.setRole(role);
        user.setStatut(AccountStatus.ACTIF);
        return (T) users.saveAndFlush(user);
    }

    private void authenticate(Admin actor) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                actor.getEmail(), null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
    }
}
