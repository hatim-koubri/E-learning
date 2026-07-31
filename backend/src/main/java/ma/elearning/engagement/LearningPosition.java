package ma.elearning.engagement;

import jakarta.persistence.*;
import ma.elearning.formation.*;
import ma.elearning.user.Participant;

import java.time.Instant;

@Entity
@Table(name = "positions_apprentissage", uniqueConstraints = @UniqueConstraint(
        name = "uk_positions_participant_formation", columnNames = {"participant_id", "formation_id"}))
public class LearningPosition {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "participant_id")
    private Participant participant;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "formation_id")
    private Formation formation;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "module_id")
    private FormationModule module;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "chapitre_id")
    private Chapitre chapitre;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "ressource_id")
    private RessourcePedagogique ressource;
    @Column(name = "consulted_at", nullable = false)
    private Instant consultedAt;

    public Long getId() { return id; }
    public Participant getParticipant() { return participant; }
    public void setParticipant(Participant value) { participant = value; }
    public Formation getFormation() { return formation; }
    public void setFormation(Formation value) { formation = value; }
    public FormationModule getModule() { return module; }
    public void setModule(FormationModule value) { module = value; }
    public Chapitre getChapitre() { return chapitre; }
    public void setChapitre(Chapitre value) { chapitre = value; }
    public RessourcePedagogique getRessource() { return ressource; }
    public void setRessource(RessourcePedagogique value) { ressource = value; }
    public Instant getConsultedAt() { return consultedAt; }
    public void setConsultedAt(Instant value) { consultedAt = value; }
}
