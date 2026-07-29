package ma.elearning.virtualclass;
import org.springframework.data.jpa.repository.JpaRepository; import java.util.*;
public interface ClasseMembreRepository extends JpaRepository<ClasseMembre,Long>{
 boolean existsByClasseIdAndParticipantEmailAndStatut(Long classeId,String email,String statut);
 Optional<ClasseMembre> findByClasseIdAndParticipantId(Long classeId,Long participantId);
 List<ClasseMembre> findByClasseId(Long classeId);
 List<ClasseMembre> findByParticipantEmailAndStatut(String email,String statut);
 long countByClasseIdAndStatut(Long classeId,String statut);
}
