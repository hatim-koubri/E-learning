package ma.elearning.auth;

import ma.elearning.api.AuthDtos.*;
import ma.elearning.common.BusinessException;
import ma.elearning.user.*;
import ma.elearning.engagement.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.DirtiesContext;
import java.time.Instant;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@DirtiesContext(classMode= DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class AuthServiceTest {
    @Autowired AuthService auth; @Autowired UserRepository users; @Autowired PasswordEncoder encoder;
    @Autowired NotificationDeliveryLogRepository deliveries;
    RegisterRequest request(String email) { return new RegisterRequest("Test",email,"0600000000","Password1!"); }

    @Test void participantRegistrationAndLogin() {
        var user=auth.registerParticipant(request("TEST@example.com"));
        assertEquals(Role.PARTICIPANT,user.role()); assertEquals(AccountStatus.ACTIF,user.statut());
        assertNotEquals("Password1!",users.findByEmail("test@example.com").orElseThrow().getPasswordHash());
        User persisted=users.findByEmail("test@example.com").orElseThrow();
        NotificationDeliveryLog welcome=deliveries.findByUserIdAndCategorieAndEventKeyAndCanal(
                persisted.getId(),NotificationCategory.ACCOUNT_WELCOME,"participant-welcome:"+persisted.getId(),"EMAIL").orElseThrow();
        assertEquals("Bienvenue sur NexaLearn",welcome.getSubject());
        assertTrue(welcome.getTextBody().contains("Bonjour Test"));
        assertTrue(welcome.getTextBody().contains("http://localhost:3000/login"));
        assertFalse(welcome.getTextBody().contains("Password1!"));
        assertFalse(welcome.getHtmlBody().contains("Password1!"));
        assertNotNull(auth.login(new LoginRequest("test@example.com","Password1!")).accessToken());
    }
    @Test void duplicateEmailRejected() {
        auth.registerParticipant(request("a@b.com"));
        assertEquals("EMAIL_ALREADY_USED",assertThrows(BusinessException.class,()->auth.registerParticipant(request("A@B.COM"))).getCode());
    }
    @Test void badPasswordSuspendedAndPendingAreRejected() {
        auth.registerParticipant(request("a@b.com"));
        assertEquals("INVALID_CREDENTIALS",assertThrows(BusinessException.class,()->auth.login(new LoginRequest("a@b.com","wrong"))).getCode());
        User p=users.findByEmail("a@b.com").orElseThrow(); p.setStatut(AccountStatus.SUSPENDU); users.save(p);
        assertEquals("ACCOUNT_SUSPENDED",assertThrows(BusinessException.class,()->auth.login(new LoginRequest("a@b.com","Password1!"))).getCode());
        auth.registerFormateur(request("f@b.com"));
        User trainer=users.findByEmail("f@b.com").orElseThrow();
        assertEquals(0,deliveries.countByUserIdAndCategorieAndEventKeyAndCanal(trainer.getId(),NotificationCategory.ACCOUNT_WELCOME,"participant-welcome:"+trainer.getId(),"EMAIL"));
        assertEquals("ACCOUNT_PENDING",assertThrows(BusinessException.class,()->auth.login(new LoginRequest("f@b.com","Password1!"))).getCode());
    }
}
