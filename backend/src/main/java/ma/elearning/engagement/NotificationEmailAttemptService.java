package ma.elearning.engagement;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailPreparationException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.mail.javamail.MimeMessagePreparator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;

@Service
public class NotificationEmailAttemptService {
    private static final Logger log = LoggerFactory.getLogger(NotificationEmailAttemptService.class);
    private final NotificationDeliveryLogRepository deliveries;
    private final JavaMailSender mail;
    private final Clock clock;
    private final String mailFrom;
    private final int mandatoryMaxAttempts;
    private final long initialBackoffSeconds;
    private final long maxBackoffSeconds;

    public NotificationEmailAttemptService(NotificationDeliveryLogRepository deliveries,
                                           JavaMailSender mail,
                                           Clock clock,
                                           @Value("${app.mail.from}") String mailFrom,
                                           @Value("${app.notifications.mandatory-email-max-attempts:5}") int mandatoryMaxAttempts,
                                           @Value("${app.notifications.mandatory-email-initial-backoff-seconds:30}") long initialBackoffSeconds,
                                           @Value("${app.notifications.mandatory-email-max-backoff-seconds:3600}") long maxBackoffSeconds) {
        this.deliveries = deliveries;
        this.mail = mail;
        this.clock = clock;
        this.mailFrom = mailFrom;
        this.mandatoryMaxAttempts = Math.max(1, mandatoryMaxAttempts);
        this.initialBackoffSeconds = Math.max(1, initialBackoffSeconds);
        this.maxBackoffSeconds = Math.max(this.initialBackoffSeconds, maxBackoffSeconds);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void process(Long id) {
        NotificationDeliveryLog delivery = deliveries.findLockedById(id).orElse(null);
        if (delivery == null || delivery.getStatut() == EmailDeliveryStatus.SENT ||
                delivery.getStatut() == EmailDeliveryStatus.FAILED) return;
        Instant now = clock.instant();
        if (delivery.getNextAttemptAt() != null && delivery.getNextAttemptAt().isAfter(now)) return;

        int attempt = delivery.getAttemptCount() + 1;
        delivery.setAttemptCount(attempt);
        delivery.setLastAttemptAt(now);
        try {
            send(delivery);
            delivery.setStatut(EmailDeliveryStatus.SENT);
            delivery.setNextAttemptAt(null);
            delivery.setLastErrorCode(null);
        } catch (RuntimeException failure) {
            log.debug("Échec technique de distribution, deliveryId={}", id, failure);
            delivery.setLastErrorCode(errorCode(failure));
            int maximum = delivery.isMandatory() ? mandatoryMaxAttempts : 1;
            if (attempt >= maximum) {
                delivery.setStatut(EmailDeliveryStatus.FAILED);
                delivery.setNextAttemptAt(null);
                log.warn("Distribution email définitivement échouée, deliveryId={}, tentative={}", id, attempt);
            } else {
                delivery.setStatut(EmailDeliveryStatus.RETRY);
                delivery.setNextAttemptAt(now.plusSeconds(backoffSeconds(attempt)));
                log.warn("Distribution email planifiée pour reprise, deliveryId={}, tentative={}", id, attempt);
            }
        }
    }

    private void send(NotificationDeliveryLog delivery) {
        if (delivery.getSubject() == null || delivery.getTextBody() == null || delivery.getHtmlBody() == null) {
            throw new MailPreparationException("Contenu de distribution absent");
        }
        mail.send((MimeMessagePreparator) mimeMessage -> prepare(mimeMessage, delivery));
    }

    private void prepare(MimeMessage mimeMessage, NotificationDeliveryLog delivery) throws Exception {
        MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, StandardCharsets.UTF_8.name());
        helper.setFrom(mailFrom);
        helper.setTo(delivery.getUser().getEmail());
        helper.setSubject(delivery.getSubject());
        helper.setText(delivery.getTextBody(), delivery.getHtmlBody());
    }

    private long backoffSeconds(int attempt) {
        long multiplier = 1L << Math.min(Math.max(0, attempt - 1), 10);
        return Math.min(maxBackoffSeconds, initialBackoffSeconds * multiplier);
    }

    private String errorCode(RuntimeException failure) {
        if (failure instanceof MailAuthenticationException) return "MAIL_AUTHENTICATION";
        if (failure instanceof MailPreparationException) return "MAIL_CONFIGURATION";
        return "MAIL_UNAVAILABLE";
    }
}
