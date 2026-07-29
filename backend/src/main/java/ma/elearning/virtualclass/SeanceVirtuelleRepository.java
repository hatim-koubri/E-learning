package ma.elearning.virtualclass;
import org.springframework.data.jpa.repository.JpaRepository; import java.util.Optional;
public interface SeanceVirtuelleRepository extends JpaRepository<SeanceVirtuelle,Long>{
 Optional<SeanceVirtuelle> findByIdAndClasseFormationFormateurEmail(Long id,String email);
}
