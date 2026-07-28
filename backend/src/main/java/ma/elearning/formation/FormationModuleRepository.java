package ma.elearning.formation;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface FormationModuleRepository extends JpaRepository<FormationModule, Long> {
    Optional<FormationModule> findByIdAndFormationFormateurEmail(Long id, String email);
    List<FormationModule> findByFormationIdOrderByPosition(Long formationId);
    long countByFormationId(Long formationId);
}
