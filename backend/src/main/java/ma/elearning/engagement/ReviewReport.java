package ma.elearning.engagement;

import jakarta.persistence.*;
import ma.elearning.user.Admin;
import ma.elearning.user.Participant;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "signalements_avis", uniqueConstraints = @UniqueConstraint(
        name = "uk_signalements_participant_avis", columnNames = {"participant_id", "avis_id"}))
public class ReviewReport {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "avis_id")
    private CourseReview review;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "participant_id")
    private Participant participant;
    @Column(nullable = false, length = 500)
    private String motif;
    @Enumerated(EnumType.STRING)
    @Column(name = "statut_traitement", nullable = false, length = 30)
    private ReviewReportStatus statutTraitement = ReviewReportStatus.EN_ATTENTE;
    @Enumerated(EnumType.STRING)
    @Column(name = "decision_moderation", length = 20)
    private ReviewModerationDecision decision;
    @Column(name = "decided_at")
    private Instant decidedAt;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "decision_admin_id")
    private Admin decisionAdmin;
    @CreationTimestamp @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    public Long getId() { return id; }
    public CourseReview getReview() { return review; }
    public void setReview(CourseReview value) { review = value; }
    public Participant getParticipant() { return participant; }
    public void setParticipant(Participant value) { participant = value; }
    public String getMotif() { return motif; }
    public void setMotif(String value) { motif = value; }
    public ReviewReportStatus getStatutTraitement() { return statutTraitement; }
    public void setStatutTraitement(ReviewReportStatus value) { statutTraitement = value; }
    public ReviewModerationDecision getDecision() { return decision; }
    public void setDecision(ReviewModerationDecision value) { decision = value; }
    public Instant getDecidedAt() { return decidedAt; }
    public void setDecidedAt(Instant value) { decidedAt = value; }
    public Admin getDecisionAdmin() { return decisionAdmin; }
    public void setDecisionAdmin(Admin value) { decisionAdmin = value; }
    public Instant getCreatedAt() { return createdAt; }
}
