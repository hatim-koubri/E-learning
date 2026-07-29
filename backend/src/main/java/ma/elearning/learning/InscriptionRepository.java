package ma.elearning.learning;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface InscriptionRepository extends JpaRepository<Inscription, Long> {
    Optional<Inscription> findByParticipantEmailAndFormationId(String email, Long formationId);
    boolean existsByParticipantEmailAndFormationIdAndStatutIn(String email, Long formationId, Iterable<InscriptionStatut> statuts);
}
