package ma.elearning.virtualclass;
import jakarta.persistence.*; import ma.elearning.formation.Formation; import java.time.*; import java.util.*;
@Entity @Table(name="classes")
public class Classe {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="formation_id") private Formation formation;
 @Column(nullable=false,length=180) private String nom; @Lob @Column(columnDefinition="text") private String description;
 @Column(nullable=false) private int capacite; @Column(name="date_debut",nullable=false) private LocalDate dateDebut;
 @Column(name="date_fin",nullable=false) private LocalDate dateFin; @Column(nullable=false,length=20) private String statut="ACTIVE";
 @OneToMany(mappedBy="classe") @OrderBy("dateDebut ASC") private List<SeanceVirtuelle> seances=new ArrayList<>();
 public Long getId(){return id;} public Formation getFormation(){return formation;} public void setFormation(Formation v){formation=v;}
 public String getNom(){return nom;} public void setNom(String v){nom=v;} public String getDescription(){return description;}
 public void setDescription(String v){description=v;} public int getCapacite(){return capacite;} public void setCapacite(int v){capacite=v;}
 public LocalDate getDateDebut(){return dateDebut;} public void setDateDebut(LocalDate v){dateDebut=v;}
 public LocalDate getDateFin(){return dateFin;} public void setDateFin(LocalDate v){dateFin=v;} public String getStatut(){return statut;}
 public List<SeanceVirtuelle> getSeances(){return seances;}
}
