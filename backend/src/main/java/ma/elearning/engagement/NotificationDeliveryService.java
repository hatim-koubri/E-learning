package ma.elearning.engagement;

import ma.elearning.user.User;
import ma.elearning.user.AccountStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationDeliveryService {
    private final UserNotificationRepository notifications;
    private final NotificationPreferenceRepository preferences;
    private final NotificationEmailQueue emailQueue;

    public NotificationDeliveryService(UserNotificationRepository notifications,
                                       NotificationPreferenceRepository preferences,
                                       NotificationEmailQueue emailQueue) {
        this.notifications = notifications;
        this.preferences = preferences;
        this.emailQueue = emailQueue;
    }

    @Transactional
    public DeliveryResult deliver(User recipient, NotificationCategory category, String eventKey,
                                  String title, String message, String actionUrl, boolean mandatory) {
        return deliver(recipient, category, eventKey, title, message, actionUrl, mandatory, mandatory, mandatory);
    }

    @Transactional
    public DeliveryResult deliverRequiredInAppOptionalEmail(User recipient, NotificationCategory category,
                                  String eventKey, String title, String message, String actionUrl) {
        return deliver(recipient, category, eventKey, title, message, actionUrl, true, false, true);
    }

    private DeliveryResult deliver(User recipient, NotificationCategory category, String eventKey,
                                  String title, String message, String actionUrl,
                                  boolean mandatoryInApp, boolean mandatoryEmail, boolean retryEmail) {
        if (recipient.getStatut() == AccountStatus.SUSPENDU || recipient.getStatut() == AccountStatus.SUPPRIME) {
            return new DeliveryResult(false, false);
        }
        NotificationPreference preference = preferences
                .findByUserEmailAndCategorie(recipient.getEmail(), category).orElse(null);
        boolean inApp = mandatoryInApp || preference == null || preference.isDansApplication();
        boolean email = mandatoryEmail || preference != null && preference.isEmailActif();
        boolean created = false;
        if (inApp && !alreadyDelivered(recipient, category, eventKey)) {
            UserNotification notification = new UserNotification();
            notification.setUser(recipient);
            notification.setCategorie(category);
            notification.setEventKey(eventKey);
            notification.setTitre(title);
            notification.setMessage(message);
            notification.setActionUrl(actionUrl);
            notifications.save(notification);
            created = true;
        }
        boolean emailQueued = false;
        if (email) {
            emailQueued = emailQueue.enqueue(recipient, category, eventKey, title, message, actionUrl, retryEmail).created();
        }
        return new DeliveryResult(created, emailQueued);
    }

    private boolean alreadyDelivered(User recipient, NotificationCategory category, String eventKey) {
        return eventKey != null && notifications.existsByUserIdAndCategorieAndEventKey(
                recipient.getId(), category, eventKey);
    }

    public record DeliveryResult(boolean notificationCreated, boolean emailQueued) {}
}
