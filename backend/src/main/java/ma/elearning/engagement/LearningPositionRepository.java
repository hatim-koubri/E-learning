package ma.elearning.engagement;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LearningPositionRepository extends JpaRepository<LearningPosition, Long> {
    Optional<LearningPosition> findByParticipantEmailAndFormationId(String email, Long formationId);
    @EntityGraph(attributePaths = {"formation", "module", "chapitre", "ressource"})
    Optional<LearningPosition> findFirstByParticipantEmailOrderByConsultedAtDesc(String email);
}
