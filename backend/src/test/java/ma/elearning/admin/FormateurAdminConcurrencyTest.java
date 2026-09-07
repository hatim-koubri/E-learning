package ma.elearning.admin;

import ma.elearning.api.AuthDtos.RegisterRequest;
import ma.elearning.auth.AuthService;
import ma.elearning.common.BusinessException;
import ma.elearning.engagement.NotificationCategory;
import ma.elearning.engagement.NotificationDeliveryLogRepository;
import ma.elearning.engagement.UserNotificationRepository;
import ma.elearning.user.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessagePreparator;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.List;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@SpringBootTest
class FormateurAdminConcurrencyTest {
    @Autowired FormateurAdminService service;
    @Autowired AuthService auth;
    @Autowired UserRepository users;
    @Autowired FormateurRepository formateurs;
    @Autowired UserNotificationRepository notifications;
    @Autowired NotificationDeliveryLogRepository deliveries;
    @Autowired PasswordEncoder encoder;
    @MockitoBean JavaMailSender mail;
    private ExecutorService executor;
    private Admin firstAdmin;
    private Admin secondAdmin;

    @BeforeEach
    void setup() {
        executor = Executors.newFixedThreadPool(2);
        firstAdmin = admin("first-admin-" + System.nanoTime() + "@test.local");
        secondAdmin = admin("second-admin-" + System.nanoTime() + "@test.local");
        clearInvocations(mail);
    }

    @AfterEach
    void cleanup() {
        executor.shutdownNow();
        SecurityContextHolder.clearContext();
    }

    @ParameterizedTest(name = "{0} contre {1}")
    @CsvSource({
            "ACCEPTE,ACCEPTE",
            "REFUSE,REFUSE",
            "ACCEPTE,REFUSE",
            "REFUSE,ACCEPTE"
    })
    void exactlyOneConcurrentDecisionWins(String firstAction, String secondAction) throws Exception {
        var pending = auth.registerFormateur(new RegisterRequest("Concurrent", uniqueTrainerEmail(), null, "Password1!"));
        CountDownLatch start = new CountDownLatch(1);
        Future<Outcome> first = executor.submit(() -> decide(start, firstAdmin, pending.id(), firstAction));
        Future<Outcome> second = executor.submit(() -> decide(start, secondAdmin, pending.id(), secondAction));
        start.countDown();

        List<Outcome> outcomes = List.of(first.get(10, TimeUnit.SECONDS), second.get(10, TimeUnit.SECONDS));
        List<Outcome> successes = outcomes.stream().filter(Outcome::success).toList();
        List<Outcome> conflicts = outcomes.stream().filter(value -> !value.success()).toList();
        assertEquals(1, successes.size());
        assertEquals(1, conflicts.size());
        assertEquals("REQUEST_ALREADY_DECIDED", conflicts.getFirst().errorCode());

        Outcome winner = successes.getFirst();
        Formateur decided = formateurs.findById(pending.id()).orElseThrow();
        assertEquals(winner.decision(), decided.getDecisionResult());
        assertEquals(winner.adminId(), decided.getDecisionAdmin().getId());
        assertNotNull(decided.getDateDecision());
        assertEquals(winner.decision() == FormateurDecision.ACCEPTE ? AccountStatus.ACTIF : AccountStatus.REFUSE,
                decided.getStatut());
        String eventKey = "trainer-account-decision:" + pending.id();
        assertEquals(1, notifications.countByUserIdAndCategorieAndEventKey(
                pending.id(), NotificationCategory.COMPTE_FORMATEUR, eventKey));
        assertEquals(1, deliveries.countByUserIdAndCategorieAndEventKeyAndCanal(
                pending.id(), NotificationCategory.COMPTE_FORMATEUR, eventKey, "EMAIL"));
        verify(mail, times(1)).send(any(MimeMessagePreparator.class));
    }

    private Outcome decide(CountDownLatch start, Admin actor, Long trainerId, String action) {
        try {
            start.await(5, TimeUnit.SECONDS);
            SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                    actor.getEmail(), null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
            if ("ACCEPTE".equals(action)) service.accept(trainerId);
            else service.refuse(trainerId, "Dossier concurrent incomplet");
            return new Outcome(true, actor.getId(), FormateurDecision.valueOf(action), null);
        } catch (BusinessException failure) {
            return new Outcome(false, actor.getId(), FormateurDecision.valueOf(action), failure.getCode());
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(interrupted);
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private Admin admin(String email) {
        Admin value = new Admin();
        value.setNom("Admin concurrence");
        value.setEmail(email);
        value.setPasswordHash(encoder.encode("Password1!"));
        value.setRole(Role.ADMIN);
        value.setStatut(AccountStatus.ACTIF);
        return users.saveAndFlush(value);
    }

    private String uniqueTrainerEmail() {
        return "trainer-concurrent-" + System.nanoTime() + "@test.local";
    }

    private record Outcome(boolean success, Long adminId, FormateurDecision decision, String errorCode) {}
}
