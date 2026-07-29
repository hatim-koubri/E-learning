package ma.elearning.quiz;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.Optional;
public interface TentativeQuizRepository extends JpaRepository<TentativeQuiz,Long>{
 long countByInscriptionIdAndQuizIdAndDatePassageAfter(Long inscriptionId,Long quizId,Instant since);
 Optional<TentativeQuiz> findByIdAndInscriptionParticipantEmail(Long id,String email);
}
