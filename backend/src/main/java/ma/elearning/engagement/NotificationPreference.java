package ma.elearning.engagement;

import jakarta.persistence.*;
import ma.elearning.user.User;

@Entity
@Table(name = "preferences_notifications", uniqueConstraints = @UniqueConstraint(
        name = "uk_preferences_notifications_user_categorie", columnNames = {"user_id", "categorie"}))
public class NotificationPreference {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id")
    private User user;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 40)
    private NotificationCategory categorie;
    @Column(name = "dans_application", nullable = false)
    private boolean dansApplication = true;
    @Column(name = "email_actif", nullable = false)
    private boolean emailActif;

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User value) { user = value; }
    public NotificationCategory getCategorie() { return categorie; }
    public void setCategorie(NotificationCategory value) { categorie = value; }
    public boolean isDansApplication() { return dansApplication; }
    public void setDansApplication(boolean value) { dansApplication = value; }
    public boolean isEmailActif() { return emailActif; }
    public void setEmailActif(boolean value) { emailActif = value; }
}
