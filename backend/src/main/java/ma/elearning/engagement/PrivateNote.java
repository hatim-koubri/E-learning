package ma.elearning.engagement;

import jakarta.persistence.*;
import ma.elearning.formation.*;
import ma.elearning.user.Participant;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "notes_privees")
public class PrivateNote {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "participant_id")
    private Participant participant;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "formation_id")
    private Formation formation;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "chapitre_id")
    private Chapitre chapitre;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "ressource_id")
    private RessourcePedagogique ressource;
    @Lob @Column(columnDefinition = "text")
    private String contenu;
    @Column(nullable = false)
    private boolean signet;
    @CreationTimestamp @Column(name = "created_at", updatable = false)
    private Instant createdAt;
    @UpdateTimestamp @Column(name = "updated_at")
    private Instant updatedAt;

    public Long getId() { return id; }
    public Participant getParticipant() { return participant; }
    public void setParticipant(Participant value) { participant = value; }
    public Formation getFormation() { return formation; }
    public void setFormation(Formation value) { formation = value; }
    public Chapitre getChapitre() { return chapitre; }
    public void setChapitre(Chapitre value) { chapitre = value; }
    public RessourcePedagogique getRessource() { return ressource; }
    public void setRessource(RessourcePedagogique value) { ressource = value; }
    public String getContenu() { return contenu; }
    public void setContenu(String value) { contenu = value; }
    public boolean isSignet() { return signet; }
    public void setSignet(boolean value) { signet = value; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
