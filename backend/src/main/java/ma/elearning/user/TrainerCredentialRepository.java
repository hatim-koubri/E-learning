package ma.elearning.user;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface TrainerCredentialRepository extends JpaRepository<TrainerCredential,Long>{
    List<TrainerCredential> findByFormateurIdOrderByIdAsc(Long formateurId);
    long countByFormateurId(Long formateurId);
}
