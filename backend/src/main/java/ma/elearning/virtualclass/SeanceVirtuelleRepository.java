package ma.elearning.virtualclass;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
public interface SeanceVirtuelleRepository extends JpaRepository<SeanceVirtuelle,Long>{
 @Lock(LockModeType.PESSIMISTIC_WRITE)
 @Query("select s from SeanceVirtuelle s where s.id=:id")
 Optional<SeanceVirtuelle> findLockedById(@Param("id") Long id);
 Optional<SeanceVirtuelle> findByIdAndClasseFormationFormateurEmail(Long id,String email);
 @Query("select count(s) from SeanceVirtuelle s where s.statut='PLANIFIEE' and s.id<>:excludedId and " +
        "s.classe.id=:classId and s.dateDebut<:end and s.dateFin>:start")
 long countClassOverlaps(@Param("classId") Long classId,@Param("excludedId") Long excludedId,
                         @Param("start") Instant start,@Param("end") Instant end);
 @Query("select count(s) from SeanceVirtuelle s where s.statut='PLANIFIEE' and s.id<>:excludedId and " +
        "lower(s.classe.formation.formateur.email)=lower(:email) and s.dateDebut<:end and s.dateFin>:start")
 long countTrainerOverlaps(@Param("email") String email,@Param("excludedId") Long excludedId,
                           @Param("start") Instant start,@Param("end") Instant end);
 @Query("select s from SeanceVirtuelle s where s.statut = 'PLANIFIEE' and s.dateDebut <= :cutoff and s.dateFin > :now")
 List<SeanceVirtuelle> findReminderCandidates(@Param("now") Instant now, @Param("cutoff") Instant cutoff);
 long countByStatutAndDateFinAfter(String statut, Instant now);
}
