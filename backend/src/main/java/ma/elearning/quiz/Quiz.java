package ma.elearning.quiz;

import jakarta.persistence.*;
import ma.elearning.formation.Formation;
import ma.elearning.formation.Chapitre;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity @Table(name = "quiz", uniqueConstraints = @UniqueConstraint(
        name = "uk_quiz_formation_ordre", columnNames = {"formation_id", "ordre"}))
public class Quiz {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "formation_id") private Formation formation;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "chapitre_id") private Chapitre chapitre;
    @Column(nullable = false, length = 180) private String titre;
    @Column(nullable = false) private int ordre;
    @Column(name = "score_minimal", nullable = false, precision = 5, scale = 2) private BigDecimal scoreMinimal;
    @Column(nullable = false) private boolean important;
    @Column(nullable = false) private boolean publie;
    @CreationTimestamp @Column(name = "created_at", updatable = false) private Instant createdAt;
    @UpdateTimestamp @Column(name = "updated_at") private Instant updatedAt;
    @OneToMany(mappedBy = "quiz", cascade = CascadeType.ALL, orphanRemoval = true) @OrderBy("ordre ASC")
    private List<Question> questions = new ArrayList<>();
    public Long getId(){return id;} public Formation getFormation(){return formation;} public void setFormation(Formation v){formation=v;}
    public Chapitre getChapitre(){return chapitre;} public void setChapitre(Chapitre v){chapitre=v;}
    public String getTitre(){return titre;} public void setTitre(String v){titre=v;} public int getOrdre(){return ordre;} public void setOrdre(int v){ordre=v;}
    public BigDecimal getScoreMinimal(){return scoreMinimal;} public void setScoreMinimal(BigDecimal v){scoreMinimal=v;}
    public boolean isImportant(){return important;} public void setImportant(boolean v){important=v;} public boolean isPublie(){return publie;} public void setPublie(boolean v){publie=v;}
    public List<Question> getQuestions(){return questions;}
}
