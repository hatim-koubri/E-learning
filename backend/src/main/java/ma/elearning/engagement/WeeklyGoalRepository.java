package ma.elearning.engagement;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface WeeklyGoalRepository extends JpaRepository<WeeklyGoal, Long> {
    Optional<WeeklyGoal> findByParticipantEmail(String email);
}
