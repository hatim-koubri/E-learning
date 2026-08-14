package ma.elearning.user;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "users")
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "user_type")
public abstract class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 120) private String nom;
    @Column(nullable = false, unique = true, length = 190) private String email;
    @Column(length = 30) private String telephone;
    @Column(name = "password_hash", nullable = false, length = 100) private String passwordHash;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private Role role;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private AccountStatus statut;
    @Column(name = "created_at", insertable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", insertable = false, updatable = false) private Instant updatedAt;
    @Column(name = "suspension_reason", length = 500) private String suspensionReason;
    @Column(name = "suspended_at") private Instant suspendedAt;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "suspension_admin_id") private Admin suspensionAdmin;
    @Column(name = "deleted_at") private Instant deletedAt;
    @Column(name = "anonymized_at") private Instant anonymizedAt;
    @Column(name = "lifecycle_version", nullable = false) private long lifecycleVersion;

    public Long getId() { return id; }
    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getTelephone() { return telephone; }
    public void setTelephone(String telephone) { this.telephone = telephone; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
    public AccountStatus getStatut() { return statut; }
    public void setStatut(AccountStatus statut) { this.statut = statut; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public String getSuspensionReason() { return suspensionReason; }
    public void setSuspensionReason(String suspensionReason) { this.suspensionReason = suspensionReason; }
    public Instant getSuspendedAt() { return suspendedAt; }
    public void setSuspendedAt(Instant suspendedAt) { this.suspendedAt = suspendedAt; }
    public Admin getSuspensionAdmin() { return suspensionAdmin; }
    public void setSuspensionAdmin(Admin suspensionAdmin) { this.suspensionAdmin = suspensionAdmin; }
    public Instant getDeletedAt() { return deletedAt; }
    public void setDeletedAt(Instant deletedAt) { this.deletedAt = deletedAt; }
    public Instant getAnonymizedAt() { return anonymizedAt; }
    public void setAnonymizedAt(Instant anonymizedAt) { this.anonymizedAt = anonymizedAt; }
    public long getLifecycleVersion() { return lifecycleVersion; }
    public void incrementLifecycleVersion() { this.lifecycleVersion++; }
}
