package ma.elearning.formation;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "ressources_pedagogiques", uniqueConstraints = @UniqueConstraint(
        name = "uk_ressources_chapitre_position", columnNames = {"chapitre_id", "position"}))
public class RessourcePedagogique {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "chapitre_id", nullable = false)
    private Chapitre chapitre;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private ResourceType type;
    @Column(nullable = false, length = 180)
    private String titre;
    @Column(nullable = false)
    private int position;
    @Column(name = "nom_original", length = 255)
    private String nomOriginal;
    @Column(name = "type_mime", length = 120)
    private String typeMime;
    private Long taille;
    @Column(name = "cle_stockage", length = 512)
    private String cleStockage;
    @Column(name = "url_youtube", length = 500)
    private String urlYoutube;
    @Column(nullable = false)
    private boolean telechargeable;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private ResourceStatus statut = ResourceStatus.DISPONIBLE;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @UpdateTimestamp @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Long getId() { return id; }
    public Chapitre getChapitre() { return chapitre; }
    public void setChapitre(Chapitre chapitre) { this.chapitre = chapitre; }
    public ResourceType getType() { return type; }
    public void setType(ResourceType type) { this.type = type; }
    public String getTitre() { return titre; }
    public void setTitre(String titre) { this.titre = titre; }
    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }
    public String getNomOriginal() { return nomOriginal; }
    public void setNomOriginal(String nomOriginal) { this.nomOriginal = nomOriginal; }
    public String getTypeMime() { return typeMime; }
    public void setTypeMime(String typeMime) { this.typeMime = typeMime; }
    public Long getTaille() { return taille; }
    public void setTaille(Long taille) { this.taille = taille; }
    public String getCleStockage() { return cleStockage; }
    public void setCleStockage(String cleStockage) { this.cleStockage = cleStockage; }
    public String getUrlYoutube() { return urlYoutube; }
    public void setUrlYoutube(String urlYoutube) { this.urlYoutube = urlYoutube; }
    public boolean isTelechargeable() { return telechargeable; }
    public void setTelechargeable(boolean telechargeable) { this.telechargeable = telechargeable; }
    public ResourceStatus getStatut() { return statut; }
    public void setStatut(ResourceStatus statut) { this.statut = statut; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
