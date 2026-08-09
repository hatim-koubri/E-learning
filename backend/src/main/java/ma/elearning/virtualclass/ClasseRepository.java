package ma.elearning.virtualclass;
import org.springframework.data.jpa.repository.JpaRepository; import java.util.*;
public interface ClasseRepository extends JpaRepository<Classe,Long>{
 Optional<Classe> findByIdAndFormationFormateurEmail(Long id,String email);
 List<Classe> findByFormationFormateurEmailOrderByDateDebutDesc(String email);
 List<Classe> findDistinctByIdIn(Collection<Long> ids);
 boolean existsByFormationIdAndStatutAndDateFinGreaterThanEqual(Long formationId,String statut,java.time.LocalDate date);
}
