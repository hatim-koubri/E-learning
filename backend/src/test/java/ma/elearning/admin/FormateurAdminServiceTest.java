package ma.elearning.admin;

import ma.elearning.api.AuthDtos.LoginRequest;
import ma.elearning.api.AuthDtos.RegisterRequest;
import ma.elearning.auth.AuthService;
import ma.elearning.common.BusinessException;
import ma.elearning.engagement.EmailDeliveryStatus;
import ma.elearning.engagement.NotificationCategory;
import ma.elearning.engagement.NotificationDeliveryLog;
import ma.elearning.engagement.NotificationDeliveryLogRepository;
import ma.elearning.engagement.UserNotificationRepository;
import ma.elearning.user.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessagePreparator;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;

@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class FormateurAdminServiceTest {
    @Autowired AuthService auth;
    @Autowired FormateurAdminService service;
    @Autowired FormateurRepository formateurs;
    @Autowired UserRepository users;
    @Autowired UserNotificationRepository notifications;
    @Autowired NotificationDeliveryLogRepository deliveries;
    @Autowired PasswordEncoder encoder;
    @MockitoBean JavaMailSender mail;
    private Admin admin;

    @BeforeEach
    void setup() {
        admin = new Admin();
        admin.setNom("Admin décisions");
        admin.setEmail("admin-decisions@test.local");
        admin.setPasswordHash(encoder.encode("Password1!"));
        admin.setRole(Role.ADMIN);
        admin.setStatut(AccountStatus.ACTIF);
        admin = users.saveAndFlush(admin);
        authenticate(admin);
    }

    @AfterEach
    void cleanupSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void acceptanceIsTracedNotifiedAndAllowsLoginWithoutChangingPassword() {
        var pending = auth.registerFormateur(request("accepted@test.local"));
        String passwordHash = users.findById(pending.id()).orElseThrow().getPasswordHash();

        var accepted = service.accept(pending.id());

        assertEquals(AccountStatus.ACTIF, accepted.statut());
        assertEquals(FormateurDecision.ACCEPTE, accepted.decision());
        assertEquals(admin.getId(), accepted.decideurAdminId());
        assertNotNull(accepted.dateDecision());
        assertNull(accepted.motifRefus());
        assertEquals(passwordHash, users.findById(pending.id()).orElseThrow().getPasswordHash());
        assertNotNull(auth.login(new LoginRequest("accepted@test.local", "Password1!")).accessToken());
        assertEquals(1, notifications.countByUserIdAndCategorieAndEventKey(
                pending.id(), NotificationCategory.COMPTE_FORMATEUR, eventKey(pending.id())));
        assertEquals(1, deliveries.countByUserIdAndCategorieAndEventKeyAndCanal(
                pending.id(), NotificationCategory.COMPTE_FORMATEUR, eventKey(pending.id()), "EMAIL"));
        NotificationDeliveryLog email = decisionEmail(pending.id());
        assertTrue(email.getTextBody().contains("maintenant actif"));
        assertTrue(email.getTextBody().contains("http://localhost:3000/login"));
        assertFalse(email.getTextBody().toLowerCase().contains("mot de passe"));
        assertFalse(email.getTextBody().toLowerCase().contains("token"));
        BusinessException second = assertThrows(BusinessException.class, () -> service.accept(pending.id()));
        assertEquals("REQUEST_ALREADY_DECIDED", second.getCode());
    }

    @Test
    void refusalStoresNormalizedReasonAndKeepsLoginBlocked() {
        var pending = auth.registerFormateur(request("refused@test.local"));
        String passwordHash = users.findById(pending.id()).orElseThrow().getPasswordHash();

        var refused = service.refuse(pending.id(), "  Dossier <incomplet>\r\nMerci de compléter les éléments.  ");

        assertEquals(AccountStatus.REFUSE, refused.statut());
        assertEquals(FormateurDecision.REFUSE, refused.decision());
        assertEquals(admin.getId(), refused.decideurAdminId());
        assertEquals("Dossier <incomplet>\nMerci de compléter les éléments.", refused.motifRefus());
        assertEquals(passwordHash, users.findById(pending.id()).orElseThrow().getPasswordHash());
        NotificationDeliveryLog email = decisionEmail(pending.id());
        assertTrue(email.getTextBody().contains("Dossier <incomplet>"));
        assertFalse(email.getTextBody().toLowerCase().contains("connect"));
        assertTrue(email.getHtmlBody().contains("Dossier &lt;incomplet&gt;"));
        assertFalse(email.getHtmlBody().contains("<incomplet>"));
        BusinessException loginFailure = assertThrows(BusinessException.class,
                () -> auth.login(new LoginRequest("refused@test.local", "Password1!")));
        assertEquals("ACCOUNT_REFUSED", loginFailure.getCode());
    }

    @Test
    void smtpFailureKeepsTheDecisionAndPersistsARetry() {
        var pending = auth.registerFormateur(request("smtp-failure@test.local"));
        doThrow(new MailSendException("SMTP unavailable for smtp-failure@test.local"))
                .when(mail).send(any(MimeMessagePreparator.class));

        service.refuse(pending.id(), "Dossier incomplet");

        Formateur decided = formateurs.findById(pending.id()).orElseThrow();
        assertEquals(AccountStatus.REFUSE, decided.getStatut());
        assertEquals(FormateurDecision.REFUSE, decided.getDecisionResult());
        NotificationDeliveryLog email = decisionEmail(pending.id());
        assertEquals(EmailDeliveryStatus.RETRY, email.getStatut());
        assertEquals(1, email.getAttemptCount());
        assertNotNull(email.getNextAttemptAt());
        assertEquals("MAIL_UNAVAILABLE", email.getLastErrorCode());
    }

    @Test
    void directServiceCallRequiresAnActiveAdminFromSecurityContext() {
        var pending = auth.registerFormateur(request("protected@test.local"));
        SecurityContextHolder.clearContext();
        BusinessException missing = assertThrows(BusinessException.class, () -> service.accept(pending.id()));
        assertEquals("ADMIN_REQUIRED", missing.getCode());
    }

    private RegisterRequest request(String email) {
        return new RegisterRequest("Trainer", email, null, "Password1!");
    }

    private void authenticate(Admin actor) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                actor.getEmail(), null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
    }

    private String eventKey(Long id) {
        return "trainer-account-decision:" + id;
    }

    private NotificationDeliveryLog decisionEmail(Long userId) {
        return deliveries.findByUserIdAndCategorieAndEventKeyAndCanal(
                userId, NotificationCategory.COMPTE_FORMATEUR, eventKey(userId), "EMAIL").orElseThrow();
    }
}
