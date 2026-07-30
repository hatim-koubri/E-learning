package ma.elearning.user;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface FormateurRepository extends JpaRepository<Formateur, Long> {
    List<Formateur> findByStatutOrderByCreatedAtAsc(AccountStatus statut);
    Optional<Formateur> findByEmailAndStatut(String email, AccountStatus statut);
    Optional<Formateur> findByIdAndStatut(Long id, AccountStatus statut);
}
