package ma.elearning.learning;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface OperationAccesRepository extends JpaRepository<OperationAcces,Long>{
 Optional<OperationAcces> findByCleIdempotence(String cle);
}
