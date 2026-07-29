package ma.elearning.quiz;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface QuestionRepository extends JpaRepository<Question,Long>{
 Optional<Question> findByIdAndQuizFormationFormateurEmail(Long id,String email);
 long countByQuizId(Long quizId);
}
