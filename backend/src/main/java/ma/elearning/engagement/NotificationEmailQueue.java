package ma.elearning.engagement;

import ma.elearning.user.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.HtmlUtils;

import java.net.URI;
import java.time.Clock;
import java.util.UUID;

@Service
public class NotificationEmailQueue {
    private static final String EMAIL_CHANNEL = "EMAIL";
    private final NotificationDeliveryLogRepository deliveries;
    private final ApplicationEventPublisher events;
    private final Clock clock;
    private final URI applicationBaseUrl;

    public NotificationEmailQueue(NotificationDeliveryLogRepository deliveries,
                                  ApplicationEventPublisher events,
                                  Clock clock,
                                  @Value("${app.web.base-url}") String applicationBaseUrl) {
        this.deliveries = deliveries;
        this.events = events;
        this.clock = clock;
        this.applicationBaseUrl = validatedBaseUrl(applicationBaseUrl);
    }

    @Transactional
    public QueueResult enqueue(User recipient, NotificationCategory category, String eventKey,
                               String title, String message, String actionUrl, boolean mandatory) {
        String persistentKey = eventKey == null ? "ad-hoc:" + UUID.randomUUID() : eventKey;
        NotificationDeliveryLog existing = deliveries
                .findByUserIdAndCategorieAndEventKeyAndCanal(
                        recipient.getId(), category, persistentKey, EMAIL_CHANNEL)
                .orElse(null);
        if (existing != null) return new QueueResult(existing.getId(), false);

        String absoluteActionUrl = absoluteHttpUrl(actionUrl);
        NotificationDeliveryLog delivery = new NotificationDeliveryLog();
        delivery.setUser(recipient);
        delivery.setCategorie(category);
        delivery.setEventKey(persistentKey);
        delivery.setCanal(EMAIL_CHANNEL);
        delivery.setStatut(EmailDeliveryStatus.PENDING);
        delivery.setMandatory(mandatory);
        delivery.setNextAttemptAt(clock.instant());
        delivery.setSubject(safeSubject(title));
        delivery.setTextBody(textBody(message, absoluteActionUrl));
        delivery.setHtmlBody(htmlBody(message, absoluteActionUrl));
        delivery = deliveries.saveAndFlush(delivery);
        events.publishEvent(new NotificationEmailQueued(delivery.getId()));
        return new QueueResult(delivery.getId(), true);
    }

    private URI validatedBaseUrl(String value) {
        URI uri = URI.create(value.endsWith("/") ? value : value + "/");
        if (!uri.isAbsolute() || !("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))) {
            throw new IllegalStateException("APP_BASE_URL doit être une URL HTTP(S) absolue.");
        }
        return uri;
    }

    private String absoluteHttpUrl(String actionUrl) {
        if (actionUrl == null || actionUrl.isBlank()) return null;
        URI candidate = URI.create(actionUrl);
        URI resolved = candidate.isAbsolute()
                ? candidate
                : applicationBaseUrl.resolve(actionUrl.startsWith("/") ? actionUrl.substring(1) : actionUrl);
        if (!("http".equalsIgnoreCase(resolved.getScheme()) || "https".equalsIgnoreCase(resolved.getScheme()))) return null;
        return resolved.toString();
    }

    private String safeSubject(String title) {
        String normalized = title.replaceAll("[\\r\\n]+", " ").strip();
        return normalized.length() <= 180 ? normalized : normalized.substring(0, 180);
    }

    private String textBody(String message, String actionUrl) {
        return message + (actionUrl == null ? "" : "\n\nAccéder à NexaLearn : " + actionUrl);
    }

    private String htmlBody(String message, String actionUrl) {
        String safeMessage = HtmlUtils.htmlEscape(message).replace("\n", "<br>");
        String link = actionUrl == null ? "" : "<p><a href=\"" + HtmlUtils.htmlEscape(actionUrl) +
                "\">Accéder à NexaLearn</a></p>";
        return "<p>" + safeMessage + "</p>" + link;
    }

    public record QueueResult(Long deliveryId, boolean created) {}
}
