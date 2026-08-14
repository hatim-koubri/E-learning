package ma.elearning.engagement;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

public interface ReviewReportRepository extends JpaRepository<ReviewReport, Long> {
    long countByParticipantId(Long participantId);
    long countByStatutTraitement(ReviewReportStatus status);
    long countDistinctReviewIdByStatutTraitement(ReviewReportStatus status);
    boolean existsByReviewIdAndParticipantEmail(Long reviewId, String email);
    boolean existsByReviewId(Long reviewId);
    List<ReviewReport> findByReviewIdOrderByIdAsc(Long reviewId);

    @EntityGraph(attributePaths = {"review", "review.participant", "review.formation",
            "review.formation.formateur", "decisionAdmin"})
    Page<ReviewReport> findByStatutTraitementOrderByCreatedAtAscIdAsc(
            ReviewReportStatus status, Pageable pageable);

    @Query(value = "select report.review.id from ReviewReport report " +
            "where report.statutTraitement=:status group by report.review.id " +
            "order by min(report.createdAt), min(report.id)",
            countQuery = "select count(distinct report.review.id) from ReviewReport report " +
                    "where report.statutTraitement=:status")
    Page<Long> findPendingReviewIds(@Param("status") ReviewReportStatus status, Pageable pageable);

    @EntityGraph(attributePaths = {"review", "review.participant", "review.formation",
            "review.formation.formateur", "decisionAdmin"})
    @Query("select report from ReviewReport report where report.review.id in :reviewIds " +
            "and report.statutTraitement=:status order by report.createdAt, report.id")
    List<ReviewReport> findByReviewIdsAndStatus(@Param("reviewIds") List<Long> reviewIds,
                                                @Param("status") ReviewReportStatus status);

    @EntityGraph(attributePaths = {"review", "review.participant", "review.formation",
            "review.formation.formateur", "decisionAdmin"})
    Optional<ReviewReport> findByIdAndStatutTraitement(Long id, ReviewReportStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select report from ReviewReport report where report.review.id=:reviewId " +
            "and report.statutTraitement=:status order by report.id")
    List<ReviewReport> findLockedByReviewIdAndStatus(@Param("reviewId") Long reviewId,
                                                     @Param("status") ReviewReportStatus status);
}
