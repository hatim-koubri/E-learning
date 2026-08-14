package ma.elearning.engagement;

import ma.elearning.user.Participant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class NotificationDeliveryServiceTest {
    UserNotificationRepository notifications = mock(UserNotificationRepository.class);
    NotificationPreferenceRepository preferences = mock(NotificationPreferenceRepository.class);
    NotificationEmailQueue emailQueue = mock(NotificationEmailQueue.class);
    NotificationDeliveryService service;
    Participant participant;

    @BeforeEach void setup() {
        service = new NotificationDeliveryService(notifications, preferences, emailQueue);
        participant = new Participant(); participant.setEmail("one@test.local"); participant.setNom("One");
        when(emailQueue.enqueue(any(), any(), any(), any(), any(), any(), anyBoolean()))
                .thenReturn(new NotificationEmailQueue.QueueResult(1L, true));
    }

    @Test void defaultsEnableInAppAndDisableEmail() {
        when(preferences.findByUserEmailAndCategorie(participant.getEmail(), NotificationCategory.QUIZ))
                .thenReturn(Optional.empty());
        service.deliver(participant, NotificationCategory.QUIZ, "quiz:1", "Quiz", "Disponible", "/quiz", false);
        verify(notifications).save(any(UserNotification.class));
        verifyNoInteractions(emailQueue);
    }

    @Test void channelsAreControlledIndependently() {
        NotificationPreference preference = preference(false, true);
        when(preferences.findByUserEmailAndCategorie(participant.getEmail(), NotificationCategory.CLASSE))
                .thenReturn(Optional.of(preference));
        service.deliver(participant, NotificationCategory.CLASSE, "session:1", "Séance", "Bientôt", null, false);
        verify(notifications, never()).save(any());
        verify(emailQueue).enqueue(eq(participant), eq(NotificationCategory.CLASSE), eq("session:1"),
                eq("Séance"), eq("Bientôt"), isNull(), eq(false));
    }

    @Test void categoryAndRecipientPreferencesAreIsolated() {
        when(preferences.findByUserEmailAndCategorie("one@test.local", NotificationCategory.QUIZ))
                .thenReturn(Optional.of(preference(false, false)));
        service.deliver(participant, NotificationCategory.QUIZ, "quiz:2", "Quiz", "Disponible", null, false);
        verify(preferences).findByUserEmailAndCategorie("one@test.local", NotificationCategory.QUIZ);
        verify(notifications, never()).save(any());
        verifyNoInteractions(emailQueue);
    }

    @Test void mandatoryCommunicationCannotBeDisabled() {
        when(preferences.findByUserEmailAndCategorie(participant.getEmail(), NotificationCategory.COMPTE_FORMATEUR))
                .thenReturn(Optional.of(preference(false, false)));
        service.deliver(participant, NotificationCategory.COMPTE_FORMATEUR, "decision:1", "Décision", "Compte validé", null, true);
        verify(notifications).save(any());
        verify(emailQueue).enqueue(eq(participant), eq(NotificationCategory.COMPTE_FORMATEUR), eq("decision:1"),
                eq("Décision"), eq("Compte validé"), isNull(), eq(true));
    }

    @Test void anExistingOutboxEventIsReportedAsNotNewlyQueued() {
        when(preferences.findByUserEmailAndCategorie(participant.getEmail(), NotificationCategory.CLASSE))
                .thenReturn(Optional.of(preference(true, true)));
        when(emailQueue.enqueue(any(), any(), any(), any(), any(), any(), anyBoolean()))
                .thenReturn(new NotificationEmailQueue.QueueResult(9L, false));
        NotificationDeliveryService.DeliveryResult result = service.deliver(participant, NotificationCategory.CLASSE,
                "reminder:1", "Rappel", "Bientôt", null, false);
        assertFalse(result.emailQueued());
    }

    private NotificationPreference preference(boolean inApp, boolean email) {
        NotificationPreference result = new NotificationPreference();
        result.setDansApplication(inApp); result.setEmailActif(email); return result;
    }
}
