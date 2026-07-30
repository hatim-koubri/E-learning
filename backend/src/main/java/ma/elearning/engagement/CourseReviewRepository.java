package ma.elearning.engagement;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CourseReviewRepository extends JpaRepository<CourseReview, Long> {
    Optional<CourseReview> findByParticipantEmailAndFormationId(String email, Long formationId);
    Optional<CourseReview> findByIdAndParticipantEmail(Long id, String email);
    Optional<CourseReview> findByIdAndFormationFormateurEmail(Long id, String email);
    Page<CourseReview> findByFormationIdAndStatutOrderByCreatedAtDesc(Long formationId, ReviewStatus status, Pageable page);
    List<CourseReview> findByFormationFormateurEmailOrderByCreatedAtDesc(String email);
    List<CourseReview> findByStatutOrderByUpdatedAtDesc(ReviewStatus status);
    @Query("select coalesce(avg(r.note), 0) from CourseReview r where r.formation.id = :formationId and r.statut = :status")
    double averageForFormation(@Param("formationId") Long formationId, @Param("status") ReviewStatus status);
    long countByFormationIdAndStatut(Long formationId, ReviewStatus status);
}
