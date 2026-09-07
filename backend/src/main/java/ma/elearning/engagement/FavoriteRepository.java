package ma.elearning.engagement;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    boolean existsByParticipantEmailAndFormationId(String email, Long formationId);
    Optional<Favorite> findByParticipantEmailAndFormationId(String email, Long formationId);
    @EntityGraph(attributePaths = {"formation", "formation.formateur"})
    List<Favorite> findByParticipantEmailOrderByCreatedAtDesc(String email);
    long countByParticipantEmail(String email);
    long deleteByParticipantId(Long participantId);
}
