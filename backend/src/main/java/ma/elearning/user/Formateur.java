package ma.elearning.user;

import jakarta.persistence.*;
import java.time.Instant;

@Entity @DiscriminatorValue("FORMATEUR")
public class Formateur extends User {
    @Column(name = "motif_refus", length = 500) private String motifRefus;
    @Column(name = "date_decision") private Instant dateDecision;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "decision_admin_id") private Admin decisionAdmin;
    @Enumerated(EnumType.STRING) @Column(name = "decision_result", length = 20)
    private FormateurDecision decisionResult;
    @Column(length = 160) private String specialite;
    @Lob @Column(columnDefinition = "text") private String biographie;
    public String getMotifRefus() { return motifRefus; }
    public void setMotifRefus(String motifRefus) { this.motifRefus = motifRefus; }
    public Instant getDateDecision() { return dateDecision; }
    public void setDateDecision(Instant dateDecision) { this.dateDecision = dateDecision; }
    public Admin getDecisionAdmin() { return decisionAdmin; }
    public void setDecisionAdmin(Admin value) { decisionAdmin = value; }
    public FormateurDecision getDecisionResult() { return decisionResult; }
    public void setDecisionResult(FormateurDecision value) { decisionResult = value; }
    public String getSpecialite() { return specialite; }
    public void setSpecialite(String specialite) { this.specialite = specialite; }
    public String getBiographie() { return biographie; }
    public void setBiographie(String biographie) { this.biographie = biographie; }
}
