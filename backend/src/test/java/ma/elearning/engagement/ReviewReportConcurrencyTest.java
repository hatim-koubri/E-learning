package ma.elearning.engagement;

import com.fasterxml.jackson.databind.ObjectMapper;
import ma.elearning.api.EngagementDtos.ReviewReportRequest;
import ma.elearning.common.BusinessException;
import ma.elearning.formation.*;
import ma.elearning.security.JwtService;
import ma.elearning.user.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties =
        "spring.datasource.url=jdbc:h2:mem:review_report_concurrency;MODE=MySQL;DATABASE_TO_LOWER=TRUE")
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class ReviewReportConcurrencyTest {
    @Autowired EngagementService engagement;
    @Autowired ReviewReportRepository reports;
    @Autowired CourseReviewRepository reviews;
    @Autowired FormationRepository formations;
    @Autowired UserRepository users;
    @Autowired JwtService jwt;
    @Autowired ObjectMapper json;
    @Autowired MockMvc mvc;
    private ExecutorService executor;
    private Fixture fixture;

    @BeforeEach
    void setup() {
        executor = Executors.newFixedThreadPool(2);
        fixture = fixture();
    }

    @AfterEach
    void cleanup() {
        executor.shutdownNow();
    }

    @Test
    void sequentialDuplicateIsAnExplicitConflictAndCreatesOneReport() throws Exception {
        String body = json.writeValueAsString(new ReviewReportRequest("Motif de contrôle suffisamment clair"));
        String authorization = "Bearer " + jwt.generate(fixture.reporter());

        mvc.perform(post("/api/participant/avis/" + fixture.review().getId() + "/signalement")
                        .header("Authorization", authorization).contentType("application/json").content(body))
                .andExpect(status().isNoContent());
        mvc.perform(post("/api/participant/avis/" + fixture.review().getId() + "/signalement")
                        .header("Authorization", authorization).contentType("application/json").content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("REVIEW_ALREADY_REPORTED"));

        assertEquals(1, reports.findByReviewIdOrderByIdAsc(fixture.review().getId()).size());
        assertEquals(ReviewStatus.SIGNALE, reviews.findById(fixture.review().getId()).orElseThrow().getStatut());
    }

    @Test
    void concurrentDuplicateCreatesExactlyOneReportAndNeverLeaksASqlFailure() throws Exception {
        CountDownLatch start = new CountDownLatch(1);
        Callable<String> action = () -> {
            start.await(5, TimeUnit.SECONDS);
            try {
                engagement.reportReview(fixture.reporter().getEmail(), fixture.review().getId(),
                        new ReviewReportRequest("Signalement concurrent contrôlé"));
                return "SUCCESS";
            } catch (BusinessException failure) {
                return failure.getCode();
            }
        };
        Future<String> first = executor.submit(action);
        Future<String> second = executor.submit(action);
        start.countDown();

        List<String> outcomes = List.of(first.get(10, TimeUnit.SECONDS), second.get(10, TimeUnit.SECONDS));
        assertEquals(1, outcomes.stream().filter("SUCCESS"::equals).count());
        assertEquals(1, outcomes.stream().filter("REVIEW_ALREADY_REPORTED"::equals).count());
        assertEquals(1, reports.findByReviewIdOrderByIdAsc(fixture.review().getId()).size());
    }

    @Test
    void ownReviewInactiveReporterHiddenReviewAndMissingReviewAreControlled() {
        BusinessException own = assertThrows(BusinessException.class, () -> engagement.reportReview(
                fixture.author().getEmail(), fixture.review().getId(), new ReviewReportRequest("Mon propre avis")));
        assertEquals("OWN_REVIEW_REPORT", own.getCode());

        fixture.inactiveReporter().setStatut(AccountStatus.SUSPENDU);
        users.saveAndFlush(fixture.inactiveReporter());
        BusinessException inactive = assertThrows(BusinessException.class, () -> engagement.reportReview(
                fixture.inactiveReporter().getEmail(), fixture.review().getId(),
                new ReviewReportRequest("Compte inactif")));
        assertEquals("PARTICIPANT_INACTIVE", inactive.getCode());

        fixture.review().setStatut(ReviewStatus.MASQUE);
        reviews.saveAndFlush(fixture.review());
        BusinessException hidden = assertThrows(BusinessException.class, () -> engagement.reportReview(
                fixture.reporter().getEmail(), fixture.review().getId(), new ReviewReportRequest("Avis masqué")));
        assertEquals("ENGAGEMENT_RESOURCE_NOT_FOUND", hidden.getCode());
        BusinessException missing = assertThrows(BusinessException.class, () -> engagement.reportReview(
                fixture.reporter().getEmail(), 999999L, new ReviewReportRequest("Avis absent")));
        assertEquals("ENGAGEMENT_RESOURCE_NOT_FOUND", missing.getCode());
    }

    @Test
    void anotherActiveParticipantCanReportWithoutAnEnrollmentUnderTheExistingPublicReviewContract() {
        engagement.reportReview(fixture.reporter().getEmail(), fixture.review().getId(),
                new ReviewReportRequest("Avis public à faire vérifier"));

        assertEquals(1, reports.findByReviewIdOrderByIdAsc(fixture.review().getId()).size());
        assertEquals(ReviewStatus.SIGNALE, reviews.findById(fixture.review().getId()).orElseThrow().getStatut());
    }

    private Fixture fixture() {
        Formateur trainer = save(new Formateur(), Role.FORMATEUR, "trainer");
        Participant author = save(new Participant(), Role.PARTICIPANT, "author");
        Participant reporter = save(new Participant(), Role.PARTICIPANT, "reporter");
        Participant inactive = save(new Participant(), Role.PARTICIPANT, "inactive");
        Formation formation = new Formation();
        formation.setFormateur(trainer);
        formation.setTitre("Formation signalements " + System.nanoTime());
        formation.setDescription("Description");
        formation.setLangue("fr");
        formation.setNiveau(NiveauFormation.DEBUTANT);
        formation.setCategorie("Test");
        formation.setPrix(BigDecimal.ONE);
        formation.setStatut(FormationStatus.PUBLIEE);
        formation = formations.saveAndFlush(formation);
        CourseReview review = new CourseReview();
        review.setParticipant(author);
        review.setFormation(formation);
        review.setNote(4);
        review.setCommentaire("Commentaire public qui peut être signalé.");
        review.setStatut(ReviewStatus.PUBLIE);
        review = reviews.saveAndFlush(review);
        return new Fixture(author, reporter, inactive, review);
    }

    @SuppressWarnings("unchecked")
    private <T extends User> T save(T user, Role role, String prefix) {
        user.setNom(prefix + " public");
        user.setEmail(prefix + "-" + System.nanoTime() + "@test.local");
        user.setPasswordHash("hash");
        user.setRole(role);
        user.setStatut(AccountStatus.ACTIF);
        return (T) users.saveAndFlush(user);
    }

    private record Fixture(Participant author, Participant reporter,
                           Participant inactiveReporter, CourseReview review) {}
}
