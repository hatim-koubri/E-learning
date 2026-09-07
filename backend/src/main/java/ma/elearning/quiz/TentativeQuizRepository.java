package ma.elearning.quiz;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
public interface TentativeQuizRepository extends JpaRepository<TentativeQuiz,Long>{
 List<TentativeQuiz> findByInscriptionIdAndQuizIdOrderByDatePassageAsc(Long inscriptionId,Long quizId);
 Optional<TentativeQuiz> findByIdAndInscriptionParticipantEmail(Long id,String email);
 boolean existsByInscriptionIdAndQuizIdAndReussiTrue(Long inscriptionId,Long quizId);
 Optional<TentativeQuiz> findFirstByInscriptionIdAndQuizIdAndStatutOrderByDatePassageDesc(Long inscriptionId,Long quizId,TentativeStatut statut);
}
