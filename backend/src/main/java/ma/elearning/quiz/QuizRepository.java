package ma.elearning.quiz;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
public interface QuizRepository extends JpaRepository<Quiz,Long>{
 List<Quiz> findByFormationIdOrderByOrdre(Long formationId);
 Optional<Quiz> findByIdAndFormationFormateurEmail(Long id,String email);
 Optional<Quiz> findByIdAndPublieTrue(Long id);
 List<Quiz> findByFormationIdAndPublieTrueOrderByOrdre(Long formationId);
 long countByFormationId(Long formationId);
}
