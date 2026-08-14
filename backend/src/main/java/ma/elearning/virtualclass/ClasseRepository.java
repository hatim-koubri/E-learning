package ma.elearning.virtualclass;
import org.springframework.data.jpa.repository.JpaRepository; import org.springframework.data.jpa.repository.Lock; import org.springframework.data.jpa.repository.Query; import org.springframework.data.repository.query.Param; import jakarta.persistence.LockModeType; import java.util.*;
public interface ClasseRepository extends JpaRepository<Classe,Long>{
 Optional<Classe> findByIdAndFormationFormateurEmail(Long id,String email);
 @Lock(LockModeType.PESSIMISTIC_WRITE)
 @Query("select c from Classe c where c.id=:id and lower(c.formation.formateur.email)=lower(:email)")
 Optional<Classe> findLockedOwned(@Param("id") Long id,@Param("email") String email);
 List<Classe> findByFormationFormateurEmailOrderByDateDebutDesc(String email);
 List<Classe> findDistinctByIdIn(Collection<Long> ids);
 boolean existsByFormationIdAndStatutAndDateFinGreaterThanEqual(Long formationId,String statut,java.time.LocalDate date);
 long countByStatut(String statut);
}
