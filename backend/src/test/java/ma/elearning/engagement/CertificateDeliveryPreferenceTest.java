package ma.elearning.engagement;

import ma.elearning.user.AccountStatus;
import ma.elearning.user.Participant;
import ma.elearning.user.Role;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CertificateDeliveryPreferenceTest {
    @Test
    void requiredInternalNotificationDoesNotForceEmailWhenPreferenceIsAbsent() {
        UserNotificationRepository notifications=mock(UserNotificationRepository.class);
        NotificationPreferenceRepository preferences=mock(NotificationPreferenceRepository.class);
        NotificationEmailQueue queue=mock(NotificationEmailQueue.class);
        NotificationDeliveryService service=new NotificationDeliveryService(notifications,preferences,queue);
        Participant participant=participant();
        when(preferences.findByUserEmailAndCategorie(participant.getEmail(),NotificationCategory.CERTIFICATE_AVAILABLE))
                .thenReturn(Optional.empty());

        var result=service.deliverRequiredInAppOptionalEmail(participant,NotificationCategory.CERTIFICATE_AVAILABLE,
                "certificate-eligible:42","Votre certificat est disponible","Bravo","/apprentissage/7/quiz");

        assertTrue(result.notificationCreated());
        assertFalse(result.emailQueued());
        verify(notifications).save(any(UserNotification.class));
        verifyNoInteractions(queue);
    }

    @Test
    void enabledEmailIsQueuedWithRetryWithoutMakingInternalNotificationOptional() {
        UserNotificationRepository notifications=mock(UserNotificationRepository.class);
        NotificationPreferenceRepository preferences=mock(NotificationPreferenceRepository.class);
        NotificationEmailQueue queue=mock(NotificationEmailQueue.class);
        NotificationDeliveryService service=new NotificationDeliveryService(notifications,preferences,queue);
        Participant participant=participant();
        NotificationPreference preference=new NotificationPreference();preference.setUser(participant);
        preference.setCategorie(NotificationCategory.CERTIFICATE_AVAILABLE);preference.setDansApplication(false);preference.setEmailActif(true);
        when(preferences.findByUserEmailAndCategorie(participant.getEmail(),NotificationCategory.CERTIFICATE_AVAILABLE))
                .thenReturn(Optional.of(preference));
        when(queue.enqueue(any(),any(),anyString(),anyString(),anyString(),anyString(),eq(true)))
                .thenReturn(new NotificationEmailQueue.QueueResult(9L,true));

        var result=service.deliverRequiredInAppOptionalEmail(participant,NotificationCategory.CERTIFICATE_AVAILABLE,
                "certificate-eligible:42","Votre certificat est disponible","Bravo","/apprentissage/7/quiz");

        assertTrue(result.notificationCreated());
        assertTrue(result.emailQueued());
    }

    private Participant participant(){
        Participant participant=new Participant();ReflectionTestUtils.setField(participant,"id",5L);
        participant.setNom("Participant");participant.setEmail("participant@example.test");
        participant.setRole(Role.PARTICIPANT);participant.setStatut(AccountStatus.ACTIF);return participant;
    }
}
