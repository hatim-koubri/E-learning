package ma.elearning.engagement;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface LearningActivityRepository extends JpaRepository<LearningActivity, Long> {
    boolean existsByParticipantEmailAndTypeAndSourceKey(String email, ActivityType type, String sourceKey);
    boolean existsByParticipantEmailAndOccurredAtBetween(String email, Instant start, Instant end);
    @Query("select coalesce(sum(a.minutesValidees), 0) from LearningActivity a " +
            "where a.participant.email = :email and a.occurredAt >= :start and a.occurredAt < :end")
    long validatedMinutes(@Param("email") String email, @Param("start") Instant start, @Param("end") Instant end);
    long countByParticipantEmailAndOccurredAtBetween(String email, Instant start, Instant end);
    List<LearningActivity> findTop10ByParticipantEmailOrderByOccurredAtDesc(String email);
}
