package ma.elearning.engagement;

import jakarta.persistence.*;
import ma.elearning.formation.Formation;
import ma.elearning.user.Participant;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "activites_apprentissage", uniqueConstraints = @UniqueConstraint(
        name = "uk_activites_source", columnNames = {"participant_id", "type_activite", "source_key"}))
public class LearningActivity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "participant_id")
    private Participant participant;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "formation_id")
    private Formation formation;
    @Enumerated(EnumType.STRING) @Column(name = "type_activite", nullable = false, length = 30)
    private ActivityType type;
    @Column(name = "minutes_validees", nullable = false)
    private int minutesValidees;
    @Column(name = "source_key", nullable = false, length = 160)
    private String sourceKey;
    @CreationTimestamp @Column(name = "occurred_at", updatable = false)
    private Instant occurredAt;

    public Long getId() { return id; }
    public Participant getParticipant() { return participant; }
    public void setParticipant(Participant value) { participant = value; }
    public Formation getFormation() { return formation; }
    public void setFormation(Formation value) { formation = value; }
    public ActivityType getType() { return type; }
    public void setType(ActivityType value) { type = value; }
    public int getMinutesValidees() { return minutesValidees; }
    public void setMinutesValidees(int value) { minutesValidees = value; }
    public String getSourceKey() { return sourceKey; }
    public void setSourceKey(String value) { sourceKey = value; }
    public Instant getOccurredAt() { return occurredAt; }
}
