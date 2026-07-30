package ma.elearning.engagement;

import jakarta.persistence.*;
import ma.elearning.formation.Formation;
import ma.elearning.user.Participant;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "favoris_formations", uniqueConstraints = @UniqueConstraint(
        name = "uk_favoris_participant_formation", columnNames = {"participant_id", "formation_id"}))
public class Favorite {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "participant_id")
    private Participant participant;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "formation_id")
    private Formation formation;
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    public Long getId() { return id; }
    public Participant getParticipant() { return participant; }
    public void setParticipant(Participant value) { participant = value; }
    public Formation getFormation() { return formation; }
    public void setFormation(Formation value) { formation = value; }
    public Instant getCreatedAt() { return createdAt; }
}
