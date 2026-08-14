package ma.elearning.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import ma.elearning.admin.AdminReviewModerationService;
import ma.elearning.engagement.*;
import ma.elearning.formation.*;
import ma.elearning.security.JwtService;
import ma.elearning.user.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties =
        "spring.datasource.url=jdbc:h2:mem:admin_review_controller;MODE=MySQL;DATABASE_TO_LOWER=TRUE")
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class AdminReviewModerationControllerIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JwtService jwt;
    @Autowired EngagementService engagement;
    @Autowired AdminReviewModerationService moderation;
    @Autowired UserRepository users;
    @Autowired FormationRepository formations;
    @Autowired CourseReviewRepository reviews;
    @Autowired ReviewReportRepository reports;
    private Fixture fixture;

    @BeforeEach
    void setup() {
        fixture = fixture();
    }

    @Test
    void dedicatedJsonContractProvidesContextAndExcludesPrivateData() throws Exception {
        String payload = mvc.perform(get("/api/admin/avis/signalements")
                        .header("Authorization", authorization(fixture.admin())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content[0].signalements").isArray())
                .andExpect(jsonPath("$.content[0].avis.note").isNumber())
                .andExpect(jsonPath("$.content[0].contexte.formationTitre").isString())
                .andReturn().getResponse().getContentAsString();
        JsonNode queue = json.readTree(payload);
        JsonNode primary = findCase(queue.get("content"), fixture.primaryReviewId());
        assertEquals(2, primary.path("signalements").size());
        assertEquals(500, primary.path("signalements").get(0).path("motif").asText().length());
        assertEquals(2000, primary.path("avis").path("commentaire").asText().length());
        assertEquals(2000, primary.path("avis").path("reponseFormateur").asText().length());
        assertEquals(fixture.author().getNom(), primary.path("contexte").path("auteurNom").asText());
        assertEquals(fixture.trainer().getNom(), primary.path("contexte").path("formateurNom").asText());

        String detailPayload = mvc.perform(get("/api/admin/avis/signalements/" + fixture.secondaryReportId())
                        .header("Authorization", authorization(fixture.admin())))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        JsonNode secondary = json.readTree(detailPayload);
        assertTrue(secondary.path("avis").has("reponseFormateur"));
        assertTrue(secondary.path("avis").get("reponseFormateur").isNull());
        assertTrue(secondary.has("decision"));
        assertTrue(secondary.get("decision").isNull());

        assertNoPrivateField(queue);
        for (String privateValue : List.of(fixture.author().getEmail(), fixture.author().getTelephone(),
                fixture.author().getPasswordHash(), fixture.reporter().getEmail())) {
            assertFalse(payload.contains(privateValue));
        }
    }

    @Test
    void endpointsEnforceRolesAndPendingResourceVisibility() throws Exception {
        mvc.perform(get("/api/admin/avis/signalements")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/avis/signalements")
                        .header("Authorization", authorization(fixture.reporter())))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/avis/signalements/999999")
                        .header("Authorization", authorization(fixture.admin())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("REVIEW_REPORT_NOT_FOUND"));
        mvc.perform(patch("/api/admin/avis/999999/republier")
                        .header("Authorization", authorization(fixture.admin())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("REVIEW_NOT_FOUND"));
    }

    @Test
    void republishingPersistsOneDecisionResolvesAllReportsAndRestoresPublicAggregates() throws Exception {
        CourseReview before = reviews.findById(fixture.primaryReviewId()).orElseThrow();
        int note = before.getNote();
        String comment = before.getCommentaire();
        String reply = before.getReponseFormateur();

        mvc.perform(patch("/api/admin/avis/" + fixture.primaryReviewId() + "/republier")
                        .header("Authorization", authorization(fixture.admin())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.decision").value("REPUBLIER"))
                .andExpect(jsonPath("$.signalementsResolus").value(2))
                .andExpect(jsonPath("$.adminId").value(fixture.admin().getId()));

        CourseReview after = reviews.findById(fixture.primaryReviewId()).orElseThrow();
        assertEquals(ReviewStatus.PUBLIE, after.getStatut());
        assertEquals(note, after.getNote());
        assertEquals(comment, after.getCommentaire());
        assertEquals(reply, after.getReponseFormateur());
        assertTrue(reports.findByReviewIdOrderByIdAsc(after.getId()).stream()
                .allMatch(value -> value.getStatutTraitement() == ReviewReportStatus.TRAITE_AVIS_REPUBLIE));
        assertEquals(1, engagement.publicReviews(fixture.primaryFormationId(), 0, 10, null).nombre());
        assertEquals(5.0, engagement.publicReviews(fixture.primaryFormationId(), 0, 10, null).moyenne());

        mvc.perform(patch("/api/admin/avis/" + fixture.primaryReviewId() + "/republier")
                        .header("Authorization", authorization(fixture.admin())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("REVIEW_ALREADY_MODERATED"));
        assertTrue(moderation.pending(0, 100).content().stream()
                .noneMatch(value -> value.avis().id().equals(fixture.primaryReviewId())));
    }

    @Test
    void paginationCountsReviewsAndNeverSplitsMoreThanFiftyReasons() throws Exception {
        CourseReview review = reviews.findById(fixture.primaryReviewId()).orElseThrow();
        for (int index = 0; index < 51; index++) {
            Participant reporter = save(new Participant(), Role.PARTICIPANT, "Signalant " + index,
                    "bulk-reporter-" + index + "-" + System.nanoTime());
            reports.saveAndFlush(report(review, reporter, "Motif groupé " + index));
        }

        String payload = mvc.perform(get("/api/admin/avis/signalements")
                        .param("page", "0").param("size", "1")
                        .header("Authorization", authorization(fixture.admin())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").isNumber())
                .andExpect(jsonPath("$.totalPages").isNumber())
                .andReturn().getResponse().getContentAsString();

        JsonNode firstResponse=json.readTree(payload);
        JsonNode primaryCase=null;
        for(int page=0;page<firstResponse.path("totalPages").asInt();page++){
            String pagePayload=page==0?payload:mvc.perform(get("/api/admin/avis/signalements")
                            .param("page",Integer.toString(page)).param("size","1")
                            .header("Authorization",authorization(fixture.admin())))
                    .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
            for(JsonNode candidate:json.readTree(pagePayload).path("content")){
                if(candidate.path("avis").path("id").asLong()==fixture.primaryReviewId())primaryCase=candidate;
            }
        }
        assertNotNull(primaryCase,"Le dossier contenant plus de 50 motifs doit rester paginable.");
        assertEquals(53,primaryCase.path("signalements").size());
    }

    @Test
    void confirmedMaskingKeepsOwnerAndTrainerHistoryButRemovesEveryPublicEffect() throws Exception {
        mvc.perform(patch("/api/admin/avis/" + fixture.primaryReviewId() + "/masquer")
                        .header("Authorization", authorization(fixture.admin())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.decision").value("MASQUER"))
                .andExpect(jsonPath("$.signalementsResolus").value(2));

        var anonymous = engagement.publicReviews(fixture.primaryFormationId(), 0, 10, null);
        assertEquals(0, anonymous.nombre());
        assertTrue(anonymous.content().isEmpty());
        var owner = engagement.publicReviews(fixture.primaryFormationId(), 0, 10, fixture.author().getEmail());
        assertEquals(0, owner.nombre());
        assertEquals(1, owner.content().size());
        assertTrue(owner.content().getFirst().proprietaire());
        assertEquals(ReviewStatus.MASQUE, owner.content().getFirst().statut());
        assertEquals(2000, owner.content().getFirst().reponseFormateur().length());
        var trainerView = engagement.trainerEngagement(fixture.trainer().getEmail());
        assertEquals(0, trainerView.avisPublies());
        assertEquals(0.0, trainerView.moyenneAvis());
        assertTrue(trainerView.avis().stream().anyMatch(value ->
                value.id().equals(fixture.primaryReviewId()) && value.reponseFormateur() != null));
        assertEquals(0.0, engagement.instructor(fixture.trainer().getId()).moyenneAvis());
    }

    private Fixture fixture() {
        long suffix = System.nanoTime();
        Admin admin = save(new Admin(), Role.ADMIN, "Admin public", "admin-" + suffix);
        Formateur trainer = save(new Formateur(), Role.FORMATEUR, "Formateur public", "trainer-" + suffix);
        Participant author = save(new Participant(), Role.PARTICIPANT,
                "Auteur " + "très-long-".repeat(10), "author-" + suffix);
        Participant reporter = save(new Participant(), Role.PARTICIPANT, "Signalant public", "reporter-" + suffix);
        Participant secondReporter = save(new Participant(), Role.PARTICIPANT,
                "Second signalant", "reporter-two-" + suffix);
        Participant secondAuthor = save(new Participant(), Role.PARTICIPANT,
                "Auteur sans réponse", "author-two-" + suffix);

        Formation primaryFormation = formation(trainer, "Formation " + "au-titre-très-long-".repeat(8));
        CourseReview primary = review(primaryFormation, author, 5, "C".repeat(2000), "R".repeat(2000));
        ReviewReport primaryReport = report(primary, reporter, "M".repeat(500));
        reports.saveAndFlush(primaryReport);
        reports.saveAndFlush(report(primary, secondReporter, "Second motif associé au même avis"));

        Formation secondaryFormation = formation(trainer, "Formation sans réponse");
        CourseReview secondary = review(secondaryFormation, secondAuthor, 3,
                "Commentaire sans réponse formateur", null);
        ReviewReport secondaryReport = reports.saveAndFlush(report(secondary, reporter, "Contexte à contrôler"));
        return new Fixture(admin, trainer, author, reporter, primaryFormation.getId(), primary.getId(),
                primaryReport.getId(), secondaryReport.getId());
    }

    private Formation formation(Formateur trainer, String title) {
        Formation formation = new Formation();
        formation.setFormateur(trainer);
        formation.setTitre(title.substring(0, Math.min(180, title.length())));
        formation.setDescription("Description publique");
        formation.setLangue("fr");
        formation.setNiveau(NiveauFormation.DEBUTANT);
        formation.setCategorie("Modération");
        formation.setPrix(BigDecimal.TEN);
        formation.setStatut(FormationStatus.PUBLIEE);
        return formations.saveAndFlush(formation);
    }

    private CourseReview review(Formation formation, Participant author, int note,
                                String comment, String reply) {
        CourseReview review = new CourseReview();
        review.setFormation(formation);
        review.setParticipant(author);
        review.setNote(note);
        review.setCommentaire(comment);
        if (reply != null) review.setReponseFormateur(reply);
        review.setStatut(ReviewStatus.SIGNALE);
        return reviews.saveAndFlush(review);
    }

    private ReviewReport report(CourseReview review, Participant reporter, String reason) {
        ReviewReport report = new ReviewReport();
        report.setReview(review);
        report.setParticipant(reporter);
        report.setMotif(reason);
        return report;
    }

    @SuppressWarnings("unchecked")
    private <T extends User> T save(T user, Role role, String name, String emailPrefix) {
        user.setNom(name.substring(0, Math.min(120, name.length())));
        user.setEmail(emailPrefix + "@private.test");
        user.setTelephone("+212600000000");
        user.setPasswordHash("private-password-hash-" + emailPrefix);
        user.setRole(role);
        user.setStatut(AccountStatus.ACTIF);
        return (T) users.saveAndFlush(user);
    }

    private String authorization(User user) {
        return "Bearer " + jwt.generate(user);
    }

    private JsonNode findCase(JsonNode casesNode, Long reviewId) {
        for (JsonNode moderationCase : casesNode) {
            if (moderationCase.path("avis").path("id").asLong() == reviewId) return moderationCase;
        }
        return fail("Avis absent du contrat JSON: " + reviewId);
    }

    private void assertNoPrivateField(JsonNode node) {
        Set<String> forbidden = Set.of("email", "telephone", "password", "passwordHash", "token",
                "adresse", "notesPrivees", "estCorrecte", "participant", "signalant");
        if (node.isObject()) {
            node.fields().forEachRemaining(entry -> {
                assertFalse(forbidden.contains(entry.getKey()),
                        () -> "Champ privé exposé: " + entry.getKey());
                assertNoPrivateField(entry.getValue());
            });
        } else if (node.isArray()) {
            node.forEach(this::assertNoPrivateField);
        }
    }

    private record Fixture(Admin admin, Formateur trainer, Participant author, Participant reporter,
                           Long primaryFormationId, Long primaryReviewId,
                           Long primaryReportId, Long secondaryReportId) {}
}
