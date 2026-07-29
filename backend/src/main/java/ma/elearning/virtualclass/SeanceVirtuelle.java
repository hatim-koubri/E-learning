package ma.elearning.virtualclass;
import jakarta.persistence.*; import java.time.*;
@Entity @Table(name="seances_virtuelles")
public class SeanceVirtuelle {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="classe_id") private Classe classe;
 @Column(nullable=false,length=180) private String titre; @Column(name="date_debut",nullable=false) private Instant dateDebut;
 @Column(name="date_fin",nullable=false) private Instant dateFin; @Column(name="fuseau_horaire",nullable=false,length=60) private String fuseauHoraire;
 @Column(name="identifiant_salle",nullable=false,unique=true,length=100) private String identifiantSalle;
 @Column(nullable=false,length=20) private String statut="PLANIFIEE";
 public Long getId(){return id;} public Classe getClasse(){return classe;} public void setClasse(Classe v){classe=v;}
 public String getTitre(){return titre;} public void setTitre(String v){titre=v;} public Instant getDateDebut(){return dateDebut;}
 public void setDateDebut(Instant v){dateDebut=v;} public Instant getDateFin(){return dateFin;} public void setDateFin(Instant v){dateFin=v;}
 public String getFuseauHoraire(){return fuseauHoraire;} public void setFuseauHoraire(String v){fuseauHoraire=v;}
 public String getIdentifiantSalle(){return identifiantSalle;} public void setIdentifiantSalle(String v){identifiantSalle=v;}
 public String getStatut(){return statut;} public void setStatut(String v){statut=v;}
}
