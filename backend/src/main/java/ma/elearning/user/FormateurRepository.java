package ma.elearning.user;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FormateurRepository extends JpaRepository<Formateur, Long> {
    List<Formateur> findByStatutOrderByCreatedAtAsc(AccountStatus statut);
}

