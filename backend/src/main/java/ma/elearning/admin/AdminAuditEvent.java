package ma.elearning.admin;

import jakarta.persistence.*;
import ma.elearning.user.Admin;

import java.time.Instant;

@Entity
@Table(name = "admin_audit_events")
public class AdminAuditEvent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "actor_admin_id", nullable = false)
    private Admin actor;
    @Column(name = "target_type", nullable = false, length = 40) private String targetType;
    @Column(name = "target_id") private Long targetId;
    @Column(nullable = false, length = 60) private String action;
    @Column(nullable = false, length = 30) private String result;
    @Column(length = 500) private String reason;
    @Column(name = "previous_status", length = 30) private String previousStatus;
    @Column(name = "new_status", length = 30) private String newStatus;
    @Column(name = "before_snapshot", length = 1000) private String beforeSnapshot;
    @Column(name = "after_snapshot", length = 1000) private String afterSnapshot;
    @Column(name = "occurred_at", nullable = false) private Instant occurredAt;

    protected AdminAuditEvent() {}

    public AdminAuditEvent(Admin actor, String targetType, Long targetId, String action, String result,
                           String reason, String previousStatus, String newStatus,
                           String beforeSnapshot, String afterSnapshot, Instant occurredAt) {
        this.actor = actor; this.targetType = targetType; this.targetId = targetId;
        this.action = action; this.result = result; this.reason = reason;
        this.previousStatus = previousStatus; this.newStatus = newStatus;
        this.beforeSnapshot = beforeSnapshot; this.afterSnapshot = afterSnapshot;
        this.occurredAt = occurredAt;
    }

    public Long getId() { return id; }
    public Admin getActor() { return actor; }
    public String getTargetType() { return targetType; }
    public Long getTargetId() { return targetId; }
    public String getAction() { return action; }
    public String getResult() { return result; }
    public String getReason() { return reason; }
    public String getPreviousStatus() { return previousStatus; }
    public String getNewStatus() { return newStatus; }
    public String getBeforeSnapshot() { return beforeSnapshot; }
    public String getAfterSnapshot() { return afterSnapshot; }
    public Instant getOccurredAt() { return occurredAt; }
}
