package ma.elearning.engagement;

import ma.elearning.user.Participant;
import ma.elearning.user.Role;
import ma.elearning.user.AccountStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class NotificationEmailQueueTest {
    private NotificationDeliveryLogRepository deliveries;
    private ApplicationEventPublisher events;
    private NotificationEmailQueue queue;
    private Participant recipient;
    private final Instant now = Instant.parse("2026-08-11T08:00:00Z");

    @BeforeEach
    void setup() {
        deliveries = mock(NotificationDeliveryLogRepository.class);
        events = mock(ApplicationEventPublisher.class);
        queue = new NotificationEmailQueue(deliveries, events, Clock.fixed(now, ZoneOffset.UTC),
                "https://nexalearn.example/");
        recipient = new Participant();
        ReflectionTestUtils.setField(recipient, "id", 12L);
        recipient.setNom("Trainer");
        recipient.setEmail("trainer@example.test");
        recipient.setRole(Role.FORMATEUR);
        recipient.setStatut(AccountStatus.REFUSE);
    }

    @Test
    void queuesPersistentEscapedHtmlAndConfigurableApplicationLink() {
        AtomicReference<NotificationDeliveryLog> saved = new AtomicReference<>();
        when(deliveries.findByUserIdAndCategorieAndEventKeyAndCanal(
                12L, NotificationCategory.COMPTE_FORMATEUR, "decision:12", "EMAIL"))
                .thenReturn(Optional.empty());
        when(deliveries.saveAndFlush(any())).thenAnswer(invocation -> {
            NotificationDeliveryLog value = invocation.getArgument(0);
            ReflectionTestUtils.setField(value, "id", 81L);
            saved.set(value);
            return value;
        });

        NotificationEmailQueue.QueueResult result = queue.enqueue(recipient,
                NotificationCategory.COMPTE_FORMATEUR, "decision:12", "Demande refusée",
                "Motif : <script>alert('x')</script>", "/login", true);

        assertTrue(result.created());
        assertEquals(81L, result.deliveryId());
        NotificationDeliveryLog delivery = saved.get();
        assertEquals(EmailDeliveryStatus.PENDING, delivery.getStatut());
        assertTrue(delivery.isMandatory());
        assertEquals(now, delivery.getNextAttemptAt());
        assertTrue(delivery.getTextBody().contains("<script>alert('x')</script>"));
        assertFalse(delivery.getHtmlBody().contains("<script>"));
        assertTrue(delivery.getHtmlBody().contains("&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;"));
        assertTrue(delivery.getHtmlBody().contains("https://nexalearn.example/login"));
        verify(events).publishEvent(new NotificationEmailQueued(81L));
    }

    @Test
    void existingBusinessEventIsIdempotentAndIsNotRepublished() {
        NotificationDeliveryLog existing = new NotificationDeliveryLog();
        ReflectionTestUtils.setField(existing, "id", 44L);
        when(deliveries.findByUserIdAndCategorieAndEventKeyAndCanal(
                12L, NotificationCategory.COMPTE_FORMATEUR, "decision:12", "EMAIL"))
                .thenReturn(Optional.of(existing));

        NotificationEmailQueue.QueueResult result = queue.enqueue(recipient,
                NotificationCategory.COMPTE_FORMATEUR, "decision:12", "Décision", "Message", null, true);

        assertFalse(result.created());
        assertEquals(44L, result.deliveryId());
        verify(deliveries, never()).saveAndFlush(any());
        verifyNoInteractions(events);
    }
}
