package ma.elearning.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface FormateurRepository extends JpaRepository<Formateur, Long> {
    List<Formateur> findByStatutOrderByCreatedAtAsc(AccountStatus statut);
    Page<Formateur> findByStatut(AccountStatus statut, Pageable pageable);
    Optional<Formateur> findByEmailAndStatut(String email, AccountStatus statut);
    Optional<Formateur> findByIdAndStatut(Long id, AccountStatus statut);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select f from Formateur f where f.id=:id")
    Optional<Formateur> findLockedById(@Param("id") Long id);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select f from Formateur f where lower(f.email)=lower(:email)")
    Optional<Formateur> findLockedByEmail(@Param("email") String email);
}
