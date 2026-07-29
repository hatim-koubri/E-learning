package ma.elearning.learning;

import jakarta.persistence.*;
import ma.elearning.formation.Chapitre;
import java.time.Instant;

@Entity
@Table(name = "progressions_chapitres", uniqueConstraints = @UniqueConstraint(
        name = "uk_progressions_inscription_chapitre", columnNames = {"inscription_id", "chapitre_id"}))
public class ProgressionChapitre {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "inscription_id") private Inscription inscription;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "chapitre_id") private Chapitre chapitre;
    @Column(nullable = false) private boolean termine;
    @Column(name = "position_video_secondes", nullable = false) private int positionVideoSecondes;
    @Column(name = "termine_le") private Instant termineLe;
    public void setInscription(Inscription inscription) { this.inscription = inscription; }
    public void setChapitre(Chapitre chapitre) { this.chapitre = chapitre; }
    public Chapitre getChapitre() { return chapitre; }
    public boolean isTermine() { return termine; }
    public void setTermine(boolean termine) { this.termine = termine; this.termineLe = termine ? Instant.now() : null; }
    public int getPositionVideoSecondes() { return positionVideoSecondes; }
    public void setPositionVideoSecondes(int value) { this.positionVideoSecondes = value; }
}
