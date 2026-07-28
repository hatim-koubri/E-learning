package ma.elearning.formation;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "modules", uniqueConstraints = @UniqueConstraint(
        name = "uk_modules_formation_position", columnNames = {"formation_id", "position"}))
public class FormationModule {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "formation_id", nullable = false)
    private Formation formation;
    @Column(nullable = false, length = 180)
    private String titre;
    @Lob @Column(columnDefinition = "text")
    private String description;
    @Column(nullable = false)
    private int position;
    @Column(name = "apercu_gratuit", nullable = false)
    private boolean apercuGratuit;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @UpdateTimestamp @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
    @OneToMany(mappedBy = "module", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<Chapitre> chapitres = new ArrayList<>();

    public Long getId() { return id; }
    public Formation getFormation() { return formation; }
    public void setFormation(Formation formation) { this.formation = formation; }
    public String getTitre() { return titre; }
    public void setTitre(String titre) { this.titre = titre; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }
    public boolean isApercuGratuit() { return apercuGratuit; }
    public void setApercuGratuit(boolean apercuGratuit) { this.apercuGratuit = apercuGratuit; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public List<Chapitre> getChapitres() { return chapitres; }
}
