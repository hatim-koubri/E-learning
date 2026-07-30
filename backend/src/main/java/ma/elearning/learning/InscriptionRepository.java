package ma.elearning.learning;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;
public interface InscriptionRepository extends JpaRepository<Inscription, Long> {
    Optional<Inscription> findByParticipantEmailAndFormationId(String email, Long formationId);
    boolean existsByParticipantEmailAndFormationIdAndStatutIn(String email, Long formationId, Iterable<InscriptionStatut> statuts);
    List<Inscription> findByFormationIdAndTypeAcces(Long formationId, TypeAcces typeAcces);
    List<Inscription> findByFormationId(Long formationId);
    List<Inscription> findByParticipantEmailOrderByDateInscriptionDesc(String email);
    long countByFormationFormateurId(Long formateurId);
}
