package ma.elearning.engagement;

import jakarta.persistence.*;
import ma.elearning.user.Participant;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "objectifs_hebdomadaires")
public class WeeklyGoal {
    @Id @Column(name = "participant_id")
    private Long participantId;
    @OneToOne(fetch = FetchType.LAZY, optional = false) @MapsId @JoinColumn(name = "participant_id")
    private Participant participant;
    @Column(name = "minutes_cible", nullable = false)
    private int minutesCible = 60;
    @Column(name = "fuseau_horaire", nullable = false, length = 60)
    private String fuseauHoraire = "Africa/Casablanca";
    @UpdateTimestamp @Column(name = "updated_at")
    private Instant updatedAt;

    public Participant getParticipant() { return participant; }
    public void setParticipant(Participant value) { participant = value; }
    public int getMinutesCible() { return minutesCible; }
    public void setMinutesCible(int value) { minutesCible = value; }
    public String getFuseauHoraire() { return fuseauHoraire; }
    public void setFuseauHoraire(String value) { fuseauHoraire = value; }
}
