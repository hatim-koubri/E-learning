package ma.elearning.admin;

import ma.elearning.common.BusinessException;
import ma.elearning.engagement.*;
import ma.elearning.formation.*;
import ma.elearning.user.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.annotation.DirtiesContext;

import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties =
        "spring.datasource.url=jdbc:h2:mem:admin_review_concurrency;MODE=MySQL;DATABASE_TO_LOWER=TRUE")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class AdminReviewModerationConcurrencyTest {
    @Autowired AdminReviewModerationService moderation;
    @Autowired EngagementService engagement;
    @Autowired CourseReviewRepository reviews;
    @Autowired ReviewReportRepository reports;
    @Autowired FormationRepository formations;
    @Autowired UserRepository users;
    private ExecutorService executor;
    private Admin firstAdmin;
    private Admin secondAdmin;

    @BeforeEach
    void setup() {
        executor = Executors.newFixedThreadPool(2);
        firstAdmin = save(new Admin(), Role.ADMIN, "first-admin");
        secondAdmin = save(new Admin(), Role.ADMIN, "second-admin");
    }

    @AfterEach
    void cleanup() {
        executor.shutdownNow();
        SecurityContextHolder.clearContext();
    }

    @ParameterizedTest(name = "{0} contre {1}")
    @CsvSource({
            "REPUBLIER,REPUBLIER",
            "MASQUER,MASQUER",
            "REPUBLIER,MASQUER",
            "MASQUER,REPUBLIER"
    })
    void exactlyOneDecisionWinsAndResolvesEveryPendingReport(String firstDecision,
                                                              String secondDecision) throws Exception {
        ModerationFixture fixture = fixture();
        CountDownLatch start = new CountDownLatch(1);
        Future<Outcome> first = executor.submit(() -> decide(start, firstAdmin, fixture.reviewId(), firstDecision));
        Future<Outcome> second = executor.submit(() -> decide(start, secondAdmin, fixture.reviewId(), secondDecision));
        start.countDown();

        List<Outcome> outcomes = List.of(first.get(10, TimeUnit.SECONDS), second.get(10, TimeUnit.SECONDS));
        List<Outcome> successes = outcomes.stream().filter(Outcome::success).toList();
        List<Outcome> conflicts = outcomes.stream().filter(value -> !value.success()).toList();
        assertEquals(1, successes.size());
        assertEquals(1, conflicts.size());
        assertEquals("REVIEW_ALREADY_MODERATED", conflicts.getFirst().errorCode());

        Outcome winner = successes.getFirst();
        ReviewModerationDecision expectedDecision = ReviewModerationDecision.valueOf(winner.decision());
        ReviewStatus expectedReviewStatus = expectedDecision == ReviewModerationDecision.REPUBLIER
                ? ReviewStatus.PUBLIE : ReviewStatus.MASQUE;
        ReviewReportStatus expectedReportStatus = expectedDecision == ReviewModerationDecision.REPUBLIER
                ? ReviewReportStatus.TRAITE_AVIS_REPUBLIE : ReviewReportStatus.TRAITE_AVIS_MASQUE;
        assertEquals(expectedReviewStatus, reviews.findById(fixture.reviewId()).orElseThrow().getStatut());

        List<ReviewReport> resolved = reports.findByReviewIdOrderByIdAsc(fixture.reviewId());
        assertEquals(2, resolved.size());
        assertTrue(resolved.stream().allMatch(value -> value.getStatutTraitement() == expectedReportStatus));
        assertTrue(resolved.stream().allMatch(value -> value.getDecision() == expectedDecision));
        assertTrue(resolved.stream().allMatch(value -> value.getDecisionAdmin().getId().equals(winner.adminId())));
        assertNotNull(resolved.getFirst().getDecidedAt());
        assertTrue(resolved.stream().allMatch(value -> value.getDecidedAt().equals(resolved.getFirst().getDecidedAt())));
        assertEquals(0, moderation.pending(0, 20).content().stream()
                .filter(value -> value.avis().id().equals(fixture.reviewId())).count());

        var publicView = engagement.publicReviews(fixture.formationId(), 0, 10, null);
        assertEquals(expectedDecision == ReviewModerationDecision.REPUBLIER ? 1 : 0, publicView.nombre());
        assertEquals(expectedDecision == ReviewModerationDecision.REPUBLIER ? 4.0 : 0.0,
                publicView.moyenne());
    }

    private Outcome decide(CountDownLatch start, Admin actor, Long reviewId, String decision) {
        try {
            start.await(5, TimeUnit.SECONDS);
            SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                    actor.getEmail(), null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
            if ("REPUBLIER".equals(decision)) moderation.republish(reviewId);
            else moderation.hide(reviewId);
            return new Outcome(true, actor.getId(), decision, null);
        } catch (BusinessException failure) {
            return new Outcome(false, actor.getId(), decision, failure.getCode());
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(interrupted);
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private ModerationFixture fixture() {
        Formateur trainer = save(new Formateur(), Role.FORMATEUR, "trainer");
        Participant author = save(new Participant(), Role.PARTICIPANT, "author");
        Participant firstReporter = save(new Participant(), Role.PARTICIPANT, "reporter-one");
        Participant secondReporter = save(new Participant(), Role.PARTICIPANT, "reporter-two");
        Formation formation = new Formation();
        formation.setFormateur(trainer);
        formation.setTitre("Formation modération " + System.nanoTime());
        formation.setDescription("Description publique");
        formation.setLangue("fr");
        formation.setNiveau(NiveauFormation.DEBUTANT);
        formation.setCategorie("Test");
        formation.setPrix(BigDecimal.TEN);
        formation.setStatut(FormationStatus.PUBLIEE);
        formation = formations.saveAndFlush(formation);

        CourseReview review = new CourseReview();
        review.setParticipant(author);
        review.setFormation(formation);
        review.setNote(4);
        review.setCommentaire("Avis à modérer avec une réponse conservée.");
        review.setReponseFormateur("Réponse publique du formateur.");
        review.setStatut(ReviewStatus.SIGNALE);
        review = reviews.saveAndFlush(review);

        ReviewReport first = report(review, firstReporter, "Premier motif");
        ReviewReport second = report(review, secondReporter, "Second motif");
        reports.saveAllAndFlush(List.of(first, second));
        return new ModerationFixture(formation.getId(), review.getId());
    }

    private ReviewReport report(CourseReview review, Participant reporter, String reason) {
        ReviewReport report = new ReviewReport();
        report.setReview(review);
        report.setParticipant(reporter);
        report.setMotif(reason);
        return report;
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

    private record ModerationFixture(Long formationId, Long reviewId) {}
    private record Outcome(boolean success, Long adminId, String decision, String errorCode) {}
}
