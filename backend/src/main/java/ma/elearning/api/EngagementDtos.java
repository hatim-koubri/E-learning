package ma.elearning.api;

import jakarta.validation.constraints.*;
import ma.elearning.engagement.*;
import ma.elearning.formation.NiveauFormation;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class EngagementDtos {
    private EngagementDtos() {}

    public record PreferenceRequest(
            @NotNull @Size(max = 8) List<@NotBlank @Size(max = 80) String> domaines,
            @NotNull NiveauFormation niveau,
            @NotBlank @Size(max = 300) String objectif,
            @Min(30) @Max(180) int minutesHebdomadaires,
            @NotNull PreferenceFormat formatPrefere,
            boolean rappelsActifs,
            @NotBlank @Size(max = 60) String fuseauHoraire) {}
    public record PreferenceResponse(List<String> domaines, NiveauFormation niveau, String objectif,
                                     int minutesHebdomadaires, PreferenceFormat formatPrefere,
                                     boolean rappelsActifs, boolean onboardingTermine,
                                     boolean onboardingIgnore, String fuseauHoraire) {}

    public record FavoriteResponse(Long id, Long formationId, String titre, String categorie,
                                   NiveauFormation niveau, BigDecimal progression, Instant createdAt) {}

    public record LearningPositionRequest(Long moduleId, Long chapitreId, Long ressourceId) {}
    public record ResumeResponse(Long formationId, String formationTitre, Long moduleId, String moduleTitre,
                                 Long chapitreId, String chapitreTitre, Long ressourceId,
                                 String ressourceTitre, Instant consultedAt, String href) {}

    public record PrivateNoteRequest(Long chapitreId, Long ressourceId,
                                     @Size(max = 5000) String contenu, boolean signet) {}
    public record PrivateNoteResponse(Long id, Long formationId, String formationTitre,
                                      Long chapitreId, String chapitreTitre, Long ressourceId,
                                      String ressourceTitre, String contenu, boolean signet,
                                      Instant createdAt, Instant updatedAt) {}

    public record WeeklyGoalRequest(@NotNull @Min(30) @Max(180) Integer minutesCible,
                                    @NotBlank @Size(max = 60) String fuseauHoraire) {}
    public record WeeklyGoalResponse(int minutesCible, long minutesValidees, long activitesValidees,
                                     int pourcentage, int semainesRegulieres,
                                     Instant debutSemaine, Instant finSemaine, String message) {}

    public record Recommendation(Long formationId, String titre, String categorie,
                                 NiveauFormation niveau, BigDecimal prix, int score,
                                 List<String> raisons) {}
    public record OrientationRequest(
            @NotBlank @Size(max = 300) String objectif,
            @NotNull NiveauFormation niveau,
            @NotBlank @Size(max = 120) String domaine,
            @Min(30) @Max(600) int minutesHebdomadaires,
            @NotNull PreferenceFormat formatPrefere) {}

    public record ReviewRequest(@Min(1) @Max(5) int note,
                                @NotBlank @Size(min = 10, max = 2000) String commentaire) {}
    public record ReviewResponse(Long id, Long formationId, String participant, int note,
                                 String commentaire, ReviewStatus statut, String reponseFormateur,
                                 Instant createdAt, Instant updatedAt, boolean proprietaire) {}
    public record ReviewSummary(double moyenne, long nombre, List<ReviewResponse> content,
                                int page, int totalPages) {}
    public record ReviewReplyRequest(@NotBlank @Size(max = 2000) String reponse) {}
    public record ReviewReportRequest(@NotBlank @Size(max = 500) String motif) {}
    public record TrainerEngagement(long inscriptions, long avisPublies, double moyenneAvis,
                                    List<ReviewResponse> avis) {}

    public record NotificationResponse(Long id, NotificationCategory categorie, String titre,
                                       String message, String actionUrl, boolean lue, Instant createdAt) {}
    public record NotificationPage(List<NotificationResponse> content, long nonLues,
                                   int page, int totalPages) {}
    public record NotificationPreferenceRequest(@NotNull NotificationCategory categorie,
                                                boolean dansApplication, boolean emailActif) {}
    public record NotificationPreferenceResponse(NotificationCategory categorie,
                                                 boolean dansApplication, boolean emailActif,
                                                 boolean configurableDansApplication,
                                                 boolean configurableEmail) {}

    public record DashboardEnrollment(Long formationId, String titre, BigDecimal progression,
                                      String typeAcces) {}
    public record DashboardClass(Long id, String titre, String formation, Instant dateDebut,
                                 Instant dateFin, String fuseauHoraire, boolean hostReady) {}
    public record RecentActivity(ActivityType type, String formation, int minutesValidees,
                                 Instant occurredAt) {}
    public record DashboardResponse(ResumeResponse reprise, String prochaineAction,
                                    int progressionGlobale, WeeklyGoalResponse objectifHebdomadaire,
                                    DashboardClass prochaineClasse, int quizDisponibles,
                                    List<DashboardEnrollment> formations, List<FavoriteResponse> favoris,
                                    List<Recommendation> recommandations,
                                    List<RecentActivity> activiteRecente) {}

    public record JourneyResource(Long id, String titre, String type, String etat) {}
    public record JourneyChapter(Long id, String titre, String etat, int progression,
                                 List<JourneyResource> ressources) {}
    public record JourneyModule(Long id, String titre, String etat, int progression,
                                List<JourneyChapter> chapitres) {}
    public record LearningJourney(Long formationId, String titre, int progression,
                                  List<JourneyModule> modules) {}

    public record InstructorCourse(Long id, String titre, String categorie, NiveauFormation niveau) {}
    public record InstructorProfile(Long id, String nom, String specialite, String biographie,
                                    long apprenants, double moyenneAvis,
                                    List<InstructorCourse> formations) {}
    public record InstructorProfileRequest(@NotBlank @Size(max = 160) String specialite,
                                           @NotBlank @Size(max = 3000) String biographie) {}
}
