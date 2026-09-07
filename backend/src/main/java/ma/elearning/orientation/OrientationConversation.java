package ma.elearning.orientation;

import jakarta.persistence.*;
import ma.elearning.user.Participant;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "orientation_conversations")
public class OrientationConversation {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "participant_id") private Participant participant;
    @Column(name = "session_id", nullable = false, length = 64) private String sessionId;
    @Column(nullable = false, length = 180) private String titre = "Nouvelle orientation";
    @Column(nullable = false, length = 20) private String statut = "ACTIVE";
    @Column(length = 500) private String objectif;
    @Column(length = 30) private String niveau;
    @Column(length = 1000) private String competences;
    @Column(length = 20) private String langue;
    @Column(precision = 10, scale = 2) private BigDecimal budget;
    @Column(name = "minutes_hebdomadaires") private Integer minutesHebdomadaires;
    @Column(name = "format_pedagogique", length = 40) private String formatPedagogique;
    @Column(name = "besoin_classes") private Boolean besoinClasses;
    @Version private long version;
    @CreationTimestamp @Column(name="created_at", nullable=false, updatable=false) private Instant createdAt;
    @UpdateTimestamp @Column(name="updated_at", nullable=false) private Instant updatedAt;

    public Long getId(){return id;} public Participant getParticipant(){return participant;} public void setParticipant(Participant v){participant=v;}
    public String getSessionId(){return sessionId;} public void setSessionId(String v){sessionId=v;} public String getTitre(){return titre;} public void setTitre(String v){titre=v;}
    public String getStatut(){return statut;} public void setStatut(String v){statut=v;} public String getObjectif(){return objectif;} public void setObjectif(String v){objectif=v;}
    public String getNiveau(){return niveau;} public void setNiveau(String v){niveau=v;} public String getCompetences(){return competences;} public void setCompetences(String v){competences=v;}
    public String getLangue(){return langue;} public void setLangue(String v){langue=v;} public BigDecimal getBudget(){return budget;} public void setBudget(BigDecimal v){budget=v;}
    public Integer getMinutesHebdomadaires(){return minutesHebdomadaires;} public void setMinutesHebdomadaires(Integer v){minutesHebdomadaires=v;}
    public String getFormatPedagogique(){return formatPedagogique;} public void setFormatPedagogique(String v){formatPedagogique=v;}
    public Boolean getBesoinClasses(){return besoinClasses;} public void setBesoinClasses(Boolean v){besoinClasses=v;}
    public Instant getCreatedAt(){return createdAt;} public Instant getUpdatedAt(){return updatedAt;}
}
