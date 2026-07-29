package ma.elearning.quiz;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
@Entity @Table(name="questions", uniqueConstraints=@UniqueConstraint(name="uk_questions_quiz_ordre",columnNames={"quiz_id","ordre"}))
public class Question {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="quiz_id") private Quiz quiz;
 @Lob @Column(nullable=false,columnDefinition="text") private String libelle;
 @Column(nullable=false) private int ordre;
 @Column(nullable=false,precision=6,scale=2) private BigDecimal points;
 @OneToMany(mappedBy="question",cascade=CascadeType.ALL,orphanRemoval=true) @OrderBy("ordre ASC") private List<ReponseProposee> reponses=new ArrayList<>();
 public Long getId(){return id;} public Quiz getQuiz(){return quiz;} public void setQuiz(Quiz v){quiz=v;} public String getLibelle(){return libelle;} public void setLibelle(String v){libelle=v;}
 public int getOrdre(){return ordre;} public void setOrdre(int v){ordre=v;} public BigDecimal getPoints(){return points;} public void setPoints(BigDecimal v){points=v;} public List<ReponseProposee> getReponses(){return reponses;}
}
