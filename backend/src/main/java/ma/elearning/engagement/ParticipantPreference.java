package ma.elearning.engagement;

import jakarta.persistence.*;
import ma.elearning.formation.NiveauFormation;
import ma.elearning.user.Participant;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "participant_preferences")
public class ParticipantPreference {
    @Id
    @Column(name = "participant_id")
    private Long participantId;
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId
    @JoinColumn(name = "participant_id")
    private Participant participant;
    @Column(nullable = false, length = 600)
    private String domaines = "";
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private NiveauFormation niveau = NiveauFormation.DEBUTANT;
    @Column(nullable = false, length = 300)
    private String objectif = "";
    @Column(name = "minutes_hebdomadaires", nullable = false)
    private int minutesHebdomadaires = 60;
    @Enumerated(EnumType.STRING)
    @Column(name = "format_prefere", nullable = false, length = 30)
    private PreferenceFormat formatPrefere = PreferenceFormat.PRATIQUE;
    @Column(name = "rappels_actifs", nullable = false)
    private boolean rappelsActifs;
    @Column(name = "onboarding_termine", nullable = false)
    private boolean onboardingTermine;
    @Column(name = "onboarding_ignore", nullable = false)
    private boolean onboardingIgnore;
    @Column(name = "fuseau_horaire", nullable = false, length = 60)
    private String fuseauHoraire = "Africa/Casablanca";
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Participant getParticipant() { return participant; }
    public void setParticipant(Participant participant) { this.participant = participant; }
    public String getDomaines() { return domaines; }
    public void setDomaines(String domaines) { this.domaines = domaines; }
    public NiveauFormation getNiveau() { return niveau; }
    public void setNiveau(NiveauFormation niveau) { this.niveau = niveau; }
    public String getObjectif() { return objectif; }
    public void setObjectif(String objectif) { this.objectif = objectif; }
    public int getMinutesHebdomadaires() { return minutesHebdomadaires; }
    public void setMinutesHebdomadaires(int value) { this.minutesHebdomadaires = value; }
    public PreferenceFormat getFormatPrefere() { return formatPrefere; }
    public void setFormatPrefere(PreferenceFormat value) { this.formatPrefere = value; }
    public boolean isRappelsActifs() { return rappelsActifs; }
    public void setRappelsActifs(boolean value) { this.rappelsActifs = value; }
    public boolean isOnboardingTermine() { return onboardingTermine; }
    public void setOnboardingTermine(boolean value) { this.onboardingTermine = value; }
    public boolean isOnboardingIgnore() { return onboardingIgnore; }
    public void setOnboardingIgnore(boolean value) { this.onboardingIgnore = value; }
    public String getFuseauHoraire() { return fuseauHoraire; }
    public void setFuseauHoraire(String value) { this.fuseauHoraire = value; }
}
