package ma.elearning.orientation;
import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;
import java.util.*;
public interface OrientationConversationRepository extends JpaRepository<OrientationConversation,Long>{
    Optional<OrientationConversation> findByIdAndParticipantEmail(Long id,String email);
    Optional<OrientationConversation> findByIdAndParticipantIsNullAndSessionId(Long id,String sessionId);
    List<OrientationConversation> findByParticipantEmailOrderByUpdatedAtDesc(String email);
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select c from OrientationConversation c where c.id=:id") Optional<OrientationConversation> findLocked(Long id);
}
