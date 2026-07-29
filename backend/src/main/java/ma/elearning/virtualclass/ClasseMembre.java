package ma.elearning.virtualclass;
import jakarta.persistence.*; import ma.elearning.user.Participant; import java.time.Instant;
@Entity @Table(name="classe_membres",uniqueConstraints=@UniqueConstraint(columnNames={"classe_id","participant_id"}))
public class ClasseMembre {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="classe_id") private Classe classe;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="participant_id") private Participant participant;
 @Column(nullable=false,length=20) private String statut="ACCEPTE"; @Column(name="invited_at",insertable=false,updatable=false) private Instant invitedAt;
 public Long getId(){return id;} public Classe getClasse(){return classe;} public void setClasse(Classe v){classe=v;}
 public Participant getParticipant(){return participant;} public void setParticipant(Participant v){participant=v;} public String getStatut(){return statut;}
}
