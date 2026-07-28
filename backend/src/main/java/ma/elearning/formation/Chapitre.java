package ma.elearning.formation;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "chapitres", uniqueConstraints = @UniqueConstraint(
        name = "uk_chapitres_module_position", columnNames = {"module_id", "position"}))
public class Chapitre {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "module_id", nullable = false)
    private FormationModule module;
    @Column(nullable = false, length = 180)
    private String titre;
    @Lob @Column(columnDefinition = "text")
    private String description;
    @Column(nullable = false)
    private int position;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @UpdateTimestamp @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
    @OneToMany(mappedBy = "chapitre", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<RessourcePedagogique> ressources = new ArrayList<>();

    public Long getId() { return id; }
    public FormationModule getModule() { return module; }
    public void setModule(FormationModule module) { this.module = module; }
    public String getTitre() { return titre; }
    public void setTitre(String titre) { this.titre = titre; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public List<RessourcePedagogique> getRessources() { return ressources; }
}
