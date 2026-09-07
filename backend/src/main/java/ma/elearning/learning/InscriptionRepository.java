package ma.elearning.learning;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.List;
import java.util.Collection;
import java.time.Instant;
public interface InscriptionRepository extends JpaRepository<Inscription, Long> {
    Optional<Inscription> findByParticipantEmailAndFormationId(String email, Long formationId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Inscription i where lower(i.participant.email)=lower(:email) and i.formation.id=:formationId")
    Optional<Inscription> findLockedByParticipantEmailAndFormationId(@Param("email") String email,
                                                                     @Param("formationId") Long formationId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Inscription i where i.id=:id")
    Optional<Inscription> findLockedById(@Param("id") Long id);
    boolean existsByParticipantEmailAndFormationIdAndStatutIn(String email, Long formationId, Iterable<InscriptionStatut> statuts);
    List<Inscription> findByFormationIdAndTypeAcces(Long formationId, TypeAcces typeAcces);
    List<Inscription> findByFormationId(Long formationId);
    List<Inscription> findByParticipantEmailOrderByDateInscriptionDesc(String email);
    long countByFormationFormateurId(Long formateurId);
    long countByParticipantId(Long participantId);
    long countByStatutIn(Collection<InscriptionStatut> statuts);
    interface MonthlyCount { int getYearValue(); int getMonthValue(); long getTotal(); }
    interface PopularFormation { Long getFormationId(); String getTitre(); long getTotal(); }
    @Query("select year(i.dateInscription) as yearValue, month(i.dateInscription) as monthValue, count(i) as total from Inscription i where i.dateInscription >= :fromDate and i.dateInscription < :toDate and i.statut in :statuses group by year(i.dateInscription), month(i.dateInscription)")
    List<MonthlyCount> countMonthly(@Param("fromDate") Instant fromDate,@Param("toDate") Instant toDate,@Param("statuses") Collection<InscriptionStatut> statuses);
    @Query("select i.formation.id as formationId, i.formation.titre as titre, count(i) as total from Inscription i where i.statut in :statuses group by i.formation.id, i.formation.titre order by count(i) desc, i.formation.id asc")
    List<PopularFormation> findPopular(@Param("statuses") Collection<InscriptionStatut> statuses, org.springframework.data.domain.Pageable pageable);
}
