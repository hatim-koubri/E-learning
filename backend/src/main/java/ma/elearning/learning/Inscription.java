package ma.elearning.learning;

import jakarta.persistence.*;
import ma.elearning.formation.Formation;
import ma.elearning.user.Participant;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "inscriptions", uniqueConstraints = @UniqueConstraint(
        name = "uk_inscriptions_participant_formation", columnNames = {"participant_id", "formation_id"}))
public class Inscription {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "participant_id") private Participant participant;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "formation_id") private Formation formation;
    @CreationTimestamp @Column(name = "date_inscription", nullable = false, updatable = false) private Instant dateInscription;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private InscriptionStatut statut = InscriptionStatut.ACTIVE;
    @Enumerated(EnumType.STRING) @Column(name = "type_acces", nullable = false) private TypeAcces typeAcces = TypeAcces.CONTENU;
    @Column(nullable = false, precision = 5, scale = 2) private BigDecimal progression = BigDecimal.ZERO;
    @Column(name = "prix_paye", nullable = false, precision = 10, scale = 2) private BigDecimal prixPaye;
    @Column(nullable = false, length = 3) private String devise = "DH";
    @Enumerated(EnumType.STRING) @Column(name = "mode_paiement", nullable = false) private ModePaiement modePaiement = ModePaiement.SIMULATION;

    public Long getId() { return id; }
    public Participant getParticipant() { return participant; }
    public void setParticipant(Participant participant) { this.participant = participant; }
    public Formation getFormation() { return formation; }
    public void setFormation(Formation formation) { this.formation = formation; }
    public Instant getDateInscription() { return dateInscription; }
    public InscriptionStatut getStatut() { return statut; }
    public TypeAcces getTypeAcces() { return typeAcces; }
    public void setTypeAcces(TypeAcces typeAcces) { this.typeAcces = typeAcces; }
    public BigDecimal getProgression() { return progression; }
    public void setProgression(BigDecimal progression) { this.progression = progression; }
    public BigDecimal getPrixPaye() { return prixPaye; }
    public void setPrixPaye(BigDecimal prixPaye) { this.prixPaye = prixPaye; }
    public String getDevise() { return devise; }
    public ModePaiement getModePaiement() { return modePaiement; }
}
