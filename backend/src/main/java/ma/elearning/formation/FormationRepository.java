package ma.elearning.formation;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface FormationRepository extends JpaRepository<Formation, Long> {
    List<Formation> findByFormateurEmailOrderByUpdatedAtDesc(String email);
    Optional<Formation> findByIdAndFormateurEmail(Long id, String email);
}
