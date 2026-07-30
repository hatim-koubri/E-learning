package ma.elearning.engagement;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ReviewReportRepository extends JpaRepository<ReviewReport, Long> {
    boolean existsByReviewIdAndParticipantEmail(Long reviewId, String email);
    List<ReviewReport> findAllByOrderByCreatedAtDesc();

    @Modifying
    @Query("delete from ReviewReport report where report.review.id = :reviewId")
    void deleteAllByReviewId(Long reviewId);
}
