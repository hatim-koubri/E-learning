package ma.elearning.engagement;

import ma.elearning.user.AccountStatus;
import ma.elearning.user.Formateur;
import ma.elearning.user.Role;
import jakarta.mail.Multipart;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessagePreparator;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class NotificationEmailAttemptServiceTest {
    private NotificationDeliveryLogRepository deliveries;
    private JavaMailSender mail;
    private NotificationDeliveryLog delivery;
    private final Instant now = Instant.parse("2026-08-11T08:00:00Z");

    @BeforeEach
    void setup() {
        deliveries = mock(NotificationDeliveryLogRepository.class);
        mail = mock(JavaMailSender.class);
        delivery = pending(true);
        when(deliveries.findLockedById(31L)).thenReturn(Optional.of(delivery));
    }

    @Test
    void immediateSuccessIsMarkedOnceAndNeverSentAgain() {
        serviceAt(now).process(31L);
        serviceAt(now.plusSeconds(60)).process(31L);

        assertEquals(EmailDeliveryStatus.SENT, delivery.getStatut());
        assertEquals(1, delivery.getAttemptCount());
        assertNull(delivery.getNextAttemptAt());
        assertNull(delivery.getLastErrorCode());
        verify(mail, times(1)).send(any(MimeMessagePreparator.class));
    }

    @Test
    void preparesARealMultipartMessageWithTextAndHtmlAlternatives() throws Exception {
        serviceAt(now).process(31L);

        var preparator = org.mockito.ArgumentCaptor.forClass(MimeMessagePreparator.class);
        verify(mail).send(preparator.capture());
        MimeMessage message = new MimeMessage(Session.getInstance(new Properties()));
        assertDoesNotThrow(() -> preparator.getValue().prepare(message));
        assertInstanceOf(Multipart.class, message.getContent());
    }

    @Test
    void mandatoryFailureMovesToRetryAndAServiceRestartCanCompleteIt() {
        doThrow(new MailSendException("SMTP unavailable for trainer@example.test"))
                .doNothing().when(mail).send(any(MimeMessagePreparator.class));

        serviceAt(now).process(31L);
        assertEquals(EmailDeliveryStatus.RETRY, delivery.getStatut());
        assertEquals(1, delivery.getAttemptCount());
        assertEquals(now.plusSeconds(1), delivery.getNextAttemptAt());
        assertEquals("MAIL_UNAVAILABLE", delivery.getLastErrorCode());
        assertFalse(delivery.getLastErrorCode().contains("trainer@example.test"));

        NotificationEmailAttemptService restarted = serviceAt(now.plusSeconds(1));
        restarted.process(31L);
        assertEquals(EmailDeliveryStatus.SENT, delivery.getStatut());
        assertEquals(2, delivery.getAttemptCount());
        verify(mail, times(2)).send(any(MimeMessagePreparator.class));
    }

    @Test
    void mandatoryFailureStopsAtConfiguredMaximumWithBoundedBackoff() {
        doThrow(new MailSendException("down")).when(mail).send(any(MimeMessagePreparator.class));

        serviceAt(now).process(31L);
        serviceAt(now.plusSeconds(1)).process(31L);
        serviceAt(now.plusSeconds(3)).process(31L);

        assertEquals(EmailDeliveryStatus.FAILED, delivery.getStatut());
        assertEquals(3, delivery.getAttemptCount());
        assertNull(delivery.getNextAttemptAt());
        verify(mail, times(3)).send(any(MimeMessagePreparator.class));
    }

    @Test
    void optionalFailureIsAttemptedOnlyOnce() {
        delivery.setMandatory(false);
        doThrow(new MailSendException("down")).when(mail).send(any(MimeMessagePreparator.class));

        serviceAt(now).process(31L);
        serviceAt(now.plusSeconds(30)).process(31L);

        assertEquals(EmailDeliveryStatus.FAILED, delivery.getStatut());
        assertEquals(1, delivery.getAttemptCount());
        verify(mail, times(1)).send(any(MimeMessagePreparator.class));
    }

    private NotificationEmailAttemptService serviceAt(Instant instant) {
        return new NotificationEmailAttemptService(deliveries, mail, Clock.fixed(instant, ZoneOffset.UTC),
                "no-reply@nexalearn.test", 3, 1, 2);
    }

    private NotificationDeliveryLog pending(boolean mandatory) {
        Formateur recipient = new Formateur();
        ReflectionTestUtils.setField(recipient, "id", 12L);
        recipient.setNom("Trainer");
        recipient.setEmail("trainer@example.test");
        recipient.setPasswordHash("hash");
        recipient.setRole(Role.FORMATEUR);
        recipient.setStatut(AccountStatus.REFUSE);
        NotificationDeliveryLog value = new NotificationDeliveryLog();
        ReflectionTestUtils.setField(value, "id", 31L);
        value.setUser(recipient);
        value.setCategorie(NotificationCategory.COMPTE_FORMATEUR);
        value.setEventKey("decision:12");
        value.setCanal("EMAIL");
        value.setMandatory(mandatory);
        value.setStatut(EmailDeliveryStatus.PENDING);
        value.setNextAttemptAt(now);
        value.setSubject("Décision");
        value.setTextBody("Décision de refus. Motif : dossier incomplet.");
        value.setHtmlBody("<p>Décision de refus. Motif : dossier incomplet.</p>");
        return value;
    }
}
