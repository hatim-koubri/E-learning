package ma.elearning.engagement;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PrivateNoteRepository extends JpaRepository<PrivateNote, Long> {
    Optional<PrivateNote> findByIdAndParticipantEmail(Long id, String email);
    @EntityGraph(attributePaths = {"formation", "chapitre", "ressource"})
    List<PrivateNote> findByParticipantEmailOrderByUpdatedAtDesc(String email);
    @EntityGraph(attributePaths = {"formation", "chapitre", "ressource"})
    List<PrivateNote> findByParticipantEmailAndFormationIdOrderByUpdatedAtDesc(String email, Long formationId);
}
