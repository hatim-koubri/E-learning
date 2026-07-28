package ma.elearning.formation;

import jakarta.persistence.*;
import ma.elearning.user.Formateur;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "formations")
public class Formation {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "formateur_id", nullable = false)
    private Formateur formateur;
    @Column(nullable = false, length = 180)
    private String titre;
    @Lob @Column(nullable = false, columnDefinition = "text")
    private String description;
    @Column(name = "image_couverture_key", length = 512)
    private String imageCouvertureKey;
    @Column(nullable = false, length = 10)
    private String langue;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private NiveauFormation niveau;
    @Column(nullable = false, length = 120)
    private String categorie;
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal prix;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private FormationStatus statut = FormationStatus.BROUILLON;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @UpdateTimestamp @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
    @OneToMany(mappedBy = "formation", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<FormationModule> modules = new ArrayList<>();

    public Long getId() { return id; }
    public Formateur getFormateur() { return formateur; }
    public void setFormateur(Formateur formateur) { this.formateur = formateur; }
    public String getTitre() { return titre; }
    public void setTitre(String titre) { this.titre = titre; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getImageCouvertureKey() { return imageCouvertureKey; }
    public void setImageCouvertureKey(String imageCouvertureKey) { this.imageCouvertureKey = imageCouvertureKey; }
    public String getLangue() { return langue; }
    public void setLangue(String langue) { this.langue = langue; }
    public NiveauFormation getNiveau() { return niveau; }
    public void setNiveau(NiveauFormation niveau) { this.niveau = niveau; }
    public String getCategorie() { return categorie; }
    public void setCategorie(String categorie) { this.categorie = categorie; }
    public BigDecimal getPrix() { return prix; }
    public void setPrix(BigDecimal prix) { this.prix = prix; }
    public FormationStatus getStatut() { return statut; }
    public void setStatut(FormationStatus statut) { this.statut = statut; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public List<FormationModule> getModules() { return modules; }
}
