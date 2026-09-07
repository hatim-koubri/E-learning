package ma.elearning.engagement;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Clock;
import java.util.List;

@Service
public class NotificationEmailDispatcher {
    private static final Logger log = LoggerFactory.getLogger(NotificationEmailDispatcher.class);
    private final NotificationDeliveryLogRepository deliveries;
    private final NotificationEmailAttemptService attempts;
    private final Clock clock;
    private final int batchSize;

    public NotificationEmailDispatcher(NotificationDeliveryLogRepository deliveries,
                                       NotificationEmailAttemptService attempts,
                                       Clock clock,
                                       @Value("${app.notifications.mandatory-email-batch-size:20}") int batchSize) {
        this.deliveries = deliveries;
        this.attempts = attempts;
        this.clock = clock;
        this.batchSize = Math.max(1, batchSize);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void afterCommit(NotificationEmailQueued event) {
        processSafely(event.deliveryId());
    }

    @Scheduled(fixedDelayString = "${app.notifications.mandatory-email-scan-ms:60000}")
    public void retryDue() {
        deliveries.findDueIds(List.of(EmailDeliveryStatus.PENDING, EmailDeliveryStatus.RETRY),
                        clock.instant(), PageRequest.of(0, batchSize))
                .forEach(this::processSafely);
    }

    private void processSafely(Long id) {
        try {
            attempts.process(id);
        } catch (RuntimeException failure) {
            log.warn("Traitement de distribution email interrompu, deliveryId={}", id);
        }
    }
}
