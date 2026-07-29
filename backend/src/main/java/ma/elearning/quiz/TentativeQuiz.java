package ma.elearning.quiz;
import jakarta.persistence.*;
import ma.elearning.learning.Inscription;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.Instant;
@Entity @Table(name="tentatives_quiz")
public class TentativeQuiz {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="quiz_id") private Quiz quiz;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="inscription_id") private Inscription inscription;
 @CreationTimestamp @Column(name="date_passage",updatable=false) private Instant datePassage;
 @Column(name="date_soumission") private Instant dateSoumission;
 @Enumerated(EnumType.STRING) @Column(nullable=false) private TentativeStatut statut=TentativeStatut.EN_COURS;
 private BigDecimal score; @Column(name="score_maximal") private BigDecimal scoreMaximal; private Boolean reussi;
 public Long getId(){return id;} public Quiz getQuiz(){return quiz;} public void setQuiz(Quiz v){quiz=v;} public void setInscription(Inscription v){inscription=v;}
 public Instant getDatePassage(){return datePassage;} public TentativeStatut getStatut(){return statut;} public BigDecimal getScore(){return score;}
 public void submit(BigDecimal score,BigDecimal max,boolean passed){this.score=score;scoreMaximal=max;reussi=passed;statut=TentativeStatut.SOUMISE;dateSoumission=Instant.now();}
 public BigDecimal getScoreMaximal(){return scoreMaximal;} public Boolean getReussi(){return reussi;}
}
