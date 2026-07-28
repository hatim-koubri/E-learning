package ma.elearning.formation;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ChapitreRepository extends JpaRepository<Chapitre, Long> {
    Optional<Chapitre> findByIdAndModuleFormationFormateurEmail(Long id, String email);
    List<Chapitre> findByModuleIdOrderByPosition(Long moduleId);
    long countByModuleId(Long moduleId);
}
