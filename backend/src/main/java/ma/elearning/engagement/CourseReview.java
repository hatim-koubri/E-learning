package ma.elearning.engagement;

import jakarta.persistence.*;
import ma.elearning.formation.Formation;
import ma.elearning.user.Participant;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "avis_formations", uniqueConstraints = @UniqueConstraint(
        name = "uk_avis_participant_formation", columnNames = {"participant_id", "formation_id"}))
public class CourseReview {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "participant_id")
    private Participant participant;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "formation_id")
    private Formation formation;
    @Column(nullable = false, columnDefinition = "TINYINT")
    private int note;
    @Column(nullable = false, length = 2000)
    private String commentaire;
    @Enumerated(EnumType.STRING) @Column(name = "statut_moderation", nullable = false, length = 20)
    private ReviewStatus statut = ReviewStatus.PUBLIE;
    @Column(name = "reponse_formateur", length = 2000)
    private String reponseFormateur;
    @Column(name = "responded_at")
    private Instant respondedAt;
    @CreationTimestamp @Column(name = "created_at", updatable = false)
    private Instant createdAt;
    @UpdateTimestamp @Column(name = "updated_at")
    private Instant updatedAt;

    public Long getId() { return id; }
    public Participant getParticipant() { return participant; }
    public void setParticipant(Participant value) { participant = value; }
    public Formation getFormation() { return formation; }
    public void setFormation(Formation value) { formation = value; }
    public int getNote() { return note; }
    public void setNote(int value) { note = value; }
    public String getCommentaire() { return commentaire; }
    public void setCommentaire(String value) { commentaire = value; }
    public ReviewStatus getStatut() { return statut; }
    public void setStatut(ReviewStatus value) { statut = value; }
    public String getReponseFormateur() { return reponseFormateur; }
    public void setReponseFormateur(String value) { reponseFormateur = value; respondedAt = Instant.now(); }
    public Instant getRespondedAt() { return respondedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
