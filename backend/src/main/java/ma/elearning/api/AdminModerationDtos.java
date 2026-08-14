package ma.elearning.api;

import ma.elearning.engagement.ReviewModerationDecision;
import ma.elearning.engagement.ReviewReportStatus;
import ma.elearning.engagement.ReviewStatus;

import java.time.Instant;
import java.util.List;

public final class AdminModerationDtos {
    private AdminModerationDtos() {}

    public record SignalementContext(Long id, String motif, Instant date,
                                     ReviewReportStatus statut) {}

    public record ReviewContext(Long id, int note, String commentaire, ReviewStatus statut,
                                Instant createdAt, Instant updatedAt,
                                String reponseFormateur) {}

    public record PublicContext(Long formationId, String formationTitre,
                                String auteurNom, String formateurNom) {}

    public record DecisionContext(ReviewModerationDecision resultat, Instant date,
                                  Long adminId) {}

    public record ModerationReportResponse(SignalementContext signalement,
                                           ReviewContext avis,
                                           PublicContext contexte,
                                           DecisionContext decision) {}

    public record ModerationCaseResponse(ReviewContext avis,
                                         PublicContext contexte,
                                         List<SignalementContext> signalements) {}

    public record ModerationQueueResponse(List<ModerationCaseResponse> content,
                                          int page, int totalPages, long totalElements) {}

    public record ModerationResolutionResponse(Long avisId, ReviewStatus statutAvis,
                                               ReviewModerationDecision decision,
                                               Instant dateDecision, Long adminId,
                                               int signalementsResolus) {}
}
