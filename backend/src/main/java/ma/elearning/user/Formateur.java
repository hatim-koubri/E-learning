package ma.elearning.user;

import jakarta.persistence.*;
import java.time.Instant;

@Entity @DiscriminatorValue("FORMATEUR")
public class Formateur extends User {
    @Column(name = "motif_refus", length = 500) private String motifRefus;
    @Column(name = "date_decision") private Instant dateDecision;
    @Column(length = 160) private String specialite;
    @Lob @Column(columnDefinition = "text") private String biographie;
    public String getMotifRefus() { return motifRefus; }
    public void setMotifRefus(String motifRefus) { this.motifRefus = motifRefus; }
    public Instant getDateDecision() { return dateDecision; }
    public void setDateDecision(Instant dateDecision) { this.dateDecision = dateDecision; }
    public String getSpecialite() { return specialite; }
    public void setSpecialite(String specialite) { this.specialite = specialite; }
    public String getBiographie() { return biographie; }
    public void setBiographie(String biographie) { this.biographie = biographie; }
}
