package ma.elearning.admin;

import ma.elearning.api.AdminModerationDtos.*;
import ma.elearning.common.BusinessException;
import ma.elearning.engagement.*;
import ma.elearning.user.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AdminReviewModerationService {
    private final CourseReviewRepository reviews;
    private final ReviewReportRepository reports;
    private final UserRepository users;
    private final Clock clock;
    private final AdminAuditService audit;

    public AdminReviewModerationService(CourseReviewRepository reviews,
                                        ReviewReportRepository reports,
                                        UserRepository users,
                                        Clock clock, AdminAuditService audit) {
        this.reviews = reviews;
        this.reports = reports;
        this.users = users;
        this.clock = clock;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public ModerationQueueResponse pending(int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 100);
        var reviewPage = reports.findPendingReviewIds(
                ReviewReportStatus.EN_ATTENTE, PageRequest.of(safePage, safeSize));
        if (reviewPage.isEmpty()) {
            return new ModerationQueueResponse(List.of(), reviewPage.getNumber(),
                    reviewPage.getTotalPages(), reviewPage.getTotalElements());
        }
        Map<Long, List<ReviewReport>> reportsByReview = reports.findByReviewIdsAndStatus(
                        reviewPage.getContent(), ReviewReportStatus.EN_ATTENTE).stream()
                .collect(Collectors.groupingBy(value -> value.getReview().getId()));
        List<ModerationCaseResponse> content = reviewPage.getContent().stream()
                .map(reviewId -> moderationCase(reportsByReview.getOrDefault(reviewId, List.of())))
                .toList();
        return new ModerationQueueResponse(content, reviewPage.getNumber(),
                reviewPage.getTotalPages(), reviewPage.getTotalElements());
    }

    @Transactional(readOnly = true)
    public ModerationReportResponse detail(Long reportId) {
        return response(reports.findByIdAndStatutTraitement(reportId, ReviewReportStatus.EN_ATTENTE)
                .orElseThrow(this::reportNotFound));
    }

    @Transactional
    public ModerationResolutionResponse republish(Long reviewId) {
        return decide(reviewId, ReviewModerationDecision.REPUBLIER);
    }

    @Transactional
    public ModerationResolutionResponse hide(Long reviewId) {
        return decide(reviewId, ReviewModerationDecision.MASQUER);
    }

    private ModerationResolutionResponse decide(Long reviewId, ReviewModerationDecision decision) {
        Admin admin = authenticatedAdmin();
        CourseReview review = reviews.findLockedById(reviewId).orElseThrow(this::reviewNotFound);
        List<ReviewReport> pending = reports.findLockedByReviewIdAndStatus(
                reviewId, ReviewReportStatus.EN_ATTENTE);
        if (pending.isEmpty()) {
            if (reports.existsByReviewId(reviewId)) throw alreadyDecided();
            throw reportNotFound();
        }
        if (review.getStatut() != ReviewStatus.SIGNALE) throw alreadyDecided();

        Instant decidedAt = clock.instant();
        ReviewStatus reviewStatus = decision == ReviewModerationDecision.REPUBLIER
                ? ReviewStatus.PUBLIE : ReviewStatus.MASQUE;
        ReviewReportStatus reportStatus = decision == ReviewModerationDecision.REPUBLIER
                ? ReviewReportStatus.TRAITE_AVIS_REPUBLIE : ReviewReportStatus.TRAITE_AVIS_MASQUE;
        review.setStatut(reviewStatus);
        for (ReviewReport report : pending) {
            report.setStatutTraitement(reportStatus);
            report.setDecision(decision);
            report.setDecidedAt(decidedAt);
            report.setDecisionAdmin(admin);
        }
        reviews.saveAndFlush(review);
        reports.saveAllAndFlush(pending);
        audit.success(admin, "REVIEW", reviewId,
                decision == ReviewModerationDecision.REPUBLIER ? "REVIEW_REPUBLISHED" : "REVIEW_HIDDEN",
                null, ReviewStatus.SIGNALE.name(), reviewStatus.name(), null, null);
        return new ModerationResolutionResponse(reviewId, reviewStatus, decision, decidedAt,
                admin.getId(), pending.size());
    }

    private ModerationReportResponse response(ReviewReport report) {
        CourseReview review = report.getReview();
        DecisionContext decision = report.getDecision() == null ? null : new DecisionContext(
                report.getDecision(), report.getDecidedAt(),
                report.getDecisionAdmin() == null ? null : report.getDecisionAdmin().getId());
        return new ModerationReportResponse(
                new SignalementContext(report.getId(), report.getMotif(), report.getCreatedAt(),
                        report.getStatutTraitement()),
                new ReviewContext(review.getId(), review.getNote(), review.getCommentaire(),
                        review.getStatut(), review.getCreatedAt(), review.getUpdatedAt(),
                        review.getReponseFormateur()),
                new PublicContext(review.getFormation().getId(), review.getFormation().getTitre(),
                        review.getParticipant().getNom(),
                        review.getFormation().getFormateur().getNom()),
                decision);
    }

    private ModerationCaseResponse moderationCase(List<ReviewReport> caseReports) {
        if (caseReports.isEmpty()) throw new IllegalStateException("Dossier de modération incomplet.");
        ReviewReport first = caseReports.getFirst();
        CourseReview review = first.getReview();
        return new ModerationCaseResponse(
                new ReviewContext(review.getId(), review.getNote(), review.getCommentaire(),
                        review.getStatut(), review.getCreatedAt(), review.getUpdatedAt(),
                        review.getReponseFormateur()),
                new PublicContext(review.getFormation().getId(), review.getFormation().getTitre(),
                        review.getParticipant().getNom(), review.getFormation().getFormateur().getNom()),
                caseReports.stream().map(report -> new SignalementContext(report.getId(),
                        report.getMotif(), report.getCreatedAt(), report.getStatutTraitement())).toList());
    }

    private Admin authenticatedAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) throw adminRequired();
        User account = users.findByEmail(authentication.getName()).orElseThrow(this::adminRequired);
        if (!(account instanceof Admin admin) || account.getRole() != Role.ADMIN ||
                account.getStatut() != AccountStatus.ACTIF) throw adminRequired();
        return admin;
    }

    private BusinessException alreadyDecided() {
        return new BusinessException(HttpStatus.CONFLICT, "REVIEW_ALREADY_MODERATED",
                "Cet avis a déjà fait l’objet d’une décision de modération.");
    }

    private BusinessException reportNotFound() {
        return new BusinessException(HttpStatus.NOT_FOUND, "REVIEW_REPORT_NOT_FOUND",
                "Signalement en attente introuvable.");
    }

    private BusinessException reviewNotFound() {
        return new BusinessException(HttpStatus.NOT_FOUND, "REVIEW_NOT_FOUND",
                "Avis introuvable.");
    }

    private BusinessException adminRequired() {
        return new BusinessException(HttpStatus.FORBIDDEN, "ADMIN_REQUIRED",
                "Cette action est réservée à un administrateur actif.");
    }
}
