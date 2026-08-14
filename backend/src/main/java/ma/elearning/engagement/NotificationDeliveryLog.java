package ma.elearning.engagement;

import jakarta.persistence.*;
import ma.elearning.user.User;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.Instant;

@Entity
@Table(name = "notification_deliveries", uniqueConstraints = @UniqueConstraint(
        name = "uk_notification_deliveries_event", columnNames = {"user_id", "categorie", "event_key", "canal"}))
public class NotificationDeliveryLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id") private User user;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 40) private NotificationCategory categorie;
    @Column(name = "event_key", nullable = false, length = 190) private String eventKey;
    @Column(nullable = false, length = 20) private String canal;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private EmailDeliveryStatus statut = EmailDeliveryStatus.PENDING;
    @Column(nullable = false) private boolean mandatory;
    @Column(name = "attempt_count", nullable = false) private int attemptCount;
    @Column(name = "next_attempt_at") private Instant nextAttemptAt;
    @Column(name = "last_attempt_at") private Instant lastAttemptAt;
    @Column(name = "last_error_code", length = 80) private String lastErrorCode;
    @Column(length = 180) private String subject;
    @Lob @Column(name = "text_body", columnDefinition = "text") private String textBody;
    @Lob @Column(name = "html_body", columnDefinition = "text") private String htmlBody;
    @CreationTimestamp @Column(name = "created_at", updatable = false) private Instant createdAt;
    @UpdateTimestamp @Column(name = "updated_at") private Instant updatedAt;
    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User value) { user = value; }
    public NotificationCategory getCategorie() { return categorie; }
    public void setCategorie(NotificationCategory value) { categorie = value; }
    public String getEventKey() { return eventKey; }
    public void setEventKey(String value) { eventKey = value; }
    public String getCanal() { return canal; }
    public void setCanal(String value) { canal = value; }
    public EmailDeliveryStatus getStatut() { return statut; }
    public void setStatut(EmailDeliveryStatus value) { statut = value; }
    public boolean isMandatory() { return mandatory; }
    public void setMandatory(boolean value) { mandatory = value; }
    public int getAttemptCount() { return attemptCount; }
    public void setAttemptCount(int value) { attemptCount = value; }
    public Instant getNextAttemptAt() { return nextAttemptAt; }
    public void setNextAttemptAt(Instant value) { nextAttemptAt = value; }
    public Instant getLastAttemptAt() { return lastAttemptAt; }
    public void setLastAttemptAt(Instant value) { lastAttemptAt = value; }
    public String getLastErrorCode() { return lastErrorCode; }
    public void setLastErrorCode(String value) { lastErrorCode = value; }
    public String getSubject() { return subject; }
    public void setSubject(String value) { subject = value; }
    public String getTextBody() { return textBody; }
    public void setTextBody(String value) { textBody = value; }
    public String getHtmlBody() { return htmlBody; }
    public void setHtmlBody(String value) { htmlBody = value; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
