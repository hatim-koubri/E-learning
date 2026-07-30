package ma.elearning.engagement;

import jakarta.persistence.*;
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
    @CreationTimestamp @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    public Long getId() { return id; }
    public CourseReview getReview() { return review; }
    public void setReview(CourseReview value) { review = value; }
    public Participant getParticipant() { return participant; }
    public void setParticipant(Participant value) { participant = value; }
    public String getMotif() { return motif; }
    public void setMotif(String value) { motif = value; }
    public Instant getCreatedAt() { return createdAt; }
}
