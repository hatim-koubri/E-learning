package ma.elearning.formation;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface RessourceRepository extends JpaRepository<RessourcePedagogique, Long> {
    Optional<RessourcePedagogique> findByIdAndChapitreModuleFormationFormateurEmail(Long id, String email);
    List<RessourcePedagogique> findByChapitreIdOrderByPosition(Long chapitreId);
    long countByChapitreId(Long chapitreId);
}
