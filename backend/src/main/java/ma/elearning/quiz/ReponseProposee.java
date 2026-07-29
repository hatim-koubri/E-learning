package ma.elearning.quiz;
import jakarta.persistence.*;
@Entity @Table(name="reponses_proposees",uniqueConstraints=@UniqueConstraint(name="uk_reponses_question_ordre",columnNames={"question_id","ordre"}))
public class ReponseProposee {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="question_id") private Question question;
 @Column(nullable=false,length=1000) private String libelle;
 @Column(nullable=false) private boolean correcte;
 @Column(nullable=false) private int ordre;
 public Long getId(){return id;} public Question getQuestion(){return question;} public void setQuestion(Question v){question=v;} public String getLibelle(){return libelle;} public void setLibelle(String v){libelle=v;}
 public boolean isCorrecte(){return correcte;} public void setCorrecte(boolean v){correcte=v;} public int getOrdre(){return ordre;} public void setOrdre(int v){ordre=v;}
}
