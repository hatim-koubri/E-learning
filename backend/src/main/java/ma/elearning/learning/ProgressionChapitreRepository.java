package ma.elearning.learning;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
public interface ProgressionChapitreRepository extends JpaRepository<ProgressionChapitre, Long> {
    Optional<ProgressionChapitre> findByInscriptionIdAndChapitreId(Long inscriptionId, Long chapitreId);
    List<ProgressionChapitre> findByInscriptionId(Long inscriptionId);
}
