package ma.elearning.engagement;

import jakarta.persistence.*;
import ma.elearning.user.User;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "notifications")
public class UserNotification {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id")
    private User user;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 40)
    private NotificationCategory categorie;
    @Column(nullable = false, length = 180)
    private String titre;
    @Column(nullable = false, length = 1000)
    private String message;
    @Column(name = "action_url", length = 500)
    private String actionUrl;
    @Column(name = "event_key", length = 190)
    private String eventKey;
    @Column(nullable = false)
    private boolean lue;
    @CreationTimestamp @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User value) { user = value; }
    public NotificationCategory getCategorie() { return categorie; }
    public void setCategorie(NotificationCategory value) { categorie = value; }
    public String getTitre() { return titre; }
    public void setTitre(String value) { titre = value; }
    public String getMessage() { return message; }
    public void setMessage(String value) { message = value; }
    public String getActionUrl() { return actionUrl; }
    public void setActionUrl(String value) { actionUrl = value; }
    public String getEventKey() { return eventKey; }
    public void setEventKey(String value) { eventKey = value; }
    public boolean isLue() { return lue; }
    public void setLue(boolean value) { lue = value; }
    public Instant getCreatedAt() { return createdAt; }
}
